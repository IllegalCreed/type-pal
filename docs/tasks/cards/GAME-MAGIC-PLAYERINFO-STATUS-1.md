# GAME-MAGIC-PLAYERINFO-STATUS-1 — 大世界仙术页 PlayerInfoBox 状态显示边界

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

补齐大世界仙术页PlayerInfoBox状态显示：基线drawPlayerInfoBox只绘frame18、头像、HP/MP与slash并注释明确省略；SDLPal uibattle.c:31-269的PAL_PlayerInfoBox按rgPoisonStatus毒色重染头像、死亡改黑白，并绘confused/paralyzed/sleep/silence四类状态字。用户2026-10-20批准“按SDLPal补齐”（只补显示，不改状态机制或存档）。

## 范围

draw-magic.ts的PlayerInfoBox显示与配套专测；死亡头像、装备授予>999状态和phase2 grantedStatuses不在本卡；由Codex核定party-slot poison mapper/status只读适配，不重复知识、不roleId误作poison key。

## 前提与证据

固定源全文核读。build allowed基点b7fc0524a：先保留真实drawMenuStack→drawInGameMagicMenu三个像素红例（非canonical队序party-slot毒色、四状态字、已批准HP0防御显示）；允许提取独立present PlayerInfoBox叶，角色状态由world/battle adapter只读投影，保留battle computePlayerFaceColor既有出口。2026-10-21完成：31文件163定向/相邻通过、无运行诊断、game typecheck通过；全仓check/official ratchet/protected待集中收尾，浏览器视觉/E2E未新跑，framebuffer原件不泛化为观感验收。锚点:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

## 验收

done授本卡显示合同与明确文件结论：HP0为批准的防御显示，未声称完整逃跑生产路径已测；本卡不授48/49/50整卡信用。

## 状态与交接

done保持原语义；治理不重开。Codex唯一Coding Owner。

## 历史范围

原卡属固定main时点；范围为draw-magic PlayerInfoBox显示子切片。

## 原始结论

原卡结论按其Status(done)原样：2026-10-21完成裁定，显示范围完成、质量门见集中回执。

## 当时证据

当时回执属原时点证据：三像素红例先行、31文件163定向/相邻零诊断；本页不重跑、不复授。关联:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

## 当前有效性

仅历史任务归属有效；50卡只能保持partial；不凭旧基点授权新产品取舍。

## 继任文档

与GAME-PRE94-MENU-PIXEL-PARITY-1共用present窗口；父卡QUALITY-PRE94-RETROSPECTIVE-1继续。 关联:[present-speedrun-local.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json) [present-speedrun-gates.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5022B / SHA-256 3746cdeb115ebea33bf9802d94c6f4abdfe1c2ccd2a2ab35a5c16df247049a5f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-MAGIC-PLAYERINFO-STATUS-1 — 大世界仙术页 PlayerInfoBox 状态显示边界

Status: done
Phase: phase1
Capability: Q3 present/menu / first-phase user-visible behavior
Coding Owner: Codex
Reviewer: Codex（独立复核）
Branch: codex/code-quality-3y
Visual Verification Timing: e2e-deferred

> 2026-10-20用户已批准：按SDLPal补齐第一阶段大世界仙术页的中毒头像染色与乱/定/眠/封状态字，先失败像素反例再实现；只补显示，不改状态机制或存档。菜单九卡已在b7fc0524a合入main，现核现有caller/只读适配/primary后进入build。Codex唯一Coding Owner，不再重复申请同一产品裁决。

## 发现

`packages/game/src/present/menu/draw-magic.ts` 的 `drawPlayerInfoBox` 只绘制 frame 18、角色头像、HP/MP 和 slash，并在注释中明确省略中毒染色与状态字。SDLPal `reference/sdlpal/uibattle.c:31-269` 的 `PAL_PlayerInfoBox` 会：

- 读取当前队伍位置的 `rgPoisonStatus`，按毒色重染头像；死亡角色改黑白；
- 在活人信息框中绘制 confused/paralyzed/sleep/silence 四类状态字；
- 这些是大世界仙术页 `magicmenu.c:413-484` / `uigame.c:684-693` 复用的用户可见信息框。

第一阶段文档 `docs/phase1/plans/2026-06-06-battle-system-current-audit.md` 记录该 `PAL_PlayerInfoBox` 状态字与中毒头像变色已修复。当前绘制输入没有明确的 `objectPoisons`/status 显示依赖，不能在本卡内擅自新增公共输入或改变 UI 形态。

## 当前范围与证据

- 实现：`packages/game/src/present/menu/draw-magic.ts`（全文）；发现省略分支。
- 直接测试：`draw-magic.test.ts`、`draw-magic.glm-phase1-leaves.test.ts`、`magic-menu-pixels.grok-r1.test.ts` 全文；25/25 通过，但没有状态/毒色反例。
- caller/state：`draw-menu.ts`、`present.ts`、`in-game-magic-menu.ts`、`menu-driver.ts`、P06 caller/oracle；运行时角色状态由 `GameState` 的 `rgPlayerStatus`/`rgPoisonStatus` 持有。
- primary：SDLPal `uibattle.c:31-269`、`uigame.c:653-875`、`magicmenu.c:413-484`。

## 已给出的产品裁决与技术前提

1. 已批准显示：用户2026-10-20明确选择“按SDLPal补齐”；本次只含中毒头像染色和四类状态字。
2. 由Codex核定现有party-slot poison mapper/status只读适配，避免重复知识/隐式全局与roleId误作poison key；技术选择不再提交用户作不透明二选一。
3. 死亡头像、装备授予的 `>999` 状态和 phase2 `grantedStatuses` 不在本卡实现；本卡只确认 phase1 UI 读模型。

## 禁止事项

产品裁决已获；当前冻结窗口及技术前提/失败像素反例未齐前，不修改 `draw-magic.ts` 公共输入、不新增隐式全局状态、不复制 poison mapper、不改变 sprite 资源或 schema/save，不把 50 标记为整卡已验证。50 只能保持 `partial`；本卡之外的 50 测试合同可独立复核。

## 下一步

当前菜单九卡收口后，按已给裁决先写一个能区分“缺状态字/缺头像染色”的 framebuffer 失败反例，再决定是否进入实现；随后跑 magic direct、menu/status 相邻和统一质量门。未裁决前可继续不重叠的 pre-94 文件复审。

## 2026-10-20 当前 build allowed

Codex唯一Coding Owner；基点b7fc0524a，与origin/main同点且主树干净。先保留真实drawMenuStack→drawInGameMagicMenu的三个像素红例，覆盖非canonical队序的party-slot毒色、四状态字、已批准的HP0防御显示。允许提取独立present PlayerInfoBox叶，角色状态/数值由各自world/battle adapter只读投影；保留battle computePlayerFaceColor既有出口与签名，不引入world→battle渲染反向依赖。纯共享重构与显示修复分别留源码快照/提交；统一门仍集中整个present大窗口收尾。生命周期/资源缺帧/透明像素与既有world/battle相邻测试必须核验，不以新三个例子代替50卡整体验收。

## 2026-10-21 本地修复与验证

当前实现已完成用户批准范围，原始先红后修与后继重放、共享纯提取快照、真实菜单三阶段接线、必要测试夹具/标题修正均见[窗口唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-local.json)。本卡不授48/49/50整卡信用；31文件163定向/相邻通过、无运行诊断，game typecheck通过。全仓check/official coverage ratchet/protected仍待集中收尾，浏览器视觉/E2E未新跑，不把framebuffer原件泛化为观感验收。

## 2026-10-21 完成裁定

批准显示范围已完成；共享纯提取与行为修复分别提交，红/绿/真实菜单三阶段、相邻回归和本次完整质量门见[集中回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。只授本卡显示合同与明确文件结论；HP0为批准的防御显示，未声称完整逃跑生产路径已测；浏览器观感/E2E仍沿原卡集中延后，不改状态机制/存档/资产或跨包公共接口。
```
<!-- incremental-original-source:end -->
