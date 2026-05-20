import { useEffect, useRef } from "react";
import { usePetStore } from "./stores/usePetStore";
import { useChatStore } from "./stores/useChatStore";
import { tickBehavior } from "./systems/behavior/idle";
import PetCanvas from "./components/pet/PetCanvas";
import DragLayer from "./components/pet/DragLayer";
import SpeechBubble from "./components/overlays/SpeechBubble";
import ChatInput from "./components/overlays/ChatInput";
import "./App.css";

const TICK_RATE = 30;// 目标每秒 30 帧
const TICK_INTERVAL = 1000 / TICK_RATE;// 每帧大约 33.3 毫秒

export default function App() {
  const lastTimeRef = useRef(performance.now());//是浏览器提供的高精度时间，精确到微秒，专门用来做动画计算。
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

        // 1. 推进动画
        pet.tick(TICK_INTERVAL);

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
      <div style={{ position: "relative" }}>
        <SpeechBubble />
        <PetCanvas />
        <ChatInput />
      </div>
      <DragLayer />
    </div>
  );
}
