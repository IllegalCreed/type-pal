# game-present-root(present 根目录 11 文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 8 批 17(present 根目录家族,present 模块收官批)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 42+ 提交)。11 个生产文件全文读毕共 2071 行:dither-fade 44/draw-sprite 49/framebuffer 49/screen-shake 54/follower-render 64/screen-wave 73/follower-pos 84/draw-number 109/font 202/draw-tilemap 382/dialog-box 961。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改类型:纯注释 3 处(B 维,两文件),零代码改动,由 [body-invariance.json](body-invariance.json) 机械见证。整改①draw-tilemap.ts L4-11 DrawEntry 接口注释为日语(エントリ/キー/実際)且引用"present.ts の sortedDraw ループ"不实——present.ts 无 sortedDraw 命名,实际机制是收集后按 baseY 排序、依序执行 draw 回调,译为中文并改述真实机制。整改②draw-tilemap.ts L82 blitTileAt 日语注释"内部 blitTile を外部に公開(cover-tile 単体描画用)"不准——唯一消费方是 draw-tilemap-pixels 测试直测,改中文如实表述。整改③dialog-box.ts drawDialogBox docblock 的 key icon 显示条件与同文件 shouldShowKeyIcon(L761-764,仅 waiting-page-key/waiting-end-key 两等键 phase 显示)及其上注释(L754-755 line-done 不显 icon)自相矛盾,且"blink"已被 palette 轮转方案取代(L731-732 已注明 icon 常显),改述为 shouldShowKeyIcon 真值:center 排除、闪烁由 present 层 palette 轮转产生。零整改面 9 文件:dither-fade(video.c:1130-1280 rgIndex 真值)、draw-sprite(M3.5 opaque mask 修正史+scene.c:224/291/358 逐帧 anchor)、framebuffer(writePixel 边界合同)、screen-shake(video.c:571-616 奇偶帧上下移)、screen-wave(scene.c:365-450 32 相位表+WORD 回绕)、follower-render(res.c:335-348+[0,2,0,1] 步帧序列)、follower-pos(fWalking 二分支冻结+0x46 摆位,两组 user 报 bug 修正史)、draw-number(ui.c:640-732 1:1 port)、font(palCharWidth 近似偏差边界+measureText 不可用于布局公式)——全部零缺陷。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

body-invariance(method=typescript@6.0.3 parse+createPrinter removeComments,标题两侧以 <TITLE> 掩码):draw-tilemap.ts 与 dialog-box.ts 去注释打印 AST 双侧 printedSha256 完全一致(8064/20204 打印字节,titleCallCount 0/0),allEqual=true——3 处注释改写零可执行字节变化;其余 9 文件零改动靠工作树零 diff 口径,不在该件内。定向回归 [directed.json](directed.json):27 个测试文件(11 目标文件全部测试族+present.test 集成)四层构成——11 个 grok-r1 像素文件 96 例、3 个 glm-phase1-leaves 文件 11 例、1 个 glm-next-wave(dialog-box)14 例、12 个主测文件 198 例(含 dialog-box.test 69、present.test 58、font.test 15),合计 319/319 全 passed、0 失败消息、snapshot 全零、success=true(startTime 2026-10-19T00:55:09.609Z);本页"定向 27 文件"口径与回执逐项吻合。补充门:tsc --noEmit -p packages/game exit 0、scoped biome 2 文件 0 诊断、git diff --check 干净。

## 结果

批内结论:3 处注释整改成立,9 文件零缺陷;present 模块全部收口(core+battledraw+root)。登记项无新增,沿用批 15/16:死 op 清理(playMagicAnim/flashEnemy/flashPlayer/showBattleUI/clearDialogBox)、showDialogBox 双通道、drawBattleUI _enemyPos 参数。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/typecheck/biome;绿只证注释整改未破坏既有行为,不证初红根因,不授 E2E/coverage 信用;套件字段 81、(文件,根 describe)对 54、文件数 27 三口径分轴互不充当。候选待 Owner 非作者接收;失效条件:11 生产文件或其测试族身份变化时本回执降级为历史记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3248B / SHA-256 1c6f31ecf3e7c3e485813251119c87ee50e0c4f5dc8bc7bbf8158648b5225813；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-present-root(present 根目录 11 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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
```
<!-- incremental-original-source:end -->
