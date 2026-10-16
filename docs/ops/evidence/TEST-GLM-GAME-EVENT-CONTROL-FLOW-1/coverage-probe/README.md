# coverage 实证探针(排重账 §判例的数据源)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- coverage 实证探针(排重账 §判例的数据源) 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 14566f1e1c7e05b8d4e65672d1a48952bfd23117c35f275ffec32141c5c8047f。

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

- coverage 实证探针(排重账 §判例的数据源)：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `14566f1e1c7e05b8d4e65672d1a48952bfd23117c35f275ffec32141c5c8047f`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # coverage 实证探针(排重账 §判例的数据源)
>
> 两次 vitest v8 statement 级 coverage,只收 `src/core/event-system.ts` 本卡疑点区段
> (1254-1469 / 1499-1513 / 1814-1824 / 1879-1991 / 2381-2419 / 3435-3453 / 4387-4413)
> 的逐 statement 命中数,作为 NEW/unreachable 判定的直接证据。JSON 见 [statement-hits.json](statement-hits.json)。
>
> 复现(worktree `packages/game` 下):
>
> ```bash
> pnpm exec vitest run <files...> --coverage \
>   --coverage.include='src/core/event-system.ts' \
>   --coverage.reportsDirectory=/tmp/ecov --coverage.reporter=json
> ```
>
> - run1-3files:`event-system.test.ts + cov85 + glm-event-contracts`(374 tests)
> - run2-10files:run1 + `k01/k02/k04/k06 + dialogue-pagination(.glm-contracts) + mode`(415 tests)
>
> 关键读数(run2):
>
> | statement | 行 | 命中 | 结论 |
> |---|---|---|---|
> | 3443-3449(fail-closed 块内 7 条) | 3443-3449 | 0 | resolveConfirmGoto 目标缺失臂零证 → NEW it 1 |
> | 2389 `clearDialogBoxes(gs)` 体 | 2389 | 0 | 0x7F 清屏体零证(657 型 fixture 开火时 box 不在场)→ NEW it 2 两臂一并补 |
> | 1815/1819/1822(ip 越界链内) | 1814-1823 | 各 1 | mode.test.ts 单 op fixture 已证 → REG(判例:3 文件子集曾误判 UNHIT) |
> | 1934-1946(DL17 idleFrames 臂) | 1930-1942 | 2-3 | 旧测已证 → REG |
> | 1985-1991(goto 缺失终止) | 1985-1991 | ≥1 | 旧测 1432 已证 → REG |
>
<!-- original-source-quote:end -->
