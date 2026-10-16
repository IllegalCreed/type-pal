# TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把历史 ops evidence 接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知、任务状态和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 证据身份
- `id`：原始证据记录或任务证据目录身份（保留于 quote）。
- `schemaVersion`：若原文提供则保留于 quote。
- `status`：historical receipt；不改写为当前 verified。
- candidate/source SHA：source `e89621cc35d8e71348117841848b9bb584a81e7bc04c425cc47f696c1b1a1a60`；after 见本批 review record。

## 来源与输入
- caller/source refs（file:line）：由原始证据记录保全；本页 source `docs/ops/evidence/TEST-GLM-GAME-EVENT-CONTRACTS-1/README.md`。
- 合法输入与版本：固定历史 source revision、原始数据/命令和记录环境。
- 执行时间和环境：以原始 receipt 为准；本次迁移不重跑。

## 断言与业务 oracle
- 业务 oracle：原始 receipt 的 caller、输入、断言和结果关系可追溯。
- 原子断言：quote 中每条机器/人工断言保持原样。
- 排重对象：对应 task card、同批 evidence 和 successor receipt。

## 结果
- 逐步结果、退出码、产物：保留原始记录；不把历史回执升格为当前通过。
- 失败：原始失败、rework、未执行和 unknown 信号继续保留。

## 限制与复核
- 未执行/未覆盖：本次不执行 runtime、E2E、视觉或 coverage。
- 不得外推的结论：不得外推当前产品完成、当前 runtime、E2E、视觉或 coverage。
- 复核条件：当前 consumer、source/oracle、task card 和独立验收重新齐全后才可重开。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`；本轮为 2026-10-17 R39。
- 归档原因：历史 ops evidence 只作为时点回执保留，避免把旧执行记录当作当前事实。

## 原始结论
- `Owner: GLM · Branch: `codex/glm-game-event-contracts-r1`（base `a55862e12`）`；原文完整语义保留于下方 quote。

## 当时证据
- 原始标题、章节、任务状态、命令、产物、SHA 和链接保留于 quote。

## 当前有效性
historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 consumer 和 fresh receipt 仍待重新核对。

## 继任文档
- 当前 canonical 文档：对应 task card、当前 evidence consumer 和重新生成的 receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；不删除原始历史证据。
- 若重新启用的复核条件：以合法输入重跑，核对业务 oracle、artifact SHA 和独立 review。

## 原文保全
固定源 revision `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`，source SHA `e89621cc35d8e71348117841848b9bb584a81e7bc04c425cc47f696c1b1a1a60`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据
>
> Owner: GLM · Branch: `codex/glm-game-event-contracts-r1`（base `a55862e12`）
> 状态: 待 Codex 独立验收（不合 main、不标 done）。
>
> ## 交付物
>
> - 新测试 `packages/game/src/core/event-system.glm-event-contracts.test.ts`（22 it,全绿）:
>   runPlayerPoisonEntrySync 毒入口 8 合同(全部旧测只注入 stub runner)、applyRawOpcode 长尾
>   0x5D/0x74/0x79/0x94/0x20 装备臂/0x78+default 6 合同、runScript 防御 5 合同、battle 0x04
>   call/return 2 合同、autoScript 0x04 多帧 callee 1 合同。
> - [dedup-ledger.md](dedup-ledger.md):四段范围逐合同排重账(NEW/REG + 旧证锚点;
>   判例:hex 字面量与 OP_* 常量名须双 grep,0x62/0x63/0x4C/0x4B 仅常量名出现在旧测)。
> - [directed-vitest.json](directed-vitest.json):fresh file×fullName×status(22 passed)。
> - 反控三态:[mutation-points.json](mutation-points.json) 8 针 + [mutation-results.json](mutation-results.json)
>   (8/8 VALID;原始绿→指定业务红→恢复绿、identitySet 全量、三态 hash、恢复 sha 一致、
>   判据拒收零执行/pending/runtime-error/无业务断言/恢复不绿)+ `mutation-logs/` 目录下
>   48 份规整后全文日志(落盘字节 hash)。runner:[mutation-runner.mjs](mutation-runner.mjs)。
>
> ## 门禁
>
> 定向 22/22;相邻 13 文件 485/485;game 全量 299 文件 3439/3439;typecheck 0 error;
> `pnpm lint` 全仓 0/0/0;`pnpm check:docs` PASS;`git diff --check` 0。
<!-- original-source-quote:end -->
