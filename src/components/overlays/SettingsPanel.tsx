import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useChatStore } from "../../stores/useChatStore";
import { useHardwareStore } from "../../stores/useHardwareStore";
import { useWaterStore } from "../../stores/useWaterStore";
import { useMemoryStore } from "../../stores/useMemoryStore";
import { useProfileStore } from "../../stores/useProfileStore";
import { LedMode, BeepPattern } from "../../systems/hardware/types";

const LIGHT_DESC: Record<number, string> = {
  0: "极暗/遮挡 🌑",
  1: "昏暗 🌘",
  2: "正常室内 ⛅",
  3: "明亮/台灯 💡",
  4: "强光/手电 ☀️",
  5: "极亮 🌟",
};

export default function SettingsPanel() {
  const showSettings = useChatStore((s) => s.showSettings);
  const toggleSettings = useChatStore((s) => s.toggleSettings);
  const config = useChatStore((s) => s.config);
  const setConfig = useChatStore((s) => s.setConfig);
  const city = useChatStore((s) => s.city);
  const setCity = useChatStore((s) => s.setCity);
  const userName = useProfileStore((s) => s.userName);
  const userAvatar = useProfileStore((s) => s.userAvatar);
  const petName = useProfileStore((s) => s.petName);
  const openProfileModal = useProfileStore((s) => s.openProfileModal);
  const isCustomUserAvatar = userAvatar.startsWith("data:image/") || userAvatar.startsWith("http");

  // 硬件状态
  const ports = useHardwareStore((s) => s.ports);
  const selectedPort = useHardwareStore((s) => s.selectedPort);
  const connected = useHardwareStore((s) => s.connected);
  const isScanning = useHardwareStore((s) => s.isScanning);
  const isConnecting = useHardwareStore((s) => s.isConnecting);
  const errorMessage = useHardwareStore((s) => s.errorMessage);
  const sensorData = useHardwareStore((s) => s.sensorData);
  const scanPorts = useHardwareStore((s) => s.scanPorts);
  const setSelectedPort = useHardwareStore((s) => s.setSelectedPort);
  const connect = useHardwareStore((s) => s.connect);
  const disconnect = useHardwareStore((s) => s.disconnect);
  const setLedMode = useHardwareStore((s) => s.setLedMode);
  const playBeepPattern = useHardwareStore((s) => s.playBeepPattern);

  // 喝水提醒状态 (超声波测距版)
  const waterEnabled = useWaterStore((s) => s.enabled);
  const waterInterval = useWaterStore((s) => s.intervalSeconds);
  const baselineDistance = useWaterStore((s) => s.baselineDistance);
  const filteredDistance = useWaterStore((s) => s.filteredDistance);
  const cupPresent = useWaterStore((s) => s.cupPresent);
  const wasDrinking = useWaterStore((s) => s.wasDrinking);
  const secondsSinceLastDrink = useWaterStore((s) => s.secondsSinceLastDrink);
  const todayDrinkCount = useWaterStore((s) => s.todayDrinkCount);
  const setWaterConfig = useWaterStore((s) => s.setConfig);
  const manualDrink = useWaterStore((s) => s.manualDrink);
  const calibrateBaseline = useWaterStore((s) => s.calibrateBaseline);

  // 记忆系统状态
  const memoryEnabled = useMemoryStore((s) => s.enabled);
  const autoExtract = useMemoryStore((s) => s.autoExtract);
  const memoryCount = useMemoryStore((s) => s.memories.length);
  const setMemoryConfig = useMemoryStore((s) => s.setConfig);
  const openMemoryPalace = useMemoryStore((s) => s.toggleMemoryPalace);

  useEffect(() => {
    if (showSettings) {
      scanPorts();
    }
  }, [showSettings, scanPorts]);

  const countdown = Math.max(0, Math.round(waterInterval - secondsSinceLastDrink));

  return (
    <>
      <button className="toolbar-btn" onClick={toggleSettings} title="系统设置与硬件面板">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: showSettings ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {showSettings &&
        createPortal(
          <div className="settings-overlay" onClick={toggleSettings}>
            <div
              className="settings-panel"
              style={{
                width: "100%",
                maxWidth: 336,
                maxHeight: "82vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                boxSizing: "border-box",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部标题 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  <span style={{ fontSize: 13, fontWeight: "700", color: "#2d3436" }}>
                    Aeri 智能系统总览
                  </span>
                </div>
                <button
                  onClick={toggleSettings}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 16,
                    color: "#b2bec3",
                    cursor: "pointer",
                    padding: "0 4px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 0. 个人信息与伴侣档案卡片 */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(255, 240, 230, 0.85) 0%, rgba(255, 245, 240, 0.85) 100%)",
                  border: "1px solid rgba(255, 159, 67, 0.3)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  boxShadow: "0 2px 8px rgba(255, 159, 67, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      color: "#fff",
                      overflow: "hidden",
                      flexShrink: 0,
                      boxShadow: "0 1px 4px rgba(255, 159, 67, 0.3)",
                    }}
                  >
                    {isCustomUserAvatar ? (
                      <img src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span>{userAvatar}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: "700", color: "#2d3436" }}>
                      {userName} & {petName}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#e17055" }}>
                      自定义昵称与微信头像
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    toggleSettings();
                    openProfileModal();
                  }}
                  style={{
                    padding: "4px 10px",
                    fontSize: 10.5,
                    background: "#ff9f43",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    boxShadow: "0 2px 6px rgba(255, 159, 67, 0.3)",
                  }}
                >
                  编辑档案
                </button>
              </div>

              {/* 1. AI 核心设置 (DeepSeek) */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: "700", color: "#636e72", marginBottom: 6 }}>
                  🤖 大脑接口 (DeepSeek API)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 6 }}>
                  <label className="settings-field" style={{ margin: 0, minWidth: 0 }}>
                    <span>Base URL</span>
                    <input
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ baseUrl: e.target.value })}
                      placeholder="https://api.deepseek.com"
                    />
                  </label>
                  <label className="settings-field" style={{ margin: 0, minWidth: 0 }}>
                    <span>模型</span>
                    <input
                      value={config.model}
                      onChange={(e) => setConfig({ model: e.target.value })}
                      placeholder="deepseek-chat"
                    />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 6, marginTop: 6 }}>
                  <label className="settings-field" style={{ margin: 0, minWidth: 0 }}>
                    <span>API Key</span>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                  </label>
                  <label className="settings-field" style={{ margin: 0, minWidth: 0 }}>
                    <span>所在城市</span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Beijing"
                    />
                  </label>
                </div>
              </div>

            {/* 2. 记忆宫殿 (Memory Palace Bento Card) */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(245, 238, 248, 0.85) 0%, rgba(235, 245, 251, 0.85) 100%)",
                border: "1px solid rgba(210, 180, 222, 0.4)",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 2px 8px rgba(142, 68, 173, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>🧠</span>
                  <span style={{ fontSize: 11, fontWeight: "700", color: "#6c5ce7" }}>
                    记忆档案库 (Memory Palace)
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "#8e44ad", background: "rgba(255,255,255,0.8)", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>
                  已记 {memoryCount} 事
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 10.5 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#2d3436" }}>
                  <input
                    type="checkbox"
                    checked={memoryEnabled}
                    onChange={(e) => setMemoryConfig({ enabled: e.target.checked })}
                  />
                  <span>启用回忆</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#2d3436" }}>
                  <input
                    type="checkbox"
                    checked={autoExtract}
                    onChange={(e) => setMemoryConfig({ autoExtract: e.target.checked })}
                  />
                  <span>自动归纳</span>
                </label>
              </div>

              <button
                onClick={openMemoryPalace}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)",
                  borderRadius: 8,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(108, 92, 231, 0.25)",
                  transition: "transform 0.15s ease",
                }}
              >
                <span>📖 开启与管理记忆宫殿</span>
              </button>
            </div>

            {/* 3. 智能喝水雷达卡片 */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(235, 245, 255, 0.85) 0%, rgba(240, 255, 250, 0.85) 100%)",
                border: "1px solid rgba(116, 185, 255, 0.35)",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 2px 8px rgba(9, 132, 227, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>🥛</span>
                  <span style={{ fontSize: 11, fontWeight: "700", color: "#0984e3" }}>
                    超声波喝水提醒
                  </span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 10.5 }}>
                  <input
                    type="checkbox"
                    checked={waterEnabled}
                    onChange={(e) => setWaterConfig({ enabled: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600, color: waterEnabled ? "#00b894" : "#b2bec3" }}>
                    {waterEnabled ? "已开启" : "已暂停"}
                  </span>
                </label>
              </div>

              {waterEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div style={{ background: "rgba(255,255,255,0.7)", padding: "5px 8px", borderRadius: 6 }}>
                      <span style={{ color: "#636e72", fontSize: 10 }}>水杯状态: </span>
                      <strong style={{ color: cupPresent ? "#00b894" : "#e17055" }}>
                        {wasDrinking ? "🥤 正在喝水" : cupPresent ? "✅ 杯在位" : "❌ 已拿起"}
                      </strong>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.7)", padding: "5px 8px", borderRadius: 6 }}>
                      <span style={{ color: "#636e72", fontSize: 10 }}>今日喝水: </span>
                      <strong style={{ color: "#0984e3" }}>{todayDrinkCount} 次</strong>
                    </div>
                  </div>

                  {/* 自定义提醒间隔与快捷档位 */}
                  <div style={{ background: "rgba(255,255,255,0.75)", padding: "6px 8px", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ color: "#2d3436", fontSize: 10.5, fontWeight: "600" }}>
                        ⏱️ 自定义提醒间隔:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="number"
                          min="5"
                          max="7200"
                          value={waterInterval}
                          onChange={(e) =>
                            setWaterConfig({
                              intervalSeconds: Math.max(5, Number(e.target.value) || 20),
                            })
                          }
                          style={{
                            width: 52,
                            padding: "2px 4px",
                            fontSize: 11,
                            textAlign: "center",
                            borderRadius: 4,
                            border: "1px solid rgba(0,0,0,0.15)",
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 10, color: "#636e72" }}>秒</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 3 }}>
                      {[
                        { label: "20s测试", sec: 20 },
                        { label: "15分钟", sec: 900 },
                        { label: "30分钟", sec: 1800 },
                        { label: "45分钟", sec: 2700 },
                        { label: "60分钟", sec: 3600 },
                      ].map((preset) => (
                        <button
                          key={preset.sec}
                          onClick={() => setWaterConfig({ intervalSeconds: preset.sec })}
                          style={{
                            flex: 1,
                            padding: "2px 0",
                            fontSize: 9.5,
                            borderRadius: 4,
                            border: "none",
                            cursor: "pointer",
                            background: waterInterval === preset.sec ? "#0984e3" : "rgba(0,0,0,0.06)",
                            color: waterInterval === preset.sec ? "#fff" : "#636e72",
                            fontWeight: waterInterval === preset.sec ? "bold" : "normal",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#636e72", fontSize: 10.5 }}>
                    <span>距下次提醒: <strong style={{ color: countdown <= 10 ? "#d63031" : "#0984e3" }}>{countdown}s</strong></span>
                    <span>雷达测距: <strong>{filteredDistance !== null ? `${filteredDistance}cm` : "--"}</strong> (基准 {baselineDistance}cm)</span>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={calibrateBaseline}
                      style={{
                        flex: 1,
                        padding: "5px 6px",
                        fontSize: 10.5,
                        background: "#0984e3",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      🎯 标定当前距离为在位基准
                    </button>
                    <button
                      onClick={manualDrink}
                      style={{
                        flex: 1,
                        padding: "5px 6px",
                        fontSize: 10.5,
                        background: "#00b894",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      🥤 模拟喝水 +1
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. STC-B 实体硬件遥测大屏 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.85)",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>🛰️</span>
                  <span style={{ fontSize: 11, fontWeight: "700", color: "#2d3436" }}>
                    STC-B 实体硬件连接
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: connected ? "#00b894" : "#b2bec3",
                      animation: connected ? "pulseGlow 2s infinite" : "none",
                    }}
                  />
                  <span style={{ fontSize: 10, color: connected ? "#00b894" : "#b2bec3", fontWeight: 600 }}>
                    {connected ? "已在线 (115200)" : "未连接"}
                  </span>
                </div>
              </div>

              {/* 串口控制行 */}
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  disabled={connected || isScanning}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 6,
                    outline: "none",
                    background: "rgba(255,255,255,0.9)",
                  }}
                >
                  <option value="">{ports.length === 0 ? "无可用串口" : "选择串口..."}</option>
                  {ports.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => scanPorts()}
                  disabled={connected || isScanning}
                  style={{
                    padding: "4px 8px",
                    fontSize: 10.5,
                    background: "#dfe6e9",
                    color: "#2d3436",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {isScanning ? "..." : "刷新"}
                </button>

                {connected ? (
                  <button
                    onClick={() => disconnect()}
                    style={{
                      padding: "4px 10px",
                      fontSize: 10.5,
                      background: "#ff7675",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    断开
                  </button>
                ) : (
                  <button
                    onClick={() => connect()}
                    disabled={!selectedPort || isConnecting}
                    style={{
                      padding: "4px 12px",
                      fontSize: 10.5,
                      background: "#00b894",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {isConnecting ? "..." : "连接"}
                  </button>
                )}
              </div>

              {connected ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* 环境指标 Bento Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: 8, border: "1px solid #f1f2f6" }}>
                      <div style={{ fontSize: 9.5, color: "#636e72" }}>🌡️ 实测室温</div>
                      <div style={{ fontSize: 12, fontWeight: "700", color: "#e17055" }}>
                        {sensorData.temperature !== null ? `${sensorData.temperature} °C` : "--"}
                      </div>
                    </div>

                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: 8, border: "1px solid #f1f2f6" }}>
                      <div style={{ fontSize: 9.5, color: "#636e72" }}>☀️ 室内光照</div>
                      <div style={{ fontSize: 11, fontWeight: "700", color: "#f39c12" }}>
                        {sensorData.lightLevel !== null ? `${LIGHT_DESC[sensorData.lightLevel] || ""}` : "--"}
                      </div>
                    </div>

                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: 8, border: "1px solid #f1f2f6" }}>
                      <div style={{ fontSize: 9.5, color: "#636e72" }}>🦇 超声波测距</div>
                      <div style={{ fontSize: 12, fontWeight: "700", color: "#0984e3" }}>
                        {sensorData.distance !== null ? `${sensorData.distance} cm` : "--"}
                      </div>
                    </div>

                    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: 8, border: "1px solid #f1f2f6" }}>
                      <div style={{ fontSize: 9.5, color: "#636e72" }}>🧲 磁吸感应</div>
                      <div style={{ fontSize: 11, fontWeight: "700", color: sensorData.hallState === "close" ? "#d63031" : "#00b894" }}>
                        {sensorData.hallState === "close" ? "磁铁靠近" : "正常"}
                      </div>
                    </div>
                  </div>

                  {/* 摸头与交互统计 */}
                  <div style={{ background: "#fafafa", padding: "6px 8px", borderRadius: 8, fontSize: 10.5, color: "#636e72", display: "flex", justifyContent: "space-between" }}>
                    <span>🐾 摸头互动: <strong style={{ color: "#6c5ce7" }}>{sensorData.vibCount} 次</strong></span>
                    <span>⏱️ 开机运行: <strong style={{ color: "#2d3436" }}>{sensorData.mcuUptimeSec !== null ? `${Math.floor(sensorData.mcuUptimeSec / 60)}分${sensorData.mcuUptimeSec % 60}秒` : "--"}</strong></span>
                  </div>

                  {/* 快速执行器测试 */}
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    <button
                      onClick={() => playBeepPattern(BeepPattern.BARK)}
                      style={{
                        flex: 1,
                        padding: "5px 6px",
                        fontSize: 10.5,
                        background: "#fff",
                        border: "1px solid #dfe6e9",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      🐶 叫两声
                    </button>
                    <button
                      onClick={() => playBeepPattern(BeepPattern.HAPPY)}
                      style={{
                        flex: 1,
                        padding: "5px 6px",
                        fontSize: 10.5,
                        background: "#fff",
                        border: "1px solid #dfe6e9",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      🎵 叮咚声
                    </button>
                    <button
                      onClick={() => setLedMode(LedMode.HAPPY)}
                      style={{
                        flex: 1,
                        padding: "5px 6px",
                        fontSize: 10.5,
                        background: "#fff",
                        border: "1px solid #dfe6e9",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      ✨ 流光灯
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10.5, color: "#b2bec3", textAlign: "center", padding: "8px 0" }}>
                  请连接 STC-B 板以启用环境与测距遥测
                </div>
              )}

              {errorMessage && (
                <div style={{ fontSize: 10.5, color: "#ff7675", marginTop: 4 }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
