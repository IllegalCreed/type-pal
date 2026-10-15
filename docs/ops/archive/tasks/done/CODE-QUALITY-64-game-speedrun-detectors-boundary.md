# CODE-QUALITY-64 — game speedrun detectors boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯检测器）

## 目标

逐文件核验 speedrun detectors 及两份测试，确认 enter/leave/any/spot/boss/item/music 与彩依两段状态机的 prev/mem ownership、边界和顺序语义保持现有工具合同。

## 范围

- `packages/game/src/tools/speedrun/detectors.ts`
- `packages/game/src/tools/speedrun/detectors.test.ts`
- `packages/game/src/tools/speedrun/detectors.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`speedrun/timer.ts:170-205`、`checkpoints.ts`、`snapshot.ts`、speedrun design §4.2-4.3、现有 boundary tests。

## 验证

- 完整读取实现与两份测试；既有主/边界测试覆盖 null prev、集合内转场、容差边界、boss total HP、item/music、彩依 mem 与自定义 enemy id。
- 定向 detectors 主/GLM 13 tests；与 snapshot/store/timer wave 共用 game 全包 3523、`pnpm check`、ratchet、protected fast、lint-zero、docs/content/ledger。

## 交接

- 2026-10-13 Codex：enter/leave/any/spot/boss/item/music 与彩依两段状态机的 prev/mem、容差、集合内转场、null prev、自定义 enemy id 均由主/边界测试反控；未发现直接缺陷。账本收口为 `3266 / 303 closed / 8 review / 2955 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-64 game speedrun detectors boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-64-game-speedrun-detectors-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、detectors.ts/两份测试、timer.ts、checkpoints.ts、speedrun design §4.2-4.3
请做：若重开审计，复核 prev/mem ownership、边界与彩依两段状态机
输出：证据、测试；当前结论为 accept/done，不得改 checkpoint 数据
```
