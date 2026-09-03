import { create } from "zustand";
import type { DrinkWaterConfig, DrinkWaterState } from "../systems/water/types";
import {
  evaluateDistance,
  evaluateVibrationWithCup,
  getRandomPraiseMessage,
  getRandomRemindMessage,
} from "../systems/water/engine";
import { usePetStore } from "./usePetStore";
import { useChatStore } from "./useChatStore";
import { useHardwareStore } from "./useHardwareStore";
import { LedMode, BeepPattern } from "../systems/hardware/types";

interface WaterStoreState extends DrinkWaterState {
  remindText: string;
}

interface WaterStoreActions {
  updateDistance: (distanceCm: number) => void;
  handleVibrationImpact: () => void;
  onDrinkSuccess: () => void;
  tickWater: (dtMs: number) => void;
  manualDrink: () => void;
  calibrateBaseline: () => void;
  setConfig: (cfg: Partial<DrinkWaterConfig>) => void;
  dismissReminder: () => void;
}

export const useWaterStore = create<WaterStoreState & WaterStoreActions>((set, get) => ({
  enabled: true,
  intervalSeconds: 20, // 测试版默认 20 秒
  baselineDistance: 12, // 默认水杯基准距离 12cm
  distanceThreshold: 4, // 偏离 4cm 判定为拿起水杯
  currentDistance: 12,
  filteredDistance: 12,
  cupPresent: true,
  wasDrinking: false,
  lastDrinkTime: Date.now(),
  secondsSinceLastDrink: 0,
  todayDrinkCount: 0,
  isReminding: false,
  remindText: "",
  historySamples: [],

  updateDistance: (distanceCm: number) => {
    const { enabled } = get();
    if (!enabled) return;

    const { nextState, drankWater } = evaluateDistance(get(), distanceCm);
    set(nextState);

    if (drankWater) {
      get().onDrinkSuccess();
    }
  },

  handleVibrationImpact: () => {
    const { enabled } = get();
    if (!enabled) return;

    const { nextState, drankWater } = evaluateVibrationWithCup(get());
    set(nextState);

    if (drankWater) {
      get().onDrinkSuccess();
    }
  },

  onDrinkSuccess: () => {
    const nextCount = get().todayDrinkCount + 1;
    const praiseText = getRandomPraiseMessage(nextCount);

    set({
      todayDrinkCount: nextCount,
      secondsSinceLastDrink: 0,
      lastDrinkTime: Date.now(),
      isReminding: false,
      wasDrinking: false,
      remindText: "",
    });

    // 联动 Aeri 情绪与对话气泡 (同步存入聊天记录历史)
    usePetStore.getState().emitEmotionEvent({ type: "user_interaction" });
    usePetStore.getState().playAnimation("happy");
    useChatStore.getState().addAssistantMessage(praiseText);

    // 联动实体板声光奖励
    useHardwareStore.getState().setLedMode(LedMode.HAPPY).catch(() => {});
    useHardwareStore.getState().playBeepPattern(BeepPattern.HAPPY).catch(() => {});
  },

  tickWater: (dtMs: number) => {
    const { enabled, isReminding, secondsSinceLastDrink, intervalSeconds } = get();
    if (!enabled) return;

    const newElapsed = secondsSinceLastDrink + dtMs / 1000;
    set({ secondsSinceLastDrink: newElapsed });

    // 到达间隔且当前未在提醒
    if (newElapsed >= intervalSeconds && !isReminding) {
      const msg = getRandomRemindMessage();
      set({ isReminding: true, remindText: msg });

      // 气泡提醒 + 同步存入聊天记录历史
      useChatStore.getState().addAssistantMessage(msg);
      usePetStore.getState().playAnimation("curious_look");

      // 板子提示音与灯效
      useHardwareStore.getState().setLedMode(LedMode.THINKING).catch(() => {});
      useHardwareStore.getState().playBeepPattern(BeepPattern.BARK).catch(() => {});
    }
  },

  manualDrink: () => {
    get().onDrinkSuccess();
  },

  calibrateBaseline: () => {
    const { filteredDistance, currentDistance } = get();
    const val = filteredDistance ?? currentDistance ?? 12;
    set({
      baselineDistance: val,
      cupPresent: true,
      wasDrinking: false,
    });
  },

  setConfig: (cfg: Partial<DrinkWaterConfig>) => {
    set((s) => ({ ...s, ...cfg }));
  },

  dismissReminder: () => {
    set({ isReminding: false, secondsSinceLastDrink: 0, remindText: "" });
  },
}));
