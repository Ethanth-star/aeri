use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub battery_percent: Option<u8>,
}

pub fn get_system_info() -> SystemInfo {
    let os = std::env::consts::OS;
    let os_label = match os {
        "windows" => "Windows".to_string(),
        "macos" => "macOS".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    };

    let battery_percent = get_battery_percent();

    SystemInfo {
        os: os_label,
        battery_percent,
    }
}

#[cfg(target_os = "windows")]
fn get_battery_percent() -> Option<u8> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SystemInformation]::PowerStatus.BatteryLifePercent * 100",
        ])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.trim().parse::<u8>().ok()
}

#[cfg(not(target_os = "windows"))]
fn get_battery_percent() -> Option<u8> {
    None
}
