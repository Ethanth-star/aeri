import type { AnimationClip, AnimationState } from "./types";
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

  /** 每帧调用，推进动画时间。返回当前帧的图片路径 */
  tick(dt: number): string {
    const clip = this.clips[this.state.currentClip];
    if (!clip || clip.frames.length === 0) return "";

    this.state.frameTimer += dt;

    while (this.state.frameTimer >= clip.frames[this.state.currentFrame].duration) {
      this.state.frameTimer -= clip.frames[this.state.currentFrame].duration;
      this.state.currentFrame++;

      if (this.state.currentFrame >= clip.frames.length) {
        if (clip.loop) {
          this.state.currentFrame = 0;
        } else {
          this.state.currentFrame = clip.frames.length - 1;
          if (this.state.currentClip !== "idle") {
            this.play("idle");
            return this.tick(0);
          }
        }
      }
    }

    return clip.frames[this.state.currentFrame].imagePath;
  }

  getState(): AnimationState {
    return { ...this.state };
  }
}
