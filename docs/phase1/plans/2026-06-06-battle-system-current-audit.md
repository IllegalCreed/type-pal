# 2026-06-06 Battle System Current Audit

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: audit-report-v1 / 1.0.0

本页把 phase1 历史计划/审计接入 `audit-report-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 历史问题域：Current battle audit: false-positive exclusions, P0/P1/P2 findings.
- 当前状态轴：历史；旧审计状态词只属于原始日期。

## 范围与证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165`；56 行槽 / 3873 bytes。
- 标题/章节锚点：1:2026-06-06 Battle System Current Audit; 6:已排除的旧误报; 15:P0:已修复行为差异; 30:P1:规则/体验差异; 51:P2:低优先级。

## 发现

- 正文信号 8:- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
- 正文信号 28:- 已修: `tickBattle` 会在 `paletteFadeState` 未完成时同步阻塞后续行动队列,淡完收尾后再继续。
- 正文信号 33:- 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。
- 正文信号 34:- 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。

## 结论

- 2026-06-06 Battle System Current Audit：这是 audit-report，当前文档状态为 historical。全文 56 行、5 个标题；摘要/首段为「本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。」。属于历史/归档材料，不能单独证明当前实现。
- 本轮不重跑一阶段、runtime、E2E、视觉或 coverage。

## 整改与复核

- 停止线：do not promote historical claims to current truth without a current source or user decision
- 后继：C；u；r；r；e；n；t； ；b；a；t；t；l；e； ；c；o；d；e；/；t；e；s；t；s； ；a；n；d； ；f；r；e；s；h； ；a；u；d；i；t；.。

## 历史范围

- phase1 archive plan/audit；日期：2026-06-06；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165`。

## 原始结论

- 2026-06-06 Battle System Current Audit：这是 audit-report，当前文档状态为 historical。全文 56 行、5 个标题；摘要/首段为「本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：1:2026-06-06 Battle System Current Audit; 6:已排除的旧误报; 15:P0:已修复行为差异; 30:P1:规则/体验差异; 51:P2:低优先级；原始正文、代码、表格、状态词在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- 正文信号 8:- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
- 正文信号 28:- 已修: `tickBattle` 会在 `paletteFadeState` 未完成时同步阻塞后续行动队列,淡完收尾后再继续。
- 正文信号 33:- 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。
- 正文信号 34:- 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。

## 继任文档

- C；u；r；r；e；n；t； ；b；a；t；t；l；e； ；c；o；d；e；/；t；e；s；t；s； ；a；n；d； ；f；r；e；s；h； ；a；u；d；i；t；.。
- 当前事实由继任规范、代码和新的 review 决定。

## 原文保全

固定源 SHA `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165`；quote 中用 `␠` 表示原始行尾空格、`⇥` 表示原始行尾 tab；逆向解码后得到相同 bytes。
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
