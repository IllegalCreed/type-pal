# 固定 binding baseline 的 JSON 正文合同设计

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页将 phase-governance 历史设计/回执接入 archive-record-v1；原始日期、结论、冲突、机器字段、链接和未执行项保留于 quote。本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision bff13f74a4f95bbba05a8353651b5997fea7fc95；本轮 R93。历史 phase-governance 材料只作时点回执，不是当前事实源。

## 原始结论

- 固定 binding baseline 的 JSON 正文合同设计：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、字段、SHA、counter、链接、状态和未执行项由 quote 保全。

## 当前有效性

historical。当前事实由 phase/lore catalog、registry、routing、任务卡和 fresh review 决定。

## 继任文档

- 当前入口：对应 phase/lore canonical 文档、review record、task card 和 source consumer。

## 停止线

- 不得将历史 review/design/receipt 升格为 current runtime/E2E/visual/coverage acceptance。

## 原文保全

固定 source revision `bff13f74a4f95bbba05a8353651b5997fea7fc95`，source SHA `28761fd805038f9c9d94e24418790cb3723e3aca701fc0e163f1dce3755e6886`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 固定 binding baseline 的 JSON 正文合同设计
>
> Status: historical
> Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
> Last reviewed: 2026-10-17
> Template: archive-record-v1 / 1.0.0
>
> 本页将 phase-governance 历史设计/回执接入 archive-record-v1；原始日期、结论、冲突、机器字段、链接和未执行项保留于 quote。本次不授 runtime/E2E/视觉/coverage 信用。
>
> ## 历史范围
>
> - 源 revision bff13f74a4f95bbba05a8353651b5997fea7fc95；本轮 R93。历史 phase-governance 材料只作时点回执，不是当前事实源。
>
> ## 原始结论
>
> - 固定 binding baseline 的 JSON 正文合同设计：原始正文完整保留于下方 quote。
>
> ## 当时证据
>
> - 原始命令、字段、SHA、counter、链接、状态和未执行项由 quote 保全。
>
> ## 当前有效性
>
> historical。当前事实由 phase/lore catalog、registry、routing、任务卡和 fresh review 决定。
>
> ## 继任文档
>
> - 当前入口：对应 phase/lore canonical 文档、review record、task card 和 source consumer。
>
> ## 停止线
>
> - 不得将历史 review/design/receipt 升格为 current runtime/E2E/visual/coverage acceptance。
>
> ## 原文保全
>
> 固定 source revision `bff13f74a4f95bbba05a8353651b5997fea7fc95`，source SHA `ba5cabf543c711f1299ce2f1340316ef0934e75756383368a2913dc452b41f0c`；下方 quote 可逆回原始 UTF-8 字节。
> <!-- original-source-quote:start -->
> > # 固定 binding baseline 的 JSON 正文合同设计
> >
> > Status: historical
> > Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
> > Last reviewed: 2026-10-17
> > Template: archive-record-v1 / 1.0.0
> >
> > 本页把 phase-governance artifact 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。
> >
> > ## 历史范围
> >
> > - 源 revision bff13f74a4f95bbba05a8353651b5997fea7fc95；本轮 R92。此文件属于 phase-governance artifact 历史层，不能单独授权当前测试或发布。
> >
> > ## 原始结论
> >
> > - 固定 binding baseline 的 JSON 正文合同设计：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。
> >
> > ## 当时证据
> >
> > - 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。
> >
> > ## 当前有效性
> >
> > historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。
> >
> > ## 继任文档
> >
> > - 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
> > - 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。
> >
> > ## 停止线
> >
> > - 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。
> >
> > ## 原文保全
> >
> > 固定 source revision `bff13f74a4f95bbba05a8353651b5997fea7fc95`，source SHA `9eca138466af60f57ae2648bf1ce86e7046f36ddaf089d4251930fc2a39843a3`；下方 quote 可逆回原始 UTF-8 字节。
> > <!-- original-source-quote:start -->
> > > # 固定 binding baseline 的 JSON 正文合同设计
> > >
> > > Status: current
> > > Owner: Codex（冻结、独立验收与集成）；receipt_review（候选实现单一 Owner）
> > > Last reviewed: 2026-10-16
> > > Template: design-spec-v1 / 1.0.0
> > > Version: F1-binding-baseline / 2.0.1（维护白名单补一项，实施另准入）
> > >
> > > ## 问题与目标
> > >
> > > 固定binding-baseline是机器冻结索引，没有合法的已迁移JSON正文绑定。冻结test-catalog-v1父1.2.0中的frozen-document-binding-baseline-v1变体，用真实八字段语义、严格固定root/view与统一envelope治理它；17types不增，不伪造execution字段。设计不是实现/pilot/迁移credit，新设计自身pending增量。必须先实施合同并独立接受canonical pilot，之后baseline最多incremental1、原cohort仍1838。
> > >
> > > ## 真值与约束
> > >
> > > 实际唯一root：docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json，revision33cc2df50c7279d2750ddad4fcf6c373b7b2bda3、mode100644、blob00da11bb594126105abbb5ea596c7272ed8e5542、rawSHA1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5；849646bytes/18407lines、八原键/1838项、自membership0。root常量不换，原schema1/id/status baseline-pending-semantic-review/denominator/policy/15类summary/1838数组顺序与所有八子字段深等。原unread/needs-migration/null/candidate-from-structure不刷绿；capture105差异/1834父版本同与三dirty/ED缺Git四例外保历史，不冒当前after漂移。
> > >
> > > 作者receipt_review正式187行v2 SHA b0aea32fc5653fa1b73e8aabf56424e3e6b2fa9178b5ac12810644251f923bdd，旧169行v1 SHA d15dd9c57831ae939431ab983149ad4830d62a5e44d7ceb73fe1f206051c3c40留存。非作者history_cards_a定向设计全文30行 SHA d4f6710c27ec44fb3cc0eeaefe4910062d7d07699516436c26b2bb80f220bcd4 为design agree/F1-C5设计闭合；其独立16case probe SHA148f53b4406311ad15a0f4846604199396642cfb78e0eec256f914cb58cde8cc。根全文读v2/完整v1diff/非作者报告与真实probe语义，旧代码读域按固定同blob复用，不冒根fresh18407行/1838源正文全读。root另实取33cc原blob核rawSHA/8keys/1838项、当前同字节，只是机器元数据身份核验。
> > >
> > > L十索引/根接入已于afb149b9a0bf891084af4902645da9f5469c9d8b独立接受，proof0709bf9b86ea8c36d36682d3da836065b4a5dc83b1b52b30c98ff0ca9e2defd4；F1-C4先接收L的时序前提满足。F1将来版本roll是新SSOT字节，旧L签字只认证原candidate，不能授权其后变化；F1另跑当前producer/全门并明确原18业务字段不改。
> > >
> > > 四向边界：primary为固定Git捕获对象和真实docs消费者；phase1/phase2产品机制不变、原catalog各轨字段不动；目标只治理捕获索引本身和必要docs模型，不给原1838源重审或runtime/E2E/视觉/coverage信用。原无Owner/审查日不倒填，新增Owner/date只指当前治理。
> > >
> > > ## 方案
> > >
> > > ### 冻结合同
> > >
> > > 1. 固定JSON父/variant联合门。test-catalog-v1/1.2.0的newvariant=frozen-document-binding-baseline-v1，format=json、preservedSource.kind=frozen-document-binding-root-view-v1，hardpath仅上述baseline；错path/type/default/未知variant/父Markdown拒，不能fallback ordinary。baseline不强迫加入自身1838membership，其它historicalJSON固定pin+membership/native守卫原样。
> > > 2. 无variant default完整旧16治理字段及顺序用defaultRequiredGovernanceFields保存，共用14只去publicationRules/entryReadings；default entryReadingsField/requiredFields/requiredValues深等，逐id reading/非空conclusion和真实validateCatalog合法ID门保留。generatedBy只要求键存在，改值/null维持旧接受；runtimeExecutionPerformed严格false是generic既有literal门，validateCatalog不读它，不虚构单层责任或加强旧合同。
> > > 3. 新baseline只添一个_governance，精确19键与captureReading精确8键按完整v2；三个sourceDocumentSemanticReviewPerformed/entryBindingsAreCurrentTemplateApproval/captureSummaryIsCurrentRegistrySummary全部false。非空owner/scope/beforeAfter/stopLine/nextStep和有效实际日期；provenance/primary/history非空array，supersedes为array；sourceRevision/blob/SHA固定；currentAudit精确kind=static-document-governance/runtimeExecutionPerformed=false，lifecycle=historical。不补generatedBy/业务version/假的publicationID/entryReadings/after/selfHash。
> > > 4. readFrozenBaselineRoot(readSourceBuffer)实际普通commit/path/mode/blob/原Buffer，先rawSHA再strictUTF8与所有对象层级decoded重复key拒，八键/1838unique结构核；inspectFrozenBaselineView(readBuffer,root)原raw返回original仅来源可读，governed必须只八键+gov、去gov后全对象deepEqual（所有额外键/类型/数组顺序）+完整typed metadata。不能JSON.parse吞重复键或剥未知字段，不给解码string重新hash完整信用。
> > > 5. 单向依赖真实GitBuffer reader→root/view→model→现wrapper/未来core，低层不import model/review/terminal、不递归自身；普通source reader边界不放宽。source/after真实Git不fallback工作树或接受tag/tree/symlink/gitlink，不用shell插值。
> > > 6. 唯一已接受docs/testing/catalog.json仅_governance.templateVersion1.1.0→1.2.0；原native+其它governance逐字节逆回读，旧18读结论/状态/期限保留，0新增catalog迁移。完整旧current/prior固定Git可取或内联保留并同步version/after/conformity。test-catalog默认示例仅声明roll；machine1.5默认/六variant/五历史pins全深等不动。
> > >
> > > 完整正式v2合同按下方原稿逐节冻结；原21路径白名单保作2.0.0历史基点，现仅补一个实际必需的README当前审查记录维护路径为22，不扩代码或业务合同。作者在独立codex/docs-binding-baseline-f1 worktree从根另传已提交clean冻结基点开工；docs工具/模板与canonical pilot/根维护可按单Owner先实施、根单一写入集成，不能并行抢共享实现文件。原6代码+5模板入口+10根维护21路径，窄增docs/phase-governance/reviews/20261015-agent-first-routing-batch.json，共22；新增文件仅准维护docs/phase-governance/templates/README.md的唯一current record与完整prior/source/after/SHA同步，该记录其它entries逐对象不变。本文仍是唯一冻结设计路径；旧tests、产品/coverage/CI、完整T loader/builder/strictcodec不准入。若只实现F1低层真实Buffer reader，不能夹带未来T跨format/core功能。
> > >
> > > ### Pilot与接收顺序
> > >
> > > 本页/任务/README实际冻结提交后仍需根内部传精确基点和实施准入，不凭/tmp稿动手。先实现既有21白名单内合同/default等值及baseline canonical pilot，作者交精确候选；根与非作者核完整新代码/typed envelope实际语义和完整baseline原八字段保存边界。迁移credit须canonical正文独立读+真实model/progress/source/native完整门，不以fixture结构绿代替。
> > >
> > > 质量库存本包所有实际新增源码（包括新的Git reader与focused docs test）都只pending，数量以真实枚举为准、不固化只加一项或3294；旧库存/旧代码不复审。每篇central完整source/after/prior/owner/primary/readScope/phase/input/oracle/counter/history/stop/next双conformity；source读取范围如实记字段分组/结构遍历和同blob复用，不捏造18407逐行或1838源通读。baseline源码根与全部实际source/deliveredcandidate须最终可达，清理不可销唯一指针。
> > >
> > > ## 边界与风险
> > >
> > > F1-C1专用entryReadings继承用default完整列表分离；C2不能仅variantformat绕metadata/source；C3全层decodedduplicate/strictUTF8/无循环须实测；C4 L已接收但新SSOT还须新验；C5v1误称改generatedBy拒，v2保持旧接受并有独立反证闭合。设计counter闭合不冒实施通过。原v1/计数字错17/15、修16/14和所有原probe失败保留，不追改历史绿。
> > >
> > > 新增variant仅此唯一baseline，现17types/machine历史pins/旧default行为不削弱，不自动适用其它control或新增codec。不改产品schema/save/migration或旧测试，不以低门限/maxSize/ignore/虚构读域过门。T/fullproduction闭包未成，整个目标继续active；文档候选不足不是允许假造approved/complete的理由。
> > >
> > > ## 验收
> > >
> > > 实际完整18项default canonical跑generic+validateCatalog，保原16ordered/effective字段与所有literal/entryreading/ID行为；合法generatedBy新string/null仍接受，删键拒；runtime true/null/string/missing由原generic拒；对原已拒输入做真实移除目标守卫放行校准，不对原接受输入伪造反控。
> > >
> > > 真实固定33cc对象的ownedtmp root/view/gov/body/source/进度正控；原raw来源可读不计迁移、合法envelope原生8深等后incremental1/cohort增0。联改native任意键/entry path/hash/类型/顺序/summary/状态再同步route/review.after仍固定source拒；只移除owned native守卫同例放行以证明判别力。错path/type/format/variant/metadata/hash/revision/额外键/null/非法UTF8/全层decodedduplicate、非commit/缺对象等须命中真实目标门，不能被无关缺route先挡冒校准。低层不回调递归及其它历史source合同回归要真实验证。
> > >
> > > 测试少而精，用新focused docs test的3–4顶层原子场景组织合法fixture/有意义变造，不动旧product tests/coverage，不执行112tools/原raw。旧machine1.5全合同/pins保持，L索引仍真实producer输出。实际pnpm check:docs、pnpm lint、git diff --check零error/warning/info，库存实际枚举，新test只pending；独立代码/正文复核与全仓门分开记。未达留draft/rework，不自签done、不合main。
> > >
> > > 维护counter F1-SCOPE1：receipt_review准备阶段从实际唯一registry.reviewRecord发现原21遗漏templates/README的当前记录。根直接核该README确在20261015-agent-first-routing-batch.json且已template-compliant；若只改正文不维护该完整current必有真实after漂移。2.0.1只补该一项22与全部新增源码pending口径，原2.0.0完整body在82f0e0bc可取、下方原187行quote逐字节不改；不是新产品/模板合同或未来实现accept。
> > >
> > > ### 完整原v2提案快照
> > >
> > > 原稿的待独立/未冻结时态按2026-10-16交付保留，下方仅provenance；根现行冻结与后来独立agree/时序以前文为准，不把旧提案时态当新实现许可。全部合同细节保留：
> > >
> > > > # F-1：固定 binding baseline 的 JSON 正文合同补案 v2 / 2026-10-16
> > > >
> > > > Status: proposed formal design for root + independent tail review; NOT frozen, build allowed, implementation accept, or migration credit.
> > > > Design author: receipt_review。研究基点为 5a125c375baa9dc907ddeb62865058ba8b830957；不修改仓库、不启动 writer，不重开已接收包。
> > > > Design version: F1-v2。完整保留旧 v1 稿（169行，SHA `d15dd9c57831ae939431ab983149ad4830d62a5e44d7ceb73fe1f206051c3c40`）；本版修 F1-C5 默认行为声明及其实际双消费者判据；同时把原F1-C3已要求的decoded重复key范围明确为所有对象层级，仍限new root/view分支。仍待非作者设计复核，不授实施。
> > > >
> > > > ## 1. 实读证据与问题边界
> > > >
> > > > 已全文读 terminal v1 提案186行（SHA6263d0d0582b92c7ce6b50fcfe732e6e1d099116abb953eda4c29c995b7c0818），document-model296行、frozen-source43行、Git-source35行；实读现17类型的实际JSON合同、catalog/machine模板与两入口相关说明。严格区分本人的读取和提案作者的旧读取。
> > > >
> > > > 实际读取 baseline 全部八顶层字段及非entries全部值、首尾entry、全部1838对象的字段/类型/唯一path分布与字节身份。原849646bytes/18407行不是本人逐行语义通读18407行，也不是1838源文重新深审。capture105差异/原四dirty时序复用 tail 完整observation（SHA51e952183ddcb14f519ae87bb12f7505464235f4c7a07efef9641c993a7be3ff），不冒本轮重新读取全部1838个Git正文。
> > > >
> > > > 固定root不变：
> > > >
> > > > - path=`docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json`
> > > > - revision=`33cc2df50c7279d2750ddad4fcf6c373b7b2bda3`
> > > > - mode=`100644`、Git blob=`00da11bb594126105abbb5ea596c7272ed8e5542`
> > > > - raw SHA256=`1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5`
> > > > - denominator=1838；自身membership=0。
> > > >
> > > > F-1 是“baseline本身缺合法JSON正文绑定”，不是来源散列错误。source/view绿不等于typed正文通过或迁移完成；本补案只补此缺口，不给其余control自动判型，也不替代T/共享loader/最终closure实施合同。
> > > >
> > > > ## 2. 以八个原生字段作内容判型
> > > >
> > > > | 原字段 | 实际值/意义 | 必须保持的边界 |
> > > > |---|---|---|
> > > > | schemaVersion | 1 | 捕获JSON自身schema，不能改成catalog schema2 |
> > > > | id | docs-full-template-binding-baseline-20261011 | 真实捕获身份，非新造testing publication id |
> > > > | status | baseline-pending-semantic-review | 原候选绑定仍未语义接受；不因baseline文件审过就翻成current/reviewed/completed |
> > > > | denominator | 1838 | 原批准cohort，不随新增artifact增长，也不强迫自身成为第1839项 |
> > > > | registry | content-document-template-registry-20261011 | 捕获时指向的registry身份，不代表当时已使用今天全部17类 |
> > > > | policy | Every candidate has a provisional template binding for review scheduling. This is not content-reviewed or template-compliant status. | 不许删掉provisional/非reviewed的限定 |
> > > > | summary | 原15种templateId分布 | 原数量原样保留；不得刷新为当前17类或当前完成统计 |
> > > > | entries | 1838个path→provisional template/sourceSHA的索引对象 | 原八子字段/值/类型/数组顺序全保；不是1838篇内容真值或当前review账 |
> > > >
> > > > 每个entry的八键为path/templateId/templateVersion/sourceSha256/contentReviewStatus/templateCompliance/reviewRecord/semanticBinding。全部原contentReviewStatus=unread、templateCompliance=needs-migration、reviewRecord=null；semanticBinding明确candidate-from-structure。保存它们不等于认可旧类型猜测为当前绑定。
> > > >
> > > > 选择现有 **test-catalog / test-catalog-v1**，新增 **frozen-document-binding-baseline-v1** 变体，父版本拟 **1.2.0**；仍17类型、0archive overlay。
> > > >
> > > > 理由：内容的主要职责是冻结索引与机器来源绑定；没有execution/steps/exit/cleanup，也没有历史测试判定。故不套machine1.5六变体或伪造执行字段。现有machine涵盖静态review并不使所有JSON都成为machine evidence。governance-index现仅Markdown，禁止挂JSON变体来绕过其格式/metadata门。
> > > >
> > > > ## 3. 不削弱default catalog的最小合同分离
> > > >
> > > > 现catalog父requiredGovernanceFields含publicationRules/entryReadings，且实际consumer对default按entry.id逐项检查。baseline只有path，不能塞空entryReadings过门，不能伪造1838个“已读源文”，也不能让其自membership。
> > > >
> > > > 父仍format=json，default原requiredFields/requiredValues/entryReadingsField/无variant行为全部保持。仅将治理字段作用域明确化：
> > > >
> > > > 1. 父requiredGovernanceFields保所有default与新变体真正共用的14项，剔除catalog专用publicationRules和entryReadings。
> > > > 2. 新 `defaultRequiredGovernanceFields` **完整保存原16项及原顺序**，不只是保存两项：templateId/templateVersion/lastReviewed/owner/provenance/sourceSha256/sourceGitObject/primarySource/scope/publicationRules/entryReadings/history/supersedes/beforeAfter/stopLine/nextStep。
> > > > 3. 无variant时，解析器先使用此完整default列表，再与contract自身字段取稳定去重；结果必须逐元素等于旧16项。有variant时使用共用列表+该variant专属字段。其它类型无此新属性，行为不变。
> > > > 4. default `entryReadingsField` 仍精确为 `_governance.entryReadings`；原nonempty entries、逐id reading/conclusion与排重门保留。合法非空/唯一 entry.id 是现有真实 `validateCatalog` 整体合同的一部分，不能误称 generic model 单独已拒所有空ID。default requiredFields/requiredValues 逐值不变：schemaVersion=2 与 `_governance.runtimeExecutionPerformed=false` 是原 literal 门；generatedBy 只要求键存在，改字符串值或置null保留旧行为，不新增其值/类型约束。
> > > > 5. new variant不声明entryReadingsField，使用真实captureReading。new variant的_governance **不允许entryReadings/publicationRules或afterSha/selfSha/seal**，不是靠空数组占位满足父合同。
> > > > 6. default版号声明-only roll：唯一已接收catalog `docs/testing/catalog.json` 只_governance.templateVersion1.1→1.2，其余原生和治理值逐字节逆回读；模板示例同样只滚其版本。旧18条业务字段/状态/期限/阅读结论不变，0新增迁移/18篇复审信用。
> > > >
> > > > 必须提供独立before/after有效合同比较：新default字段**有序16项深等**旧列表，entryReadingsField、requiredFields、requiredValues深等；所有旧machine1.5 default/六variant/五个历史pins完整不变。不把“测试绿”当上述逐项等值证明。
> > > >
> > > > ## 4. 新variant的完整正文合同
> > > >
> > > > 新variant显式format=json；requiredFields为原八键加_governance，native精确保真由source/view守卫完成。
> > > >
> > > > - requiredValues至少固定schemaVersion1、原id、原status、denominator1838、_governance.lifecycle=historical、_governance.currentAudit.kind=static-document-governance、_governance.currentAudit.runtimeExecutionPerformed=false。
> > > > - statuses只含原baseline-pending-semantic-review，statusPolicy.axis=frozen-binding-capture，**不设置catalog路径**。这是原capture状态门，不要求在18项catalog中找假id。
> > > > - preservedSource.kind固定 `frozen-document-binding-root-view-v1`；只能由代码中唯一固定root解析，不从registry/envelope/env选择新pin。
> > > > - metadata声明必须templateId=test-catalog-v1、templateVersion=1.2.0、variant=frozen-document-binding-baseline-v1。父及variant均必须为json，不新增跨format功能或以Markdown文本匹配代替机器声明。
> > > >
> > > > _governance精确19键：templateId/templateVersion/variant/lastReviewed/owner/provenance/sourceGitRevision/sourceGitObject/sourceSha256/primarySource/scope/lifecycle/currentAudit/captureReading/history/supersedes/beforeAfter/stopLine/nextStep。
> > > >
> > > > 类型门：真实非空owner/scope/beforeAfter/stopLine/nextStep；有效ISO日期且须实际审查，不按时钟续；provenance/primarySource/history非空array，supersedes为array；三个source身份精确固定root，primarySource含真实固定Git ref。currentAudit精确kind/runtimeExecutionPerformed两键，前述literal必须匹配；lifecycle为historical。原native没有Owner/审查日期，不倒填为原作者身份。
> > > >
> > > > captureReading精确：kind/nativeFieldSemantics/entryCount/entryKey/sourceDocumentSemanticReviewPerformed/entryBindingsAreCurrentTemplateApproval/captureSummaryIsCurrentRegistrySummary/consumerUse。
> > > >
> > > > - kind=frozen-provisional-binding-capture；nativeFieldSemantics为原八键→本次实际非空语义说明。
> > > > - entryCount=1838、entryKey=path。
> > > > - 三个“源文深审/绑定当前已批准/summary当前”布尔值全部false。
> > > > - consumerUse=approved-1838-cohort-source-anchor。
> > > >
> > > > 这是对八键及1838冻结索引元数据的阅读，不给其1838来源文档、旧类型判断或源SHA时点重审信用。原source-pending状态与本层文件已接受可并存；中央readMethod须准确记实际分组/字段读取、结构遍历及同blob复用，不假称逐行重印18407或重新全文1838源文。
> > > >
> > > > 统一envelope是本文件的真实内容迁移：说明索引职责/来源/旧分类限度/8键语义、合法机器输入和counter/停止线；不是只加template标签。不得添加顶层generatedBy、versions、publication current、runtime result或虚构执行命令。
> > > >
> > > > ## 5. 固定root和governed view：唯一专用分支
> > > >
> > > > 保留现frozenDocumentBaseline五项常量完全不变。新增两个低层函数，不import model/loader/terminal：
> > > >
> > > > - `readFrozenBaselineRoot(readSourceBuffer)`：实读固定普通commit、同路径regular100644 blob原Buffer，先核blob/raw SHA再严格UTF8/JSON。核八键、1838唯一path及原结构；返回只读native/root/cohort。不能从candidate registry/pin/summary反推root。
> > > > - `inspectFrozenBaselineView(readBuffer, root)`：原raw字节全等时返回original，仅作为进行中来源可读；否则只接受原八键+一个_governance。删除这一个键后对原对象deepEqual，覆盖所有键、类型、值和entries次序；再核第4节完整metadata身份/类型，返回governed或issues。root仅来自上一个函数，native应冻结防调用者意外改写。
> > > >
> > > > view解析必须拒非法UTF8，并拒所有对象层级的重复JSON键，以JSON转义解码后的key判重（包括重复native、重复_governance及entries/summary等任意内层转义同名键）。此限定严格解析器只用于新baseline root/view，不推广为旧default或任意format的新约束。`Object.keys(JSON.parse(...))`独自不证明原始输入没有重复键。不能剥除未知键后再比较。raw SHA在解析前计算；native可有合法排版差异，但最终完整after原Buffer SHA只存外部record/T，不存自身envelope。
> > > >
> > > > document-model在ordinary历史pin/membership路径之前只对以下联合条件用专用分支：
> > > >
> > > > 1. doc.path严格等固定baseline.path；
> > > > 2. doc.templateId、variant、父format和variant.format精确符合第4节；
> > > > 3. contract.preservedSource.kind为上述固定mode；
> > > > 4. 使用低层固定root/view，迁移检查还必须viewState=governed并通过完整typed body/metadata门。
> > > >
> > > > 固定baseline路径挂错type/default/variant必须拒，不能fallback ordinary；其它任何path声称此mode也必须拒，不能由候选pin或把body搬到006扩展豁免。专用分支**不要求baseline自身属于1838 entries**，也绝不取消其它historical JSON的固定pin+membership+native深等。
> > > >
> > > > 调用图：真实Git Buffer reader→root/view→model→现partial wrappers/未来共享review core；没有root/view→model回调。真实入口提供readBuffer/readSourceBuffer；旧string便利接口可留作已有结构API，但不能给新baseline variant以解码后hash/非fatal解码的完整信用。原inspectFrozenDocumentBaseline可作为组合兼容层，cohort始终只来自root.entries。
> > > >
> > > > 若采用T已规划的 `git-document-snapshot.mjs`，它只承担真实commit/path/mode/blob/Buffer读取，不引入terminal依赖。旧readGitDocumentSource的docs/*.json输入边界不放宽；新reader不用shell插值、不fallback工作树，拒tag/tree充commit、symlink/gitlink、越界/冒号/NUL等path及缺对象。
> > > >
> > > > ## 6. 时序与完成口径
> > > >
> > > > 保留105项capture→33cc差异，以及9aa父版本1834同/三dirty不同/ED卡缺席四例外。它们不是当前after漂移；不能改baseline sourceSha/原15类summary来消除差异。不同真实review-source的lineage由实际批准对象解释，不自动将所有source强制成33cc，也不重新给已接收内容计数。
> > > >
> > > > 原baseline不在自身1838；规范化review/route真正接收后它最多增加1个incremental migrated，baseline分母仍1838。新设计/回执/测试清单control仍按实际树新增pending；不把source/view正控、纯body结构绿或自造record当完成。最终closure仍须T/共享loader的真实完整批准与当前全集，不以F-1绕过。
> > > >
> > > > 33cc及所有实际source/deliveredCandidate必须在最终交付Git中可取得。固定Git指针不是只写40字串；根另保已接收目标commit的可达历史。清理分支/worktree不得回收唯一被引用源；本研究阶段不操作有dirty工作树的Git整合。
> > > >
> > > > ## 7. 真实pilot与判别力（未来必做；本轮未运行）
> > > >
> > > > 用ownedtmp真实Git对象和已冻结33cc原blob，不造一个后来commit冒33cc；可复用已审的固定对象导入fixture方法。要有足够合法registry/routing/review声明穿透到目标守卫。
> > > >
> > > > 1. **default等值正反控**：完整old default catalog有效合同逐字段/有序16项相等；真实完整catalog1.2正控。使用完整18项合法主体，逐例同时运行 `checkMigratedDocument` 与真实 `validateCatalog`，维持下列既有行为而非加强旧default。删除publicationRules/entryReadings、漏/重复reading与空白conclusion由原generic门拒绝；非空/唯一entry.id由真实validateCatalog拒绝，aligned空id+reading.id可过generic不代表整体过门。schema≠2或缺失由原两消费者拒绝。generatedBy删除键仍由原generic requiredFields拒绝；改成其它字符串或null在两入口均保持旧接受行为，不补requiredValues/类型门。runtimeExecutionPerformed缺失、true、null或字符串"false"由原generic requiredValues严格false门拒绝；validateCatalog不读取该治理字段，维持其原行为，联合链仍拒绝。只对本已拒绝的目标守卫在ownedfixture作同一变造放行校准，不把原本接受的generatedBy值/null变造写成反控或漏洞。
> > > > 2. **root/view与新typed正控**：original raw可作source但无治理不算迁移；合法小envelope/native8深等得到governed；真实checkMigratedDocument/model/progress对同一baseline条目通过来源与正文门，incremental1/cohort增0/approvedCohort1838。还须单篇非作者实际读取新增语义与原捕获边界后才canonical pilot accept。
> > > > 3. **full联合native变造**：改任一八键、entry path/hash/类型/次序/删一项、summary15改17、原unread/reviewRecord/null/status/policy改绿，联刷route/envelope/外部review.after也拒固定source/native门。只移除ownedfixture native深等守卫使同一例进度放行，作校准。
> > > > 4. **范围/身份变造**：移动全体合法payload到006/另JSON且同步type/variant/pin/review；错误path、33cc/blob/SHA、后来commit、tag/tree、缺对象、联改原baseline/常量候选声明均拒。硬path守卫移除仅在ownedfixture作有界放行校准；生产常量不改。
> > > > 5. **format/metadata变造**：错父type/Markdown父、未知variant、variant非JSON、错templateVersion/id、metadata null/array/空owner/空primary/history、currentAudit true或kind错、假新publication/id/业务version、额外native键/双gov/转义后重复status键、非法UTF8，真实完整门拒。不能因route不匹配冒充source深等反例。
> > > > 6. **非递归与旧合同回归**：真实root/view过程不访问model/review/terminal；特殊source分支不递归自身。既有18机器JSON、默认catalog和所有原来源反例保持；machine1.5全部内容和pins无变。全pnpm docs/零lint/diff以及实际质量库存按候选字节实跑，不改产品/旧tests/coverage。
> > > >
> > > > 本轮 V2 的实际旧行为复核（不是未来实现测试）：已实读非作者报告与完整contract probe；对未变的当前完整canonical18项、真实generic model和真实validateCatalog重新执行16种合法主体/变造，today明确固定2026-10-16。两函数、registry、catalog当前字节与5a设计基点逐SHA全同。结果见 `/tmp/type-pal-terminal-f1-default-behavior-v2-probe-20261016.json`，SHA `ef1f83e0891d476f1b9341134b61e68b7e1c9fc465243eefc45230dcdbbad8b3`：
> > > >
> > > > | 情况 | 原generic model | 原validateCatalog | F1要求 |
> > > > |---|---|---|---|
> > > > | 完整原canonical | [] | [] | 正控保持 |
> > > > | generatedBy改其它字符串 / null | [] | [] | 接受行为保持，不加门 |
> > > > | 删除generatedBy | missing machine field | [] | generic原必需键门保持 |
> > > > | schemaVersion改3 / 删除 | mismatch（删除另missing） | must be2 | 原literal门保持 |
> > > > | runtimeExecutionPerformed true / null / "false" / 删除 | mismatch: runtimeExecutionPerformed | [] | generic原严格false门保持，不能捏造validateCatalog的该门 |
> > > > | 删除publicationRules / entryReadings | missing；后者另array错误 | [] | generic原专用字段门保持 |
> > > > | entry.id与其reading.id同时空 | [] | duplicate or missing id（另dependency错误） | 保整体ID门，不宣称generic本身拒绝 |
> > > > | 重复entry.id | unknown/duplicate reading | duplicate or missing id | 保原两层职责 |
> > > > | 空白conclusion / 少一reading | conclusion missing / reading missing | [] | generic原逐项门保持 |
> > > >
> > > > 这份结果只校准原合同的真实边界；new defaultResolver、strict root/view、1.2 canonical pilot、CLI进度/守卫反控均尚未实施，不能借V2观察计迁移或实施accept。
> > > >
> > > > 测试少而精：可用3–4个顶层focused test组织共同合法fixture与有意义原子反控；不为计数拆镜像断言，不执行112工具或历史raw。
> > > >
> > > > ## 8. 顺序和精确最小白名单（未来单Owner；本稿不准入）
> > > >
> > > > **先等L根接收再实施**：L作者当前冻结9e双SSOT。不得在其接受前实际滚catalog或改共享renderer/model/模板；现在仅冻结设计。F-1 build另取L接收后的clean精确根基点，固定33cc root不变。
> > > >
> > > > 拟代码白名单：
> > > >
> > > > - scripts/docs/frozen-document-source.mjs
> > > > - scripts/docs/document-model.mjs
> > > > - scripts/docs/git-document-snapshot.mjs（新、若直接采用T的同名低层reader）
> > > > - scripts/docs/check-document-model.mjs（真实Buffer注入）
> > > > - scripts/docs/report-governance-progress.mjs（真实Buffer/root-view接线；不夹带T loader实施）
> > > > - scripts/docs/frozen-binding-baseline.test.mjs（新）
> > > >
> > > > 拟模板/入口白名单：
> > > >
> > > > - docs/phase-governance/templates/registry.json（catalog1.2/default字段作用域/newvariant；17类型和machine1.5不变）
> > > > - docs/testing/_templates/test-catalog.json（default示例版本）
> > > > - docs/testing/_templates/test-catalog.md（明确default vs frozen-capture）
> > > > - docs/phase-governance/templates/README.md
> > > > - docs/testing/_templates/README.md
> > > >
> > > > 拟canonical pilot与根维护白名单：
> > > >
> > > > - docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json（只添_governance，原八键全保）
> > > > - docs/testing/catalog.json（仅_governance.templateVersion一值滚动）
> > > > - docs/phase-governance/reviews/20261015-catalog-pilot-batch.json（唯一catalog current全部版本/after/evidence同步，完整旧current保留）
> > > > - docs/phase-governance/reviews/20261016-binding-baseline-contract.json（新完整review/反例控制；自身pending，不自审）
> > > > - docs/phase-governance/document-registry.json
> > > > - docs/phase-governance/routing.json
> > > > - docs/ops/audits/code-quality-file-ledger.md 与 docs/phase-governance/reviews/20261016-historical-cards-d.json（只新docs test库存pending/该live ledger当前记录，不复审旧代码）
> > > > - docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md 与 docs/phase-governance/reviews/README.md（准入/索引/真实门/签收）
> > > >
> > > > 冻结正文应另保存为根选定的单一设计路径，提交后才授权；不让实现者自加别的control。作者/根若要改旧测试、其它SSOT/CI/registry schema或完整T wrappers/loader/builder，须另明确任务白名单，不由此包推导授权。
> > > >
> > > > 版本roll必须完整保留旧current/prior与真实before→after，不新增catalog迁移或机器信用；外部after/source/版本/双conformity/入口说明须全同步。既有K49/L/J正文与不可变回执不改。新source-test库存只pending；实际分母与数量动态枚举，不能冻结今日1968或3291为完成常量。
> > > >
> > > > ## 9. 本补案要求闭合的设计counter与停止线
> > > >
> > > > - F-1（原）：source/view本身不构成baseline typed治理；本提案给真实test-catalog变体路径，但未独立冻结/实施/pilot前仍open。
> > > > - F1-C1：父catalog专用entryReadings继承冲突；不许空值偷门。本稿第3节用显式default完整列表解决，须真实等值和校准验收。
> > > > - F1-C2：只选variant格式不代表metadata有效；唯一硬path+JSON父/variant+精确声明/类型门必须同时成立，不能无条件special source bypass。
> > > > - F1-C3：原生JSON.parse会吞重复key，及source/view若回调model会递归。本稿明确限定严格视图解析与单向调用；实现未验证前不闭合。
> > > > - F1-C4：catalog版本滚动会变动L冻结SSOT字节；本稿禁止L接受前实际实施roll。source时序和先前签字不续授新字节。
> > > > - F1-C5（v1确有错误）：§7.1把改generatedBy值与null误写为原拒绝行为。非作者history_cards_a反证报告SHA `e7e4bbe1bf06f32636b1bf2746f5fda1ca1e7c452dd94bab09d416d6fa05584c` 与probe SHA `e75897c02cce734fe764f447dbee4dd8802b8c40e962e16ca9a800039a446fc9` 已完整读。V2明确删键才generic拒，改值/null维持接受；原runtime false为generic literal门而非validateCatalog门；原整体合法ID门也不降。此为作者修正、待非作者独立闭合，不自签agree或实施accept。
> > > >
> > > > 不需要新签名密钥、用户额外批准通道或重新审1838全部源文；仍按现行授权非作者工作流核真实交付。当前只交root与tail下一席独立设计审查，无实施/no new migration/goal active。
> > > >
> > > > 本稿计数自校：实际解析父catalog数组为16项、去两项后共用14项；初版误写17/15已更正，实际字段列表未增删。初稿SHA651806523828de4ae4a80fe49df148e0f2a5da6ff9454f4421e9bbe85ae80771另存/tmp，不将本人的文字计数错误说成现行合同失败。
> > >
> > <!-- original-source-quote:end -->
> >
> <!-- original-source-quote:end -->
>
<!-- original-source-quote:end -->
