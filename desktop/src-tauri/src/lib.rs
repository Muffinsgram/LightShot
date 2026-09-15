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

#[tauri::command]
fn enter_crop_mode(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_decorations(false).map_err(|e| e.to_string())?;
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn exit_crop_mode(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_fullscreen(false).map_err(|e| e.to_string())?;
    window.set_decorations(true).map_err(|e| e.to_string())?;
    window.set_always_on_top(false).map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let is_print = shortcut.matches(tauri_plugin_global_shortcut::Modifiers::empty(), tauri_plugin_global_shortcut::Code::PrintScreen);
                        let is_ctrl_shift_s = shortcut.matches(tauri_plugin_global_shortcut::Modifiers::CONTROL | tauri_plugin_global_shortcut::Modifiers::SHIFT, tauri_plugin_global_shortcut::Code::KeyS);
                        
                        if is_print || is_ctrl_shift_s {
                            // Take screenshot immediately from Rust
                            if let Ok(screens) = Screen::all() {
                                if let Some(screen) = screens.first() {
                                    if let Ok(img) = screen.capture() {
                                        let mut buffer = Vec::new();
                                        if img.write_to(&mut Cursor::new(&mut buffer), ImageFormat::Png).is_ok() {
                                            let b64 = STANDARD.encode(&buffer);
                                            // Send screenshot data directly to frontend
                                            let _ = app.emit("screenshot-taken", b64);
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            
            let ctrl_shift_s = tauri_plugin_global_shortcut::Shortcut::new(
                Some(tauri_plugin_global_shortcut::Modifiers::CONTROL | tauri_plugin_global_shortcut::Modifiers::SHIFT), 
                tauri_plugin_global_shortcut::Code::KeyS
            );
            let prt_scn = tauri_plugin_global_shortcut::Shortcut::new(
                None, 
                tauri_plugin_global_shortcut::Code::PrintScreen
            );
            
            // Log registration results
            match app.global_shortcut().register(prt_scn) {
                Ok(_) => println!("PrintScreen registered OK"),
                Err(e) => println!("PrintScreen registration FAILED: {}", e),
            }
            match app.global_shortcut().register(ctrl_shift_s) {
                Ok(_) => println!("Ctrl+Shift+S registered OK"),
                Err(e) => println!("Ctrl+Shift+S registration FAILED: {}", e),
            }

            let show_i = MenuItem::with_id(app, "show", "Ana Pencereyi Goster", true, None::<&str>)?;
            let crop_i = MenuItem::with_id(app, "crop", "Alan Secerek SS Al", true, None::<&str>)?;
            let full_i = MenuItem::with_id(app, "full", "Tam Ekran SS Al", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Kapat", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&show_i, &crop_i, &full_i, &quit_i])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => std::process::exit(0),
                    "crop" => {
                        // Take screenshot from Rust and send to frontend
                        if let Ok(screens) = Screen::all() {
                            if let Some(screen) = screens.first() {
                                if let Ok(img) = screen.capture() {
                                    let mut buffer = Vec::new();
                                    if img.write_to(&mut Cursor::new(&mut buffer), ImageFormat::Png).is_ok() {
                                        let b64 = STANDARD.encode(&buffer);
                                        let _ = app.emit("screenshot-taken", b64);
                                    }
                                }
                            }
                        }
                    }
                    "full" => { let _ = app.emit("trigger-full-screenshot", ()); }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![capture_screen, enter_crop_mode, exit_crop_mode])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
