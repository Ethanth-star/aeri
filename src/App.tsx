import { useEffect, useRef } from "react";
import { usePetStore } from "./stores/usePetStore";
import { useChatStore } from "./stores/useChatStore";
import { tickBehavior } from "./systems/behavior/idle";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import PetCanvas from "./components/pet/PetCanvas";
import DragLayer from "./components/pet/DragLayer";
import SpeechBubble from "./components/overlays/SpeechBubble";
import ChatInput from "./components/overlays/ChatInput";
import SettingsPanel from "./components/overlays/SettingsPanel";
import "./App.css";

const TICK_RATE = 30;
const TICK_INTERVAL = 1000 / TICK_RATE;

export default function App() {
  const lastTimeRef = useRef(performance.now());
  const accumulatorRef = useRef(0);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      accumulatorRef.current += dt;
      while (accumulatorRef.current >= TICK_INTERVAL) {
        accumulatorRef.current -= TICK_INTERVAL;

        const pet = usePetStore.getState();
        const chat = useChatStore.getState();

        pet.tick(TICK_INTERVAL);

        // 1.5 走路时移动窗口
        if (pet.currentAnimation === "walk") {
          try {
            const win = getCurrentWindow();
            win.outerPosition().then((pos) => {
              win.setPosition(new PhysicalPosition(pos.x + 2, pos.y));
            }).catch(() => {
              // 浏览器开发模式下 Tauri API 不可用
            });
          } catch {
            // getCurrentWindow() 本身也可能在浏览器模式下抛出
          }
        }

        // 2. 自主动作（非对话中）
        if (!chat.isStreaming) {
          const action = tickBehavior(pet.idleTimer, { joy: pet.joy });
          if (action) {
            pet.playAnimation(action);
            pet.setIdleTimer(0);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const rafRef = { current: requestAnimationFrame(loop) };
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="app-container">
      <div className="pet-layout">
        <div className="bubble-area">
          <SpeechBubble />
        </div>
        <div className="pet-area">
          <PetCanvas />
          <DragLayer />
        </div>
        <div className="toolbar">
          <ChatInput />
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
