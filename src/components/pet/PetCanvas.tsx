import { usePetStore } from "../../stores/usePetStore";
import aeriImg from "../../assets/images/puppy.png";

export default function PetCanvas() {
  const currentTransform = usePetStore((s) => s.currentTransform);
  const currentAnimation = usePetStore((s) => s.currentAnimation);
  const currentSprite = usePetStore((s) => s.currentSprite);

  const displaySrc = currentSprite || aeriImg;

  return (
    <div
      style={{
        width: 70,
        height: 70,
        objectFit: "contain",
        transform: currentTransform,
        transition: currentAnimation === "idle"
          ? "transform 0.3s ease"
          : "transform 0.08s ease",
        imageRendering: "pixelated",
        display: "block",
        margin: "10px auto 0",
      }}
    >
      <img
        src={displaySrc}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: 70,
          height: 70,
          objectFit: "contain",
          transform: currentTransform,
          transition: currentAnimation === "walk" || currentAnimation === "bounce"
            ? "none"
            : currentAnimation === "idle"
              ? "transform 0.3s ease"
              : "transform 0.08s ease",
          imageRendering: "pixelated",
        }}
        alt="Aeri"
      />
    </div>
  );
}
