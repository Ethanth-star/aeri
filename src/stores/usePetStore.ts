import { create } from "zustand";
import { AnimationController } from "../systems/animation/controller";

interface PetState {
  position: { x: number; y: number };
  controller: AnimationController;
  currentTransform: string;
  currentSprite: string | undefined;
  currentAnimation: string;
  /** 当前动画已播放的 ms 数 */
  animationElapsed: number;
  /** 距上次自主动作过去了多少 ms */
  idleTimer: number;
  joy: number;
}

interface PetActions {
  tick: (dt: number) => void;
  playAnimation: (name: string) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setIdleTimer: (t: number) => void;
  setJoy: (joy: number) => void;
}

export const usePetStore = create<PetState & PetActions>((set, get) => ({
  position: { x: 0, y: 0 },
  controller: new AnimationController(),
  currentTransform: "",
  currentSprite: undefined,
  currentAnimation: "idle",
  animationElapsed: 0,
  idleTimer: 0,
  joy: 0.5,

  tick: (dt: number) => {
    const { controller, idleTimer, animationElapsed } = get();
    const result = controller.tick(dt);
    const anim = controller.getState().currentClip;
    set({
      currentTransform: result.transform,
      currentSprite: result.sprite,
      currentAnimation: anim,
      animationElapsed: animationElapsed + dt,
      idleTimer: idleTimer + dt,
    });
  },

  playAnimation: (name: string) => {
    get().controller.play(name);
    set({ idleTimer: 0, animationElapsed: 0 });
  },

  setPosition: (pos) => set({ position: pos }),

  setIdleTimer: (t) => set({ idleTimer: t }),

  setJoy: (joy) => set({ joy: Math.max(0, Math.min(1, joy)) }),
}));
