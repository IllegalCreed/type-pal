# CODE3k present primitives 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3k六primitive中framebuffer/screen-shake/screen-wave三文件及直接测试/caller复审切片(基点7996a6884,0 behind/191 ahead);dither-fade/draw-number/follower-pos留待下一片;3k整卡仍partial,不把本片当整卡accept。

## 范围与证据

完整读取三实现与七份直接测试(framebuffer默认+边界、screen-shake主干+边界、screen-wave主干+leave+mirror);直接caller按范围读present.ts的framebuffer clear/地图层wave/最终shake/toImageData与canvas flush区间、draw-tilemap/draw-sprite的writePixel入口;primary读reference/sdlpal/scene.c:365-430,486波形推进/偏移表/静态相位、video.c:571-620奇偶shake搬运/黑条/递减、global.h:379,538-539 WORD/SHORT字段。SHA与范围见[read-boundaries.json](read-boundaries.json)。

## 发现

framebuffer默认320x200、可选离屏尺寸、越界静默写、palette缺色黑色回退与RGBA alpha合同与caller一致;screen-shake奇偶垂直搬运、level 1/199/200/256、advance=false补帧与shakeTime递减和SDL视频路径一致,无buffer ownership或残留行缺陷;screen-wave 32相位表、循环卷动、跨帧静态相位、advance=false与0/256关断和PAL_ApplyWave一致,现有小于等于0 guard保留JS number对unsigned WORD回绕的已修语义。历史raw opcode反控与mutant数字只作卡内历史证据,本片未重新执行raw census或mutant。本片无直接实现问题,未改生产或测试。

## 结论

定向7 files/35 tests passed、game typecheck passed、无stderr;未知项=三个未读primitive、真实视觉坐标/E2E、整卡统一质量门,保持pending/partial,不因35例全绿关闭整卡;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check。

## 整改与复核

未重跑;下一片直接继续dither-fade/draw-number/follower-pos;94-102后置。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2738B / SHA-256 c885e1ab693ad24bd6d67a6304f25411a77d9957b1707b33daeed0147f8e9be5；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3k present primitives 当前复审切片

基点：`7996a6884`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 191 ahead`。本切片只处理 CODE-QUALITY-3k 六个 primitive 中的 `framebuffer`、`screen-shake`、`screen-wave` 三文件及其直接测试/caller；`dither-fade`、`draw-number`、`follower-pos` 留待下一片。3k 整卡仍 `partial`，不把本片当作整卡 `accept`。

## 逐文件与真值边界

完整读取三个实现和七份直接测试：`framebuffer.ts` + 默认/边界测试，`screen-shake.ts` + 主干/边界测试，`screen-wave.ts` + 主干/leave/mirror 测试。直接 caller 按范围读取 `present.ts` 的 framebuffer clear、地图层 wave、最终 shake、`toImageData`/canvas flush 区间，`draw-tilemap.ts`/`draw-sprite.ts` 的 `writePixel` 入口。primary source 读取 `reference/sdlpal/scene.c:365-430,486` 的波形推进/偏移表/静态相位，`reference/sdlpal/video.c:571-620` 的奇偶 shake 搬运/黑条/递减，以及 `global.h:379,538-539` 的 WORD/SHORT 字段类型。SHA、行数和范围见 [`read-boundaries.json`](read-boundaries.json)。

## 判别力与结论

`framebuffer` 的默认 320×200、可选离屏尺寸、越界静默写、palette 缺色黑色回退和 RGBA alpha 合同与 caller 一致；没有证据把宽容越界写改成新的异常公共行为。`screen-shake` 的奇偶垂直搬运、level 1/199/200/256、advance=false 补帧和 shakeTime 递减与 SDL 视频输出路径一致；没有发现 buffer ownership 或残留行缺陷。`screen-wave` 的 32 相位表、循环卷动、跨帧静态相位、advance=false 和 0/256 关断与 SDL `PAL_ApplyWave` 一致；现有 `<=0` guard 保留 JS number 对 unsigned WORD 回绕的已修语义。历史 raw opcode 反控与 mutant 数字只作卡内历史证据，本片没有重新执行 raw census 或 mutant，不把它写成新的运行时结果。

本片没有直接实现问题，也没有改生产代码或测试。未知项是三个未读 primitive、真实视觉坐标/E2E 和整卡统一质量门；均保持 pending/partial，不因 35 例全绿关闭整卡。

## 验证

定向 `7 files / 35 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。测试使用真实 typed `Uint8Array`/`ImageData`、行级像素 oracle、相位 reset 隔离、真实 present caller 语义；没有重复历史主干断言或用包级绿灯代替 caller/primary 阅读。

按用户成本约束，本小片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；这些门留到完整大模块收口前集中执行。下一片直接继续 3k 的 `dither-fade`、`draw-number`、`follower-pos`，94–102 仍后置。

```
<!-- incremental-original-source:end -->
