# TEST-GLM-REFORGE-BATTLE-FLOW-1 证据索引（GLM r1）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-REFORGE-BATTLE-FLOW-1 证据索引（GLM r1） 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 59c30452f6a2ed34b35762d07b7d7557250e5525d394e0930686eb9b8a23bf2f。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 9e72e90307af540a28efaed4c235d3aef8672e6a；本轮 R68。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-REFORGE-BATTLE-FLOW-1 证据索引（GLM r1）：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `59c30452f6a2ed34b35762d07b7d7557250e5525d394e0930686eb9b8a23bf2f`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-BATTLE-FLOW-1 证据索引（GLM r1）
>
> - 交付物（仅新增测试与证据，产品零 diff）：
>   - `packages/reforge/src/battle/battle-finalization.world-result.test.ts`（BF-01..BF-07，终局家族）
>   - `packages/reforge/src/battle/battle-host.finalization.test.ts`（BF-08..BF-10，宿主终局流）
>   - `packages/reforge/src/battle/battle-session.flow-residual.test.ts`（BF-11..BF-12，会话残差流）
> - 排重账：[dedup-ledger.md](dedup-ledger.md)（卡面九文件家族对账 + 12 合同源锚/caller/合法输入/
>   oracle/排重结论 + 不设针登记 + **U-1 零活敌 target 输入死区**产品发现 + 本卡判例）。
>   卡面 `battle-finalization.ts` 不存在，终局真源 = `battle-world-result.ts`（对账结论见账）。
> - 身份集：[identity.json](identity.json)（定向 3 文件 12 测试全绿，fullName 逐条）。
> - 反控：[counterproof.json](counterproof.json)（12/12 针 VALID；每针恰 1 指定业务 AssertionError）；
>   可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)；逐相位 raw 见 [mutation-logs/](mutation-logs/)
>   （green-baseline / 每针 red+green / final-replay = 四态）。
> - 门证据：[adjacent.raw](adjacent.raw)（battle 家族 + save-lineage + trial-host 56 文件 510/510）、
>   [reforge-full.raw](reforge-full.raw)（reforge 全量 343 文件 8760/8760）、
>   [typecheck.raw](typecheck.raw)（reforge 0 错）、[lint.raw](lint.raw)（全仓 3365 文件 0/0/0）。
>
> ## 反控口径
>
> 每针 = 产品源码变异（battle-world-result.ts ×7 / battle-host.ts ×3 / battle-core.ts ×2；锚文本
> 在目标文件命中恰 1 次才有效）→ 定向文件 `-t BF-xx` 过滤执行（红相位验收：exit≠0 且
> "1 failed" 且首条失败为业务 AssertionError）→ `git checkout --` 字节还原 → 复跑同过滤全绿。
> 四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay（全部针还原后整套重放），
> 按落盘字节（trimEof 恰一个终止换行）计算 sha256，逐针落 counterproof.json。变异直接落跟踪文件
> 并立即 git 还原（无 mkdtemp/临时目录）；清理证明 = 全仓 `git status --porcelain` 无 M/D 残留。
>
> ## 产品发现（非本卡范围）
>
> U-1 零活敌 target 相位输入死区（battle-command-selection.ts:353）——见 dedup-ledger.md U 账；
> BF-11 以防御直提绕开该路径完成 victory 断言，修复需产品裁决并连带更新 G02 既有断言。
>
<!-- original-source-quote:end -->
