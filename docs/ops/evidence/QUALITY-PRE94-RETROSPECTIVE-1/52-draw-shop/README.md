# CODE52 draw-shop 当前复审切片

基点：`80a562f4`；分支：`codex/code-quality-3y`。本片重新复审历史 52 的买/卖商店绘制，不把历史 `done`、旧 wave 全仓回执或测试全绿当作当前整卡验收。52 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-shop.ts`、`draw-shop.glm-phase1-leaves.test.ts`、`shop-preview-pixels.grok-r1.test.ts`，以及 P04 caller/oracle；读取 `draw-menu.ts`、`present.ts`、`shop-menu.ts`、`menu-driver.ts`；primary 为 SDLPal `reference/sdlpal/uigame.c:1503-1777`。

核对轴包括：买列表/价格 rightText、预览 ITEMBOX/图标、ownedCount 的 live inventory + 全队装备、金钱、半价卖出、确认框、空店/非 sellable/缺目录/缺帧/透明孔、framebuffer ownership 和绘制层无交易副作用。实现与 caller/primary 一致，未发现 direct defect；卖菜单 compact overlay 与全屏 picker 的装配关系沿用现有 `draw-menu.ts`，不在本片改变用户可见形态。

测试判别力：GLM 覆盖跨队装备 owned、空店、非 sellable/缺 cursor；像素测试覆盖菜单快照价格、阴影/ITEMBOX、缺帧/缺图标、确认层、半价向下取整、live owned 与 canvas flush；P04 覆盖真实买/卖 caller、输入隔离和交易不执行。`shop-preview-pixels.grok-r1.test.ts` 的 G07-B13 直接创建 canvas，当前 Vitest 默认 node 环境下 `ReferenceError: document is not defined`；该文件 13 tests 中 12 passed、1 failed，未改环境、未跳过、未静音，文件保留 `review`。

验证：

- 直接范围：3 files / 18 passed，1 个环境诊断失败（shop-preview-pixels G07-B13）。
- 相邻：6 files / 117 tests passed（P04、shop/menu-driver、draw-menu/present）。
- `pnpm --filter @type-pal/game typecheck` passed。
- 本片未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到 present/menu wave 收口，不能据此宣称统一质量门通过。
- 未触碰 schema/save/migration、生成物、资产格式、公共接口或交易行为。

本片只更新复审证据、任务索引和逐文件账本；52 整卡仍为 `partial`，shop-preview 像素文件保持 `review`。
