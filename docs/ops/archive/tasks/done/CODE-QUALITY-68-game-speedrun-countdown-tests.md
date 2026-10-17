# CODE-QUALITY-68 — game speedrun countdown test contracts

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: functional-ui（倒计时 DOM 单节点）

## 范围

- `packages/game/src/tools/speedrun/countdown.test.ts`
- `packages/game/src/tools/speedrun/countdown.glm-phase1-leaves.test.ts`

## 验证

完整读取 `countdown.ts` 与两份测试；定向 4 tests 全绿，覆盖挂出/更新/null 移除、单例复用、相同节点更新、移除后重建与 pointer-events。speedrun wave 的全仓 check、ratchet、protected fast、lint-zero、docs/content review、ledger 已通过；无实现改动。

## 交接

2026-10-13 Codex：测试合同原子、DOM oracle 真实、与实现排重；accept/done。账本收口为 `3266 / 316 closed / 8 review / 2942 pending`。

## 2026-10-18 当前复审（覆盖旧排重结论）

本次准入承接 QUALITY-PRE94-RETROSPECTIVE-1，Codex 单一 Owner；白名单为两份 countdown 测试及治理记录。全文读取实现/两测试/index/timer与 Task 7，发现原生命周期断言重复、GLM 注释误称同文字写入不可观察。将身份/重建 oracle 合入主测试，GLM 改核 MutationObserver 与无 document 边界，四例职责重新划分；生产代码未改。

隔离同文字 guard 变异旧4绿/新3绿1个指定 AssertionError；根节点身份转移1红→1红，移除 oracle 转移2红→1红；恢复4绿，原件/JSON/完整身份/hash与副本清理见 [68 证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/68-countdown-tests/README.md)。相邻 speedrun/tools-panel 20文件104 tests、game typecheck通过。未运行新全仓 check/ratchet/protected；旧波次门不认证新候选。当前 partial，历史 done 不等于本轮 accept。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-68 game speedrun countdown test contracts
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-68-game-speedrun-countdown-tests.md
当前状态：done，已归档；当前结论 accept/done，不得直接重用本卡授权实现
```
