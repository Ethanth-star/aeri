/**
 * Aeri 提醒喝水系统 - 类型定义 (超声波测距版: Echo P1.0, Trig P1.1)
 */

export interface DrinkWaterConfig {
  enabled: boolean;
  intervalSeconds: number;       // 提醒间隔秒数 (测试版默认 20 秒)
  baselineDistance: number;      // 水杯在位基准距离 (单位: cm, 默认 12cm)
  distanceThreshold: number;     // 判定拿起/放下的距离变化门限 (单位: cm, 默认 4cm)
}

export interface DrinkWaterState {
  enabled: boolean;
  intervalSeconds: number;
  baselineDistance: number;      // 基准距离 (cm)
  distanceThreshold: number;     // 判定阈值 (cm)
  
  // 实时超声波传感器状态
  currentDistance: number | null; // 当前超声波测距 (cm)
  filteredDistance: number | null;// 滤波后距离 (cm)

  cupPresent: boolean;           // 水杯当前是否在位
  wasDrinking: boolean;          // 是否正处于拿起水杯的状态
  lastDrinkTime: number;         // 上次喝水的时间戳
  secondsSinceLastDrink: number; // 距离上次喝水已过秒数
  todayDrinkCount: number;       // 今日已喝水次数
  isReminding: boolean;          // 当前是否处于提醒喝水弹窗状态
  historySamples: number[];      // 滑动滤波窗口
}
