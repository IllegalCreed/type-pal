# OPS-TST-PERF-FRESH - release fresh hook/test 超时根因

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
  - `packages/migrate/vitest.release.config.ts:45-65` 的 fresh isolate/timeout 配置。
  - `packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:100-125,137-193,330-356`。
- 已知坑 / 审计文档:
  - 2026-08-10 profiler 记录 fresh 文件级失败；一次证据指向 `beforeAll` 约束（`:768-770`，
    180s hook），另一次独立复现指向 `:772` 的 240s body timeout。两者尚未证明是同一根因，
    本卡必须用 raw JSON、命令和进程/RSS 证据定性，不能预先写死结论。
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
  - 最小修复保持原 timeout、listed test identity、source-backed fresh build 和磁盘事务隔离。
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

- Codex: pending
- Kimi: pending（须用户转发真实席位）
- GLM: pending（须用户转发真实席位）
- counter / 分歧处理: 未集齐三方前保持 draft/blocked，不改实现。
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

先做只读、可重复的最小复现矩阵：单 fresh 文件、只跑目标测试、完整 cold chain、带/不带
profiler；每次记录 monotonic wall、raw JSON、进程树 RSS、临时事务目录和 git/source digest。
确认根因后只修上游冷链或 fixture 生命周期，避免在 runner 层掩盖问题。

### 已知风险

- 根因可能是 180s `beforeAll`、240s body、资源竞争或隐藏的重复建链；错误归类会导致错误修复。
- 冷链单次耗时数分钟，需保留中断/失败报告，不能以一次成功偶然样本结论。

## 交接日志

- 2026-08-10 Codex: 建卡。Evidence: OPS 主卡 profiler 失败摘要与 fresh 原始 JSON 路径。Next:
  先由真实 Kimi/GLM 对调查设计签 `agree`，之后 Codex 只做根因复现与最小修复。

## 下一位 Agent 提示词

```text
接手任务：OPS-TST-PERF-FRESH release fresh hook/test 超时根因
任务卡：docs/ops/tasks/OPS-TST-PERF-fresh-hook-timeout.md
当前状态：draft，三方设计签字未齐；不得开始实现、不得调整 timeout/skip、不得标 done。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
docs/ops/tasks/OPS-TST-PERF-release-wallclock.md、pal-migration-integration.test.ts、
profile-release.mts、vitest.release.config.ts。
职责：真实 Kimi/GLM 先只读审查调查矩阵并本人写 `agree` 或带 file:line 的 `counter`；
签字齐后 Codex 复现并修复真实根因，保留 raw JSON/RSS/事务证据。
不要做：不增大 180s/240s timeout，不将失败转 skip，不复用 canary/prepared authority，不改默认串行路由。
输出：根因分类（hook/body/process/disk）、最小 diff、连续三次 fresh 结果、命令/报告路径和是否建议 accept。
```
