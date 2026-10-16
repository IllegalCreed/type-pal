# TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1) 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 cb2a93927a765e2cf4a00f1b49a7489ba5a82fec4b58acfe439553284fdee76f。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 4ce17faa06c6ce05f4a4868de380e25d4854e575；本轮 R64。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1)：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `cb2a93927a765e2cf4a00f1b49a7489ba5a82fec4b58acfe439553284fdee76f`；下方 quote 可逆回原始 UTF-8 字节。
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
