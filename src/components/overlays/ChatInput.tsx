import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useChatStore } from "../../stores/useChatStore";
import { useProfileStore } from "../../stores/useProfileStore";
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

export default function ChatInput() {
  const showInput = useChatStore((s) => s.showInput);
  const toggleInput = useChatStore((s) => s.toggleInput);
  const closeChat = useChatStore((s) => s.closeChat);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentReply = useChatStore((s) => s.currentReply);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const userName = useProfileStore((s) => s.userName);
  const userAvatar = useProfileStore((s) => s.userAvatar);
  const petName = useProfileStore((s) => s.petName);
  const openProfileModal = useProfileStore((s) => s.openProfileModal);

  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isCustomUserAvatar = userAvatar.startsWith("data:image/") || userAvatar.startsWith("http");

  // 自动滚动到对话底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (showInput) {
      scrollToBottom();
    }
  }, [showInput, messages.length, currentReply]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      closeChat();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("确定要清空所有聊天记录吗？")) {
      clearMessages();
    }
  };

  return (
    <>
      <button
        className="toolbar-btn"
        onClick={toggleInput}
        title="与 Aeri 聊天"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {showInput &&
        createPortal(
          <div
            className="chat-input-overlay"
            onClick={closeChat}
            style={{
              background: "transparent",
              backdropFilter: "none",
            }}
          >
            <div
              className="settings-panel"
              style={{
                width: "100%",
                maxWidth: 336,
                height: "72vh",
                maxHeight: 330,
                display: "flex",
                flexDirection: "column",
                padding: "10px 12px 8px",
                background: "rgba(255, 255, 255, 0.72)",
                backdropFilter: "blur(24px)",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.85)",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部标题栏 (微信/QQ风格) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 6,
                  borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                  flexShrink: 0,
                }}
              >
                {/* Aeri 头像与状态 */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
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
                        width: 22,
                        height: 22,
                        objectFit: "contain",
                        imageRendering: "pixelated",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, fontWeight: "700", color: "#2d3436" }}>
                      {petName}
                    </span>
                    <span
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
                      在线陪伴中
                    </span>
                  </div>
                </div>

                {/* 快捷操作栏 */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {/* 个人信息设置入口 */}
                  <button
                    onClick={openProfileModal}
                    title="设置个人信息与头像"
                    style={{
                      background: "rgba(0, 0, 0, 0.04)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      color: "#636e72",
                      padding: "3px 6px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span>👤</span>
                    <span style={{ fontSize: 9.5 }}>{userName}</span>
                  </button>

                  {/* 清空历史记录 */}
                  {messages.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      title="清空聊天记录"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "#a4b0be",
                        padding: "2px 4px",
                      }}
                    >
                      🗑️
                    </button>
                  )}

                  {/* 关闭 */}
                  <button
                    onClick={closeChat}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 15,
                      color: "#b2bec3",
                      cursor: "pointer",
                      padding: "0 4px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 消息滚动流 (一次适度显示 4~5 轮完整对话) */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "8px 2px 4px",
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#a4b0be",
                      fontSize: 11,
                      marginTop: 40,
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
                        {/* 微信风格时间分割条 */}
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
                            gap: 6,
                            width: "100%",
                          }}
                        >
                          {/* 左侧 Aeri 本体像素头像 */}
                          {!isUser && (
                            <div
                              style={{
                                width: 24,
                                height: 24,
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
                                  width: 19,
                                  height: 19,
                                  objectFit: "contain",
                                  imageRendering: "pixelated",
                                }}
                              />
                            </div>
                          )}

                          {/* 气泡与发送时间戳集群 */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isUser ? "flex-end" : "flex-start",
                              maxWidth: "74%",
                            }}
                          >
                            <div
                              style={{
                                padding: "6px 10px",
                                fontSize: 11.5,
                                lineHeight: 1.45,
                                wordBreak: "break-word",
                                borderRadius: isUser
                                  ? "12px 12px 2px 12px"
                                  : "12px 12px 12px 2px",
                                background: isUser
                                  ? "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)"
                                  : "rgba(255, 255, 255, 0.92)",
                                color: isUser ? "#ffffff" : "#2d3436",
                                boxShadow: isUser
                                  ? "0 2px 8px rgba(255, 159, 67, 0.3)"
                                  : "0 1px 6px rgba(0, 0, 0, 0.04)",
                                border: isUser
                                  ? "none"
                                  : "1px solid rgba(255, 255, 255, 0.9)",
                              }}
                            >
                              {msg.content}
                            </div>

                            {/* 气泡下方的精确发送时间 */}
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

                          {/* 右侧 主人自定义头像 */}
                          {isUser && (
                            <div
                              style={{
                                width: 24,
                                height: 24,
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
                                <span style={{ fontSize: 13 }}>{userAvatar}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* 实时流式打字输出中的气泡 */}
                {isStreaming && currentReply && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                      alignItems: "flex-end",
                      gap: 6,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
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
                          width: 19,
                          height: 19,
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
                        maxWidth: "74%",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          fontSize: 11.5,
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                          borderRadius: "12px 12px 12px 2px",
                          background: "rgba(255, 255, 255, 0.92)",
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
                            height: 11,
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

              {/* 底部输入框 (微信/QQ药丸浮岛风格) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 4px 4px 10px",
                  background: "rgba(255, 255, 255, 0.92)",
                  borderRadius: 20,
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                  marginTop: 6,
                  flexShrink: 0,
                }}
              >
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isStreaming
                      ? `${petName} 正在打字中...`
                      : `输入消息... (回车发送)`
                  }
                  disabled={isStreaming}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 12,
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
                    padding: "4px 12px",
                    fontSize: 11,
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
          </div>,
          document.body
        )}
    </>
  );
}
