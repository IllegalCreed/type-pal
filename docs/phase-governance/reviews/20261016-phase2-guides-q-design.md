# Q6 第二阶段作者指南迁移设计与首篇准入

Status: current
Last reviewed: 2026-10-16
Owner: Codex（冻结与接收）；history_cards_a（提案与候选编写）
Template: design-spec-v1 / 1.0.0

## 问题与目标

六篇真实操作指南仍为 governed-legacy。沿用已批准 guide-runbook-v1/1.0.0，把其来源责任、操作、失败边界和完成定义展开为实质正文；不改变产品行为。本合同只准首篇 content-publication 的 canonical pilot，其他五篇待首篇非作者接收后另授。

## 真值与约束

固定 d5641eef5238d711b8df3c6cda235eecbb7122b0 六源413行，在当前根逐blob相等核验。提案132行SHA80855cd11f1d528c2466416b1580f90b6204a4fd8c027dab3de88d40ef19ae33已完整读取；11交付artifact与17primary/range哈希实际核验。根另实读首篇26行、packages/migrate/scripts/migrate-content.mts36–62、packages/migrate/src/migration-transaction.ts264–281及只读检查CLI20行。无write仍recover可写是直接观察到的调用边界；未执行迁移、产品或旧测试。

其余窄primary语义采用提案明确读域，整文件hash只作身份，不冒全模块复核。第一阶段保真与二阶段干净架构不互相授权；未知UI/保存过滤/DFS/原版canon保持未知。注册模板不滚版本、不新增格式。

## 方案

以下是固定原只读提案的完整内容，仅标题级别下移两级；其“未准入”描述保原提案时点。本页五章及后面的精确首篇准入才是当前设计/写域，原提案不自行授权全部六篇。

### Q 六篇第二阶段作者指南：只读内容设计提案

状态：proposed / 0 新迁移 / 0 仓库写入 / 无 build allowed。本文写于 /tmp，不是任务卡、冻结合同或产品准入。
固定来源：`d5641eef5238d711b8df3c6cda235eecbb7122b0`。六篇原正文逐篇完整实读，共413行；内容归类而非以 guides 路径推类型。后续根若选择其它稳定基点，须逐六blob相等验证，不能偷换 source pin。

#### 范围和现有登记

| 正文 | 原行数 | source SHA256 | 原 live H1/H2 | 旧出链 |
|---|---:|---|---:|---:|
| actor-presets.md | 64 | b318ad86530cd02fe1bea059732edb998c8cf4a0adbcf2e52d3fc923a58a1ec4 | 6 | 0 |
| battlefield-authoring.md | 56 | a4d09755855e28b83e63347be1296fd956a759b9a2b60f08a93d9170ebbf902b | 6 | 0 |
| content-publication.md | 26 | e81d14ed387d6ba4f3a08a005093b4eb492139725ecfa77ede37c74c737d6af5 | 1 | 7 |
| debug-tools.md | 81 | d388aa8189c4d19424a63e5d717a0bc290ce1d2558ad152ce25f383a3e30dd96 | 8 | 1 |
| scene-entry-authoring.md | 34 | af6bdd588d71dfdb73d68cee01cc8cb045d80895faf9757ecfc9fc623528a0ad | 4 | 1 |
| shared-script-author-guide.md | 152 | d0b2fcfdd4a49c0e4ac222d8de7f27b1b176f4c8f48d09172fbfffc69186d14d | 11 | 2 |

六路径均在 `docs/phase2/guides/`。各原文无字面 Owner、Status、Last reviewed、Template；旧 catalog 的 Codex 是治理归属，不倒填成原作者。现有 central 均 guide-runbook/governed-legacy，6/6 已登记，0/6 已真实模板迁移。旧 capture/publication current 不替代内容接受。前五篇旧22/SAVE11、shared 的 Oct11 22/SAVE12 delta保历史，不以常量22/12无差别刷新旧账。
正文类型均拟用现有 `guide-runbook-v1 / 1.0.0`、Markdown，无新type/version/机器variant，无 history overlay。五个必填H2是：**目的、前置条件、步骤、失败处理、完成定义**，不是“参考与证据”。目录导航另由已有 guides/README 负责，不将本包改成第二索引。

#### 逐篇实际语义和五章大纲

##### actor-presets：身份与资源复用，不是行为 prefab

- **目的**：解释人物定义、场景实例和资源引用的职责；三种放置方式及 actor/sprite/trigger 选择不混为行为预制。
- **前置条件**：当前工程、稳定且trim后非空的actor id、已有默认sprite；loaded party只读等原边界。C1-2“当时current14”明确为旧落地快照；当前格式若要说明用 character.ts168/170 的22/12，不能称本轮升级产品。
- **步骤**：创建/放置；共享姓名、默认资源等定义与实例坐标/方向/行为分开；解除人物关联后保留实例当前值和undo；复制定义与表、共享资产引用而不误复制资源；删除引用保护。
- **失败处理**：悬空引用、只读初始队伍、locale同事务、资源缺失/使用中的删除，按原已知行为和未知分别列。解除关联不应删资源。C1-3计划及“保存为人物”等原未包含能力不推断今日已实现。
- **完成定义**：本页完整说明三种入口、共享/非共享、解绑/复制/删除及五个原标题职责；实际产品操作验收/undo测试由另卡提供，本治理无新运行信用。

最强反例：把“复制人物”改成复制全部资源或行为，会丢掉原共享边界；把旧14当当前合法输入会与已读常量冲突。仅见source不足以把所有后继能力都标完成；窄源不够处仍unknown，不补产品事实。

##### battlefield-authoring：环境定义和选择优先级

- **目的**：战场是环境定义，不是队伍阵型；PAL旧映射与通用现代schema分开。
- **前置条件**：合法稳定非负fieldId（现代0合法）、符合类型的背景AssetId；默认24，PAL工程当前52个ID=6..57是固定当前数据观测，不是重认证PAL raw。
- **步骤**：新建默认24/按当前max+1分配；复制共享背景资源引用；选择三层优先级 `startBattle显式 → 明雷hostile显式 → scene`，最终默认24；清空表示继承；编辑背景/manifest原子性。
- **失败处理**：缺失fieldId、背景错误、被引用删除、空表和默认黑屏范围；不把PAL raw0..5空槽变成通用作者输入禁令。原map/formation领域差异保留。
- **完成定义**：五个原验收示例作为作者预期场景逐项保留，值、显式/继承和fallback可由另一实施卡验证；本轮没有重跑五场景。

最强反例：禁止现代0、把fallback改成第一条记录、删除script显式优先级，都改变合同。真实 validate.ts1412–1442允许0；battle-launch-preparation.ts185–218及main4783–4797支持选择链。只解析项目ID52项不冒资产字节/raw/旧引擎全审。

##### content-publication：作者保存与PAL供应重导分开，推荐首个 canonical pilot

- **目的**：当前作者工程是脚本/内容真源，pal-extract提取目录可重建；migrate只重导明确供应分区，不能重建退役完整原版脚本转换。
- **前置条件**：分清author目录、extract源、baseline与editor当前打开工程；写入准入、编辑器停止保存、发布后重载。七个原链接、标签和来源身份保留。
- **步骤**：从根 `pnpm check:content [工程目录]`检查作者工程；编辑器保存；PAL提取/重导计划/明确 `--write`分开；当前schema/workspace与历史管线各路由原路径。
- **失败处理**：**无 `--write` 的 migrate 也先恢复中断事务，不能称绝对只读**；恢复/plan冲突、资源供应缺陷修上游、manifest-last和重载边界按真实来源说明。`check:content`不恢复事务，不能混两个caller。
- **完成定义**：指南给出正确来源责任、可写/只读边界、保存/重导前提、原供应范围/作者正文保留与退役规则。实际迁移成功、字节恢复、E2E演出或用户保存成功仍需单独运行证据，本治理没有执行这些命令。

最强反例：把计划命令写成“没有--write就不会写盘”，与 migrate-content.mts54先调用recover、transaction264–281可能apply/cleanup直接冲突。writer不能为过门恢复旧转换器，也不能直接改生成JSON。

##### debug-tools：DEV排错入口与旧验证结果分时点

- **目的**：D13-1首刀的DEV overlay/console、脚本触发、战斗态构建和帧步进用法。
- **前置条件**：DEV且URL含`?debug`；editor试玩按钮不会自动加参数；参数功能续用不是旧版本兼容。标准保存与内存排错态不同。
- **步骤**：公开打开入口→状态页→原13条console命令表→K3脚本/trigger detached语义→K2战斗预设→K5 gameplay100ms步进。原busy、确认/abort、表单键盘和`?skill`拒绝边界保留。
- **失败处理**：参数缺失、busy、失败/取消、存档和内存态边界；不能从源定义或旧测试报告断言现在视觉已验/每个命令实跑。本轮不启动页面、build或debug console。
- **完成定义**：13表行及G4/K2/K3/K4/K5/G1原来源完整；G1 dist零残留/G4手测/K测试属于旧记录，当前源码只窄核DEV&&debug动态import，不把旧全绿续期。

最强反例：删DEV guard限定或把原G1旧dist结论写成本轮生产构建结果，模板仍可绿但语义失败。未知当前dist或UI保持unknown，不因指南current授动态通过。

##### scene-entry-authoring：prepare/body现入口和未接入的reveal/安全门

- **目的**：场景initial flow的onEnter入场数据与作者界面；不是每次trigger都有第二个入场系统。
- **前置条件**：initial状态onEnter；prepare/reveal数据合同和当前prepare/body两tab分开；仅看可选组件代码不等公开UI可达。
- **步骤**：编辑prepare与普通body；保原开场顺序：music31→teleport59,-23→dither2160ms→婶婶对话；不为格式改数值/时序或加自动reset。
- **失败处理**：reveal无独立UI、reset按钮/default-fade提示缺席；安全目录不等插入/保存已拒所有菜单/存读档危险命令。现窄源只见部分验证，缺口如实列，不新授安全保证/顺手修代码。
- **完成定义**：字段/入口/原规则/开场例及一个原fragment链接都具体可达；界面可操作和安全完整闭环另卡验证。没有视觉或当前全pipeline审计信用。

最强反例：ScriptTree存在reveal分支但默认showSceneEntry=false，不能证明ScriptEditor公开控制存在；目录列了allowed词汇不等所有非法命令都在保存门拒绝。若后续实际窄caller证明功能已变，先报counter/冻结新来源，不以猜测续写。

##### shared-script-author-guide：固定逻辑复用与N6b未来范围

- **目的**：稳定业务语义复用，明确behavior/hook/item-private/structured/shared/template六种选择。正文只有一份，不恢复chunks/旧jump。
- **前置条件**：canonical content22/SAVE12/current-only；稳定ScriptId、显式EntityAddress/self；N6b强类型参数化属已定阶段的后继工作，尚未实现，未开本包产品卡。
- **步骤**：新建/元数据/统一编辑器/场景工作台；callScript+self；生命周期、存档及离场后续跑；物品私有脚本、剧情入队当前状态和重导边界。无copy按钮，不能添加虚构入口。
- **失败处理**：引用删除、self缺失运行时fail-loud；保存/发布时required-self拒绝未在本轮完整证明，不能从runtime拒绝推出；callgraph DFS原明确未实现。未知是待核，不伪称已完成或擅删功能。
- **完成定义**：原六行选择表、十个原标题及例子完整；无重复初始化/运行态污染是相关实施合同，本次无运行。N6b只保链接和阶段前提，旧20/21排期不变当前版本。

最强反例：把“应该DFS检查”改为“已在保存前DFS拒绝所有环”，或把N6b参数化当可用编辑器能力。实际self runtime614–650不等保存完整路径；author-script-core只窄读指定范围，不能认领全产品质量信用。

#### 原文、标题和链接保真策略

1. 六H1原markup/路径不变。原30个H2在对应五章中降一级作为live H3或单独短导航，保持渲染文本/slug/出现顺序；若与新章名撞名，用实际解析器处理而非firstIndex。已有original36 heading序列逐项绑定唯一当前位置，重复标题必须按id和序次匹配。
2. 原七/一/一/二各11href逐occurrence保存原label/href/顺序；可新增有用证据入口。全部11原目标和原fragment在固定d564真实存在，37原Markdown/HTML入链和61个JSON原路径引用已实际扫描；JSON fragment0。61是控制/引用线索，不等61公开可执行runner或61篇内容已读。
3. 原两表保13console/6选择数据行（19data，另header/separator），原代码、数字、日期和不等价状态不被扁平摘要取代。新的五章必须展开上述本篇语义，不能只包原文。
4. 完整413行原source置于不可交互长text围栏，长度严格大于原最大围栏；来源Git/blob/SHA固定，逐字节inverse包括末LF。源旧命令只是原证据，不在审查中执行。各原heading/table/link的live映射和全原文映射分别提供，不把围栏内标题当live入口。
5. 新Owner/reviewdate只治理责任，原metadata不存在如实null/unknown；当前状态仅准确scope的指南可用性，未证能力继续明确unknown，不能由current升格运行/用户观感。最终current/draft依冻结内容责任核定；不为模板“reviewed”伪造验收。

#### 真实producer/caller与消费者

- root package `check:content` → tsx packages/editor/scripts/check-project.mts；editor包 `check:project`同源。原20行CLI只读加载和校验，未执行。migrate包 `migrate:content` → tsx scripts/migrate-content.mts，无write先recover是不同写入边界。
- DEV实际caller为reforge main6495–6530的DEV&&debug动态import；没有浏览器操作。battle选择caller、ScriptEditor/Tree入口与required-self runtime范围见独立source pin附录，不外推整模块。
- 文档公开主门 `check:docs` 依次跑docs-tool/check/model/testing/phase-lore/strict。新候选未写共享routing时，原model绿不能覆盖Q6；必须逐篇直接真实checkMigratedDocument(实际registry, candidate reader)并核record/状态/来源语义。
- `currentSections`只在Q中整选shared指南；checkCurrentSection95–126扫描原始全文，包括text围栏。实际内存反控加入 `历史排期 content20` → 正确拒绝“与源码content22不一致”；故不将backlog旧排期20/21全文复制进shared。原shared22/12全文可以保真，旧排期由原链接指向真实backlog，不加ignore/compat/放宽checker。
- bounded固定Git搜索scripts/package/CI能确证 `promote-semantic-review.mjs`70–91引用六路径，94–116只把旧entry移动/写两个central review JSON，**不是六正文writer**。无确认会覆盖这六正文的专属生成器；这只是所查范围，动态拼路径或人工编辑不作绝对不存在证明。此包不退休任何writer、不执行旧promoter/runner。

#### 四向证据和未核范围

原始/PAL方面：仅旧guide对PAL映射的文字以及固定当前battle-fields52 IDs，未读raw/原游戏，故不新认证PAL0..5/asset字节。第一阶段：六指南的目标是现代编辑器/二阶段作者流程，不改变第一阶段机制、游戏代码或旧测试。第二阶段：17份真实primary的窄行域有Git/blob/range SHA附录；本轮source识别与合同边界，不等完整架构或产品质量审计。目标：六指南真实模板迁移/逐篇review/source-after及来源边界，产品before→after为无行为变化。

关键已核：现代0合法、默认24、选择链、DEV动态入口、migrate恢复可写、当前22/SAVE12、prepare/body实际tabs与有限安全检查、runtime required-self拒绝。未知：actor所有后继UI、全部保存/发布self拒绝、完整callgraph环校验、最新dist零残留和动态/视觉结果。保unknown精确停止相关断言；不将整docsgoal标blocked，也不越界修产品。

#### 准入、pilot和最小未来白名单

当前仅设计。根须先实际读本提案/必要primary、冻结正式提案及完整任务卡、单一CodingOwner/隔离工作树/精确源base，再准入首篇。
建议首篇 **content-publication**：26行但有真实可写恢复边界，能检验“来源责任+五章+全原文+原七href”不会损失语义。首篇canonical正文及同17top/43entryreceipt只自验，非作者全文/actual consumers接受后再放其余五篇；每篇各自五章/独特business oracle/来源映射都要pilot式实际检查，不能由同type首篇包办语义。
最终最大白名单：六MD + `docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-phase2-guides-q-20261016.json`，共7文件。这个receipt路径仅提案，root可在冻结时核定；不新造schema。43每篇含原身份/范围/phase/版本/primary/依赖/caller/legalInputs/oracle/dedupe/counter/history/stop/next/source+after/template/原文保留；真实作者自验pending独立接收。
中央registry/reviews/routes/catalog/matrix/task/board/index由root维护；README、脚本、模板、CI、产品、旧tests、coverage均不在writer白名单。全部旧6current须root保存完整即时prior后定向接入；预期6afterSHA漂移要实跑证实，不能凭P/N或旧覆盖推测、不能作者刷共享账。

#### 必须可证伪的最少验证

- 每篇原source inverse删一字/改日期应拒；每个original live标题/重复slug/表行/旧href丢失应拒；正确完整候选必须通过。Markdown解析要剔合法frontmatter且区分inert源，不以正则把quote当live。
- 实际模板门每篇五章positive及删除一个必需失败处理H2的negative；Status/Owner/date也按实际字段核，不以model未覆盖枚举就视合法。
- publication去掉“无write仍recover可能写”但保模板五章：语义oracle必须counter；现代0改非法、显式优先级错置、reveal/UI或安全过滤虚假完成、N6b/DFS假完成、旧G1冒新构建结果同理。普通结构model可能仍绿，不能称自动检测全部语义。
- shared整文件当前版本真实消费者positive；fenced旧content20 negative已实测。不能因此重写原source字节、加排除或运行迁移。
- Actual source maps、36head11href19data和现有图/structured引用重核；别重犯重复separator/heading firstIndex定位错误。全校验与作者自验/非作者接受/中央接入分层。
- 最终canonical候选运行pnpm check:docs、pnpm lint、git diff --check；E/W/I任何诊断不算通过。共享旧账漂移如实FAIL，根接入后统一真零门。本文无产品/E2E/视觉/coverage执行；历史报告原非零/旧签字不续期。

#### 实际设计探针与交付附录

实际六原文用真实model各报七项缺失（五H2、reviewdate、template声明）；六份纯内存空布局全零、各删失败处理H2均拒。**空布局只是既有type/格式适用性校准，完全不是内容pilot或迁移信用**。真实shared版本反控如上，无repo修改。

- `/tmp/type-pal-q6-source-inventory-20261016.json`：全部6原Git/blob/SHA、原metadata、标题/表/链接与旧registry/catalog投影。
- `/tmp/type-pal-q6-primary-read-pins-20261016.json`：17份窄primary真实EOF、各read range/SHA及整文件身份。battle-field-reference真实EOF52；ScriptEditor最后范围4360–4417，WIP4430上限已修成真实EOF，未声明超EOF存在。
- `/tmp/type-pal-q6-fixed-graph-20261016.json`：固定d564原图/JSON引用/所有旧出链fragment，0issues。图解析不等2015个MD/HTML/docsJSON文件内容全文审查。
- `/tmp/type-pal-q6-design-consumer-calibration-20261016.json`：实际model正反校准及shared版本反控，无canonical候选。
- `/tmp/type-pal-q6-readonly-design-wip-20261016.md` 原稿保留，不覆盖其尚未扫JSON/约54EOF等中间状态。

发现过程的局限原样披露：最初两次猜source路径rg IOerror2，改用真实发现路径；宽callScript搜索只见旧tests/raw文件名和一个raw输出片段，不冒全文/执行；一条库存输出截断后逐篇compact补核；N优先级期间暂停Q。以上不是产品失败，也不改成“从首轮全绿”。没有用户待选的新产品方案，未证项由root后继卡治理；Q build仍须正式冻结准入。

交付前定向校准另保留首正式draft04353a84（同stem-first-draft）：其中recover行号67–69实际是managedFiles调用参数，已直接回读36–62改为真实54；图文件数误写2031已按实际collector2015修正。语义依据与source pins不变，不把两处作者写作定位错误记为产品失败。


### 当前首篇准入

Coding Owner: history_cards_a。根提供新的 clean 隔离工作树和实际父commit后方可写。首篇仅 `docs/phase2/guides/content-publication.md` 与 `docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-phase2-guides-q-20261016.json` 两路径；现有17顶层/43逐篇回执格式、初始只1entry，作者自验为pending非作者接受。其余五MD、README、中央/registry/routes/catalog/matrix/任务/脚本/模板/产品/旧测试/coverage不写。

首篇真实五章、26行完整原source inverse、七href标签/次序/目标、真实来源与recover写入停止线逐项核。首篇由根非作者全文复核及实际consumer验证；不由空布局或同type其它pilot替代。本页自身是新设计增量，仍须其真实独立文档治理，0新增迁移信用。

## 边界与风险

保留所有原日期、旧14/22/11快照与22/SAVE12当前合同的各自轴。不得把migrate计划当只读、现代fieldId0当非法、reveal/安全过滤/DFS或N6b参数化写成已完成；旧dist/手测不冒当前实跑。最强反例、逐篇未知及first-failure披露均保留在上面完整提案。来源或当前caller改变先counter，禁止产品/旧test补丁来迎合文档。

## 验收

首篇须真实内容/原文/回执逐篇非作者接收，实际source字节inverse、七href、五章、状态/Owner/date/模板和可证伪语义oracle有效；移除recover警告即使结构绿也应counter。作者check:docs/strict可能准确因旧中央after漂移失败，必须保真实失败，不刷共享账。根统一接入后才运行真实全门零error/warning/info；静态不授runtime/E2E/视觉/coverage或1838完成。读域与证据锚点同时在DOCS-FULL-TEMPLATE-1落盘。
