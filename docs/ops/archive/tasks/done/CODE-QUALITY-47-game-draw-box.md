# CODE-QUALITY-47 — game draw box 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/menu/draw-box.ts`、`draw-box.test.ts`、`draw-box.glm-phase1-leaves.test.ts`、`box-shadow-pixels.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（菜单框体观感留集中 E2E；本批核 9-slice/阴影/framebuffer 合同）

## 前提与范围

菜单框体是 SDLPal `ui.c:131-240,242-340,762-833` 的 9-slice 与单行框实现，真实 callers 覆盖 dialog/menu/shop/battle。
本批只核 frame identity、tile 几何、阴影计算、opaque mask、屏外裁剪、缺帧 fail-loud 与 menuTextMaxCols；不改变
菜单形态、资源格式、输入或公共接口。

## 逐文件核验计划

- `draw-box.ts`：全文读取 `menuTextMaxCols`、9-slice、single-line、shadow 与 blit helpers，核资源索引、边界、状态 ownership 和 callers。
- 三份测试：全文核合法 frame 输入、直接 framebuffer oracle、透明孔/palette-0/阴影/缺帧/空 rows-cols/文本宽度反例，排重既有 menu 测试。

## 当前证据

已完成全文实现、3 份测试、caller/primary source 与测试质量核验，未发现直接缺陷。

最新主线同步后：完整 `pnpm check` 通过（editor 631 files / 4951 tests，migrate 96 files / 739 tests），`pnpm coverage:ratchet` 与 protected fast 均通过，覆盖率无下降。lint-zero 3994 files，0 errors / 0 warnings / 0 infos；docs/content review、ledger、diff-check 通过。分支已同步至最新 `origin/main`，无存活中断进程。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。
