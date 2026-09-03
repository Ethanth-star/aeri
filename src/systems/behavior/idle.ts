import type { EmotionState } from "../emotion/types";

interface ActionWeights {
  animation: string;
  weights: Partial<Record<keyof EmotionState, number>>;
}

const ACTION_WEIGHTS: ActionWeights[] = [
  { animation: "bounce",       weights: { joy: 0.5, energy: 0.4 } },
  { animation: "walk",         weights: { energy: 0.3, curiosity: 0.3, boredom: -0.3 } },
  { animation: "happy",        weights: { joy: 0.6, energy: 0.2 } },
  { animation: "thinking",     weights: { curiosity: 0.5 } },
  { animation: "ear_droop",    weights: { sadness: 0.5, energy: -0.2 } },
  { animation: "wag_tail",     weights: { joy: 0.4, affection: 0.2 } },
  { animation: "excited",      weights: { joy: 0.5, energy: 0.4, curiosity: 0.2 } },
  { animation: "curious_look", weights: { curiosity: 0.5 } },
  { animation: "shiver",       weights: { sadness: 0.4, energy: -0.1 } },
  { animation: "stretch",      weights: { energy: -0.3, boredom: 0.2 } },
];

const NOISE_FACTOR = 0.18;
const SCORE_THRESHOLD = 0.05;
const COOLDOWN_MS = 8000;

let lastAction = "";
let lastActionTime = 0;

/**
 * 情绪加权随机选择器
 * 对每个动作做情绪点积 + 噪声扰动，返回最高分动作。
 * 含冷却机制：同一动作 8 秒内不会连续触发。
 */
export function pickBehavior(emotion: EmotionState): string {
  let bestScore = -Infinity;
  let bestAction = "idle";

  for (const entry of ACTION_WEIGHTS) {
    if (entry.animation === lastAction && Date.now() - lastActionTime < COOLDOWN_MS) {
      continue;
    }

    let score = 0;
    let hasWeight = false;
    for (const [dim, weight] of Object.entries(entry.weights)) {
      const key = dim as keyof EmotionState;
      score += emotion[key] * (weight as number);
      hasWeight = true;
    }
    if (!hasWeight) continue;

    score += (Math.random() - 0.5) * NOISE_FACTOR;

    if (score > bestScore) {
      bestScore = score;
      bestAction = entry.animation;
    }
  }

  if (bestScore < SCORE_THRESHOLD) {
    return "idle";
  }

  lastAction = bestAction;
  lastActionTime = Date.now();
  return bestAction;
}

/**
 * 判断是否到达随机触发间隔。
 * 返回要播放的动画名，或 null。
 */
export function tickBehavior(
  timeSinceLastAction: number,
  emotion: EmotionState,
): string | null {
  const interval = 5000 + Math.random() * 5000;
  if (timeSinceLastAction < interval) return null;

  return pickBehavior(emotion);
}
