import type { AnimationClip } from "./types";
import puppyImg from "../../assets/images/puppy.png";
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

/** 为缺失资产的动画生成占位帧序列（全部复用 puppy.png） */
function placeholder(count: number, duration: number): { imagePath: string; duration: number }[] {
  return Array.from({ length: count }, () => ({ imagePath: puppyImg, duration }));
}

/**
 * 动画库 — 纯图片序列帧
 * 已到位资产：idle（占位）、walk（17 帧）、bounce（8 帧）
 * 其余动画暂用 puppy.png 占位，美术资产就位后替换 import 即可。
 */
export const CLIPS: Record<string, AnimationClip> = {
  idle: {
    name: "idle",
    loop: true,
    frames: [{ imagePath: puppyImg, duration: 1000 }],
  },

  walk: {
    name: "walk",
    loop: true,
    frames: [
      { imagePath: walk0, duration: 120 },
      { imagePath: walk1, duration: 120 },
      { imagePath: walk2, duration: 120 },
      { imagePath: walk3, duration: 120 },
      { imagePath: walk4, duration: 120 },
      { imagePath: walk5, duration: 120 },
      { imagePath: walk6, duration: 120 },
      { imagePath: walk7, duration: 120 },
      { imagePath: walk8, duration: 120 },
      { imagePath: walk9, duration: 120 },
      { imagePath: walk10, duration: 120 },
      { imagePath: walk11, duration: 120 },
      { imagePath: walk12, duration: 120 },
      { imagePath: walk13, duration: 120 },
      { imagePath: walk14, duration: 120 },
      { imagePath: walk15, duration: 120 },
      { imagePath: walk16, duration: 120 },
    ],
  },

  bounce: {
    name: "bounce",
    loop: false,
    frames: [
      { imagePath: bounce0, duration: 80 },
      { imagePath: bounce1, duration: 80 },
      { imagePath: bounce2, duration: 80 },
      { imagePath: bounce3, duration: 80 },
      { imagePath: bounce4, duration: 80 },
      { imagePath: bounce5, duration: 80 },
      { imagePath: bounce6, duration: 80 },
      { imagePath: bounce7, duration: 80 },
    ],
  },

  // ---- 以下动画美术资产尚未就位，使用 puppy.png 占位 ----

  happy: {
    name: "happy",
    loop: false,
    frames: placeholder(5, 150),
  },

  thinking: {
    name: "thinking",
    loop: true,
    frames: placeholder(4, 600),
  },

  sleep: {
    name: "sleep",
    loop: true,
    frames: placeholder(2, 2000),
  },

  ear_droop: {
    name: "ear_droop",
    loop: true,
    frames: placeholder(3, 400),
  },

  wag_tail: {
    name: "wag_tail",
    loop: true,
    frames: placeholder(4, 150),
  },

  excited: {
    name: "excited",
    loop: false,
    frames: placeholder(6, 120),
  },

  curious_look: {
    name: "curious_look",
    loop: false,
    frames: placeholder(3, 300),
  },

  shiver: {
    name: "shiver",
    loop: true,
    frames: placeholder(4, 200),
  },

  stretch: {
    name: "stretch",
    loop: false,
    frames: placeholder(5, 250),
  },
};
