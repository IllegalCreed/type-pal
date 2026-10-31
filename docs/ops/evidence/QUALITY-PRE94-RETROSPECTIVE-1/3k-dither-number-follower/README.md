# CODE3k dither / number / follower 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3k剩余三实现(dither-fade/draw-number/follower-pos)逐文件复审切片(基点6aa56ea80,0 behind/192 ahead)。核心发现:draw-number.ts对正Infinity会在实际while(i>0)中无限循环——生产caller当前来自有限角色/物品/战斗数值,无一手证据表明该非法输入可达用户路径,执行会卡死的直接反例不在本批强行运行;该候选写入ledger review,不以包级绿灯关闭,也不擅自改公共绘制合同。该风险后续由3k-number-quality窗口处置。

## 范围与证据

完整读取三实现与六份直接测试;调用链按范围读取present.ts dither/follower区、battle present intro/summon fade与数字弹幕区、menu/dialog/battle的drawNumber真实caller;primary读reference/sdlpal的video.c VIDEO_FadeScreen nibble算法、battle.c PAL_BattleFadeScene、ui.c:640-732 PAL_DrawNumber、scene.c:658-780 walking/静止跟随者分支。SHA与范围见[read-boundaries.json](read-boundaries.json)。

## 发现

dither-fade的RG_INDEX=[0,3,1,5,2,4]、12x6 step、低nibble正负1、高nibble立即取target与backup ownership和video/battle caller一致,测试覆盖phase/邻接/不变/收敛;follower-pos的walking偏移/障碍回退、静止冻结、trail fallback、trail[2]朝向与0x46摆位均有真实方向轴与事件回归,未发现新直接缺陷;draw-number的颜色基址、R-to-L、三种对齐、截断、opaque mask与缺帧降级与ui.c及callers一致,除上述Infinity候选。

## 结论

本片未修生产或测试代码;定向6 files/42 tests passed、game typecheck passed、无stderr。未知项=drawNumber非有限输入产品边界裁决、真实视觉/E2E、3k统一质量门,保持review/partial;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check。

## 整改与复核

未重跑;不以数量或包级全绿代替逐文件结论;94-102后置。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2618B / SHA-256 c469b1da3bcf00ad1ec5434deb71d419beb46c9c430d9c295e65402f34478b65；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3k dither / number / follower 当前复审切片

基点：`6aa56ea80`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 192 ahead`。本切片完成 CODE-QUALITY-3k 剩余三个实现文件及直接测试的逐文件阅读；3k 整卡仍 `partial`，不把本片当作整卡 `accept`。

## 逐文件与真值边界

完整读取 `dither-fade.ts`、`draw-number.ts`、`follower-pos.ts` 和六份直接测试。调用链按范围读取 `present.ts` 的 dither/follower 区间，battle present 的 intro/summon fade 与数字弹幕区间，menu/dialog/battle 的 `drawNumber` 真实 caller。primary source 读取 `reference/sdlpal/video.c` 的 `VIDEO_FadeScreen` nibble 算法、`battle.c` 的 `PAL_BattleFadeScene`、`ui.c:640-732` 的 `PAL_DrawNumber`、`scene.c:658-780` 的 walking/静止跟随者分支。SHA、行数与范围见 [`read-boundaries.json`](read-boundaries.json)。

## 判别力与结论

`dither-fade.ts` 的 `RG_INDEX=[0,3,1,5,2,4]`、12×6 step、低 nibble ±1、高 nibble 立即取 target 与 backup ownership 和 video/battle caller 一致；直接测试覆盖 phase、邻接、不变和收敛。`follower-pos.ts` 的 walking 偏移/障碍回退、静止冻结、trail fallback、当前 trail[2] 朝向和 0x46 摆位均有真实方向轴与事件回归，未发现新直接缺陷。

`draw-number.ts` 的颜色基址、R-to-L、三种对齐、截断、opaque mask 和缺帧降级与 `ui.c`/menu/battle/dialog callers 一致；但正 `Infinity` 会在实际 `while (i > 0)` 中无限循环。生产 caller 当前来自有限的角色/物品/战斗数值，尚无一手证据表明该非法输入可到达用户路径；执行会卡死的直接反例不在本批强行运行。该候选写入 ledger `review`，不通过包级绿灯关闭，也不擅自改变公共绘制合同。

本片未修生产或测试代码；未知项是 `drawNumber` 非有限输入的产品边界裁决、真实视觉/E2E 和 3k 统一质量门。它们保持 review/partial。

## 验证

定向 `6 files / 42 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。测试使用真实 framebuffer、opaque mask、方向轴/障碍 oracle、dither phase/byte oracle，并与 primary/caller 对读；未以数量或包级全绿代替逐文件结论。

按用户成本约束，本小片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；这些门留到完整大模块收口前集中执行。后续可继续处理 `drawNumber` 非有限输入的高风险边界裁决或进入下一张 pre-94 pending 卡；94–102 仍后置。

```
<!-- incremental-original-source:end -->
