# CODE-QUALITY-62 — game speedrun timer boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯状态机）

## 目标

逐文件核验 SpeedrunTimer wall-clock 起表、依序 detector、PB 更新、香蕉暂停、手动暂停倒计时、setStep/reset 和一次性 dirty flags，保持 PalTimer 对齐注释与现有工具行为。

## 范围

- `packages/game/src/tools/speedrun/timer.ts`
- `packages/game/src/tools/speedrun/timer.test.ts`
- `packages/game/src/tools/speedrun/timer.glm-phase1-leaves.test.ts`

只读相邻 oracle：`timer.boundaries.test.ts`、`speedrun/index.ts`、`snapshot.ts`、`detectors.ts`、`tools-panel.ts:723-805`、`docs/phase1/plans/2026-06-18-speedrun-timer*.md`、`checkpoints.ts` PalTimer 坐标注释。

## 前提真值门

- 一句话行为 / 工程前提：计时只在 scene>0 且 `canMove` 时起表；每帧最多推进一个 checkpoint；暂停/恢复不把暂停跨度计入，PB 只在完整通关且破纪录时更新。
- 原版/primary source：PalTimer 源码不在仓库，N/A；现有 checkpoint/timer 注释与 phase1 design 是当前工具真值，detector boundary tests 是 oracle。
- 当前实现：`timer.ts:1-218`；index/overlay/tools-panel caller；三份测试与 boundary tests覆盖全部状态分支。
- `before -> after`：文件仍待逐文件核验 -> 通过 caller/oracle/状态边界登记已验证；不改变 checkpoint 数据或计时产品形态。
- 最强替代解释 / 可证伪观察：wall clock 回退、同 now tick、暂停边界、setStep 后 detector mem 残留会改变结果；已有 boundary tests 与完整测试反控这些分支。

## 验证

- 定向：timer 主/GLM/boundary 三份测试；与 CODE-QUALITY-61 共用 29 tests、game 全包 3523、全仓 check、ratchet、protected fast、lint-zero、docs/content/ledger。
- 不改 timer 实现，除非直接反例击穿现有合同。

## 交接

- 2026-10-13 Codex：完整读取 timer 218 行、三份测试、index/snapshot/detectors/tools-panel caller 与 speedrun design；起表、依序 detector、PB、香蕉/手动暂停、倒计时、setStep/reset、一次性 flags 均有直接 oracle，未发现直接缺陷。账本收口为 `3266 / 298 closed / 8 review / 2960 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-62 game speedrun timer boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-62-game-speedrun-timer-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、timer.ts/两份测试/timer.boundaries.test.ts、index.ts、snapshot.ts、detectors.ts、speedrun design
请做：若重开审计，复核起表/依序/PB/香蕉/手动暂停/setStep/reset ownership
输出：证据、测试；当前结论为 accept/done，不得改 checkpoint 数据
```
