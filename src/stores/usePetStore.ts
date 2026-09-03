import { create } from "zustand";
import { AnimationController } from "../systems/animation/controller";
import type { EmotionState, EmotionEvent } from "../systems/emotion/types";
import { decayEmotion, applyEmotionEvent, createDefaultEmotion } from "../systems/emotion/engine";

/** FSM 状态标签 */
export type PetState = "IDLE" | "DRAGGED" | "THINKING" | "TALKING" | "SLEEPING";

interface PetStore {
  position: { x: number; y: number };

  // FSM
  currentState: PetState;

  // 情绪
  emotion: EmotionState;

  // 动画帧指针
  currentClipName: string;
  currentFrameIndex: number;
  currentFrameImage: string;
  animationElapsed: number;

  // 自主动作计时
  idleTimer: number;

  // 睡眠计时（SLEEPING 状态下累积，到达阈值自动苏醒）
  sleepTimer: number;

  // 朝向：1 = 朝右, -1 = 朝左 (翻转贴图)
  facingDirection: 1 | -1;

  // 内部
  _controller: AnimationController;
}

interface PetActions {
  /** 每帧心跳：衰减情绪 + 推进动画 */
  tickStore: (dt: number) => void;
  /** 播放指定动画片段 */
  playAnimation: (name: string) => void;
  /**
   * FSM 状态切换
   * 铁律：当前为 DRAGGED 时拒绝一切外部状态变更
   */
  changeState: (newState: PetState) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setIdleTimer: (t: number) => void;
  setFacingDirection: (dir: 1 | -1) => void;
  /** 对情绪向量施加事件修正 */
  emitEmotionEvent: (event: EmotionEvent) => void;
}

export const usePetStore = create<PetStore & PetActions>((set, get) => ({
  position: { x: 0, y: 0 },
  currentState: "IDLE",
  emotion: createDefaultEmotion(),
  currentClipName: "idle",
  currentFrameIndex: 0,
  currentFrameImage: "",
  animationElapsed: 0,
  idleTimer: 0,
  sleepTimer: 0,
  facingDirection: 1,
  _controller: new AnimationController(),

  tickStore: (dt: number) => {
    const { _controller, emotion, idleTimer, animationElapsed, currentState, sleepTimer } = get();

    // 1. 情绪衰减
    const newEmotion = decayEmotion(emotion, dt);

    // 2. 推进动画
    const imagePath = _controller.tick(dt);
    const animState = _controller.getState();

    // 3. SLEEPING 自动苏醒：10 秒后切回 IDLE
    let newState = currentState;
    let newSleepTimer = sleepTimer;
    if (currentState === "SLEEPING") {
      newSleepTimer = sleepTimer + dt;
      if (newSleepTimer >= 10000) {
        newState = "IDLE";
        newSleepTimer = 0;
        _controller.play("idle");
      }
    }

    set({
      emotion: newEmotion,
      currentState: newState,
      currentClipName: animState.currentClip,
      currentFrameIndex: animState.currentFrame,
      currentFrameImage: imagePath,
      animationElapsed: animationElapsed + dt,
      idleTimer: idleTimer + dt,
      sleepTimer: newSleepTimer,
    });
  },

  playAnimation: (name: string) => {
    const { _controller } = get();
    _controller.play(name);
    set({ idleTimer: 0, animationElapsed: 0 });

    // 特殊动画 → FSM 状态联动
    if (name === "sleep") {
      set({ currentState: "SLEEPING", sleepTimer: 0 });
    }
    // walk / bounce / happy 等在 IDLE 下触发，不改变状态
  },

  changeState: (newState: PetState) => {
    const { currentState } = get();
    // 铁律：DRAGGED 状态下拒绝一切外部状态变更
    if (currentState === "DRAGGED") return;
    set({ currentState: newState });
  },

  setPosition: (pos) => set({ position: pos }),

  setIdleTimer: (t) => set({ idleTimer: t }),

  setFacingDirection: (dir) => set({ facingDirection: dir }),

  emitEmotionEvent: (event: EmotionEvent) => {
    const { emotion } = get();
    set({ emotion: applyEmotionEvent(emotion, event) });
  },
}));
