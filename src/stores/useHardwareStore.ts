import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  HW_CMD,
  type HardwareEventPayload,
  type HardwareStatusPayload,
  type HardwareSensorData,
  LedMode,
  BeepPattern,
} from "../systems/hardware/types";
import { handleIncomingHardwareEvent } from "../systems/hardware/adapter";

interface HardwareStoreState {
  ports: string[];
  selectedPort: string;
  connected: boolean;
  baudRate: number;
  sensorData: HardwareSensorData;
  isScanning: boolean;
  isConnecting: boolean;
  errorMessage: string;
}

interface HardwareStoreActions {
  scanPorts: () => Promise<void>;
  setSelectedPort: (port: string) => void;
  connect: (port?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (cmd: number, data_h: number, data_l: number) => Promise<void>;
  setLedMode: (mode: LedMode, mask?: number) => Promise<void>;
  playBeepPattern: (pattern: BeepPattern) => Promise<void>;
  sendSeg7: (d1: number, d2: number) => Promise<void>;
  initListeners: () => Promise<UnlistenFn>;
}

let unlistenEventFn: UnlistenFn | null = null;
let unlistenStatusFn: UnlistenFn | null = null;

export const useHardwareStore = create<HardwareStoreState & HardwareStoreActions>((set, get) => ({
  ports: [],
  selectedPort: "",
  connected: false,
  baudRate: 115200,
  sensorData: {
    temperature: null,
    lightLevel: null,
    lightAdc: null,
    distance: null,
    vibCount: 0,
    lastTouchTime: null,
    lastNavKey: null,
    hallState: "none",
    hallCount: 0,
    mcuLoopsPerSec: null,
    mcuPollingMisses: null,
    mcuUptimeSec: null,
    rxPacketCount: 0,
  },
  isScanning: false,
  isConnecting: false,
  errorMessage: "",

  scanPorts: async () => {
    set({ isScanning: true, errorMessage: "" });
    try {
      const ports = await invoke<string[]>("scan_serial_ports");
      set({
        ports,
        selectedPort: ports.length > 0 ? (get().selectedPort && ports.includes(get().selectedPort) ? get().selectedPort : ports[0]) : "",
      });
    } catch (err) {
      set({ errorMessage: `扫描串口失败: ${String(err)}` });
    } finally {
      set({ isScanning: false });
    }
  },

  setSelectedPort: (port: string) => {
    set({ selectedPort: port });
  },

  connect: async (port?: string) => {
    const targetPort = port || get().selectedPort;
    if (!targetPort) {
      set({ errorMessage: "未选择有效串口" });
      return;
    }

    set({ isConnecting: true, errorMessage: "" });
    try {
      await invoke("connect_serial", {
        port: targetPort,
        baudRate: get().baudRate,
      });
      set({ connected: true, selectedPort: targetPort });
    } catch (err) {
      set({ errorMessage: `连接串口失败: ${String(err)}`, connected: false });
    } finally {
      set({ isConnecting: false });
    }
  },

  disconnect: async () => {
    try {
      await invoke("disconnect_serial");
      set({ connected: false });
    } catch (err) {
      set({ errorMessage: `断开串口失败: ${String(err)}` });
    }
  },

  sendCommand: async (cmd: number, data_h: number, data_l: number) => {
    if (!get().connected) return;
    try {
      await invoke("send_hardware_cmd", { cmd, dataH: data_h, dataL: data_l });
    } catch (err) {
      console.warn("发送硬件指令异常:", err);
    }
  },

  setLedMode: async (mode: LedMode, mask = 0) => {
    await get().sendCommand(HW_CMD.CMD_LED, mode, mask);
  },

  playBeepPattern: async (pattern: BeepPattern) => {
    await get().sendCommand(HW_CMD.CMD_BEEP_PATTERN, pattern, 0);
  },

  sendSeg7: async (d1: number, d2: number) => {
    await get().sendCommand(HW_CMD.CMD_SEG, d1, d2);
  },

  initListeners: async () => {
    // 若已有监听器，先解绑防止重复注册
    if (unlistenEventFn) {
      unlistenEventFn();
      unlistenEventFn = null;
    }
    if (unlistenStatusFn) {
      unlistenStatusFn();
      unlistenStatusFn = null;
    }

    // 监听硬件事件
    unlistenEventFn = await listen<HardwareEventPayload>("hardware_event", (e) => {
      const { sendCommand } = get();
      handleIncomingHardwareEvent(
        e.payload,
        (updater) => {
          set((state) => {
            const nextSensor = { ...state.sensorData };
            updater(nextSensor);
            return { sensorData: nextSensor };
          });
        },
        sendCommand
      );
    });

    // 监听连接状态变化
    unlistenStatusFn = await listen<HardwareStatusPayload>("hardware_status_changed", (e) => {
      set({
        connected: e.payload.connected,
        selectedPort: e.payload.port || get().selectedPort,
      });
    });

    // 初始状态拉取
    try {
      const status = await invoke<HardwareStatusPayload>("get_hardware_status");
      set({
        connected: status.connected,
        selectedPort: status.port || get().selectedPort,
      });
    } catch {}

    return () => {
      if (unlistenEventFn) {
        unlistenEventFn();
        unlistenEventFn = null;
      }
      if (unlistenStatusFn) {
        unlistenStatusFn();
        unlistenStatusFn = null;
      }
    };
  },
}));
