# workbuddy-scan 分支说明

本分支是 **WorkBuddy 扫描流水线专用分支**，在 `KKKKhazix/agent-autoloop` 上游基础上只做了一件事：
**把出站（外链）能力收紧到「默认只允许回环地址」**，以满足扫描环境「杜绝外链」的要求。

## 与上游的差异

| 文件 | 改动 |
|---|---|
| `plugins/egress.ts` | **新增**：出站白名单，默认只放行 `127.0.0.1 / localhost / ::1` |
| `plugins/webhook/channel.ts` | 发卡片前调用 `assertAllowed()`，非白名单主机直接抛错 |
| `plugins/delivery/project.ts` | 健康检查 URL 增加主机白名单（该文件会被复制进项目，故内联实现） |
| `cli/update.ts` | 默认禁止联网升级；需显式 `AGENT_AUTOLOOP_ALLOW_UPDATE=1` |

放行其他主机（确有需要时）：

```bash
export AGENT_AUTOLOOP_ALLOW_HOSTS="127.0.0.1,localhost,intranet.example"
```

## 安装（零网络）

```bash
AGENT_AUTOLOOP_REPO=/path/to/this/clone \
  sh install.sh --no-service --command '/bin/echo {prompt}'
```

`install.sh` 的 `REPO` 支持本地路径，因此 `git clone` 发生在本地，不会访问 GitHub。

## 审计

```bash
bash /Users/user/test/scripts/autoloop-egress-audit.sh --strict
```

检查四项：安装来源 / 配置里的外部地址 / 守卫是否在位 / 运行中的非回环连接。

## 维护约定

- **不要**把本分支合回上游：白名单会改变默认行为，不适合所有用户
- 升级上游时，先 `git fetch` 再 rebase 到本分支，**保留上述 4 个文件的改动**
- 本分支不含任何扫描业务代码；扫描逻辑在 `~/test/scripts/`（不在本仓库）
