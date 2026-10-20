# GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧

Status: draft
Owner: Codex
Reviewer: Codex（不冒充第三方）
Coding Owner: Codex
Branch: codex/code-quality-3y
Phase: phase1
Capability: pre94 menu pixel parity
Visual Verification Timing: e2e-deferred

## 范围与停止线

仅pre94 CODE48/49/50已登记的三处显示分歧，非94–102扩展。当前菜单九卡集中门期间不改实现。三项均已获用户裁决；后续先真实framebuffer红例，再修复显示；不改状态机制、存档、资源或公共跨包接口。其它独立pre94工作继续。

## 当前源码与primary

- 仙术死亡头像：draw-magic.ts drawPlayerInfoBox无条件满色blit。SDLPal uibattle.c PAL_PlayerInfoBox在HP==0时强制bPoisonColor=0，经PAL_RLEBlitMonoColor绘制黑白。先前50卡只获中毒头像/四状态字显示授权，此项未偷并。已全文读draw-magic，当前primary31–269全文核对。
- 单人装备选人框：draw-equip.ts角色框rows=Math.max(1,partyMembers.length-1)。SDLPal uigame.c PAL_EquipItemMenu的PAL_CreateBox传wMaxPartyMemberIndex，单人即0。真实confirmEquipItem→pick-role可达；差异为额外空白高度，不改变选人逻辑。source/caller既有全文证据复用，本轮定向核当前参数和C调用。
- 物品使用目标框：draw-inventory.ts在ITEMBOX(120,80)之前又绘制(+5,+5)shadow。SDLPal uigame.c PAL_ItemUseMenu仅在(120,80)正常blit，无该shadow。仅此目标层，不误删物品列表本来就有的阴影。source/caller既有全文证据复用，本轮核当前具体分支和C调用。

## 用户裁决与验证方案

2026-10-20用户批准②单人装备框空白高度删除、③物品目标框多余阴影对齐SDLPal；均先真实framebuffer红例再修。①用户指出战死角色战后自动复活，要求核大世界死亡角色可达性，未批准机械增加死亡头像分支。先核战后复活、世界HP写入与合法菜单入口；没有生产可达证据时不实施①、不用合成HP0夹具冒充缺陷。当前定向证据：SDLPal battle.c:1808–1815仅won调用PAL_BattleWon；胜利恢复在1342–1372，逃跑不走该函数。TS battle-finalization.ts finalizeBattle先写回HP再cleanup，仅清状态/毒，不复活；startBattle在下一次战斗入口才HP0→1。该路径提示可达，但尚未构造真实战斗逃跑→大世界菜单证明，此为可达性待补证，与随后已批准的防御显示范围分别记录。

用户随后明确“仙术页做兜底死亡黑白头像也可以”，故①显示兜底亦批准，不改变复活/逃跑/HP机制。①以独立palette低位像素oracle；防御HP0夹具不冒充已跑通的完整生产路径。②以真实边框/背景行像素和合法pick-role夹具；③以额外shadow位置的原背景像素为oracle。先保留旧实现指定业务失败，再实现，回归多队员/物品列表合法阴影。未执行的反例/浏览器验证不记通过。

## 交接

与GAME-MAGIC-PLAYERINFO-STATUS-1协调到同一后续present窗口；当前已获三项显示授权，仍不授三文件验收，不提前把48/49/50升级。
