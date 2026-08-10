# OPS-TST-PERF-B - shared/fresh 隔离并行 release runner

Status: draft
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
  - shared 历史峰值约 3.2GiB；并行会叠加 RSS 和磁盘压力。
  - 当前无 parallel runner；不能仅把两个 Vitest 命令放入 `Promise.all` 就宣称隔离。
- 不得重新引入:
  - 共享 TMPDIR/report/authority、缺 RSS 当成功、子进程失败后静默改跑串行、写入 baseline/project。
- 相关测试:
  - manifest/list、A profiler smoke/full、release shared/fresh 定向组，以及三次串行对照。

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

- Codex: pending
- Kimi: pending（真实席位，用户转发提示词）
- GLM: pending（真实席位，用户转发提示词）
- counter / 分歧处理: 任何资源/隔离/失败矩阵 counter 均保持 blocked。
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

先定义可机检的 runner/report schema 和独立路径，再实现调度；serial control 必须保留，
并行结果不能复用同一 authority lease。任何“为了通过而回退串行”的路径都视为失败。

### 已知风险

- 两个 PAL child 的峰值 RSS 可能同时超过机器安全预算；必须在 spawn 前检查主机内存并持续采样。
- sibling 取消的信号传播、残留进程和临时目录冲突容易产生假成功，需故障注入测试。

## 交接日志

- 2026-08-10 Codex: 建卡。Evidence: 主卡 B 约束、shared 3.2GiB 峰值与 fresh 隔离锚点。Next:
  真实 Kimi/GLM 先审设计；未满三签不得实现。

## 下一位 Agent 提示词

```text
接手任务：OPS-TST-PERF-B shared/fresh 隔离并行 release runner
任务卡：docs/ops/tasks/OPS-TST-PERF-parallel-gates.md
当前状态：draft，Codex/Kimi/GLM 设计签字均 pending；不得开始实现。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、OPS-TST-PERF-release-wallclock.md、
vitest.release.config.ts、package.json、profile-release.mts 及 fresh/fixture 锚点。
请真实 Kimi 复核架构/进程组/RSS/失败语义并写本人 Kimi agree 或 counter；请真实 GLM 复核清单、
报告、serial-vs-parallel coverage 与数据守恒并写本人 GLM agree 或 counter。Codex 只有三方 agree
后才能实现；实现后仍需三方 accept。
不要做：不改默认串行、不删 source-backed 证明、不共享 authority/TMPDIR、不静默串行回退、
不把 RSS 不可用当成功。
输出：设计签字或带 file:line 的 counter；若进入 build，附三次 serial/parallel 原始报告与 digest。
```
