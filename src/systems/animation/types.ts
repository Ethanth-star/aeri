/** 单个动画帧：图片路径 + 持续时间 */
export interface AnimationFrame {
  imagePath: string;
  duration: number; // ms
}

/** 一个动画片段 */
export interface AnimationClip {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
}

/** 动画控制器的运行时状态 */
export interface AnimationState {
  currentClip: string;
  currentFrame: number;
  frameTimer: number; // 当前帧已过去多少 ms
  playing: boolean;
}
