# CODE-QUALITY-44 — game font / text primitive 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/font.ts`、`font.test.ts`、`font.glm-phase1-leaves.test.ts`、`font-width.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（文字观感留集中 E2E；本批核 glyph/width/framebuffer 合同）

## 前提与范围

字体 primitive 负责 glyph 资源加载、tofu fallback、逐字绘制、阴影和 PAL 字宽量化；真实 callers 是
dialog/menu/battle/present，行为真值来自 `reference/sdlpal/text.c:1075-1155,1478-1594,1725`、
`ui.c:836-861` 和 `font.c:611-629`。本批不改字体资源、文本内容、公共接口或 UI 形态。

## 逐文件核验计划

- `font.ts`：全文读取 loadGlyphs、bitmap 解码、tofu、blit、render/colored/measure/宽度公式，核 HTTP 失败、
  非法 glyph 数据、Unicode code point、shadow、颜色 fallback、framebuffer ownership 与 callers。
- 三份测试：全文核真实公开入口、合法 glyph 输入、直接 framebuffer/width oracle、缺字形/HTTP/颜色/阴影反例、
  排重与隔离；不以测试数量或 coverage 代替语义验收。

## 当前证据

已读取实现、四份直接测试、dialog/menu/battle callers 与 SDLPal 锚点；未发现直接缺陷。

## 收口验证

- 定向 Vitest：33/33 通过；game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,798 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- docs/content review、lint-zero、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 基础绘制与同版本只读补证收口

原四文件：两文字入口共享私有字形三影→正色序列，不合并不同颜色推进循环；纠正Unicode/tofu列号及静态字宽近似边界。合法16字节glyph核height，非零底图三影、补充平面码点、缺字游标均有真实结果；当前27例，旧数量不继承。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
