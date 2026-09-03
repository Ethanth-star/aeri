import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useChatStore } from "../../stores/useChatStore";
import { usePetStore } from "../../stores/usePetStore";

export default function DragLayer() {
  const toggleInput = useChatStore((s) => s.toggleInput);
  const showInput = useChatStore((s) => s.showInput);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const changeState = usePetStore((s) => s.changeState);

  useEffect(() => {
    const handleMouseUp = () => changeState("IDLE");
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [changeState]);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        changeState("DRAGGED");
        getCurrentWindow().startDragging();
      }}
      onClick={() => {
        if (!isStreaming) toggleInput();
      }}
      style={{
        position: "absolute",
        inset: 0,
        cursor: showInput ? "pointer" : "grab",
      }}
    />
  );
}
