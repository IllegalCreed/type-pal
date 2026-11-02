# CODE-QUALITY-68 — game speedrun countdown test contracts

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验 speedrun 倒计时两份测试文件:挂出/更新/null 移除、单例复用、相同节点更新、移除后重建与 pointer-events 的真实判别力（倒计时为 DOM 单节点）。

## 范围

两文件;只读 countdown.ts 实现与 index/timer caller。

## 前提与证据

原批:定向 4 tests 全绿、speedrun wave 全门通过,账本 3266/316 closed。

## 验收

2026-10-18 当前复审（覆盖旧排重结论）:承接 QUALITY-PRE94-RETROSPECTIVE-1,全文读取实现/两测试/index/timer,发现原生命周期断言重复、GLM 注释误称同文字写入不可观察;将身份/重建 oracle 合入主测试,GLM 改核 MutationObserver 与无 document 边界,四例职责重新划分;生产代码未改。隔离同文字 guard 变异:旧 4 绿→新 3 绿 1 个指定 AssertionError;根节点身份转移 1 红→1 红,移除 oracle 转移 2 红→1 红;恢复 4 绿。原件/JSON/完整身份/hash 与副本清理见 [README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/68-countdown-tests/README.md);相邻 speedrun/tools-panel 20 文件 104 tests、game typecheck 通过;未运行新全仓 check/ratchet/protected,旧波次门不认证新候选;当前 partial。

## 状态与交接

done 保持原历史语义;2026-10-18 复审 partial,历史 done 不等于本轮 accept。

## 历史范围

原卡属 2026-10-13 wave 时点;原始记录与历史提示词在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:测试合同原子、DOM oracle 真实、与实现排重。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（4 定向、wave 全门）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;职责重划后结论以 68 证据为准。

## 继任文档

CODE-QUALITY-65（index 编排）与 68 证据目录为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2133B / SHA-256 51f2cfc1e621c3a256ca1530e70248dd3df1428016af12b9652303fe3134095a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
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
````
<!-- incremental-original-source:end -->
