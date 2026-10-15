# Testing 十份索引正文与公开 producer 治理设计

Status: current
Owner: Codex（设计冻结与集成）；history_cards_a（实施单一Owner）
Last reviewed: 2026-10-16
Template: design-spec-v1 / 1.0.0
Version: L-index-governance / 1.0.0（frozen）

## 问题与目标

本设计冻结现有十份索引的正文合同和同源producer策略。沿用既有governance-index-v1/1.0.0，0archive overlay，不增第18类模板；本文自身仍是新增待治理候选，不以设计冻结冒计正文迁移。只有本设计与任务卡实际提交后、根传达精确基点，才授权白名单内build。K49已在77b5829e独立接收并通过最终零门；L当前中央覆盖0/10。

## 真值与约束

一手源为9e3fb825426960c8b7d1914a52625a9bdc17b9a3；根在77b5829e实际核10篇blob/SHA及writer/checker/双SSOT与该固定源一致。machine-evidence1.5是独立J原生合同版本，L所用governance-index仍1.0。逐篇源manifest序列path NUL blob NUL sha LF为ee33404129c9839ab19ab1bea6e6e0e30c5ebb16acd90d9bfa32f9f8053ae717，完整manifest文件SHAda78358392e15474e50307a4967aca964428a78cde05411608292f21b4ddc541。

作者设计MD89行SHA30ae94f0971f06e1c372a099af8d2818f8fb8b23caa0a40224b2e104c857b358；逐篇JSON394行SHA32ee16bb60793f64f3fe8dca14377d500228c5714ccfd059e86ff6d19fb5e635；非作者history_cards_c_tail设计60行SHA11e1ffa85afa5d0a1755e3ee20789be8e65a37858e0a9a9db97900efff054282，design agree不预签未来implementation。下方提案快照保原draft/未实施时态，只是历史proposal；本页根冻结决定为现行唯一准入合同。

源清单captured SHA是更早工作树的历史捕获事实，不等于所有33cc:path或9e:path raw SHA；不得改baseline避来源门或误称当前after漂移。每篇保本冻结实际source Git/blob/SHA，必要时另用真实Git历史解释capture→review-source变动，不自动给1838来源重审信用。提案check-testing 426–623上限超真实EOF616；冻结读取范围按426–616，不能声称存在623行。


完整十篇源pins如下，均在上述固定sourceRevision；这里只冻结原源，并未给未来after签字。

| 原路径 | 行数 | Git blob | SHA256 |
|---|---:|---|---|
| docs/testing/indexes/README.md | 15 | ff1e27cce0cfeb67d6b7229f5da2410aab074c35 | 685f06b819e1e7bc5f7349e9e7073a56a3bc1a904dbee34837ab30d4726db8b9 |
| docs/testing/indexes/by-domain.md | 46 | c35b4e3f7b3029620452b8b1761bdfb73a8b1d07 | 56a10e113a89246c2ab40e8cdb236e9782122a8d83435b538c637a7fd6e06840 |
| docs/testing/indexes/by-engine.md | 54 | ccc429af12d63c23c8faa0e21cf26de87a0e0822 | b352588f442cfa27137a59f81c77b5b12a43b4234261a4bde4ac4b8a13da1337 |
| docs/testing/indexes/by-module.md | 106 | 9b0fe4b9308a37ee959e41fb6d37efbd3572c0b5 | 5fc38a5b75e94f4d90c25a0d2530d9e2c41784d464ded3884df747e0a8e465ca |
| docs/testing/indexes/by-owner.md | 24 | ffc5f19e30c1b27b08d3abe529afabf5a70b9bac | cef0b440d5d84fc327a5c15b8f2c4ccf2e84b373a1cb1726345384bf90ebcada |
| docs/testing/indexes/by-phase.md | 47 | 95dfa17c30c9b2bd1e94fdd96f667ae9465d2701 | 55798fa795c271b19a87f993c3c83c9dec4ef90e1fe06e7c0cdab1357204a839 |
| docs/testing/indexes/by-stage.md | 12 | c887a184f605d4a41878f49b93ee1a8c9e6c4e2d | 93ddee5ce07bd190d124bf96895c42844936a0ee429a41cc5c7ce73d9b38cddd |
| docs/testing/indexes/by-status.md | 41 | 47e6e10b02e02b3d1822d72448da0b8f3f4e5740 | 0db02acf1366a466045f97f72567354af5ffed019ef89b04b74a2474c0512241 |
| docs/testing/indexes/by-tag.md | 159 | 4e6bef1917fbe9def8a5f9a9003531dd0921fd74 | d7be03fca69db05770ee02cc4c044b6137991dbffb9b740d401c6b9b64e0609d |
| docs/testing/indexes/legacy-by-domain.md | 417 | 897d9a634eb4fb88b6c17208fb44b13dc84b283c | 12274d26fa4c69ec56bf43d7028e014efc98fad4af1bbe3485ba89e597bcc47b |

## 方案

### 根冻结决定与准入合同

本节由根Codex在实际阅读原提案MD89行、完整设计JSON394行、161行writer、前九篇索引504行及非作者独立设计60行后冻结。根不冒领legacy-by-domain417行、两SSOT全部字段或572下游正文全文审查；history_cards_a与非作者history_cards_c_tail均已实际读全部十篇921行。独立设计11e1ffa85afa5d0a1755e3ee20789be8e65a37858e0a9a9db97900efff054282未授未来实施accept。

1. 冻结既有governance-index-v1/1.0.0用于全部10篇，0archive overlay，不新增template/variant/机器原生格式。每页具体五章沿前文逐篇设计，而非统一空白wrapper。原H1及85原标题渲染ID全部保留，分组H2降H3，不让新章占掉原slug。
2. 九派生页不重复quote整张实时表。完整源commit/blob/SHA、source→after行/组/标题/链接映射与原字段值是保真证据；不能用Git保存代替实际正文迁移/新层独立阅读。人工README同样有完整原源pin与九原链接映射。
3. 选择唯一列名“旧分类账 reviewStatus”替换旧“深审状态”，保留359原值。原reviewed是movedTo/closeout成员关系，非本轮语义accept；12lab路径汇同一history不得算12次执行。原tool目标closeout计划不是合法runner。
4. 两真实业务SSOT为docs/testing/catalog.json和docs/testing/legacy-flat-classification.json；禁止沿提案简称生成classification.json第三来源。catalog18/legacy359/维度成员数字由实际输入计算，或明确为固定源时点数字；不固化为永久模板常量。任何合法输入变化后当前范围计数与真实成员同步。
5. 当前导航Status=current与行current/proposal/rework/verified、source出版、历史动态验收、当前深审分轴。006保持固定源rework、route保持proposal，合法未来catalog变化仍按真实来源，不硬编码冻结假状态。Owner Codex是新增producer/文档治理维护职责，不倒填原Owner；原十文档都无Owner/日期字段。
6. Last reviewed固定2026-10-16，并在正文精确限定为本次索引规则/来源与导航语义审查；不认证所有linked reports、359来源或运行。真实语义scope以后变更需新审查与review更新；执行时钟、mtime、最新catalog.lastVerified均不能自动续期。输入变化可以更新投影范围，但该日期不随重生改动，也不得称旧日期签收了新body。
7. 保留公开CLI和exported writeIndexes(root)。writer在任何输出写之前必须读并解析两个必需SSOT，缺分类账不得fallback到empty抹359行。pure renderIndexes默认空fixture可保留。先完整render返回九内容再逐个写，不新扩产品schema或无限事务保证。
8. 保留check-testing.mjs的真实validateIndexes整文件逐字比较；不得改该checker、剥metadata、忽略章节、只比表或放宽stale。renderer与九产物同一候选提交，README仍人工维护，不成为第十个writer返回文件。
9. 单一作者history_cards_a白名单严格13文件：scripts/docs/generate-testing-index.mjs；新scripts/docs/testing-index-governance.test.mjs；docs/testing/indexes实际十篇；docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-testing-index-l-20261016.json。根负责中央registry/routes/reviews/matrix/quality-file-ledger与任务卡。禁止作者修改产品、旧tests、coverage、SSOT、共享checker、模板、CI、governance.md或K49文件；“四维→九视图”指南窄同步留根后继，不归L作者整篇信用。
10. 作者须在隔离codex/docs-testing-index-l分支，自根冻结提交开工；冻结K af42与所有旧分支/不可变回执保留。不得reset/stash/覆盖现有状态；建分支前核现有clean，源10doc/writer/twoSSOT字节与9e pins一致。共享machine1.5只是J原生合同版本，与L使用的governance-index1.0无关。
11. 必要focused新文档工具测试应少而精，用真实exported writer/consumer/model和ownedtmp，不执行产品/旧工具。独立fixture oracle列明六stage/006rework、18唯一ID、各组成员及多值排重、legacy359/11域/227target、12lab聚合与359原reviewStatus。不能只render再比较同一render来证明语义正确。
12. 实际ownedtmp反控：旧固定161行writer确能覆盖模板sentinel，仅在自有tmp复制writer/输入/假输出，不在真实repo试探；新writer同场正控保README/SSOT/无关sentinel，九页二次幂等。缺任一必需源时非零且九已有/缺席输出和README均不改变，不以缺Git/env或另一个字段错误当命中。真实CLI可在复制完整必要模块的ownedtmp执行，仍只写九文件。
13. 逐一篡改九页metadata/五章/行status/链接/标题以及删除一页，真实整文件validateIndexes拒绝；合法domain/tag/engine/owner/phase输入变化只改变对应成员与派生计数，不创造执行或续期review日期。纯renderer/validator共享错误须独立oracle与非作者全文核反证。85标题ID、572原出链、11原入链由实际GFM逐项保留，新链接/fragment也核目标；原0fragment不冒称修断锚。
14. 每篇完整作者review record含source revision/blob/SHA、after SHA、核心结论、原身份缺失/新增Owner、primary source/读域、phase/依赖/版本、公开入口/caller、合法输入、oracle、排重、counter/历史/原始至新语义、supersedes/停止线/下一步/模板符合性。作者回执pending非作者接收，既有原生字段不伪造；新回执本身也进入新增pending分母。receipt保真实源与测试结果、首次失败，不把49K/旧359/本批生成动作冒计深审。
15. 作者自测后交精确13文件候选commit与完整证据，不合main，不自签done。根与非作者再逐篇真实读十新正文/全部receipt/producer/newtest、跑实际反例/文档全门/零lint/diff，通过后才接中央10/route10与SHA，非作者作者自验不互代。新测试inventory只pending，不加closed信用。未通过留draft/rework，L仍0/10，goalactive。
16. build allowed只在本冻结内容与任务卡由根实际提交后生效，并由根内部明确传达精确基点；本/tmp准备稿本身不授权实现。无用户转交提示，后继由Codex内部执行。


### 作者回执的既有字段合同与 pilot

L回执沿K作者回执schemaVersion1的同一17个顶层字段及43个公共逐篇字段，不再发明native format。类型和用途沿现有原生形状，值换成L实际来源/导航/producer范围；无catalog单篇身份的九派生页不塞K额外3字段或给catalog18选一个假id。使用同形一篇ownedtmp pilot先核来源/after/原身份缺失/模板与真实结果，不把receipt本身自称machine-envelope已完成迁移。完整十项交付后再非作者读，回执自身追加pending增量，后继按全量机器文档设计真实治理。

- 顶层17字段：schemaVersion、kind、task、date、owner、status、sourceRevision、approvedSourceManifestSha256、frozenDesignSha256、summary、authority、readScopes、notRun、checks、entries、candidateManifestMethod、candidateManifestSha256。
- 每项43字段：path、sourceRevision、sourceGitObject、sourceSha256、afterSha256、sourceLines、afterLines、sourceReadScope、coreConclusion、originalIdentity、governanceOwner、status、docType、templateId、templateVersion、family、historyOverlay、historyOverlayTemplateId、historyOverlayVersion、phaseAnchor、versionAxes、primarySource、dependencies、publicCallers、legalInputs、businessOracle、dedupe、counterReworkBlocked、history、supersedes、supersessionScope、beforeAfter、userVisibleBeforeAfter、stopLine、nextStep、templateCompliance、toolAssociations、runtimeExecutionPerformed、candidateSha256、candidateGitObject、originalPreservation、linkCheck、sourceReviewStatus。
- status/history/templateCompliance各保原object类型，不改成未经设计的新原生扁平结构；根中央接入时另规范化。toolAssociations为[]，不蹭112历史工具审查；writer新源码/反例证据入既有checks/readScopes/primarySource，不执行那些工具。
- originalPreservation明确采用fixed-Git-source+逐行/成员/标题/链接映射，quote=false，不伪填K的quote inverse proof。candidateManifest按十body排序path NUL afterSHA LF，producer/newtest/receipt本身另按精确13文件交付清单核，不能自hash循环。
- checks中按真实执行分别记录新focused合同、旧writer-ownedtmp反证、新writer/CLI/缺源nonmutation/consumer篡改/合法成员变化与日期、GFM和质量门；source-native日期/候选与新执行时点分层，首次失败/未执行不得改绿。

## 边界与风险

真实反例是现旧writer缺分类账时可生成legacy空表，而另八页保持一致；renderer与consumer共用同一错误也能自洽全绿。公开CLI仍有文档caller，不能退役；整文件比对、真实来源和独立行/状态oracle缺一不可。索引导航current/原出版verified/旧分类reviewed与本轮内容接收分开，359行或多值成员绝不是新增测试/运行。

本设计只治理十篇索引及必要同源文档工具，不改产品、旧测试、coverage或业务SSOT。已知capture→review-source时序只按真实Git解释，不替换baseline或把它伪称after漂移；原无Owner/日期不倒填。作者证据只消费自有tmp，不重放旧业务工具或原raw；新JSON回执自身待真实机器文档治理。

## 验收

根负责前提/单一Owner/白名单，history_cards_a交精确13文件候选。非作者逐篇全文读十新正文和完整receipt、producer/newtest，核五章内容与85标题/572原链接/11入链、源Git和source→after映射；核真实writer/CLI写域、缺源nonmutation/二次幂等、consumer篡改拒绝、独立成员oracle与固定审查日期。只有来源、语义、真实反例及零静态门均通过，根才增加10条中央与路由；作者自验、生成动作、旧359或索引current不能当独立accept。

最终该批按实际字节运行pnpm check:docs、pnpm lint、git diff --check，零error/warning/info。若候选反证、来源、writer重生/完整consumer或任一前提失败，维持draft/rework，不开始越界补产品或自刷SHA。全量目标仍须完成1838及全部增量、独立全scope语义审计后才集成main；本设计不是该目标完成证据。

### 当时只读提案全文快照

以下完整89行保原语义，所有“待根冻结/拟/建议/未实施”等只属于先前proposal时点；列名、路径、计数、读取EOF、Owner和白名单的最终选择以上文冻结决定为准。

> # L：testing/indexes 只读语义与 producer 设计
>
> 状态：draft/design agree（需根线程冻结后才可实施）。本文不是 build allowed、迁移候选或独立模板验收。K 分支 af42cdeb23d62afbb63985184efc4c8bb9361a08 保持干净冻结。
>
> 固定读取源：9e3fb825426960c8b7d1914a52625a9bdc17b9a3。未将根工作树未提交 J3 当来源。
>
> ## 1. 实际分母与来源
>
> - 实际 10 篇 Markdown、921 行：README 15 行，九份生成视图共 906 行。不是“9 篇总计”。固定源中央 registry 与 routing 实查均 0/10。
> - `/tmp/type-pal-l-index-source-manifest-20261016.json`：每篇 Git blob、SHA256、原行数；清单序列 `path NUL blob NUL sha LF` SHA256 为 `ee33404129c9839ab19ab1bea6e6e0e30c5ebb16acd90d9bfa32f9f8053ae717`。
> - `/tmp/type-pal-l-index-design-20261016.json`：十篇逐项五章大纲、原身份字段缺失、每篇 pilot oracle、生产者/真源以及完整来源 pins。
> - `/tmp/type-pal-l-index-static-read-20261016.json`：固定 Git 源的实际 Marked GFM token 链接图及维度统计，未执行 renderer 或 writer。
> - 十篇正文均已全文实际读取；大表分块续读，没有把初次截断输出算全文。共 85 个原 H1/H2、572 个本地出链，目标全部存在。原出链没有 fragment。
> - 固定源全部 1224 份 Markdown 仅作机械 GFM 链接扫描，不授全文语义审查信用。入链共 11：README→九视图 9 条，testing/README 与 e2e/README→indexes/README 各一条；全部无 fragment。未扫描 JSON 字符串/HTML href 作为 Markdown 入链。
>
> ## 2. 核心判断与最小方案
>
> 十篇均按实际导航目的拟绑定 `governance-index-v1/1.0.0`；不需新增模板。九页是当前机器投影，README 是当前人类导航，不能因含旧记录就把整页绑定 archive-record。历史事实边界在“当前状态/证据与下一步”中逐项解释；源快照/逐项映射和 before→after 由真实迁移回执保留。当前不执行这些迁移。
>
> 保留 catalog 与 legacy-flat-classification 两个现有业务 SSOT，不将 Markdown 反读成新 SSOT。保留公开 generator；让纯 `renderIndexes` 直接输出各自具体五章，不允许仅手工修改九页后期待下一轮重生成保留。README 不在 writer 的九文件返回表内，不默默扩展 writer 到第十篇。
>
> 现有 `validateIndexes` 整文件比较必须保留。不能为新正文放宽为只比较表格、剥离模板头、忽略当前状态/责任段或关闭 stale 检查。renderer 和九产物必须同候选提交，独立复核逐篇确认具体语义，才能接中央。README 同候选人工迁移，根仍负责中央/账本，不让两个 Owner 同时写 producer 或生成页。
>
> 模板新五章固定为：目的、范围、当前状态、入口与责任、证据与下一步。原 H1 全保留，原分组 H2 在“入口与责任”中降为 H3，标题文字不改，保持 85 个原渲染 ID。源码证据/来源/输入/排重/停止线/下一步写入对应五章，不使用空白通用 wrapper。
>
> 不在生成页再 quote 一份完整实时表格形成双真源；现有分组/行/链接作为活正文原位进入五章，原源 Git blob 提供完整回读。若冻结验收仍要求完整原 quote，应放不可执行历史区且明确仅固定源副本；不能从 quote 读取/维持当前投影，也不能以保留 quote 代替新章具体归纳。
>
> ## 3. 每篇具体绑定、计数与 pilot
>
> 每条均为该页自己的拟定 pilot，未执行。原全文 source pin 逐项见 JSON；以下五段依次对应五个必填 H2。
>
> | 文件 / 原行数 | 具体五章语义 | 最强反例与 pilot |
> |---|---|---|
> | README / 15 | ①九维检索目的；②九页与 catalog→canonical/evidence 阅读链；③导航 current 与行状态分开、原 Owner/日期缺失；④九原链接、人工维护 README / generator 写九页的责任；⑤源锚点、重生/审查顺序与无执行信用 | writer 不得覆盖人工 README；testing/e2e 两入链与九出链全保留；README 不是第十份机器输出 |
> | by-domain / 46 | ①工程域查证据；②18 ID、5组(e2e9/editor2/ops1/phase1-runtime1/runtime5)；③导航有效性不改行状态；④原五标题/18链接与 catalog Owner；⑤domain 字段和 canonical/evidence 权威范围、冲突回真源 | 18 ID 各一次；不得用路径推域，合法改单项域只改变相应成员关系 |
> | by-engine / 54 | ①引擎适用性检索；②4组31成员/18唯一 ID(content1/editor4/game11/reforge15)；③成员不等于实跑；④四原标题/31链接和原行状态；⑤engines 数组来源、未知回真源 | 多引擎 legacy audit 不可当多次执行/接受；单页篡改引擎或链接被精确比对拒绝 |
> | by-module / 106 | ①domain/module 查功能；②17组18 ID，runtime/battle 两项；③同组并非重复执行或合并真源；④17个带斜杠原标题/18链接；⑤组合字段规则、模块冲突回 catalog | battle 两 ID 均保留，16组各一；原斜杠 GFM slug 不因降标题级别丢失 |
> | by-owner / 24 | ①出版维护人路由；②Codex 一组18项；③表 Owner 不等于索引作者或独立签名；④保留组/18链接并另列治理维护责任；⑤Owner 来源与责任冲突处理 | 不能把 Codex 标签当本轮非作者 accept；变更一项 Owner 只重分该项 |
> | by-phase / 47 | ①ops/phase1/phase2适用性；②29成员/18 ID(1/11/17)；③不交换两阶段真值；④三原标题/29链接，stable ID 排重；⑤phase 数组/报告各阶段源边界 | phase1 旧验证不能升为 phase2 通过；重复成员不能涨执行分母 |
> | by-stage / 12 | ①六阶段报告入口；②严格 kind=e2e-stage，001–006；③5 verified+006 rework原值；④六行原链接及 checkpoint/录像归报告；⑤kind 过滤、后续重跑须真实任务 | proposal route 不得混入阶段；本页 current 不得使006变绿，不能恢复旧 runner 授权 |
> | by-status / 41 | ①出版/阶段状态检索；②4组18 ID(current11/proposal1/rework1/verified5)；③页/行/本轮深审三轴区分；④四原标题/18链接；⑤生命周期来自 catalog/governance | 机械统一 current/verified、006转绿、proposal升实施承诺，均为 counter |
> | by-tag / 159 | ①主题多值检索；②30标签66成员/18 ID；③visual/document-audit 不是已看图/已审证明；④30原标题/66链接，ID排重；⑤tags来源、增删仅改变成员 | 不能以66链接当66测试；visual标签不得生成当前视觉通过结论 |
> | legacy-by-domain / 417 | ①历史原路径→迁移后目标；②359行11域227唯一目标；③旧 reviewed/migrated/basis 原值不变，非本轮深审；④11标题/359链接及列题语义澄清；⑤原 SHA/reason 回分类账、当前审查回中央，旧工具无新授权 | 12 lab行汇同一history不能计12执行；工具指计划不等于runner；不得声明359本轮全文accept |
>
> legacy 十一域原计数：content49/cross-domain12/e2e6/editor99/extraction2/migration21/ops27/persistence3/phase1-runtime9/quality52/runtime79。总和359，仅来源分类计数。
>
> ## 4. 状态、身份、时间与证据职责
>
> - 十篇原来均无文档级 Status/Owner/Last reviewed，不能补造“原作者 Codex”或原审查日期。新治理责任在准入时由根明确；拟 Owner 为当前指定文档维护者，写清为新增治理责任。
> - 九视图原行 status 来自 catalog，保持 current11/proposal1/rework1/verified5；页面拟 current 只指导航有效。source/publication current、原 E2E verified、本轮模板验收和 runtimeExecution 是不同轴。
> - 359 行原 `reviewed` 由 classifier `Boolean(options.movedTo || closeout)` 产生，basis 为 movedTo 成员时取 reviewed-migration-batch。它不是逐篇语义审查算法。建议把旧“深审状态”列题明确为“旧分类账 reviewStatus”，数值不改，记录列名 before→after；或者保留旧列题并紧邻明文限定，冻结时只选一种，不添加新真假状态 SSOT。
> - generator 的模板文案配置可承载每页用途/范围/维护角色/真实首次迁移 review 日期等展示规则；不能复刻行数据/状态或读取输出保留 wrapper。九页元数据随 producer 版本评审，不用第二份手工 current 表。
> - 禁止使用执行时钟/最新 catalog.lastVerified/输出文件 mtime 自动生成 `Last reviewed`。只能填真实完成该层语义读取的日期，标清审查范围；之后重生不自动续期该日期。SSOT 改动后的产物 SHA 仍须实际非作者读差异、中央 review 更新，旧日期或“generated”均不授新信用。
> - Provenance=固定 source revision+blob+SHA，运行证据仍回报告/evidence；历史=原视图与 source pin/明确更正；supersedes=此次仅替换同路径投影版式，不 supersede 原报告、执行或 catalog 原状态。机器化 row 数据、业务版本及原 sourceRefs 不变。
> - 停止线：缺任一真实 SSOT、字段或目标、计数不闭合、同一ID重复身份、source→row差异无解释、模板/字节对照失败、producer重生丢章节、未经审查续期日期，均留 draft/rework，不接受模板外观作为完成。
>
> ## 5. 真实 producer / caller / guard 源锚点
>
> 以下均固定9e源；只读，未执行 generator/runner。
>
> - generate-testing-index.mjs **1–161 全文**：9–12 loadCatalog；20–143纯 renderer；28–37 stage过滤；39–86 status/tag/owner；87–106通用分组；107–135分类账；136–143恰好九输出；146–155显式 writeIndexes(root)全覆盖写九文件；158–161公开CLI。README不在返回表。
> - check-testing.mjs **1–172、190–317、331–409、426–623 窄域已读**：6 import纯consumer；10–20合法出版状态/依赖只current|verified；338–349缺分类账拒绝；426–550 catalog字段/日期/依赖/源路径校验；552–562九页整字节一致；598–610 audit串联所有门。没有调用 writeIndexes，检查命令不负责自动修正文档。
> - check-testing.test.mjs **180–211**：184–209现有单条渲染测试只对一个stage fixture的四页regex断言；测试名“deterministic”本身不能证明九页幂等或模板符合。
> - classify-testing-legacy.mjs **112–204 窄域**：118–136旧 reviewed/basis成员关系；176–201迁移目标/历史lab聚合路由。未声称本轮全文复核该classifier或359来源正文。
> - docs/testing/governance.md **48–79**：52–58 lifecycle与依赖门；63公开生成CLI；现“四维索引”措辞落后于实际九页。拟未来由根批准单行更新为“多维索引/九视图”，不把该指南整篇纳入L作者信用或擅改。
> - docs/testing/indexes/README.md **1–15 全文**：公开CLI及九视图。docs/testing/README.md **1–24窄域**：8入口、11–14 SSOT说明。e2e/README入链只机械图发现，不声称全文再审。
> - package.json **全文已读**，6–7 check/check:fast→check:docs；39–42 docs-tools/check:docs/check:testing-docs→check-testing。所有package manifest和CI静态检索未见直接generate-index任务，不能因此退休文档公开CLI。
> - .github/workflows/docs.yml **全文31行已读**：26 node --test docs-tools仅间接 import纯renderer；28 check.mjs、31 model。当前CI没有显式 check-testing/progress/strict命令，不把该workflow宣称为完整L投影检查。正式接入应至少实际运行package文档全门；是否补CI由根统一定范围。
> - 额外 bounded grep `indexes` 命中 build-phase-lore-governance.mjs **1–53全文**：输出在docs/phase-governance，非testing/indexes；build-testing-layout-closeout.mjs **1–52**仅把indexes列为允许目录，输出迁移JSON，未证明为L writer。未找到第二个写L九文件的producer；这只是已检索 tracked scripts/package/CI 范围的结论。
> - 模板registry governance-index项及governance-index.md全文已读，使用现有五章/1.0，无新合同或模板类型。
> - catalog18与classification359只按JSON完整解析并逐项提取投影相关字段/路径/统计，不声称全字段语义审查；十篇linked canonical/evidence/old tools及产品源码没有全审或新执行信用。
>
> ## 6. 未来最小写入所有权与真实 ownedtmp 反例计划
>
> 准入前不实施。建议单一 L Coding Owner 同时拥有 generator 模板输出、必要对应 docs-tool tests、人工README与九产物，避免 writer/body 双Owner竞态；root保持共享中央/registry/routing/SSOT Owner。具体白名单须落任务卡后生效，本文不授写权限。若根分两包，先冻结 renderer 候选，再同源生成并独立读十篇；不能先接受手工九页。
>
> 计划使用真实 exported `writeIndexes(ownedTmpRoot)` 和真实 `validateIndexes(catalog,ownedTmpRoot)`，不会以写仓库的公开默认CLI作试探。ownedtmp 必须新建唯一临时根、仅复制固定候选源码/输入；测试产物不进docs正文。
>
> 1. **反控标定**：在ownedtmp预置受保护模板sentinel，直接用旧真实writeIndexes(root)重生，观察九文件模板章节被覆盖，README/其它文件字节不变。此失败证明现有producer冲突；不是拒绝并退休公开CLI。
> 2. **新renderer九页真实合同**：所有九页均经实际checkMigratedDocument(各自route,真实registry,临时读回调)，加README共10篇；五章应是具体语义。共享model未登记这些页，不能复用别的150篇绿门作L覆盖。
> 3. **独立业务oracle**：固定fixture独立断言18唯一ID、5域/17module/4engine31/3phase29/30tag66/6stage、各status原值；legacy359/11域/227目标与12lab聚合。oracle不能仅调用同一个renderIndexes再逐字比较冒充语义验证。
> 4. **九页幂等和写域**：连续两次writeIndexes(root)字节相同；同输入不受当前时钟影响；真实README及无关sentinel/SSOT字节原封。copy相同源码到ownedtmp scripts/docs 下运行其真实CLI，可验证入口使用同一writer且仅九页；fixture复制无需改生产CLI路径规则。
> 5. **实际consumer篡改拒绝**：每次只改临时一页的metadata/五章/一行status/一链接/标题，真实validateIndexes均必须报stale；删除一页报missing。不能绕过正文后仅行比对。缺分类账的真实audit已拒绝；建议writer预检该必需输入再写，避免公开CLI当前fallback空表静默抹359行，纯render fixture默认空分类可保留。
> 6. **合法SSOT变化**：独立fixture改一个合法domain/tag/engine/owner/phase后只相应成员改变，不生成新执行事实或更新Last reviewed；错误status、重复ID、不安全路径走真实validateCatalog拒绝。006保持rework与route proposal是固定源真实断言，不能拿无限合成变种替旧执行。
> 7. **历史/来源反例**：把reviewed改写为本轮accept、以closeout计划当合法runner、12lab行算12次执行、跨engine/phase/tag重复增加测试数，都由非作者逐篇source→after审查counter；机器门只证明结构/投影，不能假装理解这些句子的语义。
> 8. **原图与GFM入口**：真实Markdown解析确认572原出链保留、85原标题slug仍live、外部两入口仍可达；新增来源链接/章节fragment也校验真实目标。原无fragment不能伪报“修复了旧断锚”。
> 9. **门与校验信用**：实际文档工具必要反例、scope合同、check:docs/lint/diff均零error/warning/info；中央接入前明确0/10，根非作者逐篇接受后统一添加真实review/source/after，缺记录不手刷SHA跳过。原quote是否必需在准入时明确，不能在验收中临时把完整sourcequote视为当前第二表。
>
> 目前只完成固定源全文阅读、静态消费者/写域核查及GFM图，不执行以上任何writer/反例/文档全门，也没有迁移任何L正文。无产品、旧测试、coverage、浏览器、raw读取或执行；K af42及其不可变回执未改。
