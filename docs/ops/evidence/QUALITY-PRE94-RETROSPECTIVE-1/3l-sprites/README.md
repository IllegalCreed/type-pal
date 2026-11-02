# CODE3l 战斗精灵复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3l的draw-battle-sprites.ts(413行)复审切片(基点6937c7a70,0 behind/195 ahead):逐文件核对敌我anchor、idle闭式帧、睡眠/麻痹定格、玩家死亡/傀儡姿态、隐身/变身、opaque mask、低nibble color shift、死亡72-step crossfade、敌方target highlight、混乱正负1抖动、Y/X排序、法术overlay排序与边缘裁剪。

## 范围与证据

完整读取413行精灵实现、756行主测试、边缘裁剪leaves测试与373行像素宿主测试;按caller读present-battle.ts精灵/法术overlay装配区(210-290)与battle-positions.ts全93行锚点;primary读battle.c位置/排序/隐藏/染色四段、fight.c idle/death/shake、uibattle.c target highlight、palcommon.c color shift段。

## 发现

主测试与像素宿主覆盖真实framebuffer写入、状态不变性、资源缺失fallback、render-state优先级与fade错峰;未发现新直接缺陷,未改战斗行为或坐标。drawBattleSprites复用drawNumber的数字风险仍按3k ledger留review,本片无新增非有限数值可达证据;UI与完整present装配器未核,不把这批69例绿灯升级为3l整卡验收。

## 结论

定向3 files/69 tests passed、game typecheck passed、无stderr;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check;后续继续UI/装配器仍需逐文件证据。

## 整改与复核

未重跑;无浏览器视觉/E2E。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1755B / SHA-256 742c4faeedbbd7116399aad20f7ca12d5649c0a7912ab33a0cd285a63c80ac9e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l 战斗精灵复审切片

基点：`6937c7a70`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 195 ahead`。本片只核 `draw-battle-sprites.ts` 及三份直接测试；`draw-battle-ui.ts` 与 `present-battle.ts` 全装配器仍不在本片验收范围。3l 整卡保持 `partial`。

## 逐文件与真值边界

完整读取 413 行精灵实现、756 行主测试、边缘裁剪 leaves 测试和 373 行像素宿主测试。按 caller 读取 `present-battle.ts` 的精灵/法术 overlay 装配和 `battle-positions.ts` 锚点；primary 读取 `battle.c` 的位置/排序/隐藏/染色、`fight.c` 的 idle/death/shake、`uibattle.c` 的 target highlight、`palcommon.c` 的 color shift 相关区间。

## 判别力与结论

逐文件核对了敌我 anchor、idle 闭式帧、睡眠/麻痹定格、玩家死亡/傀儡姿态、隐身/变身、opaque mask、低 nibble color shift、死亡 72-step crossfade、敌方 target highlight、混乱 ±1 抖动、Y/X 排序、法术 overlay 排序和边缘裁剪。主测试与像素宿主覆盖真实 framebuffer 写入、状态不变性、资源缺失 fallback、render-state 优先级及 fade 错峰；未发现新直接缺陷，也没有改战斗行为或坐标。

`drawBattleSprites` 复用 `drawNumber` 的数字风险仍按 3k ledger 留 review；本片没有新增非有限数值可达证据。UI/完整 present 装配器未核，不把这批 69 例绿灯升级为 3l 整卡验收。

## 验证

定向 `3 files / 69 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。按用户成本约束，本片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；后续继续 UI/装配器时仍需逐文件证据。

```
<!-- incremental-original-source:end -->
