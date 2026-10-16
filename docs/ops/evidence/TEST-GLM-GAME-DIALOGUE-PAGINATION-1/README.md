# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1) 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 9b0c8f88e72c17616726e38569cc4202f47d405770ded990a5c0a48a2439d92e。

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

- TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1)：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `9b0c8f88e72c17616726e38569cc4202f47d405770ded990a5c0a48a2439d92e`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1)
>
> - 交付物:`packages/game/src/core/event-dialogue-pagination.glm-contracts.test.ts`(6 合同,单文件)
> - 排重账:[dedup-ledger.md](dedup-ledger.md)(6 新增轴 + 登记未测项 + 空行边界观察)
> - 身份集:[identity.json](identity.json)(file×fullName×status,6/6 passed;对最终格式化版本重出)
> - 反控:[mutation-results.json](mutation-results.json) 6/6 VALID;逐相位 raw 见
>   [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`,
>   共 26 份;`*.log` 受 .gitignore `*.log` 规则约束,须 `git add -f`)
>
> ## 反控口径
>
> 每针 = 源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:红相位要求 exit≠0
> 且目标合同 failed 且失败为业务 AssertionError;恢复后源文件 sha256 与原始一致
> (cleanupRestored),全文件恢复绿。**6 针红相位 failed-total 均恰为 1**(只杀目标合同);
> identitySet 逐相位落盘,hash 记入 mutation-results.json。变异批与全量测试串行。
>
> | 针 | 源行 | 变异(节选) | 目标合同 |
> |---|---|---|---|
> | MUT-01 | event-system.ts:1715 | 等键臂 `: input.pressed.size > 0` → `: has('Confirm')` | C1 翻页等键吞任意键 |
> | MUT-02 | event-system.ts:1884 | `setWaitingEndKey` → `setWaitingPageKey`(end 收尾误走翻页键) | C2 末页边界二分 |
> | MUT-03 | event-system.ts:1714 | 跳字臂 `? has('Confirm')‖has('Menu')` → `? size > 0` | C3 typing 中 Cancel/Up 不跳字 |
> | MUT-04 | event-system.ts:1714 | 跳字臂 → `? has('Confirm')` | C4 Menu 跳字等价 |
> | MUT-05 | event-system.ts:2035 | 删段中空行 `appendDialogLine(gs.dialogBox, '', …)` | C5 空行占页位 |
> | MUT-06 | dialog-box.ts:595 | 删 page-advance 的 `state.userSkip = false` | C6 翻页后新页重新逐字 |
>
> (完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)
>
> ## 质量门(见卡回执)
>
> 定向 6/6;相邻(core 全目录 116 文件)2095/2095;game 全量 301 文件 3460/3460;
> typecheck 0 error;`pnpm lint` 全仓 0/0/0(3324 files);`pnpm check:docs` PASS;
> `git diff --check` 0。
>
<!-- original-source-quote:end -->
