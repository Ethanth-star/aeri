import { useState } from "react";
import { createPortal } from "react-dom";
import { useMemoryStore } from "../../stores/useMemoryStore";
import type { MemoryCategory } from "../../systems/memory/types";
import { CATEGORY_LABELS } from "../../systems/memory/types";

export default function MemoryPalaceModal() {
  const show = useMemoryStore((s) => s.showMemoryPalace);
  const toggleModal = useMemoryStore((s) => s.toggleMemoryPalace);
  const memories = useMemoryStore((s) => s.memories);
  const enabled = useMemoryStore((s) => s.enabled);
  const autoExtract = useMemoryStore((s) => s.autoExtract);
  const setConfig = useMemoryStore((s) => s.setConfig);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const clearAll = useMemoryStore((s) => s.clearAllMemories);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<MemoryCategory | "all">("all");

  // 新建表单
  const [newContent, setNewContent] = useState("");
  const [newCat, setNewCat] = useState<MemoryCategory>("preference");
  const [newImportance, setNewImportance] = useState(3);
  const [isAdding, setIsAdding] = useState(false);

  if (!show) return null;

  // 过滤记忆
  const filtered = memories.filter((m) => {
    if (filterCat !== "all" && m.category !== filterCat) return false;
    if (search.trim() && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    if (!newContent.trim()) return;
    addMemory({
      category: newCat,
      content: newContent.trim(),
      importance: newImportance,
      source: "manual",
    });
    setNewContent("");
    setIsAdding(false);
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空 Aeri 对主人的所有记忆吗？（此操作不可恢复）")) {
      clearAll();
    }
  };

  return createPortal(
    <div className="settings-overlay" onClick={toggleModal} style={{ zIndex: 1100 }}>
      <div
        className="settings-panel"
        style={{
          width: "100%",
          maxWidth: 336,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          border: "1px solid rgba(255, 255, 255, 0.9)",
          boxShadow: "0 12px 36px rgba(31, 38, 135, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)",
          padding: 14,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🧠</span>
            <span style={{ fontSize: 13, fontWeight: "700", color: "#2d3436" }}>
              Aeri 记忆档案 (Memory Palace)
            </span>
          </div>
          <button
            onClick={toggleModal}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              color: "#b2bec3",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* 状态总览与开关 */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245, 238, 248, 0.7) 0%, rgba(235, 245, 251, 0.7) 100%)",
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 11,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            已记录 <strong style={{ color: "#6c5ce7" }}>{memories.length}</strong> 件事
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setConfig({ enabled: e.target.checked })}
              />
              <span style={{ color: "#636e72" }}>启用回忆</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoExtract}
                onChange={(e) => setConfig({ autoExtract: e.target.checked })}
              />
              <span style={{ color: "#636e72" }}>自动提取</span>
            </label>
          </div>
        </div>

        {/* 搜索与新增按钮 */}
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            placeholder="🔍 搜索记忆..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "5px 9px",
              fontSize: 11,
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 8,
              outline: "none",
              background: "rgba(255, 255, 255, 0.8)",
            }}
          />
          <button
            onClick={() => setIsAdding(!isAdding)}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              background: isAdding ? "#b2bec3" : "#00b894",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "transform 0.15s ease",
            }}
          >
            {isAdding ? "取消" : "＋ 教它记住"}
          </button>
        </div>

        {/* 分类筛选横滑栏 */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          <button
            onClick={() => setFilterCat("all")}
            style={{
              padding: "3px 8px",
              fontSize: 10,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: filterCat === "all" ? "#2d3436" : "rgba(0,0,0,0.05)",
              color: filterCat === "all" ? "#fff" : "#636e72",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
          >
            全部 ({memories.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as MemoryCategory[]).map((cat) => {
            const count = memories.filter((m) => m.category === cat).length;
            const meta = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: "3px 8px",
                  fontSize: 10,
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: filterCat === cat ? meta.color : meta.bgColor,
                  color: filterCat === cat ? "#fff" : meta.color,
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {meta.emoji} {meta.name} ({count})
              </button>
            );
          })}
        </div>

        {/* 手动教它记住表单 */}
        {isAdding && (
          <div
            style={{
              background: "rgba(240, 255, 250, 0.9)",
              border: "1px solid rgba(0, 184, 148, 0.3)",
              padding: 10,
              borderRadius: 10,
              fontSize: 11,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: "700", color: "#00b894" }}>
              📝 教 Aeri 记住一件关于你的事：
            </div>
            <textarea
              rows={2}
              placeholder="例如：主人喜欢在工作时听轻音乐、主人的生日是5月12日..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid rgba(0, 184, 148, 0.3)",
                resize: "none",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as MemoryCategory)}
                  style={{ padding: "3px 5px", fontSize: 10.5, borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="profile">👤 称呼画像</option>
                  <option value="preference">💖 偏好喜好</option>
                  <option value="habit">⏰ 生活作息</option>
                  <option value="fact">📌 重要事实</option>
                  <option value="interaction">🐾 共同回忆</option>
                </select>

                <select
                  value={newImportance}
                  onChange={(e) => setNewImportance(Number(e.target.value))}
                  style={{ padding: "3px 5px", fontSize: 10.5, borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 核心</option>
                  <option value={4}>⭐⭐⭐⭐ 较重要</option>
                  <option value={3}>⭐⭐⭐ 普通</option>
                  <option value={2}>⭐⭐ 随笔</option>
                </select>
              </div>

              <button
                onClick={handleCreate}
                style={{
                  padding: "4px 10px",
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: "#00b894",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                保存记忆
              </button>
            </div>
          </div>
        )}

        {/* 记忆卡片列表 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingRight: 2,
            maxHeight: 250,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#b2bec3", fontSize: 11, padding: "24px 0" }}>
              {memories.length === 0 ? "Aeri 脑海里空空如也，快教它认识你吧~" : "未找到匹配的记忆"}
            </div>
          ) : (
            filtered.map((item) => {
              const meta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.fact;
              const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "numeric",
                day: "numeric",
              });

              return (
                <div
                  key={item.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    borderLeft: `3px solid ${meta.color}`,
                    borderRadius: 8,
                    padding: "7px 9px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: meta.bgColor,
                          color: meta.color,
                          fontWeight: "700",
                        }}
                      >
                        {meta.emoji} {meta.name}
                      </span>
                      <span style={{ fontSize: 9.5, color: "#f1c40f" }}>
                        {"★".repeat(item.importance)}
                      </span>
                      {item.source === "auto" && (
                        <span style={{ fontSize: 8.5, color: "#95a5a6", background: "rgba(0,0,0,0.04)", padding: "1px 4px", borderRadius: 3 }}>
                          AI自主萃取
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, color: "#b2bec3" }}>
                        {dateStr}
                      </span>
                      <button
                        onClick={() => deleteMemory(item.id)}
                        title="删除这条记忆"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 10,
                          color: "#ff7675",
                          padding: "0 2px",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 11.5, color: "#2d3436", lineHeight: 1.4 }}>
                    {item.content}
                  </div>

                  {item.accessCount > 0 && (
                    <div style={{ fontSize: 9, color: "#a4b0be", textAlign: "right" }}>
                      已在聊天中回忆过 {item.accessCount} 次
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 底部功能区 */}
        {memories.length > 0 && (
          <div
            style={{
              paddingTop: 6,
              borderTop: "1px solid rgba(0, 0, 0, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
            }}
          >
            <span style={{ color: "#b2bec3" }}>
              每次对话自动检索 Top 4 最相关记忆注入
            </span>
            <button
              onClick={handleClearAll}
              style={{
                background: "none",
                border: "none",
                color: "#ff7675",
                cursor: "pointer",
                fontSize: 10,
                padding: "2px 4px",
                fontWeight: 600,
              }}
            >
              清空记忆库
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
