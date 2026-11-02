# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 的交付证据：分支 `codex/glm-game-player-opcode-residual-r1`、base `053ae5bb4`（origin/main）；范围为 event-opcode-player.ts 玩家 opcode 残余合同。

## 证据身份

- 交付物：event-opcode-player.glm-opcode-residual.test.ts（6 条新合同 C1-C6）——0x18 换装撤效果层、0x23 单槽/全卸两臂、0x1c/0x1d applyAll 全队臂、0x29 抗性等值边界；dedup-ledger.md（逐 opcode 排重账 REG/NEW/防御守卫）；mutation-points/runner/results/logs（42 份）7 针三态反控 7/7 VALID；directed-vitest.json 身份集。

## 来源与输入

- 合法输入：applyPlayerOpcode 公开 caller+typed Command；0x17 合法种入效果层后换装对照。

## 断言与业务 oracle

- 判据八类全未命中（零执行/red-json-unparsable/red-pending>0/red-runtime-error/red-no-business-assertion/restored-not-green/restore-sha-mismatch/green-identity-drift）；恢复后源 sha 逐字节一致（cleanupRestored=true）。

## 结果

- 质量门（最终树实测）：定向 1 文件 6/6；相邻 12 文件 469/469；game 全量 3466/3466；typecheck 0；lint 3354 文件 0/0/0；check:docs PASS（三处 after-SHA 外科刷新）；diff --check 0。
- 环境备注：隔离 worktree 缺 gitignored data/extracted 与 data/raw MKF（软链补齐），不改 tracked 文件。

## 限制与复核

- memory 补充：r1 已推 6172c0df4/9b184a01b（6 合同+7 针 VALID）待 Codex 验收；fScriptSuccess 不写须零改重复施放相位等判例在 ledger。

## 历史范围

- TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 r1 交付（6 合同+7 针）；固定源 revision 7d609719e234…。

## 原始结论

- 0x18/0x23×2/0x1c/0x1d/0x29 六残余合同全绿；效果层合同种入用生产路径 0x17。

## 当时证据

- 交付物清单与质量门在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `0375206d17f1e6e7469fa6e561fdcc2fc0ebb4d4a04a3513d0642ef3af017919`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
