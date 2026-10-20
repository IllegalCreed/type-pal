# CODE-QUALITY-46 — game draw confirm menu 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/menu/draw-confirm.ts`、`draw-confirm.glm-phase1-leaves.test.ts`、`opening-confirm-pixels.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（菜单观感留集中 E2E；本批核像素/状态合同）

## 前提与范围

确认/开关两项框复用 SDLPal `uigame.c:242-365,368-388` 的 SelectionMenu 布局；生产 caller 是
`present.ts`、`draw-menu.ts`、`draw-shop.ts`。本批只核框体坐标、标签、选中闪烁、阴影、空标签和 framebuffer
ownership；不改变菜单形态、输入状态、脚本或公共接口。

## 逐文件核验计划

- `draw-confirm.ts`：全文读取 selectedColor 时间依赖、双框布局、labels 复用、renderText shadow 和 callers。
- 两份测试：全文核 fixture glyph/UI frame、像素 oracle、时间冻结、空/多字标签与输入状态隔离，排重已有 menu tests。

## 当前证据

已读取实现、两份直接测试、present/menu/shop callers 与 `uigame.c` 锚点；未发现直接缺陷。

## 收口验证

- 定向 Vitest：10/10 通过；game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,798 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- docs/content review、lint-zero、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 基础绘制与同版本只读补证收口

原三文件：确认框委托既有纯menu-colors，条件中的Date读取次数保持；固定双框不冒称SDL任意长标签布局。固定F9反控旧10绿→新1时序红；空标签改精确底色，原开关、三影及框坐标合同保留。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
