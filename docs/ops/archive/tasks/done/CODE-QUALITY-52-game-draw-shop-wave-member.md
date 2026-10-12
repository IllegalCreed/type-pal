# CODE-QUALITY-52 — game draw shop wave member

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu wave
Visual Verification Timing: e2e-deferred（商店观感留集中 E2E；本批核 framebuffer、价格/库存与 overlay 合同）

## 目标

逐文件核验商店买/卖绘制实现及两份专属测试，确认买入列表/价格、预览框/图标、ownedCount（库存+装备）、金钱、确认框、卖价 overlay、缺目录/缺帧边界与 framebuffer ownership 对齐 SDLPal；本卡与 CODE-QUALITY-51 组成 present/menu wave，先完成定向证据，wave 完整后统一跑全仓门。

## 范围

- `packages/game/src/present/menu/draw-shop.ts`
- `packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts`

只读相邻 oracle：`packages/game/src/present/__tests__/grok-present/p04-shop.test.ts`、`draw-menu.ts`、`present.ts`、`core/menu/shop-menu.ts`、`menu-driver.ts`、`reference/sdlpal/uigame.c:1503-1777`。

## 前提真值门

- 一句话行为 / 工程前提：买/卖菜单绘制只把现有 `ShopMenuState`、运行时库存/装备与资源投影到 framebuffer，保持 SDLPal 买入预览布局和卖出 overlay 的既有产品形态。
- 真值来源：`reference/sdlpal/uigame.c:1503-1590,1615-1703,1709-1777`（买入/卖出布局、owned、价格/半价、框体/图标）；`packages/game/src/core/menu/shop-menu.ts:1-220`（state/price/confirm 生命周期）。
- 当前 `before` -> 目标 `after`：维持现行商店形态和价格/库存显示 -> 逐文件证据、定向测试与 wave 质量门齐全后登记已验证；发现 primary/caller 冲突立即停线。
- 最强替代解释 / 什么观察会推翻前提：现有像素 fixture 可能掩盖 live inventory/equipment ownership、空列表和缺目录；真实 caller 或 primary source 反例击穿时留 review/rework。
- 是否主动偏离已核真值：N/A（只读审计，暂不改变用户形态）。

## 上下文锚点

- `draw-menu.ts:211-242` 是 shop-buy/shop-sell 公共绘制出口；`menu-driver.ts:317-370` 负责 buy/sell state 与 inventory mutation，绘制层不拥有购买/出售副作用。
- `ownedCount` 必须读取 live inventory 与 `PlayerRolesRuntime.rgwEquipment`；`drawSellOverlay` 售价只在 sellable item 上显示，空 cursor 仍画框。
- 3 个范围文件已全文读取；P04 caller/oracle覆盖正常买入/卖出/确认；GLM leaves覆盖 owned/空店/非卖品；pixels覆盖 rightText 价格、阴影/缺帧/透明孔/半价/装备 owned/0 金钱。

## 验证

- 定向：`draw-shop.glm-phase1-leaves.test.ts`、`shop-preview-pixels.grok-r1.test.ts`、P04 caller。
- 测试质量：合法 typed state、真实 draw caller、直接 framebuffer/palette oracle、反例判别力、旧 P04 排重、输入快照隔离和时间冻结。
- 全仓门：延至 present/menu wave（CODE-QUALITY-51 + CODE-QUALITY-52）完整后统一运行 `pnpm check`、ratchet、protected fast、lint-zero、docs/content review、ledger。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已读取实现、测试、caller/state 与 primary source）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（本卡只读审计；发现行为冲突立即升级）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件逐段证据、独立 shop review、定向 19 tests、wave 全量质量门完成；未发现 counter）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；wave 统一质量门已通过，本批无产品代码修改。

## 交接

- 2026-10-12 Codex：present/menu wave 第二成员完成。独立只读复核支持 accept（primary/caller/oracle、framebuffer ownership、ownedCount/价格/半价/缺资源边界）；定向 3 files/19 tests 通过；与 CODE-QUALITY-51 一起通过全仓 `pnpm check`、coverage ratchet、protected fast、lint-zero（3994 files 0/0/0）、docs/content review、diff-check、ledger。无产品代码/schema/save/资源格式变化；账本收口为 `3266 / 275 closed / 5 review / 2986 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-52 game draw shop wave member
任务卡：docs/ops/tasks/CODE-QUALITY-52-game-draw-shop-wave-member.md
当前状态：build，属于 present/menu wave
角色：Codex 独立核验；允许读/测本卡白名单，不得标记 done
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c:1503-1777、draw-shop.ts、3 个定向/相邻测试
请做：跑定向测试并记录 primary/caller/oracle；等 wave 完整后统一跑全仓质量门
不要做：不得改变产品形态、schema/save、资源格式或公共接口；不得用单包全绿关闭文件
输出：证据、测试结果、counter/返工项，或 wave 收口待办
```
