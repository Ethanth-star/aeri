import { getCurrentWindow } from "@tauri-apps/api/window";
import { useChatStore } from "../../stores/useChatStore";

export default function DragLayer() {
  const toggleInput = useChatStore((s) => s.toggleInput);
  const showInput = useChatStore((s) => s.showInput);
  const isStreaming = useChatStore((s) => s.isStreaming);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
