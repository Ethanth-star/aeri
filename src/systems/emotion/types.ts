/**
 * 多维情绪向量系统 - 类型定义
 * 所有维度严格钳制在 0.0 ~ 1.0
 */
export interface EmotionState {
  joy: number;
  sadness: number;
  energy: number;
  boredom: number;
  curiosity: number;
  affection: number;
}

/** 情绪事件联合类型 */
export type EmotionEvent =
  | { type: "user_interaction" }
  | { type: "chat_positive" }
  | { type: "chat_negative" }
  | { type: "weather_sunny" }
  | { type: "weather_rainy" }
  | { type: "sleep" }
  | { type: "file_dropped" }
  | { type: "long_idle"; dt: number };

/** 主导情绪标签 */
export type EmotionLabel = "happy" | "sad" | "bored" | "curious" | "energetic" | "sleepy" | "neutral";

/** 各维度衰减配置 */
export interface DecayConfig {
  neutral: number;
  lambda: number; // 衰减速率，越大越快
}
