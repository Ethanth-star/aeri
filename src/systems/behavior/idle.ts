/**
 * MVP 自主行为系统
 * 简单的定时随机触发，不引入复杂状态机。
 */

interface EmotionState {
  joy: number; // 0 ~ 1
}

interface IdleActionResult {
  animation: string;
  duration: number; // ms，动画播放完后保持多久再触发下一个
}

const IDLE_ACTIONS: IdleActionResult[] = [
  { animation: "bounce", duration: 3000 },
  { animation: "happy", duration: 5000 },
  { animation: "thinking", duration: 4000 },
  { animation: "walk", duration: 4000 },
];

/**
 * 每次 tick 时调用，根据上次行为间隔决定是否触发新行为。
 * 返回要播放的动画名，或 null 表示什么都不做。
 */
export function tickBehavior(
  timeSinceLastAction: number,
  _emotion: EmotionState,
): string | null {
  // 每 5~10 秒随机一个行为
  const interval = 5000 + Math.random() * 5000;
  if (timeSinceLastAction < interval) return null;

  const action = IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
  return action.animation;
}
