# 文档类型与模板治理

这里是 `docs/ops`、`docs/lore`、`docs/phase1`、`docs/phase2`、`docs/phase3` 的统一文档类型注册表。每份纳入治理范围的文档必须：

1. 在 [`registry.json`](registry.json) 中拥有一个稳定的 `docType` 和 `templateId`；
2. 在对应模板中表达目的、状态、证据、边界和下一步；
3. 如果是历史归档，保留原结论，但补齐类型与模板元数据，不伪造为当前结论；
4. 旧正文不做破坏性重写，统一绑定为 `templateCompliance: governed-legacy`；这表示它已归类、按模板合同审查并纳入后续变更门禁，不表示旧正文已经被改写成模板样式；
5. 新增文档必须达到 `templateCompliance: template-compliant`，不再产生新的独立格式。

模板是结构合同，不是内容真值。真值仍必须回到正文的一手证据、阶段锚点和内容深审记录。

## 类型速查

| docType | 适用文档 | 模板 |
|---|---|---|
| `governance-index` | README、目录、索引、看板 | [`governance-index.md`](governance-index.md) |
| `task-card` | 当前/历史任务卡、任务归档 | [`task-card.md`](task-card.md) |
| `guide-runbook` | 操作指南、runbook、工作流 | [`guide-runbook.md`](guide-runbook.md) |
| `audit-report` | 审计、评估、差异报告 | [`audit-report.md`](audit-report.md) |
| `evidence-receipt` | JSON/日志/回执/机器证据说明 | [`evidence-receipt.md`](evidence-receipt.md) |
| `design-spec` | 设计、规范、架构、接口、schema | [`design-spec.md`](design-spec.md) |
| `plan-status` | 计划、里程碑、状态、backlog | [`plan-status.md`](plan-status.md) |
| `reference-canon` | phase/lore/reference 真值资料 | [`reference-canon.md`](reference-canon.md) |
| `narrative-idea` | lore 创意、草案、brainstorm、beat sheet | [`narrative-idea.md`](narrative-idea.md) |
| `archive-record` | 仅保留历史记录的归档材料 | [`archive-record.md`](archive-record.md) |

旧文档可以暂时保留原有内容和标题，但不得继续扩张独立格式；若需要重写正文，必须单独开迁移任务并保留历史。新增文档必须从模板复制。
