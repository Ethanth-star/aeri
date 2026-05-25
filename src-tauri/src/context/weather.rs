use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct WeatherInfo {
    pub city: String,
    pub temperature: f64,
    pub humidity: u32,
    pub description: String,
    pub wind_speed: f64,
}

#[derive(Debug, Deserialize)]
struct OwmResponse {
    name: String,
    main: OwmMain,
    weather: Vec<OwmWeather>,
    wind: OwmWind,
}

#[derive(Debug, Deserialize)]
struct OwmMain {
    temp: f64,
    humidity: u32,
}

#[derive(Debug, Deserialize)]
struct OwmWeather {
    description: String,
}

#[derive(Debug, Deserialize)]
struct OwmWind {
    speed: f64,
}

pub async fn get_weather(city: &str) -> Result<WeatherInfo, String> {
    let api_key = std::env::var("OWM_API_KEY").map_err(|_| "未设置 OWM_API_KEY 环境变量".to_string())?;

    let url = format!(
        "https://api.openweathermap.org/data/2.5/weather?q={}&appid={}&units=metric&lang=zh_cn",
        city, api_key
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("天气请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("天气 API 返回错误: {}", resp.status()));
    }

    let data: OwmResponse = resp
        .json()
        .await
        .map_err(|e| format!("天气数据解析失败: {}", e))?;

    Ok(WeatherInfo {
        city: data.name,
        temperature: data.main.temp,
        humidity: data.main.humidity,
        description: data.weather[0].description.clone(),
        wind_speed: data.wind.speed,
    })
}
