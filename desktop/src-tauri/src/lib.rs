use screenshots::Screen;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::io::Cursor;
use image::ImageFormat;
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager, Emitter};

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    
    if let Some(screen) = screens.first() {
        let img = screen.capture().map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        img.write_to(&mut Cursor::new(&mut buffer), ImageFormat::Png).map_err(|e| e.to_string())?;
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
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Kapat", true, None::<&str>)?;
            let crop_i = MenuItem::with_id(app, "crop", "Kirparak Ekran Goruntusu Al", true, None::<&str>)?;
            let full_i = MenuItem::with_id(app, "full", "Tam Ekran Goruntusu Al", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&crop_i, &full_i, &quit_i])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => std::process::exit(0),
                    "crop" => { app.emit("trigger-crop-screenshot", ()).unwrap(); }
                    "full" => { app.emit("trigger-full-screenshot", ()).unwrap(); }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![capture_screen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
