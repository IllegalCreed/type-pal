# GAME-PRE94-MENU-PIXEL-PARITY-1 — pre94三处既有菜单显示分歧

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

修复pre94 CODE48/49/50登记的三处菜单显示分歧：①仙术死亡头像——draw-magic.ts无条件满色blit而SDLPal HP==0时bPoisonColor=0经PAL_RLEBlitMonoColor绘黑白；②单人装备选人框——draw-equip.ts rows=max(1,party-1)多出空白高度而SDLPal传wMaxPartyMemberIndex单人即0；③物品使用目标框——draw-inventory.ts在ITEMBOX(120,80)前多绘(+5,+5)shadow而SDLPal仅正常blit。2026-10-20用户批准②③与①显示兜底（“仙术页做兜底死亡黑白头像也可以”），①中机械增加死亡头像分支未批、战后复活可达性另核（SDLPal battle.c:1808-1815仅won调PAL_BattleWon、TS finalizeBattle先写回HP再cleanup不复活、startBattle下一战斗入口才HP0→1）。

## 范围

仅三处显示分歧，非94–102扩展；不改状态机制、存档、资源或公共跨包接口；①以独立palette低位像素oracle、②以真实边框/背景行像素、③以额外shadow位置原背景像素为oracle。

## 前提与证据

固定源全文核读。与GAME-MAGIC-PLAYERINFO-STATUS-1共用present窗口：实现已完成用户批准范围，原始先红后修与后继重放、共享纯提取快照、真实菜单三阶段接线见窗口证据；31文件163定向/相邻通过、无运行诊断、game typecheck通过。完成裁定：共享纯提取与行为修复分别提交，红/绿/真实菜单三阶段、相邻回归和本次完整质量门见集中回执；HP0为批准的防御显示，未声称完整逃跑生产路径已测。锚点:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

## 验收

done只授本卡显示合同与明确文件结论；不授48/49/50整卡信用；浏览器观感/E2E沿原卡集中延后。

## 状态与交接

done保持原语义；治理不重开。当前83卡仍15accept/68partial，48/49/50不提前关闭。

## 历史范围

原卡属固定main时点；范围为三处菜单像素显示子切片。

## 原始结论

原卡结论按其Status(done)原样：2026-10-21完成裁定，批准显示范围完成。

## 当时证据

当时回执属原时点证据：三处真实framebuffer红例先行、31文件163定向相邻零诊断；本页不重跑、不复授。关联:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

## 当前有效性

仅历史任务归属有效；战后复活可达性证据提示可达但未构造真实战斗逃跑→大世界菜单证明；不凭旧基点授权新产品取舍。

## 继任文档

present窗口与GAME-MAGIC-PLAYERINFO-STATUS-1共用；父卡QUALITY-PRE94-RETROSPECTIVE-1继续。 关联:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

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
