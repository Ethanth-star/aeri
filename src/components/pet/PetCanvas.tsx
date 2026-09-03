import { usePetStore } from "../../stores/usePetStore";
import aeriImg from "../../assets/images/puppy.png";

export default function PetCanvas() {
  const currentFrameImage = usePetStore((s) => s.currentFrameImage);
  const facingDirection = usePetStore((s) => s.facingDirection);

  return (
    <div
      style={{
        position: "relative",
        width: 84,
        height: 84,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 像素小狗主体 */}
      <img
        src={currentFrameImage || aeriImg}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: 72,
          height: 72,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12))",
          zIndex: 2,
          position: "relative",
          transform: facingDirection === -1 ? "scaleX(-1)" : "scaleX(1)",
        }}
        alt="Aeri"
      />

      {/* 地面软微光椭圆阴影：解决小狗干瘪悬空感 */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          width: 46,
          height: 10,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(45, 52, 54, 0.32) 0%, rgba(45, 52, 54, 0) 75%)",
          animation: "petShadowBreath 2.4s ease-in-out infinite",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
