mod context;
pub mod hardware;

use context::{format_context, gather_context, ContextInfo, SystemInfo, TimeInfo, WeatherInfo};
use hardware::{HardwareState, HardwareStatus};

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

#[derive(serde::Serialize)]
struct StepPetResult {
    pub x: i32,
    pub y: i32,
    pub direction: i32,
    pub hit_edge: bool,
}

#[tauri::command]
fn step_pet_window(
    window: tauri::Window,
    dx: i32,
    dy: i32,
    mut direction: i32,
) -> Result<StepPetResult, String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("No monitors found".to_string());
    }

    // 计算全局显示器多屏虚拟桌面的最外层包围盒 (Global Desktop Union)
    let mut min_x = i32::MAX;
    let mut max_x = i32::MIN;
    let mut min_y = i32::MAX;
    let mut max_y = i32::MIN;

    for m in &monitors {
        let pos = m.position();
        let size = m.size();
        let right = pos.x + size.width as i32;
        let bottom = pos.y + size.height as i32;

        if pos.x < min_x { min_x = pos.x; }
        if right > max_x { max_x = right; }
        if pos.y < min_y { min_y = pos.y; }
        if bottom > max_y { max_y = bottom; }
    }

    let current_pos = window.outer_position().map_err(|e| e.to_string())?;
    let win_size = window.outer_size().map_err(|e| e.to_string())?;
    let win_w = win_size.width as i32;
    let win_h = win_size.height as i32;

    let mut hit_edge = false;
    let actual_dx = dx * direction;
    let mut target_x = current_pos.x + actual_dx;
    let mut target_y = current_pos.y + dy;

    // 检查 X 轴左右边界（考虑多屏幕跨屏与最外侧碰撞）
    if target_x + win_w >= max_x {
        target_x = max_x - win_w;
        direction = -1; // 撞右边缘，调头向左
        hit_edge = true;
    } else if target_x <= min_x {
        target_x = min_x;
        direction = 1;  // 撞左边缘，调头向右
        hit_edge = true;
    }

    // 检查 Y 轴上下边界（永远不能掉出屏幕上下方）
    if target_y + win_h >= max_y {
        target_y = max_y - win_h;
    } else if target_y <= min_y {
        target_y = min_y;
    }

    // 执行移动
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_x,
            y: target_y,
        }))
        .map_err(|e| e.to_string())?;

    Ok(StepPetResult {
        x: target_x,
        y: target_y,
        direction,
        hit_edge,
    })
}

#[tauri::command]
fn scan_serial_ports() -> Vec<String> {
    hardware::scan_ports()
}

#[tauri::command]
fn connect_serial(
    app: tauri::AppHandle,
    state: tauri::State<'_, HardwareState>,
    port: String,
    baud_rate: Option<u32>,
) -> Result<(), String> {
    let baud = baud_rate.unwrap_or(115200);
    hardware::connect(app, &state, port, baud)
}

#[tauri::command]
fn disconnect_serial(
    app: tauri::AppHandle,
    state: tauri::State<'_, HardwareState>,
) -> Result<(), String> {
    hardware::disconnect(&app, &state)
}

#[tauri::command]
fn send_hardware_cmd(
    state: tauri::State<'_, HardwareState>,
    cmd: u8,
    data_h: u8,
    data_l: u8,
) -> Result<(), String> {
    hardware::send_command(&state, cmd, data_h, data_l)
}

#[tauri::command]
fn get_hardware_status(state: tauri::State<'_, HardwareState>) -> HardwareStatus {
    hardware::get_status(&state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HardwareState::new())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_time,
            get_weather,
            get_system_info,
            get_context,
            get_context_text,
            step_pet_window,
            scan_serial_ports,
            connect_serial,
            disconnect_serial,
            send_hardware_cmd,
            get_hardware_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
