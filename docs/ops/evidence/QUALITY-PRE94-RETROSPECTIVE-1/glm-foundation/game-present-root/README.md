# game-present-root(present 根目录 11 文件)八维复审批

- 批次:pre-94 foundation 模块 8 批 17(present 根目录家族,present 模块收官)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 42+ 提交)
- Coding Owner:GLM;11 文件全文读毕(2071 行:dither-fade 44/draw-sprite 49/framebuffer 49/screen-shake 54/follower-render 64/screen-wave 73/follower-pos 84/draw-number 109/font 202/draw-tilemap 382/dialog-box 961)
- 整改类型:纯注释 3 处(B 维,两文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 文件:位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | draw-tilemap.ts L4-11 | DrawEntry 接口注释为日语(エントリ/キー/実際等),与全仓中文注释风不符;且"present.ts の sortedDraw ループ"引用不实 — present.ts 无 sortedDraw 命名(实际是 entries.sort + 依序执行 draw) | 译为中文并把引用改为"present.ts 收集后按 baseY 排序、依序执行 draw 回调" |
| 2 | draw-tilemap.ts L82 | blitTileAt 日语注释"内部 blitTile を外部に公開(cover-tile 単体描画用)" — 且"cover-tile 単体描画用"不准(唯一消费方是 draw-tilemap-pixels 测试直测) | 改中文"对外公开内部 blitTile(测试/单瓦片绘制用,draw-tilemap-pixels 直测)" |
| 3 | dialog-box.ts drawDialogBox docblock | "key icon 显示条件:phase != 'typing'…line-done:也 blink"与同文件 shouldShowKeyIcon(L761-764,仅 waiting-page-key/waiting-end-key)及其上注释(L754-755"line-done 不显 icon")自相矛盾;"blink"已被 palette 轮转方案取代(L731-732 已注明 icon 常显) | 改述为 shouldShowKeyIcon 真值:仅两等键 phase 显示、center 排除、闪烁由 present 层 palette 轮转产生 |

## 零整改面(9 文件)

- **dither-fade.ts**:video.c:1130-1280 rgIndex 真值完整;**draw-sprite.ts**:M3.5 opaque mask 修正史 + 逐帧 anchor 真值(scene.c:224/291/358);**framebuffer.ts**:writePixel 边界合同清晰;**screen-shake.ts**:video.c:571-616 奇偶帧上下移推导完整;**screen-wave.ts**:scene.c:365-450 32 相位表递推 + WORD 回绕语义注释;**follower-render.ts**:res.c:335-348 sprite 来源 + [0,2,0,1] 步帧序列;**follower-pos.ts**:fWalking 二分支冻结语义 + 0x46 摆位真值(两组 user 报 bug 修正史);**draw-number.ts**:ui.c:640-732 1:1 port 全锚;**font.ts**:palCharWidth 已知近似偏差边界声明(控制字符/Latin-1/代理区)与 measureText 不可用于布局公式的区分 — 全部零缺陷。

## 验证

- body-invariance:两整改文件 printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 27 文件(全部 11 目标文件的测试 + present.test 集成):**81 套件 319/319,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 2 文件 0 诊断;`git diff --check` 干净

## 登记项

无新增。沿用批 15/16:死 op 清理(playMagicAnim/flashEnemy/flashPlayer/showBattleUI/clearDialogBox)、showDialogBox 双通道、drawBattleUI `_enemyPos` 参数。
