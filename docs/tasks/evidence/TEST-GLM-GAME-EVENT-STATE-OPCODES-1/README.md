# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-GAME-EVENT-STATE-OPCODES-1 的证据目录：分支 `codex/glm-game-event-state-opcodes-r1`，Coding Owner GLM；范围为 event-system.ts applyRawOpcode 业务分支与 event-opcode-player.ts 状态写回的臂级排重+未证状态业务合同。

## 证据身份

- 文件清单：dedup-ledger.md（逐臂排重账 NEW×8/REG/unreachable/defensive+方法+数据面佐证+判例）；directed-vitest.json（定向 8/8 逐条）；mutation-points.json（8 针 find/replaceWith 全文唯一锚+targetContract 精确 fullName）；mutation-lib.mjs（r2 判据库与 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 已验收资产逐字节一致）；mutation-runner.mjs（三态 runner 参数化）；mutation-selftest+selftest-results（判据自测 10/10）；mutation-results.json（8/8 VALID）；mutation-logs/（8 针×3 相位规整全文，git add -f）；coverage-probe/（两轮 v8 statement 级原始 JSON：21 文件 574 测试+全量 3498 并集）；onenter-walk-reachability.md（onEnter 段走位/骑乘 op 数据下界扫描：party 走位现实可达 0x70×6/0x7a×5/0x7b×10；NPC 走位/骑乘 0 处）。

## 来源与输入

- 复现：pnpm --filter @type-pal/game exec vitest run src/core/event-system.glm-event-state-opcodes.test.ts；node mutation-selftest.mjs；node mutation-runner.mjs（自改产品源三态后复原）。

## 断言与业务 oracle

- 8/8 VALID（r2 判据）：每针红相位恰一失败且精确命中目标合同、唯一 AssertionError、执行集/状态零漂移、恢复 identity 全等、产品源 sha 复原。

## 结果

- 定向 8/8+判据自测 10/10+臂级排重账完整。

## 限制与复核

- memory 补充：r1 已交付（臂级 coverage 并集排重→走位到达/清 pose/零距离/同场景 guard/onEnter goto/菱形回弹/稀疏写回 8 合同，反控 8/8 复用 r2 判据库）待 Codex 验收。

## 历史范围

- TEST-GLM-GAME-EVENT-STATE-OPCODES-1 证据目录（8 合同+8 针 r2 判据）；固定源 revision 7d609719e234…。

## 原始结论

- 8 NEW 合同全绿 8 针 VALID；opcode 级 REG≠臂级已证判例；数据面佐证（走位/骑乘可达性）齐全。

## 当时证据

- 文件清单与复现命令在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `087e2ea3334d80a3f65de446b9cbe8be405a09b35ae9d2279f6e911fedf0869d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
