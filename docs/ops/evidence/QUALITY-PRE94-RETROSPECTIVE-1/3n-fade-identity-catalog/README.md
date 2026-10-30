# CODE3n fade / identity / catalog 当前复审切片

> 2026-10-18 当前更正：palette源/测旧整文件关闭转review。ColorFade原C无钳制，但PAL_GetPalette产生4倍数网格、64步后补终值；“任意8位步进等价/视觉1:1”源注不能成立，人工非网格C往返也不证明正常原版缺陷。见[输入域与测试返工](../core-comment-audit/palette-approach-tests/README.md)。本次不改产品执行；此前PaletteFade `/31` 修复证据仍按原有限范围保留，其它三个helper不被本次重新签收。

基点：`6d855d9fe`；分支：`codex/code-quality-3y`。本片重新复审 3n 的四个 core helper 及直接 caller/oracle，不把历史 done、旧全仓门或包级全绿当作当前整卡验收。3n 当前复审提升为 `partial`，整卡仍未关闭。

完整读取：

- `packages/game/src/core/palette-fade.ts`、`scene-identity.ts`、`word-lookup.ts`、`script-catalog.ts`；
- `palette-fade.test.ts`、`word-lookup.test.ts`、`dependency-ownership.test.ts`、`cross-module-boundaries.test.ts`。

caller / 生命周期读取：`event-system.ts` 的 palette fade 构造、cursorless battle/autoScript fallback、scene auto fade 与 global catalog 注入/label 消费；`scene-system.ts` 的 loadScene map ownership；`present.ts` 与 `present-battle.test.ts` 的逐帧 palette 应用；`bootstrap.ts` 的 WORD/global events/map 注入。primary 核对 `reference/sdlpal/palette.c:123-666`（六类 fade 的量化/整数步骤/freeze/skip/remap）、`text.c:966-1000`（WORD 越界返回空词）和 `script.c` 的 revive/脚本入口边界，并对照 `docs/phase1/game-mechanics.md` 中 palette/script 真值。

发现并修复一个直接问题：`PAL_PaletteFade` 的 C 实现每通道按 32 步 `((cur*(31-i)+new*i)/31)` 做整数截断；TS 非量化分支原先以浮点 progress + `Math.round`，在 0→1 的边界会提前显示 1。先以 0→1、step16 失败反例确认旧实现红，再改为 `floor(progress*32)`、分母31和 `Math.trunc`；原 0→80 中点 oracle 同步改为 C 真值 41。其它三个 helper 的职责、fallback、own-property/null-prototype catalog、zero-item overlay、WORD fallback 和 map identity 未发现新的直接缺陷。

测试：四个直接/跨模块文件 `34 passed` 且无测试 stderr；相邻 event/scene/present 回归合计 `8 files / 554 passed`，但有既有 fixture 触发的预期 `console.warn`（未知 label、无当前对象、越界 scene object），因此本片不宣称“运行时诊断清零”或统一质量门通过。`pnpm --filter @type-pal/game typecheck` 通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 未在此小批运行。

高风险边界：触及第一阶段 palette 数学与脚本 catalog/map/WORD ownership；变更限于 palette helper 的公式和对应 oracle，不改产品 UI 形态、schema/save、生成物或第二阶段模型。3n 仍需统一门与相邻诊断收口，未标 accept/done。
