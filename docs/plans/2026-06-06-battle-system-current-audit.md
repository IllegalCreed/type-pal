# 2026-06-06 Battle System Current Audit

本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。
旧 roadmap 中的阶段性残留不在这里复写,避免把已修功能再次当缺口处理。

## 已排除的旧误报

- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
- 召唤 Summon 已接入 `buildAndStartSummonAnim`;仅 trance 仍留后续。
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
   - 后续:若要完全同步阻塞,需把 palette fade hold 接入战斗 tick/动画队列。

## P1:规则/体验差异

1. 战斗选择期 `nAmountInUse`
   - 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。
   - 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。

2. cover 专属演出
   - 已修:自动防御和 cover 的核心结算已接入。
   - 已修:coverer 跳到目标前 frame 3、coverSound、命中后敌人与 coverer 位移已接入 enemy physical timeline。

3. 底部状态图标
   - 中毒头像变色已实现。
   - confused/sleep/silence 等状态图标仍省略。

## P2:低优先级

- trance 变身逻辑/动画:当前玩家法术数据基本不用,但应在后续完整还原。
- 部分历史计划文档仍保留旧阶段描述,仅作考古资料;以本文件为当前战斗大修入口。
