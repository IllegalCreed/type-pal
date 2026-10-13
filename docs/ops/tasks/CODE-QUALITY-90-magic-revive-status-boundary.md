# CODE-QUALITY-90 — magic revive status clearing boundary

Status: blocked
Phase: phase1
Capability: Q3 phase1 game core/menu magic script
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

> 高风险停线卡：只记录一手真值与失败反例，等待用户裁决后才允许实现。

## 目标

核定大世界复活法术是否必须完整清除角色状态，并在用户批准后修复 `magic-script.ts` 的单体/全体复活路径。当前只确认直接证据，不改生产实现。

## 范围

- 范围内:
  - `packages/game/src/core/menu/magic-script.ts` 的 `revivePlayerSingle` / `revivePlayerAll`
  - 对应真实 status ownership、复活 caller 与最小失败反例
- 范围外: 战斗复活、save/schema/migration、毒键寻址 CODE53/79、其它脚本 opcode。
- 明确不做: 用户裁决前不修改实现、不改变 status schema、不恢复旧 upgrader/fallback。

## 前提真值门

### 一句话行为 / 工程前提

SDLPal `OP_REVIVE_PLAYER` 在目标 HP 为 0 时设置复活 HP、按 level≤3 清毒，并调用 `PAL_RemovePlayerStatus` 清除全部玩家状态；当前 TS 只清毒，可能让复活角色保留 sleep/confused/silence/paralyzed/puppet 等状态。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 单体和全体 revive 分支均在复活后调用 `PAL_CurePoisonByLevel(...,3)` 与 `PAL_RemovePlayerStatus(..., x)` | `reference/sdlpal/script.c:1052-1102` |
| 第一阶段 | `revivePlayerSingle/All` 只写 runtime HP 并调用 `curePlayerPoisonByLevel`，未写 `rgPlayerStatus` | `packages/game/src/core/menu/magic-script.ts:91-111` |
| 当前二阶段 | N/A；本卡只涉及 phase1 game runtime | N/A |
| 本任务目标 | 经用户裁决后决定是否镜像 primary source 的全状态清除，并用真实 runtime status oracle 验证单体/全体/失败路径 | 待用户裁决 |

### 反证与替代解释

- 最强替代解释: `rgPlayerStatus` 可能不是大世界复活可见状态，或 `curePlayerPoisonByLevel` 间接清了全部状态；需由 `player-status` ownership 与函数实现反证。
- 什么观察会推翻当前前提: 真实 caller/renderer 证明 revive 后状态应保留，或 `curePlayerPoisonByLevel` 已清完整 status（当前只读初查未见）。
- 已排查替代根因:
  - runtime 语义 / 命令分类: `magic-script.ts` 明确是大世界 `uigame.c` runner；未混用 battle runner。
  - 原版 / 第一阶段理解: 已逐行对照 `script.c` 单体/全体分支。
  - extractor / 数据解码: 不涉及。
  - audit / test model: 当前既有测试只断言 HP、毒等级和 MP gate，没有 status oracle；需新增失败反例。

### 用户可见偏离

- 是否主动偏离已核真值: pending（修复会改变复活后的状态表现）
- `before -> after`: 当前可能“复活但保留状态” → 待裁决是否对齐 SDLPal 清全部状态
- 代表场景: 角色处于 sleep/confused/paralyzed 后使用还魂咒；复活 HP 成功但状态图标/行为是否立即清除。
- 用户裁决: pending

## 上下文锚点

- 已拍板决策 / 铁律: 发现第一阶段机制真值与用户可见行为风险必须停线；行为修复先写失败反例再实现；不降低测试/静态门。
- 代码锚点: `magic-script.ts:91-111,225-251`; `player-poison-state.ts` cure ownership；`game-state.ts:552-570,1876-1880` status runtime；`menu-driver.ts:902-937` caller MP gate。
- 已知坑 / 审计文档: CODE-QUALITY-89 已将 script/MP caller留 pending；`docs/phase1/game-mechanics.md` status/复活真值；不要与 CODE53/79 poison key 混改。
- 不得重新引入: 只清毒冒充清状态、无失败反例直接改实现、在 battle runner 中复用大世界同步 runner、改变 MP 扣除顺序。
- 相关测试: `packages/game/src/core/menu/magic-script.test.ts`、menu-driver cov85 magic tests、player status tests。

## 验收条件（裁决后）

- 功能: 单体/全体复活清状态，活人/满血失败不清状态，毒 level>3 保留规则不变，MP gate 与 scriptSuccess 不变。
- 测试: 失败反例先行；真实 runtime status 数组与 renderer/caller oracle；3 个以上精确反控；相邻 menu-driver/player-status 回归。
- 质量门: game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / 尚未授权实现；仅本卡、失败反例和证据。
- 前提核验: counter-risk confirmed（primary source 与现实现存在直接差异，但用户可见目标仍待裁决）。
- 范围、设计和验收条件: pending（等待用户决定是否镜像 SDLPal 全状态清除）。
- 高风险用户产品裁决: pending
- build 准入结论: blocked

## 交接日志

- 2026-10-14 Codex: 只读完整读取 `magic-script.ts`/测试、menu-driver caller、runtime status ownership 与 SDLPal `script.c:1052-1102`；确认单体/全体 revive 当前只清 poison，不调用 status removal。未修改实现，未新增会失败的 tracked 测试；等待用户裁决后先加失败反例，再决定实现。

## 下一位 Agent 提示词

无；本卡 blocked，等待用户裁决，不得开始实现或标记 done。
