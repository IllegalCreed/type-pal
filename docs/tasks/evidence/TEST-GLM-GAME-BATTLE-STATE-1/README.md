# TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-BATTLE-STATE-1 的 r1 交付证据：GLM 候选（分支 `codex/glm-game-battle-state-r1`，base `5dcb4569b`）battle 状态机残余 10 合同+10/10 三态反控，待 Codex 独立验收。

## 证据身份

- 交付物：battle-state-machine.glm-battle.test.ts（10 it：haste 队列接线、DH3 未学降级、DL7 沉默掷骰、scriptOnReady 回写、E04 防御/施法经验、0 经验结算屏、Phase E 死敌槽脚本、法术槽满、升级快照装备有效值）；dedup-ledger.md 逐合同排重账；identity.json 定向全量执行身份 10/10 passed；mutation-points.json/mutation-runner.mjs 10 针定义与三态 runner；mutation-results.json 10/10 VALID；mutation-logs/ 每针 3 相位规整全文。

## 来源与输入

- 反控直接在分支工作树执行（player-opcode-residual 卡先例）；每针红相位后立即按保存的原始字节恢复目标文件再跑恢复绿；runner 末尾对全部 4 个被触文件做 sha 比对。

## 断言与业务 oracle

- 10/10 VALID：每针 failed-total 恰 1 且命中目标合同、唯一业务 AssertionError、恢复绿 10/10、identitySha 三态一致、4 个目标文件字节级恢复（spawnSync、完整 argv/cwd/env、trimEof 落盘纪律）。

## 结果

- 质量门：定向 10/10；相邻 battle 全目录 36 文件 916/916；typecheck 0 error；lint 全仓 0/0/0；check:docs PASS（三 pin 外科刷新后）；diff --check 0；反控批与全量测试串行执行（判例）。

## 限制与复核

- r1 时点待 Codex 验收；memory 补充：后续 r1 已推 d8707b85f/b74f853e6（10 合同+E04/槽满/装备快照），终态以 Codex 接收为准。

## 历史范围

- TEST-GLM-GAME-BATTLE-STATE-1 r1 交付（10 合同+10 针三态）；固定源 revision 4ce17faa06c6…。

## 原始结论

- haste 队列/DH3 降级/DL7 掷骰/scriptOnReady/E04 经验/0 经验屏/死敌槽/槽满/装备快照 10 合同全绿。

## 当时证据

- 交付物清单与质量门在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `cb2a93927a765e2cf4a00f1b49a7489ba5a82fec4b58acfe439553284fdee76f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1)
>
> GLM r1 候选(分支 `codex/glm-game-battle-state-r1`,base `5dcb4569b`):battle 状态机残余
> 10 合同 + 10/10 三态反控,待 Codex 独立验收。
>
> ## 交付物
>
> - 合同文件:`packages/game/src/core/battle/battle-state-machine.glm-battle.test.ts`(10 it)。
>   覆盖 haste 队列接线、DH3 未学降级、DL7 沉默掷骰、scriptOnReady 回写、E04 防御/施法经验、
>   0 经验结算屏、Phase E 死敌槽脚本、法术槽满、升级快照装备有效值。
> - [dedup-ledger.md](dedup-ledger.md):逐合同排重账(10 新增 + 登记未证项)。
> - [identity.json](identity.json):定向全量执行身份(file×fullName×status,10/10 passed)。
> - [mutation-points.json](mutation-points.json) / [mutation-runner.mjs](mutation-runner.mjs):
>   10 针单点变异定义与三态 runner(spawnSync、完整 argv/cwd/env、trimEof 落盘纪律)。
> - [mutation-results.json](mutation-results.json):10/10 VALID;每针 failed-total 恰 1
>   且命中目标合同、唯一业务 AssertionError、恢复绿 10/10、identitySha 三态一致、
>   4 个目标文件字节级恢复。
> - [mutation-logs/](mutation-logs):每针 3 相位 × stdout/stderr 规整全文(sha256 按落盘字节)。
>
> ## 质量门
>
> 定向 10/10;相邻 battle 全目录 36 文件 916/916;typecheck 0 error;`pnpm lint` 全仓
> 0/0/0;`pnpm check:docs` PASS(三 pin 外科刷新后);`git diff --check` 0。
> 反控批与全量测试串行执行(判例)。
>
> ## 环境备注
>
> 反控直接在分支工作树执行(player-opcode-residual 卡先例),每针红相位后立即按保存的原始
> 字节恢复目标文件,再跑恢复绿相位;runner 末尾对全部 4 个被触文件做 sha 比对。
>
<!-- original-source-quote:end -->
