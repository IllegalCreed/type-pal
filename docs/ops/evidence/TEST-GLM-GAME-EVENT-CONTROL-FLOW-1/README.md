# TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 8f6019e7fec8f487c30b37e1d077203dbf7b74177d72646fb84c86d097c1ad83。

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

- TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `8f6019e7fec8f487c30b37e1d077203dbf7b74177d72646fb84c86d097c1ad83`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据
>
> GLM r1(2026-10-05,分支 `codex/glm-game-event-control-flow-r1`,base `7a9157ac5`):
> 事件解释器控制流残差——排重后 2 条新合同(`packages/game/src/core/event-system.glm-event-control-flow.test.ts`),
> 定向/相邻/全量/typecheck/lint 0/0/0/docs/diff 全过。回执见
> [任务卡](../../archive/tasks/done/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1.md)。
>
> GLM r2(2026-10-05,同分支返工):Codex 一审判反控 runner 判据误收 → 判据库化 + 严格化
> (红相位 exit/signal/spawn、恰一失败、精确命中目标合同、红/原始执行集逐集合核对、恢复 identity 全等),
> 并新增判据自测(合成反例证明 r1 旧判据 7 类误收、r2 全拒);2 针按 r2 判据重跑 2/2 VALID。业务合同与测试文件零改动。
>
> ## 目录
>
> - [dedup-ledger.md](dedup-ledger.md) — 逐分支排重账(NEW/REG/unreachable + 数据面证据 + 判例)。
> - [coverage-probe/](coverage-probe) — vitest v8 statement 级 coverage 实证(疑点分支命中数,NEW 判定依据)。
> - [data-reachability.py](data-reachability.py) / [data-reachability-output.txt](data-reachability-output.txt) —
>   全库 autoScript(含 0x24 装载)0x7F 可达性扫描与 [0,0,0xFFFF] 豁免组合真数据实例(只读)。
> - [mutation-points.json](mutation-points.json) / [mutation-lib.mjs](mutation-lib.mjs) /
>   [mutation-runner.mjs](mutation-runner.mjs) / [mutation-results.json](mutation-results.json) /
>   [mutation-logs/](mutation-logs) — 三态反控(r2 判据:判据库含 r1/r2 双实现,runner 只以 r2 为门、
>   r1 并排记录;每针 3 相位保留 argv/cwd/env/stdout/stderr/exit/signal/spawn/identitySet/executionSet/三态 sha/清理证明)。
> - [mutation-selftest.mjs](mutation-selftest.mjs) / [selftest-results.json](selftest-results.json) —
>   判据自测:10 个合成反例(两失败/错合同/exit0/signal/spawn/pending/runtime/todo/执行集漂移 + sanity),
>   证明 r1 旧判据误收 7 类、r2 全拒且不过严;纯内存零临时树,产品源前后 sha 相等。
> - [directed-vitest.json](directed-vitest.json) — 定向 fresh file×fullName×status。
>
> ## 一句话结论
>
> runOneAutoOp 全族、0x7F 主路径、OP_PLACE_USED_ITEM、0x0A 主流程、终止/清理链、event-opcode-player
> 全族均已证(REG);全库 auto 链 0x7F 零可达(unreachable,附脚本);新合同仅两条——
> resolveConfirmGoto fail-closed 与 0x7F[0,0,0xFFFF] 回正豁免。反控判据 r2 严格化后 2/2 VALID(自测 10/10)。
>
<!-- original-source-quote:end -->
