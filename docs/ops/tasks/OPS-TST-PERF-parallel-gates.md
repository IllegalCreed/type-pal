# OPS-TST-PERF-B - shared/fresh 隔离并行 release runner

Status: build
Execution: blocked inside build（current-v4 authority 表示合同在 focused gate fail-closed；
实现候选不可提交，交由 ARCH-CURRENT-ONLY-1 单版本收口；最终 proof 继续延后）
Phase: ops
Capability: test infrastructure / release gate
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none（2026-08-10；须由用户转发真实席位复审）
Branch: main

## 目标

在 A profiler 完成、fresh 超时根因闭环后，增加显式的 shared/fresh 隔离并行 runner，目标是
在不改变 release 证明内容的情况下减少约 6 分钟墙钟；默认 `test:release` 继续保持串行，
并行只有在完整资源与三次串行对照门禁通过后才可讨论默认化。

## 范围

- 范围内:
  - 新增显式 `test:release:parallel`（或等价命令），仅并行 `release-pal-shared` 与
    `release-pal-fresh`。
  - manifest、canary、`release-preflight + release-unit` 仍串行且先于两个 PAL child；canary
    不得与 PAL worker 同时运行。
  - 每个 child 的 gate env、TMPDIR、Vitest JSON、日志和 fresh transaction root 完全唯一。
  - 递归采样 child process-tree RSS、sibling 取消、失败汇总和可审计报告。
- 范围外:
  - 不改 shared 的 `pool=forks,isolate=false,fileParallelism=false` lease 语义；不跨进程共享 authority。
  - 不删 source-backed 测试、不把 canary/prepared/pinned 产物当 release 输入、不改默认 `test:release`。
  - 不在开发期跑剧情/战斗视觉。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `OPS-TST-PERF-release-wallclock.md` 的 B 约束和 `OPS-TST-PERF-test-fixture-stratification.md`
    的 G3/G6/G7 为本卡合同。
  - shared 进程内 cache 可复用；fresh 必须独占磁盘事务；并行失败不得静默回退串行。
- 代码锚点(`file:line`):
  - `packages/migrate/vitest.release.config.ts:19-68`（四组配置）。
  - `packages/migrate/package.json:9-17`（现有串行脚本）。
  - `packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:65-88,128-160,205-221`（lease/cache）。
  - `packages/migrate/src/pal-migration-integration.test.ts:110-118,591-600`（fresh 临时事务）。
  - `packages/migrate/scripts/profile-release.mts`（A 的 child/report/RSS 失败语义）。
- 已知坑 / 审计文档:
  - shared 历史 profiler 峰值为 **3,218,849,792 bytes（约 3.0 GiB / 十进制约 3.2 GB）**；
    另一轮完整 shared 审计记录约 **2.6 GiB**。两者是不同运行样本，均低于 4.5 GiB 单 child
    上限；并行仍会叠加 RSS 和磁盘压力。证据：`OPS-TST-PERF-release-wallclock.md:288`、
    `OPS-TST-PERF-test-fixture-stratification.md:345-352`。
  - 当前无 parallel runner；不能仅把两个 Vitest 命令放入 `Promise.all` 就宣称隔离。
- 不得重新引入:
  - 共享 TMPDIR/report/authority、缺 RSS 当成功、子进程失败后静默改跑串行、写入 baseline/project。
- 相关测试:
  - manifest/list、A profiler smoke/full、release shared/fresh 定向组，以及三次串行对照。

## 前提真值矩阵

一句话前提：manifest/canary/preflight/unit 完成后，shared 与 fresh 的证明内容相互独立，可以在
**不同进程、不同临时根和不同报告根**中重叠执行；任何资源遥测或 serial 等价证据不闭合时，显式
parallel 命令必须失败，默认串行命令保持不变。

| 真值面 | 当前事实 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：纯 Reforge 测试基础设施，不涉及原版机制或用户内容行为。 | 任务范围仅为 `packages/migrate` release gate。 |
| 第一阶段 | N/A：第一阶段没有本 release gate，也不是本任务的行为真值。 | `docs/phase2/READ-FIRST.md:1-18`。 |
| 当前二阶段 | `test:release` 仍是 manifest→canary→单 Vitest release 的串行链；release 内有 preflight/unit/shared/fresh 四组，shared 只允许进程内 prepared lease，fresh 独立磁盘事务；A profiler 已有唯一 run root、进程组终止、1s process-tree RSS 与 fail-closed 报告骨架；fresh 根因卡已 done。 | `packages/migrate/package.json:8-17`；`vitest.release.config.ts:13-68`；`pal-test-fixture.ts:65-88,100-125,205-221`；`pal-migration-integration.test.ts:110-118,591-600`；`profile-release.mts:25-48,241-350,511-606,688-729,839-850`；`OPS-TST-PERF-fresh-hook-timeout.md:1-12,173-181`。 |
| 本任务目标 | 只新增显式 parallel runner；先串行完成 manifest/canary/preflight/unit，再并行 shared/fresh；child 的 env/TMPDIR/report/log/transaction root 全隔离，资源、路径、报告或等价性任一失败即杀 sibling 并非零。 | 本卡“范围”“冻结的资源与失败矩阵”“验收条件”；母卡 `OPS-TST-PERF-release-wallclock.md:57-74`。 |

最强替代解释：主要耗时也可能来自 shared 内部重复冷建或 fresh 自身链路，而不是两个独立组无法重叠；
若实测并行没有稳定收益，或只靠共享 authority/放宽门禁才能提速，本卡不得改默认命令，显式 runner
也不能报告成功。

可证伪观察：shared/fresh 触碰同一临时根或 authority、canary 与 PAL worker 重叠、serial/parallel
任一 title/digest/skipped/write 集不等、RSS 采样不可用/超预算、或三次同机同批次对照没有稳定收益；
出现任一项即保持默认串行并进入 `rework/blocked`。

## 冻结的资源与失败矩阵

- 参考机物理内存低于 **12 GiB** 时拒绝启动并行。
- shared child-tree peak RSS 上限 **4.5 GiB**；fresh **3.5 GiB**；两者合计峰值 **7.5 GiB**。
- RSS 不可读取、超预算、spawn/exec/timeout、signal/OOM、路径冲突、报告缺失/不完整、清单不闭合：
  终止 sibling、保留各自 raw log/report、runner 非零；不得静默串行回退。
- 每次 run 必须写唯一 run root，并将 child PID/进程组、环境摘要、RSS samples、exit/signal、
  wall、files/tests/assertions/skipped、writes/deletes/conflicts 和 digest 汇总到稳定 JSON。

## 验收条件

- 功能:
  - 默认 `test:release` 输出与现状完全不变；只有显式 parallel 命令启用并行。
  - manifest→canary→preflight/unit 串行完成后才 spawn 两个 PAL child；任一 child 失败会取消另一个。
  - child 临时路径/环境/报告可机检唯一，baseline/project/authority 无写入。
- 测试:
  - 连续 **三次** parallel 与 canonical serial control 对照；每次 digest、test title/list/count、
    listed/runnable、skipped/unlistedSkipped、writes/deletes/conflicts 必须逐项相等。
  - 三次均记录 wall/RSS，且满足预算；缺任何阶段报告或采样即 fail-closed。
  - typecheck、manifest、diff check、release 定向测试通过。
- 文档:
  - 写明 runner 协议、失败矩阵、三次 serial/parallel 原始报告路径及中位/最大 wall/RSS。
- 视觉 / 手工验证: N/A；剧情视觉集中 E2E。

## 推进签字

### 进入 build 前：设计签字

- Codex: **premise verified + design agree（2026-08-17，本人一手读码 + 现场清单核验）**。
  - 四项目 groupOrder、默认串行脚本、shared 进程内 lease、fresh 独立临时事务与 A profiler 的
    process-tree RSS/进程组终止/fail-closed 报告骨架均已直接核实；fresh 前置卡为 done。
  - **PB1 已闭合**：3.2 数字来自母卡保存的 profiler 报告，精确峰值
    `3,218,849,792 bytes`（`OPS-TST-PERF-release-wallclock.md:288`）；2.6 GiB 是另一轮审计样本，
    不是同一运行的冲突值。卡文已改为双样本并列。
  - **PB2 携带进入 build**：三次 serial control 必须与 parallel 同机、同日/同批次，并在同一稳定
    run report 记录机器、负载、routeSha256、title/count/skipped 与 writes/deletes/conflicts；不满足
    即失败，不得用环境漂移解释性能结论。
  - design agree：只新增显式命令、默认串行不变、先串行 canary/preflight/unit、双 child 独立根、
    预算与失败矩阵 fail-closed。最强替代解释与可证伪观察已写入前提矩阵。
- Kimi: **premise verified + design agree（2026-08-17，本人一手读码，非代理；完全携带 PB1-PB2）**。
  逐项独立核实：
  - **四配置组与 lease 语义属实**：`vitest.release.config.ts` preflight(groupOrder=0)/unit(1)/
    shared(2)/fresh(3) 顺序正确；shared `pool=forks, isolate=false, fileParallelism=false`
    （:45-55，进程内 cache 复用为设计本意）与 fresh `isolate=true, fileParallelism=false`
    （:58-67）隔离边界清晰；`package.json:9-17` 现状纯串行（manifest→canary→release），无
    parallel 命令——「默认不变、显式启用」边界成立。
  - **A profiler 基础属实**：`profile-release.mts` 有 run-unique root（:25-31）、1s RSS 采样
    （:33）、进程组终止 `-child.pid`（:38-48）与 SIGINT/SIGTERM 转发——并行 runner 可复用该
    骨架而非新发明。
  - **隔离/失败矩阵架构上成立**：两 child 各自单 worker（fileParallelism=false），不存在 CPU
    超订阅；shared 只读 prepared 源、fresh 独占磁盘事务，无共享 authority；fail-closed 矩阵
    无静默串行回退路径。三次 serial/parallel 数据守恒对照（digest/title/count/skipped/
    writes/deletes/conflicts 逐项相等）可机检。
  - **携带 PB1/PB2**：3.2GiB 与母卡实测 2.6GiB 不一致须钉出处（PB1）；serial control 同机
    同批次同环境摘要（PB2）——两钉均是可证伪性补强，我独立同意。
  - 补充观察（不另立钉）：manifest/canary/preflight/unit 串行先行再 spawn 双 child 的调度顺序
    与现有 groupOrder 语义一致；canary 不与 PAL worker 并行的约束须在 runner 代码里显式编码
    （而非仅靠文档），验收的「报告缺失/不完整即 fail-closed」已覆盖。
  未改实现文件，未代签 Codex/GLM，未标 build/done。
- GLM: **premise verified + design agree（2026-08-17，本人一手读码，非代理；附必落钉 PB1-PB2，
  不阻塞准入）**。锚点独立核实：
  - 四配置组实存且序正确（vitest.release.config.ts:20 preflight groupOrder=0 / :31 unit=1 /
    :45 shared / :58 fresh）；package.json:9-17 现状纯串行、无 parallel 命令；
    profile-release.mts 已有 child 进程组 kill（:42 `-child.pid`）与 RSS 采样（:33 1s 间隔）——
    A profiler 基础属实。
  - fixture gate/lease 锚点（pal-test-fixture.ts:65-88,100-125）与 fresh 临时事务锚点属实。
  - 数据守恒验收（digest/title/list/count/listed/runnable/skipped/unlistedSkipped/
    writes/deletes/conflicts 三次逐项相等）**可机检**：Vitest JSON 供 titles/counts/skipped，
    每 child 唯一 fresh transaction root 供 writes/deletes/conflicts；fail-closed 矩阵
    （RSS 不可读/超预算/signal/路径冲突/报告缺失）设计正确，无静默串行回退路径。
  - **必落钉 PB1（RSS 数字锚定）**：本卡"shared 历史峰值约 3.2GiB"与母卡实测记录"约 2.6GiB"
    （release-wallclock:45，1992.69s run）不一致，3.2 出处未见——预算 4.5/3.5/7.5GiB 对两者均
    安全，但 build 前须把 3.2 钉到具体 profiler 报告路径，或改用 2.6 实测 + 余量推导并记入卡。
  - **必落钉 PB2（serial control 同机同时）**：三次对照的 serial control 必须与 parallel 在同一
    参考机、同日批次运行并同记 run report（机器/时间/负载摘要），防 digest 相等但 wall/RSS 因
    环境漂移不可比；listed/runnable 对照以 manifest routeSha256 为锚。
- counter / 分歧处理: 任何资源/隔离/失败矩阵 counter 均保持 blocked。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-17）——Codex + Kimi + GLM 三方 premise/design 签字齐；
  PB1 已以精确 profiler 锚点闭合，PB2 与冻结失败矩阵作为 build/验收硬门禁。**
- 2026-08-19 前提失效：恢复审计暴露的 canary 修复越界到了历史地图结构；用户明确裁决所有
  地图证明必须消费当前 canonical v4。上述三方签字保留为 runner/proof protocol 的历史事实，
  **不再授权当前 rework build**；须基于下述 v4-only 真值补充 Codex/Kimi/GLM 三方
  `premise verified + design agree` 后才能继续改实现或运行 canary/proof。

- 2026-08-19 GLM（数据/机械核对）: v4-only 前提补充审查完成，签 **premise verified + design agree
  （附 PB3-PB4）**。223/223 v4、digest 含 maps 机械成立、越界层实锤；**替代解释两前提均被证伪
  （seal 按构造 whole-content + 地图域无独立 authority）——v4 重建是唯一修复层**；受影响面含
  R13 常量/7 消费者/越界层/双 manifest + 凡 digest 覆盖 maps 的 rewind seal（c1 抽查不含）；
  leaf/route/coverage/transaction 保持证据清单与 PB3 逐 seal 域普查、PB4 owned-leaf sha256
  对照表已列。未改实现未跑长测。

### 2026-08-19 v4-only 前提补充（三方重签已齐）

一句话前提：当前工程 223 张地图已经完整切换为 ProjectMap v4；R13/release 的 live proof 必须
直接消费 v4 source/baseline/project，历史由 Git 保存，不得通过 v2 body/hash 投影维持旧 seal。

| 真值面 | 当前事实 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：本纠偏是开发期 canonical schema 与测试 authority，不涉及原版地图机制。 | `AGENTS.md:24`；`docs/phase2/READ-FIRST.md:28`。 |
| 第一阶段 | N/A：第一阶段没有 ProjectMap v4/R13 release proof。 | `docs/phase2/READ-FIRST.md:1-18`。 |
| 当前二阶段 | `ProjectMap` 唯一接受 v4；当前 PAL 223 图已原子迁移为 v4，v2/v3 parser/upgrader/fallback 已删除。R13 whole-content digest 会遍历所有 managed body，因此地图合法切版必然改变该 digest。 | `packages/content/src/project-map.ts:303-313`；`docs/ops/tasks/ED-STAMP-MAP-MODEL-1-shared-isometric-content-relative-height.md:340-347`；`packages/migrate/src/experimental/script-v5/source-instruction-disposition.ts:706-712`。 |
| 本任务目标 | 删除 `703edf05..cfaccb39` 引入的 pre-v4 map hash/body authority；在 v4 live producer 上机械重建受影响的 R13 parent/successor/seal/oracle authority，逐项证明 enemy/script owned leaf 与 route/coverage 不变，再恢复 B canary 与三组 proof。 | 用户 2026-08-19 本轮裁决；`packages/migrate/src/experimental/script-v5/r13-enemy-script-augmentation.ts:26-30,635-641`；本卡三次 fail-closed 记录。 |

最强替代解释：如果 R13 seal 本意只覆盖 enemy/script owned domain，则正确修复可能是把无关地图域从
whole-content seal 分离，而不是每次 canonical 地图切版都更新整包 digest。推翻“重建 v4 whole-content
seal”的观察是：primary-source seal 合同明确要求 domain-scoped digest，且已有独立全内容 authority
覆盖地图域；在此尚未由 Kimi/GLM 独立核实前不得选择修复层。

可证伪观察：任何 v2/v3 value、pre-v4 hash、legacy map parser/upgrader/fallback 进入活代码；v4 source
producer 与当前 project/baseline 不一致；更新 seal 时 enemy/script owned leaf、route/title/coverage 或
transaction evidence 发生未解释变化。任一出现即继续 `rework`。

#### Kimi 重签（2026-08-19 v4-only 前提补充；本人一手读码，非代理）

**裁决：机械重建 v4 whole-content seal，反对把地图域从 R13 seal 分离。**

Primary-source 证据（三点，均为本席直接打开核实）：

1. **seal 合同是 whole-content 而非 domain-scoped**：`digestR13ContentSnapshot`
   （source-instruction-disposition.ts:706-712）对快照中全部 managedFiles 的完整 path/value 排序
   哈希——没有域过滤参数，也没有任何「敌/脚本域」限定。`R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST`
   与 `SUCCESSOR_CONTENT_DIGEST`（r13-enemy-script-augmentation.ts:26-31）的职责名就是「parent
   content authority」，且在 :435/:458/:535/:635 与 r13-source-semantics-mg2.ts:1473 多处作为整
   快照权威被强制。enemy/script 的 owned leaf digest（PARENT/CURRENT_ENEMIES_DIGEST、SKILLS_DIGEST，
   :32-36）是在 whole-content 之上**额外**存在的细粒度锚——证明 seal 设计本身已分层：整包防伪 +
   域内语义，而非只有域内。
2. **parent digest 是 live producer 输出钉，不是冻结历史工件**：:734-735 显示 evidence 的
   parent/successor digest 由当前 source producer 现算现写。当前 canonical 合法切版（v4）改变
   producer 输出时，正确的维护路径就是机械重算并更新常量——这正是 seal 的预期生命周期，而不是
   seal 被破坏。「把 v4 投影回 pre-v4 以保旧 digest」（703edf05..cfaccb39 的做法）才是把 seal
   用错层：它让 seal 不再描述当前 producer 的真实输出。
3. **分离方案的反证条件不成立**：卡文最强替代解释成立的前提是「seal 合同明确要求 domain-scoped
   digest，且已有独立全内容 authority 覆盖地图域」。两点均不满足——合同是 whole-content（见 1）；
   R13 parent 这个特定历史组合没有第二处全内容 authority（leaf digest 只覆盖 enemies/skills，
   oracle/manifest fingerprint 管的是当前工程而非 R13 parent 组合）。把地图域分离出去会在 R13
   parent 证明里留下永久无覆盖面：未来任何非预期地图域漂移将不再被该 authority 捕获。

**重建的正确形态（本席认可的执行约束）**：

- 删除 703edf05..cfaccb39 的 pre-v4 hash/body 投影 authority（用户裁决为 rework）；
- 在 v4 live producer 上重算受影响的 parent/successor/seal/oracle 常量；
- 逐项机械证明重建只解释地图域变化：enemy/script owned leaf digest 逐字节不变、route/title/
  coverage 不变、transaction evidence 不变、managed list 与 generator epoch 不变（卡内
  2026-08-19 审计已给出 223 个 map-*.json 是唯一差异的基线）。

**可证伪观察（任一出现即继续 rework）**：

1. 重建 digest 时 enemy/script owned leaf、route/title/coverage 或 transaction evidence 出现
   无法用 v4 切版逐项解释的变化——说明重建掩盖了非地图漂移，停线。
2. 重建后仍有任何 pre-v4 hash/body 投影、v2/v3 value 或 legacy parser 进入活代码——违反
   v4-only，停线。
3. 若有人主张分离方案，必须先出示「whole-content seal 应为 domain-scoped」的 primary-source
   条款及地图域的独立全内容 authority——当前均不存在。

结论：**premise verified + design agree**——按机械重建 v4 whole-content seal 执行。
只读审查，未改实现，未运行 canary/proof，未标 build/done。

#### GLM v4-only 前提补充审查（2026-08-19，机械核对；本人一手读码 + census，非代理）

- **premise: verified**。四项机械核对：
  1. **223/223 图 v4**（本人 node 复数）；`validateProjectMap` 仅收 version 4 且 fail-loud
     （project-map.ts:303-313），v2/v3 parser 在实现包零残留（本人 rg）。
  2. **whole-content digest 必然含地图**：`digestR13ContentSnapshot` = 对全部 managedFiles
     排序 stableJson（source-instruction-disposition.ts:706-712）；`content/maps/*.json` 由
     migration 产出进 managedFiles（pal-migration.ts:809-827）——地图合法切版必然改变
     R13 parent/successor digest，前提主张机械成立。
  3. **越界层实锤**：`703edf05` 引入 932 行 `historical-map-surface-authority.ts`（v2
     body/hash 投影）+ 两处 manifest 重冻结；`f34dc375`/`cfaccb39` 扩展之——正是用户裁决
     必须删除的"以 v2 投影维持旧 seal"。
  4. **最强替代解释已被本人独立证伪（修复层裁决）**：其两个前提条件均不成立——
     (a) seal 合同**按构造即 whole-content**（digestR13ContentSnapshot 无任何 domain 分域）；
     (b) **地图域不存在独立 authority**（pal-oracle/v1/manifest 零 map 引用；15 个 transition
     seal 中无地图域 seal；c1 为 enemies/items/scenes/shared-scripts 逐文件域、不含 maps）。
     分域方案会使地图迁移完全无 seal 覆盖——**v4 whole-content authority 重建是唯一正确
     修复层**。
- **受影响面普查（本人机械枚举）**：R13 digest 常量（r13-enemy-script-augmentation.ts:26-30）
  及全部 digestR13ContentSnapshot 消费者（7 文件含 source-semantics-canary/cadence-evidence/
  existing-schema-augmentation 等）；historical-map-surface-authority.ts + 测试（删除）；
  pal-oracle/v1/manifest.json 与 test-manifest-v1.json（三个越界提交均改，须在 v4 上重冻结）；
  **凡 rewind 校验的 recorded digest 覆盖 map 文件的 seal 都在受影响面**——c1 本人抽查为
  逐文件域不含 maps（s000-s293 scenes + enemies/items/shared-scripts，无 maps），但 b10/w9
  的 contentDigest 计算域须在重建时逐 seal 机械判定（→PB3）。
- **v4 authority 重建后必须保持的证据（清单）**：
  - **leaf**：enemy/script owned 文件跨切版逐字节不变（v4 仅触 maps/stamps）——重建前后
    per-file sha256 对照表；R13 enemies 三方校验（parent/historical/current，:638-641）
    结果不变。
  - **route/coverage**：oracle `projectionSha256` 不变（仅 manifest source fingerprint 随实现
    移动）；测试计数冻结 fast 92/678、release 116/810、canary 1/2；三组 proof pair 的
    test-list/route digest 与 listed/runnable/skipped/unlistedSkipped 逐项相等。
  - **transaction**：受保护 workspace writes/deletes/conflicts = 0/0/0；每 child 唯一 fresh
    transaction root；四次 serial-control 与既有 proof pair 报告作为可比基线，v4 重建后
    新跑须复现同一守恒合同。
- **design: agree（附增量钉 PB3-PB4；PB1/PB2 继续有效）**：
  - **PB3（15 seal 域普查入卡）**：重建前机械枚举全部 15 个 transition seal 的 digest 域
    （whole-content vs 逐文件清单），受影响者重建、不受影响者（如 c1）显式列"已核不受
    影响"——任何 seal 不得被静默跳过。
  - **PB4（owned-leaf 不变性证明）**：重建前后 enemies.json 与全部 script chunk 的逐文件
    sha256 对照表入卡；任何 owned-leaf 变化即"未解释变化"按卡文可证伪观察继续 rework。
- 未改实现、未运行长测；本签字仅覆盖 v4-only 前提补充，runner/proof protocol 部分沿用
  2026-08-17 历史签字的事实地位。

#### Codex v4-only 前提补充重签（2026-08-19，最新 HEAD 独立复核）

- **premise verified**：本人在 `dacd7ec8` 机械复核当前 PAL 地图为 **223/223 version 4**；
  `7df14754..dacd7ec8` 的已提交漂移仅为 `packages/editor` **43 files**，未触及
  `packages/migrate`、`packages/content`、`packages/reforge`、`projects/pal` 或 B/C 卡，故
  Kimi/GLM 重签所依赖的 v4 source/seal 真值未发生变化。
- **修复层独立结论**：`digestR13ContentSnapshot` 对所有 managed body 做 whole-content digest，
  enemy/skills leaf digest 是额外细粒度锚；当前无覆盖同一 R13 parent 组合的独立地图 authority。
  因此同意 Kimi/GLM：删除 pre-v4 投影并在 live v4 producer 上机械重建 whole-content authority，
  不把地图域从 seal 分离。
- **design agree（携带 PB1-PB4）**：先保存 PB3 全 transition-seal digest 域 inventory 与 PB4
  `enemies.json + 全 script chunks` 逐文件 sha256 对照，再删除 `703edf05..cfaccb39` 投影层；只
  重建 PB3 判定受 v4 maps 影响的 authority。任何 owned leaf、route/title/coverage、transaction
  或未受影响 seal 漂移均 fail-closed。完成定向门禁并固定提交后，才运行三组正式 proof。
- 可证伪观察：最新 HEAD 若出现 migrate/content/project 漂移、任何 v2/v3 map 活代码残留、PB4
  非零差异或 PB3 未解释 seal 变化，立即退回 `rework`。本次只读复核未运行 canary/proof。

- v4-only build 重新准入结论：**allowed（2026-08-19，HEAD `dacd7ec8`）**——Codex/Kimi/GLM
  三方 `premise verified + design agree` 已齐，PB1-PB4 均为 build/验收硬门禁。

### 进入 done 前：实现签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

先定义可机检的 runner/report schema 和独立路径，再实现调度；serial control 必须保留，
并行结果不能复用同一 authority lease。任何“为了通过而回退串行”的路径都视为失败。

### 已知风险

- 两个 PAL child 的峰值 RSS 可能同时超过机器安全预算；必须在 spawn 前检查主机内存并持续采样。
- sibling 取消的信号传播、残留进程和临时目录冲突容易产生假成功，需故障注入测试。

## Build：实现与候选验证（Codex，2026-08-18）

- 2026-08-19 User：明确同意把既有 C1-3 首批 NPC 审批重新绑定到当前 v4 证明链。审批范围仅为
  proof provenance 重绑定：李大娘、酒剑仙的 2 个 actor、6 个 entity ref、163 个 dialogue
  identity 逐项语义不变，不修改 NPC、对话或剧情内容。旧 digest
  `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f` 保留为历史；新 digest
  `cd68376e08d834cc4b9d4a4d476eff35e69cc22515b29918cdcdcf4ea10768cd` 于
  `2026-08-19T10:05:21.000Z` 获用户批准。机械等价审计：
  `build/release-runs/v4-authority-rebuild-df147a94/c1-approval-rebind-audit.json`
  （`semanticEquivalent=true`，`semanticDecisionCount=173`）。

- 新增隔离 runner 与证明协议：`release-runner-core.ts`、`release-proof-protocol.ts`、
  `scripts/run-release-isolated.mts`、`scripts/prove-release-parallel.mts`；每个 run/child 使用独立
  process group、TMPDIR、日志、Vitest JSON、fresh transaction root，并记录递归 RSS、退出信号、
  title/count/digest 与 workspace writes/deletes/conflicts。默认 `test:release` 未改；parallel/control/
  prove 均为显式命令。
- 协议单测通过：runner/proof、当前/历史引用隔离共 **3 files / 93 tests**；migrate typecheck 通过。
- 首次 serial control 按失败矩阵正确 fail-closed：
  `build/release-runs/serial-control-2026-08-17T182936329Z-0776db40/summary.json`。manifest 与 canary
  通过，canonical release 失败，未继续 fresh；manifest/canary/release child-tree peak RSS 分别为
  `1,849,999,360 / 2,237,988,864 / 3,758,342,144 bytes`，均未越单 child 预算；受保护 workspace
  `writes/deletes/conflicts = 0/0/0`，总时长 `3,347,114ms`。
- 该 control 暴露并已修复三项 release 前置回归，而非绕过门禁：
  1. ED-ENEMY-1 把 current canonical 改为 stable `enemyTeamId` 后，历史 R13 证明仍需原数值引用；现由
     `historical-enemy-team-authority.ts` 在验证边界双向投影，current 产品入口保持 stable ID，历史
     canary/golden 仍 byte-exact。
  2. ED-5I 的完整 item-tree collector 已新增两条 `playSound` 和一条 portrait 真实边；冻结审计计数
     同步到 collector 的现行权威结果，没有修改生成内容。
  3. 原版 `script.c` opcode `0x79` 比较 `PlayerRoles.rgwName`，操作数 `36..41` 是角色姓名字；current
     canonical 现映射到稳定 actor ID，historical legacy 仍保留原数值，未知姓名字 fail-loud。
- 修复后验证：严格 PAL migration integration **1 passed / 2 skipped（523.70s）**；R13 enemy
  initialize **1 passed / 2 skipped（773.07s）**；历史 canary **1 file / 2 passed（257s）**；
  `check:fast` **92 files / 676 passed / 5 skipped（385.53s）**；此后新增一条 copy-on-write 回归测试，
  当前 manifest 冻结为 fast `92/678`、release `116/810`、canary `1/2`。oracle projection 无 diff，
  仅 manifest source fingerprint 随实现更新。
- 修复引用回归后的第二次 serial control 仍按合同 fail-closed：
  `build/release-runs/serial-control-2026-08-17T212253530Z-eff7da24/summary.json`。manifest/canary 通过；
  canonical release 完成 699 assertions 后，shared 历史 worker 达到 V8 4 GiB heap 上限并 OOM，child-tree
  peak RSS `4,310,237,184 bytes`，受保护 workspace 仍为 `0/0/0`，fresh 未启动。根因位于本候选的
  historical enemy-team 投影：少量引用变化却深拷贝完整 migration，并再次归一化全部 script chunks，
  令共享 worker 同时常驻多个全量历史副本。
- 内存返工改为 copy-on-write：未变化文件/数组/对象保持结构共享，只对真正命中 enemy-team 引用的
  script chunk 重算 imports/hash/bytes 并合回 index；不提高 heap、不放宽 4.5 GiB 预算。定向
  **4 files / 97 tests**、typecheck、diff check 已通过，oracle projection 仍 byte-identical。
- 修复后的 shared-only 冷跑保存在
  `build/release-runs/shared-diag-In6MRj/{raw.log,report.vitest.json}`：同一 worker 全程未 respawn、无 OOM，
  `/usr/bin/time -l` maximum RSS `4,249,681,920 bytes`（约 3.96 GiB，低于 4.5 GiB）；23/24 files、
  132 assertions 通过，唯一 `p6-shadow` 因其旧 `beforeAll` 180 秒小于当前真实冷建时长而整文件 6 条
  skipped。该 hook 调整为 600 秒后，定向冷跑
  `build/release-runs/p6-diag-jdHkXk/report.vitest.json` 为 **1 file / 6 passed**，wall `432.70s`、
  maximum RSS `3,038,724,096 bytes`；测试体与断言未改。
- 第三次 serial control
  `build/release-runs/serial-control-2026-08-17T231339310Z-3b6c3253/summary.json` 在业务测试仍运行时
  被 runner 于 `3,600,000ms` 主动 SIGTERM：canonical child peak RSS `3,574,153,216 bytes`、
  workspace `0/0/0`，无断言/heap 错误。根因是整条 canonical process 同时承载 preflight+unit+
  shared+fresh，却误用了单个 PAL child 的 60m timeout；现改为各既有子门之和 `30m+60m+60m=150m`。
  parallel 的 preflight/unit 30m、shared 60m、fresh 60m 单项门限均不变。
- 150m 外层门修复后的第四次 control
  `build/release-runs/serial-control-2026-08-18T003502833Z-726c3eba/summary.json` 完整走过 shared 并进入
  fresh，最终 JSON 为 799 passed / 0 assertion failed；canonical peak RSS `4,025,942,016 bytes`、
  workspace `0/0/0`。唯一失败是三个 PAL-lite 文件在 release-unit 路由下仍使用 Vitest默认10s
  `beforeAll`，而 fast 的 pal-lite project本就给同类冷建120s。现只为这三处真实冷建hook显式120s，
  不抬整个unit组；定向release-unit报告
  `build/release-runs/c1-release-unit-3DUz9a/report.vitest.json` 为 **3 files / 10 passed**。
- 固定候选 `5efa8191` 的首组完整对照已通过：serial
  `build/release-runs/serial-control-2026-08-18T020200248Z-1bc745b2/summary.json` wall
  `4,641,424ms`、peak `4,063,330,304B`；parallel
  `build/release-runs/parallel-2026-08-18T032008184Z-16ea9cf4/summary.json` wall
  `4,059,785ms`、shared/fresh/combined peak `4,327,112,704 / 2,959,327,232 /
  4,749,967,360B`，节省 `581,639ms`。两边 116 files / 809 listed tests、coverage/test-list/route
  digest 与 workspace `0/0/0` 全等。
- 同候选第二组 serial 也通过：
  `build/release-runs/proof-seeded-8ryNqE/pair-2/serial-control/summary.json` wall
  `4,516,294ms`、peak `4,031,496,192B`、workspace `0/0/0`；随后的 parallel manifest 在启动时
  正确 fail-closed，`tsx` 报 `EADDRINUSE`。一手 `lsof` 复现显示长 `TMPDIR` 下多个 Unix socket
  均被内核截为同一个 `.../tmp/ts` 前缀；失败路径长 127 bytes，超过 macOS UDS 安全预算。
  runner 现只把可审计 log/report/transaction 留在长 proof root，运行时 TMP 改为按 run/child 哈希的
  `/tmp/type-pal-release/...` 独立短根，并在构造时强制 socket probe `<=100 bytes`。回归测试 9/9、
  typecheck、真实短 TMP manifest `fast 92/678 / release 116/810 / canary 1/2` 均通过。
- 最终候选首轮 proof 在 canary 正确 fail-closed：
  `build/release-runs/proof-final-e548f9e0/pair-1/serial-control/summary.json`，1/2 assertions 通过，
  workspace `0/0/0`；唯一失败为新增 `release-runner-core.ts` 后 oracle 的
  `packages/migrate/src` source fingerprint 漂移。显式 oracle update 的 diff 只有该 root 的
  `bytes 2,982,322 -> 2,983,291` 与 `sha256`，projection/golden 均无变化；刷新后须重跑 canary。
- oracle 固定后的 proof 首组 canary 2/2 通过，canonical release 完成 811 assertions 后仍正确
  fail-closed：`build/release-runs/proof-final-373ea24b/pair-1/serial-control/summary.json`，唯一失败为
  `pal-c1-npc-curation-transition.pal.test.ts` 的半状态矩阵用例命中 Vitest 默认 5s（实测
  `5,013.9ms`）；同文件其余 5 个重型用例和 `beforeAll` 均已显式 120s。现只把该漏项补为同级
  `120_000`，不改断言、业务实现或全局 timeout；该 control peak `3,998,154,752B`、workspace
  `0/0/0`、其余 809 listed tests 通过。真实 `release-unit` 路由定向复跑为 **1 file / 6 passed**，
  wall `205.45s`。
- 2026-08-19 恢复后审计确认 runner/proof protocol、package 默认串行脚本和四组 release config
  未漂移；但暂停期间 `11dbebb4` 的当前 ProjectMap v4 切版合法更新了 baseline 面。机械对比
  `1ccc83b9` 与当前 baseline：只有 **223** 个 `content/maps/map-*.json` atomic hash 变化，
  managed list、transition metadata、generator epoch 及其余文件 hash 全等。首次 `test:manifest`
  因 `B2 battlefield rewind: successor surface 漂移` 正确 fail-closed，未启动 canary/proof。
- 根因修复位于历史验签边界：新增 `historical-map-surface-authority.ts`，只将当前 223 个
  v4 atomic hash 双端验证后投影回 B2/C1 seal 已发布的 pre-v4 surface；不读取/转换旧 payload、
  不进入 product loader，authored project snapshot 为 no-op，路径/清单/当前 hash 任一漂移即失败。
  真实输入是 release 仍必须消费的 B2/C1 已发布 seal；唯一产品外调用方是
  `pal-current-c1-rewind.ts` 的历史验签路径；历史 seal proof 退役时同步删除。用户本轮明确要求
  C 继续保留 historical rewind 证据，故不属于产品旧版本兼容层。
- 定向验证：历史 map authority **1 file / 3 tests** 通过（全量 223 投影、hash 篡改、
  清单缺项、project no-op）；runner/proof/历史 enemy authority **3 files / 20 tests** 通过；
  migrate typecheck 通过。新测试导致 manifest 精确变化为 fast `93/681`、release `117/813`、
  canary `1/2`；oracle 刷新只更新当前 baseline/project/producer-code 指纹，projection 零 diff。
- 固定候选 `703edf05` 的首次 canary 在 `88.48s` 后按预期 fail-closed：R13 enemy
  augmentation 的 parent whole-content authority 仍直接消费 source producer 生成的 v4 地图正文，
  报 `parent content authority 漂移`；没有启动正式 proof，也没有重跑掩盖。机械验证当前 v4→
  pre-v4 body 投影与 `11dbebb4^` 的 223 张地图逐张 deep-equal（`223/223`），完整 body
  surface digest 为 `b53484ff0f7218fc2af4a5fe2a2ca1c7be2d30a23719917964b0332e7f9ca06d`。
- 修复把 exact-body 投影只接入 `pal-test-fixture.ts` 与 canary 的 historical source-proof
  producer：每张当前 v4 canonical hash、223 清单、完整 pre-v4 body surface 均 fail-closed；默认
  migration builder、product loader 与当前 project 仍只接受 v4。定向集现为 **4 files / 24 tests**，
  typecheck 与 oracle verify 通过；manifest 精确变为 fast `93/682`、release `117/814`、
  canary `1/2`。旧开发类型没有恢复，隔离投影的真实输入/唯一调用域/删除条件沿用上一条声明。
- 固定候选 `f34dc375` 的 canary 在 `15.92s` 后再次 fail-closed，直接证据为投影视图复制
  `MigrationFileSet` 后丢失进程内 WeakMap translation authority，报“必须使用本进程
  buildPalMigration 返回的原始 MigrationFileSet”；仍未启动正式 proof。修复改为通过既有
  `derivePalMigrationFileSet` 建立投影视图，保留 source session identity，不改变地图数据、seal
  常量或 release 路由。
- 固定候选 `cfaccb39` 的 canary 在 `20.60s` 后第三次 fail-closed：旧 v2 body 投影视图进入
  `source-v4` 的当前 serializer，被“ProjectMap 仅支持当前版本 4”正确拒绝。随后曾在工作树试验
  digest-only normalization，但用户指出其前提仍错误，**未提交且已完整撤销**；canary/proof 未再运行。
- 用户裁决后确认 `703edf05`、`f34dc375`、`cfaccb39` 已推到 main 的 pre-v4 hash/body authority
  均属于待删除 rework，不可作为候选或验收证据。工作树只保留任务卡/board 状态记录；实现删除与
  v4 authority 重建必须等待三方重新签字。
- 尚未完成：修复后的完整 serial control、显式 parallel 以及三组同机同批次 serial/parallel proof。
  因此本卡转 `rework`，Codex/Kimi/GLM done 前签字仍为 pending。

### 2026-08-19 implementation checkpoint 阻塞记录

- PB3/PB4 的机械审计脚本已补为精确 15 项闭包：当前分类为 **9 rebuild / 6 preserve**，其中
  `2 direct-body / 4 direct-hash-surface / 3 transitive-parent / 6 unaffected`；任何 transition
  缺失或未分类均 fail-closed。PB4 对 `r13-4-v9`、`r13-5-v10`、`r13-6a-v10` 三种 profile
  的 `content/enemies.json + content/scripts/index.json + 307 chunks` 共 **927** 个 owned leaf
  做重建前后逐文件 sha256 对照，结果 `driftCount=0`；三组 aggregate 分别为
  `b5c9f3b8c62f85818dad4ff5539000382b5e28887e85f71492454fa756a5b575`、
  `ee5115bfab5a25a94b92f362b82cc72e8d4ac9836a68b7f362b67b5fb482559e`、
  `14e14f7f32de10790fd4c3a6d6a67966b42e82e4f234a4e46862f4631314781c`。
  原始报告：`build/release-runs/v4-authority-rebuild-8148083b/pb3-pb4-post.json`；安装四态审计：
  `build/release-runs/v4-authority-rebuild-8148083b/install-audit.json`。这些报告仍是工作树候选证据，
  checkpoint 未固定前不得冒充最终 proof。
- focused unit 首轮为 **7 files passed / 56 tests passed，1 suite 在 import 时 fail-closed**；失败点
  是 `pal-w9-control-graph.test.ts` 经 current C1 rewind 校验 B2 seal 时报告
  `B2 battlefield rewind: manifest authority 不符`。直接 diff 证明一次性 v4 authority 重建脚本把
  current v16 的 `content.worldVariables` 原样带进了标称 content14 的 checkpoint manifest；该错误
  候选的 manifest file sha256 为
  `6811ce380228288aa130be5810f6118102574e08d42ca4fed0cc98f951dfa8c2`，canonical v16→v14
  归一化结果为 `166df8c29e3fb6597f2d50bc7657c7cf8fabb7c997ab4b7b54427fe1e3af91e8`。
  不允许通过放宽 rewind 或保留错误字段使测试转绿。
- 重建器现改为直接调用 `rewindCurrentManifestToV14`，单次 source-backed 重建在 C1 审批门正确
  fail-closed：新 decision digest
  `3f84c53acba5fea26eb3e3f2d5a9fa3325b05fd8936f5967de0a2385206ba24f` 不等于此前基于错误
  manifest 批准的
  `cd68376e08d834cc4b9d4a4d476eff35e69cc22515b29918cdcdcf4ea10768cd`。新 checkpoint 的
  manifest 为 content14 且无 `worldVariables`；语义逐项审计仍为 **173 项、
  `semanticEquivalent=true`**。证据：
  `build/release-runs/v4-authority-rebuild-8148083b/corrected-chain.c1-checkpoint.json`、
  `build/release-runs/v4-authority-rebuild-8148083b/corrected-c1-approval-audit.json`。
- blocker：C1 批准合同绑定精确 digest；Codex 不得把用户对旧值 `cd68376e...` 的批准擅自迁移到
  新值 `3f84c53a...`。等待用户明确批准该 semantic-equivalent rebind 后，才可更新审批常量、完成
  C1/B2 current-v4 seal、重跑 focused/manifest/canary 并形成可提交检查点。若用户不批准，则交由
  ARCH-CURRENT-ONLY-1 删除/折叠该历史 C1/B2 proof 链；不得恢复 pre-v4 地图投影或放宽 manifest
  authority。
- 2026-08-19 User：明确回复“同意更新验证指纹”，批准将 semantic-equivalent C1 验证指纹更新为
  `3f84c53acba5fea26eb3e3f2d5a9fa3325b05fd8936f5967de0a2385206ba24f`；审批时间记录为
  `2026-08-19T11:07:10.000Z`。批准只覆盖验证指纹重绑定，不改变 173 项 NPC/对话决定、地图、
  编辑器或产品内容。上述 blocker 已解除，可继续 current-v4 外层 seal 与 checkpoint 收口。
- 随后的 15-seal 闭包审计发现 `3f84c53a...` 候选漏算 6 个必须原样保留的 transition sidecar；
  该候选没有安装为最终 authority。补齐 6 个 preserve control 后，canonical C1 checkpoint 为
  **548 managed / 319 materialized bodies / 548 hashes / 13 transitions**（另有 223 个 v4 map 与
  6 个 preserve transition 以原子 hash 表示），manifest content14 且无 `worldVariables`。
  最终 decision digest 为
  `985eea7a8338aa4fab7f769c1eb0c73c32c9173ed2962201c7ff6d5e2456e253`；再次机械审计为
  **173 项、`semanticEquivalent=true`**，old/new semantic digest 均为
  `196a42985c79283922c4874e5d83b71d46146a9106676a7769980f20c6b628c8`。证据：
  `build/release-runs/v4-authority-rebuild-8148083b/canonical-chain.c1-checkpoint.json`、
  `build/release-runs/v4-authority-rebuild-8148083b/canonical-c1-approval-audit.json`。
- 2026-08-19 User：在获知上述完整 15-seal 链与最终指纹后明确回复“同意”，批准将验证指纹绑定到
  `985eea7a8338aa4fab7f769c1eb0c73c32c9173ed2962201c7ff6d5e2456e253`；审批时间记录为
  `2026-08-19T14:14:08.000Z`。批准仍只覆盖证明 provenance 指纹，不改变 173 项内容。
- 本轮 migrate typecheck 在纠正重建器后通过。三组 serial/parallel proof、
  `prove-release-parallel`、完整 `test:release` 均**未运行**；B 保持 `build`，Codex/Kimi/GLM
  implementation accept 仍 pending，未提交、未推送本候选。

### 2026-08-20 current-v4 authority 最终 focused blocker

- 后续审计发现 current baseline 与 project 都真实保留 opaque sidecar
  `content/migrations/script-v4-v5-save.json`，两份 raw sha256 均为
  `30ce8717aa9f6f21e14d862cde2aa44dff8f3652833826b4506e49bc7a6a2ed0`；
  `r13-source-semantics-mg2.ts` 明确把它当 opaque 文件。重建器已改为直接从 current-v4 source
  snapshot 保留该真实输入，而不是合成旧 payload。
- sidecar-aware chain 的最终 C1 decision digest 为
  `dac9207d296f4736250ebcebd210f0fe21ae4883161698fabb1916ef8817638c`；用户已明确同意更新当前 v4
  验证指纹。审批记录时间为 `2026-08-19T15:17:18.000Z`。语义审计仍为 **173 decisions、
  `semanticEquivalent=true`**，old/new semantic digest 都是
  `196a42985c79283922c4874e5d83b71d46146a9106676a7769980f20c6b628c8`。证据：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-c1-approval-audit.json`。
- current-v4 source authority 机械续建成功：C1 checkpoint sha256
  `c0685a453d42a9650c41e8d9aaff1cb162472f7641635ad7eaaad67b0b5cd1f9`、C1 NPC seal
  `41b40915f38ef1151e11e59ff485154cd68e3db3a552cea9cef5a83e9bd196cf`、B2 seal
  `9f0ee1a2bfa6880ea5f999229dfe4e974bde8949b10f5fefadee70ad6b04bee6`。原始报告：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-c1-authority-resume.json`；
  9 个 rebuild transition 安装审计：
  `build/release-runs/v4-authority-rebuild-8148083b/current-v4-opaque-install-audit.json`。
  这些值只证明 rebuild chain 内部闭合，**不代表当前 baseline focused 验收通过**。
- PB3/PB4 最终报告固定为
  `build/release-runs/v4-authority-rebuild-8148083b/pb3-pb4-final-blocked.json`：15 transitions
  精确分类仍为 **9 rebuild / 6 preserve**，PB4 仍为 **927 files / drift 0**。重建前报告为
  `build/release-runs/v4-authority-rebuild-11fda923/pre.json`。逐项域、sha256 与 ARCH 处置清单已写入
  `docs/ops/evidence/OPS-TST-PERF-B-arch-current-only-handoff.md`。
- focused gate 在 92.78s 后 fail-closed：**3 tests failed / 7 passed / 21 skipped；6 files failed /
  3 passed**。六个失败均在 import/fixture 初始化时由
  `pal-current-c1-rewind.ts → rewindPublishedB2BattleFieldDomainIfPresent` 抛出
  `B2 battlefield rewind: successor surface 漂移`，未进入 manifest/canary，更未启动完整 proof。
- 直接对照当前 `_state.files` 与 source-backed rebuild report 的 `publishedChain.state.files`：两边
  都是 551 files，managed list 与 generator epoch 相同；**295 个 raw hash 不同，精确分布为
  `content/items.json` 1 个 + `content/scenes/s000..s293.json` 294 个**。解析值语义相同，差异来自
  baseline/editor serializer 已发布的 key insertion order 与历史 C1 upgrader 构造顺序不同。
- 为证伪“简单 current 表示归一化即可”的替代解释，曾做未提交的定向 key-order transplant：raw
  mismatch 从 295 降到 192；继续注入 C1 dialogue upgrader 后，byte-exact downgrade 在
  `content/items.json#/229/use/effects/0/script/body/1/cue` 失败（seal 记录 `rows,portrait`，当前输入为
  `portrait,rows`）。这证明现有 `legacyCueOrders` 不能表达完整 current canonical 表示。该试验脚本、
  callback 和调用路径已全部撤销，仓库无 `canonicalizeCurrentV4` / `canonicalizeSuccessor` 残留。
- 按用户停线规则，不新增 full historical representation/key-order converter、proof schema、旧版
  parser/adapter、compat fallback 或 pre-v4 投影。已判错的
  `historical-map-surface-authority.ts` 及测试和全部调用路径仍保持删除。
- 快速验证：`pnpm --filter @type-pal/migrate typecheck` **通过**；`git diff --check` **通过**。
  manifest/canary **未运行**，原因是 focused gate 已在更前置的 authority 断言失败；重复运行不能增加
  证据。三组 serial/parallel、`prove-release-parallel`、完整 `test:release` 均明确未运行。
- 结论：问题只能通过 ARCH-CURRENT-ONLY-1 删除/折叠历史 C1/B2/R13 proof 链，或在 ARCH 明确认定
  存在不可重生真实输入时建立隔离 source converter 解决。B 保持 `build`，Codex/Kimi/GLM
  implementation accept 继续 `pending`，不得转 `review/done`。当前候选没有通过 focused gate，
  因而**没有实现 commit、没有 push**；不得把 9-seal 工作树候选冒充可交付 authority。

## 交接日志

- 2026-08-10 Codex: 建卡。Evidence: 主卡 B 约束、shared 3.2GiB 峰值与 fresh 隔离锚点。Next:
  真实 Kimi/GLM 先审设计；未满三签不得实现。
- 2026-08-17 GLM（覆盖/测试）: 设计审查完成，签 **premise verified + design agree（附 PB1-PB2）**。
  四配置组/串行脚本/A profiler RSS+进程组基础/fixture lease 锚点逐一属实；三次数据守恒对照可机检。
  两钉：PB1 RSS 数字 3.2GiB 与母卡实测 2.6GiB 不一致须锚定出处；PB2 serial control 须与 parallel
  同机同日同记环境摘要。未改实现文件，未代签 Codex/Kimi。Next: Codex/Kimi 签字后三签齐。
- 2026-08-17 Kimi（架构/进程/资源）: 设计审查完成，签 **premise verified + design agree（携带
  PB1-PB2）**。一手核实：四配置组与 groupOrder 序、shared/fresh lease 隔离语义、串行现状、
  profile-release.mts 的 run-unique root/1s RSS/进程组终止逐项属实；双 child 单 worker 无 CPU
  超订阅、无共享 authority、无静默串行回退；数据守恒对照可机检。canary 与 PAL worker 不并行的
  约束须编码进 runner 而非仅靠文档（验收 fail-closed 已覆盖）。未改实现文件，未代签。
  Next: Codex 签字后三签齐转 build。
- 2026-08-17 Codex: 独立复核并签 **premise verified + design agree**。PB1 已由母卡
  `:288` 的 `3,218,849,792 bytes` profiler 样本闭合，并保留另一轮 2.6 GiB 样本；PB2 同机同批次
  serial/parallel 对照升级为实现硬门。三签齐，状态转 `build`；尚未修改实现文件。
- 2026-08-18 Codex: 隔离 runner/proof protocol 已实现；首轮 serial control 按合同 fail-closed，
  并暴露历史引用、资产引用冻结计数与 actor 姓名字三项 release 前置回归。三项均按 primary source
  修复，严格迁移、R13 初始化、canary 与 check:fast 已绿。Next: 提交候选后重跑完整 serial control，
  再跑 parallel 与三组同机 proof；证据未齐不得签 implementation accept 或转 review。
- 2026-08-18 Codex: 修复后的完整 control 在 canonical shared worker 以 `4,310,237,184B` peak RSS
  触发 V8 heap OOM；runner 正确非零、fresh 未启动、workspace `0/0/0`。直接定位为历史投影全量深拷贝，
  已改 copy-on-write + changed-chunk-only normalization，97 tests/typecheck/oracle byte pin 通过。
  Next: 先跑 shared-only 内存门诊；峰值回落后再重跑完整 control，仍不得放宽预算。
- 2026-08-18 Codex: shared-only copy-on-write 诊断已无 OOM且峰值 `4,249,681,920B < 4.5GiB`；
  唯一失败为 p6 冷建超过旧 180s hook。将 hook 调至同级 release 的 600s 后 p6 定向 6/6 通过，
  wall 432.70s、peak `3,038,724,096B`。Next: 从固定提交重跑完整 serial control。
- 2026-08-18 Codex: 完整 control 再次正确 fail-closed，但原因为 canonical 外层错误复用 60m 单 PAL
  timeout；child 在 3,600,000ms 被 SIGTERM，peak `3,574,153,216B`、workspace `0/0/0`。已将
  canonical 总门改为既有四阶段预算之和 150m，parallel 各子门不变。Next: 定向验证后提交并重跑。
- 2026-08-18 Codex: 150m control已完整走到fresh，799 assertions通过、0断言失败，peak
  `4,025,942,016B`、workspace `0/0/0`；仅3个PAL-lite `beforeAll`在release-unit默认10s下超时。
  三处显式对齐fast pal-lite的120s后，release-unit定向3 files/10 tests全绿，typecheck/manifest通过。
  Next: 提交固定候选并再次完整control。
- 2026-08-18 Codex: 首组 serial/parallel 完整通过且节省 581,639ms；第二组 serial 通过后，parallel
  manifest 暴露 macOS 长 TMPDIR 截断导致的 `tsx` IPC 冲突并 fail-closed。已改为短 runtime TMP 根，
  保持 report/log/transaction 证据根不变；单测、typecheck、真实 manifest 均绿。因最终实现 HEAD 已变，
  旧对照只保留诊断证据，三组正式 proof 将从修复提交重新运行。
- 2026-08-18 Codex: 短 TMP 最终候选的首轮 proof 在 canary 因 src fingerprint 漂移 fail-closed；
  replay assertion 仍通过且 workspace 0/0/0。显式 oracle update 只改 production source root 的
  bytes/sha256，projection/golden 无 diff。Next: canary 2/2 后提交固定候选并从头跑三组 proof。
- 2026-08-18 Codex: oracle 固定候选的首组 canary 2/2 通过；canonical 仅 C1-3 半状态矩阵用例在
  5,013.9ms 命中默认 5s。核对同文件其余重型用例均 120s，补齐该漏项且不改断言/业务代码。
  真实 `release-unit` 定向 1 file/6 tests 全绿。Next: 提交后从固定 HEAD 重启 proof。
- 2026-08-18 User: 暂缓性能优化任务，优先处理编辑器功能与样式。Evidence: 本轮用户明确指示。
  Next: 保持 `build` 与既有证据，不再启动 serial/parallel 长时 proof；用户恢复任务后从固定候选继续。
- 2026-08-19 User: 明确解除 2026-08-18 暂停指令，允许恢复性能任务。Evidence: 本轮用户明确指示。
  Next: Codex 先审计当前 main 候选无语义漂移，完成定向门禁后在固定提交上只跑验收要求的
  三组同机、同批次 serial/parallel proof；失败必须 fail-closed，不得用重跑掩盖。
- 2026-08-19 User: 指出地图已大改，测试应使用新数据结构而不是还原旧结构。Evidence:
  `ProjectMap` 当前加载边界仅接受 v4、223 图切版已 done，符合开发期 canonical 单版本铁律。
  Next: B 转 `rework`，原三签失效；Codex/Kimi/GLM 先独立核实 v4 seal 修复层并重签，签字前不得
  删除/修改实现或运行 canary/proof。C 因执行顺序依赖 B 暂时 blocked。
- 2026-08-19 Kimi: v4-only 前提补充审查完成，签 **premise verified + design agree——裁决机械
  重建 v4 whole-content seal，反对地图域分离**。Primary-source 证据：`digestR13ContentSnapshot`
  对全部 managedFiles 无域过滤哈希（whole-content 合同）；parent/successor digest 是 live
  producer 输出钉（:734-735），合法切版后的机械重算正是 seal 预期生命周期；leaf digest 仅覆盖
  enemies/skills，R13 parent 无第二处全内容 authority，分离会留永久无覆盖面。执行约束：删除
  703edf05..cfaccb39 投影、v4 producer 重算常量、enemy/script leaf/route/coverage/transaction
  逐项不变式机械证明。未改实现，未运行 canary/proof，未标 build/done。
  Next: Codex/GLM 重签后再删实现与重建 authority。
- 2026-08-19 GLM: v4-only 前提补充审查完成，签 **premise verified + design agree（附
  PB3-PB4）**。机械确认 223/223 v4、whole-content digest 含 maps、pre-v4 投影越界；独立证伪
  domain 分离方案，并给出 15 seal 域 inventory 与 owned-leaf sha256 对照硬门。未改实现、未跑长测。
- 2026-08-19 Codex: 在最新 `dacd7ec8` 独立复核并重签 **premise verified + design agree
  （携带 PB1-PB4）**。签字后已提交代码只改 editor 43 files，未触及 v4 source/seal 前提；三签齐，
  B 恢复 `build`。Next: 先保存 PB3/PB4 机械证据，再删 pre-v4 投影并重建 v4 authority；定向门禁
  与固定提交完成前不得启动三组 proof。

## 下一位 Agent 提示词

可直接复制给 ARCH-CURRENT-ONLY-1 Coding Owner：

> 继续 `ARCH-CURRENT-ONLY-1`，先完整阅读任务卡、`AGENTS.md`、`docs/phase2/READ-FIRST.md`、
> `docs/ops/agent-workflow.md`、本 B 卡，以及
> `docs/ops/evidence/OPS-TST-PERF-B-arch-current-only-handoff.md`。B 的 PB3 已机械闭合 15 个
> transition/seal 域（9 rebuild / 6 preserve），PB4 已逐文件证明 927 个 enemy/script owned leaf
> drift=0；但 source-backed current-v4 rebuild 与当前 baseline 有 295 个 items/scenes raw hash
> 表示差异，focused gate fail-closed 为 `B2 battlefield rewind: successor surface 漂移`。
> 不得恢复 v2/v3 parser、pre-v4 map 投影、compat fallback，也不得为 B 新增 full key-order
> converter。请按 ARCH 已签设计完成开发期 current-only 收口，逐项裁决 handoff 清单的 delete /
> fold into current / isolated source converter；不要修改 B runner 或运行 B 长测。输出干净固定提交、
> focused/manifest/canary 可用的最终测试拓扑，以及 B 可接回执行一次正式 serial/parallel proof 的
> 明确前提。不得代签 B 的 Codex/Kimi/GLM implementation accept，不得标记 B done。
