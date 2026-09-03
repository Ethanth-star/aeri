/**
 * Aeri 记忆系统 - 类型定义
 */

export type MemoryCategory =
  | "profile"      // 个人画像/称呼 (如: "主人叫 Ethan", "是一名工科学生")
  | "preference"   // 喜好与厌恶 (如: "喜欢喝无糖冰美式", "喜欢小狗", "讨厌下雨")
  | "habit"        // 作息与生活习惯 (如: "经常晚上熬夜写代码", "起床后习惯先喝水")
  | "fact"         // 重要事实与日程 (如: "正在做工训单片机实验", "下周有考试")
  | "interaction"; // 与 Aeri 的特别互动经历 (如: "今天连续按时喝水5次被夸奖")

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number;         // 重要度: 1 (低) ~ 5 (核心)
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;     // 最近被检索命中的时间
  accessCount: number;        // 被回忆命中的次数
  source: "auto" | "manual";  // 自动萃取 vs 手工添加
}

export interface MemoryConfig {
  enabled: boolean;           // 记忆系统总开关
  autoExtract: boolean;       // 是否允许对话结束后后台自主萃取新记忆
  maxInjectCount: number;     // 每次对话最多注入的记忆条数 (默认 4)
}

export const CATEGORY_LABELS: Record<MemoryCategory, { name: string; emoji: string; color: string; bgColor: string }> = {
  profile: { name: "称呼画像", emoji: "👤", color: "#2980b9", bgColor: "#ebf5fb" },
  preference: { name: "偏好喜好", emoji: "💖", color: "#e74c3c", bgColor: "#fdedec" },
  habit: { name: "生活作息", emoji: "⏰", color: "#d35400", bgColor: "#fbeee6" },
  fact: { name: "重要事实", emoji: "📌", color: "#8e44ad", bgColor: "#f4ecf7" },
  interaction: { name: "共同回忆", emoji: "🐾", color: "#27ae60", bgColor: "#eafaf1" },
};
