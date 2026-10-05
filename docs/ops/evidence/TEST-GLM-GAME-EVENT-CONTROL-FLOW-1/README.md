# TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据

GLM r1(2026-10-05,分支 `codex/glm-game-event-control-flow-r1`,base `7a9157ac5`):
事件解释器控制流残差——排重后 2 条新合同(`packages/game/src/core/event-system.glm-event-control-flow.test.ts`),
反控 2/2 VALID,定向/相邻/全量/typecheck/lint 0/0/0/docs/diff 全过。回执见
[任务卡](../../tasks/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1.md)。

## 目录

- [dedup-ledger.md](dedup-ledger.md) — 逐分支排重账(NEW/REG/unreachable + 数据面证据 + 判例)。
- [coverage-probe/](coverage-probe) — vitest v8 statement 级 coverage 实证(疑点分支命中数,NEW 判定依据)。
- [data-reachability.py](data-reachability.py) / [data-reachability-output.txt](data-reachability-output.txt) —
  全库 autoScript(含 0x24 装载)0x7F 可达性扫描与 [0,0,0xFFFF] 豁免组合真数据实例(只读)。
- [mutation-points.json](mutation-points.json) / [mutation-runner.mjs](mutation-runner.mjs) /
  [mutation-results.json](mutation-results.json) / [mutation-logs/](mutation-logs) — 三态反控
  (原始绿→指定业务红→恢复绿;identitySet/exit/执行集/三态 sha/清理证明)。
- [directed-vitest.json](directed-vitest.json) — 定向 fresh file×fullName×status。

## 一句话结论

runOneAutoOp 全族、0x7F 主路径、OP_PLACE_USED_ITEM、0x0A 主流程、终止/清理链、event-opcode-player
全族均已证(REG);全库 auto 链 0x7F 零可达(unreachable,附脚本);新合同仅两条——
resolveConfirmGoto fail-closed 与 0x7F[0,0,0xFFFF] 回正豁免。
