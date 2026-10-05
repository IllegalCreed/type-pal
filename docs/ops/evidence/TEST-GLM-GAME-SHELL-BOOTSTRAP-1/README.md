# TEST-GLM-GAME-SHELL-BOOTSTRAP-1 证据索引(GLM r1)

- 交付物:`packages/game/src/shell/shell-bootstrap.glm-shell.test.ts`(6 合同,单文件:
  syncShellAudio 战斗臂×3 + precache-client SW 消息路由/persist 容忍×2 + startRafLoop 帧链×1)
- 排重账:[dedup-ledger.md](dedup-ledger.md)(6 新增轴 + 逐文件 existing-proof 饱和账 +
  unreachable 账 + U 账)
- 身份集:[identity.json](identity.json)(fullName×status,6/6 passed,identity sha 见下)
- 反控:[mutation-results.json](mutation-results.json) 6/6 VALID;逐相位 raw 见
  [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`;
  `*.log` 受 .gitignore 规则约束,提交须 `git add -f`)
- runner:[run-counterproof.mjs](run-counterproof.mjs)(可复跑;反控驱动运行期禁止并发编辑)

## 反控口径

每针 = 产品源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:
红相位要求 exit≠0 且 failed-total 恰 1、该 failed 的 fullName 与目标合同**精确相等**、
failureMessages[0] 以 AssertionError 开头(业务断言);恢复后源文件 sha256 与原始逐字节一致
(cleanupRestored),恢复绿 exit 0 且执行集 identity sha 等于原始绿。
vitest 以 `--reporter=json` 从 `packages/game` 目录用 `pnpm exec` 起(避免 `--filter` banner 污染;
fullName 为**空格连接**,非 `' > '` 分隔——本卡 runner 初版即踩此判例,已修)。

| 针 | 源行 | 变异(节选) | 目标合同 |
|---|---|---|---|
| MUT-01 | bootstrap.ts:191 | `victoryTrack = battleVictoryTrack(…)` → `= -1` | SB1 胜利曲覆盖 |
| MUT-02 | bootstrap.ts:192 | `introFade !== undefined` → `false` | SB2 揭场静默 |
| MUT-03 | bootstrap.ts:202 | `if (inBattle) {` → `if (false) {` | SB3 战斗 SFX drain |
| MUT-04 | precache-client.ts:69 | `'precache-progress'` → `'precache-progress-x'` | SB4 消息路由 |
| MUT-05 | precache-client.ts:75-79 | persist 吞错 catch → 重抛 | SB5 失败容忍 |
| MUT-06 | main-loop.ts:177 | 帧尾 `raf = requestAnimationFrame(loop)` 注释(tickFps 行上下文锚) | SB6 帧链自续订 |

(完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)

## U 账(候选产品发现,交 Codex 裁决,未钉测试)

- **U-1** `registerPrecache` 的 `swc.ready` 拒绝既不走 `onUnavailable` 也不 resolve,直接 reject;
  唯一生产 caller `main.ts:49` `void registerPrecache(...)` 未 catch → 悬空 unhandled rejection
  (PROD 进度停虚线前段;可玩门按钮仍兜底不卡死)。修复属产品取舍,本卡不改产品。

## 质量门(见卡回执)

定向 6/6;相邻(shell 全目录 39 文件)258/258;game 全量 309 文件 3512/3512;
typecheck 0 错;根 lint 0/0/0;docs 门与 diff --check 见任务卡回执数值。
worktree 环境注记:根 `data/extracted`、`data/raw/*`、`packages/game/public/extracted`
三处软链补齐后全量才绿(dev-panel.test 直读 `data/extracted/data/enemy-teams.json`)。
