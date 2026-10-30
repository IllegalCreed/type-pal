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
