# 全 docs 模板注册表提案（冻结前）

状态：frozen-for-pilot；版本 `content-document-template-registry-20261011` 已冻结用于 pilot 与分批迁移。正文迁移仍需逐批 review record。

## 通用模板（保留 10 类）

| templateId | 用途与必填大纲 | 状态词 | 证据字段与历史规则 |
|---|---|---|---|
| governance-index-v1 | 目的、范围、当前状态、入口与责任、证据与下一步 | current/draft/historical | sourceRefs、owner、lastReviewed；索引不制造事实 |
| task-card-v1 | 目标、范围、前提与证据、验收、状态与交接 | draft/build/review/done/blocked/rework/cancelled | source/after SHA、owner、caller、oracle、supersedes；完整/轻量是变体 |
| guide-runbook-v1 | 目的、前置条件、步骤、失败处理、完成定义 | draft/current/retired | 输入、命令、权限、停止线、证据 |
| audit-report-v1 | 审计问题、范围与证据、发现、结论、整改与复核 | open/resolved/blocked/rework | 一手来源、排除项、发现 ID、可证伪复核 |
| evidence-receipt-v1 | 证据身份、来源与输入、断言与 oracle、结果、限制与复核 | draft/recorded/verified/rework/superseded | caller、合法输入、SHA、退出码、产物；机器 JSON 保字段 |
| design-spec-v1 | 问题与目标、真值与约束、方案、边界与风险、验收 | draft/proposed/current/superseded/blocked | primary source、用户裁决、版本边界 |
| plan-status-v1 | 目标与时间范围、里程碑、当前状态、阻塞与决策、下一步 | planned/active/blocked/done/historical | owner、依赖、证据、时间窗口 |
| reference-canon-v1 | 适用范围、一手来源、当前真值、未知与冲突、使用边界 | candidate/current/historical/superseded | sourceRefs、证据等级、升格门槛 |
| narrative-idea-v1 | 创意目的、已知约束、候选内容、未决选择、升格 canon 门槛 | idea/draft/approved/rejected/historical | 来源等级；候选不可当 canon |
| archive-record-v1 | 历史范围、原始结论、当时证据、当前有效性、继任文档 | historical/superseded/retained | 原始日期/SHA、supersedes；不得升格 current |

## Testing 专用模板（拟新增并注册）

| templateId | 内容类型与大纲 | 状态词 | 必填机器/证据字段 |
|---|---|---|---|
| test-catalog-v1 | catalog identity、domain matrix、lifecycle、dependencies、publication rules | current/draft/rework | id/kind/status/phase/engines/owner/provenance/domain/module/canonical/index/evidence/tags/lastVerified/reviewBy/dependsOn/sourceRefs/publicCallers/legalInputs/businessOracle/dedupe/revision |
| test-contract-v1 | contract question、legal typed inputs、real caller、oracle、dedupe、limits、revision | draft/active/verified/rework/superseded/archived | testing-meta、sourceRefs、caller、inputs、oracle、dedupe、SHA/version/history |
| test-domain-report-v1 | domain scope、claim matrix、fixtures/inputs、results、known gaps、quality gate | draft/active/verified/rework/superseded | report meta、evidence link、claim/evidence pairing、source SHA |
| test-e2e-stage-v1 | 现有 E2E stage README 的入口、前置、当前结论、证据 | draft/active/verified/rework/superseded/archived | stage id、phase、engines、checkpoint、dependsOn、canonical report/evidence |
| test-run-report-v1 | formal run report、steps、assertions、results、artifacts、revision history | draft/active/verified/rework/superseded | testing-meta、candidate SHA、versions、exit/signal、artifacts、failures、history |
| test-machine-evidence-v1 | machine envelope、execution identity、raw JSON、steps、hashes、exit/signal、cleanup | recorded/verified/rework/superseded | 保留现有 evidence.json 全字段；禁止散文化替代 |
| quality-gate-v1 | gate scope、diagnostics policy、commands、raw counts、acceptance/rejection、waivers | draft/active/passed/failed/blocked/historical | command/cwd、tool version、error/warning/info counts、artifact SHA、waiver/stop line |

## 绑定与迁移规则

1. 1838 候选逐篇全文读后绑定唯一 `docType/templateId/templateVersion`；不能按目录自动完成。
2. 每类至少一篇 pilot，记录原文语义保真、链接影响、机器字段回读和历史范围。
3. `review record` 与正文一一配对；迁移前后分别保存 source/after SHA，`before→after` 必填。
4. 历史文档使用 archive wrapper + 原文语义；JSON/机器证据使用统一 envelope，字段不改名、不删除。
5. artifact（脚本、日志、截图、raw、压缩包等）不做 prose 改写，必须记录 owner、产生者、caller、关联文档、SHA、保留/清理规则和当前有效性。
6. 在用户确认 registry、统计分母与 pilot 后，任务从 blocked/draft 进入 build；此前不批量改写正文。
