# Reforge 场景与菜单调用来源适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-21
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

在同一治理分支比较基点 `c749075e5ae84004789de2fcce0345279dddc7e7` 与源码提交 `f0d9847cfe96621e5e886496218c48d169a06005`。本回执供已有测试目录、报告和机器证据复用。

## 来源与输入

| 源码 | 旧行 → 新行 | 旧文件 SHA-256 | 新文件 SHA-256 |
|---|---|---|---|
| `packages/reforge/src/main.ts` | 6009 → 6009，418-425 → 417-424，457-464 → 456-463，442-454 → 441-453，1300-1398 → 1300-1398 | `962c751ddd278930d4517ad3b9624dfe0cc2cc81e3096ce49ff794df415dfcb7` | `c56d6e4e580d1d3407f22290f2e511bdb5f0b54398245bf87a7965bdb62d9c37` |
| `packages/reforge/src/menu/menu-session.ts` | 108-132 → 107-130 | `890602823f1aced9eeb228a88352f4f6938735ce278317d86911d41028a47213` | `261e69f6f75051d4f01cb0ae9f5fe5c9d8b2c71aa3798fd649d01bdb883ad05b` |
| `packages/reforge/src/menu/menu-box.ts` | 169 → 169 | `870f9701257c7d70c3bd91a381303b47ecb03989a8d38deda0079ae8ba9af1c4` | `42e20a18fb4a46d1cf1cc13bfdc274f6e413148dfb7447e0c55033fe17b568f4` |

## 断言与业务 oracle

场景、镜头、世界动作、战斗宿主和菜单数值样式的已刊片段逐字节一致。菜单会话构造片段只删去从未写入有值状态、也不驱动任何选项的占位字段。复核它的写入和读取可从旧候选的 MenuSession、主装配器与系统菜单绘制三个调用点反查。

## 结果

五条目录记录和对应双载体同步现行源码。保留原 `previousSourceRefs` 的先前事件、业务主张、执行身份、版本、运行与附件阈值。来源章节的五处旧正文行号同改为当前核对范围。

## 限制与复核

用固定 Git 提交读出上列整文件和声明范围，核摘要、只删字段差异与最新来源事件。音效、菜单和启动的本轮定向执行取[既有治理原件归档](QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz)中的 `review-11/`。本回执只负责旧测试报告的来源适用性。
