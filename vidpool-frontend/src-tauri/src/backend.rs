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

pub fn wait_for_backend_ready(api_base_url: &str, deadline: Duration) -> Result<(), String> {
    let health_url = format!("{api_base_url}/api/health");
    let start = std::time::Instant::now();
    let step = Duration::from_millis(100);

    while start.elapsed() < deadline {
        if let Ok(resp) = ureq::get(&health_url)
            .timeout(Duration::from_millis(500))
            .call()
        {
            if resp.status() == 200 {
                return Ok(());
            }
        }
        std::thread::sleep(step);
    }

    Err(format!("Timed out waiting for backend sidecar at {health_url}"))
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

        let child = spawn_sidecar(app, port, session_token)
            .map_err(|e| format!("Attempt {attempt}: {e}"))?;

        match wait_for_backend_ready(&api_base_url, readiness_timeout) {
            Ok(()) => Ok(StartedBackend {
                api_base_url,
                child,
            }),
            Err(error) => {
                let _ = child.kill();
                Err(format!(
                    "Attempt {attempt}: backend did not become ready: {error}"
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
}

