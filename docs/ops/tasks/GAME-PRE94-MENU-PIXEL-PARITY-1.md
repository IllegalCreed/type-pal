# GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（不冒充第三方） Branch: codex/code-quality-3y Capability: pre94 menu pixel parity);本页治理不重开已终态任务。

## 范围

原卡含章节[GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧、范围与停止线、当前源码与primary、用户裁决与验证方案、交接、2026-10-20 build allowed],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源4727B(SHA 6e704c62391a);原卡前提按原时点保留。当前存活入口:[present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) [present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) [present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4727B / SHA-256 6e704c62391a17b9a7822f4d6a9e1b13f54b406cb975423a125b8851fc3195c0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧

Status: done
Owner: Codex
Reviewer: Codex（不冒充第三方）
Coding Owner: Codex
Branch: codex/code-quality-3y
Phase: phase1
Capability: pre94 menu pixel parity
Visual Verification Timing: e2e-deferred

## 范围与停止线

仅pre94 CODE48/49/50已登记的三处显示分歧，非94–102扩展。菜单九卡已在b7fc0524a合入main，现按当前白名单开工。三项均已获用户裁决；后续先真实framebuffer红例，再修复显示；不改状态机制、存档、资源或公共跨包接口。其它独立pre94工作继续。

## 当前源码与primary

- 仙术死亡头像：draw-magic.ts drawPlayerInfoBox无条件满色blit。SDLPal uibattle.c PAL_PlayerInfoBox在HP==0时强制bPoisonColor=0，经PAL_RLEBlitMonoColor绘制黑白。先前50卡只获中毒头像/四状态字显示授权，此项未偷并。已全文读draw-magic，当前primary31–269全文核对。
- 单人装备选人框：draw-equip.ts角色框rows=Math.max(1,partyMembers.length-1)。SDLPal uigame.c PAL_EquipItemMenu的PAL_CreateBox传wMaxPartyMemberIndex，单人即0。真实confirmEquipItem→pick-role可达；差异为额外空白高度，不改变选人逻辑。source/caller既有全文证据复用，本轮定向核当前参数和C调用。
- 物品使用目标框：draw-inventory.ts在ITEMBOX(120,80)之前又绘制(+5,+5)shadow。SDLPal uigame.c PAL_ItemUseMenu仅在(120,80)正常blit，无该shadow。仅此目标层，不误删物品列表本来就有的阴影。source/caller既有全文证据复用，本轮核当前具体分支和C调用。

## 用户裁决与验证方案

2026-10-20用户批准②单人装备框空白高度删除、③物品目标框多余阴影对齐SDLPal；均先真实framebuffer红例再修。①用户指出战死角色战后自动复活，要求核大世界死亡角色可达性，未批准机械增加死亡头像分支。先核战后复活、世界HP写入与合法菜单入口；没有生产可达证据时不实施①、不用合成HP0夹具冒充缺陷。当前定向证据：SDLPal battle.c:1808–1815仅won调用PAL_BattleWon；胜利恢复在1342–1372，逃跑不走该函数。TS battle-finalization.ts finalizeBattle先写回HP再cleanup，仅清状态/毒，不复活；startBattle在下一次战斗入口才HP0→1。该路径提示可达，但尚未构造真实战斗逃跑→大世界菜单证明，此为可达性待补证，与随后已批准的防御显示范围分别记录。

用户随后明确“仙术页做兜底死亡黑白头像也可以”，故①显示兜底亦批准，不改变复活/逃跑/HP机制。①以独立palette低位像素oracle；防御HP0夹具不冒充已跑通的完整生产路径。②以真实边框/背景行像素和合法pick-role夹具；③以额外shadow位置的原背景像素为oracle。先保留旧实现指定业务失败，再实现，回归多队员/物品列表合法阴影。未执行的反例/浏览器验证不记通过。

## 交接

与GAME-MAGIC-PLAYERINFO-STATUS-1协调到同一后续present窗口；当前已获三项显示授权，仍不授三文件验收，不提前把48/49/50升级。

## 2026-10-20 build allowed

Codex唯一Owner；与GAME-MAGIC-PLAYERINFO-STATUS-1共用present窗口。①死亡黑白兜底纳入同一PlayerInfoBox显示合同，保留“防御夹具、未声称完整逃跑路径”的边界；②装备选人和③物品目标阴影分别以独立真实像素红例先行。内部显示依赖接线/共享叶属于已批准显示的技术落地，不扩展跨包公共API、状态机制或资产。当前83卡仍15accept/68partial，48/49/50不提前关闭。

## 2026-10-21 本地修复与验证

当前实现已完成用户批准范围，原始先红后修与后继重放、共享纯提取快照、真实菜单三阶段接线、必要测试夹具/标题修正均见[窗口唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json)。本卡不授48/49/50整卡信用；31文件163定向/相邻通过、无运行诊断，game typecheck通过。全仓check/official coverage ratchet/protected仍待集中收尾，浏览器视觉/E2E未新跑，不把framebuffer原件泛化为观感验收。

## 2026-10-21 完成裁定

批准显示范围已完成；共享纯提取与行为修复分别提交，红/绿/真实菜单三阶段、相邻回归和本次完整质量门见[集中回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。只授本卡显示合同与明确文件结论；HP0为批准的防御显示，未声称完整逃跑生产路径已测；浏览器观感/E2E仍沿原卡集中延后，不改状态机制/存档/资产或跨包公共接口。
```
<!-- incremental-original-source:end -->
