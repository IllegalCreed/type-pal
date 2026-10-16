# TEST-GLM-GAME-SHELL-BOOTSTRAP-1 证据索引(GLM r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-SHELL-BOOTSTRAP-1 证据索引(GLM r1) 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 42c71675d1c9736fe1bcac5be6b5fe7de935883e35c1d984df318950e573d18d。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 7d609719e2347f6367712a54f2f81ccf3830b657；本轮 R65。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-GAME-SHELL-BOOTSTRAP-1 证据索引(GLM r1)：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `42c71675d1c9736fe1bcac5be6b5fe7de935883e35c1d984df318950e573d18d`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-SHELL-BOOTSTRAP-1 证据索引(GLM r1)
>
> - 交付物:`packages/game/src/shell/shell-bootstrap.glm-shell.test.ts`(6 合同,单文件:
>   syncShellAudio 战斗臂×3 + precache-client SW 消息路由/persist 容忍×2 + startRafLoop 帧链×1)
> - 排重账:[dedup-ledger.md](dedup-ledger.md)(6 新增轴 + 逐文件 existing-proof 饱和账 +
>   unreachable 账 + U 账)
> - 身份集:[identity.json](identity.json)(fullName×status,6/6 passed,identity sha 见下)
> - 反控:[mutation-results.json](mutation-results.json) 6/6 VALID;逐相位 raw 见
>   [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`;
>   `*.log` 受 .gitignore 规则约束,提交须 `git add -f`)
> - runner:[run-counterproof.mjs](run-counterproof.mjs)(可复跑;反控驱动运行期禁止并发编辑)
>
> ## 反控口径
>
> 每针 = 产品源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:
> 红相位要求 exit≠0 且 failed-total 恰 1、该 failed 的 fullName 与目标合同**精确相等**、
> failureMessages[0] 以 AssertionError 开头(业务断言);恢复后源文件 sha256 与原始逐字节一致
> (cleanupRestored),恢复绿 exit 0 且执行集 identity sha 等于原始绿。
> vitest 以 `--reporter=json` 从 `packages/game` 目录用 `pnpm exec` 起(避免 `--filter` banner 污染;
> fullName 为**空格连接**,非 `' > '` 分隔——本卡 runner 初版即踩此判例,已修)。
>
> | 针 | 源行 | 变异(节选) | 目标合同 |
> |---|---|---|---|
> | MUT-01 | bootstrap.ts:191 | `victoryTrack = battleVictoryTrack(…)` → `= -1` | SB1 胜利曲覆盖 |
> | MUT-02 | bootstrap.ts:192 | `introFade !== undefined` → `false` | SB2 揭场静默 |
> | MUT-03 | bootstrap.ts:202 | `if (inBattle) {` → `if (false) {` | SB3 战斗 SFX drain |
> | MUT-04 | precache-client.ts:69 | `'precache-progress'` → `'precache-progress-x'` | SB4 消息路由 |
> | MUT-05 | precache-client.ts:75-79 | persist 吞错 catch → 重抛 | SB5 失败容忍 |
> | MUT-06 | main-loop.ts:177 | 帧尾 `raf = requestAnimationFrame(loop)` 注释(tickFps 行上下文锚) | SB6 帧链自续订 |
>
> (完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)
>
> ## U 账(候选产品发现,交 Codex 裁决,未钉测试)
>
> - **U-1** `registerPrecache` 的 `swc.ready` 拒绝既不走 `onUnavailable` 也不 resolve,直接 reject;
>   唯一生产 caller `main.ts:49` `void registerPrecache(...)` 未 catch → 悬空 unhandled rejection
>   (PROD 进度停虚线前段;可玩门按钮仍兜底不卡死)。修复属产品取舍,本卡不改产品。
>
> ## 质量门(见卡回执)
>
> 定向 6/6;相邻(shell 全目录 39 文件)258/258;game 全量 309 文件 3512/3512;
> typecheck 0 错;根 lint 0/0/0;docs 门与 diff --check 见任务卡回执数值。
> worktree 环境注记:根 `data/extracted`、`data/raw/*`、`packages/game/public/extracted`
> 三处软链补齐后全量才绿(dev-panel.test 直读 `data/extracted/data/enemy-teams.json`)。
>
<!-- original-source-quote:end -->
