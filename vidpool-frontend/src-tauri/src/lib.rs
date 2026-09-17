pub mod backend;
pub mod runtime_config;
pub mod state;

use std::time::Duration;
use tauri::Manager;
use crate::backend::{
    generate_session_token,
    start_backend_with_retry,
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

            let started = start_backend_with_retry(
                app.handle(),
                &session_token,
                3,
                Duration::from_secs(10),
            )?;

            let state = BackendState::new(
                started.api_base_url,
                session_token,
                started.child,
            );
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
