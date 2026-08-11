# OPS-TST-PERF-FRESH - release fresh hook/test 超时根因

Status: build
Phase: ops
Capability: test infrastructure / release gate
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none（2026-08-11；真实 Kimi/GLM design agree 已齐，implementation accept 尚未申请）
Branch: main

## 目标

在不放宽测试门禁、不增大 timeout、不把用例改成 skip、也不复用预构建 authority 的前提下，
找出 `release-pal-fresh` 冷启动失败的真实根因并做最小上游修复，使 fresh 阶段能稳定产出
完整、可定位的 Vitest JSON 与 profiler 阶段报告。

## 范围

- 范围内:
  - 独立复现 `pal-migration-integration.test.ts` 的 cold build 链，并区分 `beforeAll` hook
    超时、test body 超时、子进程/RSS/OOM、磁盘事务或 fixture 根因。
  - 修复导致超时的上游实现/fixture 生命周期/重复建链问题；保留 source-backed live rebuild。
  - 更新最小回归测试、失败报告和任务卡证据。
- 范围外:
  - 不改变 release manifest、测试路由、已有 timeout 数值或 `skipIf` 语义。
  - 不把 fresh 合并进 shared lease，不读取 canary/golden/prepared authority 代替现场建链。
  - 不在开发期间跑剧情/战斗视觉；视觉任务按集中 E2E 规则延后。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `OPS-TST-PERF-release-wallclock` 只允许诊断先行，fresh 失败必须 fail-closed；B/C 另卡。
  - 现有 release 必须 live rebuild，禁止通过调 timeout、跳过用例或复用产物制造“通过”。
  - Vitest list 的 listed/runnable 身份与 JSON reporter 的静态 pending 口径不能混淆。
- 代码锚点(`file:line`):
  - `packages/migrate/src/pal-migration-integration.test.ts:110-118,511,591-600,724,765,768-772`。
  - `packages/migrate/scripts/profile-release.mts` 的 fresh phase、raw JSON 保留和 fail-closed parser。
  - `packages/migrate/vitest.release.config.ts:45-65` 的 fresh isolate 与 1_200_000ms 项目上限；实际
    180s/240s ceiling 是 `pal-migration-integration.test.ts:768-770,945` 的内联 hook/body 参数。
  - `packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:100-125,137-193,330-356`。
- 已知坑 / 审计文档:
  - 2026-08-10 单文件 verbose cold 已定性：失败是 `beforeAll`（`:768`）180s hook timeout，
    `:772` 的 240s body 被 skipped、未开始。同步 `buildStrictPalMigrationFixture()` 阻塞 event loop，
    timeout 到点后不能立即中断，直至约 198s 返回才报告失败；不得再把它写成 body timeout。
  - `OPS-TST-PERF-release-wallclock.md` 的三次成功 full baseline 尚未完成。
- 不得重新引入:
  - timeout/skip 放宽、静默串行回退、缺报告仍 success、预构建 authority 输入、共享可变临时目录。
- 相关测试:
  - `pnpm --filter @type-pal/migrate exec vitest run --config vitest.release.config.ts --project release-pal-fresh`
  - `pnpm --filter @type-pal/migrate test:release:profile -- --smoke`（仅检查报告契约，不替代 full）。

## 验收条件

- 功能:
  - 根因由可复现的 cold command、raw Vitest JSON、phase report、exit/signal、hook/body 状态和
    process-tree RSS 共同证明；报告中明确 `beforeAll` 与 test body 的边界。
  - 最小修复保持原 `pal-migration-integration.test.ts:768-770` 的 180s hook、`:945` 的 240s body、
    listed test identity、source-backed fresh build 和磁盘事务隔离。
  - 连续三次独立 fresh run 成功，且不产生 baseline/project/authority 越界写入。
- 测试:
  - fresh 单项目定向测试、migrate typecheck、manifest/list digest、profiler full 至少一次通过；
    再按 OPS 主卡要求完成三次 full baseline。
  - 任何 hook/body 超时、静态/动态 skip、RSS 不可采样、报告缺失都必须非零并保留证据。
- 文档:
  - 在本卡写入根因、最小 diff、前后 wall/RSS、raw JSON 路径和回归命令；同步 OPS 主卡。
- 视觉 / 手工验证: N/A；剧情/演出视觉集中 E2E，不在此卡运行。

## 推进签字

### 进入 build 前：设计签字

- Codex: **agree（2026-08-11 返工方案；取代 2026-08-10 未证明收益的初稿）**——同一 `canary`
  gate、独立冷进程的现有 source-backed producer A/B 显示 validated-output 路径相对 full-chain
  路径墙钟减少 **31.23s / 26.9%**，超过 Kimi 要求的 18s 收益门；但峰值 RSS 反而为
  **2.62GB vs 1.47GB（1.78x）**，因此返工方案明确不再声称“compact 必然省内存”。实现边界改为：
  只让 fresh final-consumer 使用逐阶段验证/释放的 P6 final output；P7 必须抽成一条共同 pipeline，
  full capture 返回 cadence/cross/confirm parents、project 与全部 evidence，source-disposition capture
  只裁剪返回引用，二者不得维护第二/第三份算法；新增 full-chain/final-output 的完整 digest 等价门。
  shared/release phase matrix、source-backed 独立构建、180s/240s timeout、test identity 与磁盘事务均不改。
- Kimi: **agree（2026-08-11，本人复签；取代 2026-08-10 counter）**——三条 counter 全部闭合，
  收益门证据已由本人独立复跑确认（见下「Kimi 复签证据」）。**本 agree 只解除 build 准入，
  不构成 implementation accept；实现验收以卡内后验门为准（连续三次独立 fresh 成功、full/final-output
  完整 digest 等价、max RSS 不高于现 full control、180s/240s 原值不动），任一项不满足即返工并保持
  blocked。**原 2026-08-10 counter 三条（全文见交接日志当日条目）：
  1. ~~收益假设未证明~~ → **已闭合**：Codex 同 gate A/B（-31.2s/-26.9%）+ 本人独立复跑
     （-48.6s/-42.6%）两轮均超过 18s 门；GC trace 已做且未被夸大（79.7ms、未覆盖 worker，卡文
     明确不冒充收益证明）；worker 并行替代已论证不取（RSS 放大 + 越界 OPS-TST-PERF-B）。
  2. ~~窄出口形状与存量重复债~~ → **已闭合**：返工方案冻结为单一私有 canonical pipeline
     （project→C8→lifecycle→scene semantic→trigger/idle→item throw→confirm→equip），full-chain
     与 final-output adapter 共享同一 pipeline；full capture 必须含 cadence/cross/confirm 四个
     parent/successor snapshot + project + 全部 evidence；source-disposition 只在 pipeline 完成后
     裁剪返回引用；**必须删除 p7-generated.ts:275-403 现有重复流水线**，禁止第二/第三份算法；
     等价门覆盖 full snapshot、四个历史 snapshot、project、P6 IR/ledger 与全部 evidence digest。
  3. ~~卡文勘误~~ → **已闭合**：180s/240s 锚点已更正为测试文件内联参数
     （pal-migration-integration.test.ts:768-770,945；config 实为 1_200_000 上限）；「禁止拆
     hook/test 分摊预算」已写入返工答复第 5 条。
- GLM: **agree（2026-08-10，本人数据/覆盖设计复审，附 2 条非阻塞卡文修正）**——根因诊断、
  source-proof 独立性、full/compact digest 等价门方向均核实成立；compact-P6→full-P7 尚须新建
  入口（非纯调用现有函数），卡文应把"minimal"口径写实。见下。
- counter / 分歧处理: 无未决项；Kimi 三条 counter 已由 2026-08-11 返工答复 + 本人复跑闭合，
  GLM 2 条卡文修正已落入锚点与返工方案。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-11；Codex / Kimi / GLM 三方 design agree 齐）**

#### Kimi 复签证据（2026-08-11，本人；命令均为本会话实跑）

- **A/B 独立复跑**（同一 `TYPE_PAL_MIGRATE_TEST_GATE=canary`、串行独立冷进程、同 main HEAD）：
  - full：`getPalTestGeneratedFixture()` → producer **113,335.42ms**、wall **114.10s**、
    user+sys 121.96s、max RSS **1,730,412,544B**、snapshot files=535、cadence/confirm snapshots 在位。
  - compact：`getPalTestSourceDispositionFixture()` → producer **64,908.92ms**、wall **65.54s**、
    user+sys 72.06s、max RSS **1,503,232,000B**、11 keys。
  - 本人实测墙钟收益 **-48.56s / -42.6%**（Codex 轮 -31.2s / -26.9%）——两轮独立测量同向且均
    远超 18s 门。注意两轮 compact 均跑的是 narrow P7（11 字段），与最终方案「compact P6 + full P7」
    存在收益归因残余（早期释放 vs 窄产出计算量差异未分离）；最终证明以后验门为准。
  - Codex 轮 RSS 1.78x 异常（2.62GB）**在本人复跑中未重现**（1.50GB ≈ full 1.73GB）——RSS 高
    方差证实，「不再声称 compact 省内存」与「max RSS ≤ full control 后验门」的处理正确。
- **约束面核实**：180s/240s 内联参数未动（pal-migration-integration.test.ts:768-770,945）；
  FRESH 保持单进程串行、不引入 worker；不复用 prepared authority；默认 release 路由未改。
- **签名边界**：本 agree 只解除 build 准入；done 仍需实现后三方 implementation accept +
  连续三次 fresh 成功 + OPS 主卡 full baseline。

#### GLM 数据/覆盖设计复审（2026-08-10，本人，非代理）：**agree（附 2 条卡文修正）**

**根因诊断核实成立**：`pal-migration-integration.test.ts:768-770` 的 `beforeAll(() => { fixture =
buildStrictPalMigrationFixture() }, 180_000)` 是**内联** 180s hook（非 config 文件）；`:772` body 是独立
240s 内联 timeout。`buildStrictPalMigrationFixture`（:661）同步串行 source load + current build + R13-4 +
R13-5 clone/build/audit（:682-687）+ P7 canonical（:688-700 经 p7-generated.ts:420-422 的
`buildValidatedP6TransformChain`），同步 CPU 阻断 timer 在 180s 抢占——诊断真实。

**full/compact digest 等价门可构建**：full producer（p7-generated.ts:420 `buildP7GeneratedCanonical`）与
compact subset producer（:275 `buildP7SourceDispositionGeneratedFromValidatedOutput`）计算同名字段
（snapshot/ir/ledgerDraft/c8/auto/scene/itemThrow/confirm/crossActivation evidence），且两边都有
`chain.inputs !== args.*` 身份守卫（:153-159 / :279-285）可作为 digest 前的输入等价断言点。single caller
blast radius（buildP7GeneratedCanonical 仅 pal-migration-integration.test.ts:689 一处调用）→ fresh 换
compact 输入不影响 release-pal-shared 的 full 矩阵。

**source-proof 独立性核实成立**：buildValidatedP6TransformOutput（shadow-harness.ts:1571-1663）逐阶段
验证 + 释放（p2=undefined@1606 … p5=undefined@1662），fresh 仍现场 source-backed 构建，不读
shared/canary/prepared authority。设计 item 4（R13-5 build 排到 P7 之后降峰值）合理，且禁止用 current
`theirs` 冒充 historical R13-5 的边界写明。

**2 条卡文修正（非阻塞，build 前落卡文）**：
1. **timeout 锚点修**：卡文「vitest.release.config.ts:45-65 的 fresh isolate/timeout 配置」误导——
   实际 180s/240s ceiling 是 **pal-migration-integration.test.ts:770/:945 的内联 override**，config 里是
   1_200_000 上限。范围外「不改变已有 timeout 数值」应同时点名这两处内联值，否则实现者可能漏改。
2. **"minimal/推广现有"口径修**：buildValidatedP6TransformOutput（compact P6）存在且 canary-scoped，
   但 compact-P6→**full P7GeneratedCanonical** 的入口**当前不存在**——现有 compact 产物是 11 字段 subset
   （P7SourceDispositionGenerated），而 fresh final-consumer `createR13EnemyScriptV5MigrationPlan`
   （r13-enemy-script-mg2.ts:639）与 `PreparedR13EnemyScriptAuthority.generated`（:164）硬钉 full 类型。
   故设计 item 1「增加接收 P6ValidatedTransformOutput 的窄入口」是**净新建承重代码**（新 P7 入口 +
   类型解钉），非"纯调用现有函数"。卡文「推广现有 buildValidatedP6TransformOutput」措辞偏轻，应写明
   新入口 + 消费端类型解钉是必要新增，以保"minimal"诚实。

Evidence: pal-migration-integration.test.ts:661-700,768,772 / shadow-harness.ts:1571-1663 /
p7-generated.ts:275-285,420-422 / r13-enemy-script-mg2.ts:164,639。只读核查，未改实现文件，未代签 Kimi。
Kimi 真实复审（算法单源/内存释放）仍 pending。

### 进入 done 前：实现签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

先做只读、可重复的最小复现矩阵：单 fresh 文件、只跑目标测试、完整 cold chain、带/不带
profiler；每次记录 monotonic wall、raw JSON、进程树 RSS、临时事务目录和 git/source digest。
确认根因后只修上游冷链或 fixture 生命周期，避免在 runner 层掩盖问题。

冻结的候选实现边界：

1. 在 P7 builder 增加接收 `P6ValidatedTransformOutput` 的窄入口，并解钉 fresh final-consumer 所需的
   full snapshot 类型；它必须与 `p7-generated.ts:275-403,420-422` 的现有流水线收敛为单一后续生产逻辑，
   不能再叠加第三份 P7 算法，也不能用 canary 的 11-field `P7SourceDispositionGenerated` 冒充 full 产物。
2. 新增 full-chain vs compact-chain 定向测试，比较 P6 IR、ledger、P7 snapshot、C8/auto/scene/itemThrow/
   confirm/cross-activation evidence digest；任一差异 fail-closed。
3. 只有 `release-pal-fresh` 的 final-consumer 改用 compact 输入；`release-pal-shared` 中需要 P2-P6
   中间矩阵的证明仍调用 `buildValidatedP6TransformChain`，不得删减。
4. 可将独立 R13-5 build/audit 延后到 P7 compact 图释放之后，减少峰值重叠；其 source clone、historical
   profile 和 audit 身份保持独立。
5. package timeout、Vitest route/list、skipIf、baseline/project/authority 输入与默认 release 命令均不变。

### 根因诊断（2026-08-10，只读）

- 命令：`pnpm exec vitest run --config vitest.release.config.ts --project release-pal-fresh
  src/pal-migration-integration.test.ts --reporter=verbose`。
- 结果：real **199.74s** / user 151.84s / sys 26.82s；Vitest Duration 199.08s、tests 197.31s，
  明确报 `Hook timed out in 180000ms`，定位 `pal-migration-integration.test.ts:768`；`:772` test body
  skipped。
- 既有 profiler full raw：fresh 362.589s、exit=1、signal=null、process-tree max RSS
  2,068,217,856 bytes；integration file failed、目标 assertion skipped。故不是 OOM、signal 或磁盘事务。
- 机制：`buildStrictPalMigrationFixture()` 在一个同步 `beforeAll` 内串行执行 source load、current build、
  historical R13-4 build/audit/census、R13-5 build/audit、P7 canonical 等多套 source-backed authority；
  同步 CPU 工作使 Vitest timer 无法在 180s 时抢占，函数返回后才结算 hook timeout。
- 代码热点：fixture `pal-migration-integration.test.ts:661-700` 在 2026-08-09 后新增独立 R13-5
  clone/build/audit（`:682-687`），随后 `buildP7GeneratedCanonical`（`:688-700`）经
  `p7-generated.ts:420-422` 调用 `buildValidatedP6TransformChain`，同时保留 P2-P6 全部中间图；
  采样显示 physical footprint 约 2.5GiB、peak 约 2.7GiB，并有大量 GC/StringAdd/ArrayMap。
- 分段诊断（在进入第二个 R13-5 build 后即停止，未再跑完整长命令）：source load 13.9s、baseline
  0.34s、current build 6.25s、parent clone/build/audit/census 累计至 33.18s、第二份 R13-5 source clone
  累计至 34.82s；剩余主要成本位于 R13-5 全建/audit 与后续 P7 canonical 链。
- 最小修复候选仍须真实 Kimi/GLM 先审：推广现有 `shadow-harness.ts:1571-1663`
  `buildValidatedP6TransformOutput` 的逐阶段验证/释放模型，新增“从 validated final P6 output 构建完整
  P7”的适配；先证明 full-chain 与 compact-chain 的 P6 IR/ledger、P7 snapshot/evidence digest
  等价，再让 fresh final-consumer 使用 compact 输出。fresh 仍现场独立 source-backed 构建，不读取
  shared/canary/prepared authority。可把 R13-5 build 排在 P7 之后进一步降低图同时存活峰值，但不能用
  current `theirs` 冒充 historical R13-5。禁止提高 timeout、挪到 body/拆测试躲避、读取 golden
  authority 或删除任何逐阶段验证。

### 已知风险

- 根因可能是 180s `beforeAll`、240s body、资源竞争或隐藏的重复建链；错误归类会导致错误修复。
- 冷链单次耗时数分钟，需保留中断/失败报告，不能以一次成功偶然样本结论。

## 交接日志

- 2026-08-10 Codex: 建卡。Evidence: OPS 主卡 profiler 失败摘要与 fresh 原始 JSON 路径。Next:
  先由真实 Kimi/GLM 对调查设计签 `agree`，之后 Codex 只做根因复现与最小修复。
- 2026-08-10 Codex: 单文件 verbose cold 已确认 `beforeAll:768` 180s timeout；body `:772` skipped，
  非 OOM/signal/disk。Evidence: real 199.74s、Vitest 199.08s；既有 full fresh 362.589s / peak RSS
  2.07GB。Next: 真实 Kimi/GLM 审核“等强度冷链优化、不调 timeout/skip”的最小修复方向。
- **2026-08-10 14:31 JST：Codex 一次性 CPU profile 诊断（不构成收益或签字证据）。**
  命令为 `NODE_OPTIONS="--cpu-prof --cpu-prof-dir=/tmp/type-pal-fresh-cpu.eE4j3S" /usr/bin/time -l
  pnpm exec vitest run --config vitest.release.config.ts --project release-pal-fresh
  src/pal-migration-integration.test.ts --reporter=json --outputFile=/tmp/type-pal-fresh-cpu.eE4j3S/vitest.json`。
  exit=1；instrumented wall **460.01s**、user=408.15s、sys=80.66s；`time -l` max RSS/rusage
  **2,465,644,544 B**；page reclaims=5,540,133、page faults=818、swaps=0、involuntary context
  switches=6,726,212、signals=1,063,447。Vitest JSON `/tmp/type-pal-fresh-cpu.eE4j3S/vitest.json`
  为 1 suite/3 assertions（1 pass、1 fail、1 skip）；既有 verbose 证据仍把根因定性为
  `beforeAll:768-770` 的 180s hook timeout，`:772` body 未形成成功证据。
  `NODE_OPTIONS` 未让 Vitest fork worker 输出独立 profile；可解析的 parent GC 仅 0.274s/171 samples
  （约 0.0596%，只是下界）。SIGPROF/上下文切换使 460s 不能与未插桩 199.74s 比较，也不能单凭这次
  profile 宣称 compact 能省 ≥18s。**Kimi counter 的收益门仍未闭合**；若继续该方向，必须补不侵入的
  worker-level GC/RSS instrumentation 或受控 full/compact A/B，并保留三次 fresh 门禁；不能借 profile
  overhead 伪造收益。
- **2026-08-10 Kimi（本人真实席位设计复审）**：签 **counter（最小 3 条，方向认可）**。独立核实：
  根因代码事实属实（fixture 链 :661-700、hook :768-770 180_000 与 body :772-945 240_000 均为测试
  文件显式参数；同步阻塞机制成立）；P7 final-consumer 只消费 chain.inputs + chain.p6.ir/ledger
  （p7-generated.ts:154-408 全部 chain.* 引用已核），compact 窄输入机制可行；等价门工具现成。
  三条待闭合（见签字表）：①收益假设未证明——compact 不降 CPU，须先用 --cpu-prof/GC trace 冷跑
  量化证明内存路径能拿回 ≥18s，否则照样超时；worker 并行替代方案须论证取舍；②窄出口不能复用
  canary 的 P7SourceDispositionGenerated（缺 cadence/confirm parent snapshots），且须收敛
  p7-generated.ts:275-403 的存量重复 P7 流水线，不得叠加第三份；③卡文勘误（timeout 在测试文件
  非 config；禁止拆 hook/test 分摊预算）。Evidence: 本卡签字表；只读核查，未改实现文件。
  Next: Codex 补 GC/wall 量化数据与窄出口收敛方案后回 Kimi/GLM 复签；签字齐前不得实现。
- **2026-08-11 Kimi（本人复签）**：签 **agree（解除 build 准入）**。三条 counter 全部闭合：
  ①收益门——本人独立复跑 A/B（同 gate=canary、串行冷进程、同 HEAD）：full producer 113,335ms /
  wall 114.10s / RSS 1.73GB，compact producer 64,909ms / wall 65.54s / RSS 1.50GB，墙钟收益
  **-48.6s / -42.6%**（Codex 轮 -31.2s / -26.9%），两轮同向且远超 18s 门；Codex 轮 RSS 1.78x
  异常未在复跑中重现，证实 RSS 高方差，后验门（max RSS ≤ full control）才是约束。残余：两轮
  compact 均为 narrow P7，与最终「compact P6 + full P7」的收益归因未完全分离，最终证明以后验门
  为准。②P7 单源收敛方案（单一 pipeline + full capture 四 snapshot + 删除存量重复 + 完整等价
  digest 矩阵）与 ③卡文勘误均已落卡。约束面核实未动：180s/240s 内联原值、单进程串行、无
  prepared authority、默认路由。Evidence: 本卡「Kimi 复签证据」节；命令均为本会话实跑。未修改
  实现文件，未标 done。Next: Codex 受控 build；实现后以连续三次 fresh + digest 等价 + RSS 后验
  门申请三方 implementation accept。

### Codex counter 返工答复（2026-08-11；只读诊断，未改实现）

1. **收益门 A/B 已量化，但不把单样本冒充验收。** 两条命令都使用当前 main、独立冷进程、
   `TYPE_PAL_MIGRATE_TEST_GATE=canary`，读取同一 PAL source/baseline；区别仅是仓库现有的
   `getPalTestSourceDispositionFixture()`（validated P6 final output + narrow P7）与
   `getPalTestGeneratedFixture()`（full P2-P6 chain + full P7）：
   - compact probe：`/usr/bin/time -l pnpm exec tsx -e "...getPalTestSourceDispositionFixture()..."`
     → producer **84,911.53ms**，wall **85.84s**，user/sys **102.06/9.72s**，max RSS
     **2,621,784,064B**；snapshot files=535，IR/ledger 均存在。
   - full probe：`/usr/bin/time -l pnpm exec tsx -e "...getPalTestGeneratedFixture()..."`
     → producer **116,141.12ms**，wall **116.97s**，user/sys **116.55/8.97s**，max RSS
     **1,473,691,648B**；snapshot files=535，cadence/confirm snapshots 均存在。原始 full 输出保存在
     `/tmp/type-pal-full-canary-ab.log`。
   - 同 gate 单样本差值：producer wall **-31,229.60ms / -26.9%**，超过 Kimi 要求的 18s；
     user+sys 仅减少 **13.74s**，且 compact RSS **+1,148,092,416B / 1.78x**。因此本证据只支持
     “final-output 路径有足够墙钟收益进入受控实现验证”，**不支持**“compact 省内存”或“已稳定通过”。
2. **GC trace 未被夸大。** 直接以 Node `--trace-gc --trace-gc-nvp` 启动同一 fresh 文件，JSON 为
   2 passed + 1 static skipped；目标 test body 215,873.81ms。日志只含 parent PID 的 61 个事件，
   pause 合计 **79.7ms**、max 4.9ms，worker 没继承 trace；路径为
   `/tmp/type-pal-fresh-gc.log` 与 `/tmp/type-pal-fresh-gc-vitest.json`。它既不能量化 worker GC，
   也不计成功 release baseline；只用于否定“现有 parent GC 已证明 18s”这一错误结论。
3. **P7 单源收敛（关闭 Kimi #2 / GLM correction #2）。** 若 Kimi 复签，build 只允许抽出一个私有
   canonical pipeline，输入只依赖 `inputs + p6.ir + p6.ledger`，按现有唯一顺序执行 project→C8→
   lifecycle→scene semantic→trigger/idle→item throw→confirm→equip。full-chain 与 final-output
   两个 public adapter 只能把各自 validated P6 view 交给这同一 pipeline；full capture 必须返回
   `r13CadenceParentSnapshot`、`r13CrossActivationParentSnapshot`、`r13ConfirmParentSnapshot`、
   `r13ConfirmSuccessorSnapshot`、project 与全部 evidence，不能复用缺字段的 11-field canary 类型。
   source-disposition adapter 只在 pipeline 完成后裁剪返回引用，不得保留现有第二份算法，更不得新增
   第三份。等价测试须比较 full snapshot、四个 parent/successor snapshot、project、P6 IR/ledger 和
   C8/auto/scene/trigger/idle/itemThrow/confirm/equip 全部 evidence digest；任一差异 fail-closed。
4. **并行替代明确不取。** 本次 compact probe 已出现 2.62GB RSS；在未闭合单进程 RSS 前并行三条
   source-backed 链会放大峰值，并越界进入尚未设计三签的 OPS-TST-PERF-B。FRESH 本卡保持串行；
   不新增 worker 并行、不与 shared/canary 共享 authority、不改变默认 release 路由。
5. **timeout/身份门保持原值。** 180s hook 与 240s body 是
   `pal-migration-integration.test.ts` 的内联参数，不是 config；禁止拆 hook/test 分摊预算，禁止调大
   timeout、skip、预构建 authority。实现后必须先连续三次独立 fresh 成功；若任一次超时、RSS 不可
   采样、full/final-output digest 不等或 max RSS 高于现 full control，则返工失败并保持 blocked。

**Codex 结论：agree（返工设计），请求 Kimi 只读复签。** 本节不构成 Kimi/GLM 签字，不授权实现。

### Codex 受控 build 实现证据（2026-08-11；未代签）

- **P7 单管线收敛**：`p7-generated.ts` 已删除原 source-disposition 的第二份流水线，新增一个私有
  `buildP7GeneratedCanonicalPipeline`；full-chain、validated-final-output 和 source-disposition 三个
  适配器只调用该 pipeline。full capture 保留 cadence/cross/confirm 四个 snapshot、project、P6
  IR/ledger 与全部 evidence；source-disposition 仅在 pipeline 完成后裁剪 11 个返回字段。
- **Fresh final-consumer**：`pal-migration-integration.test.ts` 用逐阶段验证/释放的
  `buildValidatedP6TransformOutput` 接入完整 P7 output；R13-5 独立 source container/build/audit
  在 P7 后启动，仍不读取 prepared/canary authority。历史/current source 现在复制独立容器而共享
  只读源页/asset bytes，沿用 canary 的 isolation contract，避免 `structuredClone` 重复整棵资源树。
- **等价门**：`p6-shadow.pal.test.ts` 真实 PAL 源分别构建 full P2→P6 与 compact P2→P6，比较
  IR/ledger，并用 `digestP7GeneratedCanonical` 比较 full/final-output 的 snapshot、四个历史
  snapshot、project 及 C8/auto/scene/trigger/idle/itemThrow/confirm/equip 全部 evidence；通过耗时
  146.649s，未改 source/baseline/project 真值。
- **验证**：migrate typecheck 通过；fast gate `83 files / 626 tests` 全绿（5 个既有静态 skip）；
  canary 重新生成 oracle fingerprint 后 `2/2` 通过；manifest generator 仅将 release tests
  `757→758`（files 107 不变）并重算 sha/route digest。
- **连续 fresh（独立冷进程、完整 release-pal-fresh 路由、原 180s/240s）**：
  - `/tmp/type-pal-fresh-final-1.json` + `.log`：success，6 passed + 1 既有 unlisted static skip，
    integration body 172.950s，process-tree RSS 2,892,922,880B。
  - `/tmp/type-pal-fresh-final-2.json` + `.log`：success，6 passed + 1 既有 unlisted static skip，
    integration body 205.175s，process-tree RSS 2,835,972,096B。
  - `/tmp/type-pal-fresh-final-3.json` + `.log`：success，6 passed + 1 既有 unlisted static skip，
    integration body 190.670s，process-tree RSS 2,844,229,632B。
  三次均 exit 0、listed identity 无 skip/failure；RSS 最大约 2.694GiB，低于本卡记录的 full
  control 约 2.7GiB 与 OPS fresh 3.5GiB hard budget。一次早期深拷贝对照（`run1`）不计入成功序列；
  后续浅容器修复后的三次才是正式证据。
- **已知残余门禁**：还需至少一次完整 `test:release:profile` full report 与 OPS 主卡要求的 serial
  control/三次 full baseline；随后 Codex implementation self-review，并由用户转发真实 Kimi/GLM
  implementation `accept`。本条不构成任何席位签字，任务保持 `Status: build`。

## 下一位 Agent 提示词

```text
接手任务：OPS-TST-PERF-FRESH 受控 build 实现
任务卡：docs/ops/tasks/OPS-TST-PERF-fresh-hook-timeout.md
当前状态：build；三方 design agree 齐（Codex / GLM 2026-08-10、Kimi 2026-08-11 复签），build 准入
allowed。
你的角色：唯一 Coding Owner，按「Codex counter 返工答复」冻结方案实现。
要点：P7 抽单一私有 canonical pipeline（project→C8→lifecycle→scene semantic→trigger/idle→
item throw→confirm→equip），full-chain 与 final-output adapter 共享同一 pipeline；full capture 含
四个历史 snapshot + project + 全部 evidence；删除 p7-generated.ts:275-403 存量重复流水线；
source-disposition 只在 pipeline 完成后裁剪返回引用；新增 full/final-output 完整 digest 等价门；
只让 release-pal-fresh final-consumer 改用 validated final P6 output；R13-5 build 可延到 P7 图
释放之后但身份独立。
不要做：不得调大 180s/240s（pal-migration-integration.test.ts:768-770,945 内联原值）、不得拆
hook/test 分摊预算、不得 skip、不得复用 prepared/canary authority、不得引入 worker 并行（OPS-TST-PERF-B
另卡）、不得改默认串行 release 路由、不得标 done。
验收：连续三次独立 fresh 成功；任一次超时、RSS 不可采样、digest 不等或 max RSS 高于现 full
control 即返工并保持 blocked；保留 raw JSON/RSS/事务证据写回本卡。done 仍需 Codex/Kimi/GLM 三方
implementation accept。
```
