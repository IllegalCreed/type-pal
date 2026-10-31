# CODE-QUALITY-47 — game draw box 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验菜单框体四文件（`draw-box.ts` 与主/leaves/pixels 测试）:9-slice 与单行框（SDLPal `ui.c:131-340,762-833`）的 frame identity、tile 几何、阴影计算、opaque mask、屏外裁剪、缺帧 fail-loud 与 menuTextMaxCols;真实 callers 覆盖 dialog/menu/shop/battle。

## 范围

四文件;不改变菜单形态、资源格式、输入或公共接口;framebuffer owner 与九个真实 callers 只读。

## 前提与证据

历史批:定向 3 files/22 tests、相邻 10 files/127、typecheck 通过,统一门留 game/present 模块收口,账本 3266/259→262 区间。2026-10-18 复审 partial:完整读取四文件与 SDLPal anchors,未发现可由 primary+caller 证实的新 direct defect,证据见 [README.md](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/47-draw-box/README.md)。

## 验收

2026-10-21 基础绘制与同版本只读补证收口:原四文件——纠正阴影色与两类框的顺序说明（逐 tile 和整行先影后色各自保留,不强合短 mask 策略）;无阴影采样移入真实阴影域,所选旧 1 绿→新 1 业务红;无产品执行的 fixture 自检退役;CC11 来自实际九宫格分支,未为分数拆碎。A-H/callers/native 见 [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json),完整当前门见 [present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json)。

## 状态与交接

done 保持原历史语义;2026-10-21 收口只接受原卡范围,无 broad/adjacent 或 deferred visual credit。

## 历史范围

原卡属 2026-10-12 窄批时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（22 定向+127 相邻、全仓门）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 present-leaves 收口原件为准。

## 继任文档

present-leaves-local/gates 与 47-draw-box 复审证据为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3345B / SHA-256 a15b039cc4f940359dd7d23c4e784c1d9264fb95f5f92330552b7ff6a6bbe7ac；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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

## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。本轮在 `codex/code-quality-3y` 上完整读取四个范围文件、framebuffer owner、九个真实 callers 和 SDLPal `ui.c:131-340,762-833` / `ui.h:195-254`；核对 9-slice/single-line frame、几何、shadow/opaque 顺序、屏外裁剪、缺帧、文本宽度和测试排重，未发现可由 primary + caller 证实的新 direct defect。复审状态为 `partial`，不标 `accept`。

验证：直接 3 files / 22 tests passed；相邻 10 files / 127 tests passed；`pnpm --filter @type-pal/game typecheck` passed。lint-zero、文档静态门、ledger 和 diff-check 通过；coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行，统一门仍留待完整 game/present 模块收口。证据见 [`47-draw-box`](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/47-draw-box/README.md)。

## 2026-10-21 基础绘制与同版本只读补证收口

原四文件：纠正阴影色与两类框的顺序说明，逐tile和整行先影后色各自保留，不强合短mask策略。无阴影采样移入真实阴影域，所选旧1绿→新1业务红；无产品执行的fixture自检退役。CC11来自实际九宫格分支，未为分数拆碎。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
```
<!-- incremental-original-source:end -->
