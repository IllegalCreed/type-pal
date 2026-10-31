# game-shell-players(shell 播放器六文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 9 批 20(shell 模块批 2)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 47+ 提交)。六文件全文读毕:avi-player 203/fbp-player 173/rng-player 267/ending-player 201/splash-fallback 319/trademark-fallback 112。整改类型:纯注释 2 处(B 维,trademark-fallback 一文件),零代码改动。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改清单(均 trademark-fallback.ts):①模块头第 4 条"1 秒淡出到全黑"与 L43 定谳矛盾——PAL_FadeOut(1)=iDelay*10*60=600ms(palette.c:163),默认值与调用点均已是 600(L47/L111),头部未同步,改"600ms 淡出(PAL_FadeOut(1)=iDelay*10*60…L43 修正,非 1 秒)";②fadeOut docblock "1 秒 fadeOut…sdlpal PAL_FadeOut(1) 等价(细节 fadescreen.c 略)"同源过时,改"时长由调用方传;默认 600ms(真值=L43)"。零整改面 5 文件:avi-player(skip 键 stopImmediatePropagation 键泄漏分析——user 报"没看到主菜单"根因+DL27 跳过 500ms 缓冲+warmUpVideoAutoplay transient-activation 同步栈);fbp-player(DM27 不可跳真值 rngplay.c:409-443 无 dwKeyPress+HACKHACK chunk 68/49+rgIndex 渐变);rng-player(in-flight Promise 缓存去重 O(N²) 重复解码根因+失败不长期缓存+skip 时 shake 递减结清);ending-player(L45 女孩帧墙钟驱动 vs yPos 循环计数双轨);splash-fallback(L42 600ms 正解+L44 跳过满高标题重绘+仙鹤左上角 anchor 修正史)。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

body-invariance(method=typescript@6.0.3 parse+createPrinter removeComments,标题 <TITLE> 掩码):trademark-fallback.ts 去注释打印 2180 字节,printedSha256 1af397bb…两侧一致,titleCallCount 0/0,printedEqual=true、allEqual=true——2 处注释改写零可执行字节变化,见 [body-invariance.json](body-invariance.json)。定向回归 [directed.json](directed.json):14 个测试文件(六目标文件全部测试族)36 套件 73/73 全 passed、0 failed suites、snapshot 全零、success=true(startTime 2026-10-19T01:00:09.127Z);构成——rng-player 三件 18 例(test 14/io-lifecycle 2/next-wave 2)、avi-player 三件 20 例(test 12/async-lifecycle 5/next-wave 3)、fbp 两件 13 例、splash 两件 7 例、ending 两件 7 例、trademark 两件 8 例(trademark-fallback.test 2+trademark-splash.grok-r1 6);整改文件本体主测仅 2 例,其绿主要由族内 trademark-splash.grok-r1(6 例)与 body-invariance 恒等合围。补充门:tsc exit 0;scoped biome 0 诊断;git diff --check 干净。

## 结果

批内结论:2 处同源过时注修正成立,5 文件零缺陷。登记项无新增。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/证明脚本;36 套件为 vitest 套件字段,与 (文件,根 describe) 对 21、文件数 14 三口径分轴;600ms 真值按 README 转述 palette.c:163 推导,未回查 sdlpal 源。候选待 Owner 非作者接收;失效条件:六文件或测试族身份变化时降级为历史记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2246B / SHA-256 9f77694305e34c7fae4b3580d6a46bab1c615453b2d7a7ddefc5052fa92e3fa3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-shell-players(shell 播放器六文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 9 批 20(shell 模块批 2)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 47+ 提交)
- Coding Owner:GLM;六文件全文读毕(avi-player 203/fbp-player 173/rng-player 267/ending-player 201/splash-fallback 319/trademark-fallback 112)
- 整改类型:纯注释 2 处(B 维,trademark-fallback 一文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | trademark-fallback.ts 模块头第 4 条 | "1 秒淡出到全黑"与 L43 定谳矛盾 — PAL_FadeOut(1) = iDelay*10*60 = 600ms(palette.c:163),默认值与调用点均已是 600(L47/L111),头部未同步 | 改"600ms 淡出(PAL_FadeOut(1)=iDelay*10*60…L43 修正,非 1 秒)" |
| 2 | trademark-fallback.ts fadeOut docblock | "1 秒 fadeOut…sdlpal PAL_FadeOut(1) 等价(细节 fadescreen.c 略)"同源过时 | 改"时长由调用方传;默认 600ms(真值=L43)" |

## 零整改面(5 文件)

- **avi-player.ts**:skip 键 stopImmediatePropagation 键泄漏分析(user 报"没看到主菜单"根因)+ DL27 跳过 500ms 缓冲 + warmUpVideoAutoplay transient-activation 同步栈论证;**fbp-player.ts**:DM27 不可跳真值(rngplay.c:409-443 无 dwKeyPress)+ HACKHACK chunk 68/49 + rgIndex 渐变;**rng-player.ts**:in-flight Promise 缓存去重(O(N²) 重复解码根因)+ 失败不长期缓存 + skip 时 shake 递减结清论证;**ending-player.ts**:L45 女孩帧墙钟驱动 vs yPos 循环计数双轨说明;**splash-fallback.ts**:L42 600ms 正解 + L44 跳过满高标题重绘 + 仙鹤左上角 anchor 修正史 — 全部零缺陷。

## 验证

- body-invariance:trademark-fallback printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 14 文件(六目标文件全部测试族):**36 套件 73/73,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
