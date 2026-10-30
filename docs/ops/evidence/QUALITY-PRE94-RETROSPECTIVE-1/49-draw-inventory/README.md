# CODE49 draw-inventory 当前复审切片

> 2026-10-18 簿记勘误：本页读取行数按原boundary已绑定的同SHA字节纠正；原始旧文保留在audit-metadata-repair附件。没有重写当时测试结果、重跑产品测试或新增整文件验收。

基点：`421ee54b`；分支：`codex/code-quality-3y`。本片重新复审历史 49 的物品列表/目标层 live-zero 行为，不把历史 `done`、旧全仓回执或用户裁决文字直接当作当前验收。用户已于 2026-10-12 裁决：范围限定大世界使用物品目标层，数量归零时按 SDLPal 隐藏物品内容并结束目标层。49 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-inventory.ts`（390 行）、`draw-inventory.glm-phase1-leaves.test.ts`（95 行）、`inventory-list-pixels.grok-r1.test.ts`（405 行）和 `inventory-desc-filter.grok-r1.test.ts`（316 行）；读取 P01/P02 真实 caller/oracle、`inventory-menu.ts`、`menu-driver.ts`、`draw-menu.ts`/`present.ts` 出口，以及 SDLPal `uigame.c:1289-1473`、`itemmenu.c:28-310`、`play.c:268-323`。

实现复核结论：`drawItemUseMenu` 每帧从 `gs.inventory` 读取 live count；先画目标框/角色属性/角色名/ITEMBOX，再仅在 `amount > 0` 时画 BALL 图标、物品名和数量，和 SDLPal `i > 0` 分支一致。`menu-driver.ts` 每帧刷新 inventory snapshot，并在 `use-target` 的 live count `<=0` 时调用既有 `cancelInventoryMenu` 回 list，和 SDLPal `PAL_ItemUseMenu` 返回 cancelled 的生命周期一致。未发现新的实现缺陷；本片没有改产品代码。

测试质量：GLM leaves 覆盖未知目录、filter/缺资源组合；像素测试覆盖 live-zero 隐藏、数量差额/阴影/缺帧/列表边界；desc/filter 测试覆盖描述行距、noDesc、脚本描述和过滤颜色；P01/P02 覆盖真实列表/目标层 caller、实时库存、状态属性、装备加成和输入隔离。`inventory-list-pixels.grok-r1.test.ts` 的 G06-A12 直接创建 canvas，但当前 Vitest 默认 node 环境没有 `document`，因此该文件 12 tests 中 11 passed、1 failed（`ReferenceError: document is not defined`）。不通过改环境、跳过或静音掩盖，文件保留 `review`；其余相关测试证据独立记录。

验证：

- 直接范围：3 files / 11 passed，1 个环境诊断失败（inventory-list-pixels G06-A12）。
- 相邻：10 files / 190 tests passed（inventory-desc/P01/P02 与 inventory/menu-driver/draw-menu/present 回归）。
- `pnpm --filter @type-pal/game typecheck` passed。
- 未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到完整 game/present 模块收口，不能据此宣称统一质量门通过。
- 未触碰 schema/save/migration、生成物、资产格式、公共接口或新的产品取舍；零数量产品决策沿用用户已批准范围。

本片只更新复审证据、任务索引和逐文件账本；49 整卡仍为 `partial`，环境诊断和统一门是后续收口前提。
