# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-DIALOGUE-PAGINATION-1 的证据索引（GLM r1）：交付物为单文件 6 合同 event-dialogue-pagination.glm-contracts.test.ts + dedup-ledger + identity + 反控 6/6 VALID。

## 证据身份

- 交付物：6 合同（单文件）+dedup-ledger.md（6 新增轴+登记未测项+空行边界观察）+identity.json（6/6 passed，对最终格式化版本重出）+mutation-results.json 6/6 VALID+mutation-logs/ 26 份规整原文（git add -f 判例）。

## 来源与输入

- 反控口径：每针=源码单点变异（find 恰命中 1 次才有效）→定向文件全量跑；红相位要求 exit≠0 且目标合同 failed 且失败为业务 AssertionError；恢复后源文件 sha256 与原始一致（cleanupRestored）；变异批与全量测试串行。

## 断言与业务 oracle

- 六针（源行/变异/目标合同）：MUT-01 event-system.ts:1715 等键臂 pressed.size>0→has(Confirm)（C1 翻页等键吞任意键）；MUT-02 :1884 setWaitingEndKey→setWaitingPageKey（C2 末页边界二分）；MUT-03 :1714 跳字臂→size>0（C3 typing 中 Cancel/Up 不跳字）；MUT-04 :1714 跳字臂→has(Confirm)（C4 Menu 跳字等价）；MUT-05 :2035 删段中空行 append（C5 空行占页位）；MUT-06 dialog-box.ts:595 删 page-advance 的 userSkip=false（C6 翻页后新页重新逐字）。6 针红相位 failed-total 均恰 1。

## 结果

- 质量门：定向 6/6；相邻 core 全目录 116 文件 2095/2095；game 全量 301 文件 3460/3460；typecheck 0；lint 3324 文件 0/0/0；check:docs PASS；diff --check 0。

## 限制与复核

- memory 补充：r1 已推 3feddccf7（6 合同/6 针 VALID）待 Codex 验收；完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json。

## 历史范围

- TEST-GLM-GAME-DIALOGUE-PAGINATION-1 r1 证据索引（6 合同+6 针）；固定源 revision 4ce17faa06c6…。

## 原始结论

- 六合同全绿六针恰一红；对话 fixture 禁括号（图标控制符）与 ≥4 空行分歧仅登记的判例在 ledger。

## 当时证据

- 六针表与质量门在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `9b0c8f88e72c17616726e38569cc4202f47d405770ded990a5c0a48a2439d92e`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
