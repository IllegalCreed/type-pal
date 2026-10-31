# CODE-QUALITY-44 — game font / text primitive 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-44 — game font / text primitive 窄批」的任务归属与历史边界。原目标见原文(摘录:Scope: `packages/game/src/present/font.ts`、`font.test.ts`、`font.glm-phase1-leaves.test.ts`、`font-wid);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-44 — game font / text primitive 窄批、前提与范围、逐文件核验计划、当前证据、收口验证、下一位 Agent 提示词],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2789B(SHA 78766c099963);原卡前提按原时点保留。当前存活入口:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-44 — game font / text primitive 窄批的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)。


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
