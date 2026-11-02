# TEST-GLM-REFORGE-BATTLE-FLOW-1 证据索引（GLM r1）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-REFORGE-BATTLE-FLOW-1 的证据索引（GLM r1）：交付物仅新增测试与证据（产品零 diff）——battle-finalization.world-result.test.ts（BF-01..07）、battle-host.finalization.test.ts（BF-08..10）、battle-session.flow-residual.test.ts（BF-11..12）。卡面 battle-finalization.ts 不存在，终局真源=battle-world-result.ts。

## 证据身份

- 配套：dedup-ledger.md（卡面九文件家族对账+12 合同+不设针登记+U-1 零活敌 target 输入死区产品发现+判例）；identity.json（定向 3 文件 12 测试全绿）；counterproof.json（12/12 针 VALID）+run-counterproof.mjs+mutation-logs（四态）；门证据 adjacent.raw（56 文件 510/510）、reforge-full.raw（343 文件 8760/8760）、typecheck.raw、lint.raw（3365 文件 0/0/0）。

## 来源与输入

- 反控口径：每针=产品源码变异（battle-world-result×7/battle-host×3/battle-core×2；锚文本恰 1 次）→定向 -t BF-xx 过滤→字节还原→复跑全绿；四态 hash 按落盘字节（trimEof）；变异直接落跟踪文件立即还原，清理证明=porcelain 无 M/D。

## 断言与业务 oracle

- 12 合同：BF-01 胜利结算经验门（money+7 恰入账/onExpReward 恰 1/首屏 exp-cash 精确值/party.exp+15/HP=writeBack+半恢复）；BF-02 零经验胜利（回调 0 次/空屏/money 照 +7）；BF-03 升级链结算；BF-04..07（quote 表内）；BF-08..10 宿主终局流（defeat/playerFled 终局分配三端口取舍、胜利曲经验门、boss 旗）；BF-11 毒杀计奖；BF-12 逃失败续战。

## 结果

- U-1 产品发现（非本卡范围）：零活敌 target 相位输入死区（battle-command-selection.ts:353）——BF-11 以防御直提绕开该路径完成 victory 断言，修复需产品裁决并连带更新 G02 既有断言。

## 限制与复核

- memory 补充：r1 已推 16cefbe62（12 合同/12 针四态、U-1 发现）待 Codex 验收。

## 历史范围

- TEST-GLM-REFORGE-BATTLE-FLOW-1 r1 证据索引（12 合同+12 针）；固定源 revision 9e72e90307af…。

## 原始结论

- battle-world-result 全仓零直接测试主缺口闭合；U-1 死区发现。

## 当时证据

- 十二合同表与反控口径在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `59c30452f6a2ed34b35762d07b7d7557250e5525d394e0930686eb9b8a23bf2f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
