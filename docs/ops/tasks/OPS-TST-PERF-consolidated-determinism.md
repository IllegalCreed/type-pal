# OPS-TST-PERF-C - P2/P3/P4 consolidated determinism proof

Status: blocked
Execution: waiting（B 因 v4-only 前提纠偏转 rework；B 重签并转 review 前不得开始 C）
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
  - 新增可机检的测试标题/断言→successor coverage map，覆盖 **build 开始时机械生成的完整
    `release-pal-shared` 清单**（2026-08-17 现场为 24 files / 138 tests）的每一条 source-backed
    断言；历史 24/137 只作成本与旧清单基线，不能把新增标题排除在外。
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
  - 历史 137 与 build-start 当前完整 shared 清单的覆盖守恒都不能由总测试数相等推导；缺失/重复/
    孤儿必须 fail-closed。
- 代码锚点(`file:line`):
  - `packages/migrate/src/experimental/script-v5/shadow-harness.ts:351-386,677-712,1036-1071`。
  - `packages/migrate/vitest.tests.ts:3-30`（shared 24 文件路由）；当前标题全集须由 `vitest list` 机械生成。
  - `packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:100-125`（当前浅冻结/lease）。
  - P2/P3/P4 各 MG2、source-semantics、enemy-audit、fresh disk transaction 测试与 fixture。
- 已知坑 / 审计文档:
  - P2/P3/P4 历史正式 release live rebuild 为 **3 files / 20 tests / Vitest 755.07s
    （real 755.67s）**，core pin 保持三阶段原值；证据：
    `N3-1-script-control-flow-modernization.md:4998-5004`。pinned bundle 的 self-digest 只能证明
    自洽，不能证明 source producer。
  - 当前 G1 摘要只有 44 条映射，不能冒充 build-start 完整 shared 标题/断言覆盖。
- 不得重新引入:
  - 同一 lease 上反转输入、原地 mutate、浅 clone、删除 anti-tamper/half-state/historical rewind、
    以总数或单一 canary 报告冒充 source proof。
- 相关测试:
  - P2/P3/P4 source-backed shared tests、shadow harness determinism tests、manifest/release profiler。

## 前提真值矩阵

一句话前提：P2/P3/P4 当前各自用 live default/reversed 双建证明 source producer 的确定性；可以
集中调度重复证明，但只有在 build-start 全量标题/断言唯一映射、每阶段独立 fresh 输入仍在、全套
source/authority/anti-tamper 证据不减时才可改变 release 消费路径。

| 真值面 | 当前事实 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：纯 Reforge migration proof 基础设施，不裁决原版机制。 | 本卡范围仅为 `packages/migrate` release proof。 |
| 第一阶段 | N/A：第一阶段没有 P2/P3/P4 shadow producer，不能作为证明真值。 | `docs/phase2/READ-FIRST.md:1-18`。 |
| 当前二阶段 | P2/P3/P4 的 deterministic builder 都执行两次 `build*Core`，第二次反转 Map/Set 输入后比较；pinned builder 明确只记 `independentBuilds: 1`。历史 P2/P3/P4 正式组为 20 tests / 755.07s；当前 `vitest list` 为 24 files / 138 tests 且标题无重复，release manifest 为 113/781。 | `shadow-harness.ts:351-385,677-711,1036-1070`；`p2/p3/p4-shadow.pal.test.ts` 的 `verificationMode: 'live-double-build'`；`N3-1-script-control-flow-modernization.md:4998-5004`；2026-08-17 现场 `vitest list --project release-pal-shared --json`；`test-manifest-v1.json:13-19`。 |
| 本任务目标 | 先从 build-start 全量清单与断言 AST 机械生成 coverage map，再实现 consolidated probe；每个 P2/P3/P4 保留不同进程/临时根的 default/reversed live build，现场比较 source/baseline/route/schema/method/profile、IR/ledger/files/authority/seal 与全部反例，三方 accept 前不改默认 route。 | 本卡“范围”“验收条件”；母卡 `OPS-TST-PERF-release-wallclock.md:76-91`。 |

最强替代解释：shared 成本可能主要来自 P5/P6/R13 或通用 fixture，而非 P2/P3/P4 的重复双建；即使
coverage 正确，consolidated probe 也可能没有足够收益。实现必须先保留 canonical control 并量化节省；
若收益不稳定，维持现有 route，不以“已经做了 coverage map”为理由强行切换。

可证伪观察：build-start 清单/AST 无法一一唯一映射、任何标题成为 duplicate/orphan/missing、任一阶段
复用同 lease/同可变输入、source/authority/seal 或 anti-tamper 证据减少、routeSha256 变化无法逐项归因，
或 control 表明没有稳定收益；任一出现即 `rework/blocked`，不得删除现有 live-double-build。

## 验收条件

- 功能:
  - coverage map 逐项列出 build-start 全量 test title、断言 identity、successor、阶段、证据路径和
    digest；机器检查 duplicate/orphan/missing 并 fail-closed。
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

- Codex: **premise verified + design agree（2026-08-17，本人一手读码 + 现场 `vitest list`）**。
  - P2/P3/P4 deterministic builder 的两次独立 core build、反转 Map/Set 输入、`sameFiles` 比较及
    pinned 单建模式均已直接核实；pinned self-digest 不能替代 source producer 的判断成立。
  - **PC1 已闭合**：755 的出处不是母卡 profiler，而是 N3-1 保存的正式 release 记录：
    `3 files / 20 tests / 755.07s（real 755.67s）`，三阶段 core pin 同时在册
    （`N3-1-script-control-flow-modernization.md:4998-5004`）。卡文已改为精确证据。
  - **PC2 动态基线已校正**：现场命令
    `vitest list --config vitest.release.config.ts --project release-pal-shared --json` 返回
    **24 files / 138 tests，标题无重复**；历史 137 不再冒充当前全集。coverage map 必须以 build-start
    机械清单 + 断言 AST 为输入并覆盖当时全集，禁止手抄或冻结旧数量。
  - **PC3 携带进入 build**：当前 release manifest 为 113 files / 781 tests，routeSha256
    `35d8e22a…`；successor 引起的 files/tests/title/routeSha256 变化必须保存新旧值并逐项归因。
  - design agree：先 coverage map、再 consolidated probe、最后才评估 route；三阶段仍保留独立
    fresh default/reversed live build和完整反例。最强替代解释与可证伪观察已写入前提矩阵。
- Kimi: **premise verified + design agree（2026-08-17，本人一手读码，非代理；携带 PC1-PC3）**。
  逐项独立核实：
  - **source-proof 独立性边界成立**：shadow-harness `buildDeterministicP2ShadowBundle` 的
    live-double-build 实存（shadow-harness.ts:351-360，`buildCore` 两次、第二次输入 Map reverse），
    「不删 second/reversed build、禁止同 lease 反转」正是保护这条证明语义；pinned bundle
    self-digest 只证自洽不证 producer 的护栏判断正确。
  - **coverage map 设计可机检**：逐标题唯一映射 + duplicate/orphan/missing fail-closed 是
    唯一诚实的守恒形式；PC2 要求以 `vitest list` 机械输出为唯一输入、禁止手抄——我独立同意，
    137 的三角记录（母卡 1992.69s run / 分层卡 G1 / manifest 双 sha256）只能证明总量，
    不能替代逐标题真值。
  - **anchor 核实**：`vitest.tests.ts` 的 `PAL_SHARED_TESTS` 清单实存（:3-10 起，p7-* 等）；
    pal-test-fixture lease/浅冻结锚点与 B 卡互洽；manifest routeSha256 作为守恒锚（PC3）正确——
    successor 落地必改路由 digest，新旧对照 + 显式归因不可省。
  - **PC1 状态**：文本损坏（"约 ns"）在当前工作树已修复为"约 755s"（:46）；但 755s 在母卡
    （release-wallclock.md 只有 1992.69s/2.6GiB 实测）、分层卡与 shadow-harness 均无出处——
    数字出处锚定仍未完成，PC1 后半部分继续有效。
  - 补充观察（不另立钉）：「减少重复冷建而不减证明强度」的目标排序正确；「先 coverage map 后
    consolidated probe、再评估 release route 消费」的三段顺序防止了先斩后奏。
  未改实现文件，未代签 Codex/GLM，未标 build/done。
- GLM: **premise verified + design agree（2026-08-17，本人一手读码 + 计数三角验证，非代理；附
  必落钉 PC1-PC3，不阻塞准入）**。关键声明独立复核：
  - **137 三角验证 ✓**：母卡实测 run 记录 shared 24 files/137 tests（1992.69s）+ 分层卡 G1 表
    22 files/137 tests（test-fixture-stratification:63）+ manifest release gate files=113/
    tests=781 双 sha256 在册——"旧 shared 137 tests" 成立；C 卡要求逐标题唯一映射而非总数推断，
    与分层卡"覆盖守恒不能由总测试数相等推导"铁律一致。
  - **"G1 摘要约 44 条" ✓**：分层卡 :65/:73 的 44 条是 synthetic 迁移路线表，非 137 逐标题覆盖
    ——C 卡"44 不能冒充 137"的判断属实。
  - **反捷径护栏 ✓**：pinned bundle self-digest 只证自洽不证 source producer、同 lease reverse
    禁止、duplicate/orphan/missing fail-closed、不删 reversed 双建——与 shadow-harness
    live-double-build 的证明语义一致。
  - **必落钉 PC1（锚点行损坏 + 数字出处）**：本卡"已知坑"首行现为"历史 live-double-build 约
    **ns**"——原文 755 已被并行编辑损坏；且 755s 在母卡/分层卡/shadow-harness 均无出处锚定。
    build 前修复文本并把该数字钉到 profiler 报告路径，或删数字改引报告。
  - **必落钉 PC2（coverage map 机械生成）**：137 逐标题清单必须由
    `vitest list --config vitest.release.config.ts --project release-pal-shared` 机器输出 +
    断言 AST 生成，禁止手抄；本席的 137 亦是三角记录而非逐标题清单，逐标题真值只有 vitest list
    能给。coverage map 的 duplicate/orphan/missing 机检以该输出为唯一输入。
  - **必落钉 PC3（manifest 守恒以 routeSha256 为锚）**：successor 落地会改 release 路由 →
    routeSha256 必变；对照时必须记录新旧 digest 并显式归因（新增 successor 文件属预期变化），
    不得静默；files/tests 计数变化同表记录。
- counter / 分歧处理: coverage 或 source-proof 任何缺口都保持 blocked。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-17）——Codex + Kimi + GLM 三方 premise/design 签字齐；
  PC1 已由 N3-1 正式记录闭合，PC2 按 build-start 当前 138 全量清单执行，PC3 与全部 source-proof
  红线作为 build/验收硬门禁。**

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
- 2026-08-17 GLM（覆盖/测试）: 设计审查完成，签 **premise verified + design agree（附 PC1-PC3）**。
  137 经母卡实测/分层卡 G1 表/manifest 三角验证；44≠137 判断属实；反捷径护栏齐。三钉：PC1 卡文
  755s 锚点行已损坏且出处未锚定须修复；PC2 coverage map 必须 vitest list 机械生成禁手抄；
  PC3 manifest 守恒以 routeSha256 新旧对照为锚。未改实现文件，未代签 Codex/Kimi。
  Next: Codex/Kimi 签字后三签齐。
- 2026-08-17 Kimi（source-proof/独立性/跨包边界）: 设计审查完成，签 **premise verified +
  design agree（携带 PC1-PC3）**。一手核实：shadow-harness live-double-build 实存且反转输入为
  真独立构建（:351-360）；PAL_SHARED_TESTS 清单实存；反捷径护栏（pinned self-digest 不证
  producer、禁同 lease 反转、coverage fail-closed）判断正确；PC2 机械生成与 PC3 routeSha256
  锚定同意。PC1 现状：文本损坏已修（:46 现为"约 755s"），但 755s 出处仍无锚（母卡仅
  1992.69s/2.6GiB 实测），出处钉定继续有效。未改实现文件，未代签。Next: Codex 签字后三签齐。
- 2026-08-17 Codex: 独立复核并签 **premise verified + design agree**。PC1 由 N3-1
  `3 files / 20 tests / 755.07s` 正式记录闭合；现场 shared 清单已从历史 137 漂移为 24/138，故
  PC2 升级为 build-start 全量机械清单 + AST，PC3 保留 routeSha256 新旧归因。三签齐，状态转
  `build`；尚未修改实现文件或 release route。
- 2026-08-18 User: 暂缓性能优化任务，优先处理编辑器功能与样式。Evidence: 本轮用户明确指示。
  Next: 保持 `build` 与三签，不生成 coverage map / consolidated probe，不改 release route；用户恢复后继续。
- 2026-08-19 User: 明确解除 2026-08-18 暂停指令，允许恢复性能任务。Evidence: 本轮用户明确指示。
  Next: 待 B 转 `review` 后，Codex 以 C build 开始时的当前仓库机械生成 `vitest list` + 断言 AST 新基线，
  先闭合 coverage map 与 duplicate/orphan/missing fail-closed，再实现 consolidated probe；三方 implementation
  accept 前不得修改默认 release route。
- 2026-08-19 User: 纠正 B 的地图证明必须使用当前 canonical v4，不得还原旧结构。C 自身 PC1-PC3
  与 current mechanical baseline 前提未变化，但按既定执行顺序暂转 `blocked`。Next: 等 B 完成
  v4-only 重签、实现并转 `review` 后恢复 C `build`；不得提前生成 coverage map 或改 release route。

## 下一位 Agent 提示词

无下一位 Agent 提示词：C 仅因执行顺序依赖 B 而等待；B 转 `review` 前不得开始实现。恢复时必须以
当时仓库机械生成全量 shared 清单与断言 AST，历史 `24/138` 只作漂移记录、不得作为基线；仍须
Codex/Kimi/GLM 三方 implementation accept，且不得删除 source-backed 双建、用 pinned bundle
单独证明 producer、复用同一 lease 反转输入，或在三方 accept 前改默认 release route。
