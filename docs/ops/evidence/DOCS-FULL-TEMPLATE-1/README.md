# DOCS-FULL-TEMPLATE-1 盘点证据

## 证据身份
2026-10-11；Owner: Codex；status: recorded；静态枚举，非内容深审。

## 来源与输入
源树 `/Users/zhangxu/illegal/type-pal`，HEAD `9aa3bed892728f17c70d2f86d1fe07db10a718b8`。完整原始字节计算 SHA；Git tracked/visible 与磁盘 physical 分列。

## 断言与业务 oracle
每个磁盘文件只列一次；候选扩展名为 Markdown/JSON/HTML；原绑定仅作 inherited-unrevalidated，不继承 reviewed。

## 结果
[inventory.json](inventory.json) 含逐文件清单、旧绑定、未绑定、解析结构和漂移；[protection.json](protection.json) 含四个保护文件的起始 hash。

## 限制与复核
标题和 JSON keys 仅供阅读排期，不能替代全文语义阅读。artifact owner 全部待核，不以目录猜 owner。候选工作树不含用户 draft 的正文；接收前必须重新核原树 delta。本轮无 runtime/E2E/视觉/coverage 结论。

## 2026-10-15 指南接入与更正

- [指南接入后的 pilot 复核](pilot-assessment-20261015.json)：旧 17 项只证明可回读，实际模板与 consumer 验收为 counter，accepted 0；不抹除原始记录。
- [逐文件绑定基线](binding-baseline.json)：1838 条候选排期，仍为 unread/needs-migration，不能作为全文审阅。
- [原 pilot 来源记录](pilots.json)、[原候选回读记录](pilot-candidates.json)与 `pilots/` 原样保留为历史证据；`.raw` 后缀不代表免审。
- [项目文档模型](../../guides/documentation-model.md)给出路由、事实权、写回与迁移完成标准；接入增量另记，不改变用户批准的分母。
- [2026-10-15 增量清单](delta-inventory-20261015.json)：1838 基线全部仍存在；新增候选与 23 份基线变化单列，不冒充重新深审。快照自身用 Git 定位，不自嵌 hash。

## 协作分层与 E2E-001 真实 pilot

- [旧协议保留回执](protocol-preservation-20261015.json)：完整原文引用与链接重算，原始字节由 Git blob 定位。
- [报告段落保留回执](e2e-report-preservation-20261015.json)：原段落按执行/结果/证据/历史重组，原 testing-meta 不变。
- [机器证据 consumer 回执](machine-pilot-consumer-20261015.json)：移除 envelope 后原对象 deep-equal，真实 paired consumer 零问题；无新增运行时通过。
