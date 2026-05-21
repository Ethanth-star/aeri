pub mod time;
pub mod weather;
pub mod system;

pub use time::TimeInfo;
pub use weather::WeatherInfo;
pub use system::SystemInfo;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ContextInfo {
    pub time: time::TimeInfo,
    pub weather: Option<weather::WeatherInfo>,
    pub system: system::SystemInfo,
}

pub async fn gather_context(city: Option<&str>) -> ContextInfo {
    let time_info = time::get_time_info();
    let weather_info = match city {
        Some(c) if !c.is_empty() => weather::get_weather(c).await.ok(),
        _ => None,
    };
    let system_info = system::get_system_info();

    ContextInfo {
        time: time_info,
        weather: weather_info,
        system: system_info,
    }
}

pub fn format_context(ctx: &ContextInfo) -> String {
    let mut parts = Vec::new();

    parts.push(format!(
        "当前时间：{} {}（{}）",
        ctx.time.date, ctx.time.time, ctx.time.period
    ));

    if let Some(ref w) = ctx.weather {
        parts.push(format!(
          "天气：{}，温度 {}°C，湿度 {}%，风速 {} m/s",
          w.description, w.temperature, w.humidity, w.wind_speed
        ));
    }

    parts.push(format!("操作系统：{}", ctx.system.os));
    if let Some(ref battery) = ctx.system.battery_percent {
        parts.push(format!("电量：{}%", battery));
    }

    parts.join("\n")
}
