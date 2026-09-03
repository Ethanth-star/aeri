import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MemoryCategory, MemoryConfig, MemoryItem } from "../systems/memory/types";
import { retrieveRelevantMemories } from "../systems/memory/engine";

interface MemoryStoreState extends MemoryConfig {
  memories: MemoryItem[];
  showMemoryPalace: boolean;
}

interface MemoryStoreActions {
  addMemory: (item: {
    category: MemoryCategory;
    content: string;
    importance?: number;
    source?: "auto" | "manual";
  }) => void;
  updateMemory: (
    id: string,
    updates: Partial<Pick<MemoryItem, "content" | "category" | "importance">>,
  ) => void;
  deleteMemory: (id: string) => void;
  clearAllMemories: () => void;
  toggleMemoryPalace: () => void;
  setConfig: (cfg: Partial<MemoryConfig>) => void;
  getRelevantMemories: (query: string) => MemoryItem[];
  recordAccess: (ids: string[]) => void;
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: "mem_init_01",
    category: "profile",
    content: "主人给这只小狗起名叫 Aeri，我们是最好的桌面伙伴。",
    importance: 5,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    lastAccessedAt: Date.now(),
    accessCount: 5,
    source: "manual",
  },
  {
    id: "mem_init_02",
    category: "fact",
    content: "主人正在使用 STC-B 学习板做工训实验，给 Aeri 连上了真实的超声波和传感器。",
    importance: 4,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    lastAccessedAt: Date.now(),
    accessCount: 3,
    source: "manual",
  },
];

export const useMemoryStore = create<MemoryStoreState & MemoryStoreActions>()(
  persist(
    (set, get) => ({
      enabled: true,
      autoExtract: true,
      maxInjectCount: 4,
      memories: INITIAL_MEMORIES,
      showMemoryPalace: false,

      addMemory: ({ category, content, importance = 3, source = "manual" }) => {
        const cleanContent = content.trim();
        if (!cleanContent) return;

        // 去重：如果已有非常接近的记忆内容，直接更新重要度和时间戳
        const existing = get().memories.find(
          (m) => m.content.toLowerCase() === cleanContent.toLowerCase(),
        );

        if (existing) {
          get().updateMemory(existing.id, {
            importance: Math.max(existing.importance, importance),
          });
          return;
        }

        const newMem: MemoryItem = {
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category,
          content: cleanContent,
          importance: Math.min(5, Math.max(1, importance)),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          source,
        };

        set((s) => ({ memories: [newMem, ...s.memories] }));
      },

      updateMemory: (id, updates) => {
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m,
          ),
        }));
      },

      deleteMemory: (id) => {
        set((s) => ({
          memories: s.memories.filter((m) => m.id !== id),
        }));
      },

      clearAllMemories: () => {
        set({ memories: [] });
      },

      toggleMemoryPalace: () => {
        set((s) => ({ showMemoryPalace: !s.showMemoryPalace }));
      },

      setConfig: (cfg) => {
        set((s) => ({ ...s, ...cfg }));
      },

      getRelevantMemories: (query: string) => {
        const { enabled, memories, maxInjectCount } = get();
        if (!enabled || memories.length === 0) return [];
        return retrieveRelevantMemories(query, memories, maxInjectCount);
      },

      recordAccess: (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        const now = Date.now();
        set((s) => ({
          memories: s.memories.map((m) =>
            ids.includes(m.id)
              ? { ...m, lastAccessedAt: now, accessCount: m.accessCount + 1 }
              : m,
          ),
        }));
      },
    }),
    {
      name: "aeri_memory_palace",
      partialize: (s) => ({
        enabled: s.enabled,
        autoExtract: s.autoExtract,
        maxInjectCount: s.maxInjectCount,
        memories: s.memories,
      }),
    },
  ),
);
