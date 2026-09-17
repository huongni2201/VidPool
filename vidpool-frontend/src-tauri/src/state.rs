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
                let _ = child.kill();
            }
        }
    }
}
