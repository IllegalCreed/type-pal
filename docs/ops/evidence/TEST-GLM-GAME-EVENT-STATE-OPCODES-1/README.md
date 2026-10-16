# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 087e2ea3334d80a3f65de446b9cbe8be405a09b35ae9d2279f6e911fedf0869d。

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

- TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `087e2ea3334d80a3f65de446b9cbe8be405a09b35ae9d2279f6e911fedf0869d`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录
>
> 分支 `codex/glm-game-event-state-opcodes-r1`。Coding Owner:GLM;范围:`event-system.ts`
> applyRawOpcode 业务分支与 `event-opcode-player.ts` 状态写回的**臂级**排重 + 未证状态业务合同。
>
> ## 文件
>
> - [dedup-ledger.md](dedup-ledger.md) — 逐臂排重账(NEW×8 / REG / unreachable / defensive)
>   + 方法、数据面佐证与判例。
> - [directed-vitest.json](directed-vitest.json) — 定向 8/8,file×fullName×status 逐条。
> - [mutation-points.json](mutation-points.json) — 8 针(find/replaceWith 全文唯一锚 + targetContract 精确 fullName)。
> - [mutation-lib.mjs](mutation-lib.mjs) — r2 判据库(与 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 已验收资产逐字节一致)。
> - [mutation-runner.mjs](mutation-runner.mjs) — 三态 runner(仅换卡名/测试文件参数化)。
> - [mutation-selftest.mjs](mutation-selftest.mjs) / [selftest-results.json](selftest-results.json) —
>   判据自测 10/10(7 类 r1 误收反例全被 r2 拒,sanity 合法针形不过严;合成相位零 spawn 零临时树)。
> - [mutation-results.json](mutation-results.json) — **8/8 VALID**(r2 判据;每针红相位恰一失败且
>   精确命中目标合同、唯一 AssertionError、执行集/状态零漂移、恢复 identity 全等、产品源 sha 复原)。
> - [mutation-logs/](mutation-logs/) — 8 针 × 3 相位 × stdout/stderr 规整全文(trimEof + 恰一换行,
>   bytes/sha256 按落盘字节;受 `*.log` gitignore 约束,已 `git add -f`)。
> - [coverage-probe/](coverage-probe/) — 两轮 v8 statement 级 coverage 原始 JSON
>   (event/opcode 21 文件 574 测试 + game 全量 3498 测试并集,`--coverage.include` 限两目标文件)。
> - [onenter-walk-reachability.md](onenter-walk-reachability.md) — onEnter 段走位/骑乘 op 数据下界扫描
>   (party 走位现实可达 0x70×6/0x7a×5/0x7b×10;NPC 走位/骑乘 0 处)。
>
> ## 复现
>
> ```bash
> pnpm --filter @type-pal/game exec vitest run src/core/event-system.glm-event-state-opcodes.test.ts
> node docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/mutation-selftest.mjs
> node docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/mutation-runner.mjs   # 自改产品源三态后复原
> ```
>
<!-- original-source-quote:end -->
