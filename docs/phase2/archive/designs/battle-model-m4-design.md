# M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：M4 战斗纯核+壳分层，回合流程和结算沿用一阶段骨架；普查数据范围；SkillEffect/ItemUseEffect 共享；敌人 AI 命令/fallback；battleAnim；按 fidelity gate 分期。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`d5e6e7509a35ce680b012129828c82f5e154e638a9b03817580df29aa13e6d37`；原文 143 行、11123 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/battle-model-m4-design.md:1-1；标题锚点：1:M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）, 8:0. 一句话, 14:1. 两条铁律（向用户承诺，M4 的成败线）, 38:2. 分层（复用 M1–M3 的"纯核 + 壳"骨架）, 51:3. 回合流程（一阶段 battle-system.ts 骨架，忠实移植）, 69:4. 数据迁移范围（普查回填，2026-07-03）, 86:5. 战斗命令集（普查回填）—— 关键决策：效果复用，不重造, 90:# 5.1 效果类（15 个共享 op）→ 复用 M1c/d 的 `SkillEffect` / `ItemUseEffect`。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 标题明确数据/命令表待补全；AI、命令、动画和多人/边界行为仍有历史待定项。
- fallback 数量、字段和“已拍板”只代表当时设计输入，不能作为当前战斗 runtime 或完整性证明。

## 方案

- 原始方案语义：M4 战斗纯核+壳分层，回合流程和结算沿用一阶段骨架；普查数据范围；SkillEffect/ItemUseEffect 共享；敌人 AI 命令/fallback；battleAnim；按 fidelity gate 分期。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- 当前 packages/game 与 packages/reforge 战斗代码
- docs/phase2/READ-FIRST.md
- 当前 content schema/战斗资料
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 标题明确数据/命令表待补全；AI、命令、动画和多人/边界行为仍有历史待定项。
- fallback 数量、字段和“已拍板”只代表当时设计输入，不能作为当前战斗 runtime 或完整性证明。
- 停止线：不得依据 M4 设计直接改战斗 schema/运行时或宣称全量覆盖；先以当前 battle/content 代码和一手原版证据核对。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `d5e6e7509a35ce680b012129828c82f5e154e638a9b03817580df29aa13e6d37`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）：这是 design-spec，当前文档状态为 historical。全文 144 行、13 个标题；摘要/首段为「> 2026-07-03。最后一个大件，工作量 ≈ 整个 M3。基于：①一阶段 `packages/game/src/core/battle/`」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `d5e6e7509a35ce680b012129828c82f5e154e638a9b03817580df29aa13e6d37`；全文 143 行 / 11123 bytes。
- 原文标题/章节锚点：1:M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）, 8:0. 一句话, 14:1. 两条铁律（向用户承诺，M4 的成败线）, 38:2. 分层（复用 M1–M3 的"纯核 + 壳"骨架）, 51:3. 回合流程（一阶段 battle-system.ts 骨架，忠实移植）, 69:4. 数据迁移范围（普查回填，2026-07-03）, 86:5. 战斗命令集（普查回填）—— 关键决策：效果复用，不重造, 90:# 5.1 效果类（15 个共享 op）→ 复用 M1c/d 的 `SkillEffect` / `ItemUseEffect`。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得依据 M4 设计直接改战斗 schema/运行时或宣称全量覆盖；先以当前 battle/content 代码和一手原版证据核对。

## 继任文档

- 当前 canonical / 复核入口：当前 packages/game 与 packages/reforge 战斗代码, docs/phase2/READ-FIRST.md, 当前 content schema/战斗资料。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `d5e6e7509a35ce680b012129828c82f5e154e638a9b03817580df29aa13e6d37`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）
>
> > 2026-07-03。最后一个大件，工作量 ≈ 整个 M3。基于：①一阶段 `packages/game/src/core/battle/`
> > （~9000 行）+ `present/battle/`（~1900 行）= 语义真值源；②M3 已留 `startBattle(team):
> > Promise<'win'|'lose'|'flee'>` 接口；③向用户承诺的两条铁律（见 §1）。
> > **本文定架构与分期；§4 数据迁移 / §5 战斗命令全集待战斗数据普查回填。**
>
> ## 0. 一句话
>
> 回合战 = **纯函数公式层（可直接移植）+ 状态机（phase 流程）+ 动画 driver（拍频架构照搬）
> + 敌人 AI 走同一个 ScriptRunner（绝不建第二解释器）**。startBattle 是主脚本调进来的一条
> 命令，打完返回 win/lose/flee。
>
> ## 1. 两条铁律（向用户承诺，M4 的成败线）
>
> 一阶段战斗那些"架构问题不好改、老出 bug"的坑，根因是两处结构债。M4 从架构规避：
>
> **铁律①：单解释器，敌人 AI / 战斗脚本走同一个 `ScriptRunner`。**
> 一阶段有 `battle-opcodes.ts`（1447 行）= 独立于事件侧 `applyRawOpcode` 的**第二个 opcode
> 解释器**（CLAUDE.md 记的"opcode 双解释器"坑，0x8A 只实现一侧致石长老战变手动）。
> M4 **不复辟**：ScriptRunner 已是通用 AST 执行器（控制流/stages/分支/条件与 host 解耦）。
> 战斗时注入 **BattleScriptHost**（实现战斗命令：施法/召唤/改状态/AI 决策），探索时注入
> 现有 host。解释器一份，host 是策略。战斗命令是独立的判别联合（enemyUseMagic 等只在
> 战斗有意义），但**控制流基建 100% 复用**（run/runStages/branch/evalCondition/AbortSignal）。
>
> **铁律②：动画拍频用 driver 模式规避（照搬一阶段已验证的机制）。**
> 一阶段"施法慢/卡顿"根因：40ms 逻辑 tick 离散推进非-40ms 整数倍的动画帧
> （法术 `(speed+5)*10ms`，最坏 50ms → 抖成 80/40/40 拍频）。一阶段的修复
> （`battle-anim-driver.ts:stepBattleAnimRender`）是黄金架构，M4 照搬：
> - **逻辑 idx**（40ms tick / driver 内部）独占副作用（sound/damage/完成判定）→ 确定性，
>   headless 单测走纯 idx 路径；
> - **renderIdx**（present 每 rAF，wall-clock 细分）只领视觉、不落后逻辑、不回退 → 平滑到
>   屏幕刷新率。
> 新引擎天然契合：动画播放 = `await host.playBattleAnim(timeline)` 的 driver（与 M3 的
> fade/move driver 同款），内部逻辑 idx 推进，present 层 renderIdx 细分。AbortSignal 贯穿
> （战斗中途读档/异常 → 全树取消，无孤儿动画态 —— M3 已验证的收尾机制）。
>
> ## 2. 分层（复用 M1–M3 的"纯核 + 壳"骨架）
>
> | 层 | 放哪 | 内容 | 移植来源 |
> |---|---|---|---|
> | **公式**（纯函数） | `content/battle/` | 伤害（物理/法术/base）、dex、行动队列、状态判定、命中/暴击 | `formulas.ts`(216)/`turn-queue.ts`(99)/`magic-damage.ts`(357) 直接移植，SHORT 语义保持 |
> | **状态形状** | `content` | BattleState/Fighter/ActionQueue schema（判别联合，可序列化） | `battle-state.ts`(912) 提炼数据形状 |
> | **状态机** | `reforge/battle/` | phase 流程 + tick 驱动 + 结算 | `battle-system.ts`(3507) 回合流程骨架 |
> | **动画 driver** | `reforge/battle/` | 时间线推进（逻辑 idx）+ 复位 | `battle-anim-driver.ts`(254) 照搬拍频分工 |
> | **动画时间线生成** | `reforge/battle/` | 攻击/施法/召唤/受击的 BattleAnimFrame[] 生成 | `anim-timeline.ts`(1816) —— 最大子件 |
> | **战斗脚本 host** | `reforge/battle/` | BattleScriptHost（施法/召唤/状态/AI），喂给 ScriptRunner | `battle-opcodes.ts`(1447) 语义，但**不作为解释器**，拆成 host 方法 |
> | **present** | `reforge/present/battle/` | 画背景/精灵/特效/数字/UI（indexed framebuffer） | `present/battle/`(1900) |
> | **数据迁移** | `migrate/` | enemies/enemy-objects/battle-fields/battle-sprites → content 表 | 见 §4（待普查） |
>
> ## 3. 回合流程（一阶段 battle-system.ts 骨架，忠实移植）
>
> ```
> preBattle(入场 fade) → [ selectAction ⇄ performAction ]* → won / lost / fled
> ```
> - **preBattle**：入场淡入（present dither）；fade 完进 selectAction。
> - **selectAction**：每轮起手先对全体活敌跑 `scriptOnTurnStart`（boss 嘲讽 = 战斗脚本，
>   走 ScriptRunner + BattleHost）；然后开队员指令菜单（攻击/仙术/物品/防御/逃/自动），
>   UI 写 pendingActions；全选完 build ActionQueue。
> - **performAction**：按 dex 降序逐项消费 ActionQueue。每项：敌人跑 `scriptOnReady`（AI 决策
>   = 战斗脚本）→ 起动画时间线 → driver 推进 → 结算伤害/状态 → 死亡检查。
> - **结算**：全敌死 → won（跑 scriptOnWin 给经验/掉落）；全队死 → lost（onLose 臂）；
>   逃成功 → fled（onFlee 臂）。返回给主脚本的 startBattle。
>
> phase 是显式状态字段（不是 async 栈）——因为 selectAction 要等玩家**无限期**输入，
> 不适合 await（会卡住 rAF）。**动画/脚本子过程内部用 async driver**（有限时长），
> phase 主循环用状态机 tick。二者边界：tick 看 phase 分派，动画/AI 段 await driver。
>
> ## 4. 数据迁移范围（普查回填，2026-07-03）
>
> | 源 | 数量 | → content | 说明 |
> |---|---|---|---|
> | `enemies.json` | 154(id0 空) | **EnemyDef.stats**（新） | health/exp/cash/level/magic/magicRate/attackStrength/magicStrength/defense/dexterity/fleeRate/poisonResistance/elemResistance{5}/physicalResistance/dualMove/collectValue + 动画帧数(idle/magic/attack)/音效(attack/action/magic/death/call)/idleAnimSpeed/actWaitFrames/yPosOffset |
> | `enemy-objects.json` | 153 | **EnemyDef**（合并层，类比 ActorDef→battler） | objectIndex/enemyId(→stats 行)/resistanceToSorcery/scriptOnReady/scriptOnTurnStart/scriptOnBattleEnd/_name。AI 指针在此,非 enemies.json |
> | `enemy-pos.json` | 5 阵型 | **formations** | k+1 敌人的落点表(1 敌=中央,5 敌=五点) |
> | `battle-fields.json` | 58 | **BattleFieldDef** | screenWave + magicEffect{5}(战场元素加成,喂 calcMagicDamage.fieldEffect) |
> | `battle-bgs.json` | 78 | 资产引用 | FBP 战斗背景(present 载) |
> | `battle-sprites/*.rle` | 153 敌+19 player | 资产引用 | 战斗精灵位图(帧数从 enemies.json 帧字段,非 JSON) |
> | `battle-effect-index.json` | 20 | **effectIndex** | 玩家物攻命中特效 sprite-frame 基址(按武器类) |
> | `magic.json` | 104 | **扩 SkillData.battleAnim** | 战斗动画字段(见 §5.3);伤害字段 baseDamage/elemental 已在 M1c |
> | `spells.json` | 103 | 已迁(M1c skill) | OBJECT_MAGIC 包装(magicNumber→magic 行 + 脚本 + flags) |
>
> 敌人 AI(scriptOnReady/TurnStart/BattleEnd)= 59 个小 bytecode 脚本 → 翻译器扩战斗侧翻译 →
> EnemyDef 的 stages（复用 M3 的 stages 机制）。**99/153 敌人无脚本**,纯 fallback AI。
>
> ## 5. 战斗命令集（普查回填）—— 关键决策：效果复用，不重造
>
> 普查揭示 44 个战斗 opcode **不是 44 个新命令**。分三类：
>
> ### 5.1 效果类（15 个共享 op）→ 复用 M1c/d 的 `SkillEffect` / `ItemUseEffect`
>
> 伤害/状态/毒/复活/HP·MP 增减（0x1B/1C/1D/21/22/28/29/2A-2F/61）—— 这些在**事件侧也有**，
> 且 M1c/d 已把技能/物品的效果翻译成 `SkillEffect[]` / `ItemUseEffect[]`（damage/healHp/
> applyStatus/revive/removeStatus/applyPoison…）。**战斗施法/用物 = 在战斗上下文执行同一套
> effect[]**。M4 只需一个 `applyEffectInBattle(effect, caster, target, battleState)` 解析器，
> 不为战斗重造伤害/状态命令。← 这是 M4 工作量的最大压缩点。
>
> ### 5.2 AI 决策类（敌人脚本用，~10 op）→ 新战斗命令 + fallback AI 纯函数
>
> | op | → 命令 / 机制 |
> |---|---|
> | **0x67 enemyUseMagic**（×18,绝对主导） | `enemyCastMagic{magicId, rate}` |
> | 0x91 notFirstJump（×5） | `branch{cond: enemyNotFirstOfKind}` |
> | 0x9E summon（×2,boss） | `enemySummon{enemyId}` |
> | 0x9C division / 0x9F transform | `enemyDivide` / `enemyTransform{enemyId}` |
> | 0x69 escape | `enemyEscape` |
> | 0x68 enemyTurnJump / 0x64 hpAboveJump | `branch{cond: isEnemyTurn / hpAbovePct}` |
> | 0x6B blowAway / 0x6A steal / 0x33 collect | `blowAway` / `stealFromEnemy` / `collectEnemy` |
>
> **fallback AI**（99/153 敌人,无脚本）= 移植 `enemy-ai.ts::decideEnemyAction` 纯函数:
> `magic≠0 && rng(0,9)<magicRate && !silence → 施法,否则物攻;confused→打友方;sleep/paralyzed→跳过`。
>
> ### 5.3 magic 战斗动画字段（新增 `SkillData.battleAnim`）
>
> 普查确认 magic 字段拆两半:**伤害**(baseDamage/elemental,M1c 已迁)vs **动画**(本节新增):
> `effect`(sprite chunk)/`type`(0 单体/1 attackAll/2 whole/3 field/4 toPlayer/5 party/8 trance/
> 9 summon)/`xyOffset`/`special`/`speed`/`keepEffect`/`fireDelay`/`effectTimes`/`shake`/`wave`/`sound`。
>
> ### 5.4 关键忠实性决策(用户偏好:跟原版后期修复)
>
> **0x2E 敌人 set status 命中判定用 `rng(0,9) >= resistanceToSorcery`**（≥,不是 sdlpal 的 buggy
> `>`）—— 普查实测一阶段已跟原版后期修复版。M4 照此,源码注释标注 + golden 钉死（对齐
> `faithful-vs-fix-decision-pattern`:原版=pal.exe,sdlpal 只是参考实现）。
>
> ## 6. 分期与验收（接 roadmap §8 M4）
>
> | 期 | 内容 | 验收 |
> |---|---|---|
> | **M4a 公式+状态+桩战斗** | content 公式层移植（伤害/dex/队列/状态，golden 对齐 fight.c）+ BattleState schema + 最简回合(攻击/防御,无动画) | 单测:伤害/回合序对齐一阶段;startBattle 真跑一场纯攻击战分胜负 |
> | **M4b 动画+仙术+物品** | 动画 driver（拍频架构）+ 攻击/施法时间线 + 仙术/物品指令 + present 战斗渲染 | 浏览器:一场有法术特效的战斗，施法平滑不卡（拍频验收） |
> | **M4c 敌人 AI+状态+召唤** | BattleScriptHost + 敌人 AI 脚本翻译（scriptOnReady/TurnStart）+ 状态机制 + 召唤/分裂 | 浏览器:boss 嘲讽、敌人施法/召唤、中毒/催眠 |
> | **M4d 结算+全流程** | 经验/升级/掉落/收妖 + startBattle 真接线（win/lose/flee 臂）+ 战斗↔剧情边界 | **开场→第一场遇敌→胜利结算→续剧情**，复刻验收表全勾 |
>
> ## 7. 已拍板 / 待定
>
> - ✅ 单解释器（BattleScriptHost 策略），无第二 opcode 解释器（铁律①）。
> - ✅ 动画拍频 driver（逻辑 idx + renderIdx，照搬一阶段，铁律②）。
> - ✅ 公式/队列纯函数直接移植（SHORT 语义，golden 对齐 fight.c 行号）。
> - ✅ phase 状态机（selectAction 无限等待）+ 子过程 async driver（有限动画/AI）混合。
> - ⏳ BattleState 可序列化形状（战斗中存档？一阶段用 snapshot；M4 定）。
> - ⏳ 战斗命令集与事件命令是否共用一个 Command union，还是独立 BattleCommand（倾向独立，
>   控制流基建复用）—— 普查战斗 op 全集后定。
> - ⏳ 敌人 AI 的 RNG 确定性（一阶段 rng.ts 可注入 seed）—— M4a 定注入点。
<!-- original-source-quote:end -->
