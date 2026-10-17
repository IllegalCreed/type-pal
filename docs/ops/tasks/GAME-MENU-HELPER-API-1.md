# GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入

Status: draft
Phase: phase1
Capability: menu helper public API ownership
Coding Owner: 未分配（等待准入）
Reviewer: Codex
Visual Verification Timing: N/A（公共出口/测试边界）

## 发现与停止线（2026-10-17）

CODE-QUALITY-107 对 menu helper 实现、测试、真实 caller 和 SDLPal primary 做了完整读取。
当前 caller census 显示：

- `packages/game/src/core/menu/primitives.ts` 的 `pageUp`、`pageDown` 为导出函数，内部
  `findNextSelectable` 仅由它们调用；全仓生产源码没有 caller，现有消费只在
  `primitives.test.ts` 与 `primitives.glm-phase1-leaves.test.ts`。
- `packages/game/src/core/menu/item-select.ts` 的 `createItemSelectMenu`、
  `ItemDisplayMode` 和 rightText 建表逻辑没有生产 caller；现有消费只在
  `item-select.glm-phase1-leaves.test.ts` 与 `__tests__/item-magic-select.test.ts`。
  真实 inventory/shop/sell 路径使用各自菜单 builder，不调用该 helper。

删除这些导出会改变公共模块接口，也可能影响未被当前仓库静态搜索捕获的外部 caller。
按 AGENTS.md 公共接口停止线，本卡只登记事实，不删除代码、不改测试、不改产品行为，
没有 `build allowed`。

## 事实锚点

- 当前实现与测试证据：[CODE-QUALITY-107 review](../evidence/CODE-QUALITY-107/codex-current-review.md)。
- 当前 primary：SDLPal `ui.c:510-572`（逐项光标，无 PgUp/PgDn 产品路径）、
  `itemmenu.c:28-466`、`play.c:266`、`uigame.c:1777`（真实物品入口）。
- 当前真实 callers：`inventory-menu.ts`、`sell-menu.ts`、`equip-menu.ts`、
  `in-game-magic-menu.ts` 与 `menu-driver.ts`；它们不消费待删除 helper。

## 准入条件

只有在确认以下事项后才能进入 `build`：

1. 用户确认这些导出不属于外部包、插件或未纳入仓库的运行时 caller；
2. 明确选择删除 test-only helper，或保留并标记为有意的测试合同；
3. 若删除，先写失败反例证明真实公共出口不可达，再删除实现与仅依赖该出口的弱测试，
   并运行 game/menu 相邻测试、typecheck、全仓质量门和 coverage ratchet/protected fast；
4. 不用 `as`、ignore、exclude、导出重命名或空壳包装绕过接口变化。

在准入前，CODE-QUALITY-107 的 E-4/E-5 保持 review，相关文件不标已验证。
