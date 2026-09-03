import type { MemoryCategory, MemoryItem } from "./types";
import { CATEGORY_LABELS } from "./types";

/**
 * 分词辅助函数 (支持中英文关键词切分与二元 N-Gram)
 */
function tokenize(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ");
  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);

  // 为中文短串补充 2-gram 切片以增强短语匹配
  const ngrams: string[] = [];
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  for (let i = 0; i < chineseChars.length - 1; i++) {
    ngrams.push(chineseChars[i] + chineseChars[i + 1]);
  }

  return Array.from(new Set([...tokens, ...ngrams]));
}

/**
 * 记忆混合相关性检索与排序
 * 综合评估：关键词匹配重叠度 + 重要度权重 (Importance) + 访问新鲜度
 */
export function retrieveRelevantMemories(
  query: string,
  memories: MemoryItem[],
  limit = 4,
): MemoryItem[] {
  if (memories.length === 0) return [];
  if (!query.trim()) {
    // 若无输入查询，优先返回最高重要度的基础画像与偏好
    return [...memories]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  const queryTokens = tokenize(query);

  const scored = memories.map((mem) => {
    const memTokens = tokenize(mem.content);
    let matchScore = 0;

    for (const qt of queryTokens) {
      if (mem.content.includes(qt)) {
        matchScore += qt.length >= 2 ? 3 : 1;
      }
      for (const mt of memTokens) {
        if (qt === mt) matchScore += 4;
        else if (qt.includes(mt) || mt.includes(qt)) matchScore += 2;
      }
    }

    // 基础权重加成：
    // profile (姓名身份) 赋予高优先级常驻加成
    const categoryBonus = mem.category === "profile" ? 2 : 0;
    // 重要度加成 (1~5)
    const importanceBonus = mem.importance * 0.8;
    // 新鲜度加成 (最近 24 小时被访问过的优先)
    const hoursSinceAccess = (Date.now() - mem.lastAccessedAt) / (1000 * 3600);
    const recencyBonus = hoursSinceAccess < 24 ? 1.5 : 0;

    const totalScore = matchScore + categoryBonus + importanceBonus + recencyBonus;

    return { mem, totalScore, matchScore };
  });

  // 过滤出有匹配度或基础核心记忆，并降序排列
  return scored
    .filter((item) => item.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map((item) => item.mem);
}

/**
 * 将检索出的记忆转化为注入 LLM 的系统上下文提示词
 */
export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (!memories || memories.length === 0) return "";

  const lines = memories.map((m) => {
    const label = CATEGORY_LABELS[m.category]?.name || "记忆";
    return `- [${label}] ${m.content}`;
  });

  return `【Aeri 对主人的记忆档案（请在对话中自然融入，体现你对主人的熟悉与关心）】：\n${lines.join("\n")}`;
}

/**
 * 异步从一轮对话中萃取关于主人的新记忆 (后台调用轻量 LLM 总结)
 */
export async function extractMemoriesFromConversation(
  userMsg: string,
  aiReply: string,
  config: { baseUrl: string; apiKey: string; model: string },
): Promise<Array<{ category: MemoryCategory; content: string; importance: number }>> {
  // 简短寒暄或者指令直接跳过，节约 token
  if (userMsg.trim().length < 3) return [];
  const quickBypass = ["你好", "在吗", "早", "晚安", "再见", "hi", "hello"];
  if (quickBypass.includes(userMsg.trim().toLowerCase())) return [];

  const extractionPrompt = `你是一个智能桌面宠物的记忆归纳器。请分析主人与小狗 Aeri 的这轮对话，判断主人是否透露了关于自己的【个人画像、称呼、喜好厌恶、生活习惯、或当前重要事实】。

对话内容：
主人说："${userMsg}"
Aeri回复："${aiReply}"

提取要求：
1. 必须是关于【主人】自身的事实、偏好、习惯或状态，不要提取 Aeri 自己的话；
2. 如果对话只是普通问答、纯代码技术讨论或无意义闲聊，输出空数组 []；
3. 输出格式必须为严格的 JSON 数组，每条包含：
   - category: 只能是 "profile" | "preference" | "habit" | "fact" | "interaction" 之一
   - content: 简短精炼的一句话陈述（如："主人喜欢喝不加糖的拿铁咖啡"、"主人名字叫小明"、"主人明天有工训单片机考试"）
   - importance: 整数 1~5（名字/生日等核心事实为5，普通喜好为3，临时小事为2）
4. 只输出 JSON 格式本身，不要添加任何 markdown 代码块标记，不要添加其他文字。`;

  try {
    const baseUrl = (config.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
    const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "deepseek-chat",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    let text: string = data.choices?.[0]?.message?.content || "[]";
    text = text.trim();
    if (text.startsWith("```json")) text = text.slice(7);
    if (text.startsWith("```")) text = text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item.content &&
          typeof item.content === "string" &&
          item.category &&
          ["profile", "preference", "habit", "fact", "interaction"].includes(item.category),
      );
    }
    return [];
  } catch (err) {
    console.warn("记忆异步萃取异常:", err);
    return [];
  }
}
