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

## 2026-10-15 机器证据变体设计补充

一手证据：`docs/testing/e2e/evidence/e2e-001.json` 的 `kind=document-audit`、`runtimeExecution.performed=false`，当前 consumer `scripts/docs/check-testing.mjs:187-340` 按顶层 id/status/sourceRefs/candidateSha/versions/claims 校验，并拒绝伪造 runtime-backed。它不是有 command/exit/steps 的执行回执。

在同一 test-machine-evidence 类型下新增 `document-audit-v2` 变体，模板版本升到 1.1.0，保留原 1.0.0 执行回执必填字段为 execution 默认合同；变体必填原审计字段、统一 `_governance` envelope、显式 kind 与未执行状态。原 JSON 所有字段与值逐项保持，envelope 不移到 payload、不改变 history/candidate/versions；元数据的 source SHA 指迁移前文档，after SHA 只在外部 review record 中保存。

可证伪反例：envelope 若覆盖原字段、把 performed 改 true、变成 payload 包装或使实际 paired evidence consumer 失败，则 pilot rework。验证须包括移除 envelope 后 deep-equal 原对象，以及实际 validateCanonicalEvidence；仅 JSON parse 不算 consumer 通过。该补充不增加第 18 类模板，也不降低执行回执的要求。

## 2026-10-15 test-catalog 机器合同更正与冻结

实际全文核读 `docs/testing/catalog.json` 全部 18 个条目及 `loadCatalog` / `renderIndexes` / `validateCatalog` / `validateCanonicalEvidence`：公开输入是顶层 schemaVersion=2、generatedBy、entries；原 1.0.0 Markdown 章节不能约束此 JSON，尚无有效 pilot，不把原设计视为已验收。

冻结 `test-catalog-v1 / 1.1.0` 为 canonical JSON 合同：保留顶层机器字段与所有 entry，不搬 payload，增加统一 `_governance`。envelope 必须给出 templateId/version、owner/provenance、source SHA/Git blob、适用范围、primary source、publication rules、逐条核读说明、history/supersedes、before→after、停止线、下一步，以及 runtimeExecutionPerformed=false。条目必填字段仍由真实 testing consumer 强制，所有状态/依赖/日期/源 hash 门保持不变；导航 Markdown 使用 governance-index，不冒充 JSON catalog。

只允许本次已核的一手分类勘误：`editor-command-form-families.engines` 与 `editor-map-workspace-sessions.engines` 从 reforge 改 editor；`phase1-dependency-ownership.phase/engines` 从 phase2/reforge 改 phase1/game。依据是对应完整报告及 `CommandForm.tsx:82-93`、`MapMode.tsx:403-420`、`dependency-ownership.test.ts:1-45` 实际 caller；旧值在 envelope history 明列。其余业务字段逐项 deep-equal 原对象，candidate/versions/history/status/lastVerified/reviewBy 不变。不得延长临近过期日期来过门。

Pilot 反证：顶层字段被搬移、任何未登记业务字段变化、错版本、伪称 runtime performed、原消费者失败或 derived index 漂移，均 rework。验证需逆向恢复三项分类改动并去 envelope 后 deep-equal 原 JSON，再跑实际 catalog/paired/index consumer；结构 PASS 不等于 18 份报告已迁移或当前 E2E 通过。模板数仍为 17。

## 2026-10-15 C1：发布状态与执行状态分轴冻结

独立审查发现：域报告的 `Status: current` 与原 document-audit JSON 的 `status=current` 是 catalog 发布状态，但旧模板词表缺少 current，结构门也未验证状态。这是模板合同 counter，不能通过把原状态改成 active/verified 消除；先前结构通过不授予受影响文档完整模板符合性。

冻结 test-domain-report 1.1.0：正文必须有唯一、非示例的 `Status`，状态轴为 catalog-publication；按 testing front matter 的 id 与唯一 catalog entry 配对。允许词表与现行 testing consumer 一致：draft、active、verified、rework、superseded、archived、proposal、current。报告的状态是 catalog 的投影，不创建第二个状态事实源。

冻结 test-machine-evidence 1.2.0：默认 execution 合同保留原执行状态词表 draft/recorded/verified/rework/superseded/historical，不增加 current。document-audit-v2 单独声明 catalog-publication 轴及上述八个发布状态，以原顶层 id/status 与 catalog 配对；schema=2、kind=document-audit、runtimeExecution.performed=false 的限制不变。current/verified 发布字样均不能证明本次执行。

独立反例 C1b 进一步要求 Markdown 的 Status 位于真实 H1 后首个独立元数据段；该段仅包含 Status、Owner、Last reviewed、Template，不能从 HTML pre、lazy blockquote 或其他正文位置扫描状态。HTML 代码和引用的实际 GFM 渲染已证明旧行扫描会误收；两例纳入整份 document model 反控。该格式约束先核现有八篇均可表达，再冻结，机器顶层 status 不受 Markdown 容器规则影响。

反例 C1c 保留首个非空行的缩进：只跳过空白行，不用 trimStart 把四空格代码 Status 或代码 H1 变成正文。两种缩进伪元数据同样由真实报告反控拒绝；已剥离注释/围栏的空白占位可跳过，真实内容的缩进不可被规范化掉。

先在 runtime-active-scene report/evidence 做版本 pilot：原字段、catalog、testing-meta、candidate、版本和执行状态不变；逆向移除 envelope 后保真，跑实际配对 consumer。补拒绝反例：execution 使用 current、未知发布状态、注释/代码中的伪 Status、正文或 JSON 与 catalog 状态漂移。通过后只更新已完整核读的另外十四篇版本声明与 review/SHA，不把合同修订算作十六篇新增迁移。尚未核读文档不自动套用此合同。
