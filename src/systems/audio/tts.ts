import { usePetStore } from "../../stores/usePetStore";

export interface TTSOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
  voiceURI?: string;
}

class TTSEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.isInitialized = this.voices.length > 0;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isInitialized && this.synth) {
      this.initVoices();
    }
    return this.voices;
  }

  /**
   * 自动挑选最匹配的“甜妹音”音色
   * 优先匹配微软自然语音 Xiaoyi(小艺)、Xiaoxiao(晓晓)、女性中文音色
   */
  public getSweetGirlVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (voices.length === 0) return null;

    // 1. 优先匹配小艺 (最经典的甜美、清澈治愈系甜妹音)
    const xiaoyi = voices.find(
      (v) =>
        v.name.toLowerCase().includes("xiaoyi") ||
        v.name.toLowerCase().includes("小艺")
    );
    if (xiaoyi) return xiaoyi;

    // 2. 其次匹配晓晓 (活泼灵动少女音)
    const xiaoxiao = voices.find(
      (v) =>
        v.name.toLowerCase().includes("xiaoxiao") ||
        v.name.toLowerCase().includes("晓晓")
    );
    if (xiaoxiao) return xiaoxiao;

    // 3. 匹配微软在线自然中文女声
    const naturalChineseFemale = voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        (v.name.includes("Natural") || v.name.includes("Online")) &&
        (v.name.includes("Female") || v.name.includes("女") || v.name.includes("Yaoting") || v.name.includes("HsiaoChen"))
    );
    if (naturalChineseFemale) return naturalChineseFemale;

    // 4. 匹配任意中文女声或普通中文声音
    const anyChineseFemale = voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        (v.name.includes("Huihui") || v.name.includes("Female") || v.name.includes("女"))
    );
    if (anyChineseFemale) return anyChineseFemale;

    const anyChinese = voices.find((v) => v.lang.startsWith("zh"));
    if (anyChinese) return anyChinese;

    return voices[0] || null;
  }

  /**
   * 清洗待发音文本，剔除动作标签、Markdown及多余杂乱字符
   */
  public cleanTextForSpeech(raw: string): string {
    return raw
      .replace(/\[ACTION:[A-Z_]+\]/g, "") // 剔除 [ACTION:BARK] 等动作标签
      .replace(/```[\s\S]*?```/g, "")     // 剔除代码块
      .replace(/`([^`]+)`/g, "$1")         // 剔除行内代码符号
      .replace(/https?:\/\/\S+/g, "")     // 剔除网址
      .replace(/[#*_~>\-]/g, "")           // 剔除 Markdown 标记
      .replace(/\s+/g, " ")                // 合并多余空白
      .trim();
  }

  /**
   * 朗读语音 (默认应用甜妹音参数配置)
   */
  public speak(
    text: string,
    options: TTSOptions = {},
    onEnd?: () => void
  ) {
    if (!this.synth) return;

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    // 停止之前的朗读
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);

    // 绑定音色
    const voice = options.voiceURI
      ? this.getVoices().find((v) => v.voiceURI === options.voiceURI)
      : this.getSweetGirlVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "zh-CN";
    } else {
      utterance.lang = "zh-CN";
    }

    // 甜妹音核心参数：音高 Pitch 调高 (1.28~1.32)，语速轻快 (1.08)
    utterance.pitch = options.pitch ?? 1.3;
    utterance.rate = options.rate ?? 1.08;
    utterance.volume = options.volume ?? 1.0;

    // 状态联动：说话时小狗进入说话状态，说完复原
    utterance.onstart = () => {
      try {
        usePetStore.getState().changeState("TALKING");
      } catch {}
    };

    const handleFinish = () => {
      try {
        if (usePetStore.getState().currentState === "TALKING") {
          usePetStore.getState().changeState("IDLE");
        }
      } catch {}
      if (onEnd) onEnd();
    };

    utterance.onend = handleFinish;
    utterance.onerror = (e) => {
      console.warn("TTS Error:", e);
      handleFinish();
    };

    this.synth.speak(utterance);
  }

  /**
   * 停止当前朗读
   */
  public stop() {
    if (this.synth) {
      this.synth.cancel();
      try {
        if (usePetStore.getState().currentState === "TALKING") {
          usePetStore.getState().changeState("IDLE");
        }
      } catch {}
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const ttsEngine = new TTSEngine();
