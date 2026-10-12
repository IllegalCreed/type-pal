# CODE-QUALITY-47 — game draw box 窄批

Status: build
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

2026-10-11 已读取 4 个范围文件（1 个实现、3 个测试），定向 22/22、game typecheck 与 game 全包 3519/3519 通过。caller 和 primary source 的完整逐段证据、测试质量判定尚需补齐，不能据全绿宣布文件已验证。

全仓 check 在用户中断前已到 editor 阶段并出现 `number-field-adoption` 37/39 失败；日志缺少最终退出结果，不能记为完成。尚未运行本批 ratchet/protected fast，未更新本批 ledger 行，未获 done/合并准入。

2026-10-12 继续前已 fetch：`origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，原治理分支 behind 3 / ahead 10；先保存本批工作，再同步主线。中断前命令无存活进程。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。
