# OPS-TST-PERF-B - shared/fresh 隔离并行 release runner

Status: build
Execution: active（用户 2026-08-19 明确解除 2026-08-18 暂停，允许恢复性能任务）
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
- 尚未完成：修复后的完整 serial control、显式 parallel 以及三组同机同批次 serial/parallel proof。
  因此本卡保持 `build`，Codex/Kimi/GLM done 前签字仍为 pending。

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

## 下一位 Agent 提示词

无下一位 Agent 提示词：三方 build 前签字已齐，由 Coding Owner Codex 在本卡继续实现；进入 done 前
仍须 Codex/Kimi/GLM 三方 implementation accept。实现不得改默认串行、共享 authority/TMPDIR、
静默回退串行，且必须保存三次同机 serial/parallel 原始报告与 digest。
