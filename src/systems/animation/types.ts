/** 单个动画帧：一段 CSS transform + 持续时间，可选精灵图 */
export interface AnimationFrame {
  transform: string;
  duration: number; // ms
  sprite?: string;
}

/** 一个动画片段 */
export interface AnimationClip {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
}

/** tick() 返回值 */
export interface TickResult {
  transform: string;
  sprite?: string;
}

/** 动画控制器的运行时状态 */
export interface AnimationState {
  currentClip: string;
  currentFrame: number;
  frameTimer: number; // 当前帧已过去多少 ms
  playing: boolean;
}
