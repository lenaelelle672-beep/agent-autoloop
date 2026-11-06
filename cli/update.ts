// `agent-autoloop update`: what came from the public repository follows its releases, which have passed every check, not main,
// which may not have yet. A copy from anywhere else follows that place. install.sh decides the same way, or an update would
// fail on a copy it had moved.
import { spawnSync } from "node:child_process";

const PUBLISHED = "https://github.com/KKKKhazix/agent-autoloop.git";
const RELEASE = /refs\/tags\/(v(\d+)\.(\d+)\.(\d+))$/;

function git(root: string, ...args: string[]) {
  const done = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (done.status !== 0) throw new Error(`git ${args[0]} 没成功：${done.stderr?.trim() || done.error?.message}`);
  return done.stdout.trim();
}

function latestRelease(root: string) {
  const origin = spawnSync("git", ["-C", root, "config", "--get", "remote.origin.url"], { encoding: "utf8" });
  if (origin.stdout?.trim() !== PUBLISHED) return null;
  const releases = git(root, "ls-remote", "--refs", "--tags", "origin", "v*")
    .split("\n")
    .flatMap((line) => {
      const found = RELEASE.exec(line);
      return found ? [{ tag: found[1], version: found.slice(2).map(Number) }] : [];
    });
  const newer = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return releases.sort((a, b) => newer(a.version, b.version)).at(-1)?.tag ?? null;
}

/** Brings this copy up to date. `to` is the release it's now at, if it follows releases. */
export function updateCode(root: string) {
  // 2026-11-06 出站管控：默认禁止联网升级。扫描环境要求「杜绝外链」，
  // 需要升级时显式设 AGENT_AUTOLOOP_ALLOW_UPDATE=1，或手动在本地克隆里 git pull。
  if (process.env.AGENT_AUTOLOOP_ALLOW_UPDATE !== "1") {
    throw new Error(
      "升级已禁用（AGENT_AUTOLOOP_ALLOW_UPDATE≠1）：本项目禁止外链。请在本地克隆里 git pull 后重新安装，或显式放行升级。",
    );
  }
  const before = git(root, "rev-parse", "HEAD");
  const to = latestRelease(root);
  if (to) {
    git(root, "fetch", "--quiet", "--depth", "1", "origin", `refs/tags/${to}:refs/tags/${to}`);
    git(root, "checkout", "--quiet", "--detach", to);
  } else git(root, "pull", "--quiet", "--ff-only");
  return { changed: git(root, "rev-parse", "HEAD") !== before, to };
}
