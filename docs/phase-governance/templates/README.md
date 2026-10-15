# 文档类型与模板治理

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

提供全 docs 的模板合同。模板规定结构、状态词、证据字段与历史边界；内容真值仍须回到一手来源和实际 consumer。

## 范围

通用 10 类与 testing 专用 7 类统一登记在 [registry.json](registry.json)。完整与轻量 Ops 任务卡是 task-card 的两个变体，不重复计数。路径/文件名只用于候选排期，最终 docType 须读取正文后决定。

## 当前状态

17 类设计获用户批准，注册表在真实 pilot 后冻结供分批迁移（frozen-for-migration）。每篇仍须真实阅读与格式/consumer 核验；新增格式变体先补设计。2026-10-11 的保真样本不足以证明模板符合性，不算已验 pilot。正文必须包含具体内容、状态边界、证据与下一步，不能只有章节名或 preserved-source wrapper。

## 入口与责任

| docType | 目的 | 模板 |
|---|---|---|
| `governance-index` | 职责导航与权威入口 | [governance-index.md](governance-index.md) |
| `task-card` | 单一变更的目标、准入、实施与交接 | [task-card.md](task-card.md) |
| `guide-runbook` | 可重复操作的前提、步骤与失败处理 | [guide-runbook.md](guide-runbook.md) |
| `audit-report` | 审计问题、发现与整改复核 | [audit-report.md](audit-report.md) |
| `evidence-receipt` | 指定来源、输入与候选的证据回执 | [evidence-receipt.md](evidence-receipt.md) |
| `design-spec` | 问题、真值约束与设计验收 | [design-spec.md](design-spec.md) |
| `plan-status` | 时间范围、里程碑与阻塞 | [plan-status.md](plan-status.md) |
| `reference-canon` | 分清已核真值与候选来源 | [reference-canon.md](reference-canon.md) |
| `narrative-idea` | 尚未升格 canon 的创意与取舍 | [narrative-idea.md](narrative-idea.md) |
| `archive-record` | 保留时点结论、证据与继任关系 | [archive-record.md](archive-record.md) |
| `test-catalog` | 机器索引与依赖的事实源 | [test-catalog.json](../../testing/_templates/test-catalog.json) |
| `test-contract` | 合法输入、caller、oracle 与排重的测试合同 | [test-contract.md](../../testing/_templates/test-contract.md) |
| `test-domain-report` | 域内 claim/evidence 与缺口 | [test-domain-report.md](../../testing/_templates/test-domain-report.md) |
| `test-e2e-stage` | 稳定阶段的入口、前驱与当期结论 | [test-e2e-stage.md](../../testing/_templates/test-e2e-stage.md) |
| `test-run-report` | 一次执行的断言、结果与回执 | [test-run-report.md](../../testing/_templates/test-run-report.md) |
| `test-machine-evidence` | 机器执行身份、步骤与退出清理 | [test-machine-evidence.json](../../testing/_templates/test-machine-evidence.json) |
| `quality-gate` | 命令、原始诊断与接受/拒绝判据 | [quality-gate.md](../../testing/_templates/quality-gate.md) |

Owner 为当前 Coding Owner；注册表的 requiredSections、statuses、evidenceFields 和 historyRule 是结构合同。JSON 另由 requiredFields 定义机器字段；不能用 Markdown 章节检查替代 schema/consumer 验证。

## 证据与下一步

- [已批准的设计提案](registry-proposal-20261011.md)保留 2026-10-11 的范围与大纲，适配流程见[项目文档模型](../../ops/guides/documentation-model.md)。
- 新文档从对应模板开始；历史文档保留原结论/日期/SHA，使用 archive wrapper 说明当前有效性与继任者。
- governed-legacy 仅是旧 ledger 状态，不是迁移完成；全量完成前除用户批准保留项外必须消除。
- 每类至少一篇实际迁移、逐篇审查与 consumer 验证通过后，才能推进同类批次。静态门不证明 runtime/E2E/视觉/coverage。
