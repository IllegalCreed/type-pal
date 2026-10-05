# CODE-QUALITY-3x - game battle progression / hidden experience 逐文件治理

Status: draft
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（结算视觉集中 E2E；本卡只验升级/隐藏经验/法术学习合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标与范围

逐文件审计 `packages/game/src/core/battle/battle-progression.ts`（306 行）的主升级、隐藏经验分配、属性 cap、法术学习和结算快照；以 SDLPal `battle.c:991-1373`、`global.c:2347-2454`、真实 settlement caller、battle-progression/battle-levelup tests 核真值，只有直接反例才修复。

- 范围内：`battle-progression.ts` 全文件、`battle-progression.glm-next-wave.test.ts` 全文件、`battle-levelup.test.ts` 和 `battle-system.test.ts` progression 相关段、settlement caller。
- 范围外：`battle-settlement.ts`/`battle-finalization.ts`（Q3w 已关闭）、battle-system 全文件、公式/magic/status/actions、save/schema/migration、生成物、E2E/UI/coverage runner。
- 明确不做：不改变升级数值、隐藏经验顺序、法术槽 schema 或结算 UI 形态；证据冲突时停线交用户裁决。

## 前提真值门

### 一句话行为 / 工程前提

战斗胜利升级必须只对战后存活队员结算主经验，严格保持主升级与隐藏经验的池顺序、随机消费、属性 cap/不 cap差异、HP/MP 回满时机和法术学习去重；结果快照只能反映 runtime 真源与装备有效值。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_BattleWon` 主/隐藏经验、等级成长、法术学习、半血前升级顺序 | `reference/sdlpal/battle.c:991-1373`、`global.c:2347-2454` |
| 第一阶段 | `battleWonLevelUp`/`applyHiddenExpGrowth` 写 `PlayerRolesRuntime`，settlement 读取 snapshot；battle-system/settlement caller 只负责 phase/屏序 | `battle-progression.ts:1-306`、`battle-settlement.ts:109-205`、`battle-system.ts:3137-3138`；tests 待读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 306 行实现和直接 tests 按池/升级/法术/快照逐段核验，未知保留 review/blocked | 本卡、file ledger、定向/相邻 tests 与全仓门禁 |

### 替代解释与可证伪观察

- 最强替代解释：某些看似数值差异来自装备有效值/旧存档/隐藏经验池，而非 progression bug；`battle-settlement` 的半血恢复不应在本卡重复实现。
- 推翻前提的观察：死亡角色获经验、隐藏经验顺序/RNG 位移、主升级 cap 与隐藏池 cap 混淆、无主升级错误回满、法术重复/越界写槽、snapshot 与 runtime 不一致。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段数值忠实、runtime raw base 与装备有效值分离、硬零诊断、测试少而精。
- 先读：`CLAUDE.md`、`docs/phase1/game-mechanics.md`、`docs/phase1/engineering-notes.md`、本卡、progression/levelup tests、settlement caller、`battle.c/global.c` 对应段。
- 不得重新引入：把装备加成写回 raw base、隐藏经验套主升级 STAT_LIMIT、改变池顺序/RNG 消费、用测试数量/coverage 替代数值 oracle、重复实现 settlement cleanup。

## 验收条件

- 功能：battle-progression.ts 全 306 行按主升级/隐藏池/法术/快照 family 登记 owner/caller/primary source/risk/conclusion。
- 测试：直接 tests 全文核验、定向/相邻 progression/settlement tests、game typecheck；若改代码再跑完整 check、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/index；每个闭合批次 commit+push+archive。

## 当前模式推进记录

- 前提核验：pending；范围/设计：pending；build：blocked（允许只读审计，**不得开始实现/不得标记 done**）。

## 交接日志

- 2026-10-05 Codex：Q3w 已归档；建立 progression 窄卡，先全文核验 306 行实现、专属 GLM/levelup tests、battle-system progression 段与 battle.c/global.c primary source。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3x game battle progression / hidden experience 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3x-game-battle-progression.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
先读：AGENTS.md、CLAUDE.md、docs/phase1/game-mechanics.md、docs/phase1/engineering-notes.md、本卡、battle-progression.ts 全文、battle-progression.glm-next-wave.test.ts、battle-levelup.test.ts、battle-system.test.ts progression 段、battle-settlement caller、battle.c/global.c。
输出：四向真值矩阵、替代解释、逐段 oracle/caller/risk、`premise verified/counter`、`design agree/counter` 和 build allowed/blocked；若没有直接反例也必须全文核验后再收口，不得把全绿或覆盖率当文件审查证据。
```
