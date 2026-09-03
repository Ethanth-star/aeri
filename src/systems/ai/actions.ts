import { useHardwareStore } from "../../stores/useHardwareStore";
import { usePetStore } from "../../stores/usePetStore";
import { LedMode, BeepPattern } from "../hardware/types";

export type AeriActionType =
  | "BARK"
  | "SING"
  | "LIGHT_FLOW"
  | "LIGHT_IDLE"
  | "BOUNCE"
  | "WALK"
  | "WAG_TAIL"
  | "SLEEP"
  | "EXCITED"
  | "STRETCH";

const lastActionTimes: Partial<Record<AeriActionType, number>> = {};
const ACTION_COOLDOWN_MS = 1000;

/**
 * 执行 Aeri 的具身物理行动与桌面动画 (带防连发冷却保护)
 */
export function executeAeriAction(action: AeriActionType) {
  const now = Date.now();
  const lastTime = lastActionTimes[action] || 0;
  if (now - lastTime < ACTION_COOLDOWN_MS) {
    return; // 防止快速连击或重复触发
  }
  lastActionTimes[action] = now;

  const hw = useHardwareStore.getState();
  const pet = usePetStore.getState();

  switch (action) {
    case "BARK":
      // 蜂鸣器狗叫两声 + 屏幕欢快动作
      hw.playBeepPattern(BeepPattern.BARK).catch(() => {});
      hw.setLedMode(LedMode.HAPPY).catch(() => {});
      pet.playAnimation("happy");
      break;

    case "SING":
      // 蜂鸣器播放欢乐旋律 + 兴奋动作
      hw.playBeepPattern(BeepPattern.HAPPY).catch(() => {});
      hw.setLedMode(LedMode.HAPPY).catch(() => {});
      pet.playAnimation("excited");
      break;

    case "LIGHT_FLOW":
      // 开启板子跑马流光灯
      hw.setLedMode(LedMode.HAPPY).catch(() => {});
      break;

    case "LIGHT_IDLE":
      // 关闭跑马流光灯
      hw.setLedMode(LedMode.IDLE).catch(() => {});
      break;

    case "BOUNCE":
      // 屏幕抛物线跳跃
      pet.playAnimation("bounce");
      break;

    case "WALK":
      // 屏幕漫步走动
      pet.playAnimation("walk");
      break;

    case "WAG_TAIL":
      // 摇尾巴撒娇
      pet.playAnimation("wag_tail");
      break;

    case "SLEEP":
      // 闭眼睡觉，进入睡眠态
      pet.playAnimation("sleep");
      hw.setLedMode(LedMode.IDLE).catch(() => {});
      break;

    case "EXCITED":
      // 兴奋蹦跶
      pet.playAnimation("excited");
      break;

    case "STRETCH":
      // 伸懒腰
      pet.playAnimation("stretch");
      break;
  }
}

/**
 * 0毫秒快速本能反射通道 (Fast Reflex)
 * 当用户输入包含明确直接的身体/硬件指令时，在 0ms 立即驱动硬件发声与身体动作！
 */
export function checkFastReflex(userPrompt: string): boolean {
  const text = userPrompt.trim().toLowerCase();

  // 1. 叫唤类指令
  if (/(叫两声|叫一下|叫两下|汪一声|学狗叫|叫个|叫叫|叫一叫|叫唤)/.test(text)) {
    executeAeriAction("BARK");
    return true;
  }

  // 2. 音乐/唱歌指令
  if (/(唱首歌|放首歌|放个音乐|来点音乐|播放音乐|唱个歌|放音乐|来首歌)/.test(text)) {
    executeAeriAction("SING");
    return true;
  }

  // 3. 灯光控制指令
  if (/(开流光灯|开跑马灯|开灯|开流光|流水灯|闪一下)/.test(text)) {
    executeAeriAction("LIGHT_FLOW");
    return true;
  }
  if (/(关流光灯|关跑马灯|关灯|熄灯)/.test(text)) {
    executeAeriAction("LIGHT_IDLE");
    return true;
  }

  // 4. 动作类指令
  if (/(跳一下|蹦一下|跳两下|蹦两下|跳个舞|蹦蹦|跳跳|跳跃)/.test(text)) {
    executeAeriAction("BOUNCE");
    return true;
  }

  if (/(走两步|散散步|去散步|走走|去溜达|散步|走一走)/.test(text)) {
    executeAeriAction("WALK");
    return true;
  }

  if (/(摇尾巴|摇摇尾巴|甩尾巴)/.test(text)) {
    executeAeriAction("WAG_TAIL");
    return true;
  }

  if (/(去睡觉|睡觉吧|晚安|去休息|睡吧|呼呼)/.test(text)) {
    executeAeriAction("SLEEP");
    return true;
  }

  if (/(伸懒腰|伸个懒腰)/.test(text)) {
    executeAeriAction("STRETCH");
    return true;
  }

  return false;
}

/**
 * 流式 Action 标签安全剥离器
 * 将流式输出中可能跨 chunk 的 [ACTION:XXX] 拦截并执行，返回给用户纯净文本
 */
export class ActionStreamFilter {
  private buffer = "";

  processChunk(chunk: string): string {
    this.buffer += chunk;

    // 检查并执行完整的 [ACTION:XXX]
    const actionRegex = /\[ACTION:([A-Z_]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = actionRegex.exec(this.buffer)) !== null) {
      const actionName = match[1] as AeriActionType;
      executeAeriAction(actionName);
    }
    this.buffer = this.buffer.replace(/\[ACTION:[A-Z_]+\]/g, "");

    // 检查是否有未闭合的部分标签前缀，如 "[ACT" 或 "[ACTION:BAR"
    const partialMatch = /\[(?:A(?:C(?:T(?:I(?:O(?:N(?::(?:[A-Z_]*)?)?)?)?)?)?)?)?$/.exec(this.buffer);
    if (partialMatch) {
      const safeText = this.buffer.slice(0, partialMatch.index);
      this.buffer = this.buffer.slice(partialMatch.index);
      return safeText;
    }

    const output = this.buffer;
    this.buffer = "";
    return output;
  }

  flush(): string {
    const output = this.buffer.replace(/\[ACTION:[A-Z_]+\]/g, "");
    this.buffer = "";
    return output;
  }
}
