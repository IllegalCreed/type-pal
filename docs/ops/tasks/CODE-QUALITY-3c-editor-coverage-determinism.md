# CODE-QUALITY-3c - editor coverage 分支确定性

Status: draft
Owner: Codex
Reviewer: Codex（独立验收）
Phase: ops
Capability: ops / code-quality
Visual Verification Timing: N/A

## 目标

定位并修复 editor fast coverage 在相同生产范围下偶发少 1 branch 的确定性问题，使受保护 fast 可重复通过，不改变产品行为、测试范围、coverage include/exclude 或精确比例门槛。

## 范围

- 范围内：`scripts/coverage/{config,run}.mjs`、editor coverage 执行与直接导致差额的测试合同；必要时只改测试调度/清理。
- 范围外：不降低 baseline、不扩大排除、不改 editor 生产 UI、不改 Q3b parser、不把历史覆盖率调查当作当前根因。

## 前提真值门

- 一句话工程前提：当前 Q3b 代码候选不触碰 editor，但 `pnpm coverage:ratchet` 的 editor branches 为 24166/29058 后，连续两次串行受保护 fast 和一次 `TYPE_PAL_COVERAGE_PARALLEL_EDITOR=1` 都为 24165/29058；同一命令必须可重复，不能靠一次幸运命中放行。
- 真值来源：`scripts/coverage/run.mjs:529-541` 精确比较；`scripts/coverage/config.mjs:173-185` editor fast worker/exclude；`docs/ops/audits/pre-e2e/coverage-determinism.md` 历史逐文件调查；本轮 Q3b 日志与 `coverage/fast/editor/lcov.info`。
- 当前 `before -> after`：`editor coverage 偶发少 1 branch -> 在相同范围/门槛下确定性达到基线`
- 最强替代解释 / 反证：worker 顺序、RAF/异步清理或测试共享状态造成命中差异；若固定 worker/调度后逐文件报告仍不同，则回到具体 caller/test 合同定位；不得以总量多数通过替代。
- 是否主动偏离已核真值：N/A（质量门确定性，不改产品行为）。

### 已完成的逐文件对照

- 官方 fast 结果、独立 editor fast `maxWorkers=1`、独立 editor fast `maxWorkers=2` 的生产文件 census 都是 292 文件 / 29,284 lines / 33,513 statements / 29,058 branches；两种 worker 的 292 个逐文件 JSON 指标完全相同。
- 连续两次相同 scope 的 `maxWorkers=2` 对照也逐文件完全相同，均为 24,165/29,058 branches；因此当前证据排除了 worker 数和单次并发抖动。
- baseline 与当前结果的 editor test count、identity digest、execution digest 完全相同；差异只剩 branch covered `24,166 -> 24,165`。不能把它解释成测试清单漂移，也不能通过 baseline 降级关闭。

## 上下文锚点

- `AGENTS.md` 零诊断、精确门、不得用 ignore/缩窄范围逃避。
- `scripts/coverage/run.mjs` 当前 ratchet/protected 比较与 `scripts/coverage/config.mjs` editor selection。
- `docs/ops/audits/pre-e2e/coverage-determinism.md`：历史 reorder RAF 缺口已修，但明确要求新差额继续逐文件定位。
- 不得重新引入：降低 baseline、增大排除、sleep 猜阶段、把 `pnpm check` 全绿冒充 coverage closure。

## 验证

- 先产出相同 SHA、相同测试 identity/文件 census 的逐文件 coverage 对照；最多六次原样重跑后停止并保留日志。
- 任何修复必须有直接反控（删调度/清理或生产 guard 时应按合同失败），再跑 editor 定向、全仓 check、ratchet、受保护 fast、lint。
- 在本卡 `build` 准入前不得修改实现文件；当前仅允许诊断和证据记录。

## 当前模式推进记录

- Codex 范围/前提核验: verified（差额直接可复现；修复层仍 unknown，保持 draft）。
- 受委派 Coding Owner / 隔离分支: Codex / `codex/code-quality-governance`。
- build 准入: blocked（先完成逐文件 coverage 对照与根因定位）。
- Codex 独立验收: pending。
- 用户产品裁决/体验验收: N/A（无产品行为变化）。

## 交接

- 2026-10-04 Codex：Q3b 的 pal-extract 变更不触碰 editor，但 protected fast 连续暴露 editor branches 24165/29058 对 ratchet baseline 24166/29058 的差 1；历史调查要求不得多数放行。Next: 先做逐文件 coverage 对照，未闭合前 Q3b 不标 done。
- 2026-10-04 Codex：完成相同 fast scope 的 maxWorkers=1/2 与重复 maxWorkers=2 对照，292 个 editor 生产文件逐文件指标完全一致，test identity/execution digest 也一致；当前差额是可重复的 1 branch，不是 worker 或 scope 漂移。Next: 对 baseline 生成来源与具体 branch oracle 做下一层定位，仍不得改门槛。

## 下一位 Agent 提示词

无；当前由 Codex 继续诊断，未获 build 准入前不得修改实现文件或标记 done。
