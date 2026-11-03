# QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1 — 战斗精灵声明帧需求的资源边界

Status: draft
Last reviewed: 2026-11-03
Owner: Codex（当前状态维护与后续协调；原执行身份见原件）
Template: task-card-v1 / 1.0.0

## 目标

核定并修复 profile 声明远大于实际资源时的帧集合分配与需求计算边界；本卡尚未取得产品 build 准入，不扩张当前百文件窗口。

## 范围

候选 `packages/content/src/battle-sprite.ts` 的FrameIndices/FrameDemand；相邻 `reforge/src/assets.ts` readiness 和 `editor/src/core/battle-sprite-commands.ts` 校验时序。普通合法资源的 ABI/显示/输出与schema值域不得顺手改变；该实现文件保持 pending，不计窗口主体完成数。

## 前提与证据

基点 f47f052fa1e732f7e574e70b268790d301dada3d。当前 validateBattleSprites 接受 idle.count=200000、后续空段连续的 enemy profile；调用 FrameDemand(definition,1) 在构造20万个索引后，以 Math.max spread 抛 RangeError，而非资源帧数校验。真实editor先算demand再比actualFrameCount，runtime先列索引再查sprite.frames；没有上游先收窄声明段。只读且有界复现及命令原件由[第二窗口](../evidence/QUALITY-PENDING-100-2/README.md)的battle-sprite-demand-risk原件保存：guardAccepted=true/count=200000/actualFrameCount=1/RangeError: Maximum call stack size exceeded；没有执行更大分配、OOM或真实工程写入，不声称普通工程/真实上传UI已复现。

## 验收

原有界合法输入反例与资源就绪caller继续作为准入依据；先确定各profile在声明与实际帧数不一致时的合同，再核不枚举求最大需求方案。普通资源、资源字节、schema与ABI不扩；不得仅捕获RangeError或加任意上限。

## 状态与交接

2026-11-03核当前FrameDemand仍枚举并spread，原风险尚未修；Status保持draft，不继承已完成第二窗口的产品build许可。下一有限动作由Codex核定最小输入/资源边界与正式caller反例后给准入；没有新增普通工程、上传UI或OOM实跑证据。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2492B / SHA-256 59d8aa3c57a7522e3fa2cb58297ab4c78ef2e8e04c8bfc3b3b0e03eff988316d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1 — 战斗精灵声明帧需求的资源边界

Status: draft
Owner: Codex
Phase: phase2
Capability: asset-readiness / code-quality
Visual Verification Timing: N/A（只读风险复现）
Branch: codex/code-quality-94-102

## 目标

核定并修复 profile 声明远大于实际资源时的帧集合分配与需求计算边界；本卡尚未取得产品 build 准入，不扩张当前百文件窗口。

## 范围

候选 `packages/content/src/battle-sprite.ts` 的 FrameIndices/FrameDemand；相邻 `reforge/src/assets.ts` readiness 和 `editor/src/core/battle-sprite-commands.ts` 校验时序。普通合法资源的 ABI/显示/输出与schema值域不得顺手改变。该实现文件保持 pending，不计窗口主体完成数。

## 前提真值门

基点 f47f052fa1e732f7e574e70b268790d301dada3d。当前 validateBattleSprites 接受 idle.count=200000、后续空段连续的 enemy profile；调用 FrameDemand(definition,1) 在构造20万个索引后，以 Math.max spread 抛 RangeError，而非资源帧数校验。真实editor先算demand再比actualFrameCount，runtime先列索引再查sprite.frames；没有上游先收窄声明段。

## 证据

只读且有界复现及命令原件由[第二窗口](../evidence/QUALITY-PENDING-100-2/README.md)的 battle-sprite-demand-risk 原件保存。捕获结果 guardAccepted=true/count=200000/actualFrameCount=1/RangeError: Maximum call stack size exceeded。没有执行更大分配、OOM或真实工程写入，不声称普通工程/真实上传UI已复现。profile守卫、两个生产caller相关函数已读；新schema上限、提前拒绝策略和公开错误合同仍待核定。

## 验收

先核资产实际帧域及允许输入合同，再选不枚举求最大需求和readiness前置边界方案；正式生产caller失败反例先红后修，保持普通数据、生成物和ABI。不得只把RangeError捕获静音、降低规则或加任意上限。用户停止线适用于新的资产/API取舍；没有产品修改授权时仅继续其它独立pending模块。

## 当前模式推进记录

Codex单一Owner只读取证；draft，不是build allowed。当前三专测的合法profile/错误字段质量核验单独接受，不授此实现文件关闭。

## 交接

2026-10-28：在第二窗口发现并冻结；原件由父卡统一保存，待下一次明确资产边界裁定再实施。不影响本窗纯测试/注释改动集成，也不把此风险登记成已修。
```
<!-- incremental-original-source:end -->
