use tauri::State;
use crate::state::BackendState;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfigDto {
    pub api_base_url: String,
    pub session_token: String,
}

#[tauri::command]
pub fn get_runtime_config(
    state: State<'_, BackendState>,
) -> Result<RuntimeConfigDto, String> {
    Ok(RuntimeConfigDto {
        api_base_url: state.api_base_url.clone(),
        session_token: state.session_token.clone(),
    })
}
