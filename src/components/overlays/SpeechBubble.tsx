import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useChatStore } from "../../stores/useChatStore";
import { usePetStore } from "../../stores/usePetStore";
import { useHardwareStore } from "../../stores/useHardwareStore";
import { LedMode } from "../../systems/hardware/types";

export default function SpeechBubble() {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentReply = useChatStore((s) => s.currentReply);
  const clearReply = useChatStore((s) => s.clearReply);
  const openChat = useChatStore((s) => s.openChat);
  const changeState = usePetStore((s) => s.changeState);
  const prevStreamingRef = useRef(isStreaming);

  const [isFading, setIsFading] = useState(false);
  const isHoveredRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // 1. 状态与硬件灯效联动
  useEffect(() => {
    if (isStreaming && !prevStreamingRef.current) {
      changeState("THINKING");
      useHardwareStore.getState().setLedMode(LedMode.THINKING).catch(() => {});
    } else if (!isStreaming && prevStreamingRef.current) {
      changeState(currentReply ? "TALKING" : "IDLE");
      useHardwareStore
        .getState()
        .setLedMode(currentReply ? LedMode.TALKING : LedMode.IDLE)
        .catch(() => {});
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, currentReply, changeState]);

  // 2. 充足自然的停留时间 (短句至少 8s，随字数递增，上限 30s)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsFading(false);

    if (!currentReply || isStreaming) return;

    // 智能舒适时长算法：基础 6000ms + 每字 250ms，区间 8s ~ 30s
    const charCount = currentReply.trim().length;
    const duration = Math.min(30000, Math.max(8000, 6000 + charCount * 250));

    const triggerDismiss = () => {
      if (isHoveredRef.current) {
        // 用户鼠标正放在气泡上，保持常驻，移开后再延时关闭
        return;
      }
      setIsFading(true);
      setTimeout(() => {
        clearReply();
        changeState("IDLE");
        setIsFading(false);
      }, 250);
    };

    timerRef.current = window.setTimeout(triggerDismiss, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentReply, isStreaming, clearReply, changeState]);

  // 如果没有回复内容，则不显示
  if (!currentReply) return null;

  const handleClick = () => {
    if (isStreaming) return;
    invoke("toggle_chat_window").catch(() => openChat());
    changeState("IDLE");
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFading(true);
    setTimeout(() => {
      clearReply();
      changeState("IDLE");
      setIsFading(false);
    }, 200);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = true;
    if (!isStreaming) {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow =
        "0 10px 28px rgba(255, 159, 67, 0.25), 0 2px 6px rgba(0, 0, 0, 0.04)";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = false;
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow =
      "0 8px 24px rgba(31, 38, 135, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)";

    // 鼠标移出后，若已经超过原本停留时间，给予 4 秒充足宽限期才淡出
    if (!isStreaming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          clearReply();
          changeState("IDLE");
          setIsFading(false);
        }, 250);
      }, 4000);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        maxWidth: 260,
        padding: "9px 12px 8px",
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.95)",
        boxShadow:
          "0 10px 26px rgba(31, 38, 135, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)",
        fontSize: 12,
        lineHeight: 1.5,
        color: "#2d3436",
        wordBreak: "break-word",
        margin: "0 auto",
        cursor: isStreaming ? "default" : "pointer",
        opacity: isFading ? 0 : 1,
        transform: isFading ? "translateY(6px) scale(0.96)" : "translateY(0) scale(1)",
        transition:
          "opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
        animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* 气泡文字内容 */}
      <span style={{ fontWeight: 450 }}>{currentReply}</span>

      {/* 流式打字机呼吸游标 */}
      {isStreaming && (
        <span
          style={{
            display: "inline-block",
            width: 3,
            height: 12,
            background: "#ff9f43",
            marginLeft: 3,
            verticalAlign: "middle",
            borderRadius: 1,
            animation: "fadeIn 0.6s infinite alternate",
          }}
        />
      )}

      {/* 底部功能栏 (查看完整对话与主动关闭) */}
      {!isStreaming && (
        <div
          style={{
            fontSize: 9,
            color: "#a4b0be",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span>点击打开对话窗</span>
            <span>💬</span>
          </span>
          <button
            onClick={handleDismiss}
            title="关闭气泡"
            style={{
              background: "none",
              border: "none",
              color: "#b2bec3",
              fontSize: 10,
              cursor: "pointer",
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 指向小狗的柔和气泡小三角尾巴 */}
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid rgba(255, 255, 255, 0.92)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.04))",
        }}
      />
    </div>
  );
}
