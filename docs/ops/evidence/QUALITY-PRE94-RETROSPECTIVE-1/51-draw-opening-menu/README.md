# CODE51 draw-opening-menu 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE51 draw-opening-menu 当前复审切片」(基点 c6cd416a,含 2026-10-18 簿记勘误:读取行数按原 boundary 已绑定的同 SHA 字节纠正,原始旧文保留在 audit-metadata-repair 附件)的治理候选页;证据原件即下方逐字节保全的固定main源。本页真实结论:重新复审标题菜单绘制;51 提升为 partial,未标 accept/done。

## 来源与输入

来源为固定Git载体,非本次运行。完整读取 draw-opening-menu.ts(70行)、draw-opening-menu.test.ts(83行)、draw-opening-menu.glm-phase1-leaves.test.ts(76行)及相邻 opening-confirm-pixels.grok-r1.test.ts(177行);读取 draw-menu opening 出口、present.ts FBP 注入、opening-menu.ts 状态/词表 owner、menu-driver 取消/读档 caller;primary 为 SDLPal uigame.c:42-167 与 ui.c:458;逐行读域见同目录 read-boundaries.json。

## 断言与业务 oracle

本页正文按原文时点转述核对轴:FBP chunk 背景完整/小图裁剪/缺背景降级、两项文本顺序和 WORD 单一来源、长文案 x 公式、y 坐标、selected/normal 色、三影、光标越界防御、输入状态不可变和无 9-slice box。当前实现与 primary/caller 一致,未发现 direct defect。测试判别力:主测试 x 公式/背景/两行坐标/光标差异;GLM 精确 0xF9/0x4F、三影、词表同步、无 frames;像素相邻测试索引 0 背景、小图矩形裁剪、光标越界、状态/词表隔离及确认框排重。

## 结果

本页治理结果=原文保全完整,不产生新执行结果。原文验证事实:直接 3 files/17 tests passed;相邻 4 files/107 tests passed;game typecheck passed;未运行 coverage ratchet、official coverage、protected fast、全仓 pnpm check。

## 限制与复核

原文明言:未触碰 schema/save/migration、生成物、资产格式、公共接口或用户可见形态;51 整卡仍 partial,等待 wave 统一门。未重跑命令;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2199B / SHA-256 6c8d7fe530241e715c482d0c949161be18bd2c27ecf13ea269ffc080770250be；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE51 draw-opening-menu 当前复审切片

> 2026-10-18 簿记勘误：本页读取行数按原boundary已绑定的同SHA字节纠正；原始旧文保留在audit-metadata-repair附件。没有重写当时测试结果、重跑产品测试或新增整文件验收。

基点：`c6cd416a`；分支：`codex/code-quality-3y`。本片重新复审历史 51 的标题菜单绘制，不把历史 `done`、旧 wave 全仓回执或定向绿灯当作当前整卡验收。51 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-opening-menu.ts`（70 行）、`draw-opening-menu.test.ts`（83 行）、`draw-opening-menu.glm-phase1-leaves.test.ts`（76 行），以及相邻 `opening-confirm-pixels.grok-r1.test.ts`（177 行）；读取 `draw-menu.ts` opening 出口、`present.ts` FBP 注入、`core/menu/opening-menu.ts` 状态/词表 owner、`menu-driver.ts` 取消/读档 caller；primary 为 SDLPal `reference/sdlpal/uigame.c:42-167` 与 `ui.c:458`。

核对轴包括：FBP chunk 背景完整/小图裁剪/缺背景降级、两项文本顺序和 WORD 单一来源、长文案 x 公式、y 坐标、selected/normal 色、三影、光标越界防御、输入状态不可变和无 9-slice box。当前实现与 primary/caller 一致，未发现 direct defect。

测试判别力：主测试覆盖 x 公式、背景/缺背景、两行坐标和 cursor 差异；GLM 覆盖精确 0xF9/0x4F、三影、词表同步和无 frames；像素相邻测试覆盖索引 0 背景、小图矩形裁剪、光标越界、状态/词表隔离及确认框排重。

验证：

- 直接：3 files / 17 tests passed。
- 相邻：4 files / 107 tests passed（opening-menu/menu-driver/draw-menu/present）。
- `pnpm --filter @type-pal/game typecheck` passed。
- 本片未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到 present/menu wave 收口，不能据此宣称统一质量门通过。
- 未触碰 schema/save/migration、生成物、资产格式、公共接口或用户可见形态。

本片只更新复审证据、任务索引和逐文件账本；51 整卡仍为 `partial`，等待 wave 统一门。
```
<!-- incremental-original-source:end -->
