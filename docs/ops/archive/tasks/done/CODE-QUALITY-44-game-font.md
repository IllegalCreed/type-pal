# CODE-QUALITY-44 — game font / text primitive 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验字体 primitive 四文件（`font.ts` 与主/leaves/font-width 测试）:glyph 资源加载、tofu fallback、逐字绘制、阴影和 PAL 字宽量化;真实 callers 是 dialog/menu/battle/present,行为真值来自 `text.c:1075-1155,1478-1594,1725`、`ui.c:836-861`、`font.c:611-629`。

## 范围

四文件;不改字体资源、文本内容、公共接口或 UI 形态。

## 前提与证据

历史批:定向 33/33、game 全包 3519、editor 既有 number-field-adoption 失败未改、ratchet 基线不变（19,798）、protected fast 0 项下降。

## 验收

2026-10-21 基础绘制与同版本只读补证收口:原四文件——两文字入口共享私有字形三影→正色序列,不合并不同颜色推进循环;纠正 Unicode/tofu 列号及静态字宽近似边界;合法 16 字节 glyph 核 height,非零底图三影、补充平面码点、缺字游标均有真实结果;当前 27 例,旧数量不继承。A-H/callers/native 见 [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json),完整当前门见 [present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json)。

## 状态与交接

done 保持原历史语义;收口只接受原卡范围,无 broad/adjacent 或 deferred visual credit。

## 历史范围

原卡属 2026-10-12 窄批时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（33 定向、全仓门）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 present-leaves 收口原件为准。

## 继任文档

dialog/menu/battle callers 与 present-leaves 收口证据为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2789B / SHA-256 78766c0999639eeb755dcba220c6f092f6381d353f540ea71d3b0617b1890def；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
