import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ttsEngine } from "../systems/audio/tts";
import { useHardwareStore } from "./useHardwareStore";
import { usePetStore } from "./usePetStore";

interface AudioStoreState {
  ttsEnabled: boolean;
  volume: number;
  pitch: number;
  rate: number;
  voiceURI: string;
  isSpeaking: boolean;

  setTtsEnabled: (enabled: boolean) => void;
  toggleTts: () => void;
  setVolume: (volume: number) => void;
  setPitch: (pitch: number) => void;
  setRate: (rate: number) => void;
  setVoiceURI: (voiceURI: string) => void;

  speak: (text: string) => void;
  stop: () => void;
}

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => ({
      ttsEnabled: true,
      volume: 1.0,
      pitch: 1.3,     // 默认 1.3 打造元气甜妹音
      rate: 1.08,     // 默认 1.08 轻快灵动节奏
      voiceURI: "",
      isSpeaking: false,

      setTtsEnabled: (enabled) => {
        set({ ttsEnabled: enabled });
        if (!enabled) ttsEngine.stop();
      },

      toggleTts: () => {
        const next = !get().ttsEnabled;
        set({ ttsEnabled: next });
        if (!next) ttsEngine.stop();
      },

      setVolume: (volume) => set({ volume }),
      setPitch: (pitch) => set({ pitch }),
      setRate: (rate) => set({ rate }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),

      speak: (text: string) => {
        const { ttsEnabled, volume, pitch, rate, voiceURI } = get();
        if (!ttsEnabled) return;

        const clean = ttsEngine.cleanTextForSpeech(text);
        if (!clean) return;

        const hwStore = useHardwareStore.getState();
        if (hwStore.connected) {
          // 硬件已连接：优先通过 STC-B SM 接口硬件语音合成模块发声 (喇叭)
          set({ isSpeaking: true });
          try {
            usePetStore.getState().changeState("TALKING");
          } catch {}

          hwStore.sendTTS(clean).finally(() => {
            // 根据文本长度自适应恢复说话状态
            const duration = Math.min(15000, Math.max(1500, clean.length * 250));
            setTimeout(() => {
              set({ isSpeaking: false });
              try {
                if (usePetStore.getState().currentState === "TALKING") {
                  usePetStore.getState().changeState("IDLE");
                }
              } catch {}
            }, duration);
          });
        } else {
          // 硬件未连接：回退到电脑扬声器 Web Speech API 发声
          set({ isSpeaking: true });
          ttsEngine.speak(
            clean,
            {
              volume,
              pitch,
              rate,
              voiceURI: voiceURI || undefined,
            },
            () => {
              set({ isSpeaking: false });
            }
          );
        }
      },

      stop: () => {
        ttsEngine.stop();
        set({ isSpeaking: false });
        try {
          if (usePetStore.getState().currentState === "TALKING") {
            usePetStore.getState().changeState("IDLE");
          }
        } catch {}
      },
    }),
    {
      name: "aeri_audio_settings",
      partialize: (state) => ({
        ttsEnabled: state.ttsEnabled,
        volume: state.volume,
        pitch: state.pitch,
        rate: state.rate,
        voiceURI: state.voiceURI,
      }),
    }
  )
);
