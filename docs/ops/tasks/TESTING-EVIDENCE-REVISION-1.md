# TESTING-EVIDENCE-REVISION-1 — 以版本适用性替代 E2E 日历期限

Status: done
Owner: Codex
Reviewer: Codex（单Agent，作者自验范围明示）
Phase: ops
Capability: testing
Branch: codex/code-quality-94-102

## 目标与授权

用户2026-10-30明确同意：记录E2E当时版本，与最新版本/相关源码比较，取消任意日期驱动的反复复核。Codex build allowed；单一Owner，无其它活跃写入者。当前代码治理42/174的308路径已另存保护检查点，不能混作本任务完成信用。

## 范围与设计

- 移除活动catalog/stage模板的reviewBy及日历硬门；历史reviewBy只保留在历史/治理回执，lastVerified和原candidate/versions不变。
- 复用现有revision与sourceRefs，提供只读对比当前候选/content/save/相关source指纹的命令。普通提交SHA不同不自动要求重跑，相关边界不同时明确changed，记录缺失为unknown；匹配不等于runtime验收。
- 保留metadata/catalog/evidence配对、source hash、合法输入/oracle、依赖和runtime artifact真实性门，不把移除日历规则当作其它规则豁免。
- 更新现行长期规范、模板和官方索引producer；不改产品、存档、游戏资源或实际E2E结论，不运行浏览器/coverage。

## 验证与停止线

先用合法catalog/stage无reviewBy的正式反例确认旧规则失败，再改validator；以实际source漂移/记录缺失/版本差异验证新对比，运行相邻Node工具测试、完整文档门及lint零诊断。原失败与完整日志外存后形成持久回执。新产品取舍不在范围。

## 当前交接

2026-10-30：政策有限范围完成。20活动条目、6阶段入口、5模板说明/示例及2派生视图已同步；canonical报告/机器证据和所有status、lastVerified、revision、sourceRefs精确保全。旧续期原件继续可复验，但不再构成活动期限。

定向21/21与完整文档工具131/131通过；check:docs全部子门0issues、stderr空；全仓lint-zero6230文件0error/0warning/0info。首次lint3个JSON格式错误与content-first指纹拒绝保留原件，格式和实际Owner绑定已修，不降低规则。旧check-testing已撤review，新增两辅助工具review等主代码窗口统一门，不新增closed。

[逐文件八维、精确边界与完整原件](../evidence/TESTING-EVIDENCE-REVISION-1/README.md)；只读复验见同目录verify.mjs。真实001比较只报告SAVE11→12 changed，不改原执行身份。006仍rework，未运行浏览器/E2E/全仓产品check/coverage/protected。父命名目标保持42/174、余132，单Agent同一治理分支；无新分支、提交、推送、PR或合并。
