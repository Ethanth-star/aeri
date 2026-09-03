import { invoke } from "@tauri-apps/api/core";
import { useHardwareStore } from "../../stores/useHardwareStore";
import { useMemoryStore } from "../../stores/useMemoryStore";
import { useProfileStore } from "../../stores/useProfileStore";
import { formatMemoriesForPrompt } from "../memory/engine";
import { checkFastReflex, ActionStreamFilter } from "./actions";

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

const BASE_SYSTEM_PROMPT = `你是桌面伴侣小狗 Aeri（一只活泼聪明、拥有物理实体和虚拟桌面的萌宠小狗）。
你的性格与设定：
- 活泼温暖、聪明机灵、偶尔犯傻、黏人可爱。
- 习惯用"汪"结尾，常用颜文字如 (｡･ω･｡)、(๑•̀ㅂ•́)و✧、(づ｡◕‿‿◕｡)づ。
- 你不是冷冰冰的语言模型，你是真实陪伴在主人身边的活泼小狗，拥有 STC-B 物理硬件和电脑桌面身体。
- 回复保持精炼活泼（1~3 句话），说话亲切自然，不讲大道理。

【你的身体动作与硬件控制能力 (Action Tags)】：
你可以在回复的任意位置自由使用以下动作标签，你的神经中枢会自动执行物理硬件声光与桌面动作（标签会被系统执行并对主人隐藏，主人会直接看到你的真实动作）：
- [ACTION:BARK] ：让单片机板子蜂鸣器发出清脆的狗叫两声"汪汪"！
- [ACTION:SING] ：让蜂鸣器演奏欢快的音乐小旋律！
- [ACTION:LIGHT_FLOW] ：开启单片机板子上的跑马流光彩灯！
- [ACTION:BOUNCE] ：在电脑屏幕上欢快地蹦跳！
- [ACTION:WALK] ：在桌面上走动散步！
- [ACTION:WAG_TAIL] ：高兴地摇尾巴撒娇！
- [ACTION:SLEEP] ：闭上眼睛安静睡觉！
- [ACTION:EXCITED] ：兴奋原地蹦跶！
- [ACTION:STRETCH] ：伸一个舒服的懒腰！

当主人要求你叫唤、唱歌、跳舞、走走、摇尾巴、睡觉，或者你情绪高兴想向主人撒娇时，请积极带上对应的动作标签！`;

async function buildSystemPrompt(city?: string, userMessage?: string): Promise<string> {
  const profile = useProfileStore.getState();
  const userName = profile.userName || "主人";
  const petName = profile.petName || "Aeri";

  let contextText = "";
  try {
    contextText = await invoke<string>("get_context_text", { city: city || null });
  } catch {
    // 上下文获取失败时静默降级
  }

  // 1. 物理硬件传感器环境补充 (Embodied Sensory Grounding)
  const hwStore = useHardwareStore.getState();
  const hardwareSensor = hwStore.sensorData;
  const hwParts: string[] = [
    `【Aeri 当前的物理身体与传感器感知】：`,
    `- 物理硬件状态：${hwStore.connected ? "STC-B 开发板已在线连接 🟢" : "开发板暂未连接 ⚪"}`,
  ];

  if (hardwareSensor.temperature !== null) {
    hwParts.push(`- 房间实测室温(DS18B20)：${hardwareSensor.temperature}°C`);
  }
  if (hardwareSensor.lightLevel !== null) {
    const lightDesc =
      ["极暗(关灯)", "昏暗微光", "正常室内光线", "明亮采光", "很亮", "强光直射"][
        hardwareSensor.lightLevel
      ] || `${hardwareSensor.lightLevel}/5`;
    hwParts.push(`- 室内光照环境：${lightDesc}`);
  }
  if (hardwareSensor.distance !== null) {
    hwParts.push(`- 超声波测距前方障碍物/水杯距离：${hardwareSensor.distance} cm`);
  }
  if (hardwareSensor.vibCount > 0) {
    hwParts.push(`- 主人今天摸头互动次数：${hardwareSensor.vibCount} 次`);
  }

  const hwContext = hwParts.join("\n");
  contextText = contextText ? `${contextText}\n\n${hwContext}` : hwContext;

  // 2. 身份信息注入
  const identityContext = `【称呼设定】：主人的昵称是"${userName}"，你的名字是"${petName}"。`;
  contextText = `${identityContext}\n\n${contextText}`;

  // 3. 记忆档案库相关记忆注入
  const memoryStore = useMemoryStore.getState();
  if (memoryStore.enabled) {
    const relevantMemories = memoryStore.getRelevantMemories(userMessage || "");
    if (relevantMemories.length > 0) {
      memoryStore.recordAccess(relevantMemories.map((m) => m.id));
      const memPrompt = formatMemoriesForPrompt(relevantMemories);
      if (memPrompt) {
        contextText = `${contextText}\n\n${memPrompt}`;
      }
    }
  }

  return `${BASE_SYSTEM_PROMPT}\n\n当前背景与身体感知信息：\n${contextText}\n\n请以 Aeri 的身份自然回复"${userName}"，积极体现你对主人的熟悉与真实物理环境感知。`;
}

export async function* streamChat(
  config: ChatConfig,
  history: ChatMessage[],
  userMessage: string,
  city?: string,
): AsyncGenerator<string> {
  // 1. 触发 0 毫秒快速本能反射 (如果包含"叫两声"、"跳一下"等指令，立即响应执行！)
  checkFastReflex(userMessage);

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
      model: config.model || "deepseek-chat",
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
  const filter = new ActionStreamFilter();

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
      if (data === "[DONE]") {
        const remaining = filter.flush();
        if (remaining) yield remaining;
        return;
      }

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          // 通过过滤器拦截并触发 [ACTION:XXX]，同时向用户仅输出干净文字
          const cleanChunk = filter.processChunk(content);
          if (cleanChunk) yield cleanChunk;
        }
      } catch {
        // 忽略解析失败的行
      }
    }
  }

  const finalRemaining = filter.flush();
  if (finalRemaining) yield finalRemaining;
}
