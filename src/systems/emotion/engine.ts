import type { EmotionState, EmotionEvent, EmotionLabel, DecayConfig } from "./types";

/** 各维度衰减配置：向中性值靠拢的速率 */
const DECAY: Record<keyof EmotionState, DecayConfig> = {
  joy:       { neutral: 0.5, lambda: 0.01 },
  sadness:   { neutral: 0.0, lambda: 0.02 },
  energy:    { neutral: 0.5, lambda: 0.005 },
  boredom:   { neutral: 1.0, lambda: 0.003 },
  curiosity: { neutral: 0.0, lambda: 0.05 },
  affection: { neutral: 0.5, lambda: 0.0005 },
};

/** 事件对情绪向量的修正量 */
const EVENT_MODIFIERS: Record<EmotionEvent["type"], Partial<EmotionState>> = {
  user_interaction: { joy: 0.15, affection: 0.02, boredom: -0.3 },
  chat_positive:    { joy: 0.1 },
  chat_negative:    { sadness: 0.08 },
  weather_sunny:    { joy: 0.05, energy: 0.05 },
  weather_rainy:    { sadness: 0.05, energy: -0.05 },
  sleep:            { energy: 0.3, boredom: -0.1 },
  file_dropped:     { curiosity: 0.2 },
  long_idle:        {}, // 特殊处理：由 dt 驱动 boredom 增长
};

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * 指数衰减：newValue = target + (current - target) * e^(-lambda * dt)
 * dt 单位为毫秒，内部转换为秒。
 */
export function decayEmotion(state: EmotionState, dt: number): EmotionState {
  const dtSec = dt / 1000;
  const next: Record<string, number> = {};

  for (const [key, value] of Object.entries(state)) {
    const dim = key as keyof EmotionState;
    const cfg = DECAY[dim];
    const decayed = cfg.neutral + (value - cfg.neutral) * Math.exp(-cfg.lambda * dtSec);
    next[dim] = clamp(decayed);
  }

  return next as unknown as EmotionState;
}

/**
 * 应用情绪事件，返回新的情绪状态（不修改原对象）。
 * long_idle 事件根据 dt 累加 boredom 和 sadness。
 */
export function applyEmotionEvent(state: EmotionState, event: EmotionEvent): EmotionState {
  const modifier = EVENT_MODIFIERS[event.type];
  const next = { ...state };

  for (const [key, delta] of Object.entries(modifier)) {
    const k = key as keyof EmotionState;
    next[k] = clamp(next[k] + (delta as number));
  }

  if (event.type === "long_idle") {
    const dtSec = event.dt / 1000;
    next.boredom = clamp(next.boredom + 0.01 * dtSec);
    next.sadness = clamp(next.sadness + 0.005 * dtSec);
  }

  return next;
}

/**
 * 计算当前主导情绪标签。
 * 高值优先，多个高值共存时按优先级裁决。
 */
export function getDominantEmotion(state: EmotionState): EmotionLabel {
  if (state.energy < 0.25) return "sleepy";
  if (state.boredom > 0.7) return "bored";
  if (state.sadness > 0.6) return "sad";
  if (state.curiosity > 0.6) return "curious";
  if (state.joy > 0.7) return "happy";
  if (state.energy > 0.7) return "energetic";
  return "neutral";
}

/** 创建默认情绪状态（中性起点） */
export function createDefaultEmotion(): EmotionState {
  return {
    joy: 0.5,
    sadness: 0.0,
    energy: 0.5,
    boredom: 0.0,
    curiosity: 0.0,
    affection: 0.5,
  };
}
