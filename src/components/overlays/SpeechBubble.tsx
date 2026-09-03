import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../stores/useChatStore";
import { usePetStore } from "../../stores/usePetStore";
import { useHardwareStore } from "../../stores/useHardwareStore";
import { LedMode } from "../../systems/hardware/types";

export default function SpeechBubble() {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentReply = useChatStore((s) => s.currentReply);
  const clearReply = useChatStore((s) => s.clearReply);
  const showInput = useChatStore((s) => s.showInput);
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
      useHardwareStore.getState().setLedMode(currentReply ? LedMode.TALKING : LedMode.IDLE).catch(() => {});
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, currentReply, changeState]);

  // 2. 根据字数自适应停留时长（仅在流式生成彻底完毕后开始计时）
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsFading(false);

    if (!currentReply || isStreaming) return;

    // 智能自适应公式：基础 2200ms + 每字 200ms，区间 3.5s ~ 15s
    const charCount = currentReply.trim().length;
    const duration = Math.min(15000, Math.max(3500, 2200 + charCount * 200));

    const triggerDismiss = () => {
      if (isHoveredRef.current) {
        // 用户鼠标正放在气泡上，等待移开后再延时关闭
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

  // 当微信风格聊天窗打开时，头顶独立气泡隐藏，避免与聊天记录层视觉重叠
  if (!currentReply || showInput) return null;

  const handleClick = () => {
    if (isStreaming) return;
    openChat();
    changeState("IDLE");
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = true;
    if (!isStreaming) {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow =
        "0 10px 28px rgba(255, 159, 67, 0.22), 0 2px 6px rgba(0, 0, 0, 0.04)";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = false;
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow =
      "0 8px 24px rgba(31, 38, 135, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04)";

    // 鼠标移出后，若已经超过原本停留时间，给予 2 秒平滑淡出宽限期
    if (!isStreaming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          clearReply();
          changeState("IDLE");
          setIsFading(false);
        }, 250);
      }, 2000);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        maxWidth: 290,
        padding: "10px 14px 9px",
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255, 255, 255, 0.9)",
        boxShadow: "0 8px 24px rgba(31, 38, 135, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04)",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "#2d3436",
        wordBreak: "break-word",
        margin: "0 auto",
        cursor: isStreaming ? "default" : "pointer",
        opacity: isFading ? 0 : 1,
        transform: isFading ? "translateY(6px) scale(0.96)" : "translateY(0) scale(1)",
        transition: "opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
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
            height: 13,
            background: "#ff9f43",
            marginLeft: 3,
            verticalAlign: "middle",
            borderRadius: 1,
            animation: "fadeIn 0.6s infinite alternate",
          }}
        />
      )}

      {/* 底部小微标 */}
      {!isStreaming && (
        <div
          style={{
            fontSize: 9.5,
            color: "#a4b0be",
            marginTop: 4,
            textAlign: "right",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <span>查看聊天流</span>
          <span>💬</span>
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
          borderTop: "6px solid rgba(255, 255, 255, 0.88)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.04))",
        }}
      />
    </div>
  );
}
