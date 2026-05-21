mod context;

use context::{format_context, gather_context, TimeInfo, WeatherInfo, SystemInfo, ContextInfo};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_current_time() -> TimeInfo {
    context::time::get_time_info()
}

#[tauri::command]
async fn get_weather(city: String) -> Result<WeatherInfo, String> {
    context::weather::get_weather(&city).await
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    context::system::get_system_info()
}

#[tauri::command]
async fn get_context(city: Option<String>) -> Result<ContextInfo, String> {
    let city_ref = city.as_deref();
    Ok(gather_context(city_ref).await)
}

#[tauri::command]
async fn get_context_text(city: Option<String>) -> Result<String, String> {
    let city_ref = city.as_deref();
    let ctx = gather_context(city_ref).await;
    Ok(format_context(&ctx))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_time,
            get_weather,
            get_system_info,
            get_context,
            get_context_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
