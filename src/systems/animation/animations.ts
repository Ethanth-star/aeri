import type { AnimationClip } from "./types";
import walk0 from "../../assets/sprites/walk/walk_0.png";
import walk1 from "../../assets/sprites/walk/walk_1.png";
import walk2 from "../../assets/sprites/walk/walk_2.png";
import walk3 from "../../assets/sprites/walk/walk_3.png";
import walk4 from "../../assets/sprites/walk/walk_4.png";
import walk5 from "../../assets/sprites/walk/walk_5.png";
import walk6 from "../../assets/sprites/walk/walk_6.png";
import walk7 from "../../assets/sprites/walk/walk_7.png";
import walk8 from "../../assets/sprites/walk/walk_8.png";
import walk9 from "../../assets/sprites/walk/walk_9.png";
import walk10 from "../../assets/sprites/walk/walk_10.png";
import walk11 from "../../assets/sprites/walk/walk_11.png";
import walk12 from "../../assets/sprites/walk/walk_12.png";
import walk13 from "../../assets/sprites/walk/walk_13.png";
import walk14 from "../../assets/sprites/walk/walk_14.png";
import walk15 from "../../assets/sprites/walk/walk_15.png";
import walk16 from "../../assets/sprites/walk/walk_16.png";
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
      { transform: "", sprite: walk4, duration: 120 },
      { transform: "", sprite: walk5, duration: 120 },
      { transform: "", sprite: walk6, duration: 120 },
      { transform: "", sprite: walk7, duration: 120 },
      { transform: "", sprite: walk8, duration: 120 },
      { transform: "", sprite: walk9, duration: 120 },
      { transform: "", sprite: walk10, duration: 120 },
      { transform: "", sprite: walk11, duration: 120 },
      { transform: "", sprite: walk12, duration: 120 },
      { transform: "", sprite: walk13, duration: 120 },
      { transform: "", sprite: walk14, duration: 120 },
      { transform: "", sprite: walk15, duration: 120 },
      { transform: "", sprite: walk16, duration: 120 },
    ],
  },
};
