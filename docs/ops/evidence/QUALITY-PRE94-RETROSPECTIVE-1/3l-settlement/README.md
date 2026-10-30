# CODE3l 战斗结算屏复审切片

基点：`de046b002`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 194 ahead`。本片只核 `draw-battle-settlement.ts` 及其直接测试/caller；`draw-battle-sprites.ts`、`draw-battle-ui.ts` 和 `present-battle.ts` 全装配器仍不在本片验收范围。3l 整卡保持 `partial`。

## 逐文件与真值边界

完整读取结算实现和三份直接/像素测试；读取 `present-battle.ts` 结算屏调用范围、`draw-number.ts`、`font.ts`、`draw-box.ts` 相关公共绘制端口，以及 `reference/sdlpal/battle.c` 结算区和 `ui.c` 数字/文字 API 区间。实现覆盖经验/金钱、升级八项、隐藏经验涨点和练成屏四种 screen kind；资源缺失时保持 no-op，文字/数字/box 的 ownership 由调用方提供。

## 判别力与结论

逐文件核对了 `getWord`/glyph 文字来源、box 长度和偏移、8 行 old→cur 数字、slash/arrow mask、hidden-exp 全局最大宽度公式、learn-magic 动态 ww 和颜色。像素测试实际检查数字右/中对齐、标签颜色、箭头/slash 资源点、二字名/长法术偏移和缺帧哨兵；没有发现直接缺陷或需要改变产品/UI 行为的证据。

结算数字最终复用 `drawNumber`，其正 Infinity 输入风险已在 3k 账本单独留 `review`；本片不重复实现或扩大该边界。精灵/UI/完整装配器仍 pending，不能由结算屏通过推导整卡通过。

## 验证

定向 `3 files / 11 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。按用户成本约束，本片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；下一批可继续精灵/UI，但仍按单一 Coding Owner 和逐文件证据推进。

