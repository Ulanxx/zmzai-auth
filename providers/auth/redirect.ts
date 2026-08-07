/**
 * next 白名单：只允许 zmzai.cloud 域（或相对 / 路径），防开放重定向。
 * SSO 跳回子域时统一走此校验。
 */
export function safeNext(next: string | undefined | null): string {
  if (!next) return "/";
  try {
    const url = new URL(next);
    if (url.hostname === "zmzai.cloud" || url.hostname.endsWith(".zmzai.cloud")) {
      return next;
    }
  } catch {
    // 相对路径允许
    if (next.startsWith("/")) return next;
  }
  return "/";
}
