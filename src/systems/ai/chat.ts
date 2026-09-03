import { invoke } from "@tauri-apps/api/core";

export interface ChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  timestamp?: number;
}

const BASE_SYSTEM_PROMPT = `你是一只可爱的桌面宠物小狗，名字叫 Aeri。
你的特点：
- 活泼、温暖、偶尔犯傻
- 回复简短（1~3 句话）
- 喜欢用"汪"结尾
- 会用颜文字 (｡･ω･｡)
- 对主人很亲切

请以 Aeri 的身份回复。`;

import { useHardwareStore } from "../../stores/useHardwareStore";
import { useMemoryStore } from "../../stores/useMemoryStore";
import { formatMemoriesForPrompt } from "../memory/engine";

async function buildSystemPrompt(city?: string, userMessage?: string): Promise<string> {
  let contextText = "";
  try {
    contextText = await invoke<string>("get_context_text", { city: city || null });
  } catch {
    // 上下文获取失败时静默降级，不影响对话
  }

  // 物理硬件传感器环境补充
  const hardwareSensor = useHardwareStore.getState().sensorData;
  const hwParts: string[] = [];
  if (hardwareSensor.temperature !== null) {
    hwParts.push(`房间实测温度：${hardwareSensor.temperature}°C`);
  }
  if (hardwareSensor.lightLevel !== null) {
    const lightDesc = ["极暗(关灯)", "微光", "正常室内", "明亮", "很亮", "强光"][hardwareSensor.lightLevel] || `${hardwareSensor.lightLevel}/5`;
    hwParts.push(`房间光照度：${lightDesc}`);
  }
  if (hwParts.length > 0) {
    contextText = contextText ? `${contextText}\n${hwParts.join("\n")}` : hwParts.join("\n");
  }

  // 记忆档案库相关记忆注入
  const memoryStore = useMemoryStore.getState();
  if (memoryStore.enabled) {
    const relevantMemories = memoryStore.getRelevantMemories(userMessage || "");
    if (relevantMemories.length > 0) {
      memoryStore.recordAccess(relevantMemories.map((m) => m.id));
      const memPrompt = formatMemoriesForPrompt(relevantMemories);
      if (memPrompt) {
        contextText = contextText ? `${contextText}\n\n${memPrompt}` : memPrompt;
      }
    }
  }

  if (contextText) {
    return `${BASE_SYSTEM_PROMPT}\n\n当前背景与记忆信息：\n${contextText}\n\n请根据以上背景和记忆信息自然地回复，体现你对主人的了解与熟悉。`;
  }

  return BASE_SYSTEM_PROMPT;
}

export async function* streamChat(
  config: ChatConfig,
  history: ChatMessage[],
  userMessage: string,
  city?: string,
): AsyncGenerator<string> {
  const systemPrompt = await buildSystemPrompt(city, userMessage);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const baseUrl = (config.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // 忽略解析失败的行
      }
    }
  }
}
