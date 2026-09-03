/**
 * Aeri x STC-B 硬件全量联动协议与数据类型定义
 */

export const FRAME_SYNC = 0xaa;

// 上行事件命令字 (STC-B -> Aeri)
export const HW_CMD = {
  EVT_TOUCH: 0x01,     // 触摸 / 振动
  EVT_TEMP: 0x02,      // 温度采样
  EVT_LIGHT: 0x03,     // 光照等级与采样
  EVT_NAV_KEY: 0x04,   // 按键事件
  EVT_DISTANCE: 0x05,  // 超声波测距
  EVT_HALL: 0x06,      // 霍尔磁场传感器
  EVT_SYS_PERF: 0x07,  // 单片机系统性能 (MainLoops / PollingMisses)
  EVT_UPTIME: 0x08,    // 单片机开机运行时间

  // 下行控制命令字 (Aeri -> STC-B)
  CMD_LED: 0x11,       // LED 心情灯模式
  CMD_BEEP: 0x12,      // 单音频蜂鸣
  CMD_SEG: 0x13,       // 数码管显示字符
  CMD_BEEP_PATTERN: 0x14, // 预置音效模式
} as const;

export type HardwareEventCmd = (typeof HW_CMD)[keyof typeof HW_CMD];

export interface HardwareEventPayload {
  cmd: number;
  data_h: number;
  data_l: number;
}

export interface HardwareStatusPayload {
  connected: boolean;
  port: string | null;
  baud_rate: number;
}

// LED 心情模式定义
export enum LedMode {
  IDLE = 0x00,
  HAPPY = 0x01,
  SLEEPY = 0x02,
  THINKING = 0x03,
  TALKING = 0x04,
  SAD = 0x05,
  EXCITED = 0x06,
  CUSTOM = 0x07,
}

// 蜂鸣器预置音效模式
export enum BeepPattern {
  BARK = 0x00,    // 汪汪叫声
  HAPPY = 0x01,   // 开心叮咚
}

export interface HardwareSensorData {
  temperature: number | null;      // 室温 (°C)
  lightLevel: number | null;       // 光照等级 (0~5)
  lightAdc: number | null;         // 光照原始 ADC (0~1023)
  distance: number | null;         // 超声波物理测距 (cm)
  vibCount: number;                // 累计振动/摸头次数
  lastTouchTime: number | null;    // 最近摸头时间戳
  lastNavKey: string | null;       // 最近按下的按键 ("上" | "下" | "左" | "右" | "中" | "Key1" | "Key2")
  hallState: "close" | "away" | "none"; // 磁场状态
  hallCount: number;               // 磁吸触发次数
  mcuLoopsPerSec: number | null;   // 单片机每秒主循环次数
  mcuPollingMisses: number | null; // 单片机轮询丢失/卡顿数
  mcuUptimeSec: number | null;     // 单片机连续开机运行秒数
  rxPacketCount: number;           // 串口已接收数据帧数
}
