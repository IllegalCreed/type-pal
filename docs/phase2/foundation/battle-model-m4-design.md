# M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）

> 2026-07-03。最后一个大件，工作量 ≈ 整个 M3。基于：①一阶段 `packages/game/src/core/battle/`
> （~9000 行）+ `present/battle/`（~1900 行）= 语义真值源；②M3 已留 `startBattle(team):
> Promise<'win'|'lose'|'flee'>` 接口；③向用户承诺的两条铁律（见 §1）。
> **本文定架构与分期；§4 数据迁移 / §5 战斗命令全集待战斗数据普查回填。**

## 0. 一句话

回合战 = **纯函数公式层（可直接移植）+ 状态机（phase 流程）+ 动画 driver（拍频架构照搬）
+ 敌人 AI 走同一个 ScriptRunner（绝不建第二解释器）**。startBattle 是主脚本调进来的一条
命令，打完返回 win/lose/flee。

## 1. 两条铁律（向用户承诺，M4 的成败线）

一阶段战斗那些"架构问题不好改、老出 bug"的坑，根因是两处结构债。M4 从架构规避：

**铁律①：单解释器，敌人 AI / 战斗脚本走同一个 `ScriptRunner`。**
一阶段有 `battle-opcodes.ts`（1447 行）= 独立于事件侧 `applyRawOpcode` 的**第二个 opcode
解释器**（CLAUDE.md 记的"opcode 双解释器"坑，0x8A 只实现一侧致石长老战变手动）。
M4 **不复辟**：ScriptRunner 已是通用 AST 执行器（控制流/stages/分支/条件与 host 解耦）。
战斗时注入 **BattleScriptHost**（实现战斗命令：施法/召唤/改状态/AI 决策），探索时注入
现有 host。解释器一份，host 是策略。战斗命令是独立的判别联合（enemyUseMagic 等只在
战斗有意义），但**控制流基建 100% 复用**（run/runStages/branch/evalCondition/AbortSignal）。

**铁律②：动画拍频用 driver 模式规避（照搬一阶段已验证的机制）。**
一阶段"施法慢/卡顿"根因：40ms 逻辑 tick 离散推进非-40ms 整数倍的动画帧
（法术 `(speed+5)*10ms`，最坏 50ms → 抖成 80/40/40 拍频）。一阶段的修复
（`battle-anim-driver.ts:stepBattleAnimRender`）是黄金架构，M4 照搬：
- **逻辑 idx**（40ms tick / driver 内部）独占副作用（sound/damage/完成判定）→ 确定性，
  headless 单测走纯 idx 路径；
- **renderIdx**（present 每 rAF，wall-clock 细分）只领视觉、不落后逻辑、不回退 → 平滑到
  屏幕刷新率。
新引擎天然契合：动画播放 = `await host.playBattleAnim(timeline)` 的 driver（与 M3 的
fade/move driver 同款），内部逻辑 idx 推进，present 层 renderIdx 细分。AbortSignal 贯穿
（战斗中途读档/异常 → 全树取消，无孤儿动画态 —— M3 已验证的收尾机制）。

## 2. 分层（复用 M1–M3 的"纯核 + 壳"骨架）

| 层 | 放哪 | 内容 | 移植来源 |
|---|---|---|---|
| **公式**（纯函数） | `content/battle/` | 伤害（物理/法术/base）、dex、行动队列、状态判定、命中/暴击 | `formulas.ts`(216)/`turn-queue.ts`(99)/`magic-damage.ts`(357) 直接移植，SHORT 语义保持 |
| **状态形状** | `content` | BattleState/Fighter/ActionQueue schema（判别联合，可序列化） | `battle-state.ts`(912) 提炼数据形状 |
| **状态机** | `reforge/battle/` | phase 流程 + tick 驱动 + 结算 | `battle-system.ts`(3507) 回合流程骨架 |
| **动画 driver** | `reforge/battle/` | 时间线推进（逻辑 idx）+ 复位 | `battle-anim-driver.ts`(254) 照搬拍频分工 |
| **动画时间线生成** | `reforge/battle/` | 攻击/施法/召唤/受击的 BattleAnimFrame[] 生成 | `anim-timeline.ts`(1816) —— 最大子件 |
| **战斗脚本 host** | `reforge/battle/` | BattleScriptHost（施法/召唤/状态/AI），喂给 ScriptRunner | `battle-opcodes.ts`(1447) 语义，但**不作为解释器**，拆成 host 方法 |
| **present** | `reforge/present/battle/` | 画背景/精灵/特效/数字/UI（indexed framebuffer） | `present/battle/`(1900) |
| **数据迁移** | `migrate/` | enemies/enemy-objects/battle-fields/battle-sprites → content 表 | 见 §4（待普查） |

## 3. 回合流程（一阶段 battle-system.ts 骨架，忠实移植）

```
preBattle(入场 fade) → [ selectAction ⇄ performAction ]* → won / lost / fled
```
- **preBattle**：入场淡入（present dither）；fade 完进 selectAction。
- **selectAction**：每轮起手先对全体活敌跑 `scriptOnTurnStart`（boss 嘲讽 = 战斗脚本，
  走 ScriptRunner + BattleHost）；然后开队员指令菜单（攻击/仙术/物品/防御/逃/自动），
  UI 写 pendingActions；全选完 build ActionQueue。
- **performAction**：按 dex 降序逐项消费 ActionQueue。每项：敌人跑 `scriptOnReady`（AI 决策
  = 战斗脚本）→ 起动画时间线 → driver 推进 → 结算伤害/状态 → 死亡检查。
- **结算**：全敌死 → won（跑 scriptOnWin 给经验/掉落）；全队死 → lost（onLose 臂）；
  逃成功 → fled（onFlee 臂）。返回给主脚本的 startBattle。

phase 是显式状态字段（不是 async 栈）——因为 selectAction 要等玩家**无限期**输入，
不适合 await（会卡住 rAF）。**动画/脚本子过程内部用 async driver**（有限时长），
phase 主循环用状态机 tick。二者边界：tick 看 phase 分派，动画/AI 段 await driver。

## 4. 数据迁移范围（待战斗数据普查回填）

> 战斗数据普查 agent 跑完后补：enemies.json / enemy-objects.json / battle-fields.json /
> battle-sprites.json / battle-effect-index.json 的 schema + count + 迁移映射。
> 敌人 AI 脚本（scriptOnReady/scriptOnTurnStart/scriptOnWin）经翻译器 → 战斗侧 stages。

## 5. 战斗命令全集（待普查回填）

> 战斗侧 opcode（battle-opcodes.ts 的 case 列表）→ 战斗命令判别联合。已知高频（census M3 侧）：
> 0x67 enemyUseMagic / 0x4C monsterChase / 0x9E summon / 0x9C division / 0x2E setEnemyStatus /
> 0x64 hpAboveJump / 0x68 enemyTurnJump / 毒系跳。翻译器扩战斗命令翻译（M3 的 JUMP_FAMILY
> 里战斗 op 现在截断归 M4 → 这里接手）。

## 6. 分期与验收（接 roadmap §8 M4）

| 期 | 内容 | 验收 |
|---|---|---|
| **M4a 公式+状态+桩战斗** | content 公式层移植（伤害/dex/队列/状态，golden 对齐 fight.c）+ BattleState schema + 最简回合(攻击/防御,无动画) | 单测:伤害/回合序对齐一阶段;startBattle 真跑一场纯攻击战分胜负 |
| **M4b 动画+仙术+物品** | 动画 driver（拍频架构）+ 攻击/施法时间线 + 仙术/物品指令 + present 战斗渲染 | 浏览器:一场有法术特效的战斗，施法平滑不卡（拍频验收） |
| **M4c 敌人 AI+状态+召唤** | BattleScriptHost + 敌人 AI 脚本翻译（scriptOnReady/TurnStart）+ 状态机制 + 召唤/分裂 | 浏览器:boss 嘲讽、敌人施法/召唤、中毒/催眠 |
| **M4d 结算+全流程** | 经验/升级/掉落/收妖 + startBattle 真接线（win/lose/flee 臂）+ 战斗↔剧情边界 | **开场→第一场遇敌→胜利结算→续剧情**，复刻验收表全勾 |

## 7. 已拍板 / 待定

- ✅ 单解释器（BattleScriptHost 策略），无第二 opcode 解释器（铁律①）。
- ✅ 动画拍频 driver（逻辑 idx + renderIdx，照搬一阶段，铁律②）。
- ✅ 公式/队列纯函数直接移植（SHORT 语义，golden 对齐 fight.c 行号）。
- ✅ phase 状态机（selectAction 无限等待）+ 子过程 async driver（有限动画/AI）混合。
- ⏳ BattleState 可序列化形状（战斗中存档？一阶段用 snapshot；M4 定）。
- ⏳ 战斗命令集与事件命令是否共用一个 Command union，还是独立 BattleCommand（倾向独立，
  控制流基建复用）—— 普查战斗 op 全集后定。
- ⏳ 敌人 AI 的 RNG 确定性（一阶段 rng.ts 可注入 seed）—— M4a 定注入点。
