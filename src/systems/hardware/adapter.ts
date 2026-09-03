import { HW_CMD, type HardwareEventPayload, type HardwareSensorData, LedMode, BeepPattern } from "./types";
import { usePetStore } from "../../stores/usePetStore";
import { useChatStore } from "../../stores/useChatStore";
import { useWaterStore } from "../../stores/useWaterStore";

const KEY_NAMES: Record<number, string> = {
  1: "导航-上",
  2: "导航-下",
  3: "导航-左",
  4: "导航-右",
  5: "导航-中",
  0x10: "独立按键-K1",
  0x11: "独立按键-K2",
};

/**
 * 硬件全量事件适配与中继处理器
 */
export function handleIncomingHardwareEvent(
  event: HardwareEventPayload,
  updateSensorData: (updater: (prev: HardwareSensorData) => void) => void,
  sendCommand: (cmd: number, data_h: number, data_l: number) => Promise<void>,
) {
  const petStore = usePetStore.getState();

  // 累加接收数据包计数
  updateSensorData((prev) => {
    prev.rxPacketCount = (prev.rxPacketCount || 0) + 1;
  });

  switch (event.cmd) {
    case HW_CMD.EVT_TOUCH: {
      const now = Date.now();
      let isDebounced = false;

      updateSensorData((prev) => {
        if (prev.lastTouchTime && now - prev.lastTouchTime < 600) {
          isDebounced = true;
          return;
        }
        prev.vibCount = (prev.vibCount || 0) + 1;
        prev.lastTouchTime = now;
      });

      if (isDebounced) {
        break;
      }

      // 摸摸/振动事件 -> 情绪与交互
      petStore.emitEmotionEvent({ type: "user_interaction" });
      useWaterStore.getState().handleVibrationImpact();

      if (petStore.currentState === "SLEEPING") {
        petStore.changeState("IDLE");
        petStore.playAnimation("excited");
      } else if (petStore.currentState === "IDLE") {
        petStore.playAnimation("happy");
      }

      sendCommand(HW_CMD.CMD_LED, LedMode.HAPPY, 0).catch(() => {});
      sendCommand(HW_CMD.CMD_BEEP_PATTERN, BeepPattern.BARK, 0).catch(() => {});
      break;
    }

    case HW_CMD.EVT_TEMP: {
      // 温度上报: data_h 为整数, data_l 为小数 (0.1°C)
      const tempVal = Number(`${event.data_h}.${event.data_l}`);
      updateSensorData((prev) => {
        prev.temperature = tempVal;
      });

      if (tempVal < 10) {
        petStore.emitEmotionEvent({ type: "weather_rainy" });
        if (petStore.currentState === "IDLE") {
          petStore.playAnimation("shiver");
        }
      }
      break;
    }

    case HW_CMD.EVT_LIGHT: {
      // 10-bit 光敏电阻原始 ADC (0~1023)
      const rawAdc = (event.data_h << 2) | (event.data_l & 0x03);

      // 高灵敏度动态分级：
      // < 25: 极暗/全黑遮挡 (0)
      // 25 ~ 60: 昏暗环境/弱光 (1)
      // 60 ~ 130: 正常室内采光 (2)
      // 130 ~ 250: 明亮/台灯直射 (3)
      // 250 ~ 500: 强光/手电筒 (4)
      // >= 500: 极强直射光 (5)
      let level = 0;
      if (rawAdc >= 500) level = 5;
      else if (rawAdc >= 250) level = 4;
      else if (rawAdc >= 130) level = 3;
      else if (rawAdc >= 60) level = 2;
      else if (rawAdc >= 25) level = 1;
      else level = 0;

      updateSensorData((prev) => {
        prev.lightLevel = level;
        prev.lightAdc = rawAdc;
      });

      // 仅在被手掌遮住或全黑环境 (level === 0) 时触发困意
      if (level === 0) {
        petStore.emitEmotionEvent({ type: "sleep" });
      }
      break;
    }

    case HW_CMD.EVT_NAV_KEY: {
      const keyId = event.data_h;
      const keyName = KEY_NAMES[keyId] || `按键-${keyId}`;
      updateSensorData((prev) => {
        prev.lastNavKey = keyName;
      });

      // 导航按键或独立按键交互:
      if (keyId === 5 || keyId === 0x10) {
        useChatStore.getState().toggleInput();
      } else if (keyId === 1) {
        petStore.playAnimation("bounce");
      } else if (keyId === 4) {
        petStore.playAnimation("walk");
      }
      break;
    }

    case HW_CMD.EVT_DISTANCE: {
      // 超声波物理测距 (cm)
      const distanceCm = event.data_h;
      updateSensorData((prev) => {
        prev.distance = distanceCm;
      });
      useWaterStore.getState().updateDistance(distanceCm);
      break;
    }

    case HW_CMD.EVT_HALL: {
      // 霍尔磁场传感器 (1=靠近, 2=离开)
      const isClose = event.data_h === 1;
      updateSensorData((prev) => {
        prev.hallState = isClose ? "close" : "away";
        if (isClose) {
          prev.hallCount = (prev.hallCount || 0) + 1;
        }
      });

      if (isClose) {
        petStore.emitEmotionEvent({ type: "user_interaction" });
        petStore.playAnimation("curious_look");
      }
      break;
    }

    case HW_CMD.EVT_SYS_PERF: {
      // 单片机性能指标: data_h 为 MainLoops/10, data_l 为 PollingMisses
      const loopsPerSec = event.data_h * 10;
      const misses = event.data_l;
      updateSensorData((prev) => {
        prev.mcuLoopsPerSec = loopsPerSec;
        prev.mcuPollingMisses = misses;
      });
      break;
    }

    case HW_CMD.EVT_UPTIME: {
      // 单片机连续开机运行秒数
      const uptimeSec = (event.data_h << 8) | event.data_l;
      updateSensorData((prev) => {
        prev.mcuUptimeSec = uptimeSec;
      });
      break;
    }

    default:
      break;
  }
}
