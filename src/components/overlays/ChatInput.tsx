import { useState } from "react";
import { useChatStore } from "../../stores/useChatStore";

export default function ChatInput() {
  const showInput = useChatStore((s) => s.showInput);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const toggleInput = useChatStore((s) => s.toggleInput);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      toggleInput();
    }
  };

  return (
    <>
      <button
        className="toolbar-btn"
        onClick={toggleInput}
        title="聊天"
        disabled={isStreaming}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {showInput && (
        <div className="chat-input-overlay" onClick={toggleInput}>
          <div className="chat-input-bar" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和 Aeri 说话..."
              className="chat-input-field"
            />
            <button onClick={handleSend} className="chat-input-send">
              发送
            </button>
          </div>
        </div>
      )}
    </>
  );
}
