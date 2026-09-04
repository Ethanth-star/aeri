import { create } from "zustand";
import { persist } from "zustand/middleware";
import { streamChat, type ChatConfig, type ChatMessage } from "../systems/ai/chat";
import { usePetStore } from "./usePetStore";
import { useMemoryStore } from "./useMemoryStore";
import { extractMemoriesFromConversation } from "../systems/memory/engine";
import { useAudioStore } from "./useAudioStore";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentReply: string;
  showInput: boolean;
  showSettings: boolean;
  config: ChatConfig;
  city: string;
}

interface ChatActions {
  sendMessage: (text: string) => Promise<void>;
  toggleInput: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleSettings: () => void;
  setConfig: (config: Partial<ChatConfig>) => void;
  setCity: (city: string) => void;
  clearReply: () => void;
  clearMessages: () => void;
  addAssistantMessage: (text: string) => void;
}

const DEFAULT_CONFIG: ChatConfig = {
  baseUrl: "https://api.deepseek.com",
  apiKey: "",
  model: "deepseek-chat",
};

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: "msg_init_01",
          role: "assistant",
          content: "主人你好呀！我是 Aeri，随时准备陪你聊天汪~ (｡･ω･｡)",
          timestamp: Date.now() - 3600000,
        },
      ],
      isStreaming: false,
      currentReply: "",
      showInput: false,
      showSettings: false,
      config: DEFAULT_CONFIG,
      city: "",

      sendMessage: async (text: string) => {
        const { config, messages, city } = get();
        const trimmed = text.trim();
        if (!trimmed) return;

        // 用户互动 → 情绪事件
        usePetStore.getState().emitEmotionEvent({ type: "user_interaction" });

        const userMsg: ChatMessage = {
          id: `msg_${Date.now()}_u`,
          role: "user",
          content: trimmed,
          timestamp: Date.now(),
        };

        const newMessages = [...messages, userMsg];
        set({
          messages: newMessages,
          isStreaming: true,
          currentReply: "",
        });

        try {
          let reply = "";
          for await (const chunk of streamChat(config, messages, trimmed, city || undefined)) {
            reply += chunk;
            set({ currentReply: reply });
          }

          const assistantMsg: ChatMessage = {
            id: `msg_${Date.now()}_a`,
            role: "assistant",
            content: reply,
            timestamp: Date.now(),
          };

          set({
            messages: [...newMessages, assistantMsg],
          });

          // 甜妹音语音合成朗读
          useAudioStore.getState().speak(reply);

          // AI 回复完成 → 积极聊天事件
          usePetStore.getState().emitEmotionEvent({ type: "chat_positive" });

          // 异步记忆萃取 (后台运行，不阻塞用户UI体验)
          const memoryStore = useMemoryStore.getState();
          if (memoryStore.enabled && memoryStore.autoExtract && reply) {
            extractMemoriesFromConversation(trimmed, reply, config)
              .then((newMemories) => {
                for (const item of newMemories) {
                  memoryStore.addMemory({
                    category: item.category,
                    content: item.content,
                    importance: item.importance,
                    source: "auto",
                  });
                }
              })
              .catch(() => {});
          }
        } catch (err) {
          const errMsg = `(出错了: ${String(err)})`;
          set({
            currentReply: errMsg,
            messages: [
              ...newMessages,
              {
                id: `msg_${Date.now()}_err`,
                role: "assistant",
                content: errMsg,
                timestamp: Date.now(),
              },
            ],
          });
        } finally {
          set({ isStreaming: false });
        }
      },

      toggleInput: () => set((s) => ({ showInput: !s.showInput })),
      openChat: () => set({ showInput: true }),
      closeChat: () => set({ showInput: false }),

      toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

      setConfig: (partial) =>
        set((s) => ({ config: { ...s.config, ...partial } })),

      setCity: (city) => set({ city }),

      clearReply: () => {
        useAudioStore.getState().stop();
        set({ currentReply: "" });
      },

      clearMessages: () => {
        useAudioStore.getState().stop();
        set({ messages: [], currentReply: "" });
      },

      addAssistantMessage: (text: string) => {
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: "assistant",
          content: text,
          timestamp: Date.now(),
        };
        set((state) => ({
          currentReply: text,
          messages: [...state.messages, assistantMsg],
        }));
        useAudioStore.getState().speak(text);
      },
    }),
    {
      name: "aeri_chat_store",
      partialize: (state) => ({
        config: state.config,
        city: state.city,
        messages: state.messages.slice(-80), // 持久化最近 80 条聊天记录
      }),
      merge: (persistedState: any, currentState) => {
        const savedConfig = persistedState?.config || {};
        const config: ChatConfig = {
          baseUrl: savedConfig.baseUrl || DEFAULT_CONFIG.baseUrl,
          apiKey:
            savedConfig.apiKey && savedConfig.apiKey.startsWith("sk-")
              ? savedConfig.apiKey
              : DEFAULT_CONFIG.apiKey,
          model: savedConfig.model || DEFAULT_CONFIG.model,
        };
        const messages: ChatMessage[] =
          persistedState?.messages && persistedState.messages.length > 0
            ? persistedState.messages
            : currentState.messages;
        const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
        return {
          ...currentState,
          ...persistedState,
          config,
          messages,
          currentReply: lastAssistantMsg ? lastAssistantMsg.content : currentState.currentReply,
        };
      },
    }
  )
);
