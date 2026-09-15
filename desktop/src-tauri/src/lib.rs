use screenshots::Screen;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    
    // For simplicity, capture the primary screen
    if let Some(screen) = screens.first() {
        let image = screen.capture().map_err(|e| e.to_string())?;
        let buffer = image.to_png().map_err(|e| e.to_string())?;
        let base64 = STANDARD.encode(&buffer);
        Ok(base64)
    } else {
        Err("No screens found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![capture_screen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
