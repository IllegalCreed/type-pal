# REFORGE-IMAGE-CACHE-DISPOSAL-1 — 静态图片在途解码的释放生命周期

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

确定图片解码晚于缓存释放时，旧位图的释放归属和未完成调用的结果。

## 范围

仅取证。`ProjectImageCache` 及其在途专测；加载器创建的工程缓存与战斗试玩私有缓存是实际消费者。正常已完成图像的释放、复用和重试已有独立专测。不改资源、引擎绘制、文件格式或 E2E。

## 前提与证据

两次解码跨一次释放并重读同一键时，两张位图都会返回，后完成的一张覆盖前一张；再次释放只有后者收到 `close()`。另一路在同一笔解码完成前连续释放两次；完成后仍写入缓存，位图没有关闭，下一次读取还命中这张图。观测用真实 `AssetResolver`、可等待的解码端口与合法目录，不改产品。

试玩会同时读取多个资源；失败后会释放私有缓存，提前取消后也会在主准备 Promise 结束时再释放。由于一个分支的失败能先结束多资源等待，其余解码是否晚于最后一次释放需在真实试玩入口补证。未证明玩家流程已遇到该窗口。

## 验收

[单一归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 内 `project-image-disposal-witness.mts` 与 `runs/reforge-image-disposal-witness/` 保留观察和精确失败原件。先确认缓存被释放后是否允许复用及旧请求应如何结束，再用真实消费者补红例；不把旧专测的晚回填预期当成新合同。

## 状态与交接

本轮 Codex build allowed。试玩和工程缓存持有位图直到释放；已释放请求的晚到位图由原请求关闭。沿用现有释放后可重读合同，新请求的结果和同键等待互不受旧请求影响。先改为可证伪的正式缓存专测，再核真实试玩边界。

2026-11-19：两个观察已复现；实现与在途专测保持 review。未取得异步所有权调整的 build 准入。下一步核真实试玩解码释放顺序和结果约束。

### 本轮验收

正在解码的请求随 dispose 失效，晚到位图由原请求关闭，同时拒绝为 AbortError。旧完成不清掉新请求的同键等待。两个用例保留合法图片字节和真实 AssetResolver，在平台解码端口控制完成顺序。旧测试固化的泄漏预期退役，合并到图片缓存的生命周期专测。试玩资源准备和实际加载仍以各自定向相邻结果为准。 逐文件复核、反例及实际命令见[本轮统一原件](../evidence/QUALITY-CONTENT-ASSET-REVIEW-CLOSEOUT.tar.gz)。发布结果取受保护 PR 的实际作业。
