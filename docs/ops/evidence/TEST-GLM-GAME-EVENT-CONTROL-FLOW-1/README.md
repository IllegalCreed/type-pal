# TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据

GLM r1(2026-10-05,分支 `codex/glm-game-event-control-flow-r1`,base `7a9157ac5`):
事件解释器控制流残差——排重后 2 条新合同(`packages/game/src/core/event-system.glm-event-control-flow.test.ts`),
定向/相邻/全量/typecheck/lint 0/0/0/docs/diff 全过。回执见
[任务卡](../../archive/tasks/done/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1.md)。

GLM r2(2026-10-05,同分支返工):Codex 一审判反控 runner 判据误收 → 判据库化 + 严格化
(红相位 exit/signal/spawn、恰一失败、精确命中目标合同、红/原始执行集逐集合核对、恢复 identity 全等),
并新增判据自测(合成反例证明 r1 旧判据 7 类误收、r2 全拒);2 针按 r2 判据重跑 2/2 VALID。业务合同与测试文件零改动。

## 目录

- [dedup-ledger.md](dedup-ledger.md) — 逐分支排重账(NEW/REG/unreachable + 数据面证据 + 判例)。
- [coverage-probe/](coverage-probe) — vitest v8 statement 级 coverage 实证(疑点分支命中数,NEW 判定依据)。
- [data-reachability.py](data-reachability.py) / [data-reachability-output.txt](data-reachability-output.txt) —
  全库 autoScript(含 0x24 装载)0x7F 可达性扫描与 [0,0,0xFFFF] 豁免组合真数据实例(只读)。
- [mutation-points.json](mutation-points.json) / [mutation-lib.mjs](mutation-lib.mjs) /
  [mutation-runner.mjs](mutation-runner.mjs) / [mutation-results.json](mutation-results.json) /
  [mutation-logs/](mutation-logs) — 三态反控(r2 判据:判据库含 r1/r2 双实现,runner 只以 r2 为门、
  r1 并排记录;每针 3 相位保留 argv/cwd/env/stdout/stderr/exit/signal/spawn/identitySet/executionSet/三态 sha/清理证明)。
- [mutation-selftest.mjs](mutation-selftest.mjs) / [selftest-results.json](selftest-results.json) —
  判据自测:10 个合成反例(两失败/错合同/exit0/signal/spawn/pending/runtime/todo/执行集漂移 + sanity),
  证明 r1 旧判据误收 7 类、r2 全拒且不过严;纯内存零临时树,产品源前后 sha 相等。
- [directed-vitest.json](directed-vitest.json) — 定向 fresh file×fullName×status。

## 一句话结论

runOneAutoOp 全族、0x7F 主路径、OP_PLACE_USED_ITEM、0x0A 主流程、终止/清理链、event-opcode-player
全族均已证(REG);全库 auto 链 0x7F 零可达(unreachable,附脚本);新合同仅两条——
resolveConfirmGoto fail-closed 与 0x7F[0,0,0xFFFF] 回正豁免。反控判据 r2 严格化后 2/2 VALID(自测 10/10)。
