# CODE3l 战斗结算屏复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3l的draw-battle-settlement.ts(246行)复审切片(基点de046b002,0 behind/194 ahead):实现覆盖经验/金钱、升级八项、隐藏经验涨点和练成屏四种screen kind;资源缺失保持no-op,文字/数字/box ownership由调用方提供。

## 范围与证据

完整读取结算实现与三份直接/像素测试(hidden-exp x公式oracle、四屏精确像素oracle、缺帧/哨兵/宽度像素);读present-battle.ts结算调用段(330-360)、draw-number.ts全109行(复用风险留3k review)、font.ts与draw-box.ts公共绘制端口段、battle.c:991-1373 PAL_BattleWon与ui.c:640-732 PAL_DrawNumber primary。

## 发现

逐文件核对getWord/glyph文字来源、box长度与偏移、8行old到cur数字、slash/arrow mask、hidden-exp全局最大宽度公式、learn-magic动态ww与颜色;像素测试实际检查数字右/中对齐、标签颜色、箭头/slash资源点、二字名/长法术偏移与缺帧哨兵;未发现直接缺陷或需改变产品/UI行为的证据。结算数字最终复用drawNumber,其正Infinity输入风险已在3k账本单独留review,本片不重复实现或扩大该边界。

## 结论

定向3 files/11 tests passed、game typecheck passed、无stderr;精灵/UI/完整装配器仍pending,不能由结算屏通过推导整卡通过;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check。

## 整改与复核

未重跑;无浏览器视觉/E2E。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1783B / SHA-256 e6c5599b564ad12e64d1ac355fc85e4e7f4f61d707b604b94d777ef5c3d2a85d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l 战斗结算屏复审切片

基点：`de046b002`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 194 ahead`。本片只核 `draw-battle-settlement.ts` 及其直接测试/caller；`draw-battle-sprites.ts`、`draw-battle-ui.ts` 和 `present-battle.ts` 全装配器仍不在本片验收范围。3l 整卡保持 `partial`。

## 逐文件与真值边界

完整读取结算实现和三份直接/像素测试；读取 `present-battle.ts` 结算屏调用范围、`draw-number.ts`、`font.ts`、`draw-box.ts` 相关公共绘制端口，以及 `reference/sdlpal/battle.c` 结算区和 `ui.c` 数字/文字 API 区间。实现覆盖经验/金钱、升级八项、隐藏经验涨点和练成屏四种 screen kind；资源缺失时保持 no-op，文字/数字/box 的 ownership 由调用方提供。

## 判别力与结论

逐文件核对了 `getWord`/glyph 文字来源、box 长度和偏移、8 行 old→cur 数字、slash/arrow mask、hidden-exp 全局最大宽度公式、learn-magic 动态 ww 和颜色。像素测试实际检查数字右/中对齐、标签颜色、箭头/slash 资源点、二字名/长法术偏移和缺帧哨兵；没有发现直接缺陷或需要改变产品/UI 行为的证据。

结算数字最终复用 `drawNumber`，其正 Infinity 输入风险已在 3k 账本单独留 `review`；本片不重复实现或扩大该边界。精灵/UI/完整装配器仍 pending，不能由结算屏通过推导整卡通过。

## 验证

定向 `3 files / 11 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。按用户成本约束，本片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；下一批可继续精灵/UI，但仍按单一 Coding Owner 和逐文件证据推进。

```
<!-- incremental-original-source:end -->
