# CODE3l 战斗精灵复审切片

基点：`6937c7a70`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 195 ahead`。本片只核 `draw-battle-sprites.ts` 及三份直接测试；`draw-battle-ui.ts` 与 `present-battle.ts` 全装配器仍不在本片验收范围。3l 整卡保持 `partial`。

## 逐文件与真值边界

完整读取 413 行精灵实现、756 行主测试、边缘裁剪 leaves 测试和 373 行像素宿主测试。按 caller 读取 `present-battle.ts` 的精灵/法术 overlay 装配和 `battle-positions.ts` 锚点；primary 读取 `battle.c` 的位置/排序/隐藏/染色、`fight.c` 的 idle/death/shake、`uibattle.c` 的 target highlight、`palcommon.c` 的 color shift 相关区间。

## 判别力与结论

逐文件核对了敌我 anchor、idle 闭式帧、睡眠/麻痹定格、玩家死亡/傀儡姿态、隐身/变身、opaque mask、低 nibble color shift、死亡 72-step crossfade、敌方 target highlight、混乱 ±1 抖动、Y/X 排序、法术 overlay 排序和边缘裁剪。主测试与像素宿主覆盖真实 framebuffer 写入、状态不变性、资源缺失 fallback、render-state 优先级及 fade 错峰；未发现新直接缺陷，也没有改战斗行为或坐标。

`drawBattleSprites` 复用 `drawNumber` 的数字风险仍按 3k ledger 留 review；本片没有新增非有限数值可达证据。UI/完整 present 装配器未核，不把这批 69 例绿灯升级为 3l 整卡验收。

## 验证

定向 `3 files / 69 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。按用户成本约束，本片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；后续继续 UI/装配器时仍需逐文件证据。

