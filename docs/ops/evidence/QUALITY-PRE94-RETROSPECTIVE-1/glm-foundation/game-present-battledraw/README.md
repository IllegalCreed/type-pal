# game-present-battledraw(draw-battle-* 六文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 8 批 16(present/battle 子家族)的作者复审回执:Coding Owner GLM,六文件全文读毕(bg 44/effect 73/num 71/settlement 246/sprites 413→417/ui 825→828 行),基点 origin/codex/code-quality-3y@53db76bbbb(候选线 40+ 提交)。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改类型:纯注释 7 处(两文件),零代码改动,由 [body-invariance.json](body-invariance.json) 见证(draw-battle-sprites.ts 8794/draw-battle-ui.ts 22355 打印字节双侧 printedSha256 一致,allEqual=true;行数 413→417/825→828 的变化全部来自注释)。sprites 3 处:模块头 L8『M3 简版:位置硬编码』过时——ENEMYPOS 表/PLAYER_POSITIONS_BY_COUNT 早已接入,computeEnemyAnchor 即用,改述 ENEMYPOS 真值+battle-positions 单一来源;L9『索引 0 透明』不实——本模块透明只走 opaque mask(RLE-skip run,0=跳过),blitFrame/blitFrameDeathFade 均无 index-0 判定,屏外像素经 fb.writePixel 边界检查裁剪(framebuffer.ts:27-28);SpriteAsset docblock『M3 静态 frame[0]』过时——绘制帧由 render-state currentFrame(动画期)或 idle 轮播决定,缺帧兜底 frames[0]。ui 4 处:L133『sprite 化非本任务范围』过时——sprite 化就在本文件 drawPlayerInfoBoxes,改『无 sprite 资源时的文字兜底』;drawPartyStatus docblock 同类改述;L352-358 孤儿 docblock(PAL_PlayerInfoBox port 说明)整块下移至 function drawPlayerInfoBoxes( 正上方;drawBattleUI docblock 的 enemyPos 参数注与现状矛盾——敌方目标选择已无箭头(uibattle.c:1495-1510 ColorShift 高亮,本文件 L310-314 已注),_enemyPos 未用,改述『现未使用…保留为调用方兼容』。零整改面:bg(ebattle.c:982 数据源/62-76 染色钳位)、effect(fight.c:2183/188/2760-2761 底中锚)、num(uibattle.c:1746-1808 寿命/位移/颜色)、settlement(battle.c:991-1373 四屏+D11 hidden-exp 修正史)全对。返工范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

原文验证口径:[directed.json](directed.json) 定向 8 文件(present-battle+四 pixels 族+三 leaves)20 套件 79/79、0 failed suites;tsc --noEmit -p packages/game exit 0;scoped biome 2 文件 0 诊断;git diff --check 干净。A/E 维:drawBattleUI 三早退(dialogActive/enemyEscapeAnim/fAutoBattle)与 sdlpal 对齐注释有 user 实测日期背书;isBattleActionValidForDraw 镜像 core 判据并注明防循环依赖理由。绿值为文档时点事实,不外推产品通过(currentExecution=false)。

## 结果

登记项(交 Codex):①drawBattleUI 残留参数 _enemyPos(未用,present-battle 传 assets.enemyPos)——签名清理候选;②沿用批 15:playMagicAnim/flashEnemy/flashPlayer/showBattleUI/clearDialogBox 死 op。该结论属作者候选,原文时点 Codex 裁定保留作者阶段证据、未获整包/全维收口验收。

## 限制与复核

未重跑原命令/测试;framebuffer.ts:27-28 等行号锚未回查现状;_enemyPos 清理候选后续归属未定。历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3792B / SHA-256 ccf3ed3e7baddd81f1f93d7553c2abaf0d0497ef1f1108f0ae19b5b17cf4fd81；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-present-battledraw(draw-battle-* 六文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 8 批 16(present/battle 子家族)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 40+ 提交)
- Coding Owner:GLM;六文件全文读毕(bg 44 / effect 73 / num 71 / settlement 246 / sprites 413→417 / ui 825→828 行)
- 整改类型:纯注释 7 处(B 维,两文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 文件:位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | draw-battle-sprites.ts 模块头 L8 | "M3 简版:位置硬编码(5 个槽位)。M5 时按 sdlpal ENEMYPOS / 队列位置真值"过时(ENEMYPOS 表/PLAYER_POSITIONS_BY_COUNT 早已接入,computeEnemyAnchor 即用) | 改述现状:ENEMYPOS 表真值 + battle-positions 单一来源 + 锚点共用 |
| 2 | draw-battle-sprites.ts 模块头 L9 | "索引 0 透明"不实 — 本模块透明只走 opaque mask(RLE-skip run),blitFrame/blitFrameDeathFade 均无 index-0 判定 | 改"透明走 opaque mask(RLE-skip run,0 = 跳过);屏外像素经 fb.writePixel 边界检查裁剪"(writePixel 边界已核 framebuffer.ts:27-28) |
| 3 | draw-battle-sprites.ts SpriteAsset docblock | "M3 静态先画 frame[0];M4 / 后续按 phase 切帧"过时(idle 轮播/动画 currentFrame 已实现) | 改"绘制帧由 render-state currentFrame(动画期)或 idle 轮播决定,缺帧兜底 frames[0]" |
| 4 | draw-battle-ui.ts L133 | "M3 文字版,PAL_PlayerInfoBox sprite 化…非本任务范围"过时 — sprite 化就在本文件 drawPlayerInfoBoxes | 改"无 sprite 资源时的文字兜底;sprite 化真值在下方 drawPlayerInfoBoxes" |
| 5 | draw-battle-ui.ts drawPartyStatus docblock | 同上过时声明 | 改文字兜底职责描述 |
| 6 | draw-battle-ui.ts L352-358 | 孤儿 docblock(PAL_PlayerInfoBox port 说明)挂在 computePlayerFaceColor 前一位置、与其自身 docblock 连排,实际属于 drawPlayerInfoBoxes | 整块下移至 `function drawPlayerInfoBoxes(` 正上方 |
| 7 | draw-battle-ui.ts drawBattleUI docblock | "@param enemyPos ENEMYPOS 表(敌方 target 箭头定位)"与现状矛盾 — 敌方目标选择已无箭头(uibattle.c:1495-1510 ColorShift 高亮,本文件 L310-314 已注明),参数 `_enemyPos` 未用 | 改述为"现未使用…保留为调用方兼容,清理候选已登记" |

## 零整改面

- **draw-battle-bg.ts**(44 行):battle.c:982 数据源/battle.c:62-76 染色钳位锚全对,零缺陷。
- **draw-battle-effect.ts**(73 行):fight.c:2183/188/2760-2761 底中锚一致,零缺陷。
- **draw-battle-num.ts**(71 行):uibattle.c:1746-1808 寿命/位移/颜色真值锚完整,零缺陷。
- **draw-battle-settlement.ts**(246 行):battle.c:991-1373 四屏真值锚 + D11 hidden-exp 修正史完整,零缺陷。
- A/E 维:drawBattleUI 三早退(dialogActive/enemyEscapeAnim/fAutoBattle)与 sdlpal 对齐注释均有 user 实测日期背书;isBattleActionValidForDraw 镜像 core 判据并注明防循环依赖理由。

## 验证

- body-invariance:`prove-body-invariance.mjs --base HEAD` 两整改文件 printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 8 文件(present-battle + 四 pixels 族 + 三 leaves):**20 套件 79/79,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 2 文件 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `drawBattleUI` 残留参数 `_enemyPos`(未用,present-battle 传 assets.enemyPos)— 签名清理候选
2. 沿用:playMagicAnim / flashEnemy / flashPlayer / showBattleUI / clearDialogBox 死 op(批 15)
```
<!-- incremental-original-source:end -->
