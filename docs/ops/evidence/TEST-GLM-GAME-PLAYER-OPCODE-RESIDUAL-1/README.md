# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 0375206d17f1e6e7469fa6e561fdcc2fc0ebb4d4a04a3513d0642ef3af017919。

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

- TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `0375206d17f1e6e7469fa6e561fdcc2fc0ebb4d4a04a3513d0642ef3af017919`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据
>
> 分支 `codex/glm-game-player-opcode-residual-r1`，base `053ae5bb4`（origin/main）。
> 范围：`packages/game/src/core/event-opcode-player.ts` 玩家 opcode 残余合同。
>
> ## 交付物
>
> - `packages/game/src/core/event-opcode-player.glm-opcode-residual.test.ts` — 6 条新合同
>   （C1-C6，见 [dedup-ledger.md](dedup-ledger.md)）：0x18 换装撤效果层、0x23 单槽/全卸效果层
>   两臂、0x1c/0x1d applyAll 全队臂、0x29 抗性等值边界。
> - `dedup-ledger.md` — 逐 opcode 排重账（REG/NEW/防御守卫）。
> - `mutation-points.json` / `mutation-runner.mjs` / `mutation-results.json` / `mutation-logs/`
>   （42 份）— 7 针三态反控，7/7 VALID。
> - `directed-vitest.json` — 定向 file×fullName×status 身份集。
>
> ## 质量门（最终树实测）
>
> - 定向：1 文件 6/6；相邻：12 文件 469/469（player 族 4 + equip-effect + equipment-state +
>   magic-script + stats e2~e5 + event-system）；game 全量 3466/3466。
> - typecheck 0 error；`pnpm lint` 全仓 0/0/0（3354 files）；`pnpm check:docs` PASS（含三处
>   after-SHA 外科刷新，见任务卡回执）；`git diff --check` 0。
> - 反控判据：零执行/red-json-unparsable/red-pending>0/red-runtime-error/red-no-business-assertion/
>   restored-not-green/restore-sha-mismatch/green-identity-drift 全部未命中；恢复后源 sha 与原始
>   byte-identical（cleanupRestored=true）。
>
> ## 环境备注
>
> 隔离 worktree 缺 gitignored `data/extracted`（软链主仓）与 `data/raw` MKF（逐文件软链），
> 不改 tracked 文件；此为 worktree 环境处置，非仓库改动。
>
<!-- original-source-quote:end -->
