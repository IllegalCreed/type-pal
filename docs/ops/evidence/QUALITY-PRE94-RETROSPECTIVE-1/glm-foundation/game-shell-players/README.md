# game-shell-players(shell 播放器六文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「game-shell-players(shell 播放器六文件)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(2246B,SHA 9f77694305e3)。

## 来源与输入

来源为固定Git载体,非本次运行;原3个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [body-invariance.json](body-invariance.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
