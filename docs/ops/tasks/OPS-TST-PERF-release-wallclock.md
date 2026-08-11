# OPS-TST-PERF-RW - release worker 墙钟优化

Status: build
Phase: phase2
Capability: test infrastructure / release gate
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Unavailable Agents: none（2026-08-10）
Branch: main

> **2026-08-10 治理记录**：本卡早期由 Codex 侧子代理生成的 Kimi/GLM 文字仅作历史审计材料，
> 不等同真实席位签字。A 当前仍是诊断实现，三次成功 full baseline 未完成；B/C 与 fresh 根因已拆为
> 独立任务卡，均须由用户转发给真实 Kimi/GLM 完成设计与实现复审后才能推进。默认 `test:release`
> 保持串行，不能以并行或 pinned proof 先行替代门禁。

## 目标

在不减少 source-backed 证明、不放宽 anti-tamper/append-only 断言、不跨 worker 共享可变
authority 的前提下，缩短 `@type-pal/migrate` release gate 的墙钟时间，并让每个项目阶段的
耗时/RSS 可观测。当前 release Vitest 约 43 分钟，已经影响正常迭代；完整的
`manifest → canary → release` 命令更久，三段不能混称。

## 当前证据（只读基线）

- `packages/migrate/package.json:15` 顺序执行 manifest → cold canary → release Vitest；新增 profiler 是独立只读路径，不改变该顺序。
- `packages/migrate/vitest.release.config.ts:19-68` 将 release 分成 preflight、unit、shared、fresh
  四组；`shared` 在 `pool=forks, isolate=false, fileParallelism=false` 下故意单 worker，才能复用
  `pal-test-fixture.ts` 的进程内真实 lease。
- 当前 release 清单：unit **75 files / 577 tests**，shared **24 / 137**，fresh **3 / 5**，
  preflight **1 / 1**，总计 **103 / 720**。
- 2026-08-10 本机单阶段实测（Apple Silicon，`/usr/bin/time -p`，单次样本）：
  `release-preflight + release-unit` **18.55s**（76 files / 578 tests），单跑
  `p2-shadow.pal.test.ts` **175.24s**（首个 live-double-build 测试 86.829s），单跑
  `pal-migration-integration.test.ts` **357.99s**。最近一次完整命令的 canary 为
  **257.07s**、release Vitest 为 **2595.54s**；“约 43 分钟”只指 release Vitest，含
  manifest+canary 的端到端墙钟约 **47 分 33 秒**。后续 profiler 必须固定计时范围并报告
  median/max，不能把两个范围混为一个 baseline。
- 历史已钉证据：`docs/ops/tasks/OPS-TST-PERF-test-fixture-stratification.md:351-352`
  记录 shared 24/137 为 **1992.69s**、RSS 约 **2.6GiB**；N3-1 卡记录 unit/preflight 约
  **15s**。因此约 43 分钟主要是 81,674-site PAL source audit、P2-P6/P7 链、R13 MG2 authority
  和独立 fresh replay，不是 720 条断言或 Vitest 启动。
- 关键冷建入口：`packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:100-125,
  137-148,163-193,330-356`；R13 authority 首次准备见
  `r13-confirm-mg2.pal.test.ts:143-212`、`r13-source-semantics-mg2.pal.test.ts:84-150`。

## 不可做

- 不把 `maxWorkers`/`fileParallelism` 直接调大来制造多份冷 fixture；这会重复 81k 图、放大 RSS/OOM，
  也不能把 `isolate=false` 改成跨 worker 共享可变对象。
- 不把 canary golden、prepared authority、ledger 或 release baseline 落盘当作 release 输入；
  release 必须 live rebuild、验签和 replay `0/0/0`。
- 不删 source-backed 测试、把 source proof 换成 synthetic/oracle，或以 timeout/skip 伪造提速。

## 候选方案与冻结顺序

### A. 阶段计时（低风险，当前 build 范围）

增加只读 release profiler/报告，分别运行并记录 manifest、canary、`release-preflight +
release-unit`、`release-pal-shared`、`release-pal-fresh` 五个明确阶段；默认 gate 行为不变。
profiler 用 `performance.now()` 记录单调 `t0/t1`，以固定命令边界运行每个阶段，报告写到唯一
run 目录（不在 baseline/project/authority 根下），失败也保留。每阶段必须产生稳定 JSON：
`schemaVersion/runId/phase/command/startedAt/durationMs/exitCode/signal/files/tests/assertions/
passed/skipped/unlistedSkipped/failed/maxRssBytes/rssScope/logPath`，顶层 summary 另记录覆盖清单
校验开销的单调 `durationMs`；清单/路由 digest 必须与 `test:manifest` 一致。`tests`
指 `vitest list` 的 listed/runnable 身份，Vitest JSON reporter 额外包含的静态 `.skip`
只允许以 `unlistedSkipped` 记录；未列入的 passed/failed 或已列入身份在执行期 skipped
均必须 fail-closed。
子进程树 RSS 不能采样、报告缺字段/缺阶段、源或 baseline 缺失、文件全被 `skipIf` 跳过，均以
非零结束，不能把 `passWithNoTests:false` 当作覆盖证明。profiler 只读，不读取或修改 authority。

### B. 独立分组并行（中风险，A 完成后的单独 build）

> 已拆卡：[`OPS-TST-PERF-parallel-gates.md`](OPS-TST-PERF-parallel-gates.md)。本节只保留冻结约束，
> 不在本卡直接实现。

提供显式 `test:release:parallel` runner：保持每组独立进程和原有清单/断言，manifest、canary、
unit/preflight 仍按原顺序在并行组之前完成（canary 绝不与 PAL worker 同时运行），然后并行
`release-pal-shared` 与 `release-pal-fresh`。每个 child 使用独立的
`TYPE_PAL_MIGRATE_TEST_GATE`、`TMPDIR`、Vitest JSON report、日志和 fresh transaction root；不得
写入 baseline/project/authority。runner 递归采样 child process-tree RSS：shared 单 child 上限
**4.5 GiB**、fresh 单 child 上限 **3.5 GiB**、两 child 合计峰值上限 **7.5 GiB**；参考机总内存
低于 **12 GiB** 时直接拒绝启动。RSS 不可读取、超预算、spawn/exec/timeout、路径冲突、signal/OOM、
报告缺失或清单不完整，都必须终止 sibling、保留日志、返回非零；不得静默回退串行。没有显式
环境开关时继续使用现有串行 `test:release`。仅当与串行 control 连续三次比较，digest、清单、
writes/deletes/conflicts 和 skipped 计数完全相同且 RSS/墙钟满足预算，才另行讨论默认化。

### C. 集中 determinism proof（大收益，另行任务卡/三方设计）

> 已拆卡：[`OPS-TST-PERF-consolidated-determinism.md`](OPS-TST-PERF-consolidated-determinism.md)。
> 本卡不删除 source-backed 双建。

评估将 P2/P3/P4 的第二次完整 reversed-input build 合并到一个 release-only consolidated
probe；每阶段常规断言改消费已现场生成且 self-digest 验证的 pinned bundle，consolidated probe
逐阶段用独立 fresh default/reversed 输入（不可同 lease reverse 或原地 mutate）重建，并比较
canonical source/baseline/route/schema/method/profile digest、IR、ledger、文件、authority/seal。
作者冲突、half-state、tamper、historical rewind、fresh disk transaction 必须继续现场执行。
先新增可机检 coverage map：旧 137 个 shared test title/断言各有且仅有一个 successor，禁止
duplicate/orphan/missing；否则 C 不得 build，也不能只以总测试数相等替代。不得简单删除
live-double-build；C 不在本卡当前 build 范围，另开卡后再三方签字。

## 验收条件

> fresh hook/test 根因另见 [`OPS-TST-PERF-fresh-hook-timeout.md`](OPS-TST-PERF-fresh-hook-timeout.md)。
> 在该卡根因闭环前，不能把 fresh 失败计入成功 baseline，也不能推进 B 的并行实现。

- A：连续三次阶段报告可复现，且每次明确记录 manifest/canary/release 边界；报告 schema 完整，
  full 汇总的 listed/runnable 为 `files=103/tests=720`并与 manifest 路由 digest 相等；当前
  reporter 真值另为 `assertions=721/unlistedSkipped=1`，不得冒充或减少 720 条可运行身份；RSS/
  报告不可用、全跳过、
  失败或缺 source/baseline 均 fail-closed。
- B（后续单独 build）：并行 runner 的 shared/fresh 进程、env、临时目录和报告完全隔离；任一
  failure/signal/OOM/timeout/缺报告/RSS 超 4.5/3.5/7.5 GiB 均终止 sibling 并非零；连续三次与
  串行 control 的 digest、测试标题/数量、skipped、writes/deletes/conflicts 完全相等，不能静默
  回退串行。
- C（后续单独任务）：coverage map 对旧 137 tests/title/断言逐项唯一映射且机检拒绝遗漏/重复；
  每个 P2/P3/P4 保留独立 default/reversed live build，并现场核对 source/baseline/route/schema/
  method/profile、IR/ledger/files/authority/seal、anti-tamper/half-state/historical rewind 和
  fresh transaction；不能只以总测试数相等作为替代。
- 所有方案：`pnpm test:manifest`、typecheck、`git diff --check`、串行 `test:release` 仍通过；
  剧情视觉不参与本卡，按集中 E2E 纪律处理。

## 推进签字

### 进入 build 前：设计

- Codex：agree（2026-08-10；A 仅观测，B/C 后续独立审查）
- Kimi：**agree（设计，2026-08-10 返工复审；见下方 Kimi 返工复审）**
- GLM：**agree（2026-08-10 返工复审；A/B 验收钉已闭合，C 明确拆为后续独立任务）**
- counter / 分歧处理：历史 counter 已按返工文本闭合；A/B/C 的设计门禁均已钉定。
- 缺签豁免：N/A
- build 准入结论：build allowed（仅限 A；B/C 仍须各自独立任务卡与三方设计签字）

### 进入 done 前：实现

- Codex：**accept（A 实现自验，2026-08-10；三次 full 验收仍 pending）**
- Kimi：**accept（A 实现，2026-08-10 最终复审；见下方）**
- GLM：**accept（A 实现最终复审，2026-08-10；三次 full 验收仍 pending）**
- done 准入结论：blocked

## 下一位 Agent 提示词

```text
接手任务：OPS-TST-PERF-RW release worker 墙钟优化 A 实现终审（当前 Status=build，done blocked）。
任务卡：docs/ops/tasks/OPS-TST-PERF-release-wallclock.md
只读先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
packages/migrate/scripts/profile-release.mts、packages/migrate/vitest.release.config.ts、vitest.tests.ts。
当前证据：最终 smoke 79ead15d PASS（manifest 103/720、preflight 1/1、complete=false）；full 09d35973
已闭合 canary 1/2、unit 76/578、shared 24/137，但 fresh 因现有 integration hook/test 超时路径 fail-closed，
不计三次成功 full。核对五阶段边界、listed/runnable 与 reporter-only skipped、逐文件/逐测试 identity、
文件 status、RSS/signal/失败摘要、默认 test:release 和 authority/baseline 无变更。
指定职责：只读实现复审并在卡上签 `accept` 或给出带 file:line 的 `counter`；不得修改实现文件、
不得开始 B 并行或 C consolidated proof、不得调整现有 180s hook/240s test timeout。未三方 accept 和
三次成功 full 前不得标记 done。
```

## Kimi 设计复审（2026-08-10）

- **Kimi: counter；build 准入继续 blocked。** 方向（先观测、再显式并行、最后集中证明）可行，
  但当前验收文字还不能证明 release gate 没有 fail-open 或 source-proof 回退。
- **B / shared-fresh 进程与文件隔离（P1）**：本卡 `:56-60,72-75` 的 “independent processes”
  还必须钉死每个子进程的 `TYPE_PAL_MIGRATE_TEST_GATE`、唯一 `TMPDIR`/Vitest JSON report/log/
  transaction root，以及 shared 失败时 sibling 取消、信号/OOM/缺报告的 aggregate non-zero。
  shared 的真实 lease 仍只允许进程内复用（[`vitest.release.config.ts:41-66`](../../packages/migrate/vitest.release.config.ts)、
  [`pal-test-fixture.ts:65-88,128-160,205-221`](../../packages/migrate/src/experimental/script-v5/pal-test-fixture.ts)），
  fresh 的磁盘事务必须保持独占临时根（[`pal-migration-integration.test.ts:110-118,591-600`](../../packages/migrate/src/pal-migration-integration.test.ts)）。
  验收钉：注入 child failure/SIGTERM/OOM/路径冲突，两个 child 的报告与日志均保留，runner 非零且不得静默改跑串行。
- **B / RSS fail-closed（P1）**：`machine safety budget`（`:72-75`）没有数值、进程树采样方式、
  单位或不可用 telemetry 的处理。必须分别钉 shared、fresh、合计预算；采样 fork descendants 的 peak RSS；
  RSS 不可读、超预算、被信号杀死或 V8 OOM 一律 non-zero。当前 canary 仅有 V8 old-space 2048MiB
  （[`vitest.canary.config.ts:16-22`](../../packages/migrate/vitest.canary.config.ts)），不能把旧卡
  `1168MiB` 当 RSS 门槛（旧证据 [`OPS-TST-PERF-test-fixture-stratification.md:195-207`](OPS-TST-PERF-test-fixture-stratification.md)）。
- **A / 阶段报告（P2）**：`:48-52,72` 未定义 monotonic `t0/t1`、manifest/canary/release 的边界、
  稳定 JSON report schema、skipped/pending 计数和缺报告行为。`package.json:14,17` 明确 manifest 是
  独立阶段；`passWithNoTests:false` 不能阻止文件内 `skipIf` 全跳（例如
  `packages/migrate/src/pal-sprite-action-census.pal.test.ts:152`、
  `packages/migrate/src/translate-enemy-scripts.pal.test.ts:48`、
  `pal-migration-integration.test.ts:511,724,765`）。验收须要求清单/路由 digest、每文件 passed/skipped/
  failed、wall/CPU/peak-RSS/exit/signal，缺源、缺 baseline、缺报告均 fail-closed。
- **C / P2-P4 独立证明（P1）**：`:64-68,76-78` 的现场 `pinned bundle + self-digest` 只能证明
  自洽，不能独立证明 source producer 正确。每阶段仍须独立 fresh default/reversed build（不可在同一
  lease 上 reverse 或原地 mutate），比较 canonical source/baseline/route/schema/method/profile digest、
  IR、ledger、文件、authority/seal，以及 author-conflict、half-state、tamper 反例；旧 shared 137 条
  必须按测试标题一一唯一映射。顶层 fixture 目前只浅冻结（[`pal-test-fixture.ts:100-125`](../../packages/migrate/src/experimental/script-v5/pal-test-fixture.ts)），
  因此反序输入必须使用深冻结/COW 独立快照。验收钉：consolidated probe 缺失、digest 不等或任一旧标题无
  唯一 successor 时 release 失败；三次 parallel 结果另须与 canonical serial control 的 digest、清单、
  writes/deletes/conflicts 完全相等。
- **最小返工文本**：补充上述预算/采样/失败矩阵、runner/report schema 与唯一临时路径约束；明确 C
  的独立双建和逐标题 coverage map，再请求 Kimi/GLM 重新签 `agree`。

## GLM 设计复审（2026-08-10）

- **GLM: counter；build 准入继续 blocked。** 清单证据准确（`vitest list` 为 103 files / 720
  tests，manifest 实跑 fast 80/590、release 103/720、canary 1/2），但初版把 release-only
  2595.54s 与含 canary 的完整墙钟混称；本卡已拆开边界，并要求连续三次报告 median/max。
- **A / 报告门禁**：必须使用单调时钟，固定 manifest、canary、release 子阶段，报告 command、
  exit/signal、wall、max child-tree RSS、files/tests/passed/skipped/failed、路由/清单 digest；
  RSS 或 summary 不可用、缺阶段/缺字段、源或 baseline 缺失、全量 `skipIf` 时非零，不能靠
  `passWithNoTests:false` 误报覆盖。锚点：`packages/migrate/package.json:9-14`、
  `vitest.release.config.ts:19-68`。
- **B / 调度与资源**：当前 package scripts 尚无 parallel runner（`packages/migrate/package.json:9-14`）。
  返工后 runner 必须保持 manifest→canary→unit/preflight 的顺序，只并行 shared/fresh；每个
  child 的 env、TMPDIR、JSON report、日志、fresh transaction root 唯一，spawn/exec/signal/
  timeout/RSS/报告任一失败都 kill sibling 并非零，不能静默退回串行。`shared` 的
  `pool=forks,isolate=false,fileParallelism=false` 和 `fresh` 的 isolate 语义不可改变。
- **C / 逐条覆盖**：现有 G1 只有 44 条摘要映射，不能替代旧 shared 137 tests。若另开 C 卡，必须
  生成可机检的 old-title/断言→successor coverage map，拒绝 duplicate/orphan/missing；每个
  P2/P3/P4 保留独立 default/reversed live build 与 source/baseline/route/schema/method/profile、
  IR/ledger/files/authority/seal、anti-tamper/half-state/historical-rewind/fresh-transaction
  证据。pinned bundle self-digest 不得冒充 source proof。

## GLM 返工复审（2026-08-10）

- **GLM: agree（设计）**。返工已固定 release-only 与含 canary 的计时边界及三次
  median/max 基线（`:17-34`）；A 的五阶段单调时钟、稳定 JSON schema、路由/清单 digest、
  RSS/报告/全跳过/缺源 fail-closed 钉在 `:53-62,90-92`。
- B 已明确 manifest→canary→unit/preflight 串行、shared/fresh 并行、每 child 独立 env/临时根/
  报告、进程树 RSS 单项与合计预算，以及 spawn/exec/signal/timeout/OOM/报告缺失/路径冲突的
  sibling 终止与非零矩阵（`:64-75,93-96`）；未改变 `vitest.release.config.ts:45-65` 的
  shared 单 worker lease 与 fresh 隔离语义。
- C 已明确不在本卡 build，另开三方任务；其准入钉要求旧 137 条逐标题唯一 coverage map、
  duplicate/orphan/missing 机检及 P2/P3/P4 独立 default/reversed live build 与全套
  source/authority/anti-tamper/transaction 证据（`:77-86,97-100`）。

## Kimi 返工复审（2026-08-10）

- **Kimi: agree（设计）**。A 已把 manifest、canary、`release-preflight + release-unit`、
  `release-pal-shared`、`release-pal-fresh` 固定为五个阶段；用 `performance.now()` 记录单调
  `t0/t1`，并要求每阶段在唯一 run 目录保留完整 JSON（含 exit/signal、文件/测试及
  passed/skipped/failed、peak RSS 与 scope、日志路径）。清单/路由 digest、缺阶段/缺字段、
  缺报告、RSS 不可采样、源或 baseline 缺失、全量 skipIf 均 fail-closed。
- B 的约束已闭环：manifest→canary→unit/preflight 保持串行，之后只并行 shared/fresh；两个
  child 各自使用 gate env、唯一 `TMPDIR`、Vitest JSON、日志和 fresh transaction root，禁止写入
  baseline/project/authority。递归 child-tree RSS 预算明确为 shared 4.5 GiB、fresh 3.5 GiB、
  合计 7.5 GiB，低于 12 GiB 主机拒绝启动；RSS/报告/路径/进程/信号/OOM/超时任一失败都终止
  sibling、保留证据并返回非零，禁止静默串行回退。
- C 已明确拆为后续独立三方任务；其准入保留 P2/P3/P4 各自独立 fresh default/reversed 双建，
  逐条 coverage map 机检及 source/baseline/route/schema/method/profile、IR/ledger/files、
  authority/seal、anti-tamper/half-state/historical-rewind/fresh-transaction 证据，不能以
  pinned bundle 自摘要或总测试数替代 source proof。

## Codex A 实现进度（2026-08-10）

- 新增 `packages/migrate/scripts/profile-release.mts` 和 `test:release:profile`。它按 manifest、canary、preflight+unit、shared、fresh 五阶段串行启动 detached child，保留每阶段 JSON/report/log、顶层单调墙钟、递归 process-tree RSS、signal/exit 和清单/路由 digest。
- `tests` 指 listed/runnable 身份；Vitest JSON reporter 额外包含的静态 `.skip` 只允许是 skipped 并计入 `unlistedSkipped`；已列入身份在执行期 skipped、额外 passed/failed、文件 status 非 passed、报告/RSS 缺失均 fail-closed。
- 最终 smoke：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-release-profile-2026-08-10T020740513Z-79ead15d/summary.json`，PASS，manifest 103/720、preflight 1/1，顶层 94.71s，RSS 非空。
- 完整 profiler 诊断：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-release-profile-2026-08-10T005327089Z-09d35973/summary.json`。manifest 70.35s、canary 373.90s、preflight+unit 21.74s、shared 2625.08s，分别闭合 103/720、1/2、76/578、24/137；shared 进程树 RSS peak 3,218,849,792 bytes。fresh 按 fail-closed 停止：raw JSON 显示 integration 文件 `status=failed`，baseline listed test 因 `beforeAll` hook 失败而 skipped（hook 超时限制在 `:768-770`，180s）；单独 fresh 复跑又在 `:772` 复现 240s test-body timeout（冷链约 333s）。两者均是现有性能债，不是报告解析误判；应单独开返工卡复现根因，不在 profiler 里改超时或转 skip。
- 这次只作诊断基线，不计入 A 的三次成功 full 验收；正式 `done` 仍需三次 full、与串行 control 清单闭合以及 Codex/Kimi/GLM 三方 accept。
- 2026-08-11 W9 发布后重跑只读 smoke：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-release-profile-2026-08-11T081934648Z-49335190/summary.json`
  为 PASS，顶层 71.86s，`complete=false`。manifest 严格闭合新清单 107 files / 757 tests，
  digest `0ade1405…` / route `b7a8d9f6…`，进程树 RSS peak 1,022,689,280 bytes；preflight
  1/1，RSS peak 810,778,624 bytes。本次仍只是 smoke，不计三次 full，不闭合 FRESH、
  serial control 或 B/C 门禁。

### 2026-08-11 FRESH 返工闭环证据（Codex，未代签）

- 提交 `88219e8cb2947c295cd45ad451e63321c9e7e252` 已推送 `main`：P7 改为单一 canonical pipeline，
  fresh final-consumer 改消费逐阶段验证并释放的 P6 final output；R13-5 仍使用独立 source
  container，未读取 prepared/canary authority，180s hook 与 240s body 原值未动。
- 在同一 clean main、完整 `release-pal-fresh` 路由、独立冷进程下连续三次成功：
  `/tmp/type-pal-fresh-final-1.json`（integration 172.950s，process-tree RSS
  2,892,922,880B）、`/tmp/type-pal-fresh-final-2.json`（205.175s，2,835,972,096B）、
  `/tmp/type-pal-fresh-final-3.json`（190.670s，2,844,229,632B）。每次均为 6 passed + 1
  既有 unlisted static skip，listed identities 无 skip/failure；峰值约 2.694GiB，低于本卡记录
  的 full control 约 2.7GiB 与 fresh 3.5GiB hard budget。
- 真实 PAL `p6-shadow` 等价门、migrate typecheck、fast（83 files / 626 tests）、canary（2/2）
  和 manifest generator/verify 均通过；manifest 当前为 107 files / 758 tests。oracle 仅因合法
  上游源码变更重录 production-typescript fingerprint，未改 projection authority。
- 这三次 fresh 关闭了 FRESH 卡的连续 fresh gate，但尚未替代本卡要求的官方 profiler full
  报告、serial control 与连续三次 full baseline；本卡仍保持 `Status: build`，B/C 仍未进入实现。
  这些是实现证据，不构成任何 Kimi/GLM implementation accept。

## Kimi A 实现复审（历史记录，已由下方最终复审取代；2026-08-10）

- **Kimi: accept（A 实现）**。`profile-release.mts:351-474` 现在按每文件/每测试 identity
  对照 Vitest JSON，核对 passed/failed/skipped 与总数，并对每文件无通过断言及全量 skipIf
  fail-closed；`profile-release.mts:649-689` 重算 unit/shared/fresh stage union 的 test/file
  identity、sha256 和 routeSha256，并与 release manifest pin 相等，避免漏跑阶段仍被标记完整；
  manifest 读取/解析失败也由 `main` 保留 summary（`:573-647,692-805`）。
- `runChild` 的 detached process-group、递归 descendants RSS（`:259-349`）和
  SIGINT/SIGTERM 终止记录（`:39-60`）保留 exit/signal、peak RSS、日志与 JSON report；
  smoke summary 明确 `mode=smoke` 且 `complete=false`，不能冒充 full。默认
  `test:release` 命令（`packages/migrate/package.json:15`）、release config、PAL authority
  与 baseline/project 均未改动。
- 验证：`pnpm --filter @type-pal/migrate typecheck` 通过；Codex 提供的最新 smoke run
  `7c5ce2de` 为 PASS。未运行长 canary/shared/fresh release；三次 full wall/RSS 基线仍属
  A 的最终验收项，故本卡 done 准入继续等待 Codex/GLM。

## Kimi A 最终实现复审（2026-08-10）

- **Kimi: accept（A 实现）**。最终脚本同时校验文件级 `status=passed`、逐文件/逐测试 identity、listed test 执行期不得 skipped、unlisted assertion 只能 skipped，并强制 `assertions = tests + unlistedSkipped`；release manifest 与 unit/shared/fresh union 的 files/tests、`sha256`、`routeSha256` 闭合；递归 child process-tree RSS、SIGINT/SIGTERM、失败 summary、顶层单调 `durationMs` 均保留。默认 `test:release`、release config、authority、baseline/project 无改动。
- 最终 smoke `2026-08-10T020740513Z-79ead15d` 通过：manifest 103/720、preflight 1/1、RSS 非空，`complete=false`。
- 完整诊断的 fresh 失败是现有 integration 文件的 hook/test 超时路径（raw file status 失败，baseline listed test 被 hook failure 连带 skipped；单独复跑才在 `:772` 以 240s 超时），profiler 正确 fail-closed。该失败不能计入三次成功 full，也不能在 profiler 中改超时或转 skip；done 仍待独立返工卡复现根因、三次 full 与 GLM/Codex 验收。

## GLM A 实现最终复审（2026-08-10）

- **GLM: accept（A 实现）**。当前 schema、listed/runnable 与 reporter-only skip 口径、文件 status、identity、digest、RSS/signal 和失败摘要均 fail-closed。full 的 hook/file failure 与 standalone 240s test-body timeout 已分开记账，未把失败算作成功基线；下一位提示词已包含 build 状态、证据、只读职责及禁止调整 timeout。
- 默认 `test:release` 未变，B/C 未越界；三次成功 full、串行 control 和 Codex 最终验收未完成前，本卡保持 `build` / `done blocked`。
