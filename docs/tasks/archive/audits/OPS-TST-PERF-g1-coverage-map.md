# OPS-TST-PERF G1 旧断言去向映射

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: audit-report-v1 / 1.0.0

本页是 OPS-TST-PERF G1 旧断言去向映射审计的归档回执。44 条逐项映射表与路由规则在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前测试拓扑或 coverage 信用。

## 审计问题

- PAL-heavy 旧测试断言退役后，每条旧断言由哪个后继证明承接、实际运行哪个门；防止便宜的 synthetic/oracle 被当成 source-backed 事实。

## 范围与证据

- 44 条逐项映射（旧断言完整标题 → 后继测试文件·标题 → 路由），更新时间 2026-08-03；路由四类规则在 quote 保全。

## 发现

- `fast-synthetic` 只证生产函数在最小 fixture 上的行为/拒绝条件，不替代 PAL 数量、地址和剧情样本；`pal-oracle` 只证已发布 P7→R13 摘要与篡改拒绝，不重建 81k source graph；`canary` 每次从真实 PAL 源重建并与 golden、replay `0/0/0` 对比；`release-shared` 保留完整 source-backed 断言，是慢证明，不作开发循环默认门。

## 结论

- 旧断言逐条有后继承接、无孤儿；路由声明使每条断言的证明强度显式化。

## 整改与复核

- 映射表是当时 OPS-TST-PERF 测试重构的验收依据；复核按表内定位逐条可查。

## 历史范围

- 2026-08-03 映射快照，基于当时 release/shared/fresh 并存的测试拓扑。

## 原始结论

- 44 条映射与四类路由规则为原始结论本体。

## 当时证据

- 逐条表格在 quote 保全。

## 当前有效性

- historical。后续 current-only 重构删除旧 release/shared/fresh 证明链（见[OPS-TST-PERF current-only baseline](../evidence/OPS-TST-PERF-current-only-baseline-2026-08-22.md)），部分后继路由已随拓扑退役；本映射按当时拓扑时点解释。

## 继任文档

- 当前测试拓扑以 `packages/migrate` 现行配置与测试治理文档为准；目录导航见[历史审计回执](../README.md)。

## 原文保全

固定源 revision `81d01fa9993b38f0905ed7a54fc9a0b1c73f8fa5`，source SHA `38c8f2921086034e0584cd8b0db27bcf996eb9b0efec11a60a62ad159f6c60d3`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # OPS-TST-PERF G1 旧断言去向映射
>
> 更新时间：2026-08-03
>
> 这张表是 G1 的逐条追踪清单。`旧断言` 保留 PAL-heavy 原测试的完整标题；`后继证明` 给出可以直接定位的测试文件与标题；`路由` 是它实际运行的门，不把便宜的 synthetic/oracle 当成 source-backed 事实。
>
> 规则：
>
> - `fast-synthetic` 只证明生产函数在最小 fixture 上的行为/拒绝条件；它不能替代 PAL 数量、地址和剧情样本。
> - `pal-oracle` 证明已发布的 P7→R13 摘要和篡改拒绝，不重新构建 81k source graph。
> - `canary` 每次从真实 PAL 源重建，并与 golden、replay `0/0/0` 对比。
> - `release-shared` 保留完整 source-backed 断言；它是慢证明，不作为开发循环默认门。
>
> ## 44 条逐项映射
>
> | # | 旧断言（原文件） | 后继证明（文件 · 标题） | 路由 |
> |---:|---|---|---|
> | 1 | `p2-shadow.pal.test.ts` · 冻结 3,345 tombstone、13 个待归属体、s018 与 202=201+1，并生成确定性影子包 | `p7-canonical.test.ts` · all non-state-machine owners close without generated author commands | fast-synthetic |
> | 2 | `p2-shadow.pal.test.ts` · 作者修改待 tombstone body 时冲突且零 cell 写入 | `p7-mg2.test.ts` · same canonical stage conflict keeps writes and deletes at zero | fast-synthetic |
> | 3 | `p2-shadow.pal.test.ts` · s018 body 或 installer 任一作者 cell 修改都使原子迁移组零写冲突 | `p7-mg2.test.ts` · merges author and upstream edits by canonical StageId and retains immutable controls | fast-synthetic |
> | 4 | `p2-shadow.pal.test.ts` · 作者新增指向 tombstone 的引用会冲突且零写 | `p7-mg2.test.ts` · rejects project full-ledger pollution and a baseline/project sidecar re-sign | fast-synthetic |
> | 5 | `p2-shadow.pal.test.ts` · 即使重算自摘要，target 与 ledger 关系篡改也只能得到零写冲突 | `p7-mg2.test.ts` · rejects sidecar mutation instead of recursively merging control bytes | fast-synthetic |
> | 6 | `p3-shadow.pal.test.ts` · 1,715 个候选完全分类，599 个结构化且累计 IR 可逆 | `p7-canonical.test.ts` · materializes P3 and P6 local continuation nodes without leaking generated kinds | fast-synthetic |
> | 7 | `p3-shadow.pal.test.ts` · release 双跑 / fast 固定 core、完整 manifest 闭包与 v4 作者合并层成立 | `synthetic-test-fixture.test.ts` · rejects census tamper and keeps migration replay/merge plans zero-write | fast-synthetic |
> | 8 | `p3-shadow.pal.test.ts` · 作者修改被吸收 body 或入站 jump cell 时整批零写冲突 | `p7-mg2.test.ts` · same canonical stage conflict keeps writes and deletes at zero | fast-synthetic |
> | 9 | `p3-shadow.pal.test.ts` · 新增指向 P3 absorbed target 的引用冲突，纯 rechunk 不误报 | `p7-compatibility.test.ts` · P7 binding digest ignores ScriptRef chunks but retains stable ids | fast-synthetic |
> | 10 | `p3-shadow.pal.test.ts` · 即使重算摘要，P3 target-ledger 关系篡改仍然零写 | `p7-mg2.test.ts` · rejects sidecar mutation instead of recursively merging control bytes | fast-synthetic |
> | 11 | `p4-shadow.pal.test.ts` · Page/Behavior/Hook 全量分配，7,039 fragments 可逆且 P4 清零 | `p7-owner-machine.test.ts` · all 65 owners merge to canonical v5 machines | fast-synthetic |
> | 12 | `p4-shadow.pal.test.ts` · e2493/e2495/s018 金丝雀获得稳定具名 owner，全部旧命令被改写 | `p7-owner-machine.test.ts` · merges stage roots and a cycle into one canonical machine | fast-synthetic |
> | 13 | `p4-shadow.pal.test.ts` · 17 个跨 owner body 零复制转交 P6，物品领域化建议不倒灌共享脚本 | `p7-owner-machine.test.ts` · translates legacy next activation into a canonical advance | fast-synthetic |
> | 14 | `p4-shadow.pal.test.ts` · 累计计划与重复计划守恒，确定性 bundle 闭包成立 | `p7-mg2.test.ts` · merges author and upstream edits by canonical StageId and retains immutable controls | fast-synthetic |
> | 15 | `p4-shadow.pal.test.ts` · 作者修改 owner fragment、Page 或 selection command 时整批零写 | `p7-mg2.test.ts` · same canonical stage conflict keeps writes and deletes at zero | fast-synthetic |
> | 16 | `p5-shadow.pal.test.ts` · 433 cyclic bodies form 331 explicit cycle structures and P5 reaches zero | `p7-state-machine.test.ts` · all 70 irreducible cycles close as canonical v5 machines | fast-synthetic |
> | 17 | `p5-shadow.pal.test.ts` · auto repeat, natural loop, multi-state and trigger-loop canaries stay distinct | `p7-state-machine.test.ts` · splits a mid-body condition into a synchronous continuation | fast-synthetic |
> | 18 | `p5-shadow.pal.test.ts` · confirm.onNo and three cross-owner cycles are explicit without body copies | `p7-state-machine.test.ts` · gives confirm outcome a stable command id and keeps yes suffix synchronous | fast-synthetic |
> | 19 | `p5-shadow.pal.test.ts` · author cycle-body modifications and new inbound references conflict with zero writes | `p7-mg2.test.ts` · same canonical stage conflict keeps writes and deletes at zero | fast-synthetic |
> | 20 | `p6-shadow.pal.test.ts` · 31 pending bodies close with complete tail classification and body conservation | `p7-project.test.ts` · consumes the complete P6 owner ledger into valid v5 scenes and items | fast-synthetic |
> | 21 | `p6-shadow.pal.test.ts` · shared means generic function: all six item roots remain item-private | `synthetic-test-fixture.test.ts` · uses the production v5 vocabulary for stage, branch, loop and confirm fixtures | fast-synthetic |
> | 22 | `p6-shadow.pal.test.ts` · local calls inline with scheduling evidence and tail transfers stay explicit | `p7-canonical.test.ts` · projects zero-delay goto and probability branches from opcode semantics, not address order | fast-synthetic |
> | 23 | `p6-shadow.pal.test.ts` · cumulative plan deletes every legacy body and repeat plan is zero | `p7-project.test.ts` · consumes the complete P6 owner ledger into valid v5 scenes and items | fast-synthetic |
> | 24 | `p6-shadow.pal.test.ts` · author edits and forged shared closure targets fail closed with zero writes | `p7-mg2.test.ts` · rejects project full-ledger pollution and a baseline/project sidecar re-sign | fast-synthetic |
> | 25 | `r13-cadence-mg2.pal.test.ts` · initializes only in nextBaseline and replays to a zero project plan | `append-only-transition-state.test.ts` · classifies the complete four-bit state (mask 0/15) | fast-synthetic + release-shared |
> | 26 | `r13-cadence-mg2.pal.test.ts` · prepared authority rejects identity drift and unsigned evidence mutation | `synthetic-test-fixture.test.ts` · keeps current/historical profile, snapshot identity and missing prerequisites fail-closed | fast-synthetic |
> | 27 | `r13-confirm-control-flow.pal.test.ts` · freezes the complete 26/28/31 authority and validates every final scene | `pal-test-oracle.test.ts` · pins the published P7→R13 chain without constructing the 81k source graph | pal-oracle |
> | 28 | `r13-confirm-control-flow.pal.test.ts` · keeps s128 on one shared confirm with safe No, insufficient and success paths | `p7-state-machine.test.ts` · gives confirm outcome a stable command id and keeps yes suffix synchronous | fast-synthetic |
> | 29 | `r13-confirm-mg2.pal.test.ts` · fresh init 只写 13 scenes + locale + E1 items，重放为 0/0/0 | `r13-source-semantics-canary.pal.test.ts` · the same live authority replays to an identical seal and zero writes | canary |
> | 30 | `r13-confirm-mg2.pal.test.ts` · missing published body can be rebuilt only from the immutable authority | `append-only-transition-state.test.ts` · classifies the complete four-bit state (mask 15) | fast-synthetic + release-shared |
> | 31 | `r13-confirm-mg2.pal.test.ts` · prepared authority 拒绝输入身份和 evidence digest 漂移 | `pal-test-oracle.test.ts` · rejects a self-edited projection instead of trusting persisted JSON | pal-oracle |
> | 32 | `r13-confirm-mg2.pal.test.ts` · 拒绝自洽重签但不匹配 source authority 的 published seal | `r13-source-semantics-canary.pal.test.ts` · producer rebuild matches the exact R13-6A golden and preserves the closure | canary |
> | 33 | `r13-cross-activation-mg2.pal.test.ts` · initializes only in nextBaseline and replays to a zero project plan | `append-only-transition-state.test.ts` · classifies the complete four-bit state (mask 0/15) | fast-synthetic + release-shared |
> | 34 | `r13-cross-activation-mg2.pal.test.ts` · rejects discard-hook and inherited scene-repair target drift | `pal-test-oracle.test.ts` · rejects a self-edited projection instead of trusting persisted JSON | pal-oracle |
> | 35 | `r13-cross-activation-mg2.pal.test.ts` · rejects an auto evidence object with a forged inner digest | `append-only-transition-state.test.ts` · classifies every non-empty/non-complete state as half-state | fast-synthetic |
> | 36 | `r13-cross-activation-mg2.pal.test.ts` · prepared authority rejects identity drift and unsigned evidence mutation | `synthetic-test-fixture.test.ts` · keeps current/historical profile, snapshot identity and missing prerequisites fail-closed | fast-synthetic |
> | 37 | `r13-item-throw-mg2.pal.test.ts` · 初始化只写 nextBaseline seal，重放得到 0/0/0 工程计划 | `r13-source-semantics-canary.pal.test.ts` · the same live authority replays to an identical seal and zero writes | canary |
> | 38 | `r13-item-throw-mg2.pal.test.ts` · prepared authority 拒绝输入身份和未签 evidence 漂移 | `pal-test-oracle.test.ts` · rejects a self-edited projection instead of trusting persisted JSON | pal-oracle |
> | 39 | `r13-item-throw-mg2.pal.test.ts` · 拒绝自洽重签但不匹配源 authority 的 seal | `r13-item-throw-augmentation.pal.test.ts` · 自洽重签 disposition observation 漂移仍被结构守恒拒绝 | release-shared |
> | 40 | `r13-source-semantics-mg2.pal.test.ts` · 初始化只写 17 个 owned path，控制文件留在 nextBaseline | `r13-source-semantics-canary.pal.test.ts` · producer rebuild matches the exact R13-6A golden and preserves the closure | canary |
> | 41 | `r13-source-semantics-mg2.pal.test.ts` · 重放得到相同 seal 和零写入计划 | `r13-source-semantics-canary.pal.test.ts` · the same live authority replays to an identical seal and zero writes | canary |
> | 42 | `r13-source-semantics-mg2.pal.test.ts` · 拒绝工程携带 source-semantics seal 或源指令漂移 | `source-instruction-disposition.pal.test.ts` · deleting one final owner command opens every affected site instead of self-sealing | release-shared |
> | 43 | `r13-source-semantics-mg2.pal.test.ts` · 作者 scene/map 修改留在 project target，不污染纯 successor baseline | `pal-test-oracle.test.ts` · pins the published P7→R13 chain without constructing the 81k source graph | pal-oracle |
> | 44 | `c8-item-use-mg2.test.ts` · rejects authority/root drift, P7 drift, and control files in project inputs | `c8-item-use-augmentation.test.ts` · pins the published append-only C8 seal independently from regeneration code | release-shared |
>
> ## 守恒与剩余 source proof
>
> - 映射数量固定为 44；每条旧断言都保留原文件和完整标题，未以“同类测试”代替。
> - G1 的四位 append-only 状态机现在由生产函数 `appendOnlyTransitionState` 统一实现，并由 fast gate 的 16 个 mask 测试覆盖：`0000 → initialize`、`1111 → replay`、其余 14 种 → fail-closed 半状态。
> - 上表中标为 `release-shared` 或 `canary` 的条目仍保留真实 PAL 数量、地址、source authority 和 golden 证明；表格不把 fast synthetic 结果升级为 source proof。
> - G7 的真实共享 lease 顺序探针另见 `pal-shared-order-probe.pal.test.ts`：一次冷初始化后在同一 `release-pal-shared` worker 内执行默认、逆序和 `20260802/03/04` 三个 seed 的消费者顺序，并在整组前后比较 lease digest。
<!-- original-source-quote:end -->
