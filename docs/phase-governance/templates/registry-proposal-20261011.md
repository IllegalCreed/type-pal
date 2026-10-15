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
