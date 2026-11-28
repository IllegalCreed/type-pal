# EDITOR-SPRITE-FRAME-REVISION-1 — 源帧编辑的读取版本与图片释放

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

源帧替换保存应针对生成修改所使用的帧容器版本。解码成功后的图片由本次读取持有，画布初始化失败时也由该次读取释放。

## 范围

大世界精灵工作台的真实源帧替换入口和相邻的战斗精灵源帧编辑。通过当前编辑器会话验证 catalog、源帧、错误反馈和历史。工程发布、脚本配置、存档结构与活动 E2E 由各自工作线持有。

## 前提与证据

- `SpriteResourceViewer` 把当前状态的 SHA 绑定到源自旧预览的帧数组。用合法两帧资源和两张 PNG 进入 `WorldSpriteLibrary`，慢请求选第 0 帧，快请求选第 1 帧。快请求提交后得到尺寸 `[[8,8],[6,5]]`，慢请求完成把它改成 `[[4,4],[8,8]]`，覆盖了已成功的第 1 帧修改。
- 在同一入口用合法 PNG，控制浏览器端口仅在这张图片的画布拒绝 2D context。当前已有错误提示，仍有 1 张活位图，历史和记录保持原值。
- 正式两红原件 `world-sprite-frame-revision-red` 由[治理窗口](QUALITY-EDITOR-COMBAT-SPRITE-PREVIEWS-1.md)索引。

## 验收

等待产品裁决后，从同一反例回归实际解码、帧版本、记录与撤销边界。核对战斗精灵相邻入口的实际提交逻辑和相同风险。对图片释放核原错误传播和真实释放次数。

## 状态与交接

2026-11-28 用户批准拒绝过期修改、提示重新选择并释放失败位图，且核对战斗精灵入口。Codex build allowed。战斗工作台经同样的正式用例复现相同的两帧尺寸回退，见 `battle-sprite-frame-revision-red`。

两处入口从可见已解码帧绑定原 SHA，写入前交真实会话核对；回归检查迟到操作留下的结果、成功记录的 SHA 与单笔历史。失败的解码位图由同一图像读取释放。三条正式回归及相邻路径通过，见归档 `sprite-frame-revisions-and-neighbors`。
