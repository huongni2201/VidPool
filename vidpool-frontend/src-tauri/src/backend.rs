use std::time::Duration;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

pub struct StartedBackend {
    pub api_base_url: String,
    pub child: CommandChild,
}

fn retry<T, E, F>(max_attempts: usize, mut operation: F) -> Result<T, E>
where
    F: FnMut(usize) -> Result<T, E>,
{
    assert!(max_attempts > 0);

    let mut last_error = None;

    for attempt in 1..=max_attempts {
        match operation(attempt) {
            Ok(value) => return Ok(value),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.expect("retry must have at least one attempt"))
}

pub fn generate_session_token() -> String {
    use rand::RngCore;
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let mut hex = String::with_capacity(64);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(hex, "{:02x}", b);
    }
    hex
}

pub fn select_available_port() -> Result<u16, String> {
    // Note: Ephemeral loopback port selection drops the listener before sidecar spawn,
    // which has a brief TOCTOU window. Authenticated session probe protects readiness
    // identity even if the selected port is raced.
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0))
        .map_err(|e| format!("Failed to bind ephemeral loopback port: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local addr: {e}"))?
        .port();
    drop(listener);
    Ok(port)
}

pub fn format_api_base_url(port: u16) -> String {
    format!("http://127.0.0.1:{port}")
}

pub fn get_trusted_origins() -> Vec<String> {
    vec![
        "http://localhost:5173".to_string(),
        "http://127.0.0.1:5173".to_string(),
        "http://tauri.localhost".to_string(),
    ]
}

pub fn spawn_sidecar(
    app: &tauri::AppHandle,
    port: u16,
    session_token: &str,
) -> Result<CommandChild, String> {
    let mut args = vec![
        "--host".to_string(),
        "127.0.0.1".to_string(),
        "--port".to_string(),
        port.to_string(),
        "--session-token".to_string(),
        session_token.to_string(),
    ];

    for origin in get_trusted_origins() {
        args.push("--allowed-origin".to_string());
        args.push(origin);
    }

    let (_rx, child) = app
        .shell()
        .sidecar("vidpool-backend")
        .map_err(|e| format!("Failed to configure sidecar: {e}"))?
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to spawn backend sidecar process: {e}"))?;

    Ok(child)
}

pub fn wait_for_backend_ready(
    api_base_url: &str,
    session_token: &str,
    deadline: Duration,
) -> Result<(), String> {
    let probe_url = format!("{api_base_url}/api/session/probe");
    let start = std::time::Instant::now();
    let step = Duration::from_millis(100);

    while start.elapsed() < deadline {
        if let Ok(resp) = ureq::get(&probe_url)
            .set("Authorization", &format!("Bearer {session_token}"))
            .timeout(Duration::from_millis(500))
            .call()
        {
            if resp.status() == 200 {
                return Ok(());
            }
        }
        std::thread::sleep(step);
    }

    Err(format!("Timed out waiting for backend sidecar at {probe_url}"))
}

pub fn start_backend_with_retry(
    app: &tauri::AppHandle,
    session_token: &str,
    max_attempts: usize,
    readiness_timeout: Duration,
) -> Result<StartedBackend, String> {
    retry(max_attempts, |attempt| {
        let port = select_available_port()
            .map_err(|e| format!("Attempt {attempt}: failed to select port: {e}"))?;

        let api_base_url = format_api_base_url(port);

        let child = spawn_sidecar(app, port, session_token).map_err(|e| {
            format!("Attempt {attempt}: failed to spawn backend sidecar on port {port}: {e}")
        })?;

        match wait_for_backend_ready(&api_base_url, session_token, readiness_timeout) {
            Ok(()) => Ok(StartedBackend {
                api_base_url,
                child,
            }),
            Err(error) => {
                let kill_result = child.kill();
                Err(format!(
                    "Attempt {attempt}: backend sidecar on port {port} did not become ready within {readiness_timeout:?}: {error}; child termination result: {kill_result:?}"
                ))
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retry_returns_after_success() {
        let mut attempts = 0;

        let result = retry(3, |_| {
            attempts += 1;
            if attempts < 3 {
                Err("failed")
            } else {
                Ok("ready")
            }
        });

        assert_eq!(result, Ok("ready"));
        assert_eq!(attempts, 3);
    }

    #[test]
    fn test_retry_stops_after_max_attempts() {
        let mut attempts = 0;

        let result: Result<(), &str> = retry(3, |_| {
            attempts += 1;
            Err("failed")
        });

        assert_eq!(result, Err("failed"));
        assert_eq!(attempts, 3);
    }

    #[test]
    fn test_format_api_base_url() {
        assert_eq!(format_api_base_url(8123), "http://127.0.0.1:8123");
    }

    #[test]
    fn test_trusted_origins_contain_expected_endpoints() {
        let origins = get_trusted_origins();
        assert!(origins.contains(&"http://localhost:5173".to_string()));
        assert!(origins.contains(&"http://127.0.0.1:5173".to_string()));
        assert!(origins.contains(&"http://tauri.localhost".to_string()));
        assert!(!origins.contains(&"*".to_string()));
    }

    #[test]
    fn test_session_token_is_secure_random() {
        let token1 = generate_session_token();
        let token2 = generate_session_token();

        assert_eq!(token1.len(), 64);
        assert_eq!(token2.len(), 64);
        assert_ne!(token1, token2);
        assert!(token1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_wait_for_backend_ready_authenticated_probe() {
        use std::io::{Read, Write};
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::Arc;

        let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let port = listener.local_addr().unwrap().port();
        let base_url = format_api_base_url(port);
        let correct_token = "secret-token-123";

        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        std::thread::spawn(move || {
            while running_clone.load(Ordering::Relaxed) {
                if let Ok((mut s, _)) = listener.accept() {
                    let mut buf = [0u8; 1024];
                    let n = s.read(&mut buf).unwrap_or(0);
                    let req = String::from_utf8_lossy(&buf[..n]);
                    if req.contains("Bearer secret-token-123") {
                        let resp = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok";
                        let _ = s.write_all(resp.as_bytes());
                    } else {
                        let resp = "HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n";
                        let _ = s.write_all(resp.as_bytes());
                    }
                    let _ = s.flush();
                } else {
                    std::thread::sleep(Duration::from_millis(10));
                }
            }
        });

        // 1. Wrong token fails (times out)
        let err_res = wait_for_backend_ready(&base_url, "wrong-token", Duration::from_millis(250));
        assert!(err_res.is_err());

        // 2. Correct token succeeds
        let ok_res = wait_for_backend_ready(&base_url, correct_token, Duration::from_millis(500));
        assert!(ok_res.is_ok());

        running.store(false, Ordering::Relaxed);
    }
}

