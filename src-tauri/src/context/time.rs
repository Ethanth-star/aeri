use chrono::{Local, Timelike, Datelike};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TimeInfo {
    pub date: String,
    pub time: String,
    pub weekday: String,
    pub period: String, 
}

fn period_label(hour: u32) -> &'static str {
    match hour {
        5..=8 => "清晨",
        9..=11 => "上午",
        12..=13 => "中午",
        14..=17 => "下午",
        18..=20 => "傍晚",
        21..=23 => "夜晚",
        0..=4 => "深夜",
        _ => "未知",
    }
}

fn weekday_cn(weekday: chrono::Weekday) -> &'static str {
    match weekday {
        chrono::Weekday::Mon => "星期一",
        chrono::Weekday::Tue => "星期二",
        chrono::Weekday::Wed => "星期三",
        chrono::Weekday::Thu => "星期四",
        chrono::Weekday::Fri => "星期五",
        chrono::Weekday::Sat => "星期六",
        chrono::Weekday::Sun => "星期日",
    }
}

pub fn get_time_info() -> TimeInfo {
    let now = Local::now();
    let hour = now.hour();
    TimeInfo {
        date: now.format("%Y年%m月%d日").to_string(),
        time: now.format("%H:%M").to_string(),
        weekday: weekday_cn(now.weekday()).to_string(),
        period: period_label(hour).to_string(),
    }
}
