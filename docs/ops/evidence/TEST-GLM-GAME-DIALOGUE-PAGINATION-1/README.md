# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 证据索引(GLM r1)

- 交付物:`packages/game/src/core/event-dialogue-pagination.glm-contracts.test.ts`(6 合同,单文件)
- 排重账:[dedup-ledger.md](dedup-ledger.md)(6 新增轴 + 登记未测项 + 空行边界观察)
- 身份集:[identity.json](identity.json)(file×fullName×status,6/6 passed;对最终格式化版本重出)
- 反控:[mutation-results.json](mutation-results.json) 6/6 VALID;逐相位 raw 见
  [mutation-logs/](mutation-logs/)(`SHARED-original.*` + 每针 `-red.*`/`-restored.*`,
  共 26 份;`*.log` 受 .gitignore `*.log` 规则约束,须 `git add -f`)

## 反控口径

每针 = 源码单点变异(find 恰命中 1 次才有效)→ 定向文件全量跑:红相位要求 exit≠0
且目标合同 failed 且失败为业务 AssertionError;恢复后源文件 sha256 与原始一致
(cleanupRestored),全文件恢复绿。**6 针红相位 failed-total 均恰为 1**(只杀目标合同);
identitySet 逐相位落盘,hash 记入 mutation-results.json。变异批与全量测试串行。

| 针 | 源行 | 变异(节选) | 目标合同 |
|---|---|---|---|
| MUT-01 | event-system.ts:1715 | 等键臂 `: input.pressed.size > 0` → `: has('Confirm')` | C1 翻页等键吞任意键 |
| MUT-02 | event-system.ts:1884 | `setWaitingEndKey` → `setWaitingPageKey`(end 收尾误走翻页键) | C2 末页边界二分 |
| MUT-03 | event-system.ts:1714 | 跳字臂 `? has('Confirm')‖has('Menu')` → `? size > 0` | C3 typing 中 Cancel/Up 不跳字 |
| MUT-04 | event-system.ts:1714 | 跳字臂 → `? has('Confirm')` | C4 Menu 跳字等价 |
| MUT-05 | event-system.ts:2035 | 删段中空行 `appendDialogLine(gs.dialogBox, '', …)` | C5 空行占页位 |
| MUT-06 | dialog-box.ts:595 | 删 page-advance 的 `state.userSkip = false` | C6 翻页后新页重新逐字 |

(完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json)

## 质量门(见卡回执)

定向 6/6;相邻(core 全目录 116 文件)2095/2095;game 全量 301 文件 3460/3460;
typecheck 0 error;`pnpm lint` 全仓 0/0/0(3324 files);`pnpm check:docs` PASS;
`git diff --check` 0。
