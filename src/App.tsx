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
  const bounceStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevAnimationRef = useRef("idle");

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

        const currentAnim = usePetStore.getState().currentAnimation;

        // 1.5 走路时移动窗口
        if (currentAnim === "walk") {
          try {
            const win = getCurrentWindow();
            win.outerPosition().then((pos) => {
              win.setPosition(new PhysicalPosition(pos.x + 2, pos.y));
            }).catch(() => {});
          } catch {}
        }

        // 1.6 跳跃时抛物线移动窗口
        if (currentAnim === "bounce") {
          const BOUNCE_DURATION = 640; // 8 frames * 80ms
          const BOUNCE_DX = 120;
          const BOUNCE_MAX_H = 80;

          if (prevAnimationRef.current !== "bounce") {
            try {
              getCurrentWindow().outerPosition().then((pos) => {
                bounceStartRef.current = { x: pos.x, y: pos.y };
              }).catch(() => {});
            } catch {}
          }

          const start = bounceStartRef.current;
          if (start) {
            const elapsed = usePetStore.getState().animationElapsed;
            const progress = Math.min(elapsed / BOUNCE_DURATION, 1);
            const xOffset = Math.round(BOUNCE_DX * progress);
            const yOffset = -Math.round(BOUNCE_MAX_H * 4 * progress * (1 - progress));
            try {
              getCurrentWindow().setPosition(
                new PhysicalPosition(start.x + xOffset, start.y + yOffset)
              );
            } catch {}
          }
        }

        prevAnimationRef.current = currentAnim;

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
