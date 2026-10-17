# CODE47 draw-box 当前复审切片

基点：`d6bd5caad`；分支：`codex/code-quality-3y`。本片重新复审历史 47 的九宫格/单行框渲染，不把历史 `done`、旧测试数量或旧全仓门当作当前整卡验收。47 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-box.ts`（191 行）、`draw-box.test.ts`（101 行）、`draw-box.glm-phase1-leaves.test.ts`（79 行）和 `box-shadow-pixels.grok-r1.test.ts`（232 行）。读取 `draw-menu.ts`、`draw-confirm.ts`、`draw-shop.ts`、`draw-magic.ts`、`draw-inventory.ts`、`draw-equip.ts`、`draw-battle-ui.ts`、`dialog-box.ts`、`draw-battle-settlement.ts` 的真实 box caller，以及 `framebuffer.ts` 写入边界/尺寸 owner。primary source 为 SDLPal `reference/sdlpal/ui.c:131-340,762-833` 与 `ui.h:195-254`。

核对轴包括：style 0/1 的 9-slice frame identity、内部 rows/cols 到总 tile 几何、每 tile 先 shadow 后 opaque 的绘制顺序、opaque mask 与 palette-0、shadow offset/`PAL_CalcShadowColor`、frame 缺失 fail-loud、framebuffer 屏外裁剪、single-line 44/45/46 的中段重复、`len=0`、文本宽度量化、caller 合法坐标/长度、共享 helper 的 ownership 与测试隔离。

当前实现与 primary/caller 一致，未发现可由直接证据支持的产品缺陷。`menuTextMaxCols` 的空文本下限和 `drawSingleLineBox` 的非负长度行为属于当前 TS helper 合同；真实 callers 传入合法菜单标签和固定非负长度，没有证据授权扩大 SDLPal 公共接口或改变 UI 形态。测试按职责排重：主测试覆盖 9-slice/frame/shadow/style/网格；GLM 测试覆盖 single-line 缺帧、无阴影、屏外裁剪、空宽度与 fixture 合同；像素测试覆盖透明孔、边界 shadow、单行中段、style 缺帧、字宽和零 rows/cols。没有把 fixture 自检或数量当作产品验收。

验证：

- 直接：3 files / 22 tests passed。
- 相邻：10 files / 127 tests passed（draw-menu、confirm、shop、magic、inventory、equip、battle UI、dialog、settlement 渲染回归）。
- `pnpm --filter @type-pal/game typecheck` passed。
- 未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到完整模块收口，不能据此宣称统一质量门通过。
- 未触碰 schema/save/migration、生成物、资产管线、公共接口或用户可见 UI 取舍。

本片只更新复审证据、任务索引和文件账本；47 整卡仍为 `partial`，后续需要在完整 game/present 模块统一门窗口再决定是否收口。
