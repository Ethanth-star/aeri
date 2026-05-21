import { useChatStore } from "../../stores/useChatStore";
import { usePetStore } from "../../stores/usePetStore";

export default function SpeechBubble() {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentReply = useChatStore((s) => s.currentReply);
  const clearReply = useChatStore((s) => s.clearReply);
  const toggleInput = useChatStore((s) => s.toggleInput);
  const playAnimation = usePetStore((s) => s.playAnimation);

  if (!currentReply) return null;

  const handleClick = () => {
    if (isStreaming) return;
    clearReply();
    toggleInput();
  };

  return (
    <div
      onAnimationStart={() => playAnimation("thinking")}
      onClick={handleClick}
      style={{
        maxWidth: 260,
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#333",
        wordBreak: "break-word",
        margin: "0 auto",
        cursor: isStreaming ? "default" : "pointer",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isStreaming) {
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(255,159,67,0.3)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      }}
    >
      {currentReply}
      {isStreaming && (
        <span style={{ display: "inline-block", width: 4, height: 14, background: "#999", marginLeft: 2 }} />
      )}
      {!isStreaming && (
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 4, textAlign: "right" }}>点击继续聊天</div>
      )}
    </div>
  );
}
