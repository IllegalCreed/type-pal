# CODE-QUALITY-43 — game draw sprite 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/draw-sprite.ts`、`draw-sprite.test.ts`、`draw-sprite-clip.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（精灵观感留集中 E2E；本批核 framebuffer/anchor/clip 合同）

## 前提与范围

精灵绘制是第一阶段 indexed framebuffer 基础层；真实 caller 为 `present.ts`、战斗 sprite 与资源 loader，
主行为锚定 `reference/sdlpal/scene.c`。本批只核逐帧 anchor、opaque mask、palette index 0、屏外裁剪、
输入缓冲区 ownership 与测试 oracle；不改变 sprite 资源格式、排序、用户可见形态或公共接口。

## 逐文件核验计划

- `draw-sprite.ts`：全文读取 `toSpriteImages`/`drawSprite`，核逐帧尺寸、anchor、typed buffer、边界/屏外写入和
  framebuffer caller。
- `draw-sprite.test.ts`：全文读取高度剖面、底边、mask 与 palette-0 反例，核真实 drawSprite oracle 与排重。
- `draw-sprite-clip.grok-r1.test.ts`：全文读取奇数宽、缓冲区复用、四边裁剪、孔洞与行序合同，核反控判别力。

## 当前证据

已读取三个范围文件、present/battle callers、相邻 framebuffer/pixel tests 与 `scene.c` 锚点；未发现直接缺陷。

## 收口验证

- 定向 Vitest：14/14 通过；game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,798 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- docs/content review、lint-zero、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 基础绘制与同版本只读补证收口

原三文件：保留逐帧锚、借用buffer、opaque0合同；左上双裁剪旧14绿→新恰1业务红，底边存活像素替代重复行序，奇数宽单例由main与异宽帧承接。实现仅补ownership注释，函数体不变。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
