# coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源) 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 0ed6b6b2acf443ca5bd69bd6a1206f66f58becd761bf62b24d715f63dabbbade。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 7d609719e2347f6367712a54f2f81ccf3830b657；本轮 R65。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `0ed6b6b2acf443ca5bd69bd6a1206f66f58becd761bf62b24d715f63dabbbade`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # coverage 实证探针(排重账 §方法 / §1 NEW 判定的数据源)
>
> 两轮 vitest v8 statement 级 coverage,`--coverage.include` 限
> `src/core/event-system.ts` + `src/core/event-opcode-player.ts`:
>
> - run1(21 文件 574 tests):event/opcode 相关全家族(event-system×15、dialogue-pagination×2、
>   event-opcode-player×4、event-opcodes.cov85、mode、game-state×2、battle runscript-rearm)。
> - run2(**game 全套件 3498 tests**,权威并集):零命中清单与 run1 一致 → 无单文件子集假阳性。
>
> 逐语句命中数(NEW/REG/unreachable 判定直接证据)见 [statement-hits.json](statement-hits.json):
> `uncoveredStatements` = run2 全量零命中语句清单(event-system 100 条、event-opcode-player 1 条);
> `rangesOfInterest` = 本卡 NEW 六区段 + REG 关键锚区段逐语句命中。
>
> 复现(worktree `packages/game` 下):
>
> ```bash
> pnpm exec vitest run [<files...> 或全量] --coverage \
>   --coverage.include='src/core/event-system.ts' \
>   --coverage.include='src/core/event-opcode-player.ts' \
>   --coverage.reporter=json --coverage.reportsDirectory=/tmp/ecov
> ```
>
> 关键读数(run2,行:命中数):
>
> | 区段 | 读数 | 结论 |
> |---|---|---|
> | 4781-4783(零距离到达)/4790(pose 清)/4830-4834(到达复位) | 全 0 | 走位三臂零证 → W1/W2/W3 |
> | 2674-2675(party 走到达推进)/2723-2724(NPC)/2756-2757(骑乘) | 全 0 | 拦截到达推进臂;W1 证 party 侧,NPC/骑乘同形登记 |
> | 2823-2824(loadScene skip 臂) | 0 | L1(主臂 2810-2818 命中 ≥5) |
> | 5084-5090(runEnterScript goto 命中/缺失) | 全 0 | E1a/E1b(ip 越界 5065、end 臂 5072-5079 命中 → REG) |
> | 4949-4957(菱形回弹子臂)/4937-4938(随机轴)/4969(x≥0 象限) | 全 0 | M1 NEW;后两者同形登记 |
> | 4488(rgwData 扩展) | 0 | S1(主臂 4489/播种 4472-4487 命中 → REG) |
> | event-opcode-player.ts:98(`if (!eqRow) return true` 语句体) | 0 | opcode-residual 卡已登记防御守卫 → 本文件零新增 |
>
<!-- original-source-quote:end -->
