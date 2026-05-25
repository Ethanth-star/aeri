import type { AnimationClip, AnimationState, TickResult } from "./types";
import { CLIPS } from "./animations";

export class AnimationController {
  private state: AnimationState;
  private clips: Record<string, AnimationClip>;

  constructor(clips: Record<string, AnimationClip> = CLIPS) {
    this.clips = clips;
    this.state = {
      currentClip: "idle",
      currentFrame: 0,
      frameTimer: 0,
      playing: true,
    };
  }

  /** 切换动画（仅在动画名称不同时切换） */
  play(name: string): void {
    if (name === this.state.currentClip) return;
    const clip = this.clips[name];
    if (!clip) return;
    this.state = {
      currentClip: name,
      currentFrame: 0,
      frameTimer: 0,
      playing: true,
    };
  }

  /** 每帧调用，推进动画时间。返回当前帧的 TickResult */
  tick(dt: number): TickResult {
    const clip = this.clips[this.state.currentClip];
    if (!clip) return { transform: "" };

    this.state.frameTimer += dt;
    const frame = clip.frames[this.state.currentFrame];

    // 推进到下一帧
    while (this.state.frameTimer >= frame.duration) {
      this.state.frameTimer -= frame.duration;
      this.state.currentFrame++;

      if (this.state.currentFrame >= clip.frames.length) {
        if (clip.loop) {
          this.state.currentFrame = 0;
        } else {
          // 非循环动画：播完后回到 idle
          this.state.currentFrame = clip.frames.length - 1;
          this.play("idle");
          return this.tick(0);
        }
      }
    }

    const result: TickResult = {
      transform: clip.frames[this.state.currentFrame].transform,
      sprite: clip.frames[this.state.currentFrame].sprite,
    };
    return result;
  }

  getState(): AnimationState {
    return { ...this.state };
  }
}
