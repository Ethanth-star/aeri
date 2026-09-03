import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { usePetStore } from "./stores/usePetStore";
import { useHardwareStore } from "./stores/useHardwareStore";
import { useWaterStore } from "./stores/useWaterStore";
import { useChatStore } from "./stores/useChatStore";
import { useMemoryStore } from "./stores/useMemoryStore";
import { useProfileStore } from "./stores/useProfileStore";
import { tickBehavior } from "./systems/behavior/idle";
import PetCanvas from "./components/pet/PetCanvas";
import DragLayer from "./components/pet/DragLayer";
import SpeechBubble from "./components/overlays/SpeechBubble";
import ChatInput from "./components/overlays/ChatInput";
import SettingsPanel from "./components/overlays/SettingsPanel";
import MemoryPalaceModal from "./components/overlays/MemoryPalaceModal";
import ProfileModal from "./components/overlays/ProfileModal";
import StandaloneChatWindow from "./components/chat/StandaloneChatWindow";
import "./App.css";

const TICK_RATE = 30;
const TICK_INTERVAL = 1000 / TICK_RATE;

export default function App() {
  const [windowLabel, setWindowLabel] = useState<string>("main");

  // 识别当前 Webview 窗口角色 (main 为小狗桌面窗口，chat 为独立可拖拽聊天窗口)
  useEffect(() => {
    try {
      const win = getCurrentWebviewWindow();
      if (win?.label) {
        setWindowLabel(win.label);
      }
    } catch {
      // 浏览器环境运行回退
    }
  }, []);

  // 如果是独立聊天窗口，直接渲染全功能毛玻璃拖拽聊天界面
  if (windowLabel === "chat") {
    return <StandaloneChatWindow />;
  }

  return <PetMainWindowView />;
}

/**
 * Aeri 桌面小狗主窗口视图
 */
function PetMainWindowView() {
  const lastTimeRef = useRef(performance.now());
  const accumulatorRef = useRef(0);
  const prevAnimationRef = useRef("idle");

  const showSettings = useChatStore((s) => s.showSettings);
  const showInput = useChatStore((s) => s.showInput);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      accumulatorRef.current += dt;
      while (accumulatorRef.current >= TICK_INTERVAL) {
        accumulatorRef.current -= TICK_INTERVAL;

        const pet = usePetStore.getState();

        // 1. 情绪衰减 + 动画推进 + 喝水计时
        pet.tickStore(TICK_INTERVAL);
        useWaterStore.getState().tickWater(TICK_INTERVAL);

        const currentAnim = pet.currentClipName;

        // 2. 界面保护锁：如果设置面板或浮层处于开启状态，界面绝不跟着本体位移
        const chatStore = useChatStore.getState();
        const memoryStore = useMemoryStore.getState();
        const profileStore = useProfileStore.getState();
        const isUIBusy =
          chatStore.showSettings ||
          chatStore.showInput ||
          Boolean(chatStore.currentReply) ||
          chatStore.isStreaming ||
          memoryStore.showMemoryPalace ||
          profileStore.showProfileModal ||
          pet.currentState !== "IDLE";

        // 3. 仅在纯净空闲态进行窗口位移 (跨多显示器无缝行走 + 边缘碰撞反弹掉头)
        if (!isUIBusy) {
          if (currentAnim === "walk") {
            invoke<{ x: number; y: number; direction: number; hit_edge: boolean }>("step_pet_window", {
              dx: 3,
              dy: 0,
              direction: pet.facingDirection,
            })
              .then((res) => {
                if (res.direction !== pet.facingDirection) {
                  pet.setFacingDirection(res.direction as 1 | -1);
                }
              })
              .catch(() => {});
          }

          if (currentAnim === "bounce") {
            invoke<{ x: number; y: number; direction: number; hit_edge: boolean }>("step_pet_window", {
              dx: 5,
              dy: 0,
              direction: pet.facingDirection,
            })
              .then((res) => {
                if (res.direction !== pet.facingDirection) {
                  pet.setFacingDirection(res.direction as 1 | -1);
                }
              })
              .catch(() => {});
          }
        }

        prevAnimationRef.current = currentAnim;

        // 4. 自主动作 —— 仅在 IDLE 且无弹窗干扰时允许随机触发
        if (pet.currentState === "IDLE" && !isUIBusy) {
          const action = tickBehavior(pet.idleTimer, pet.emotion);
          if (action) {
            pet.playAnimation(action);
            pet.setIdleTimer(0);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    let unlistenHw: (() => void) | null = null;
    useHardwareStore
      .getState()
      .initListeners()
      .then((unlisten) => {
        unlistenHw = unlisten;
      })
      .catch(() => {});

    const rafRef = { current: requestAnimationFrame(loop) };
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (unlistenHw) unlistenHw();
    };
  }, []);

  return (
    <div className="app-container">
      <div className="pet-layout">
        {/* 顶部对话气泡 */}
        <div className="bubble-area">
          <SpeechBubble />
        </div>

        {/* 鼠标互动专属集群：仅当鼠标悬停在小狗身上或工具栏时显现 */}
        <div className="pet-interactive-cluster">
          {/* 核心小狗与拖拽层 */}
          <div className="pet-area">
            <PetCanvas />
            <DragLayer />
          </div>

          {/* 悬浮工具栏 (平时隐藏，鼠标移入小狗本体时浮现) */}
          <div className={`toolbar ${showSettings || showInput ? "is-active" : ""}`}>
            <ChatInput />
            <SettingsPanel />
          </div>
        </div>
      </div>

      {/* 记忆宫殿浮层 */}
      <MemoryPalaceModal />

      {/* 个人档案与伴侣信息浮层 */}
      <ProfileModal />
    </div>
  );
}
