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

## 历史与领域类型 pilot

- [第三批正文保留回执](pilot-body-preservation-20261015-03.json)：八篇原始 source blob/SHA 与具体重组方式；历史 prompt 尾空格的展示规范化另行注明，原始字节仍由 Git 保留。
- 本批还纠正阶段 catalog 的历史/ideas 分类并同步生成视图；生成器已改为只投影，不再按路径重置人工审查结果。

## E2E 合同与历史质量门 pilot

- [第四批正文保留回执](pilot-body-preservation-20261015-04.json)：合同逐章重排与原 metadata、历史质量原文回读；没有新执行结果。

## JSON catalog 真正 pilot

- [实际consumer回执](catalog-pilot-consumer-20261015.json)：18条阅读与4字段可逆勘误，schema/catalog、paired evidence、derived indexes零问题；不授予当前运行或全量完成。

## 域报告/配对机器证据批次

- [正文与JSON保留/锚点修正回执](domain-pair-migration-20261015.json)：原metadata/对象与历史版本不变，当前source行号显式校正，实际publication消费者另记；无新动态验收。

- [历史卡包A作者候选回执](contributor-history-cards-a-20261015.json)保留c86b92d原候选状态；根线程独立接收后的SHA与逐篇结论另写[本批回执](domain-pair-migration-20261015.json)，不改作者历史自验结果。

- [历史卡包B作者回执](contributor-history-cards-b-20261015.json)保留b8c8fa4f候选与作者自验；根线程逐篇独立接收、最终SHA及A/B交接时态同步记录在[本批回执](domain-pair-migration-20261015.json)，不授予旧FSA/用户观感/CI或动态通过。

- [第三阶段四篇迁移回执](phase3-migration-20261016.json)记录正文类型/状态纠正、14个原块映射和入口长文移入原议题池；原阶段裁决、冻结来源与未实施边界保留，独立候选复核及全量完成度另验。

- [2026-10-16 五份架构历史回执迁移](historical-receipts-20261016.json)：指定候选的证据语义、原文与历史工具引用归属；不继承动态通过。

- [C2历史执行机器变体pilot](c2-historical-execution-pilot-20261016.json)：006原true与本轮未执行分开，13份既有机器仅声明升版；独立实现/pilot已接收，日期义务与动态验收未关闭。
