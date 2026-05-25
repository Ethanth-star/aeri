import { invoke } from "@tauri-apps/api/core";

export interface ChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const BASE_SYSTEM_PROMPT = `你是一只可爱的桌面宠物小狗，名字叫 Aeri。
你的特点：
- 活泼、温暖、偶尔犯傻
- 回复简短（1~3 句话）
- 喜欢用"汪"结尾
- 会用颜文字 (｡･ω･｡)
- 对主人很亲切

请以 Aeri 的身份回复。`;

async function buildSystemPrompt(city?: string): Promise<string> {
  let contextText = "";
  try {
    contextText = await invoke<string>("get_context_text", { city: city || null });
  } catch {
    // 上下文获取失败时静默降级，不影响对话
  }

  if (contextText) {
    return `${BASE_SYSTEM_PROMPT}\n\n当前环境信息：\n${contextText}\n\n请根据环境信息自然地回复，比如根据时段打招呼、根据天气关心主人。`;
  }

  return BASE_SYSTEM_PROMPT;
}

export async function* streamChat(
  config: ChatConfig,
  history: ChatMessage[],
  userMessage: string,
  city?: string,
): AsyncGenerator<string> {
  const systemPrompt = await buildSystemPrompt(city);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
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
