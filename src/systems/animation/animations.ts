import type { AnimationClip } from "./types";
import walk0 from "../../assets/sprites/walk/walk_0.png";
import walk1 from "../../assets/sprites/walk/walk_1.png";
import walk2 from "../../assets/sprites/walk/walk_2.png";
import walk3 from "../../assets/sprites/walk/walk_3.png";

/**
 * 动画库
 * 支持纯 CSS transform 动画和精灵图帧动画。
 */
export const CLIPS: Record<string, AnimationClip> = {
  idle: {
    name: "idle",
    loop: true,
    frames: [
      { transform: "translateY(0px)", duration: 1200 },
      { transform: "translateY(-3px)", duration: 1200 },
      { transform: "translateY(0px)", duration: 1200 },
      { transform: "translateY(3px)", duration: 1200 },
    ],
  },

  happy: {
    name: "happy",
    loop: false,
    frames: [
      { transform: "translateY(0px) scale(1)", duration: 150 },
      { transform: "translateY(-8px) scale(1.15)", duration: 150 },
      { transform: "translateY(0px) scale(1)", duration: 150 },
      { transform: "translateY(-4px) scale(1.1)", duration: 150 },
      { transform: "translateY(0px) scale(1)", duration: 150 },
    ],
  },

  thinking: {
    name: "thinking",
    loop: true,
    frames: [
      { transform: "rotate(0deg)", duration: 600 },
      { transform: "rotate(-8deg)", duration: 600 },
      { transform: "rotate(0deg)", duration: 600 },
      { transform: "rotate(8deg)", duration: 600 },
    ],
  },

  sleep: {
    name: "sleep",
    loop: true,
    frames: [
      { transform: "translateY(0px) scaleY(1)", duration: 2000 },
      { transform: "translateY(2px) scaleY(0.92)", duration: 2000 },
    ],
  },

  bounce: {
    name: "bounce",
    loop: false,
    frames: [
      { transform: "translateY(0px)", duration: 80 },
      { transform: "translateY(-12px)", duration: 200 },
      { transform: "translateY(0px)", duration: 120 },
      { transform: "translateY(-4px)", duration: 100 },
      { transform: "translateY(0px)", duration: 80 },
    ],
  },

  walk: {
    name: "walk",
    loop: true,
    frames: [
      { transform: "", sprite: walk0, duration: 120 },
      { transform: "", sprite: walk1, duration: 120 },
      { transform: "", sprite: walk2, duration: 120 },
      { transform: "", sprite: walk3, duration: 120 },
    ],
  },
};
