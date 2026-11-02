# TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-EVENT-CONTRACTS-1 的交付证据：Owner GLM、分支 `codex/glm-game-event-contracts-r1`（base `a55862e12`）；交付时点状态待 Codex 独立验收（不合 main、不标 done）。

## 证据身份

- 交付物：event-system.glm-event-contracts.test.ts（22 it 全绿）——runPlayerPoisonEntrySync 毒入口 8 合同（全部旧测只注入 stub runner）、applyRawOpcode 长尾 0x5D/0x74/0x79/0x94/0x20 装备臂/0x78+default 6 合同、runScript 防御 5 合同、battle 0x04 call/return 2 合同、autoScript 0x04 多帧 callee 1 合同。
- 配套：dedup-ledger.md（四段范围逐合同排重账，判例 hex 字面量与 OP_* 常量名须双 grep——0x62/0x63/0x4C/0x4B 仅常量名出现在旧测）、directed-vitest.json（22 passed fresh）、mutation-points 8 针+mutation-results 8/8 VALID+mutation-logs 48 份规整全文（落盘字节 hash）+mutation-runner.mjs。

## 来源与输入

- 合法输入：真实 event-system 公开入口（runPlayerPoisonEntrySync/runScript/applyRawOpcode/tickAutoScripts）；毒入口真链（施毒当下同步跑入口+wPoisonScript=advance）。

## 断言与业务 oracle

- 8 针三态（原始绿→指定业务红→恢复绿）+判据拒收零执行/pending/runtime-error/无业务断言/恢复不绿；identitySet 全量、三态 hash、恢复 sha 一致。

## 结果

- 门禁：定向 22/22；相邻 13 文件 485/485；game 全量 299 文件 3439/3439；typecheck 0；lint 0/0/0；check:docs PASS；diff --check 0。

## 限制与复核

- memory 补充：r1 已推 a8e53316c（22 合同/8 针 VALID/毒入口真链 8 条全新）待 Codex 验收；battle dispatch 表内 opcode 不能作 applyRawOpcode 观察点等判例在 ledger。

## 历史范围

- TEST-GLM-GAME-EVENT-CONTRACTS-1 r1 交付（22 合同+8 针三态）；固定源 revision a1ac53bbea78…（direct 规则）。

## 原始结论

- 毒入口 8 合同全新+长尾/防御/battle call/多帧 callee 合同全绿。

## 当时证据

- 交付物清单与门禁在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`，source SHA `e89621cc35d8e71348117841848b9bb584a81e7bc04c425cc47f696c1b1a1a60`；下方 quote 逆回读规则：剥引用后与固定原源逐字节相等（direct，不 trim、不替换）。
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
