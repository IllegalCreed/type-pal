# Reforge 物品会话专测来源适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-21
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

来源基点为主线 #74 的合并提交 `10378100a33013d8c2030ca266e125b913e9c6a7`。当前专测固定在治理提交 `b55f156256844e6f430a754c90c4c768990a3f7b`。

## 来源与输入

对比 `packages/reforge/src/menu/item-use-session.test.ts`。原全文件 SHA-256 为 `06e8fa00425ff2a6b199863a13fb8fa007ff121a743496ed44cd5b2795cc09a9`，当前为 `ea7a12e2c05ab142446625025181b6cece0e4e3d2858b3c14100d44099f0c72f`。原发布引用的第 5–22 行逐字节相同。用两个固定提交的 `git show` 结果可分别核范围和全文件摘要。

## 断言与业务 oracle

原范围仍观察取消后由当前操作持有 pending，重复调用被拒绝。其后另一个用例改为真实同时在途的双实例，取消 A 后检查 B 的信号和占位，再让 A 退出观察归还。反控原件取[治理执行归档](QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 的 `follow-up/` 和本轮 `after-q2/` 定向结果。

## 结果

测试目录、报告和机器证据同步一个来源版本。旧执行、候选、内容/存档版本、原引用范围、业务主张和附件均保留。新的来源校验只接受固定候选和不变片段。

## 限制与复核

复验时从固定 Git 对象读取原片段，并核 catalog、报告和机器证据的 `previousSourceRefs` 与当前摘要。两实例回归的运行范围取独立治理归档。本回执仅确认已刊片段的来源适用性。
