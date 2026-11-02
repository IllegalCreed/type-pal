# 移动端对pre94已接受文件的增量复核

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计主题:移动端(同一3y,起点86832300)对 pre94 已接受文件的增量复核。真实增量身份:移动端净 diff 直接改变 7 个此前 closed 生产文件;初始 7 SHA 均匹配移动端已独立审查候选,83 份原注册附件逐字节核对无漂移;旧八维仅支持原合同、增量必须另核,未把新 14 路径升 accept。

## 范围与证据

旧 input/audio、shell-lifecycle、analytics、3j scale/FPS 及 present/speedrun 原件按当前适用范围复用;移动端 release-evidence 与 independent-review 提供新增 input/modal/layout/privacy 读域;来源不等于本轮全部接受。noop 转发反控:旧 2 绿、新恰 1 条 UI 状态断言红、恢复 2 绿;7 文件 30 相邻零 stderr;原测试数量不变,一标题明确为 SDK DOM 而非实网。

## 发现

核心发现:AVI 连续拒绝路径暴露既有真缺口。反证回执 [avi-repeat.json](avi-repeat.json) 与完整原件 [avi-repeat-native.json.gz](avi-repeat-native.json.gz):原生对照 1 绿/反例 1 条指定 DOM AssertionError——两次拒绝后可见重试提示未按合同消失,根因是 one-shot click listener 被首次重试消费、再次拒绝因 clickOverlay 已存在而提前返回。这是修复前冻结失败,不是质量门通过;不得只因移动端 CI 或包绿维持该实现 accept。[风险卡](../../../tasks/GAME-AVI-RETRY-OWNERSHIP-1.md)已收到用户「批准修复重复重试」。反例观察仅合法媒体 IO 结果模拟(play Promise 两种结局均为 mock),不证明实体手机自然发生该权限序列。

## 结论

原判定:反例原件保持修复前状态,不以用户批准或 61 定向自动恢复 accept。继任:2026-10-22 该增量已在 [game-actions-mobile](../game-actions-mobile/README.md) 收口,CODE78 恢复接受;此处保留修复前反例与当时撤回决定,不改写旧 raw、不把旧红记为绿。本治理不重跑、不改写原判定、不撤销旧撤信。

## 整改与复核

本页为有限增量:未关闭整批、未跑新全仓/coverage/protected、不扩 94–102 或硬件验收;原注册附件/历史失败不改写。本页正文承载原审计真实目标/发现/结论/限制;原件逐字节保全在下方;候选待Owner接收。

原文存活链接原样保留:[GAME-AVI-RETRY-OWNERSHIP-1.md](../../../tasks/GAME-AVI-RETRY-OWNERSHIP-1.md) [README.md](../game-actions-mobile/README.md)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2145B / SHA-256 f13162c6b36c19603b0904b854138280e44472458b3469d3adfe8a69f678af35；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 移动端对pre94已接受文件的增量复核

Status: historical counter / approved repair accepted in game-actions-mobile
Owner: Codex（单Agent）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

当前同一3y，起点868323003。移动端净diff直接改变7个此前closed生产文件；初始7 SHA均匹配移动端已独立审查候选，83份原注册附件逐字节核对无漂移。旧八维仅支持原合同，增量必须另核，未把新14路径升accept。

## 来源与输入

旧input/audio、shell-lifecycle、analytics、3j scale/FPS及present/speedrun原件按当前适用范围复用；移动端release-evidence与independent-review提供新增input/modal/layout/privacy的具体读域。来源不等于本轮全部接受。

## 断言与业务oracle

analytics公开偏好入口已补原两例中的真实拒绝→公开方法重开→原选择不变断言。noop转发使旧2绿、新恰1条UI状态断言红，恢复2绿；7文件30相邻零stderr。原测试数量不变，一标题明确为SDK DOM而非实网。

## 结果

AVI连续拒绝路径发现既有真缺口：[avi-repeat.json](avi-repeat.json)及[完整原件](avi-repeat-native.json.gz)。原生对照1绿/反例1条指定DOM AssertionError，这是修复前冻结失败，不是质量门通过；不得只因移动端CI或包绿维持该实现accept。[风险卡](../../../tasks/GAME-AVI-RETRY-OWNERSHIP-1.md)已收到用户“批准修复重复重试”；正式红绿、当前七路径绑定及3v逐文件八维统一进入[本次游戏模块](../game-actions-mobile/README.md)。本反例原件保持修复前状态，不以用户批准或61定向自动恢复accept。

## 限制与复核

当前只是有限增量，未关闭整批、未跑新全仓/coverage/protected，不扩94–102或硬件验收。AVI观察仅合法媒体IO结果模拟，不证明实体手机自然发生该权限序列。后继证据只补实际缺口，原注册附件/历史失败不改写。

2026-10-22当前增量已在game-actions-mobile收口，CODE78恢复接受；此处保留修复前反例与当时撤回决定，不改写旧raw或把旧红记为绿。
```
<!-- incremental-original-source:end -->
