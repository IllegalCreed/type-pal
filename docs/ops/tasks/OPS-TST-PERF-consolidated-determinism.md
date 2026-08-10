# OPS-TST-PERF-C - P2/P3/P4 consolidated determinism proof

Status: draft
Phase: ops
Capability: test infrastructure / migration proof
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none（2026-08-10；须由用户转发真实席位复审）
Branch: main

## 目标

评估并在可证明安全的前提下集中 P2/P3/P4 的 determinism proof，减少 release shared 的重复冷建，
同时保留 source-backed producer 的独立证明。目标是最大化 release 提速，而不是简单删除
live-double-build 或把同一份 pinned bundle 当作 source proof。

## 范围

- 范围内:
  - 新增可机检的旧测试标题/断言→successor coverage map，覆盖原 shared 137 tests 的每一条
    source-backed 断言。
  - 为每个 P2/P3/P4 保留独立 fresh default/reversed 输入构建，并集中比较其 determinism 产物。
  - 现场验证 canonical source/baseline/route/schema/method/profile digest、IR、ledger、files、
    authority/seal，以及反例和 fresh disk transaction。
  - 在三方设计和实现审查通过后，才评估 release route 的消费方式。
- 范围外:
  - 不直接删掉 `buildDeterministic*` 的 second/reversed build。
  - 不用 pinned/synthetic/oracle replay 单独替代 source-backed live proof。
  - 不在本卡提前改默认 release 命令，不跑剧情视觉。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 主卡 `OPS-TST-PERF-release-wallclock.md` C 节：consolidated proof 必须另开卡、三方设计、
    逐标题唯一映射、独立双建和全套 anti-tamper/transaction 证据。
  - 旧 137 shared tests 的覆盖守恒不能由总测试数相等推导；缺失/重复/孤儿必须 fail-closed。
- 代码锚点(`file:line`):
  - `packages/migrate/src/experimental/script-v5/shadow-harness.ts:351-386,677-712,1036-1071`。
  - `packages/migrate/vitest.tests.ts` shared 24 files / 137 tests 清单。
  - `packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:100-125`（当前浅冻结/lease）。
  - P2/P3/P4 各 MG2、source-semantics、enemy-audit、fresh disk transaction 测试与 fixture。
- 已知坑 / 审计文档:
  - 历史 live-double-build 约 755s；pinned bundle 的 self-digest 只能证明自洽，不能证明 source producer。
  - 当前 G1 摘要只有约 44 条映射，不能冒充 137 条逐标题覆盖。
- 不得重新引入:
  - 同一 lease 上反转输入、原地 mutate、浅 clone、删除 anti-tamper/half-state/historical rewind、
    以总数或单一 canary 报告冒充 source proof。
- 相关测试:
  - P2/P3/P4 source-backed shared tests、shadow harness determinism tests、manifest/release profiler。

## 验收条件

- 功能:
  - coverage map 逐项列出旧 test title、断言 identity、successor、阶段、证据路径和 digest；机器检查
    duplicate/orphan/missing 并 fail-closed。
  - 每个 P2/P3/P4 至少保留两次独立 live build（default/reversed fresh process/input），禁止同 lease
    reverse 或原地变异。
  - consolidated probe 现场比较 source/baseline/route/schema/method/profile、IR/ledger/files/
    authority/seal；author conflict、half-state、tamper、historical rewind、fresh transaction
    仍必须现场执行。
- 测试:
  - serial control、consolidated run、反转顺序和故障注入均通过；coverage map 与 manifest 精确闭合。
  - 任一 source digest/authority/seal/证据缺失或不一致，release 非零且不产生可发布 bundle。
  - typecheck、manifest、定向 shared/fresh 及 release dry-run 通过；默认 release route 只有在三方
    accept 后才可改动。
- 文档:
  - 保存机器可读 coverage map、旧/新清单 digest、每个 successor 的证据路径和三次 control 结果。
- 视觉 / 手工验证: N/A；剧情/演出按集中 E2E。

## 推进签字

### 进入 build 前：设计签字

- Codex: pending
- Kimi: pending（真实席位，用户转发提示词）
- GLM: pending（真实席位，用户转发提示词）
- counter / 分歧处理: coverage 或 source-proof 任何缺口都保持 blocked。
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前：实现签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

先从 `vitest.tests.ts` 和测试标题/断言 AST 生成 coverage map，再设计 consolidated probe；
任何被集中后的旧断言都必须有唯一 successor 和可追溯 source evidence。优化目标是减少重复调度，
不是减少证明强度。

### 已知风险

- coverage map 若只按文件或数量映射，会漏掉同文件多断言和隐式 anti-tamper 证据。
- 反转构建若复用 fixture lease，会制造“独立性”假象；必须在不同进程/临时根中重建。

## 交接日志

- 2026-08-10 Codex: 建卡。Evidence: 主卡 C 约束、shadow harness live-double-build 成本与 G1 覆盖缺口。
  Next: 真实 Kimi/GLM 先审 proof 设计；未满三签不得改 release 路由。

## 下一位 Agent 提示词

```text
接手任务：OPS-TST-PERF-C P2/P3/P4 consolidated determinism proof
任务卡：docs/ops/tasks/OPS-TST-PERF-consolidated-determinism.md
当前状态：draft，三方设计签字 pending；不得开始实现或删除任何 live-double-build。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、OPS-TST-PERF-release-wallclock.md、
vitest.tests.ts、shadow-harness.ts、pal-test-fixture.ts 及 P2/P3/P4 测试。
真实 Kimi 请审 source-proof 独立性、authority/seal/反例与跨包边界并写本人 agree/counter；
真实 GLM 请重算旧 137 条 title/断言覆盖、manifest 守恒、证据路径和 machine-check 规则并写本人
agree/counter。Codex 只有三方 design agree 后才能实现，完成后还需三方 accept。
不要做：不删 source-backed 双建，不用 pinned bundle 单独证明 producer，不同 lease 反转，不改默认
release route，不跑剧情视觉。
输出：coverage map schema/样例、独立双建证据计划、counter 或签字；实现阶段附完整 control 报告与 digest。
```
