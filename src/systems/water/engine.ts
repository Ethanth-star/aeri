import type { DrinkWaterState } from "./types";

export const REMIND_MESSAGES = [
  "主人该喝水啦！咕噜咕噜~ 补充水分身体棒棒汪！🥛",
  "已经有一会儿没喝水咯，小狗提醒主人快喝一大口！汪！(｡･ω･｡)",
  "渴了吗主人？喝口水润润喉咙休息一下吧汪~ 💧",
  "叮咚！喝水时间到！小狗监督主人喝水汪~",
];

export const PRAISE_MESSAGES = [
  "好耶！主人喝完水啦！今天第 {count} 次喝水，太棒了汪！✨",
  "咕噜咕噜~ 监测到主人喝水啦！身体棒棒，奖励摇尾巴汪！(≧∇≦)ﾉ",
  "主人真乖！按时补充水分，小狗最喜欢自律的主人啦汪~ 💖",
];

export function getRandomRemindMessage(): string {
  const idx = Math.floor(Math.random() * REMIND_MESSAGES.length);
  return REMIND_MESSAGES[idx];
}

export function getRandomPraiseMessage(count: number): string {
  const idx = Math.floor(Math.random() * PRAISE_MESSAGES.length);
  return PRAISE_MESSAGES[idx].replace("{count}", count.toString());
}

/**
 * 3 点中值滤波：剔除超声波单帧偶发回波扰动
 */
function medianFilter(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * 超声波物理测距水杯检测算法
 * 原理：
 * 1. 超声波通过声波飞行时间测距，完全不受任何环境光线与阴影干扰；
 * 2. 水杯放置在位时，测得基准物理距离 (如 12cm)；
 * 3. 拿起水杯后，测距变为后方桌面/墙面背景距离 (如 > 25cm)，判定为“水杯拿起”；
 * 4. 水杯放回原位时，距离恢复至基准范围 (12cm ± 门限)，判定为“喝水成功”！
 */
export function evaluateDistance(
  state: DrinkWaterState,
  rawDistanceCm: number,
): { nextState: DrinkWaterState; drankWater: boolean } {
  const history = [...(state.historySamples || []), rawDistanceCm];
  if (history.length > 3) history.shift();

  const filtered = medianFilter(history);
  const diff = Math.abs(filtered - state.baselineDistance);
  const isCupAway = diff > state.distanceThreshold;

  let drankWater = false;
  let nextWasDrinking = state.wasDrinking;
  let nextCupPresent = state.cupPresent;

  if (isCupAway) {
    // 距离偏离基准 -> 水杯被拿起
    nextCupPresent = false;
    nextWasDrinking = true;
  } else {
    // 距离回到基准范围 -> 水杯在位
    nextCupPresent = true;
    if (state.wasDrinking) {
      // 刚才拿起了，现在放回 -> 完成一次喝水！
      drankWater = true;
      nextWasDrinking = false;
    }
  }

  const nextState: DrinkWaterState = {
    ...state,
    currentDistance: rawDistanceCm,
    filteredDistance: filtered,
    cupPresent: nextCupPresent,
    wasDrinking: nextWasDrinking,
    historySamples: history,
  };

  return { nextState, drankWater };
}

/**
 * 桌面放置震动辅助融合
 */
export function evaluateVibrationWithCup(
  state: DrinkWaterState,
): { nextState: DrinkWaterState; drankWater: boolean } {
  if (state.wasDrinking) {
    return {
      nextState: {
        ...state,
        cupPresent: true,
        wasDrinking: false,
      },
      drankWater: true,
    };
  }
  return { nextState: state, drankWater: false };
}
