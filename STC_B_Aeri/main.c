/********************************************************************************
 * Project: Aeri Desktop AI Companion - STC-B Physical Board Firmware
 * Hardware: STC15F2K60S2 @ 11.0592MHz (STC-B 学习板)
 * Software: MySTC_B BSP v3.6
 * Protocol: 5-Byte Fixed Length Binary Frame (0xAA, CMD, DATA_H, DATA_L, CHECKSUM)
 * Features: Touch/Vib, Temp, Light, Nav/Keys, Ultrasonic, Hall Magnetic, Sys Perf & Uptime, LED, Beep, TTS
 * Timing: Time-Division Multiplexed (TDM) UART Frame Dispatch (Zero Collision)
 * TTS: SM 接口 S1 引脚 (P4.1 via ULN2003 反相开漏) 软件串口 9600bps -> CN-TTS 语音合成模块
 ********************************************************************************/

#include "STC15F2K60S2.H"
#include "sys.H"
#include "displayer.h"
#include "Key.H"
#include "Vib.h"
#include "hall.H"
#include "adc.h"
#include "Beep.h"
#include "EXT.h"
#include "uart1.h"

// ---------------- 晶振频率声明 ----------------
code unsigned long SysClock = 11059200; // 11.0592MHz 时钟频率

// ---------------- 数码管译码表 ----------------
#ifdef _displayer_H_
code char decode_table[] = {
    0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x00, 0x08, 0x40, 0x01, 0x41, 0x48,
    0x3f|0x80, 0x06|0x80, 0x5b|0x80, 0x4f|0x80, 0x66|0x80, 0x6d|0x80, 0x7d|0x80, 0x07|0x80, 0x7f|0x80, 0x6f|0x80
};
#endif

// ---------------- 协议常量定义 ----------------
#define FRAME_SYNC          0xAA

// 上行事件 (STC-B -> Aeri)
#define EVT_TOUCH           0x01  // 触摸 / 振动 (Data_H=1)
#define EVT_TEMP            0x02  // 温度采样 (Data_H=整数°C, Data_L=小数0.1°C)
#define EVT_LIGHT           0x03  // 光照等级 (Data_H=等级0~5, Data_L=ADC>>2)
#define EVT_NAV_KEY         0x04  // 按键事件 (Data_H=按键编号, Data_L=动作)
#define EVT_DISTANCE        0x05  // 超声波测距 (Data_H=距离cm, Data_L=0)
#define EVT_HALL            0x06  // 霍尔磁场感应 (Data_H=1磁铁靠近, 2磁铁离开)
#define EVT_SYS_PERF        0x07  // 单片机性能指标 (Data_H=主循环数/10, Data_L=轮询丢失数)
#define EVT_UPTIME          0x08  // 单片机运行时间 (Data_H=秒高字节, Data_L=秒低字节)

// 下行命令 (Aeri -> STC-B)
#define CMD_LED             0x11  // LED 心情灯模式
#define CMD_BEEP            0x12  // 单音频蜂鸣
#define CMD_SEG             0x13  // 数码管显示字符
#define CMD_BEEP_PATTERN    0x14  // 预置音效模式
#define CMD_TTS_START       0x15  // TTS 开始接收一段文本 (Data_H=预计长度)
#define CMD_TTS_DATA        0x16  // TTS 文本数据包 (Data_H=字节1, Data_L=字节2)
#define CMD_TTS_END         0x17  // TTS 结束并开始播放 (Data_H=总字节数)

// ---------------- LED 模式枚举 ----------------
#define LED_MODE_IDLE       0x00  // 单灯游走
#define LED_MODE_HAPPY      0x01  // 全体快速呼吸/闪烁
#define LED_MODE_SLEEPY     0x02  // 仅右侧 2 灯微光慢闪
#define LED_MODE_THINKING   0x03  // 跑马灯左移
#define LED_MODE_TALKING    0x04  // 模拟声纹跳动
#define LED_MODE_SAD        0x05  // 左侧 3 灯常暗
#define LED_MODE_EXCITED    0x06  // 极速流水灯
#define LED_MODE_CUSTOM     0x07  // 自定义 8 位掩码

// ================ SM 接口软件串口 TTS 驱动 ================
// SM 接口对应单片机 P4 口引脚，经过板载 ULN2003 达林顿管阵列：
// S1 = P4.1, S2 = P4.2, S3 = P4.3, S4 = P4.4
// ULN2003 为反相开漏输出：
// MCU 输出 1 -> ULN2003 导通拉低 -> SM 引脚输出 LOW (0V)
// MCU 输出 0 -> ULN2003 截止断开 -> SM 引脚由上拉电阻/模块内部上拉到 HIGH (5V)

sbit TTS_PIN = P4^1;  // SM 接口 S1 脚 (MCU P4.1)，用于 TXD 发送给语音模块 RX
sbit SM_S2   = P4^2;  // SM 接口 S2 脚 (MCU P4.2)
sbit SM_S3   = P4^3;  // SM 接口 S3 脚 (MCU P4.3)
sbit SM_S4   = P4^4;  // SM 接口 S4 脚 (MCU P4.4)

// 11.0592MHz 下 9600bps 单位延时 (104.17us = 1152 机器周期)
// 1T 8051 循环执行 DJNZ: (228 - 1) * 5 + 4 + 开销 ≈ 1153 周期 (误差 0.08%)
void TTS_BitDelay() {
    unsigned char i = 228;
    while (--i);
}

// 软件串口发送单个字节 (带 ULN2003 反相补偿)
void TTS_SendByte(unsigned char dat) {
    unsigned char i;
    bit ea_save = EA;
    EA = 0; // 关全局中断，消除时钟中断造成的时序抖动

    // 起始位: UART 规范要求为 LOW (0) -> ULN2003 需导通 -> MCU 输出 1
    TTS_PIN = 1;
    TTS_BitDelay();

    // 8 位数据位 (低位先行 LSB first)
    // 数据位 1: UART 规范为 HIGH (1) -> ULN2003 需截止 -> MCU 输出 0
    // 数据位 0: UART 规范为 LOW  (0) -> ULN2003 需导通 -> MCU 输出 1
    for (i = 0; i < 8; i++) {
        TTS_PIN = !(dat & 0x01);
        dat >>= 1;
        TTS_BitDelay();
    }

    // 停止位: UART 规范要求为 HIGH (1) -> ULN2003 需截止 -> MCU 输出 0
    TTS_PIN = 0;
    TTS_BitDelay();
    TTS_BitDelay(); // 额外停止位保证模块平稳采样

    EA = ea_save; // 恢复中断状态
}

// 发送一串字节到 TTS 模块
void TTS_SendString(unsigned char *buf, unsigned char len) {
    unsigned char i;
    for (i = 0; i < len; i++) {
        TTS_SendByte(buf[i]);
    }
}

// ================ TTS 文本接收缓冲区 ================
#define TTS_BUF_SIZE 150
static unsigned char xdata ttsBuf[TTS_BUF_SIZE];
static unsigned char ttsLen = 0;
static unsigned char ttsExpectedLen = 0;
static unsigned int  ttsLedRestore = 0; // 说话灯效持续时间

// ---------------- 全局状态变量 ----------------
static unsigned char rxBuf[5];
static unsigned char rxHead[] = { FRAME_SYNC };
static unsigned char txBuf[5];

static unsigned char currentLedMode = LED_MODE_IDLE;
static unsigned char customLedMask = 0x00;
static unsigned int  ledTickCount = 0;
static unsigned char ledAnimStep = 0;

static unsigned int  vibDebounce = 0;    // 振动防抖计数
static unsigned char beepPatternStep = 0;
static unsigned char currentBeepPattern = 0;

static unsigned int  uptimeSeconds = 0;

// ---------------- 5 字节帧发送函数 ----------------
void SendFrame(unsigned char cmd, unsigned char data_h, unsigned char data_l) {
    txBuf[0] = FRAME_SYNC;
    txBuf[1] = cmd;
    txBuf[2] = data_h;
    txBuf[3] = data_l;
    txBuf[4] = (unsigned char)((cmd + data_h + data_l) & 0xFF);
    Uart1Print(txBuf, 5);
}

// ---------------- 室温采样与发送 ----------------
static void SendTemperature(unsigned int adcRt) {
    int temp_deg;
    unsigned char tempInt;
    unsigned char tempFrac;
    
    if (adcRt < 100) adcRt = 100;
    if (adcRt > 950) adcRt = 950;
    
    // NTC 10K/3950: 25°C 对应 ADC 512, 灵敏度约 14 LSB/°C
    temp_deg = 250 + (int)(512 - (int)adcRt) * 10 / 14;
    if (temp_deg < 0) temp_deg = 0;
    if (temp_deg > 600) temp_deg = 600;
    
    tempInt = (unsigned char)(temp_deg / 10);
    tempFrac = (unsigned char)(temp_deg % 10);
    SendFrame(EVT_TEMP, tempInt, tempFrac);
}

// ---------------- 光照度采样与发送 (上报 10-bit 原始 ADC 码值) ----------------
static void SendLight(unsigned int adcRop) {
    // Data_H = 高 8 位, Data_L = 低 2 位 (0~1023)
    SendFrame(EVT_LIGHT, (unsigned char)(adcRop >> 2), (unsigned char)(adcRop & 0x03));
}

// ---------------- 串口接收中断回调 ----------------
void myUart1Rxd_callback() {
    unsigned char cmd, dh, dl, cs, expectedCs;

    cmd = rxBuf[1];
    dh  = rxBuf[2];
    dl  = rxBuf[3];
    cs  = rxBuf[4];

    expectedCs = (unsigned char)((cmd + dh + dl) & 0xFF);
    if (cs != expectedCs) {
        return; // 校验失败丢弃
    }

    // 解析下行命令
    switch (cmd) {
        case CMD_LED:
            currentLedMode = dh;
            customLedMask  = dl;
            ledAnimStep    = 0;
            break;

        case CMD_BEEP: {
            unsigned int freq = ((unsigned int)dh << 8) | dl;
            if (freq > 0) {
                SetBeep(freq, 10); // 100ms
            }
            break;
        }

        case CMD_SEG:
            SetDisplayerArea(0, 7);
            Seg7Print((char)dh, (char)dl, 10, 10, 10, 10, 10, 10);
            break;

        case CMD_BEEP_PATTERN:
            currentBeepPattern = dh;
            beepPatternStep = 1;
            break;

        case CMD_TTS_START:
            ttsLen = 0;
            ttsExpectedLen = dh;
            break;

        case CMD_TTS_DATA:
            if (ttsLen < TTS_BUF_SIZE) {
                ttsBuf[ttsLen++] = dh;
            }
            if (dl != 0 && ttsLen < TTS_BUF_SIZE) {
                ttsBuf[ttsLen++] = dl;
            }
            break;

        case CMD_TTS_END:
            if (ttsLen > 0) {
                currentLedMode = LED_MODE_TALKING;
                ledAnimStep = 0;
                TTS_SendString(ttsBuf, ttsLen);
                ttsLedRestore = 150 + (unsigned int)ttsLen * 12; // 根据字数自适应恢复时间
                ttsLen = 0;
            }
            break;

        default:
            break;
    }
}

// ---------------- 振动传感器回调 (摸头 / 拍击) ----------------
void myVib_callback() {
    if (GetVibAct() == enumVibQuake) {
        if (vibDebounce == 0) {
            vibDebounce = 60; // 600ms 软件消抖 (消除机械振动开关物理回弹二次触发)
            SendFrame(EVT_TOUCH, 0x01, 0x00);
        }
    }
}

// ---------------- 霍尔磁场传感器回调 ----------------
void myHall_callback() {
    unsigned char hallAct = GetHallAct();
    if (hallAct == enumHallGetClose) {
        SendFrame(EVT_HALL, 0x01, 0x00); // 磁铁靠近
    } else if (hallAct == enumHallGetAway) {
        SendFrame(EVT_HALL, 0x02, 0x00); // 磁铁离开
    }
}

// ---------------- 五向导航按键回调 ----------------
void myNav_callback() {
    if (GetAdcNavAct(enumAdcNavKeyCenter) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 5, 0x01);
    } else if (GetAdcNavAct(enumAdcNavKeyUp) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 1, 0x01);
    } else if (GetAdcNavAct(enumAdcNavKeyDown) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 2, 0x01);
    } else if (GetAdcNavAct(enumAdcNavKeyLeft) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 3, 0x01);
    } else if (GetAdcNavAct(enumAdcNavKeyRight) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 4, 0x01);
    }
}

// ---------------- 独立按键 Key1 / Key2 回调 ----------------
void myKey_callback() {
    if (GetKeyAct(enumKey1) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 0x10, 0x01); // Key1 Down
    }
    if (GetKeyAct(enumKey2) == enumKeyPress) {
        SendFrame(EVT_NAV_KEY, 0x11, 0x01); // Key2 Down
    }
}

// ---------------- 10ms 定时调度回调 (时分复用无冲突发送调度) ----------------
void my10mS_callback() {
    struct_ADC adc;
    struct_SysPerF perf;
    unsigned int tickMod100;
    int dist;

    ledTickCount++;
    tickMod100 = ledTickCount % 100;

    // 振动消抖递减
    if (vibDebounce > 0) {
        vibDebounce--;
    }

    // TTS 说话灯效自动恢复
    if (ttsLedRestore > 0) {
        ttsLedRestore--;
        if (ttsLedRestore == 0 && currentLedMode == LED_MODE_TALKING) {
            currentLedMode = LED_MODE_IDLE;
            ledAnimStep = 0;
        }
    }

    // 预置音效状态机
    if (beepPatternStep > 0) {
        if (currentBeepPattern == 0) { // 汪汪叫声
            if (beepPatternStep == 1) {
                SetBeep(900, 8);
                beepPatternStep = 15;
            } else if (beepPatternStep == 2) {
                SetBeep(1100, 10);
                beepPatternStep = 0;
            } else {
                beepPatternStep--;
            }
        } else if (currentBeepPattern == 1) { // 开心叮咚
            if (beepPatternStep == 1) {
                SetBeep(1318, 10);
                beepPatternStep = 12;
            } else if (beepPatternStep == 2) {
                SetBeep(1568, 12);
                beepPatternStep = 0;
            } else {
                beepPatternStep--;
            }
        } else {
            beepPatternStep = 0;
        }
    }

    // 每 50ms 刷新一次 LED 动画
    if (ledTickCount % 5 == 0) {
        unsigned char mask = 0x00;

        switch (currentLedMode) {
            case LED_MODE_IDLE: // 往返流水
                ledAnimStep = (ledAnimStep + 1) % 14;
                if (ledAnimStep < 8) {
                    mask = (unsigned char)(1 << ledAnimStep);
                } else {
                    mask = (unsigned char)(1 << (14 - ledAnimStep));
                }
                break;

            case LED_MODE_HAPPY: // 全亮交替快闪
                ledAnimStep = (ledAnimStep + 1) % 4;
                mask = (ledAnimStep < 2) ? 0xFF : 0x00;
                break;

            case LED_MODE_SLEEPY: // 仅最右 2 个慢闪
                ledAnimStep = (ledAnimStep + 1) % 20;
                mask = (ledAnimStep < 10) ? 0x03 : 0x01;
                break;

            case LED_MODE_THINKING: // 跑马灯循环
                ledAnimStep = (ledAnimStep + 1) % 8;
                mask = (unsigned char)((0x07 << ledAnimStep) | (0x07 >> (8 - ledAnimStep)));
                break;

            case LED_MODE_TALKING: // 声波跳动模拟
                ledAnimStep = (unsigned char)((ledAnimStep * 3 + 1) % 8);
                mask = (unsigned char)((1 << ledAnimStep) | (1 << (7 - ledAnimStep)));
                break;

            case LED_MODE_SAD: // 仅左侧低亮
                mask = 0xE0;
                break;

            case LED_MODE_EXCITED: // 双向流光
                ledAnimStep = (ledAnimStep + 1) % 8;
                mask = (unsigned char)((1 << ledAnimStep) | (1 << (7 - ledAnimStep)));
                break;

            case LED_MODE_CUSTOM: // 自定义掩码
                mask = customLedMask;
                break;

            default:
                mask = 0x00;
                break;
        }

        LedPrint((char)mask);
    }

    // ---- 时分复用串口周期上报（错峰发送，防止串口缓冲区争抢覆盖）----

    // 1. 每 1s (偏移 0ms): 上报室温
    if (tickMod100 == 0) {
        adc = GetADC();
        SendTemperature(adc.Rt);
    }
    // 2. 每 1s (偏移 250ms): 上报光照
    else if (tickMod100 == 25) {
        adc = GetADC();
        SendLight(adc.Rop);
    }
    // 3. 每 1s (偏移 500ms): 上报单片机系统性能
    else if (tickMod100 == 50) {
        perf = GetSysPerformance();
        SendFrame(EVT_SYS_PERF, (unsigned char)(perf.MainLoops / 10), perf.PollingMisses);
    }
    // 4. 每 1s (偏移 750ms): 上报单片机运行秒数
    else if (tickMod100 == 75) {
        uptimeSeconds++;
        SendFrame(EVT_UPTIME, (unsigned char)(uptimeSeconds >> 8), (unsigned char)(uptimeSeconds & 0xFF));
    }
    // 5. 每 200ms (偏移 100ms, 300ms, 500ms, 700ms, 900ms): 上报超声波物理测距 (5Hz)
    else if (ledTickCount % 20 == 10) {
        dist = GetUltraSonic();
        if (dist > 0 && dist < 255) {
            SendFrame(EVT_DISTANCE, (unsigned char)dist, 0x00);
        }
    }
}

// ---------------- 主函数入口 ----------------
void main() {
    // 1. 初始化各外设模块
    KeyInit();
    VibInit();
    HallInit();                  // 初始化霍尔磁场传感器
    DisplayerInit();
    BeepInit();
    AdcInit(ADCexpEXT);          // ADC 排除 EXT 接口，保留板载 Rt(温度)、Rop(光照)、Nav(导航键) 转换通道
    EXTInit(enumEXTUltraSonic);  // 加载超声波测距驱动 (P1.0 Echo, P1.1 Trig)
    Uart1Init(115200);

    // 初始化 SM 接口引脚
    // S1 = P4.1 (TXD 到语音模块 RX): 空闲置 0 (ULN2003 截止，模块内部上拉到高电平 = UART 空闲)
    TTS_PIN = 0;
    SM_S2   = 0;
    // S3 与 S4 导通拉低至板载地，如果模块黑线(GND)插在 S3 或 S4 插孔上，则能自动提供回路接地
    SM_S3   = 1;
    SM_S4   = 1;

    // 2. 配置串口接收帧头与缓冲区 (定长 5 字节帧)
    SetUart1Rxd(rxBuf, sizeof(rxBuf), rxHead, sizeof(rxHead));

    // 3. 注册事件回调函数
    SetEventCallBack(enumEventUart1Rxd, myUart1Rxd_callback);
    SetEventCallBack(enumEventVib,      myVib_callback);
    SetEventCallBack(enumEventHall,     myHall_callback);
    SetEventCallBack(enumEventNav,      myNav_callback);
    SetEventCallBack(enumEventKey,      myKey_callback);
    SetEventCallBack(enumEventSys10mS,  my10mS_callback);

    // 4. 显示欢迎状态
    LedPrint((char)0xAA);

    // 5. 启动 OS 调度循环
    MySTC_Init();
    while (1) {
        MySTC_OS();
    }
}
