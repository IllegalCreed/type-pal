# 2026-06-06 Battle System Current Audit

本文件作为战斗系统大修入口,只记录当前 TS 实现与 SDLPal 的实质差异。
旧 roadmap 中的阶段性残留不在这里复写,避免把已修功能再次当缺口处理。

## 已排除的旧误报

- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。
- 召唤 Summon 已接入 `buildAndStartSummonAnim`;仅 trance 仍留后续。
- 敌方 AI 的 sleep/paralyzed/silence/confused、脚本改写 wMagic、dualMove 队列都已由上游链路处理。
- battle music、0x31 battle sprite override、0x92 show magic anim 均已接入。
- OBJECT_PLAYER 的 friendDeath/dying 脚本已提取并在战斗伤害/毒伤后触发。

## P0:行为差异

1. 战斗使用道具消耗规则
   - 当前: `performItem` 在脚本前无条件扣队员库存。
   - 原版: `PAL_RunTriggerScript(scriptOnUse, targetRole)` 之后,仅 `kItemFlagConsuming` 时扣。
   - 风险: 非消耗品被扣;脚本失败/目标失败时仍可能提前扣。

2. 投掷 `scriptOnThrow == 0` 的道具
   - 当前: 直接 warn + return,不消耗。
   - 原版: `PAL_RunTriggerScript(0, target)` 是 no-op,随后仍 `PAL_AddItemToInventory(-1)`。
   - 风险: 可投掷但无脚本的物品在 TS 中无法按原版消耗/演出。

3. 战斗脚本 `0x50 fade out`
   - 当前: fade 只在普通事件循环内联处理;战斗 raw fallback 可能跳过。
   - 原版: 战斗物品/法术脚本可触发淡屏。

## P1:规则/体验差异

1. 战斗选择期没有 `nAmountInUse`
   - 多名队员同回合可选择同一个仅剩 1 个的物品。
   - 原版选择菜单用 `nAmount > nAmountInUse` 隐藏已预占物品。

2. cover 专属演出
   - 自动防御和 cover 的核心结算已接入。
   - coverer 跳位、cover sound、受击演出仍需补 present/timeline。

3. 底部状态图标
   - 中毒头像变色已实现。
   - confused/sleep/silence 等状态图标仍省略。

## P2:低优先级

- trance 变身逻辑/动画:当前玩家法术数据基本不用,但应在后续完整还原。
- 部分历史计划文档仍保留旧阶段描述,仅作考古资料;以本文件为当前战斗大修入口。
