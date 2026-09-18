use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub struct BackendState {
    pub api_base_url: String,
    pub session_token: String,
    pub child: Mutex<Option<CommandChild>>,
}

impl BackendState {
    pub fn new(api_base_url: String, session_token: String, child: CommandChild) -> Self {
        Self {
            api_base_url,
            session_token,
            child: Mutex::new(Some(child)),
        }
    }

    pub fn terminate(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(child) = guard.take() {
                // 1. Attempt graceful shutdown via protected endpoint
                let shutdown_url = format!("{}/api/session/shutdown", self.api_base_url);
                let _ = ureq::post(&shutdown_url)
                    .set("Authorization", &format!("Bearer {}", self.session_token))
                    .timeout(std::time::Duration::from_millis(1500))
                    .call();

                // 2. Short grace period to allow browser runtime and container lifespan to exit
                std::thread::sleep(std::time::Duration::from_millis(400));

                // 3. Ensure process termination fallback
                let _ = child.kill();
            }
        }
    }
}
