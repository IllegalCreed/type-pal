# TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据

Owner: GLM · Branch: `codex/glm-game-event-contracts-r1`（base `a55862e12`）
状态: 待 Codex 独立验收（不合 main、不标 done）。

## 交付物

- 新测试 `packages/game/src/core/event-system.glm-event-contracts.test.ts`（22 it,全绿）:
  runPlayerPoisonEntrySync 毒入口 8 合同(全部旧测只注入 stub runner)、applyRawOpcode 长尾
  0x5D/0x74/0x79/0x94/0x20 装备臂/0x78+default 6 合同、runScript 防御 5 合同、battle 0x04
  call/return 2 合同、autoScript 0x04 多帧 callee 1 合同。
- [dedup-ledger.md](dedup-ledger.md):四段范围逐合同排重账(NEW/REG + 旧证锚点;
  判例:hex 字面量与 OP_* 常量名须双 grep,0x62/0x63/0x4C/0x4B 仅常量名出现在旧测)。
- [directed-vitest.json](directed-vitest.json):fresh file×fullName×status(22 passed)。
- 反控三态:[mutation-points.json](mutation-points.json) 8 针 + [mutation-results.json](mutation-results.json)
  (8/8 VALID;原始绿→指定业务红→恢复绿、identitySet 全量、三态 hash、恢复 sha 一致、
  判据拒收零执行/pending/runtime-error/无业务断言/恢复不绿)+ `mutation-logs/` 目录下
  48 份规整后全文日志(落盘字节 hash)。runner:[mutation-runner.mjs](mutation-runner.mjs)。

## 门禁

定向 22/22;相邻 13 文件 485/485;game 全量 299 文件 3439/3439;typecheck 0 error;
`pnpm lint` 全仓 0/0/0;`pnpm check:docs` PASS;`git diff --check` 0。
