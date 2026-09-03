import { useRef } from "react";
import { createPortal } from "react-dom";
import { useProfileStore, PRESET_AVATARS } from "../../stores/useProfileStore";
import aeriImg from "../../assets/images/puppy.png";

export default function ProfileModal() {
  const show = useProfileStore((s) => s.showProfileModal);
  const close = useProfileStore((s) => s.closeProfileModal);
  const userName = useProfileStore((s) => s.userName);
  const userAvatar = useProfileStore((s) => s.userAvatar);
  const petName = useProfileStore((s) => s.petName);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!show) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("头像图片不能超过 2MB 汪~");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateProfile({ userAvatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const isCustomImage = userAvatar.startsWith("data:image/") || userAvatar.startsWith("http");

  return createPortal(
    <div
      className="settings-overlay"
      onClick={close}
      style={{
        zIndex: 1200,
        background: "rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        className="settings-panel"
        style={{
          width: "100%",
          maxWidth: 336,
          maxHeight: "82vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(22px)",
          borderRadius: 16,
          border: "1px solid rgba(255, 255, 255, 0.95)",
          boxShadow: "0 16px 40px rgba(31, 38, 135, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04)",
          padding: 14,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: "700", color: "#2d3436" }}>
              个人信息与伴侣设置
            </span>
          </div>
          <button
            onClick={close}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              color: "#b2bec3",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. 主人档案设置 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: "700", color: "#636e72", marginBottom: 8 }}>
            👑 主人信息 (你)
          </div>

          {/* 头像展示与上传 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(255, 159, 67, 0.35)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {isCustomImage ? (
                <img
                  src={userAvatar}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 24 }}>{userAvatar}</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "4px 10px",
                  fontSize: 10.5,
                  background: "#0984e3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  width: "fit-content",
                }}
              >
                📁 上传本地照片头像
              </button>
              <span style={{ fontSize: 9.5, color: "#a4b0be" }}>
                支持 JPG/PNG 等格式，自动缩放为圆形
              </span>
            </div>
          </div>

          {/* 预设 Emoji 头像池 */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#636e72", display: "block", marginBottom: 4 }}>
              或选择精美预设头像：
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 4,
              }}
            >
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av}
                  onClick={() => updateProfile({ userAvatar: av })}
                  style={{
                    width: 30,
                    height: 30,
                    border: userAvatar === av ? "2px solid #ff9f43" : "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 8,
                    background: userAvatar === av ? "#fff3e0" : "rgba(255,255,255,0.8)",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* 主人昵称 */}
          <label className="settings-field" style={{ margin: 0 }}>
            <span>主人昵称</span>
            <input
              value={userName}
              onChange={(e) => updateProfile({ userName: e.target.value })}
              placeholder="怎么称呼你..."
              maxLength={16}
            />
          </label>
        </div>

        {/* 2. 伴侣 Aeri 设置 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: "700", color: "#636e72", marginBottom: 8 }}>
            🐶 桌面伴侣信息
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                flexShrink: 0,
              }}
            >
              <img
                src={aeriImg}
                alt="Aeri"
                style={{ width: 34, height: 34, objectFit: "contain", imageRendering: "pixelated" }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="settings-field" style={{ margin: 0 }}>
                <span>小狗名字</span>
                <input
                  value={petName}
                  onChange={(e) => updateProfile({ petName: e.target.value })}
                  placeholder="小狗名字 (如 Aeri)..."
                  maxLength={16}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 3. 对话气泡实时预览效果 */}
        <div
          style={{
            background: "rgba(245, 246, 250, 0.8)",
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px dashed rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: 10, color: "#636e72", marginBottom: 6, fontWeight: 600 }}>
            ✨ 聊天气泡效果实时预览：
          </div>

          {/* Aeri 气泡 (左) */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                flexShrink: 0,
              }}
            >
              <img src={aeriImg} alt="Aeri" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            <div
              style={{
                background: "#ffffff",
                color: "#2d3436",
                borderRadius: "12px 12px 12px 2px",
                padding: "6px 10px",
                fontSize: 11,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {petName}: 主人好呀！头像设置好啦汪~ (｡･ω･｡)
            </div>
          </div>

          {/* 主人气泡 (右) */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6 }}>
            <div
              style={{
                background: "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
                color: "#ffffff",
                borderRadius: "12px 12px 2px 12px",
                padding: "6px 10px",
                fontSize: 11,
                boxShadow: "0 2px 6px rgba(255, 159, 67, 0.3)",
              }}
            >
              {userName}: 这是我的专属新形象！
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 4px rgba(255, 159, 67, 0.3)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {isCustomImage ? (
                <img src={userAvatar} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 13 }}>{userAvatar}</span>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <button
            onClick={resetProfile}
            style={{
              background: "none",
              border: "none",
              color: "#a4b0be",
              cursor: "pointer",
              fontSize: 10.5,
              padding: "4px 6px",
            }}
          >
            恢复默认
          </button>
          <button
            onClick={close}
            style={{
              background: "linear-gradient(135deg, #ff9f43 0%, #ff793f 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 20px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(255, 159, 67, 0.35)",
            }}
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
