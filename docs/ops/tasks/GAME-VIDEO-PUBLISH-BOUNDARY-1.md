# GAME-VIDEO-PUBLISH-BOUNDARY-1 — 视频转码子路径所有权与失败发布

Status: build
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

修复视频转码两个边界缺口：旧授权只明确拒绝data/data-extracted根链接，不能冒充对后代节点与失败发布策略的裁决。反例一：真实extract:videos→convertOne→execFile ffmpeg -y→stat/mtime链下，把videos目录或1.mp4指向另一自有temp目标时ffmpeg实际改写目标marker（所有权越界）；反例二：独立encoder先写目标再退出7，入口报失败但原发布字节已丢失（失败事务）。

## 范围

获批后仅scripts/extract-videos.ts、cli-entrypoint-paths.test.ts及本卡/父证据；六编号、编码参数、正常mtime增量策略、错误退出与raw输入链接保持；资源格式由encoder替身代表，反例只证文件所有权/失败事务不证真实视频编码。

## 前提与证据

固定源全文核读。用户2026-10-26批准“保护输出和失败保留”：ffmpeg预检前检查videos目录及六个最终mp4节点、拒绝链接；独占临时目录内转码、成功且非空后同卷rename；finally仅清理本次临时树、失败保留旧字节。实施：十个真实入口例通过（原六例+两后代链接+失败保留+缺encoder），其余输出/root/诊断相邻合计四文件27例、TC0、显式default/JSON与stderr0；批准前6绿3指定业务红保留。若目标字节保留或encoder未执行则claim被推翻——非只凭异常退出断定覆盖。

## 验收

当前仍build，随父52统一门与发布收口；原extract-videos整文件继续review，未重跑全仓/coverage、未声称发布。

## 状态与交接

build保持原语义；父阶段QUALITY-REVIEW-52-CLOSEOUT-1继续。原件:[video-boundary.json](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/video-boundary.json) [video-red.json.gz](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/video-red.json.gz) [QUALITY-REVIEW-52-CLOSEOUT-1.md](QUALITY-REVIEW-52-CLOSEOUT-1.md)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3633B / SHA-256 e1bc9ee79af211fc1fb3c371e73e7b9159989d6ded974b63e41e1b8084d869ba；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-VIDEO-PUBLISH-BOUNDARY-1 — 视频转码子路径所有权与失败发布

Status: build
Phase: phase1 asset pipeline
Capability: video output ownership / publication
Coding Owner: Codex（单Agent；当前仅正式反例）
Reviewer: Codex
Visual Verification Timing: N/A（文件字节与进程失败，不改画面或编码）
Branch: codex/code-quality-94-102

## 目标与停止线

review52全文补核发现视频输出的两个实际边界缺口。[事实与可审阅方案](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/video-boundary.json)、[完整红例原件](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/video-red.json.gz)。旧用户只明确批准拒绝data/data-extracted根链接；不能把这份授权冒充对所有后代节点与失败发布策略的裁决。

正式生产脚本未改。现有六例通过，三个新反例分别在其他Owner字节被改写的业务断言失败；实际入口、Node子进程、所有路径/链接/假encoder均在测试独占temp，未执行真实提取或改生成物。

## 工程前提、primary与可证伪反例

- 真实caller：package extract:videos→scripts/extract-videos.ts；所有权根guard→convertOne→execFile ffmpeg -y→stat/mtime。
- 两个反例分别把videos目录或1.mp4指向另一自有temp目标。正常data/extracted根可通过guard，ffmpeg实际改写目标marker。
- 失败反例的独立encoder先写目标，再退出7；入口报失败但原发布字节已丢失。资源格式在此由encoder替身代表，反例只证明文件所有权/失败事务，不证明真实视频编码。
- 第一阶段：视频离线转码、运行时播放mp4保持；schema/save/机制无关。第二阶段N/A。
- 若目标字节保留或encoder未执行，相关claim即被推翻；不是只凭异常退出断定覆盖。

## 有限方案与准入

待用户：在ffmpeg调用前拒绝视频目录/目标mp4输出链接（raw输入链接仍允许）；编码写独占临时mp4，成功且非空后才替换，失败仅清理自身临时物并保留旧视频。六编号、编码参数、正常mtime增量策略和错误退出不扩张。此项触及AGENTS资产管线停止线，产品build尚未允许；其余review52独立范围继续。

获批后仅scripts/extract-videos.ts、cli-entrypoint-paths.test.ts及本卡/父证据；先已存三红，再实现与相邻回归。纯重构另提交，全仓/official等52窗口稳定后集中。

## 实施与交接

2026-10-26：反例6绿3业务红，完整raw/native/命令/源码指纹保全。Codex等待本项裁决；原extract-videos整文件继续review。无用户判断前不把失败修成绿，不关闭此文件；[父阶段](QUALITY-REVIEW-52-CLOSEOUT-1.md)继续。

## 2026-10-26 用户准入

用户已批准“保护输出和失败保留”。Codex build allowed：限上述三个已红边界，拒绝视频子目录/目标mp4链接，独占临时转码成功后替换，失败清理自身临时物并保留旧字节；原编号/编码参数/mtime跳过/raw链接保持。当前仅解除该项停止线，尚未冒称实现/门禁通过。

## 2026-10-26 实现与定向回执

批准范围已实现：ffmpeg预检前检查videos目录及六个最终mp4节点；独占临时目录内转码，成功且非空后同卷rename，finally仅清理本次临时树。十个真实入口例通过，含原六例、两后代链接、失败保留和缺encoder；其余输出/root/诊断相邻合计四文件27例、TC0，显式default/JSON与stderr0。用户批准前6绿3指定业务红保留，未重跑全仓/coverage或声称发布。当前仍build，随父52的统一门与发布收口。
```
<!-- incremental-original-source:end -->
