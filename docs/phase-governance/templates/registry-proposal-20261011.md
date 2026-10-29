# 全 docs 模板注册表提案（冻结前）

状态：frozen-for-pilot；版本 `content-document-template-registry-20261011` 已冻结用于 pilot 与分批迁移。正文迁移仍需逐批 review record。

Status: draft
Owner: Codex
Last reviewed: 2026-10-25
Template: design-spec-v1 / 1.0.0

当前 Status 只标本页持续补充的设计提案：新增原生格式仍处 draft。上方冻结声明及各已冻结变体保留原版本/效力，不能将本页 draft 解释为撤销已冻结合同，也不能把旧 frozen-for-pilot 当作新格式获准。原生载体可扩展时使用 envelope；immutable 输出按已准入 json-native 合同复用唯一 review，禁止为套格式改原字段。

## 问题与目标

为全 docs 建立统一模板注册表：通用 10 类与 Testing 专用 7 类（共 17 类）各自钉定用途大纲、状态词与证据字段；1838 候选逐篇全文读后绑定唯一 `docType/templateId/templateVersion`，不能按目录自动完成。版本 `content-document-template-registry-20261011` 已冻结用于 pilot 与分批迁移。

## 真值与约束

正文迁移仍需逐批 review record；`before→after` SHA 必填且与 review record 一一配对；artifact（脚本、日志、截图、raw、压缩包等）不做 prose 改写，必须记录 owner、产生者、caller、关联文档、SHA、保留/清理规则和当前有效性；JSON/机器证据按已冻结格式保留字段；可扩展载体使用 envelope，不可扩展的原生输出复用唯一 review，不改名、不删除原字段；在用户确认 registry、统计分母与 pilot 后任务才从 blocked/draft 进入 build，此前不批量改写正文。

## 方案

分类合同见下方「通用模板（保留 10 类）」与「Testing 专用模板（拟新增并注册）」两张表；绑定与迁移规则共 6 条；2026-10-15 起逐轮增量冻结节（机器证据变体、test-catalog 1.1.0、C1/C2、I/J、S23–S34）在同一 17 类框架内以自有版本变体承载新机器合同，不新增第 18 类模板。

## 边界与风险

结构通过不授语义/执行信用；每类 pilot 未过不得批量接入；变体合同以真实 model/progress consumer 与固定 Git 源为准，禁止联合换标、刷新 SHA 洗白或以 payload/散文化替代原对象；历史文档按 archive 规则保留原日期、结论与继任，不升格 current。

## 验收

每类至少一篇 pilot，记录原文语义保真、链接影响、机器字段回读和历史范围；迁移前后分别保存 source/after SHA；各增量节给出现实反例清单（envelope 覆盖原字段、performed 改 true、catalog 漂移、坏 UTF8/重复键、pointer 伪引、source/after 串轴、双 false 升真等）并由真实 consumer 拒绝，反例不过即 rework。

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

## 2026-10-16 C2：混合历史执行记录的机器变体提案

状态：proposed，待非作者设计复核后冻结。新增同类变体，不新增第18类；计划将test-machine-evidence升至1.3.0。现有default execution词表和document-audit-v2的performed=false保持原限制，不以修改旧JSON来通过模板。

一手反例是已全文读的 `docs/testing/e2e/evidence/e2e-006.json`：原kind=document-audit、status=rework、candidate=d02278dc、versions=22/11，但runtimeExecution.performed=true及三组10-04 raw引用也真实存在；findings另记后续源码/终点核验。现行1.2.0若强制此值false将破坏机器原字段。实际validateCanonicalEvidence只在kind=runtime-execution或runtime-backed claim时授予运行证据门，原006的source-backed claim不能因此晋升。

拟冻结 `historical-execution-publication-v2`：沿用原document-audit全部顶层必填字段和唯一catalog id/status配对，强制原performed=true，追加统一_governance及sourceGitRevision、currentAudit.runtimeExecutionPerformed=false。source SHA/Git blob/完整40位commit固定首次迁移前原JSON；currentAudit是本次文档审查，旧true只属原批次。不修改原candidate/versions/history/claims/artifacts/runtimeExecution，不变payload、不将旧source-backed改runtime-backed，也不新增旧产物存在/重放声明。

除一般字段/状态门，还必须由实际Git reader读取声明commit下同一路径，核其Git blob和SHA256；去除新增_governance后与原JSON逐字段deep-equal，且原source必须确为document-audit/performed=true、原来没有本治理envelope。缺源、错误commit/path/blob/hash、任何原键值变化、伪本次执行或错catalog都拒绝；仅把variant标签换掉不能放行。check-document-model与progress两入口都接真实Git reader；纯body结构检查不能独自签accept。

Pilot只选全文读的006 JSON；待实际consumer、严格原对象回读、来源/本次执行/原performed变造/旧false换标签/顶层字段搬移反例和非作者复核通过后，才能用于其他同类文档。既有13份machine迁移只更新模板版本声明/外部after SHA并保留原机器对象，不新增迁移数；未读JSON不批量套用。提案/pilot状态、失败、冻结版本与实际门在任务卡及专属回执记录。

006的stage/report另按现有test-e2e-stage1.0.0和test-run-report1.0.0迁移。保留rework、lastVerified、原reviewBy和原testing-meta（不为模板排版续期）；文档来源核读不是动态验收。旧state3、原船偏移/朝向与10-10源码state2、更晚连续卡固定批次done分别标日期/范围，不能拼成新同revision通过。此处只读连续卡顶部1–160行，不能认证整卡3510行或原ignored产物；当前发布rework与后继冻结批次的差异明确保留，未来核验依真实输入/来源决定。

### C2独立设计counter与补强（冻结前）

非作者指出，仅验证envelope自选commit中确有对象仍可借后来伪造的false→true提交通过。冻结来源必须在envelope外：模板registry顶层登记经独立核定的historicalSourcePins，以实际文档path唯一匹配；006首个pin固定commit `33cc2df50c7279d2750ddad4fcf6c373b7b2bda3`、同路径blob `a7148a1c5087e2fcef899cb79818560fc3dd7bc5`、SHA256 `9b6924236a790224ad4a3b3a305f15eaaa17e5acbd5b9e1876cd8e3c9272efbb`，并核与已冻结1838基线该项sourceSHA一致。真实reader只读取批准pin，不接受envelope提供的任意新源；envelope四项必须与pin相同。今后新增/变更pin必须先有逐篇独立来源核定和设计写回，不能从candidate JSON自动采纳，更不能改原false来申请此变体。

另一counter是progress完成数原来独立检查registry，但model的provenance校验仅覆盖routing；删除某篇routing可绕开新门。将提取统一逐篇验收函数，model和progress对每个待计完成的compliant registry条目都执行body、声明、catalog及批准pin/Git原对象验证；不因routing缺失而省源验证，且compliant registry必须在routing恰有一条相符记录。删除路由、只改variant/source元数据或制造后来提交都应作为真实反例拒绝。

C2设计冻结（2026-10-16）：非作者receipt_review独立核006原文、实际Git pin/固定基线、consumer与progress路径后agree，C2.1/C2.2设计counter已闭合。上述1.3.0合同冻结用于006 pilot；实现/反例/真实consumer和非作者pilot accept仍待，不据设计签字宣称迁移或动态通过。

### C2.3/C2.4 实现反例与准入收窄

非作者真实临时Git反例已证明：仅工作树baseline仍可与后来false→true提交、外部pin/envelope/review一起联合改写，实际progress曾exit0/计1；该结果保留为counter，原68绿不授予pilot接受。另reader把真实tree对象当commit接收，也不满足完整commit合同。

收窄C2的可信根为已独立核的1838源快照：`scripts/docs/frozen-document-source.mjs`固定baseline路径、commit33cc2df50c7279d2750ddad4fcf6c373b7b2bda3、blob00da11bb594126105abbb5ea596c7272ed8e5542及SHA256 1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5。该根不是从candidate/pin/工作树数据生成，变更必须另做独立来源/设计复核。C2各文档pin须同一已批准原始快照；当前baseline字节必须与冻结Git对象相同，条目源SHA从已核固定对象解析。新增非该快照文档不能自行改根或续pin来放行，需另立经独立核的范围修订。reader另以cat-file对象种类严格要求commit，tree/blob/tag均拒绝。

反例必须复现联合变造后的实际progress拒绝，以及真实tree/blob/annotated-tag拒绝；原false/默认execution门与所有原机器字段保持。中央conformity出现1.1.0/1.3.0双当前字段的元数据counter同步修正，旧值入history。以上仍待非作者实现/pilot复核，不能以设计或作者修复自签accept。

## 2026-10-16 I：历史lab-review机器合同1.4设计冻结

已全文核I14份496原行：13Markdown为两篇governance-index、十篇audit-report和一篇evidence-receipt，均叠加archive-record1.0；类型按逐篇结论/用途确定，不按目录授权。r10 JSON原九字段既不是schema2发布对象，也不是默认execution回执；现1.3三个合同实际均拒绝其原对象，不能补造id/status/runtimeExecution来过门。

Codex根与非作者history_cards_c_tail完整读取最终238行设计，独立设计agree（草案SHA256 `bae8b334330e0007863091ccf317c5e7a32a9481c9b9edbfc7b3453a02235f34`）。下列`test-machine-evidence-v1 / 1.4.0`同类新变体设计冻结用于单篇pilot，模板总数仍17；实际registry当前1.3须待既有14份版本滚动和新反例实现原子提交后切换，不把设计冻结当实施或I14完成。

```json
{
  "historical-review-payload-v1": {
    "format": "json",
    "requiredFields": [
      "candidate", "candidateBase", "reviewedMain", "verdict", "checks",
      "g01", "v01ActorName", "g06AuthorGuard", "g08DropOutput", "_governance"
    ],
    "requiredValues": {
      "_governance.lifecycle": "historical",
      "_governance.currentAudit.runtimeExecutionPerformed": false
    },
    "requiredGovernanceFields": ["sourceGitRevision", "lifecycle", "currentAudit"],
    "preservedSource": {
      "baseline": "docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json"
    }
  }
}
```

原九字段及全部嵌套payload原位保留，仅加_governance，去治理层须与批准固定Git源deep-equal。继承父requiredGovernanceFields；新变体不设catalog/statusPolicy，不把verdict当lifecycle。原counter、41/41、51账48/1/2、五针detected、warning1及独立drop-output `MISSED/1passed/0failed/exit0`均不能改成本轮成功；currentAudit只记本轮静态治理false。原006 publication真值、默认execution状态词、document-audit false及全部旧合同不放松。

外置source pin经根与非作者真实Git/baseline核定批准：路径`docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r10-evidence.json`，commit `33cc2df50c7279d2750ddad4fcf6c373b7b2bda3`，blob `3076a25a30f592eff4d357bcaae5cbb4b3c22b6e`，SHA256 `ec71ee07087918516d24094ad8b341e275191b3816897af44b904a62eeeda929`。与22ee/H852/根777d原JSON字节一致；固定1838 baseline身份、字节与006 pin不动。pin只是可变审批记录，可信根仍为frozen-document-source.mjs已独立冻结的33cc baseline，不能从候选自选源续pin。

### 设计反证、实际消费者与停止线

- 早期仅_governance的泛化内存方案确让006换标并联改mutable pin返回空issues；该counter保留。最终九键方案由根/贡献者/非作者分别核证：006只换标缺九键，补九键又因原对象deepEqual失败而拒绝；联改工作baseline被固定根拒绝。原r10加治理层正例通过；变counter/MISSED/exit/warning、包payload或本轮true均实际拒绝。这些只是设计可行性probe，不是实现或完整CLI验收。
- 完整消费者继续为checkMigratedDocument的body→publication→preservedSource→版本声明链，model和progress都传真实Git reader。九键与深等共同强制原source真实同形，无需requiredPinVariant、sourceRequiredFields、新allowlist或生产消费者分支；纯checkTemplateBody不独立证明来源保真。
- 新pilot必须实际走model/progress CLI及匹配route/review/after；联合换标签/pin/补字段/刷review、baseline漂移仍须exit1且不计完成。复用原C2后来提交/源pin/基线联合变造与tree/blob/tag拒绝，不能把helper绿替CLI。九键删改/额外字段、错版本/variant/生命周期/缺pin/错blob与本轮执行变造都要真实拒绝。
- 原生JSON的直接公开caller为r10报告；迁移清单/legacy manifest/classifier只保来源身份，未找到产品runner解析九字段；旧verify读取results.json及Vitest JSON，并不消费本JSON。cafac实际red-control五针不含drop-sprite，其judge要求exit1/精确执行/恰1业务AssertionError/见证/非timeout/源hash不变；不能用五针detected关闭独立exit0漏检。
- 不新建catalog条目，不续reviewBy/lastVerified，不改产品、旧测试或coverage，不运行旧反控/浏览器/raw；临时日志/截图当前可用性未验保持unknown。其它JSON形状或新pin须另逐篇来源核定及设计准入。

### 父版本滚动与已有文档联动

1.4实施时仅给已接收14份机器对象的_governance.templateVersion升版：13份document-audit-v2（e2e001、active-scene、battle-host、battle-session-owners、world-runtime、command-form-families、map-workspace-sessions、dependency-ownership、menu-session、e2e-contract、e2e-route、e2e-common-issues、legacy-flat-audit）和006历史publication。三中央review为20261015-protocol-and-e2e-pilot-batch、20261015-domain-pairs-and-archive-cards、20261016-historical-execution-pilot；registry与review当前templateVersion、conformity所有实际存在的version/templateVersion、after/revision/evidence同步，原完整当前记录留prior/history。七篇conformity双版本字段必须同时改，其余不补造字段；006旧1.3 pilot method留历史、当前说明仅父版本对齐。原14route没有版本，不为升版改variant。

十四份归一_governance.templateVersion后必须逐篇对象深等，原native字段/状态/版本/日期/执行/history/source SHA/pins不变；source-backed不变runtime-backed。默认机器模板示例仅同声明升1.4，原三个变体配置对象不变。版本滚动不新增迁移数，不刷新冻结作者回执、旧review历史或baseline。修改已接收模板入口说明则同提交维护其review各当前字段与after，不只刷SHA；未改正文不刷新。

实施Owner为根Codex，非作者独立复核后才接收；I13Markdown可在现有1.0合同下隔离推进，I r10 JSON须等根1.4原子配置/旧14保真/实际工具反例门稳定后才能实施。I14实际源清单、逐篇大纲与白名单见任务卡；任何未核前提保持draft/待验，不因设计agree宣布完成。


## 2026-10-16 J：三种历史集成机器对象1.5设计冻结

I14在根`8aa698c4038bc6553a1a524ca83508cb16e06a32`已获独立接收并稳定，machine现为1.4，实际已接收机器对象15份。Codex根与history_cards_c_tail各自全文读取三MD134行/三JSON1436行及最终223行设计，固定提案SHA256 `f7c2502460941b1d1e2c96d143671dda0c5778751f72b0d301ec9be3848e3278`；独立design agree。现冻结1.5设计供下一次原子实施，不把本节当已切registry、pilot通过或J6完成。类型仍17。

三个原生对象15/10/22键互不兼容，不能用现1.4或gov-only通配。沿用共同治理字段，三个变体均新增sourceGitRevision/lifecycle/currentAudit，固定historical/本轮执行false，完整原生对象去_governance与批准Git源深等。旧native的status/verdict不是新catalog发布状态，不改原runtime/visual值，不补造schema/id/Owner。以下是冻结精确合同：

```json
{
  "historical-continuation-integration-v1": {
    "format": "json",
    "requiredFields": [
      "schemaVersion",
      "status",
      "owner",
      "candidate",
      "protectedBase",
      "validatedImplementation",
      "queues",
      "priorCompleted",
      "logDirectory",
      "gates",
      "coverage",
      "negativeControls",
      "unchanged",
      "notClaimed",
      "remoteCi",
      "_governance"
    ],
    "requiredValues": {
      "schemaVersion": 1,
      "status": "accepted; all local integration gates passed",
      "negativeControls.scope": "previous per-slice evidence, not rerun during integration",
      "_governance.lifecycle": "historical",
      "_governance.currentAudit.runtimeExecutionPerformed": false
    },
    "requiredGovernanceFields": [
      "sourceGitRevision",
      "lifecycle",
      "currentAudit"
    ],
    "preservedSource": {
      "baseline": "docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json"
    }
  },
  "historical-intake-completion-v1": {
    "format": "json",
    "requiredFields": [
      "schemaVersion",
      "date",
      "integrationBase",
      "cursor",
      "glm",
      "unifiedGates",
      "baseline",
      "visual",
      "followups",
      "activeSceneArchitectureWipIncluded",
      "_governance"
    ],
    "requiredValues": {
      "schemaVersion": 1,
      "date": "2026-09-26",
      "activeSceneArchitectureWipIncluded": false,
      "unifiedGates.fullOrQ1Q2": false,
      "visual.userProjectSavesWritten": false,
      "_governance.lifecycle": "historical",
      "_governance.currentAudit.runtimeExecutionPerformed": false
    },
    "requiredGovernanceFields": [
      "sourceGitRevision",
      "lifecycle",
      "currentAudit"
    ],
    "preservedSource": {
      "baseline": "docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json"
    }
  },
  "historical-command-integration-v1": {
    "format": "json",
    "requiredFields": [
      "task",
      "candidate",
      "productHead",
      "integration",
      "protectedBase",
      "owner",
      "reviewer",
      "verdict",
      "closedCounters",
      "counts",
      "total",
      "baselineHash",
      "addedSources",
      "selfTests",
      "cases",
      "mechanical",
      "quality",
      "scope",
      "visual",
      "logs",
      "limits",
      "retirement",
      "_governance"
    ],
    "requiredValues": {
      "task": "ARCH-F2-CURSOR-BATCH-2",
      "verdict": "accept",
      "scope.glmCandidateIncluded": false,
      "scope.allCoverageMetricsUnchanged": true,
      "visual.userProjectWrites": false,
      "_governance.lifecycle": "historical",
      "_governance.currentAudit.runtimeExecutionPerformed": false
    },
    "requiredGovernanceFields": [
      "sourceGitRevision",
      "lifecycle",
      "currentAudit"
    ],
    "preservedSource": {
      "baseline": "docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json"
    }
  }
}
```

批准来源pin（只为可变批准元数据；独立根仍是固定33cc baseline/Git对象，不变造pin.variant为信任根）：

```json
[
  {
    "path": "docs/testing/archive/legacy/editor/testing-records/architecture-continuation-integration-evidence.json",
    "revision": "33cc2df50c7279d2750ddad4fcf6c373b7b2bda3",
    "gitObject": "0e5c545af1e4d35473a08e2d0f7b3700b6474424",
    "sha256": "4e73a5539ade6f74c76bef4b3b5894e0c58fa006917398a23dfae91425bd9c6b"
  },
  {
    "path": "docs/testing/archive/legacy/editor/testing-records/architecture-intake-completion-evidence.json",
    "revision": "33cc2df50c7279d2750ddad4fcf6c373b7b2bda3",
    "gitObject": "a4dcfe27ab3411decb9ca21e160b76d153926e5e",
    "sha256": "8e040347d21b62aecf0df5a3712309db5921b942231ac174ed3dc46d06ff521d"
  },
  {
    "path": "docs/testing/archive/legacy/editor/editor-workflows/cursor-commands-wave2-integration-evidence.json",
    "revision": "33cc2df50c7279d2750ddad4fcf6c373b7b2bda3",
    "gitObject": "3f718327c8df97612b000b74a362066fd650c8aa",
    "sha256": "91e0c266038e29b12641528b0fccf24f19fa3b7e447e7242198ed3ec3f483b2c"
  }
]
```

根独立真实Git consumer内存3正控/47删原生键/6交叉shape与15旧声明投影均按预期；非作者另核006联合换标/自有pin/补齐全部字段仍由固定源深等拒绝。此为设计探针，不代替实施后model/progress CLI、真实canonical pilot与独立接受。强反证是原生改值或完整006联合换标获计完成；出现则停线修设计，不降低旧门。

一次1.5原子滚动15份已接收machine和默认示例声明，逐篇只改治理templateVersion并同步registry/各review当前所有版本字段/after及完整prior；原生字段/日期/源pin/历史版本/旧变体配置/固定baseline/consumer逻辑保持。新增三JSON须在J0稳定后各自pilot、来源/合法输入/oracle/排重/原始失败与未证项逐篇独立验收，不因登记新变体接收任意同形JSON。完整15路径/固定来源与准入见任务卡；所有产品/旧测/coverage/raw/browser仍禁执行或改写。

历史109针不算本次重跑，9573check与9081/728coverage分母不同；Cursor24/32modules与GLM42candidate/41formal/75ledger、共享8707/strict8215/686排重；wave2新增16测试未新增四维covered，原62/53/55warning及6info、旧CI/zoom/B1/E1缺口保留。wave2旧storedSHA对应4548a895之前仅工具href版本，当前source是该href修复后33cc字节，不刷新旧migration账来伪造无漂移。

## 2026-10-21 S23：历史文档迁移与清理回执原生合同草案

状态：2026-10-21经用户续办授权与Owner核定，frozen-for-pilot，仅准[DOC-IA-2三件JSON](../../ops/archive/evidence/DOC-IA-2/README.md)与必要消费者实施；不授批量build或新增迁移信用。Owner Codex。它们属于历史证据回执，不能为了套用执行字段改称测试执行，也不新增第18类模板。三个迁移前原生对象均与33cc冻结原件字节相同；来源保全与旧执行结论认证分开。

| 拟格式 | 原生字段职责 | 状态、证据与边界 |
|---|---|---|
| evidence-receipt / historical-document-relocation | relocation的baseline/purpose/directories/419条entries，以及additional-attachments的purpose/directories/2条entries；逐项from/to/kind/sha256保持，baseline为可选原生字段而非补造字段。 | historical只在治理轴声明；kind是角色，目录前缀不覆盖显式逐项映射。两张中间计划附件随后退役，不把目标当前缺失判为迁移失败。 |
| evidence-receipt / historical-document-preservation | preservation-report的原baseline、完成卡入口、计数、normalization、历史摘要SHA、retiredArtifacts和failures。 | 9恢复锚可核Git字节，419/261/134/89/9/24不可当互斥分区相加；历史failures和布尔值保持，不能改成当前验证结果。 |

目的与大纲沿用evidence-receipt五项：证据身份、来源与输入、断言与oracle、结果、限制与复核，以JSON字段职责和简短`_governance.currentAudit`承载实际内容；不复制原entries、旧回执或完整清单到envelope，不移到payload、不为三篇各造sidecar。source/after分别在既有review中维护；envelope不自嵌after hash。当前字段审查与旧历史结论不得写成同一状态；旧执行在本轮没有重跑。

来源复核发现：当前419个from中398个直接在04fb975e基点匹配；6a653f97d把19个工具路径加了tools层，沿2871f721b所存原路径回查可再匹配19项。另一个同提交改写的看板路径，原SHA `4b04ef0740b5…`与04fb的原看板SHA `184bc4acf5bc…`仍不同；DOC-IA-2自身任务SHA `d9d1ae6b46c3…`在04fb不存在，已核6次路径历史提交的5种整文件SHA也未命中。故已证417/419；两项保留未知，不能将路径解释冒充SHA全过，不能改写原JSON或声称全历史不存在。9张退役图全部恢复匹配，2张对话图的计划去向与最终退役关系由原卡“用户追加清理”明确说明。

当前实际使用者是DOC-IA-2历史卡与目录导航，代码检索未发现读取这三件JSON并执行搬迁的活跃producer/consumer；这项检索不等于全仓无消费者证明。原JSON是已提交的历史执行输入/回执，治理检查器不能补造当时的生成程序或执行命令。原`relocation.baseline`表示旧业务来源，33cc固定原件表示本轮保全根，二者不可混用。

冻结口径：多格式选择按变体format，变体templateVersion独立于父模板默认版本；无自有版本的旧变体仍继承父版本，旧合同零改动。两个新不可变标识为historical-document-relocation-v1、historical-document-preservation-v1，自有版本均1.0.0；evidence-receipt默认Markdown及其1.0.0不滚动。新增requiredFields/requiredValues、固定源保全与下述精确治理字段共同约束，不以artifactOnly绕过。

新增_governance仅含templateId/templateVersion/variant/lifecycle/lastReviewed/owner/sourceGitRevision/sourceGitObject/sourceSha256/reviewRecord/currentAudit/stopLine/nextStep。lifecycle固定historical，reviewRecord复用r37；currentAudit含identity/sourceAndInputs/oracle/result/limits五项具体内容，runtimeExecutionPerformed与historicClaimsReexecuted均固定false，unverifiedClaims显式指向未证条目。三个原生对象不复制；after只留既有review。

来源身份直接复用已冻结1838绑定的sourceSha256与固定33cc路径，Git对象由真实reader取得；不再追加三条historicalSourcePins，既有pin列表原样。首轮实施曾重复追加三pin，完整回归被旧固定源合同拦截；已删除重复项并改为单一来源，没有修改该旧测试或降低校验。

两项来源现已查遍四个原/归档路径在所有可达分支中的1244种blob（13,045,507B），声明SHA均未命中。仅能确定不是已核基点原件、缺少可认证before-image；“未提交时点捕获”仍是可能解释，不当作事实。禁止声称全仓/不可达对象中不存在。合同把relocation第1/58项固定为unverified，另外两件无这两项，不能删除未知或写成419/419已证。此限制阻止重授旧来源信用，不阻止对已固定33cc载体做无损pilot；全量硬验收与迁移接受仍独立，三篇先保持needs-migration。

pilot要求与停止线：先各做一个固定源原生正控，移除唯一新增治理元数据后所有原生字段和值与固定Git原件深等；真实model/progress入口须拒绝改原字段、换source、挪payload、换标为默认合同、伪造本轮执行、把旧失败抹零。按已核历史原文解释419/2/9各自职责，source归属不明的两项显式unknown；来源缺口不能被schema绿清除。受影响迁移不得借旧artifactOnly跳过正文合同或增加完成数，未通过pilot不得批量迁移余下JSON。

2026-10-21 S24证据验收更新：GLM以nonAuthorReviewer=true接受4d39c2f4c三篇pilot，零counter；Owner据此确认两种1.0.0变体可作为同类历史回执的复用基础，详见[父卡S24](../../ops/tasks/DOCS-FULL-TEMPLATE-1.md#s24-glm非作者证据接受与owner接入2026-10-21)。固定三篇实施范围与来源限制仍有效，新增路径/来源/consumer须另卡准入；三篇needs-migration及全量待办不变，本次接受不授批量build、全文重审或旧执行信用。

## 2026-10-21 S25：原生Vitest历史输出合同

状态：Owner按用户续办授权冻结供三篇pilot；test-machine-evidence-v1增加自有1.0.0变体historical-vitest-native-v1，父1.5.0、原六变体和17类总数不变。不是schema2发布对象，不补造id/status/execution或catalog条目。原始工具输出字节不改；治理五项内容由现有唯一reviewRecord条目的身份/primarySource/legalInputs、businessOracle、coreConclusion、unresolved/stopLine承载，不新增每篇JSON/Markdown伴生件。

准入仅TEST-EDITOR-ALCHEMY-BOUNDARIES-1的adjacent.json（37绿/8文件）、directed.json（31绿/6文件）、counterproof-runs/N-B4-missing-reference-dedup.json（31中30绿1红/6文件）。固定路径、变体与r85唯一条目由guard约束，来源直接复用33cc与1838绑定；原执行相位分别为adjacent-green/directed-green/counterexample-red。不可换标、换来源或刷新after hash绕过。新路径/形状须另卡逐篇来源与consumer准入，不由本设计自动接收302份。

原生大纲为13个顶层字段：四个suite计数、五个test计数、snapshot/startTime/success/testResults。testResults保留原绝对文件名、时间、suite状态/message、每条fullName/ancestorTitles/title/status/duration/failureMessages/meta/tags，全部逐字节保全。suite统计含describe层级，不强行等于文件数；测试明细按状态与numTotal/Passed/Failed/Pending/Todo核实，红结果是保留的历史观察而不是治理失败。

真实caller为历史卡/证据README及现有治理model/progress；JSON不单独证明真实exit/signal/警告或有效反控，必须回其gates/counterproof/raw。旧8条act warning与B5/B10后继撤回、B7补强须在三行限制中显式保留，本轮不复跑或重授当年测试质量。review中evidence.currentAudit双false、historical有效期与精确相位强制；旧来源/字节与有内容的治理字段共同满足结构检查，不能只放一条SHA登记。

反例：任何字节变化（含格式化）、追加_governance、换payload、joint换标、改baseline/source、删除唯一review或五项语义、相位错配/伪本轮执行均拒绝。使用严格UTF8/重复key parser；model与progress都必须走真实Git源与同一guard。仅正反例通过不授content-reviewed/template-compliant，三篇先保持pending，非作者接受另记。原生不重写是证据格式要求，不放宽全量审阅或1838处置合同。

2026-10-21非作者证据接收：GLM以nonAuthorReviewer=true接受24b93ab8f三件，零counter；Owner确认本变体可作后续同类原生回执的准入基础。三件仍partial-review-unknown/needs-migration，当前实施继续仅三路径，来源/相位/双false、原父与六变体/sourcePins不变；新增范围、迁移信用或批量实施另行准入，不由相同JSON形状继承接受。实际读域与命令、未跑及Owner裁定归[父卡S25](../../ops/tasks/DOCS-FULL-TEMPLATE-1.md#s25-glm非作者证据接受与owner接入2026-10-21)和既有r85，不增独立账本。

## 2026-10-23 S29：历史原生Vitest准入269与中央接入

S25三篇pilot及其当时pending口径保留；用户已明确批准S29独立范围，当前新增准入以`scripts/docs/historical-vitest-cohort.mjs`冻结的269个path/source/phase/review/index tuple为准，另302原生保护全集含旧三pilot与30例外。historical-vitest-native-v1仍自有1.0.0，父1.5.0/原六变体/sourcePins不动。GLM已接受Codex259d通用实现与受控writer，另由Owner对已接受S26/S29内容及独立勘误作逐篇有限新裁定；代码accept不单独授语义。治理字段仍在原8个唯一review，原生无envelope/sidecar/payload改写。

本轮正式接入269篇，routing/registry按真实合同同步，完整失败/pending身份、真实pointer/context与双false由model/progress验证。旧R波撤信保留在history，新content-reviewed/template-compliant只表示这次历史文档审阅与迁移，不恢复原测试/反控/产品结论；3旧pilot及23来源/7格式例外不计本轮新增信用。当前generation替换仍storage/1.0.0、512KiB、锁/恢复/读回/显式退役，发布结果另交未参与者；全量严格待办未过，不合main、不推送、不标done。


S30 design below binds the d9a3a0a0a7c45fc75f922ae3dffd13a68ca29a5e source snapshot. Byte counts describe that admission snapshot; later administrative pins are separate deltas and the next publication input must be freshly frozen.

### S30 历史文档交付回执原生合同设计 1.0.0（2026-10-23）

状态：逻辑设计冻结，供后续实施；未注册生产变体、未实施validator/pilot/writer、未接入212篇，信用0。Owner Codex；协议document-delivery-acceptance/1.0.0。复用DOCS-NATIVE-JSON-1和既有单份证据日志，不新建任务卡/sidecar/原件副本。

**类型与职责。** 继续使用17类中的evidence-receipt，父evidence-receipt-v1及已有两JSON变体均不改版。拟新增一个json-native变体historical-document-delivery-native-v1，自有1.0.0；以逐篇冻结的historicalRole区分author-contribution-ledger、readonly-review-verdict、candidate-acceptance-verdict。实际内容纠正后的分布为72/69/71。不以counters存在、entries/documents名称、文件路径或历史verdict判角色；不能把三角色分别重复计成新docType。必要时按明确语义证据修订准入元组，不由可变draft自证期望角色。

**来源与唯一正文。** 精确212准入路径/当前原生SHA/role/现行review/index由固定d9a3a0a0a7c45fc75f922ae3dffd13a68ca29a5e逐项绑定。这个revision证明当前载体，不认证2026-10-17执行来源。原生字节、原始日期/verdict/错误/纠错块/命令摘要均不改，无_governance/payload/逐篇sidecar；治理正文复用原4个review的唯一行。原sourceSha256与当前after不同的70件须分轴保留，不能刷新旧source或把after当source认证。

**必填治理内容。** 在既有review行中表达本篇身份/实际角色与历史范围、来源与合法治理输入、可证伪内容oracle、具体原始结果/计数/矛盾、限制/停止线/下一步；另含nativeWitnesses和必要contextReferences、真实readDomain、retention。documents/entries的path/source字段与after/pass/result/quoteInverse等观察分列；后者不作合法产品输入。historical candidate、当前载体提交、本次治理提交分别记录，不伪造candidateHead。缺失历史nonAuthorReviewer不当false，本轮作者false和独立裁定另轴。

**见证与内容门。** 严格UTF-8/重复键拒绝、固定Git原生字节、准入identity/role/review绑定、RFC6901 pointer与parsed-string或JSON.stringify逐字表示、上下文Git SHA/行域/quote须由真实model/progress共同检查。counting/success/verdict不能替代语义接受；普通原生JSON合法或哈希相等不能单独计迁移。原件不存在的字段明确未声明，不把生成器undefined写入事实。采用公开consumer注入的readBuffer/reviewReader，禁止将合法物化逻辑对象重新伪装为超限flat或联合换标绕门。

**历史信用。** R23–R36按canonical152逐path求交，不按批号整批撤信；R22/R30交集0。六复制counter、R65摘要手改、R88–R91不可核旧中间树、68已纠HEAD与2未锚定、R53 policy20但实列16等原始矛盾保留。历史accept不变成当前通过；runtimeExecutionPerformed/historicClaimsReexecuted固定false。当前212仍partial-review-unknown/needs-migration；Owner日后只能依据新充分证据和非作者接受逐篇晋升，不恢复旧deep-semantic/独立/执行信用。

**保留与精简。** 当前212暂retain-native：现行after pin和仍在使用的历史/纠错引用尚需安全退出方案。真实33–41个basename引用文件包括大量派生raw副本，不等于同数独立consumer。R22/R24/R89的完整source/after元组有重复，不证明完整对象可替代，亦推翻“唯一逐篇账/全部无替代”的通用断言。永久必要性和完整替代性未证实；后续可评估归并/归档，须保全独有错误/纠错字段、明确原件去向/引用迁移/真实consumer复验，不要求先无任何引用才可精简。本次不删移、不新增归档副本。

**pilot与反例。** 至少覆盖三实际角色，以及R23特殊接受形状、R28对象counter、R53 policy数量矛盾、68纠锚中的一件、R92/93未锚定中的一件、R65和R88–R91隔离边界。可用少量组合pilot覆盖，不堆同构测试。真consumer反例须拒：未准入路径/换role或联合换标、更新原生字节并刷新SHA洗白、坏UTF8/重复键、错pointer/上下文行、将旧source替换after、遗漏canonical撤信、历史缺字段伪false、documents结果冒充输入、双false改true。pilot内容与实现非作者接受前不得批接同类。

**存储与中央发布停止线。** 当前4个flat review共有275条，其中212目标、63完整只读；大小分别842689/522392/862049/373367B，涉及R94这一现行控制根。现有S28冻结8源及S29 Vitest269 writer不能通过改常数或直接扩白名单冒充本组准入。先核4源全部direct reader/writer、R94控制依赖/字节pin DAG、格式化后实际容量和全部外部保护输入，再由Owner冻结发布组与恢复策略。可复用已验证的loader/packing/IO原语，不能假定本组仍是原8源19片。超限须有界分片，不提高maxSize或压缩语义救急。原275条逻辑顺序/历史、63非目标、所有旧source pin与既有S29发布结果保持；新generation/旧片显式退出/锁-staging-读回-幂等及consumer证明另验。

因此本轮仅接受经有界勘误的内容输入和暂保留方向，冻结上述逻辑合同设计；中央接入仍blocked于真实实现、pilot与新4源发布前提，不新增已迁移/已审计完成数。当前仍1420/1838迁移、3retired、87incremental；927篇/1848严格诊断未过，父卡rework，不合main、不推送、不标done。旧文档测试若实际必改仍需具体最小补丁授权，不由本设计自动扩权。

### S32 四源存储通用实现准入 1.0.0

Owner/作者Codex；复用DOCS-NATIVE-JSON-1及父卡，build allowed仅隔离通用实现和自有临时树演练。S31映射与Owner勘误是输入，S30原生逻辑设计保持；本节没有批准真实四源发布、212语义迁移或main。生产变体/内容pilot另验，先存储后语义。

#### 封闭发布组

沿用review-record-storage/1.0.0精确manifest/descriptor/shard/source schema、positions、512KiB和全inventory规则；不改父合同、原8源常数、formatter maxSize或忽略规则。四逻辑源固定R89/R90/R91/R94，五before源再含flat R92。实现准入重新实取当时完整Git revision和每个普通100644 blob/OID/SHA；不能拿S31 c2旧字节替代已更新的R94。275行/212目标/63非目标的身份顺序、原源pin、历史和语义字段保持；纯存储仅变R92三条current-after与R94[6]，明确区分原source与current-after。

复用packing/IO原语，新增四源prepare/inspect/publish边界；不复制S28 writer或去掉原有校验。源选择全集、before-pin、format后strict JSON/键序/深等价、普通目录和全物理目录快照先验证。锁内重核所有13逻辑对象及其物理输入；不可变generation、独立staging重载、未明目录拒绝、失败保留lock/staging/恢复材料、写后整组读回，再释放锁。先format三源并取SHA→R92三pin并format→R94[6]并pack，R94控制根最后发布。S29的8 manifest/23片、599逻辑行和302原生逐字节保护；初迁移无旧片删除。R94之后任何中央更新必须物化/repack同锁走控制链，不准把manifest套旧flat修补器。

#### 先行兼容策略

明确选择**冻结旧one-shot写入域**：S28原8源writer和S29原8+2语义prepare/旧plan inspect不扩成新四源writer，原固定Git夹具行为保持。新增分片owner进入时，旧写入口必须在任何写入/格式化副作用前给出明确不支持当前组的拒绝，不靠偶然flat异常；禁止仅把10改13或删除owner全集检查。现有fail-before-write基础直接复用，不新增重复守卫。

S28迁移CLI的已发布只读检查须用物化R94，不裸parse entries；仍按原固定S28逻辑断言，当前已由S29改变的内容可明确拒绝，不能冒称当前S28重发布通过。S29旧--plan写路径同样不得在新四源组上静默改写；当前已发布269文档的合法性由现行native合同/model/progress和新增当前组inspect验证，不为重启旧一次性发布去刷新历史plan。

新增inspect用公开生产loader真实读取13逻辑对象/12manifest/完整片集与四控制边，并对S29保护对象/302原生按当次冻结指纹复核；不能以回传计数代替完整逻辑和字节双等。未知额外owner仍拒绝，不能白名单通配。上述兼容代码和组inspect须先于/随同新publisher通过验收，真实发布另作受控动作。

#### 实现范围与验证

仅scripts/docs的新四源边界模块/显式CLI/少量新定向测试及必要旧迁移CLI、旧semantic入口的拒绝/只读适配；优先组合现有packing/IO/loader。无顶层写入、无/tmp硬依赖。先交具体代码diff与逐文件八维/真实caller/反例；未参与者据证独立验收后才裁定发布。旧测试本轮只运行不修改；若确需适配，先备好最小具体补丁按用户既有规则另取授权。

新测试少而精，覆盖真实公开入口：完整13对象/275行/保护599行+302原生/四边演练与幂等；R94[6]错before或split/repack顺序错误首写前拒；额外owner/未知generation/丢片/并发修改拒与失败保留现场；当前组可读、旧写入口不越界。复用原schema/UTF8/重复键/位置/路径/锁反例，不堆同构新针。实际跑相关新旧文档工具测试与正式完整docs-tools、nav/model/testing/phase-lore/非strict review/progress/lint/diff；strict原1848待办须仍精确归因，不改诊断。未跑产品/旧产品测试/E2E/coverage。

交付只在原单份证据日志追加必要真实回执/方案差异，不新建canonical卡/台账、逐篇sidecar或完整275原件副本。每条命令绑定真实候选/输入指纹/起止/exit/signal/完整输出；失败不覆盖。实现作者自验不能代替非作者接受，未过硬门不合main、不推送、不标done。下一步由Codex实施通用边界，GLM可在实际候选交付后承担未参与者只读复验，无需用户逐批转派实现。

### S33 历史交付回执原生合同与六 pilot 冻结 1.0.0（2026-10-24）

S32四源存储及最终封存已接受；本节将S30逻辑设计落实为生产校验合同候选，不授212语义或迁移信用。仍为17类，evidence-receipt-v1父合同及两个既有JSON变体均1.0.0不变；新增historical-document-delivery-native-v1自有1.0.0、format=json-native、metadataLocation=existing-current-review，原生字节零写入、零逐篇sidecar。三实际角色以historicalRole表达，不分别新增模板类型。

目的和必填内容仍对应五节：证据身份（实际角色/历史范围/载体与原source分轴）；来源与输入（固定Git原生、唯一review位置、明确治理输入）；断言与业务oracle（本回执历史内容可证伪、非执行认证）；结果（本篇具体结论、原字段pointer见证、矛盾与撤信）；限制与复核（实际读域、暂保留/退出条件、stopLine和nextStep）。治理说明在已有review唯一行，字段/evidence映射由生产guard共用于model和progress，不用artifactOnly跳过正文。

先冻结六个pilot：R23接受、R28只读、R53作者、R65接受、R89接受、R92接受。它们组合覆盖三角色、9/22条canonical交集、对象counter、policy20与实列16、已纠候选头、手改摘要、四批旧执行隔离和未锚定候选。准入模块逐件固定d9载体raw SHA/blob、历史source SHA/revision、review/index、实际role、必要见证及结构化历史边界指纹；只限六篇，212扩展须另行准入，不因同名变体自动接收其它路径。d9只证载体，不能套33cc或把70件不同的历史source刷新为当前after。

必填字段：owner/coreConclusion/readMethod/reviewedLines/truthAnchors/primarySource、两类显式legalInputs、historicalOnly内容oracle、historicalRole、historical状态、模板身份、stopLine/nextStep；evidence中保留nativeWitnesses/contextReferences/readDomain/fieldRoles/retention/historicalBoundary。legalInputs只允许固定native-carrier及historical-context，不接收documents的结果/pass/after等观察。runtimeExecutionPerformed/historicClaimsReexecuted=false、creditGranted=0；历史nonAuthorReviewer缺失仍declared=false/value=null，不冒充作者false或当前独立审。历史边界摘要使用canonicalTerminalJson（JSON token排序、UTF8、尾LF）SHA256，源事实由原生字段及固定integrity-audit解释，可独立复算；指纹本身不证明语义接受。

见证按RFC6901解析，只允许parsed-string或JSON.stringify后的非空逐字子串，不trim/删LF/codec；原接受稿的缩略quote仍为子串语义，不声称全字段相等。pilot将context统一指向同一d9 integrity-audit JSON及实际行域/quote，替代草稿MD引用作为机器合同锚；这是Owner显式上下文归一，不改原稿或谎称字段零变。真实Git JSON reader、固定源SHA及line/quote同时检查，未扩大旧JSON-only读取器的输入域。

状态/历史规则：本轮真实routing和212 review状态零改；六pilot说明仅在owned临时review演练。coreConclusion复用已非作者接受的有限勘误内容，不重写为通用元数据，不恢复旧deep-semantic/full-read/独立/执行资格。实际读域仍是程序解析和关键字段定向核读，下游正文/旧raw未重审；永久保留必要性未知，retain-native只是暂保留。实现与pilot待未参与者验收后，再实现当前generation受控语义writer并裁定212接入；不以合同注册、哈希相等或结构绿单独授迁移。

八项反例族为：路径/角色/合同联合换标；原生改字节并刷新SHA；UTF8/重复键；pointer/上下文伪引；source/after串轴；撤信或历史缺字段洗白；结果冒充输入；双false升真。定向测试触达公开model与progress，原Vitest和旧JSON变体保留原门；新格式不要求旧Markdown滚动版本，不修改旧测试断言/source pin或降低配置。全量严格1848项仍未清零，不合main、不推送、不标父子卡done。

### S34 精确准入扩展与当前 generation writer 1.0.0（2026-10-24）

S33合同与六pilot（含C1来源轴修正）已非作者接受。S34仍用historical-document-delivery-native-v1/1.0.0，不新建类型或变体；精确扩到212路径、角色72/69/71与唯一既有review位置。紧凑准入元组固定当前d9 SHA/OID、独立历史SHA/实际revision/OID、角色、位置、历史边界摘要和按实际原生字段选取的必要见证；不复制完整正文或为每篇新增sidecar。

历史来源212逐项Git解析：203直接等旧声明，9旧revision路径不存在，全部找到等旧SHA的实际原件（8件1fb3602fe、1件fd33caa0b）。候选只改历史指针并留旧值，不刷新sourceSha、不混同载体/历史执行/candidateHead。公共guard延续原字节/角色/输入/oracle/历史边界限制，实际writer在prepare再核全部212历史Git源。

新writer限定四个现行分片owner中的212目标、R92[20–22]三边和R94[6]一边，其他2218条逻辑行不动；四owner原source pin与旧八源/599及302原生保持。复用packing/IO，R89/90/91先pack、R92格式化后更新R94[6]、R94根最后；新片不可变，锁/staging全组公开loader读回、原子rename组与明确旧片退出，失败保留恢复材料，重复执行须完整源/终态重建而非只看存在。

本实施轮仅零信用正文候选与临时树演练；validator明确拒绝修改review/迁移状态，不把来源/存储结构绿等同逐篇接受。真实中央212内容接入与逐篇信用裁定另行受控，不放宽旧writer准入、不改旧测试/产品/coverage/规则/配置。1848待办与真实routing/registry保持。

## 2026-10-25 S44 原生剩余652件的分族设计排期（draft，非合同冻结）

S42作者417个needs-design低估了准入缺口：197个Testing路径不在旧Vitest精确cohort、38个C02整对象回流成旧archive绑定。Owner只修准入声明，不扩旧guard。剩余652=637 JSON+15 HTML，另3件DOC-IA-2复用S24、28件MD走已有合同。以下集合来自固定83743275的683清单和真实payload形状，数量是排期/设计输入，不是内容接受或迁移完成；源变化只失效相应claim。

| 次序/族 | 份数 | 现有事实权与拟合同边界 | pilot与前置 |
|---|---:|---|---|
| 先行：现有S24/MD | 3+28 | S24三固定原生对象复用已有两变体；MD先修正文与当前路由，不新增类型 | additional-attachments真实relocation绑定；两来源仍unverified。MD12前缀与6个retain适配分开验 |
| A：结果载体 | 41 | 复用test-machine-evidence父类；raw reporter、蒸馏文件级、简式totals按实际字段分变体，不假设缺pending=0，不把suite当文件 | 选红、全绿、pending、蒸馏各代表；固定Git载体与历史执行来源分轴，旧路径不自动扩准入 |
| B：命令/反控 | 49+30 | evidence-receipt父类；argv/cwd/exit/signal/stdout身份与业务断言分开；红相位核预期失败集合而非一律恰一 | 选真实红、hook异常、四失败集、已撤信历史回执；不修改旧数字、不复活旧accept。新source/caller有歧义仅停对应项 |
| C：治理控制 | 111+16 | 111逻辑review经公开loader读取，16项catalog/registry/routing/matrix等按各自schema与reader；未来governance-index的json-native变体复用唯一review，不造review的review | flat/manifest/shard与原source pin/positions/DAG读回，公开consumer及锁/世代/容量反例；只验载体/治理职责，不给所含599/275条旧claim自动语义信用 |
| D：数组/映射 | 28 | 原生顶层数组或映射保形，不包payload；逐项身份/顺序/重复/路径与调用者可证伪 | 身份数组、突变定义、路径清单三类pilot；七重复别名退役另有合同，不以SHA相同就静默删 |
| E：HTML | 3+12 | 3静态设计mockup与12脚本装载宿主分别建html-native候选，优先复用现有review说明、不注入第二份文档 | 原DOM/脚本/资源/本地引用保全；原生解析可核不等于浏览器/视觉/产品验收；mockup不冒充测试报告 |
| F：混合payload待语义划分 | 362 | 当前只按剩余shape排期，不能冻结万能JSON/通用archive合同；作者补具体目的、原子结论、caller/source/历史后再归入A–D或提出最小新变体 | 不用路径/字段数量猜目的；未知source或oracle保持blocked，不生成一文一模板 |

A–F精确合计652；所有父类型仍17类，旧父版本/历史source pin与已接受cohort保持。拟格式/变体在真实consumer/pilot及新反例接受前均draft，不新增ignore/maxSize、宽泛any-object或状态豁免。Writer复用现有source snapshot/lock/staging/不可变世代/原子组/公开读回守卫；新准入只改限定字段，原生bytes保持。旧测试若实际必改，先给具体最小补丁按既有授权流程，不能默认扩大许可。

治理控制与通用合同/pilot由Codex负责；GLM继续384非控制语义与六个MD适配，一次集中回交。当前集合已有可靠事实直接复用，四指针轴/历史撤信不从头重做。通用合同冻结、内容接受、模板符合、中央发布及待办扣减分别记账；无执行/迁移信用，不合main、不推送、不done。


## 2026-10-25 S45 补足接收与原生 pilot 顺序（draft，非格式准入）

S42 补足包的384份结论按其实际读域接收为后续设计输入：195份 Testing 与189份 Ops，包含程序全量解析、关键字段人工核读及明确未读的明细。它们不是384次全文深审或384份迁移完成。六份 Markdown patch 独立从固定83743275原件应用、正负合同各六件；本页组合保留S44增量，Status采用design-spec既有draft，不新增词表。七重复清册的Owner处置字段全部保留，新增两个说明字段不构成覆盖；不删除，固定1838不变。

执行顺序冻结为先复用、后低耦合原生、最后控制DAG：

1. 既有合同：3份DOC-IA-2复用S24原生合同；28份Markdown先完成实际正文与当前路由，不归入652新格式设计分母。本轮五张任务卡仅关闭文档正文/模板缺口，卡顶rework/build等实施状态不变。
2. A结果41份：至少选实际红、绿、pending和无pending字段的短摘要各一篇；原生Vitest与删减摘要不能共用未经证明的必填字段，suite≠文件数，缺字段不能补零。冻结逐schema字段和当前唯一review入口后才开pilot。
3. B命令49份与变异30份：先做普通命令、指定业务AssertionError、额外hook错误拒绝、自测判据四类pilot。以实际argv/cwd/exit/signal及fullName集合区分业务结果、判据、执行来源；旧VALID/accept不恢复，原始红相位不洗绿。
4. D数组/映射28份：先identity清册、变异定义与path映射三类；保留root数组/键序/稳定键和真实caller。7个SHARED字节别名的删除仍需独立退役loader/反例，不借pilot删除。
5. E HTML15份：3个mockup与12个宿主分开合同，至少静态样机、脚本宿主各一篇；核DOM、脚本和资源引用不变。静态解析不授浏览器交互/视觉执行信用。
6. C控制127份：111个review与16个治理控制分别核flat/manifest/shard、positions、source pin、入边DAG、锁和实际consumer，先各一pilot及读回反例。不得用其包含的599/275条旧记录自动扩大新信用；Owner负责控制合同与发布。
7. F混合362份：先按实际业务目的、native字段和reader拆成有界子族，禁止一个any-object变体兜底，也不为每份单造变体；复用上述成熟schema的条目转入其设计，不能重复计数。分类完成即按依赖进入对应pilot，不等最后一份。

A41+B79+C127+D28+E15+F362=652，均为设计范围而非冻结合同或迁移数。GLM下一包一次交652逐路径合同字段映射、子族和代表pilot建议，复用本次384内容与已接收更正，不重新包装全文稿；Codex并行处理C类公共合同、来源冲突和最终准入。新增通用变体仍须设计/真实consumer/正负pilot/非作者验收，不改产品、旧测试、coverage、ignore或maxSize。任何旧测试适配须列实际最小补丁按原授权边界处理。


## 2026-10-25 S46设计接收边界与S47 pilot种子（draft）

652份原生映射与50计划是设计输入，未冻结新变体。Owner已订正74路径的确定事实；实际既有原生迁移合同仅三个S25路径，23完整reporter仍需精确准入，626对象仍需其对应的有界原生设计。存储loader、schema模板或同形文件reader的既有合同分别保留，不据此把JSON正文标迁移完成。

现有计划须解除三类缺口：代表载体与合同字段一致；选择器有明确、可解析语法；直接reader、目录枚举、同形参照、历史引用与pin分轴。空数组不等于缺字段，缺pending不补零，numTotalTestSuites是报告层级数、testResults.length是文件记录数。distillation.originalFileSha256只保原声称与蒸馏范围，不因载体SHA匹配认证原执行。

Owner提供五个具体设计种子供下一轮直接细化，均未实跑新执行或授新信用：

| 种子 | 固定载体 | 必须保持与反例 |
|---|---|---|
| 完整reporter红 | MenuBox K1-cascade-layer-offset.red.json | 25断言/24过/1败、5文件记录/12套件层级；失败fullName集合不截断，换绿或刷新SHA不得洗白 |
| 完整reporter绿 | 同族K1-cascade-layer-offset.green.json | 25过/0败、5文件记录/12套件层级；success不能替代零诊断，历史撤信不恢复 |
| 缺pending短摘要 | glm-leaf-workflows/batch-a-directed.json | 原25/25/0保持，pending未报告；不能补0或伪装完整reporter/失败集合 |
| 蒸馏reporter | BHTR directed/instrumentation-r1.json | 31断言与原coverageMap移除声明保留，声明原SHA d38e775b与载体SHA分轴；丢distillation应拒绝 |
| review存储manifest | 20261017-r73-testing-archive.json | protected loader按原描述符重建，logicalKeys/positions/source pins保全；读回不自动授内含条目语义信用 |

41个reporter/摘要没有真实非零pending样本、5件没有pending字段。需要非零pending判别力时，使用已接受S29边界作外部复用证据，或明确标注合成parser反例；不可新编历史运行。历史coverage-summary绝对键作为不可变原生记录保留，不要求旧worktree重建、不作当前coverage census。

以上只具体化已有draft排期。新variant/version、真实model/consumer与正负pilot仍须Owner冻结并据证接受，正式registry/routing不动；选择器规范化不授权改原字段或把所有JSON套通用any-object合同。


## 2026-10-25 S48 A/B/D首批原生pilot实施设计冻结1.0.0

本节冻结以下8个实际载体、7种形状的实施合同，不将S46的53份建议整体冻结。父类型仍17类、现有父版本与historicalSourcePins不变。所有载体format=json-native、治理说明放既有唯一current review；保留原bytes、原键/数组顺序、执行与历史来源边界，不加payload/envelope/sidecar。精确carrier revision/blob/SHA、当前基底字节、独立形状表及原型见既有S22证据包的S48成员；固定83743275只认证载体，不冒充执行提交或覆盖1838旧source pin。

| 首批载体 | 拟合同/必需形状与状态 | 本篇oracle与停止线 |
|---|---|---|
| [MenuBox K1红](../../ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.red.json)、[同族绿](../../ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/mutation-logs/K1-cascade-layer-offset.green.json) | 复用historical-vitest-native-v1/1.0.0的精确新增准入设计；total/passed/failed/pending/suite整数、success布尔、testResults数组，文件项name字符串/assertionResults数组，断言fullName/status字符串与failureMessages数组。本两件只观察passed/failed，未来pending/skipped/todo另核既有合同 | 各25断言；红24/1、绿25/0；5文件与12层级套件分轴。完整失败身份集合保留，换绿、截名或套件当文件均拒绝；不隐式扩大旧272准入 |
| [缺pending短摘要](../../testing/archive/legacy/batches/glm-leaf-workflows/batch-a-directed.json) | test-machine-evidence父类下historical-test-summary-native-v1/1.0.0；total/passed/failed整数，files数组元素file字符串/tests整数；没有numPendingTests、testResults | 原25/25/0、files.tests合计25；pending是未报告，不补零；没有详细失败集合就不作全身份认证 |
| [蒸馏reporter](../../ops/evidence/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/directed/instrumentation-r1.json) | test-machine-evidence父类下historical-distilled-vitest-native-v1/1.0.0；完整reporter形状加distillation对象，两者都必需 | 31断言，coverageMap移除说明及originalFileSha256逐值保留；原SHA与载体SHA不同且不替代被移除原件认证；去掉distillation或合并两SHA拒绝 |
| [SHARED命令摘要](../../ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/mutation-logs/SHARED-original.json) | evidence-receipt父类下historical-command-summary-native-v1/1.0.0；argv数组/cwd字符串/exitCode整数/signal与spawnError为null/summary与sourceSha对象/identitySet数组。15项只有fullName与status字符串，原status=passed | 原exit0、15历史身份；载体没有stdout/stderr及file列，不作日志捕获或零诊断声明。sourceSha仍原声称；七别名不删除 |
| [identity数组](../../testing/archive/legacy/batches/glm-large-wave/batch-a-directed.json) | test-machine-evidence父类下historical-test-identity-native-v1/1.0.0；根数组，每项file/fullName/status字符串，原status=passed | 50个有序且唯一file/fullName对；重复/改名/状态换值拒绝，不把行数自动当某次suite或执行数 |
| [纯变异定义数组](../../ops/evidence/TEST-COVERAGE85-GLM-GAME-1/mutation-points.json) | evidence-receipt父类下historical-mutation-definition-native-v1/1.0.0；根数组，id/file/find/replace/testFile字符串、line整数，note可选字符串；没有执行状态 | MUT-01至12唯一身份与替换定义保留；定义不是kill或原始/变异/恢复运行包，缺replace或伪称执行拒绝 |
| [历史ops路径映射](../../ops/archive/ops-governance-layout-20261004.json) | evidence-receipt父类下historical-path-map-native-v1/1.0.0；根对象schemaVersion整数，id/generatedBy/sourceRevision/appliedRevision/policy字符串，rootWhitelist和entries数组，summary对象；entry from/to/kind/reason/sourceSha256/afterSha256字符串、evidence对象 | 43历史决议=board-history1/audit-tool39/task-evidence3。顶层entry.after与entry.evidence.after各保历史值，不合并刷新，不执行移动、不据旧目标现存判当前授权 |

治理状态一律historical；当前review保留身份/范围、来源与合法输入、oracle、原始结果、限制与下一步五部分，字段含owner/coreConclusion/readDomain/primarySource/truthAnchors/legalInputs/businessOracle/fieldRoles/historyBoundary/stopLine/nextStep。runtimeExecutionPerformed与historicClaimsReexecuted双false、credit0。输入是固定原生与历史上下文，结果不作为合法输入；旧withdrawn/unknown及未读明细不能因源SHA相等消除。

原型先真实Git解析+原字节保全，再严格UTF8/重复键与形状/本篇事实核验。8正例、逐件8合成反例和2非法JSON反例实跑通过；合成pending/错误字段只在内存，不冒称历史运行。生产实施还必须接入真实model与progress，使用protected reviewReader和原字节Git provider，核联合换path/variant/来源、刷新SHA洗白、双false升真与旧cohort不变；该联合门未过前不注册正式路由、不授语义/迁移信用。本节为有界实施设计冻结，不是任何历史测试/E2E/coverage已重跑。

## 2026-10-25 S49 精确准入裁定与下一批pilot边界

GLM剩余644的集合有效，53合同仍为建议。完整required校验揭示33计划的跨样本字段并集错误，另两类型不符；case自身少数pointer可解析不证明整个合同可用。Owner准入实施27条精确shape建议：21完整reporter、2缺pending摘要、3identity数组、1蒸馏reporter；逐path/variant/源Git/SHA见既有S22封存的S49 admission-decisions。12不相容建议保留为分族设计，不能删字段或补缺值迁就模板；本轮27无production route。剩余644为27形状候选+614待分族设计+3已准入复用，没有新增文档分母。

首八通用guard使用固定原生Buffer与Git snapshot，既有唯一review承载具体说明和原生字段语义投影；fieldRoles指向真实JSON字段与唯一review位置。临时树真实model/progress验证合同与伪晋升拒绝；现阶段强制partial/needs和执行双false，新6变体只在隔离fixture注册，原registry及父变体均不改变。正式注册不能静默放宽原frozen-binding测试的旧合同deepEqual；需要时另给最小适配补丁与授权。

| 后继pilot | 冻结内容与具体判据 | 保留边界 |
|---|---|---|
| [c00 mutation摘要](../../testing/archive/legacy/batches/cursor-architecture-batch/c00-mutant.json) | historical-rich-mutant-summary设计1.0.0；key/id/file/testFile/fullName/sha256、布尔hashUnchanged/hit/ok、整数greenExit/greenPassed/redExit、failedTitle/failedFullName/assertion/evidence字符串；原greenPassed1、redExit1，完整失败身份与消息保留 | 只总结原历史回执，不凭ok重新认证有效kill；旧tmp evidence不是今天可读raw证据 |
| [overflow精简摘要](../../testing/archive/legacy/editor/testing-records/grok-arch-ds-overflow-mutant.json) | historical-compact-mutant-summary设计1.0.0；id/file/sha256/hashUnchanged/greenExit/greenPassed/redExit/failedTitle/assertion/ok，原greenPassed7；没有key/testFile/fullName/failedFullName/hit/evidence，不强加完整格式 | 不从failedTitle补造fullName；与40份完整格式分开，41份不再共用必填并集 |
| [ops-03单条review](../reviews/20261004-structured-content-ops-03.json)与[phase2-01转移空账本](../reviews/20261004-structured-content-phase2-01.json) | 只冻结两个控制pilot的精确范围；schemaVersion整数、id/reviewer/reviewDate/policy字符串、entries数组；第二件合法空entries+5 currentRecordTransfers，不能要求entries/0 | 生命周期为现行控制载体，内容含历史声明；尚须实际全局唯一membership、转移出处/去向与loader合同，未冻结成历史immutable raw、未准予退役 |
| [模块宿主index-b](../../testing/archive/legacy/batches/glm-large-wave/browser-host/index-b.html) | native HTML宿主设计1.0.0：唯一div#root、唯一module script ./host-b.tsx及固定依赖，零canvas为合法正例 | 不执行脚本、不认证浏览器效果或测试通过；删mount或错换module为反例 |
| [actor静态mockup](../../phase2/archive/mockups/actor-mode-v1.html) | native HTML静态设计1.0.0：title/style及actors/framegrid/inspector三区、无script；保留原布局与文案 | 历史设计不等于产品现状；注入script或删结构为反例，本轮未执行HTML负例 |

以上后继设计的负例均是待执行计划，不能借首八测试结果代签。当前复用已有引用与原件，未新增envelope/sidecar、未复制652全量账本、未更改1838分母；旧原始声明、撤信和未读范围继续保留。

## S50 首八原生合同正式注册与接受门

S49七形状的实际model/progress联合pilot与非作者代码/封存复核已接受。现将六个新variant以各自1.0.0注册到既有test-machine-evidence/evidence-receipt父类，原raw沿用historical-vitest-native-v1但路径仅首二精确增加；17父类型、原父版本/历史sourcePins/原变体不变。生产读域为固定原生载体加现有唯一review，无payload包裹、无sidecar。

八个精确路径见现有historical-native-family-admission；其carrier/source/review轴不改。partial/needs合法pilot继续保留；仅经独立逐篇接受和Owner裁定的内容指纹可转新文档reviewed/compliant。接受内容固定绑定报告SHA、path、native afterSHA及具体语义字段，换报告/跨篇/改结论/联合改状态不得绕过；双false和历史执行零信用继续强制。旧撤信逐值进入history而不恢复，新增文档接受不证明原执行通过。

下一批两mutation/两HTML设计保持S49范围；两review控制仍待空账本与转移/唯一归属合同，27形状建议仍仅实施准入。首八实际接入、测试/进度与非作者验收按本轮真实回执记录，不把注册本身算作八篇完成。

## S54 现有四变体的27精确路径实现（2026-10-26）

S49/S52已准入的21 raw reporter、1 distilled、2 summary及3 identity数组复用原1.0.0合同，无新variant或父版本变化。精确carrier、历史来源及唯一review位置由historical-native-family-expansion-admission.mjs锁定；原S48八pilot和S50内容接受清单不扩张；真实model/progress按合并后的精确准入全集预加载review，partial条目同样要通过保护reader。结构试接入仅允许partial-review-unknown/needs-migration，27不继承S50报告，不能借S53组合accept直接晋升。临时树中逐篇归一字段并通过真实model/progress后交非作者集中复核，正式路由/registry/语义状态另行受控发布。原生字段、缺pending与distillation来源、历史撤信均保留，不复制原生到新账本。

## 2026-10-27 S59：原生HTML合同冻结与当前控制JSON设计边界

### HTML两变体（设计冻结1.0.0，pilot待独立验收）

- historical-ui-mockup-native-v1属于design-spec；仅历史静态设计样机，Status historical，不表明当前编辑器功能。historical-browser-host-native-v1属于evidence-receipt；仅历史浏览器取证入口源码，Status historical，不表明脚本已运行或结果通过。各自format=html-native/templateVersion=1.0.0/metadataLocation=existing-current-review，父Markdown合同/版本、17类型分母不变。
- 目的/必填内容：具体界面或宿主职责、固定Git原源和旧来源轴、真实DOM title/root/canvas/script/resource结构、可解析原文见证、输入/oracle/依赖、排重、缺失构建产物、时点/历史/stopLine/下一步。现有唯一review承载；原HTML、脚本/交互/资源引用/字节不改，不注入wrapper/_governance/payload，不新增sidecar或来源副本。
- 证据：新HTML-only Git provider验证真实commit/普通100644 blob/路径/OID/SHA；不扩展原JSON-only reader。parse5解析文档而不运行脚本，直接记录DOM和依赖存在性；相对脚本、dev-root绝对脚本与缺编译main.js分轴。root-only宿主合法，不强求canvas；缺编译产物仅对固定rv2 pilot显式保留，不创建忽略规则或认证原执行。原title/script/text/native witness和读取对象不可靠自刷SHA或换variant洗白。
- 当前接受/历史：pilot仅partial-review-unknown/needs-migration，独立报告表为空，任何自行promote/借旧S54报告一律拒。新接受只可绑定精确正文digest、原始after、身份/报告和Owner决定；不恢复旧artifactOnly/deep/执行信用。不授runtime/E2E/视觉/coverage；任何源码/引用/合同改变须重新核对应claim。
- pilot精确集：actor-mode-v2.html（mockup）、wave-F/browser-host/index.html（root-only脚本宿主）、rv2/index.html（canvas+缺main.js、保留entry.ts归档边界）。每变体至少一篇；15篇批量迁移/路由及实际信用另据pilot非作者接受和各篇具体内容决定。本批真实中央源/row/routing不改，owned overlay经同一model/progress-per-document consumer验证。

### 当前控制JSON（draft，未冻结为准入合同）

- 拟分current-review-ledger与current-governance-control，两者均live控制面，不允许绑定一次原生SHA后永远当immutable历史。当前原生字节/逻辑物化/原source pin/语义接受/例行after边必须分轴；不把entries中的content-reviewed视为该ledger自身已完整受审，不借一个control接受给下游恢复信用。
- 单一现有review位置，禁止self hash与为review无限生成review。结构根、权威清册、派生manifest/shard与控制对象的语义分别定义；写入沿已接受组事务、源快照/锁/staging/readback、DAG/清理退出，不在新合同绕开。
- Owner已按明确读域补核matrix65条关系声明和17父模板合同；未重读全部下游证据/旧变体，不恢复历史真值。版本/状态词、必填目的/政策/事实权/caller/oracle、历史/撤信保留和行政可变字段仍待当前变动/信用失效规则及真实pilot闭合。当前只冻结HTML设计，control保持draft/contract-pending，不注册正式variant，不减632/1258。

## S61 HTML现有合同的精确扩展与当前接受（2026-10-28）

S59两1.0.0合同及三pilot已获GLM非作者限定接受；本轮只将原15HTML中剩12个固定路径追加准入，不改父模板、变体定义/版本或JSON-only来源reader。carrier c801、原历史revision/OID/SHA和唯一review位置逐篇实取，3静态mockup/12宿主分开，root-only合法；rv2/rv3-rv4缺main.js、phase1归档前根路径和kimi dev-root路径原样留历史边界。

原3pilot十九内容字段精确绑定S59 GLM接受，原pilot停线文字保留为来源时点说明，当前生命周期由本轮显式接受覆盖；其余12复用GLM具体正文、S59已非作者接受的机械规范化规则，由Codex据证裁定。RV1的2522为字符数/2707为UTF-8字节数，生成器相对路径为../../tools，单位/路径勘误留原稿。原S60陈旧清单不倒改，当前实际23855B/a73b648d另固定。不用正则摘要冒充完整parse5读取对象。

接受表按两组精确path/native SHA/内容digest/报告与Owner决定分轴；更改正文自刷digest、借别组报告、残留active claimCorrection均拒。旧撤信逐值入史，不恢复旧执行。正式15路由/registry/现有review的变更由Owner成组试验后写入；不引入sidecar、原生wrapper或重复账本。127控制JSON仍draft；任一全仓必要硬门未过不合main、不推送、不done。

S61中央接线补充：evidence.path是公共review检查必填的行政来源定位，必须严格等于固定HTML path；它不产生新正文语义，不并入已有接受语义digest。原3pilot digest保持字节相同，其余12使用现行partial-semantic深度词表示据证审阅。任意改指向，即使自刷hash也由guard拒绝；新增反例校准。原始DOM/引用、core/oracle/历史及非执行边界继续参与原语义digest。首轮27条元数据错误留原件，补齐字段后复跑，不降词表/门规则。


## S63 历史原生artifact通用合同冻结（2026-10-28，Owner Codex）

本补充沿17父类型，增加evidence-receipt/test-machine-evidence/archive-record三个历史artifact-native变体，各自1.0.0；父默认、全部旧变体与historicalSourcePins不改。三种角色不因相同JSON格式合并；贡献者须按内容说明角色，历史原文不可因换模板升格。目的为解释已固定载体并保留其历史结论/机器字段，治理正文复用现有唯一review，不包payload、不新建sidecar。现有DOC-IA-2三件保持原两个合同、原正文接受与两项unverified，不借本合同清除。

必需内容：具体coreConclusion；逐篇来源/真实读域及未读；原生字段角色与可解析指针见证；唯一carrier Git revision/OID/SHA和已有历史source分轴；合法输入仅固定载体；business oracle为历史文档事实且currentExecution=false；依赖/版本/caller/排重；历史/撤信/unknown；停止线与下一步。evidence须保留family、完整根键类型/数组长度形状及原见证，新增见证逐值等于原生指针。Guard拒坏UTF8/重复键、错Git对象、载体改字节、跨path/错唯一review、坏指针/改值、角色与variant不符、运行信用和自行晋升；哈希/形状不证明人工读过或语义充分。

状态：作者候选保持原partial-review-unknown/needs-migration，已有三件已接受内容原样复用；新独立接受、正式grant和实际迁移另轴。不删除原claimCorrection、历史、provenance或source未知，不重认证旧命令与数字。版本/owner/来源/证据/停止线和后继均在唯一review中，原生字段与日期不改。473路径来源与family/shape/见证由精确代码准入冻结，原135控制JSON和9MD不进入贡献者变更域。

writer先验完整before/白名单/不可变字段，允许473内部不重叠批次；同一组锁内staging保护原件及全部引用，route/registry投影与after依赖闭包一起写、公开loader读回后退旧世代并解锁，失败保留锁/backup/staging。公共model、progress、中央非strict和完整临时树pilot为整包派发前提；schema绿不授全文或runtime/E2E/视觉/coverage信用。

S63冻结补充：native witness的op默认为equals，另支持array-length/object-keys/object-key-count/string-contains；后者仅证明解码字段的具体子串。原required pointer/value见证须equals保留；不支持任意代码或hash-only oracle，value至多4096 UTF-8B，不复制完整raw。六既有pilot保持原guard和两项unverified。完整临时树/故障反例/42文件296工具已实跑，正式接受表为空，0新增迁移。


## S66 现行review账本原生合同1.0.0（2026-10-28）

设计冻结用于受控pilot，不授迁移：current-review-ledger-native-v1复用evidence-receipt父类，自有json-native/1.0.0，元数据复用existing-current-review。生命周期current仅指账本控制责任，不把子entry或历史policy升格当前事实。初始精确pilot为ops-03一成员、phase2-01零成员五转移、r85真实manifest物化100成员；9d Git基点固定逻辑头/有序成员原source身份，不冻结后续合法维护的全文件字节。

必填具体职责、原policy/撤信界线、合法完整组及Git来源、当前唯一review位置、来源/结构/转移oracle、caller、实际读域、未读下游与未跑执行、停止线/下一步。保护loader先验source pin/descriptor/positions/孤片/锁与普通文件，再校当前raw与逻辑视图；表头和有序成员source身份变化须重新审阅，不允许只刷新after洗白。maintenanceHistory只追加保留前缀；成员内容/状态的合法变更由各自任务/child合同和全局门裁定，本control不重新认证子文档语义或执行。空账本五条转移必须逐条真实Git旧blob+旧唯一成员+当前唯一destination，声明true不能代替解析。

新合同不能用immutable carrier SHA概念跳过可变控制面；当前after pin是当次raw观测，与初始逻辑身份/原storage source/正文语义/子文档信用分轴。当前仅partial-review-unknown/needs-migration，正式接受尚未签发，任意换标/自行晋升/派生child信用拒绝。flat与真实manifest由同一protected group校验，绑定原source pin不变；不新增_governance、payload、sidecar或无限review自环。

生产model与progress接入同一guard，含control路由时显式加载完整保护组；无新路由时原caller加载方式不变。临时隔离树验证三条具体正文+真实公共consumer；源树三条路由/registry/review状态保持，测试与pilot不授当前完成。原17父类型、旧variant、source pins、旧测试与产品/006/coverage保持；其余135控制JSON+9MD仍待逐篇迁移。


### S67 同合同111路径准入与候选写入（2026-10-29）

S66公共合同与三类真实pilot已获GLM非作者accept（43cfa8aca67a1cfae6589b89c613369535053a3001cd066bb1381a3f485a9473）。current-review-ledger-native-v1保持1.0.0、自有json-native/existing-current-review/current；17父类型与registry合同形状不变。本次只在代码白名单补108条真实Git9d逻辑header/有序成员-source绑定，与原3合为111；没有状态接受表或新执行信用。全部111是逻辑账本，不是物理片；原3边界/声明逐值保留，剩余24 JSON不套本合同。

候选工具先验证精确before/白名单/历史前缀和不许写的source/status/correction，再做route+registry投影与完整依赖DAG。受保护全组+真实Git+计划输出materializer共同核验，继承已接受的锁/staging/原子组/失败保留/公开读回。先完整临时树演练，再一次交贡献者111最终候选；3已接受终稿复用、108逐篇治理。新正文采用现有唯一review行，无新增原生字段或sidecar。结构/存储/正文接受/Owner grant/当前执行严格分开，严格待办仅正式grant后按实扣减。

S67完整组首轮演练在落盘前拒绝：R93新增解释后格式化输入将达1,075,985B，超过1MiB；没有压缩结论、放宽maxSize或继续写半树。Owner据此明确准入R93唯一flat→manifest升级，固定10ae2c1447f7f5583bc1407024a506e174d2d914真实flat Git原件（OID eba5c8346cad3c5d39ed863ccdc223e9daedddf9、SHA c6abadaa7f66a7c51882396f6363c3eb32282d9deac75e1adb1c0b257099ae3e），91成员及旧源字段原样保全。原12 source pins不改；current事务只允许无R93时12或持此精确R93 pin时13，新增source也须真实Git解析、staging/读回共同核验。新manifest/每片仍≤512KiB；新物理载体本身不产生新正文分母。现行合同拒绝其它flat→manifest升级或更换R93 source，数据与授信仍分轴。原S66“本轮不准入新source”维持其时点；本S67是显式新增唯一存储准入，不追溯改写S66。旧current-review-ledger测试夹具从live改为固定9d复制的最小补丁已备，单独等用户既定旧测试许可；未获许可前不编辑该旧文件。

S67终态补记：R93拆分+20转移subject/真实Git已通过完整组演练，3已接受正文复用+108结构演练仅证明工具可执行，不替代108语义治理。源/临时工具310/0/0，model2301→2412零issue；原17父类型与registry变体完全不改。用户后续明确批准旧current-review-ledger夹具固定9d复制，全部原断言保留；source、已接受语义和runtime信用未扩。S68一次委托先验公共增量后直接做111最终候选，待Owner独立接受后再授信。


### S69 现行账本接受资格与Owner发布边界（2026-10-29）

current-review-ledger-native-v1/1.0.0格式及17父类型不变，补齐此前尚未启用的接受前提。候选仍partial/needs、无接受对象；合格态须冻结具体内容hash、分域非作者basis（原GLM内容由Codex核、Owner澄清由GLM核，复用三pilot沿S66接受）和真实报告、独立Owner决定及唯一publication history。正式表在实际非作者回执之前保持空，不把候选/原件保全/拟稿hash计迁移。

内容hash绑定完整已接受解释/源/历史，排除动态after及行政maintenance；publication事件只用于搬运原claimCorrection，规范化后内容hash不变，旧撤信原对象按history回读，不恢复旧事实。动态raw仍由原guard验当前after、稳定header/有序成员-source/唯一归属/Git/source pin和受保护快照；不因接受放宽这些门。作者API仍不得改状态，Owner新入口只允许compiled接受映射产生的精确状态/签名/历史变换，registry状态投影与依赖after闭包同事务。新回归仅覆上述原子边界，既有测试不改；未采外部接收对象/任意validator作为写权限。
