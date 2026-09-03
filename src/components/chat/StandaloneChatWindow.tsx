import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useChatStore } from "../../stores/useChatStore";
import { useProfileStore } from "../../stores/useProfileStore";
import ProfileModal from "../overlays/ProfileModal";
import aeriImg from "../../assets/images/puppy.png";

function formatTimeBadge(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (isToday) {
    return `${hours}:${minutes}`;
  } else if (isYesterday) {
    return `昨天 ${hours}:${minutes}`;
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日 ${hours}:${minutes}`;
  }
}

function formatMinute(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function StandaloneChatWindow() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentReply = useChatStore((s) => s.currentReply);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const userName = useProfileStore((s) => s.userName);
  const userAvatar = useProfileStore((s) => s.userAvatar);
  const petName = useProfileStore((s) => s.petName);
  const openProfileModal = useProfileStore((s) => s.openProfileModal);

  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isCustomUserAvatar = userAvatar.startsWith("data:image/") || userAvatar.startsWith("http");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentReply]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    emit("aeri-pet-sync", { type: "user_send", text: trimmed }).catch(() => {});
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = async () => {
    try {
      await invoke("close_chat_window");
    } catch {
      try {
        const win = getCurrentWebviewWindow();
        await win.hide();
      } catch {}
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("确定要清空所有聊天记录吗？")) {
      clearMessages();
    }
  };

  const handleStartDrag = (e: React.MouseEvent) => {
    // 仅在左键且非按钮上触发窗口拖拽
    if (e.button === 0) {
      try {
        getCurrentWebviewWindow().startDragging().catch(() => {});
      } catch {}
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        padding: 8,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(26px)",
          borderRadius: 18,
          border: "1px solid rgba(255, 255, 255, 0.95)",
          boxShadow: "0 18px 45px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* 顶部标题栏 (支持全局鼠标原生拖拽移动窗口) */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px 7px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
            background: "rgba(255, 255, 255, 0.65)",
            cursor: "grab",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {/* 左侧 Aeri 信息与拖拽提示 */}
          <div
            data-tauri-drag-region
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "grab" }}
          >
            <span
              data-tauri-drag-region
              style={{ fontSize: 13, color: "#b2bec3", letterSpacing: -1, cursor: "grab" }}
              title="按住拖拽窗口"
            >
              ⠿
            </span>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.06)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={aeriImg}
                alt={petName}
                style={{
                  width: 20,
                  height: 20,
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
              />
            </div>
            <div data-tauri-drag-region style={{ display: "flex", flexDirection: "column" }}>
              <span
                data-tauri-drag-region
                style={{ fontSize: 12, fontWeight: "700", color: "#2d3436" }}
              >
                {petName} 聊天室
              </span>
              <span
                data-tauri-drag-region
                style={{
                  fontSize: 9,
                  color: "#00b894",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#00b894",
                  }}
                />
                独立窗口 · 陪伴中
              </span>
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* 个人档案设置 */}
            <button
              onClick={openProfileModal}
              title="设置个人信息与头像"
              style={{
                background: "rgba(0, 0, 0, 0.04)",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "#636e72",
                padding: "3px 7px",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>👤</span>
              <span style={{ fontSize: 9.5, fontWeight: 600 }}>{userName}</span>
            </button>

            {/* 清空历史 */}
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                title="清空聊天记录"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#a4b0be",
                  padding: "2px 4px",
                }}
              >
                🗑️
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              title="关闭窗口"
              style={{
                background: "none",
                border: "none",
                fontSize: 15,
                color: "#b2bec3",
                cursor: "pointer",
                padding: "0 5px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 消息滚动流 (微信/QQ风格双向对聊) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "10px 12px 6px",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#a4b0be",
                fontSize: 11.5,
                marginTop: 60,
              }}
            >
              和 {petName} 说句话吧，记录会自动保存汪~
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showTimeBadge =
                index === 0 ||
                Boolean(
                  msg.timestamp &&
                    prevMsg?.timestamp &&
                    msg.timestamp - prevMsg.timestamp > 3 * 60 * 1000
                );

              return (
                <div key={msg.id || index} style={{ width: "100%" }}>
                  {/* 居中时间分隔胶囊 */}
                  {showTimeBadge && msg.timestamp && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        margin: "6px 0 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9.5,
                          color: "rgba(99, 110, 114, 0.75)",
                          background: "rgba(0, 0, 0, 0.04)",
                          padding: "1px 8px",
                          borderRadius: 10,
                          userSelect: "none",
                        }}
                      >
                        {formatTimeBadge(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      alignItems: "flex-end",
                      gap: 7,
                      width: "100%",
                    }}
                  >
                    {/* 左侧 Aeri 本体像素头像 */}
                    {!isUser && (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                          overflow: "hidden",
                        }}
                        title={petName}
                      >
                        <img
                          src={aeriImg}
                          alt={petName}
                          style={{
                            width: 20,
                            height: 20,
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      </div>
                    )}

                    {/* 气泡与时间 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        maxWidth: "76%",
                      }}
                    >
                      <div
                        style={{
                          padding: "7px 11px",
                          fontSize: 12,
                          lineHeight: 1.48,
                          wordBreak: "break-word",
                          borderRadius: isUser
                            ? "14px 14px 2px 14px"
                            : "14px 14px 14px 2px",
                          background: isUser
                            ? "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)"
                            : "rgba(255, 255, 255, 0.94)",
                          color: isUser ? "#ffffff" : "#2d3436",
                          boxShadow: isUser
                            ? "0 2px 8px rgba(255, 159, 67, 0.3)"
                            : "0 1px 6px rgba(0, 0, 0, 0.04)",
                          border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.9)",
                        }}
                      >
                        {msg.content}
                      </div>

                      {/* 时间戳 */}
                      {msg.timestamp && (
                        <span
                          style={{
                            fontSize: 8.5,
                            color: "rgba(99, 110, 114, 0.65)",
                            marginTop: 2,
                            paddingLeft: isUser ? 0 : 3,
                            paddingRight: isUser ? 3 : 0,
                            userSelect: "none",
                          }}
                        >
                          {formatMinute(msg.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* 右侧 用户自定义头像 */}
                    {isUser && (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 1px 4px rgba(255, 159, 67, 0.3)",
                          overflow: "hidden",
                        }}
                        title={userName}
                      >
                        {isCustomUserAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 14 }}>{userAvatar}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* 流式生成中的打字气泡 */}
          {isStreaming && currentReply && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-end",
                gap: 7,
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
                title={petName}
              >
                <img
                  src={aeriImg}
                  alt={petName}
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  maxWidth: "76%",
                }}
              >
                <div
                  style={{
                    padding: "7px 11px",
                    fontSize: 12,
                    lineHeight: 1.48,
                    wordBreak: "break-word",
                    borderRadius: "14px 14px 14px 2px",
                    background: "rgba(255, 255, 255, 0.94)",
                    color: "#2d3436",
                    boxShadow: "0 1px 6px rgba(0, 0, 0, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.9)",
                  }}
                >
                  {currentReply}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 12,
                      background: "#ff9f43",
                      marginLeft: 3,
                      verticalAlign: "middle",
                      animation: "fadeIn 0.5s infinite alternate",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 8.5,
                    color: "#ff9f43",
                    marginTop: 2,
                    paddingLeft: 3,
                    userSelect: "none",
                  }}
                >
                  正在输入中...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入框 (药丸质感浮岛) */}
        <div
          style={{
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.7)",
            borderTop: "1px solid rgba(0, 0, 0, 0.05)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 5px 4px 12px",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: 20,
              border: "1px solid rgba(0, 0, 0, 0.07)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            }}
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? `${petName} 正在思考打字中...`
                  : `输入消息... (回车发送)`
              }
              disabled={isStreaming}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12.5,
                color: "#2d3436",
                minWidth: 0,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || isStreaming}
              style={{
                border: "none",
                background:
                  text.trim() && !isStreaming
                    ? "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)"
                    : "rgba(0,0,0,0.12)",
                color: "#fff",
                borderRadius: 16,
                padding: "5px 14px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: text.trim() && !isStreaming ? "pointer" : "default",
                boxShadow: text.trim()
                  ? "0 2px 6px rgba(255, 159, 67, 0.3)"
                  : "none",
                transition: "all 0.15s ease",
              }}
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 个人信息设置模态窗 */}
      <ProfileModal />
    </div>
  );
}
