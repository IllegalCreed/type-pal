# 2026-06-06 Battle System Current Audit

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: audit-report-v1 / 1.0.0

本页是 2026-06-06 战斗系统现状审计的归档回执。旧误报排除清单与 P0/P1/P2 分级差异在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前实现信用。

## 审计问题

- 战斗系统大修入口：只记录当时 TS 实现与 SDLPal 的实质差异；旧 roadmap 的阶段性残留不复写，避免把已修功能再次当缺口处理。

## 范围与证据

- 2026-06-06 时点的 battle 子系统；证据为 sdlpal 源行号对照与已修提交（quote 保全）。

## 发现

- 已排除的旧误报 8 组：Protect 除因子、Summon/Trance 接入、敌方状态门与 dualMove、battle music、0x31/0x92、friendDeath/dying 脚本、D29 baseline 生产同源化等此前均为旧文档过期描述。
- P0 已修复行为差异：战斗用物消耗规则（先跑 scriptOnUse 再按 kItemFlagConsuming 扣、scriptOnUse==0 按 no-op、UseItem 前摇后跑脚本；战斗 UseItem 不检查 g_fScriptSuccess 而 大世界保留 gate）、投掷 scriptOnThrow==0 等。
- P1 规则/体验差异五项已修：选择期 nAmountInUse 预占、cover 专属演出、底部状态字（乱/定/眠/封）、同速行动顺序（同 dex 敌先）、同一敌人模板对象变体按原始 OBJECT_ENEMY 编号挂脚本。

## 结论

- 当时战斗差异主体已收口，剩余入 P2 低优先级（quote 保全）。

## 整改与复核

- 各修复已带对应实现；后续战斗差异以 [cutscene-status](../status/cutscene-status.md)、[feature-status](../status/feature-status.md) 与新审计为准。

## 历史范围

- phase1 plans 审计快照；时点 2026-06-06；固定来源与 source SHA 见下方保全节。

## 原始结论

- 旧误报排除 8 组、P0/P1 分级清单为原始结论本体。

## 当时证据

- sdlpal fight.c 行号引用与逐项修复说明在 quote 保全。

## 当前有效性

- historical。审计按 2026-06-06 时点解释；当前战斗行为以现行代码与测试为准。

## 继任文档

- phase1 状态表与后续审计；[目录导航](README.md)。

## 原文保全

固定源 revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # 2026-06-06 Battle System Current Audit
>
> 本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。
> 旧 roadmap 中的阶段性残留不在这里复写,避免把已修功能再次当缺口处理。
>
> ## 已排除的旧误报
>
> - Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
> - 召唤 Summon 已接入 `buildAndStartSummonAnim`;Trance/梦蛇已接通 object-magic 解析与成功后的闪色变身段;敌方 0x9E/0x9F 已有基础时间线演出。
> - 敌方 AI 的 sleep/paralyzed/silence/confused、脚本改写 wMagic、dualMove 队列都已由上游链路处理。
> - battle music、0x31 battle sprite override、0x92 show magic anim 均已接入。
> - OBJECT_PLAYER 的 friendDeath/dying 脚本已提取并在战斗伤害/毒伤后触发。
> - D29 baseline harness 已改用生产同源 `events/all.json` 与 object 视图表;法术/道具等五组 fixture 全部实际运行,不再因旧资源入口整组 skip。
>
> ## P0:已修复行为差异
>
> 1. 战斗使用道具消耗规则
>    - 已修: `performItem` 先跑 `PAL_RunTriggerScript(scriptOnUse, targetRole)`,脚本后仅 `kItemFlagConsuming` 扣。
>    - 已修: `scriptOnUse == 0` 按 `PAL_RunTriggerScript(0, ...)` no-op 处理,不再误判为不可用。
>    - 已修:玩家 UseItem 先播 `PAL_BattleShowPlayerUseItemAnim` 前摇(Delay(4)、前移 frame5、sound 28、目标队员 colorShift),动画后再跑脚本与扣库存。
>    - 注意:战斗 UseItem 按 `fight.c:4387-4400` 不检查 `g_fScriptSuccess`;大世界 UseItem 仍保留成功 gate。
>
> 2. 投掷 `scriptOnThrow == 0` 的道具
>    - 已修: `scriptOnThrow == 0` 视为 no-op,随后仍 `PAL_AddItemToInventory(-1)`。
>
> 3. 战斗脚本 `0x50 fade out`
>    - 已修: battle `runScript` raw fallback 会启动同一套 `paletteFadeState` 并消费 opcode。
>    - 已修: `tickBattle` 会在 `paletteFadeState` 未完成时同步阻塞后续行动队列,淡完收尾后再继续。
>
> ## P1:规则/体验差异
>
> 1. 战斗选择期 `nAmountInUse`
>    - 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。
>    - 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。
>
> 2. cover 专属演出
>    - 已修:自动防御和 cover 的核心结算已接入。
>    - 已修:coverer 跳到目标前 frame 3、coverSound、命中后敌人与 coverer 位移已接入 enemy physical timeline。
>
> 3. 底部状态图标
>    - 已修:中毒头像变色 + `PAL_PlayerInfoBox` 状态字(乱/定/眠/封)已实现。
>    - 说明:CLASSIC 底部信息框无 time-meter bar;buff 类 puppet/bravery/protect/haste/dualAttack 在原版状态字表为 0,不显示。
>
> 4. 同速行动顺序
>    - 已修:CLASSIC 行动队列先填敌人再填玩家,排序仅在 dex 严格更大时交换;同 dex 现在保持敌人先行动。
>
> 5. 同一敌人模板的对象变体
>    - 已修:enemy-teams 提取时保留每槽原始 OBJECT_ENEMY 编号,startBattle 据此精确挂 AI 脚本与抗性。
>    - 原差异:如“女飞贼”与“女飞贼1”共用 enemyId=81 但脚本不同,旧实现按 enemyId 取第一条会串脚本。
>
> ## P2:低优先级
>
> - Trance/梦蛇:已修 `spells.json` 缺 295 时从 `object-magics.json` 回退解析,可进法术菜单/执行 0x30/0x31;每次施放都会走 PreMagic 前摇,随后 `iColorShift` 闪色与末帧 sprite 切换。友方全体目标按 CLASSIC 同 tick 提交,不再闪 PlayerAll 箭头。后续若继续抠原版视觉,可补完整 `PAL_BattleFadeScene` 级别的场景淡换。
> - 敌方 0x9E/0x9F:已接基础施法/高亮/闪色与音效时间线。后续若继续抠原版视觉,可补 `PAL_BattleFadeScene` 级别的场景淡换与画面重绘细节。
> - 部分历史计划文档仍保留旧阶段描述,仅作考古资料;以本文件为当前战斗大修入口。
<!-- original-source-quote:end -->
