pub mod backend;
pub mod runtime_config;
pub mod state;

use std::time::Duration;
use tauri::Manager;
use crate::backend::{
    format_api_base_url, generate_session_token, select_available_port, spawn_sidecar,
    wait_for_backend_ready,
};
use crate::runtime_config::get_runtime_config;
use crate::state::BackendState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_runtime_config])
        .setup(|app| {
            let session_token = generate_session_token();
            let port = select_available_port()
                .map_err(|e| format!("Failed to select port: {e}"))?;
            let api_base_url = format_api_base_url(port);

            let child = spawn_sidecar(app.handle(), port, &session_token)?;

            // Wait for backend readiness (10 second bounded timeout)
            if let Err(e) = wait_for_backend_ready(&api_base_url, Duration::from_secs(10)) {
                let _ = child.kill();
                return Err(format!("Backend startup failed: {e}").into());
            }

            let state = BackendState::new(api_base_url, session_token, child);
            app.manage(state);

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<BackendState>() {
                    state.terminate();
                }
            }
        });
}
