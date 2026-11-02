# CODE47 draw-box 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE47 draw-box 当前复审切片」(基点 d6bd5caad,分支 codex/code-quality-3y)的治理候选页;证据原件即下方逐字节保全的固定main源。本页真实结论:重新复审九宫格/单行框渲染,不把历史 done、旧测试数量或旧全仓门当当前整卡验收;47 提升为 partial,未标 accept/done。

## 来源与输入

来源为固定Git载体,非本次运行。完整读取 draw-box.ts(191行)、draw-box.test.ts(101行)、draw-box.glm-phase1-leaves.test.ts(79行)、box-shadow-pixels.grok-r1.test.ts(232行);读取 9 个真实 box caller(draw-menu/confirm/shop/magic/inventory/equip/battle-ui/dialog/settlement)与 framebuffer 写入边界;primary 为 SDLPal ui.c:131-340,762-833 与 ui.h:195-254;逐行读域见同目录 read-boundaries.json。

## 断言与业务 oracle

本页正文按原文时点转述核对轴:style 0/1 的 9-slice frame identity、内部 rows/cols 到总 tile 几何、每 tile 先 shadow 后 opaque 的绘制顺序、opaque mask 与 palette-0、shadow offset/PAL_CalcShadowColor、frame 缺失 fail-loud、framebuffer 屏外裁剪、single-line 44/45/46 的中段重复、len=0、文本宽度量化、caller 合法坐标/长度、共享 helper 所有权与测试隔离。当前实现与 primary/caller 一致,未发现可由直接证据支持的产品缺陷;menuTextMaxCols 空文本下限与 drawSingleLineBox 非负长度行为属当前 TS helper 合同,无证据授权扩大 SDLPal 公共接口。测试按职责排重:主测试 9-slice/frame/shadow/style/网格,GLM 测试 single-line 缺帧/无阴影/屏外裁剪/空宽度,像素测试透明孔/边界影/单行中段/style 缺帧/字宽/零行列。

## 结果

本页治理结果=原文保全完整,不产生新执行结果。原文验证事实:直接 3 files/22 tests passed;相邻 10 files/127 tests passed;game typecheck passed;未运行 coverage ratchet、official coverage、protected fast、全仓 pnpm check,不能据此宣称统一质量门通过。

## 限制与复核

原文明言:未触碰 schema/save/migration、生成物、资产管线、公共接口或用户可见 UI 取舍;47 整卡仍 partial,后续需统一门窗口再决定收口。未重跑命令;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2633B / SHA-256 d42fe30d97e25597440d65b01eaddca6e588925c6db52a5b0c7acacfe4795b3f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
