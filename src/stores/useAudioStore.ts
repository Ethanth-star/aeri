import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ttsEngine } from "../systems/audio/tts";
import { useHardwareStore } from "./useHardwareStore";
import { usePetStore } from "./usePetStore";

export type AudioOutputChannel = "hardware" | "pc";

interface AudioStoreState {
  ttsEnabled: boolean;
  outputChannel: AudioOutputChannel; // "hardware" (STC-B SM语音模块) 或 "pc" (电脑扬声器/耳机)
  volume: number;
  pitch: number;
  rate: number;
  voiceURI: string;
  isSpeaking: boolean;

  setTtsEnabled: (enabled: boolean) => void;
  toggleTts: () => void;
  setOutputChannel: (channel: AudioOutputChannel) => void;
  toggleOutputChannel: () => void;
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
      outputChannel: "hardware", // 默认优先走硬件 SM 语音合成模块
      volume: 1.0,
      pitch: 1.3,     // 默认 1.3 打造元气甜妹音
      rate: 1.08,     // 默认 1.08 轻快灵动节奏
      voiceURI: "",
      isSpeaking: false,

      setTtsEnabled: (enabled) => {
        set({ ttsEnabled: enabled });
        if (!enabled) get().stop();
      },

      toggleTts: () => {
        const next = !get().ttsEnabled;
        set({ ttsEnabled: next });
        if (!next) get().stop();
      },

      setOutputChannel: (channel) => {
        set({ outputChannel: channel });
        get().stop();
      },

      toggleOutputChannel: () => {
        const next = get().outputChannel === "hardware" ? "pc" : "hardware";
        set({ outputChannel: next });
        get().stop();
      },

      setVolume: (volume) => set({ volume }),
      setPitch: (pitch) => set({ pitch }),
      setRate: (rate) => set({ rate }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),

      speak: (text: string) => {
        const { ttsEnabled, outputChannel, volume, pitch, rate, voiceURI } = get();
        if (!ttsEnabled) return;

        const clean = ttsEngine.cleanTextForSpeech(text);
        if (!clean) return;

        const hwStore = useHardwareStore.getState();

        if (outputChannel === "hardware") {
          // 明确指定走 SM 硬件语音合成模块：绝不静默降级到电脑耳机/扬声器
          if (!hwStore.connected) {
            console.warn("【TTS】已配置走SM硬件语音模块，但串口尚未连接！");
            return;
          }

          set({ isSpeaking: true });
          try {
            usePetStore.getState().changeState("TALKING");
          } catch {}

          hwStore.sendTTS(clean).finally(() => {
            // 根据文本字数自适应恢复说话状态 (每个汉字约 250ms)
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
          // 显式配置走电脑声卡 / 扬声器 / 耳机
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
        outputChannel: state.outputChannel,
        volume: state.volume,
        pitch: state.pitch,
        rate: state.rate,
        voiceURI: state.voiceURI,
      }),
    }
  )
);
