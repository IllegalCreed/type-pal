# CODE-QUALITY-53 — game player status runtime-zero ownership conflict

Status: blocked
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu
Visual Verification Timing: mixed（状态数值为用户可见行为；视觉布局留集中 E2E）

## 目标

核定状态页 `runtimeOrBase` 在运行时值为 0 时的 ownership，再决定是否修复 `drawPlayerStatus` 及其测试。SDLPal 直接显示 runtime `rgwHP/rgwMP/rgwLevel`，0 具有真实语义（阵亡/零值）；TS 当前用 `||` 回退静态 `PlayerRoles`，可能把真实 0 显示成基线值。生产 bootstrap 会 hydrate runtime，但测试/早期状态可保持全零，两个输入域被同一 fallback 混合。

## 范围

- `packages/game/src/present/menu/draw-player-status.ts`
- `packages/game/src/present/menu/draw-player-status.test.ts`
- `packages/game/src/present/menu/draw-player-status.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/status-vitals-pixels.grok-r1.test.ts`

只读上下文：`packages/game/src/present/__tests__/grok-present/p07-status.test.ts`、`draw-menu.ts`、`present.ts`、`core/menu/player-status.ts`、`core/game-state.ts:1385-1425,1800-1843`、`shell/bootstrap.ts:1628-1655`。

## 前提真值门

- 一句话行为 / 工程前提：状态页生产 caller 在 bootstrap 新游戏/读档后消费已 hydrate/normalize 的 `PlayerRolesRuntime`；primary source 显示 runtime 0 必须保留，未 hydrate 的全零 runtime 不应被静默伪装成生产状态。
- 四向真值矩阵：
  - 原版/primary source：`reference/sdlpal/uigame.c:1120-1229` 直接读 `gpGlobals->g.PlayerRoles.rgwLevel/rgwHP/rgwMaxHP/rgwMP/rgwMaxMP`；0 不回退；`global.c:1736-1897` 的 stat getter 也从 runtime 表直接计算。
  - 第一阶段当前实现：`draw-player-status.ts:120-137` 使用 `runtime.value || base.value`；`core/game-state.ts:1385-1425` 明确 hydrate runtime；`bootstrap.ts:1642-1655` normalize 读档 runtime 后进入菜单。
  - 当前测试 oracle：`draw-player-status.glm-phase1-leaves.test.ts:33-57` 把全零 runtime 回退 base 当作合同；相邻 P07/pixel tests 主要覆盖已写 runtime 值。该 oracle 与 primary 的真实零语义存在潜在冲突。
  - 本任务目标：确认生产输入域是否总能证明 hydrated runtime；若能，改为保留 runtime 0 并调整 fixture/oracle；若需要未 hydrate 防御，则必须定义显式 readiness/ownership，而不是用 `||` 猜测。
- 当前 `before` -> 候选 `after`：runtime HP/MP/level 为 0 时当前显示静态基线值；候选 A 保留现行 fallback（可能掩盖阵亡），候选 B 生产路径直接显示 runtime 0、未 hydrate 输入显式阻断/初始化。代表场景：角色实际 HP=0 打开状态页，或读档后 runtime 缺字段。
- 最强替代解释 / 什么观察会推翻前提：如果存在真实生产 caller 在 hydrate 前合法打开状态页，且产品明确要求显示静态基线，则需保留 fallback；但独立复核已确认 `battle-system.ts:1703-1711` 先把战斗结果写回 runtime、`game-state.ts:1777-1782` 可写入 HP=0，随后菜单可读取该 runtime；因此真实阵亡角色被当前页显示为静态正数，`||` 是直接 bug。剩余未知只在于如何显式表示未 hydrate fixture。
- 是否主动偏离已核真值：待用户/工程裁决；裁决前不得改实现或弱化测试。

## 上下文锚点

- `draw-menu.ts:155-176` 只有 `extra.playerRoles` 存在才调用；`present.ts` 负责注入 runtime projection 与资源；`bootstrap.ts` 新游戏 hydrate、读档 normalize 后才进入可玩菜单。
- `game-state.ts:1385-1425` 明确 runtime 全零只是创建模板，hydrate 会复制静态值；`createInitialGameState` 仅供 bootstrap/fixture，不能直接代表生产菜单输入。
- 现有 tests 以全零 fixture 证明 fallback，但尚未证明真实生产 caller 在未 hydrate 时可达；这是本卡必须补齐的 caller/lifecycle 证据。

## 验证

- 已完整读取实现、4 个范围测试、P07 caller、状态机、公共出口、hydrate/normalize 生命周期和 SDLPal primary source；未运行本批定向测试，不把既有全绿当作合同验收。
- 用户/工程裁决前不得修改实现或测试；裁决后必须先写失败反例（runtime 0 的真实状态页）、再修复并运行定向、相邻 game、全仓 check、coverage ratchet、protected fast、lint-zero、docs/content review 和 ledger。不能直接把 `||` 改为 `??` 而不处理旧 fixture/未 hydrate 输入域。
- 该差异涉及第一阶段机制真值、runtime ownership 与用户可见数值，属于高风险边界；不触碰 schema/save，但可能需要显式 runtime readiness 约束。

## 当前模式推进记录

- Codex 范围/前提核验: counter（primary source 与真实 battle→runtime→menu caller 已证明 runtime 0 被错误 fallback）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: blocked（用户/工程裁决前不得实现、不得标记 done）
- 贡献者交付/自验: N/A
- Codex 独立验收: pending
- 用户产品裁决/体验验收: pending
- done 准入: blocked

## 交接

- 2026-10-13 Codex：状态页 wave 只读审计发现 runtime-zero ownership 冲突；独立只读复核确认 `uigame.c:1222-1229` 直接读 runtime、`battle-system.ts:1703-1711` + `game-state.ts:1777-1782` 会把死亡 HP=0 写回 runtime，而 `draw-player-status.ts:120-138` 用 `||` 显示静态基线。账本保持 `3266 / 275 closed / 5 review / 2986 pending`，本卡范围不计入 closed。等待决定如何显式区分未 hydrate fixture 与合法 runtime 0。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-53 game player status runtime-zero ownership conflict
任务卡：docs/ops/tasks/CODE-QUALITY-53-player-status-runtime-zero.md
当前状态：blocked，等待用户/工程裁决
角色：只做独立证据复核；不得开始实现或标记 done
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c:1120-1229、draw-player-status.ts:120-137、game-state.ts:1385-1425/1800-1843、bootstrap.ts:1628-1655、draw-player-status.glm-phase1-leaves.test.ts:33-57
请做：确认 production status menu 是否只在 hydrated runtime 上可达；若需要变更，先给 before -> after 与失败反例，不得用单纯 `||` 掩盖真实 0
不要做：不得在裁决前修改产品行为、schema/save 或测试 oracle
输出：primary/caller/readiness 证据、counter 或用户待裁决问题
```
