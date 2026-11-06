// 出站白名单：本项目只允许回环地址出站。
//
// 背景（2026-11-06）：扫描流水线要求「杜绝外链」，而 autoloop 的 webhook 通道和
// delivery 健康检查都能配任意 URL。与其靠"记得别配"，不如在代码里挡一道：
// 任何非白名单主机的请求直接抛错，日志里写明被拦的地址。
//
// 放行方法（确有需要时）：AGENT_AUTOLOOP_ALLOW_HOSTS="127.0.0.1,localhost,intranet.example"
// 只加主机名，不加协议和路径；默认只允许回环。

const DEFAULT_ALLOW = "127.0.0.1,localhost,::1";

export const allowedHosts = (): string[] =>
  (process.env.AGENT_AUTOLOOP_ALLOW_HOSTS ?? DEFAULT_ALLOW)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** 校验出站地址；不合法或不在白名单就抛错（调用方负责记日志）。 */
export function assertAllowed(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`出站地址不合法：${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`出站协议被禁：${url.protocol}（只允许 http/https）`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!allowedHosts().includes(host)) {
    throw new Error(
      `出站被禁：${host} 不在白名单（当前允许：${allowedHosts().join(",")}；如需放行请设 AGENT_AUTOLOOP_ALLOW_HOSTS）`,
    );
  }
  return url;
}
