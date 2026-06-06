# 2026-06-06 Battle System Current Audit

本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。
旧 roadmap 中的阶段性残留不在这里复写,避免把已修功能再次当缺口处理。

## 已排除的旧误报

- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
- 召唤 Summon 已接入 `buildAndStartSummonAnim`;Trance/梦蛇已接通 object-magic 解析与成功后的闪色变身段。
- 敌方 AI 的 sleep/paralyzed/silence/confused、脚本改写 wMagic、dualMove 队列都已由上游链路处理。
- battle music、0x31 battle sprite override、0x92 show magic anim 均已接入。
- OBJECT_PLAYER 的 friendDeath/dying 脚本已提取并在战斗伤害/毒伤后触发。

## P0:已修复行为差异

1. 战斗使用道具消耗规则
   - 已修: `performItem` 先跑 `PAL_RunTriggerScript(scriptOnUse, targetRole)`,脚本后仅 `kItemFlagConsuming` 扣。
   - 注意:战斗 UseItem 按 `fight.c:4387-4400` 不检查 `g_fScriptSuccess`;大世界 UseItem 仍保留成功 gate。

2. 投掷 `scriptOnThrow == 0` 的道具
   - 已修: `scriptOnThrow == 0` 视为 no-op,随后仍 `PAL_AddItemToInventory(-1)`。

3. 战斗脚本 `0x50 fade out`
   - 已修: battle `runScript` raw fallback 会启动同一套 `paletteFadeState` 并消费 opcode。
   - 已修: `tickBattle` 会在 `paletteFadeState` 未完成时同步阻塞后续行动队列,淡完收尾后再继续。

## P1:规则/体验差异

1. 战斗选择期 `nAmountInUse`
   - 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。
   - 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。

2. cover 专属演出
   - 已修:自动防御和 cover 的核心结算已接入。
   - 已修:coverer 跳到目标前 frame 3、coverSound、命中后敌人与 coverer 位移已接入 enemy physical timeline。

3. 底部状态图标
   - 已修:中毒头像变色 + `PAL_PlayerInfoBox` 状态字(乱/定/眠/封)已实现。
   - 说明:CLASSIC 底部信息框无 time-meter bar;buff 类 puppet/bravery/protect/haste/dualAttack 在原版状态字表为 0,不显示。

## P2:低优先级

- Trance/梦蛇:已修 `spells.json` 缺 295 时从 `object-magics.json` 回退解析,可进法术菜单/执行 0x30/0x31,并在成功后播放 `iColorShift` 闪色与末帧 sprite 切换。后续若继续抠原版视觉,可补完整 `PAL_BattleFadeScene` 级别的场景淡换。
- 部分历史计划文档仍保留旧阶段描述,仅作考古资料;以本文件为当前战斗大修入口。
