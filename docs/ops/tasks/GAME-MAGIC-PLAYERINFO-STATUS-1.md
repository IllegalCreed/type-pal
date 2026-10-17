# GAME-MAGIC-PLAYERINFO-STATUS-1 — 大世界仙术页 PlayerInfoBox 状态显示边界

Status: draft
Phase: phase1
Capability: Q3 present/menu / first-phase user-visible behavior
Coding Owner: Codex
Reviewer: Codex（独立复核）
Branch: codex/code-quality-3y
Visual Verification Timing: e2e-deferred

> 高风险边界卡：本卡由 CODE-QUALITY-50 复审发现；尚未授权实现。需要先确认大世界仙术页是否必须复用 SDLPal `PAL_PlayerInfoBox` 的中毒头像染色与乱/定/眠/封状态字。

## 发现

`packages/game/src/present/menu/draw-magic.ts` 的 `drawPlayerInfoBox` 只绘制 frame 18、角色头像、HP/MP 和 slash，并在注释中明确省略中毒染色与状态字。SDLPal `reference/sdlpal/uibattle.c:31-269` 的 `PAL_PlayerInfoBox` 会：

- 读取当前队伍位置的 `rgPoisonStatus`，按毒色重染头像；死亡角色改黑白；
- 在活人信息框中绘制 confused/slow/sleep/silence 四类状态字；
- 这些是大世界仙术页 `magicmenu.c:413-484` / `uigame.c:684-693` 复用的用户可见信息框。

第一阶段文档 `docs/phase1/plans/2026-06-06-battle-system-current-audit.md` 记录该 `PAL_PlayerInfoBox` 状态字与中毒头像变色已修复。当前绘制输入没有明确的 `objectPoisons`/status 显示依赖，不能在本卡内擅自新增公共输入或改变 UI 形态。

## 当前范围与证据

- 实现：`packages/game/src/present/menu/draw-magic.ts`（全文）；发现省略分支。
- 直接测试：`draw-magic.test.ts`、`draw-magic.glm-phase1-leaves.test.ts`、`magic-menu-pixels.grok-r1.test.ts` 全文；25/25 通过，但没有状态/毒色反例。
- caller/state：`draw-menu.ts`、`present.ts`、`in-game-magic-menu.ts`、`menu-driver.ts`、P06 caller/oracle；运行时角色状态由 `GameState` 的 `rgPlayerStatus`/`rgPoisonStatus` 持有。
- primary：SDLPal `uibattle.c:31-269`、`uigame.c:653-875`、`magicmenu.c:413-484`。

## 未决裁决

1. 大世界仙术页底部 PlayerInfoBox 是否必须显示与战斗 PlayerInfoBox 相同的中毒头像染色和四类状态字？
2. 若必须显示，canonical 输入应复用现有 party-slot poison mapper / status readout，还是另开专用只读 presenter 适配；不得把 `roleId` 直接当 poison key。
3. 死亡头像、装备授予的 `>999` 状态和 phase2 `grantedStatuses` 不在本卡实现；本卡只确认 phase1 UI 读模型。

## 禁止事项

在用户/前提裁决前，不修改 `draw-magic.ts` 公共输入、不新增隐式全局状态、不复制 poison mapper、不改变 sprite 资源或 schema/save，不把 50 标记为整卡已验证。50 只能保持 `partial`；本卡之外的 50 测试合同可独立复核。

## 下一步

取得裁决后先写一个能区分“缺状态字/缺头像染色”的 framebuffer 失败反例，再决定是否进入实现；随后跑 magic direct、menu/status 相邻和统一质量门。未裁决前可继续不重叠的 pre-94 文件复审。
