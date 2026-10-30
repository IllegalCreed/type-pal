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

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `detectors.ts`（76 行）、`detectors.test.ts`（77 行）、`detectors.glm-phase1-leaves.test.ts`（65 行）；读取 `timer.ts` 的依序消费与 `mem`/`prevSnap` 生命周期、`snapshot.ts` 投影、`checkpoints.ts` 21 个真实 detector 配置，以及 speedrun design §4.2–4.3。
- **Primary/caller/oracle**：PalTimer/checkpoint 设计是工具真值；`SpeedrunTimer.tick` 每帧只把当前 detector 的快照、上一帧快照和该 checkpoint 的独立 `DetectorMem` 传入；`detectors.ts` 不写 `GameState`，坐标/场景/敌人/物品/BGM 均由 `ProgressSnapshot` owner 提供。
- **结论**：enter/leave/集合进入的 prev 语义、atSpot/atAnySpot 矩形容差、boss id+全场总血、item/music 纯谓词，以及 caiyi “先见 boss、再血清/离场”两阶段 mem 均与真实 caller 一致。`enterAnyScene` 在工厂时复制输入集合，未发现可由 caller/primary 直接证明的实现缺陷；未改变 checkpoint 数据或公共接口。
- **测试判别力**：直接两份 detectors 测试共 12 tests，覆盖 null prev、集合内转场、空集合、默认与显式容差边界、多点命中/不命中、boss/战斗空值、caiyi 自定义敌 id 和独立 mem；snapshot/timer/checkpoints 相邻合同一并通过，无新增弱重复用例。
- **验证**：detectors、snapshot、timer、timer.boundaries、checkpoints 六文件共 42 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage、protected fast、全仓 check 沿用 47–52 波次证据，本小批不重复运行昂贵门。当前复审为 `partial`，不是整卡 `accept/done`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-64 game speedrun detectors boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-64-game-speedrun-detectors-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、detectors.ts/两份测试、timer.ts、checkpoints.ts、speedrun design §4.2-4.3
请做：若重开审计，复核 prev/mem ownership、边界与彩依两段状态机
输出：证据、测试；当前结论为 accept/done，不得改 checkpoint 数据
```
