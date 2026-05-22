import type { AnimationClip } from "./types";
import walk0 from "../../assets/sprites/walk/walk_0.png";
import walk1 from "../../assets/sprites/walk/walk_1.png";
import walk2 from "../../assets/sprites/walk/walk_2.png";
import walk3 from "../../assets/sprites/walk/walk_3.png";
import bounce0 from "../../assets/sprites/bounce/bounce_0.png";
import bounce1 from "../../assets/sprites/bounce/bounce_1.png";
import bounce2 from "../../assets/sprites/bounce/bounce_2.png";
import bounce3 from "../../assets/sprites/bounce/bounce_3.png";
import bounce4 from "../../assets/sprites/bounce/bounce_4.png";
import bounce5 from "../../assets/sprites/bounce/bounce_5.png";
import bounce6 from "../../assets/sprites/bounce/bounce_6.png";
import bounce7 from "../../assets/sprites/bounce/bounce_7.png";

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
      { transform: "", sprite: bounce0, duration: 80 },
      { transform: "", sprite: bounce1, duration: 80 },
      { transform: "", sprite: bounce2, duration: 80 },
      { transform: "", sprite: bounce3, duration: 80 },
      { transform: "", sprite: bounce4, duration: 80 },
      { transform: "", sprite: bounce5, duration: 80 },
      { transform: "", sprite: bounce6, duration: 80 },
      { transform: "", sprite: bounce7, duration: 80 },
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
