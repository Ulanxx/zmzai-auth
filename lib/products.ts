/**
 * zmzai.cloud 产品矩阵 — z·m·z·a·i 逐字母体系。
 * 与 zmzai-cloud/lib/projects.ts 同源（本仓只保留落地页展示所需字段）。
 * 五个字母是「牧之 muzhi」拼音的拆解：每个字母挂一条 AI 产品线，
 * 既是产品索引，又是署名。
 */

export type ProductStatus = "live" | "building" | "planned";

export interface ProductLine {
  /** Stable identifier; letters are presentation-only and may repeat. */
  id: string;
  /** 字母标识：z · m · z · a · i，或本体 muzhi */
  letter: string;
  /** 中文产品名（单字，印章用） */
  hanzi: string;
  /** 产品线名 */
  name: string;
  /** 一句话 */
  tagline: string;
  status: ProductStatus;
  href: string;
}

/** muzhi 本体：博客 + 付费知识体系，第一个落地成员。 */
export const rootProduct: ProductLine = {
  id: "muzhi",
  letter: "牧",
  hanzi: "牧之",
  name: "牧之 AI 知识体系",
  tagline: "自托管的知识产品交付与会员运营底座",
  status: "live",
  href: "https://muzhi.zmzai.cloud",
};

/** z·m·z·a·i 五条字母产品线。 */
export const letterProducts: ProductLine[] = [
  {
    id: "sandbox",
    letter: "z",
    hanzi: "场",
    name: "沙箱场",
    tagline: "受限代码执行与 Agent 实验环境",
    status: "building",
    href: "https://z.zmzai.cloud",
  },
  {
    id: "relay",
    letter: "m",
    hanzi: "驿",
    name: "中转驿",
    tagline: "模型与 API 的中转站",
    status: "live",
    href: "https://m.zmzai.cloud",
  },
  {
    id: "hub",
    letter: "z",
    hanzi: "站",
    name: "聚合站",
    tagline: "zmzai.cloud 主站与产品索引",
    status: "live",
    href: "https://zmzai.cloud",
  },
  {
    id: "agent",
    letter: "a",
    hanzi: "使",
    name: "Agent 使",
    tagline: "可审计的 Agent 任务与审批工作台",
    status: "building",
    href: "https://a.zmzai.cloud",
  },
  {
    id: "workos",
    letter: "i",
    hanzi: "作",
    name: "工作台",
    tagline: "AI 时代的个人工作台",
    status: "planned",
    href: "https://i.zmzai.cloud",
  },
];

export const allProducts: ProductLine[] = [rootProduct, ...letterProducts];

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case "live":
      return "LIVE";
    case "building":
      return "BUILDING";
    case "planned":
      return "PLANNED";
  }
}
