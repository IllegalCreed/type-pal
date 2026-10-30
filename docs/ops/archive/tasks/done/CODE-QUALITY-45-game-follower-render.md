# CODE-QUALITY-45 — game follower render 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/follower-render.ts`、`follower-render.test.ts`、`follower-render-gap.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（跟随者演出观感留集中 E2E；本批核位置/帧索引纯函数合同）

## 前提与范围

0x98 额外跟随者渲染来自 SDLPal `scene.c:210-226,732-743,767-771`、`res.c:335-348`，真实 caller 是
`present.ts`。本批只核 trail ownership、sprite chunk 身份、方向/步帧、站立/行走和缺槽边界；不改变
移动、碰撞、脚本或资源 schema。

## 逐文件核验计划

- `follower-render.ts`：全文读取 follower 数组、trail 索引、方向映射、步帧和缺槽跳过，核 `present.ts` caller。
- 两份测试：全文核合法 trail/typed 输入、缺 follower/缺槽/越界 step、多 follower 与直接 render-item oracle；
  对照 `scene.c`/`res.c`，排除与 `follower-pos` 已有合同的重复。

## 当前证据

已读取三个范围文件、`present.ts`、`follower-pos` 相邻实现与 SDLPal 锚点；未发现直接缺陷。

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

原三文件：明确trail写Owner、稠密前缀和MGO chunk；测试去死_step与无效null工厂分支，四步预期独立列值。仅撤稀疏fixture的生产覆盖信用，正常缺尾与公开number参数防御保留；实现体不变。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
