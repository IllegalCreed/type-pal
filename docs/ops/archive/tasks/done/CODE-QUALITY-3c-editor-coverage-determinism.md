# CODE-QUALITY-3c - editor coverage 分支确定性

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: ops
Capability: ops / code-quality
Visual Verification Timing: N/A

## 目标

定位并修复 editor fast coverage 在相同生产范围下偶发少 1 branch 的确定性问题，使受保护 fast 可重复通过，不改变产品行为、测试范围、coverage include/exclude 或精确比例门槛。

## 范围

- 范围内：专属 `SpriteFrameWorkbench.animation-boundary.test.tsx` 与本卡/账本/看板/索引/官方生成 baseline；只补公开组件动画缺帧回退的确定性合同。
- 范围外：不降低 baseline、不扩大排除、不改 editor 生产 UI、不改 Q3b parser、不把历史覆盖率调查当作当前根因。

## 前提真值门

- 一句话工程前提：当前 Q3b 代码候选不触碰 editor，但 `pnpm coverage:ratchet` 的 editor branches 为 24166/29058 后，连续两次串行受保护 fast 和一次 `TYPE_PAL_COVERAGE_PARALLEL_EDITOR=1` 都为 24165/29058；同一命令必须可重复，不能靠一次幸运命中放行。
- 真值来源：`scripts/coverage/run.mjs:529-541` 精确比较；`scripts/coverage/config.mjs:173-185` editor fast worker/exclude；`docs/ops/audits/pre-e2e/coverage-determinism.md` 历史逐文件调查；本轮 Q3b 日志与 `coverage/fast/editor/lcov.info`。
- 当前 `before -> after`：`editor coverage 偶发少 1 branch -> 在相同范围/门槛下确定性达到基线`
- 最强替代解释 / 反证：worker 顺序、RAF/异步清理或测试共享状态造成命中差异；若固定 worker/调度后逐文件报告仍不同，则回到具体 caller/test 合同定位；不得以总量多数通过替代。
- 是否主动偏离已核真值：N/A（质量门确定性，不改产品行为）。

### 已完成的逐文件对照

- 官方 fast 结果、独立 editor fast `maxWorkers=1`、独立 editor fast `maxWorkers=2` 的生产文件 census 都是 292 文件 / 29,284 lines / 33,513 statements / 29,058 branches；两种 worker 的 292 个逐文件 JSON 指标完全相同。
- 两次相同 scope 的 `maxWorkers=2` 对照也逐文件完全相同，均为 24,165/29,058 branches；这只能说明这些采样一致，不能排除其它定时器采样差异或宣称确定性。
- baseline 与当前结果的 editor test count、identity digest、execution digest 完全相同；差异只剩 branch covered `24,166 -> 24,165`。不能把它解释成测试清单漂移，也不能通过 baseline 降级关闭。
- 历史 full timing probe（当前 4,682 tests）中 hold 与 flush 两种内存 RAF 调度都得到 24,166/29,058，且逐文件没有差异；旧 probe 的“应有 4 个差异”断言失败，说明当前树已不满足旧的 reorder 根因前提。该 probe 只提供诊断证据，不是正式 gate。
- 将高值 probe 的 `coverage-final.json` 与低值官方 `lcov.info` 逐文件/逐分支比较，唯一布尔命中差异为 `SpriteFrameWorkbench.tsx:174` 的 conditional branch 14/index1：缺失源帧回退第0帧，高值命中1、低值0。该位置的其它语句/行/函数均不变；不是 runner 已证缺陷，修复层为缺失的受控动画回归。

## 上下文锚点

- `AGENTS.md` 零诊断、精确门、不得用 ignore/缩窄范围逃避。
- `scripts/coverage/run.mjs` 当前 ratchet/protected 比较与 `scripts/coverage/config.mjs` editor selection。
- `docs/ops/audits/pre-e2e/coverage-determinism.md`：历史 reorder RAF 缺口已修，但明确要求新差额继续逐文件定位。
- 不得重新引入：降低 baseline、增大排除、sleep 猜阶段、把 `pnpm check` 全绿冒充 coverage closure。

## 验证

- 先产出相同 SHA、相同测试 identity/文件 census 的逐文件 coverage 对照；最多六次原样重跑后停止并保留日志。
- 任何修复必须有直接反控（删调度/清理或生产 guard 时应按合同失败），再跑 editor 定向、全仓 check、ratchet、受保护 fast、lint。
- 不改产品源码或 coverage config；以公开 `SemanticFrameShelf`、真实 canvas 和受控 performance/timer 推进一条合法的缺帧预览合同，并反控仅移除 fallback 后指定断言失败。

## 当前模式推进记录

- Codex 范围/前提核验: verified（逐文件与 branch identity 已定位动画缺帧 fallback；生产保持不变）。
- 受委派 Coding Owner / 隔离分支: Codex / `codex/code-quality-governance`。
- build 准入: Codex build allowed（仅新增公开组件时序合同与证据；固定规则/生产行为）。
- Codex 独立验收: accept（公开组件回归、negative control、全仓 check、support-mode ratchet、protected fast、lint）。
- 用户产品裁决/体验验收: N/A（无产品行为变化）。

## 交接

- 2026-10-04 Codex：Q3b 的 pal-extract 变更不触碰 editor，但 protected fast 连续暴露 editor branches 24165/29058 对 ratchet baseline 24166/29058 的差 1；历史调查要求不得多数放行。Next: 先做逐文件 coverage 对照，未闭合前 Q3b 不标 done。
- 2026-10-04 Codex：完成相同 fast scope 的 maxWorkers=1/2 与重复 maxWorkers=2 对照，292 个 editor 生产文件逐文件指标完全一致，test identity/execution digest 也一致；当前差额是可重复的 1 branch，不是 worker 或 scope 漂移。Next: 对 baseline 生成来源与具体 branch oracle 做下一层定位，仍不得改门槛。
- 2026-10-05 Codex：当前 full timing probe 的 hold/flush 均为 24166/29058、逐文件零差异，旧 probe 预期差异断言失败；Q3c 根因应转向七包 runner/环境时序，不能继续改 reorder 产品或测试。Next: 保持独立质量门未决，或在 runner 层找到可证伪修复。
- 2026-10-05 Codex：上述 runner 归因被进一步证据收窄：高/低报告唯一差异为 SpriteFrameWorkbench:174 缺帧 fallback，直接 branch map 给出高1/低0；不是 runner 内部缺陷已证。准入仅新增确定性动画回归，不修改产品或 config。Next: 正常/单点反控，再跑官方门。
- 2026-10-05 Codex：新增 `SpriteFrameWorkbench.animation-boundary.test.tsx`，合法缺帧请求命中第0帧并在动作终点停止；删除 fallback 的单点 mutant 失败。editor 606/4845、全仓 check、support-mode ratchet、protected fast、lint 均通过，差额闭合。Next: 归档 Q3c，后续继续逐文件治理。

## 下一位 Agent 提示词

无；本批已完成，等待归档；后续继续逐文件治理。
