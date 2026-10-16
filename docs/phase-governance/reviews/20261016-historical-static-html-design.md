# 三份静态HTML历史原型：格式合同与bootstrap准入

Status: current
Last reviewed: 2026-10-16
Owner: Codex（冻结与接收）；html_contract_refinement（bootstrap候选）
Template: design-spec-v1 / 1.0.0

## 问题与目标

三原型共811行尚未迁移，现Markdown默认合同每篇实际拒8项；不能仅加sidecar或把注释冒可读正文。保持17type，拟冻结archive-record-v1父1.1.0及唯一historical-static-html-v1表示合同；当前注册表仍1.0，未发布HTML变体或改任何原型。先解决真实直接依赖/full-history安装前提，再代码/库存、版本轴、单篇pilot依次独立验收。

## 真值与约束

原源固定33cc2df50c7279d2750ddad4fcf6c373b7b2bda3三regular100644 Git tuple为信任根，原154提案固定164、198精确与C3固定782读基点各保历史。后继已接受655b8c687cb3e568c85fa53084d503e40b845e6a三源与关键model/progress/F1调用方实际仍逐字节相同。原作者/日期unknown；v2仅CSS新增无对应DOM、place画布占位及July1当时对齐，不授当前产品或视觉信用。其余12testing HTML不套本格式。

根已读154原提案、47首counterMD、198精确合同、113C3及C3独立384JSON/28MD；原51独立设计报告按其真实811全文/实际probe信用复用，不冒根本轮811fresh或完整1076旧counter人工读。C3后继195项只语言/身份/调用前提；15旧测试绿仅当前基线，不预签未来代码。全部10原件完整UTF8/原报告已封存控制，版本清单仅机械影响枚举。

## 方案

下列三原稿只将标题下移两级；原“未冻结/未准入”等属于相应提案时点。原154与后继冲突处由198精确合同和113C3加严替代：双CLI必须接线、直接依赖/CI3前置包获本页窄准入、源API是专用HTML Buffer adapter、按需同步parser、第9review/fullprior、全部62历史叶保护、代码库存先接收提交再定版本轴。当前准入只见末尾阶段A。完整原字节在控制内，禁止全局版本替换或旧兼容fallback。

### 原只读提案（历史）

### 三份历史静态 HTML 草图的归档格式设计提案

Status: draft — 只读设计，未冻结；0 份新增迁移，未授权实现或 canonical pilot。
Owner: history_cards_a（本提案）；未来代码、正文、中央维护 Owner 由根在开卡时分别指定。
Source: 164aee33212554724994aa2873754e26c961d236。三份 HTML 与 approved33cc 的 Git blob/字节逐一相同。

#### 1. 实际范围与内容判断

仅纳入逐篇实际全文读取的三个历史 UI 原型，均建议 `archive-record / archive-record-v1`，不是当前 design-spec。
保持 17 类型总数不变。提议 archive 父版本 `1.1.0`，新增 `historical-static-html-v1` 变体；尚未冻结或实现。

| 原文件（docs/phase2/archive/mockups/） | 实读行数 | Git blob | SHA256 |
|---|---:|---|---|
| actor-mode-v1.html | 266 | 120a0d32a0074992d28878f6acba730d57712589 | 0f1ecdeaa85d9d49eeba091859d1eb07d50d5ca562cbcdaa937b777747646e3f |
| actor-mode-v2.html | 291 | 38182d2e8757b046b987a9fe3ce214e61e8ed3ec | 688008dcc0c1db9d478a15f375ce60bbbf139ed8910e0667aa78dc7de367ba60 |
| place-mode.html | 254 | f176cc3fdfe30b8eb3d01d929262f3ced186b4ee | aacdffba3f76e92554ddf29e1317062b47e83ae4a3d184a2c495cfb8a05b136d |

三份共 811 行，全部 markup/style/注释/文本实际读完，不执行 HTML/JS/浏览器。README 原11行也全文读取。
HTML 均无原 Author/Owner、创建/审查日期、Status、Template、content/SAVE 声明；不能把旧中央 Codex 倒填成创作者。
`v1/v2/v3` 是 title 内的原型名字，不是模板、schema 或运行版本。原日期/原作者 unknown；新增 Owner/日期仅属治理。
实际纯 parse5：每篇一份 html/head/body/style、body 三个顶层 div；无 script、事件属性、iframe、href/src、id，parse error 为0。
静态输入框/checkbox 可有浏览器原生行为，这不等于应用保存、动画或编辑命令已接线。

- v1：角色列表李逍遥/游魂，四方向12帧、站立0/3/6/9、走路步序[0,1,0,2]和100ms文字；右栏单头像、样例战斗数值、六装备、三仙术、B2占位。
- v2：body 原字节与 v1 完全相同，仅 title 与新增25行样式不同。posegroup/posecard/portraits等19个新增未使用class只有CSS定义；没有特殊动作卡或多头像实际DOM，不能称其已出现/工作。
- place：原title为“布置模式 mockup v3”；五区布局、游魂/进场点/图层、工具和选中属性；坐标92/12/0是示意输入。画布明写“复用reforge渲染（此处为布局占位）”，不是实际渲染调用。
- “播放中/与引擎同源/即时生效”、actor“8问题/336/349”、place“2警告/引用完整性OK”全部是原型文本，不能作实跑、机制或诊断计数。

现有旧三条中央记录为 governed-legacy/structured-content，非模板迁移。旧267/292/255与本次266/291/254相差末尾空段一行；本次明示真实行口径，不断言旧producer算法已核。SHA相同，不据旧摘要冒领本次深读。

#### 2. 事实权、原导航与继任

现行 `docs/phase2/specs/editor-design-system.md` 实读1–230：开头明确是后续编辑器界面实施/验收唯一规范入口；本次未读其余1043行，不认证所有现行产品实现。
`docs/phase2/archive/designs/editor-design.md` 实读345–395，其中372行保留2026-07-01与用户逐版对齐place v1→v3的历史说法。
保留该旧已拍板范围，不撤回、不把它恢复成今天唯一UI合同。两角色版的文件名顺序不单独证明v2正式supersedes v1。

实际图：README9/10/11分别链接三HTML；旧editor-design:372链接place，共4个live Markdown入链，fragment均0。三HTML原出链/外部资源/IDs均0。
全仓路径检索另见 `packages/editor/src/ui/App.tsx:1–16` 头注释（3行）引用place“定稿”；这是注释引用，不是文件加载caller，不改产品源码，也不以它盖过当前规范入口。
README现为导航职责，已由P包单独负责；本包不改README，不抢P写域。原3路径/title/labels及所有4入链保持；不新建第二份原型真源。

源码固定树实际有15份HTML；其余12份testing archived browser-host只枚举，未全文读、未分类、未审消费者。该变体不覆盖它们，也不改变它们的脚本、旧断言或合法输入。
根另行报告已在后继694源完整读12份335行browser-host（proof fcc958d50919917cabd4022f1df1afda7f461545a49a7aa5edb225e735ae2430），RV1含旧pixel assertion，需独立native HTML机器/evidence合同。本作者0/12全文读取，不继承根信用；LV1旧绝对路径alias、相邻JS/TSX/server与执行均未核，不为消除断链擅改测试host。

#### 3. 选择的 HTML 结构与不选择的形式

建议在**同一原HTML的 closing body 前**仅插入一块有唯一首尾marker的治理说明：原DOCTYPE/head/style/body原有三个div及原文逐字节保留。
块内为具summary的原生 `details`，固定定位、不参与原body grid排版；闭合默认只显示“历史原型·治理说明”，展开后完整阅读五章。
新增固定CSS只作用于该块的唯一 `tp-document-governance` ID及其后代，不能使用原类名、:root/html/body或未限定通配选择器；CSS文字须在实施前单独冻结为精确模板literal并由consumer核准。
不改原40px/1fr/26px三行、原四列宽、height/overflow或旧内联style。不加入运行脚本、iframe、srcdoc、动态切换、网络资源或应用事件。

五章为真实HTML section/h2与具体段落，不能是只有章节名的壳；human metadata用同块中的可见dl，机器读取同一组节点，不另存一份不同步JSON真源。
Metadata必填：Status=historical、治理Owner、Last reviewed实际日期、Template=archive-record-v1/1.1.0、Variant、原path、固定source revision/blob/SHA、原作者/日期unknown、runtimeExecutionPerformed=false。
正文中的来源/适用范围/历史与supersedes/停止线/下一步也必须具体可读；不伪造原id/status/schema或原作者字段。

保真以**删除唯一新增span后完整Buffer恢复原源**为主证，另以parse5按新增span的source location剔除其全部节点/marker注释/专属空白，并合并相邻text节点后，核native AST/attrs/text/style与原源全等；不能只删details而漏marker，不能normalize原属性或正文。不能只对若干标题做hash。
原源既在live原型中、也可从固定Git回取，不必把811行再复制进iframe或另一份HTML。source/after SHA在外置review/回执；HTML不存自己的after hash，不引入自hash循环。

不选择：流内前言（会新增grid项）；包一层后重写body/CSS；iframe/srcdoc（视口/base/入口/焦点语义改变）；只有HTML注释/隐藏template里的五章（不可供读者阅读）；只写sidecar而原HTML无实质治理（不算正文迁移）。
本方案对原DOM/CSS字节的静态保真可证；像素、展开交互、各浏览器实际观感本次未看，不能写visual-pass。任何后续视觉工作须另获明确范围，不能用parse5冒看图。

#### 4. 三篇各五章的内容合同

| 文档 | 历史范围 | 原始结论 | 当时证据 | 当前有效性 | 继任文档 |
|---|---|---|---|---|---|
| actor v1 | 早期C1角色模式，B2姿势/多状态为占位；原作者/日期未录 | 两角色/四方向12帧/单头像/样例数值装备仙术；100ms与“播放中”原话保留为设计文字 | 固定266行源、8问题/336/349静态标签；无script/资源caller；原始视觉批准未证 | 历史参考；不认证动画、存档、角色数值、数据校验、B2或当前UI合规；source保真不等实跑 | 当前DS；P所属README；v2只作同系列比较，supersedes不凭文件名补造 |
| actor v2 | 同一早期角色草图第二文件快照；日期未知 | 原body与v1相同；新增特殊动作/多头像CSS，但无相关DOM，明确未实现于此原型 | 固定291行与body字节等式；25新增样式行/19未用class；同样8问题标签 | 不能把v2标题/CSS准备升格动作或多头像功能；不修旧样式去对齐现行产品 | 当前DS/README；v1是比较来源，正式替换关系未证 |
| place v3 | 原title v3；旧design372行记录July1五区对齐，范围限当时静态草图 | rail/outliner/工具画布/选中Inspector/状态条；游魂、92/12/0、三图层和占位渲染均按原义 | 固定254行、July1旧引用；2警告和引用OK为同幅原型标签，无实跑/图像证据 | 原已拍板历史约束保留；4模式rail不作当前一级导航；不认证reforge渲染、拖动保存、碰撞或引用扫描 | 当前DS为界面合同；旧editor-design与App头注释只追溯；README持续导航 |

每章新增具体归纳并给原行/节点范围映射；原prototype静态主体完整保留。五章中当前有效性写停止线，继任文档写下一步与重新启用须重新核当前合同，不恢复旧build/prompt。
HTML archive-record已含五历史章，本身不再重复叠archive overlay，不将同五章计两次。

#### 5. 消费者与依赖设计

实际 `document-model.mjs` 全335行已读：108–181仅JSON/Markdown分支，281–324在parent.format上选metadata；不能仅添registry的format=html而落回Markdown正则。
当前真实checkMigratedDocument对三原HTML均报缺标题/五章/date/Template（每篇8问题），已在/tmp实际校准；无现成HTML符合性可继承。

建议新增纯Node `scripts/docs/html-archive.mjs`，用parse5真正解析，不执行JS/CSS，不用正则抽五章。`checkTemplateBody`先于旧Markdown documentStatus检测，按resolved variant的HTML格式调用专用结构/metadata层；`checkMigratedDocument`对该变体另加source Buffer/Git及联合绑定门，然后返回HTML metadata结果，不再落Markdown声明分支。
Markdown/JSON现有documentStatus/publication/default16/machine1.5六variant/五JSONpins保持行为全等；不为HTML放松旧门。

parse5@8.0.1已在当前pnpm-lock和实际.pnpm cache中，经jsdom使用；研究使用实际绝对路径导入成功，3源parse error均0。它不是root直接声明依赖，正式代码不能硬编码宿主.pnpm路径或依赖phantom解析。
建议未来明确授权root devDependency精确parse5=8.0.1，并更新lock root importer（复用已有resolved package）。本轮**未安装**任何依赖。JSDOM非必要，不增加浏览器模拟环境。

HTML结构门至少验证：

1. 一块live details/summary/metadata，一份治理h1，恰5个具指定h2的section且有实质非空段落；comment、script、template、pre/code或隐藏节点中的假字段不能计入。
2. 唯一dl身份字段与route/type/version/variant匹配，Status仅historical，Owner不空，真实ISO审查日；原作者/日期unknown不被当前治理值覆盖；显式非执行。
3. 全文严格UTF8；parse5 onParseError全部拒绝，含duplicate-attribute；治理ID全唯一，字段去重；不接收auto-repair后“看似正常”的畸形前言。
4. 新span只能放在冻结body收尾位置，包含恰一个治理块及精确冻结CSS；删除span后原Buffer与固定源全等。添加脚本/事件属性、base、iframe、网络资源或span外任何字节变化皆拒绝。
5. 新href仅受控的真实本地继任/来源路径或本块唯一IDs；拒绝空/悬空/越repo/javascript/data/远程src；查实际parser节点，不扫不可交互注释。

source门：三source在approved33cc也逐blob相同，建议固定source pin用33cc；164只记迁移读取base。
新增独立HTML source-pin域，不变原五JSONpins；每条pin必须与固定cohort原sourceSha匹配，Git读普通regular100644 Buffer，核commit/path/blob/SHA。
三已冻结mockup路径必须在helper的显式typed binding guard中要求archive+指定HTML变体；pin/route/声明一起改、移除pin后改挂Markdown伪标题也不能绕过。source固定根不由候选mutablepin自称可信。缺Git源对象/Buffer/已声明parser依赖属于硬前提失败，不能回退读当前副本、联网补源或静默跳门；完整clone/CI按同一固定来源复现，不扩本包CI写域。
其它12未读HTML不套此规则，不自动迁移或计完成；新变体仅服务三已核静态原型。以后测试host另读另设计。

现有check-document-model的Buffer/Gitreader选项和progress接线已实际读；它们可原样调用同一checkMigratedDocument，无需第二个宽松入口。
`report-governance-progress.mjs`全146行已读，已经纳md/json/html；完成仍须唯一current review、真实after SHA、同typed route及body门。strict全158行只核记录/SHA等，不证明HTML五章。
`check.mjs`实读1–180与240–333，main仅扫描MD；不把它现有link绿当HTML图已验。新HTMLhelper校验自己的live链接，不扩扫12未知host。
Biome现有配置已经排除mockups目录，本包不加ignore/不改配置；lint零不代表HTML已被Biome解析，新HTML独立文档合同也必须零诊断。

#### 6. archive父1.1的真实维护域

不能偷偷使已接收MD失效，也不保一个旧version fallback。建议仍只有当前archive父1.1，默认format保持Markdown；五sections/status/evidence/historyRule与1.0精确相等，只新增HTML变体。

固定164实查：3份直接compliant archive MD、138份主体属于其它类型的history overlay，合141条路由。
3份直接MD必须将当前Template字面声明及中央current的parent版本实际维护为1.1，原文/结论/状态不改；这3份不新增迁移信用。只改live根metadata中的Template版本，quote/原始源文中的旧版本与历史日期不动，完整原文逆回读继续成立。
138 overlay继续读同五节；它们主体Template版本不滚、不改138正文。另有55条**当前review**显式声明archive1.0，分布6文件，需窄维护为当前1.1并保完整即时prior；其它83条没有显式旧overlay版本，无需凑改。
127条有某种overlay描述并不等于127条有旧版本；实际版本字段仅55条。完整路径/字段/record文件名单见版本影响JSON，属于metadata枚举，不冒138正文全文复审。
旧作者回执/历史prior内的1.0为当时真实声明，全部保留；不全仓替换字符串。

直接MD：

- docs/ops/archive/protocols/three-sages-20261015.md
- docs/ops/archive/protocols/workflow-snapshot-20261015.md
- docs/testing/archive/legacy/batches/finite-test-intake-20261003/README.md

它们当前review在20261015-protocol-and-e2e-pilot-batch.json、20261015-domain-pairs-and-archive-cards.json。
55 overlay current review在20261016-{architecture-integration-history,domain-navigation-records-1,domain-navigation-records-2,domain-navigation-records-3,historical-cards-d,testing-lab-history}.json，位于docs/phase-governance/reviews/。
这些维护只证明当前合同引用，不重验旧业务或授新动态信用。冻结/新基点时必须重算此名单，不能拿164计数覆盖并行增量。

#### 7. 分阶段最小写域与单篇pilot

本段是未来拆包建议，不是写入授权。

- 根先保存/独立核设计并冻结版本、source pins、精确preface DOM/CSS literal、writer/验收方式和维护名单；按并行任务后的稳定新base开卡。
- 合同包：package.json、pnpm-lock.yaml、scripts/docs/document-model.mjs、新html-archive.mjs及一个少而精的新html-archive.test.mjs；templates/registry.json、现archive-record.md追加HTML变体说明、templates/README.md同步入口；精确设计稿/任务卡由根Owner维护。
- 版本维护包：上列3个直接MD +其2个current review文件；55条current版本字段所在6个review文件；registry内仅该3 current版本。138 overlay正文/历史作者回执不写；根保每条完整旧对象的Git pin并独立收维护delta。
- 正文pilot：**actor-mode-v2.html一篇** +专属17top/43entry同类回执一条，模板结构不在作者手中扩。选择v2可同时验证未使用CSS不被误称已实现、body与v1相同且原样保真。作者只交候选，非作者逐段看五章和全源映射。
- 通过单篇真实pilot后，另明确准入actor-v1/place两篇+同回执续条；不能由/tmp样例或一篇绿直接计3份完成。
- 根接入：原structured-content-phase2-01三HTML当前记录逐篇替换并保完整prior，或另专属record但同步移除旧current避免duplicate；document-registry与routing逐篇匹配该variant/after。HTML当前未在phase/lore MD catalog登记，不能冒phase184覆盖；README的catalog/导航维护归P，不抢写。
- 新helper/test库存由根在真实quality ledger登记pending，不增旧代码审计信用；不改产品、App注释、旧测试、coverage、CI、JSON机器证据或其它HTML。

#### 8. 可证伪验收与停止线

以下是冻结后需要真实ownedtmp/actual consumer执行的计划，未实施；本轮只有原源parse与现合同拒绝校准。

| 观察/最强反例 | 需拒绝或保持的事实 |
|---|---|
| 原三HTML直接绑定现Markdown合同 | 本轮实际每篇8问题；不能豁免改称compliant |
| 真pilot完整五章+合法source+正确CSS/span | 真checkMigratedDocument、model/strict/progress同入口可接受；只结构不自动content-reviewed |
| 改原grid、样例“8问题”、v2 body插posecard，同时刷route/review/afterSHA | 原Buffer逆回读/固定source不等，拒绝；不能以新签或路径启发式洗源 |
| 删除章；五章藏comment/template/script；只标题或纯代码 | parser归属/非空正文门拒绝；非作者另核每章具体语义，空泛文字不能靠结构绿过 |
| duplicate属性/ID/metadata、非法UTF8、HTML自动修复或关闭marker注入 | 严格byte/parser/唯一span门拒绝，不能消失成一次正常字段 |
| preface新style影响body/:root、原元素被包层/iframe，或添加JS/network/base | CSS literal/新增节点白名单/原源等式拒绝 |
| 改sourcepin并换模板/variant/route联合绕行 | 固定33cc/cohort source、3已冻结path typed guard拒绝；mutablepin不是信任根 |
| 新继任路径不存在，删原README链接或旧design place入口 | 实际HTML/MD图拒绝；4原入链与0原fragment必须全保 |
| archive升级后3直接MD未维护、55current仍称旧current版本 | 不接受版本维护包；不双接受旧声明，不写兼容降级；138原body/其它16type/machine1.5必须exact |
| 从v2 CSS/title或“播放中/引用OK”推出功能或诊断通过 | 结构parser未必识别所有语义谎报，非作者全文审必须counter；明确不会因此给runtime/视觉信用 |
| 三原型variant被套到12未读测试host或使其旧断言改变 | 停止扩域，另逐篇primary/consumer/输入审查；此提案不授实施 |

最终每篇真实review须写核心结论/原metadata缺席、治理owner/provenance、primary和phase、caller/合法输入/oracle/排重、版本轴、counter/rework/unknown、history/supersedes、source/after SHA、before→after、停止线/下一步、模板符合性和真实读域。
合法输入是已冻结静态原型源及有界治理markup，不是旧测试host/保存数据/产品事件；business oracle为完整原源保真+正确时态/事实权+真实可读五章+导航，不是截图像不像或产品已运行。
三原型没有可证明的原生成器/脚本producer；原作者/批准日期未知，不补造。当前治理producer为未来指定的docs Owner；source由Git持久保留，after/body/回执和review按同任务长期追溯，原链接不撤。
所有syntax/contract/link/SHA诊断须零，pnpm check:docs/lint/diff必须实际同字节通过；全量目标和原型视觉/产品实现状态仍独立。未满足这些冻结前提时保持draft，不授build。

### 精确DOM/CSS/source合同（冻结）

### 三份历史 HTML 归档变体：精确合同补充

Status: draft
Last reviewed: 2026-10-16
Owner: html_contract_refinement（只读设计作者）
Template: design-spec-v1 / 1.0.0

#### 问题与目标

补足 C-HTML-1（未冻结 DOM/CSS/bytes）和 C-HTML-2（真实 parser/CI caller 前提）。本稿供根独立审查与冻结；不自签 counter 已关闭，不授 build，不是 canonical HTML pilot。保留原 A 154 行提案、252 行 delivery、独立 47/1076 行 counter 及所有 observer 初次失败；本稿只在有冲突处精确替代其建议。

仍为17类型，archive-record 父版本提议升1.1.0，默认 Markdown 合同不变；仅新增 historical-static-html-v1 / html，不叠第二 archive overlay。先完成独立 docs bootstrap 和格式工具包，再单篇 actor-v2 真正文 pilot，之后另准 actor-v1/place。当前用户 N6→Q5 的先后与 A8 单 Owner 八路径不受本设计干预。

#### 真值与约束

本席先核根树 c3bb4096c4041a7890350199ca226fc79d174832 clean；实际读现 AGENTS/CLAUDE/READ-FIRST/workflow/board/文档模型/本卡顶部与915–951、统一模板与 testing 治理、archive/design-spec 模板、真实 model335/progress146/modelCLI31、两个 F1 JSON reader、docs.yml31及 package/root lock importer。三 HTML 266+291+254=811 行本席全文重读；DS 只1–130、旧 editor-design只345–395、App只1–16、当前 mockups README全文。没有继承他人对其它12 testing hosts335行的全文信用。对138 overlay只核注册/路由/当前版本元数据，未逐篇重读其正文。

三原型在33cc、164与当前c3逐bytes/blob相同；source revision固定33cc2df50c7279d2750ddad4fcf6c373b7b2bda3，actual migration read base另轴记录。原作者/日期 unknown，原型v1/v2/v3不是模板或运行版本。

| 原路径（docs/phase2/archive/mockups/） | 原blob | 原SHA256 | bytes / lines | 原body结束UTF16 / UTF8 byte offset |
|---|---|---|---|---|
| actor-mode-v1.html | 120a0d32a0074992d28878f6acba730d57712589 | 0f1ecdeaa85d9d49eeba091859d1eb07d50d5ca562cbcdaa937b777747646e3f | 17110 / 266 | 16398 / 17094 |
| actor-mode-v2.html | 38182d2e8757b046b987a9fe3ce214e61e8ed3ec | 688008dcc0c1db9d478a15f375ce60bbbf139ed8910e0667aa78dc7de367ba60 | 19978 / 291 | 19249 / 19962 |
| place-mode.html | f176cc3fdfe30b8eb3d01d929262f3ced186b4ee | aacdffba3f76e92554ddf29e1317062b47e83ae4a3d184a2c495cfb8a05b136d | 14856 / 254 | 14242 / 14840 |

actor两原body字节相同；v2新增19 CSS class未用于body，不能称动作/多头像已实现。四方向12帧、步序/100ms、8问题/336/349均保留为原型文字。place五区/游魂/92,12,0/三图层/2警告和引用OK保原义，画布明确占位；July1旧place对齐记录仅属当时范围，现DS仍是当前编辑器UI唯一规范入口。原生输入/checkbox可能有浏览器默认行为；没有本次实际应用保存/动画/校验执行。

原4条live MD入链（README三、旧editor-design一）、路径/title/标签全部保持，原outlink/resource/script/事件属性/ID均0；后继冻结仍重核真实新基点，不以旧4计数豁免漂移。

#### 方案

##### 1. 唯一 owned span 与精确 DOM grammar

UTF8必须fatal解码并逐bytes roundtrip；不允许BOM，新增span只用LF。parse5@8.0.1，默认treeAdapter，sourceCodeLocationInfo=true，scriptingEnabled=false，onParseError收全并零诊断。它是解析，不执行HTML JS/CSS；parseError0不保证没有自动闭合，因此所有新增非void元素另须真实startTag/endTag location。

原source parse出的唯一显式body.endTag.startOffset为i。插入byte位置 b=Buffer.byteLength(text.slice(0,i),'utf8')；i须是合法UTF16边界且指向实际原 `</body>`，不把i直接用于Buffer。冻结原prefix=source[0:b]、suffix=source[b:]；两者不可改变，span外任何字节变化拒绝。

精确 span := BEGIN + LF + STYLE + LF + DETAILS + LF + END。BEGIN=`<!-- type-pal:historical-static-html-v1:begin -->`；END=`<!-- type-pal:historical-static-html-v1:end -->`。END后**没有LF或空白，立即接原 `</body>`**。两marker在全文件原始bytes各恰一次，对应body的直接comment节点。不得将相同marker塞在code/comment/属性中。

STYLE精确为 `<style data-tp-document-governance="historical-static-html-v1">` + 第2节唯一CSS literal（末尾含LF） + `</style>`；只有这个属性。DETAILS采用下列唯一骨架；方括号是设计文法占位，不会写进候选：

```html
<details id="tp-document-governance" aria-labelledby="tp-document-governance-label">
<summary id="tp-document-governance-label">历史原型·治理说明</summary>
<div>
<h1 id="tp-document-governance-title">[escaped 历史归档：+精确原title文本]</h1>
<dl>
[13个依第3节排序的 <dt>label</dt><dd data-tp-field="key">value</dd>，每对独占一行]
</dl>
[scope/conclusion/evidence/validity/successor五section，彼此只隔一个LF]
</div>
</details>
```

每section精确：`<section id="tp-document-governance-KEY">` + LF + `<h2>HEADING</h2>` + LF + 至少一段P（段间一个LF） + LF + `</section>`。KEY/HEADING按顺序为scope/历史范围、conclusion/原始结论、evidence/当时证据、validity/当前有效性、successor/继任文档。

P是无属性 `<p>` 的text/a/code有序序列；a只有href，code无属性，a/code的children只可为text，不嵌套；至少有非空trim后的直接text，不能整章只有代码、链接或标题。变量text为单行可见文本，禁止NUL/CR/LF，使用固定escape `&→&amp;`、`<→&lt;`、`>→&gt;`；属性均为固定字面或第4节精确href，使用双引号。结构节点间空白严格按上述LF；没有额外comments/节点/属性/标记。h1/summary/dt/dd/h2都只含唯一text；原源DOM与styles不受此新增文法改写。

新增元素只允许style/details/summary/div/h1/dl/dt/dd/section/h2/p/a/code，全部HTML namespace；属性严格按骨架/字段表、顺序与值。治理根、label、title和五section共8个ID在全文唯一；没有其它新增ID。禁止open、hidden/inert/aria-hidden、class/inline style、contenteditable、on*、二层details、script/noscript/template/pre/iframe/srcdoc/svg/math/base/link/network元素/表单输入及其它属性。唯一根native details默认closed是明确允许的披露例外，五章可展开阅读；不以此例外容许其它隐藏正文。展开可达性/像素/辅助功能未实际看，不报通过。

##### 2. CSS 唯一字面

未来 `scripts/docs/html-archive.mjs` 导出唯一字符串 `historicalHtmlGovernanceCss`，以下14行逐字节，末尾LF；SHA256=a68216e8b0ae5351e11be2cab33d198798a32f73f17bb267d157e20bf87b358c，1475 bytes。模板说明只引用该导出名/hash，不维护第二份可改CSS。候选STYLE textContent和raw content都须等于该literal；增删空白也不是悄悄自动接收的CSS变更。

```css
#tp-document-governance { position: fixed; right: 12px; bottom: 38px; z-index: 2147483647; width: min(38rem, calc(100vw - 24px)); max-height: calc(100vh - 64px); overflow: auto; box-sizing: border-box; border: 1px solid #94a3b8; border-radius: 6px; background: #111827; color: #f9fafb; font: 13px/1.55 system-ui, sans-serif; }
#tp-document-governance:not([open]) { width: auto; max-width: calc(100vw - 24px); }
#tp-document-governance > summary { display: list-item; list-style-position: inside; padding: 8px 12px; cursor: pointer; font-weight: 600; }
#tp-document-governance[open] > summary { border-bottom: 1px solid #64748b; }
#tp-document-governance > div { padding: 12px; }
#tp-document-governance h1 { margin: 0 0 10px; font-size: 16px; line-height: 1.4; }
#tp-document-governance h2 { margin: 16px 0 6px; font-size: 14px; line-height: 1.4; }
#tp-document-governance p { margin: 6px 0; }
#tp-document-governance dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 10px; }
#tp-document-governance dt { font-weight: 600; }
#tp-document-governance dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
#tp-document-governance a { color: #93c5fd; text-decoration: underline; overflow-wrap: anywhere; }
#tp-document-governance code { font: 12px/1.55 ui-monospace, monospace; overflow-wrap: anywhere; }
#tp-document-governance summary:focus-visible, #tp-document-governance a:focus-visible { outline: 2px solid #fbbf24; outline-offset: -2px; }
```

全部selector仅治理根或后代；无body/:root/html/unscoped selector/@import/url()/隐藏/动画。默认closed仅展示summary、固定定位不占原grid轨道是设计意图；未经浏览器不承诺像素不变。

##### 3. 可见 metadata 是唯一机器读取源

只一个dl、13对dt/dd按以下顺序，dt为精确label，dd[data-tp-field]为精确key且value是唯一text；不另嵌JSON真源。parser输出typed metadata；Owner/日期是治理，Original author/date保持unknown。afterSha不放进HTML，避免自hash。

| key | dt label | value合同 |
|---|---|---|
| status | Status | historical |
| owner | Owner | 真实本包治理Writer，非空；不能倒填成原作者 |
| last-reviewed | Last reviewed | 真实审查日，严格有效YYYY-MM-DD；不得自动刷新日期冒核读 |
| template | Template | archive-record-v1 / 1.1.0 |
| variant | Variant | historical-static-html-v1 |
| original-path | Original path | 当前绑定三固定path之一且等doc.path |
| source-revision | Source revision | 固定33cc全40SHA |
| source-blob | Source blob | 对应固定blob |
| source-sha256 | Source SHA256 | 对应固定原Buffer SHA |
| migration-read-base | Migration read base | 实际后继根准入clean commit全40SHA；不是把164或本c3默认冒作未来读源 |
| original-author | Original author | unknown |
| original-date | Original date | unknown |
| runtime-execution-performed | Runtime execution performed | false（typed输出为boolean false） |

Owner/date/read-base语法通过不证明作者真实读过；非作者须与实际准入/来源/回执匹配。每篇具体五章沿用原A第4节的内容表，但须逐章真实归纳和原行映射；尤其v2 CSS-only、place旧July1/当前DS边界为语义停止线，结构绿不能自动认这些结论成立。

##### 4. 新链接与 native AST/source inverse

新增a.href只允许精确本地相对路径：所有三篇均可 `README.md`、`../../specs/editor-design-system.md`；actor-v1另可 `actor-mode-v2.html`，actor-v2另可 `actor-mode-v1.html`（比较，不自动supersedes）；place另可 `../designs/editor-design.md`。除此仅本块8个实际唯一ID的内部#链接。禁止跨文件fragment/query、百分号变体、远程scheme、绝对路径、data/javascript、空href。联合consumer逐个真实read存在；不抓网页或执行目标，不改P README。原4条入链另由真实新快照的MD图独立核保留。

主证：解析candidate的marker真实location→byte边界后，Buffer删除完整span，必须逐bytes恢复固定33cc source；span起点必须等恢复source显式body endTag byte起点，span终点后须立即原 `</body>`。再要求raw span本身满足完整文法，所有新增节点归属span且没有任何节点逃逸。

第二证：分别对source/candidate的parse5 native AST作同一投影。只删除span内全部直接body owned nodes及其descendants、owned comments和确切专属LFtext；不能只删details。原source中所有节点仍在，保留document.mode、doctype三字段、namespace/tag、attrs原顺序及name/value/namespace/prefix、text/comment/style值和children顺序；只去location/parent指针，删除后只合并相邻text，不trim、压空白、重排attrs或normalize原HTML。若新增元素自动闭合/生成缺location，或source text节点跨span边界导致无法证明专属归属，拒绝；html/body既有祖先包含span不是可删除owned node。

本次/tmp实证对三篇都复现：无尾LF→strict byte inverse=true且nativeAST=true；尾marker后加LF→byte inverse仍true而AST=false；把UTF16 offset作byte→三篇inverse=false。结果 e556c7ac... / 0 observer issues，只是UNAPPROVED syntax witness（通用占位段落），不是模板consumer实现/真正pilot/语义接受。

##### 5. 独立 HTML Git adapter 与真正 model/progress consumer

新 `scripts/docs/git-historical-html-source.mjs` 只服务本稿三tuple；冻结常量table与第2节CSS共同受代码review。registry新增独立 `historicalHtmlSourcePins`，恰3条，每条闭合5键path/revision/gitObject/sha256/bytes，必须与本稿table逐值相等；原 historicalSourcePins 五JSON条及F1 reader/API/五pin全部字节不变。variant.preservedSource为kind=historical-static-html-source-span-v1、baseline=固定binding-baseline路径；当前可变pin不是信任根。

adapter(root,pin)：先要求tuple恰等固定table；真实Git cat-file -t revision恰commit（不peel tag），ls-tree -z --full-tree固定revision/path恰一100644 blob且oid/path精确；cat-file -s oid先核固定bytes且≤65536，再cat-file blob Buffer（stdout固定65536 cap），核length/rawSHA。任一步失败返回明确不可用并由caller报错；不读当前副本充源、不联网、不fallback到其它commit，不执行pin文本为shell。

model/progress CLI各显式readSource dispatch：三固定HTML path→新adapter再fatalUTF8返回text/gitObject；其它交原 readGitDocumentSource。readSourceBuffer同样三HTML→新adapter、其它交原 readGitDocumentSnapshot。F1两个文件仍只.json不改。新adapter不是使F1接受任意扩展的通用升级。metadata read-base的真实准入/核读由非作者验，不把有限source adapter扩成可任意回读HTML revision的工具。

在 document-model 的任何泛型format/Markdown检查之前，以三固定path **或** 请求本variant **或** preservedSource.kind标识 **或** resolved contract.format=html 为联合guard：必须三path之一、template.docType=archive-record、templateId=archive-record-v1、parent当前1.1.0、variant本名/format html/上述preservedSource、historyOverlay=false。其它path套该variant、三path改挂Markdown/删除pin/路由+声明+mutablepin联改均拒绝。不要仅让HTML JSON.parse失败后return[]。

checkTemplateBody先按resolved variant.format走pure HTML结构/metadata检查并返回，不能落旧Markdown status regex。pure层不自称source已核。checkMigratedDocument的联合HTML分支必须取得真实readBuffer与新readSourceBuffer，fatal解码并校read(path)与Buffer一致，运行完整结构/metadata/link/source/inverse/AST门；复用inspectFrozenDocumentBaseline验证真正33cc信任根及此path唯一cohort sourceSHA，不改固定baseline内容/1838分母。HTML metadata返回后不落parent.format=markdown的声明检查。现16其它类型、JSON全部default/variants/F1分支与Markdown行为保持。

modelCLI/checkDocumentModel与progress全使用同一联合消费者；progress仍要求唯一current完整review、actual afterSHA及route一致后才计数。没有route/未迁移的原HTML保持pending；不能因新格式注册就计3份。check.mjs当前只扫MD，HTML自己的新增link门必须真实执行；不扩大扫其它12host，不抢A8写check.mjs/lint-zero.mjs。

##### 6. 独立 docs bootstrap：精确3文件前置包

只 package.json 根devDependencies新增 `"parse5": "8.0.1"`，pnpm-lock.yaml根importer新增specifier/version=8.0.1（已有package/snapshot不需升级），.github/workflows/docs.yml真实documentation job bootstrap。不得增加packageManager、改scripts、coverage workflow/其它jobs、Biomes/ignore/规则/产品/旧tests/coverage。CI保现permissions/triggers/concurrency/5分钟timeout；下列steps精确替换当前未安装的3个node调用，不并行另造CI：

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: pnpm/action-setup@v4
    with:
      version: 10.29.2
  - uses: actions/setup-node@v4
    with:
      node-version: 22.23.2
      cache: pnpm
  - run: pnpm install --frozen-lockfile
  - name: Check repository documentation
    run: pnpm check:docs
  - name: Check documentation progress integrity
    run: node scripts/docs/report-governance-progress.mjs --json
  - name: Check zero-diagnostic lint
    run: pnpm lint
```

progress不加--require-complete作阶段CI假通过：完整目标末尾另真实运行该硬门，pending不消失。bootstrap是静态partial前置，不是F2 C1终端/approval/DAG闭合。当前docs.yml确实无install且shallow；这是源码前提counter，本席未执行GitHub job或声称已观测CI失败。本席也未install、改lock、联网补Git源或拉依赖；现宿主parse5仅研究用transitive绝对路径，不得写进正式代码。

##### 7. 当前父版本维护：冻结原生key arrays

c3实际重新枚举仍3direct/138overlay/141routes；55 current overlay对象有58 scalar版本叶。精确55条、recordFile/index/uniquePath与native key arrays在71行的 `/tmp/type-pal-html3-exact-supplement-version-leaves-20261016.json`，SHA cbae0a7a221c4bd571d7732a67c14137d8349eb21f6ff6ff95f2f509c672526a；全机械元数据/pins/138 source hashes详见3473行 current-impact-v2 JSON，SHA29d48c57...。这些不是138正文全文接受。正式freeze前若base变化，再枚举实际delta，不用164或c3恒定数字压过新current。

overlay叶只允许数组 `["historyOverlayVersion"]`、`["templateConformity","historyOverlay"]`（string）或 `["templateConformity","historyOverlay","templateVersion"]`（object）。52对象×1，J3对象×2。review files为20261016-{architecture-integration-history,domain-navigation-records-1,domain-navigation-records-2,domain-navigation-records-3,historical-cards-d,testing-lab-history}.json。禁止把dotted display label当native key、递归刷所有1.0；47个旧历史/prior/authorSnapshot版本值原样保留。

3 direct MD为three-sages-20261015、workflow-snapshot-20261015（docs/ops/archive/protocols）和finite-test-intake-20261003/README（docs/testing/archive/legacy/batches）。各只live第6行 Template1.0→1.1，3registry current.templateVersion同滚；current records在20261015-protocol-and-e2e-pilot-batch.json（2）及20261015-domain-pairs-and-archive-cards.json（1）：三条既有 `["templateVersion"]` 都滚，finite另有 `["templateConformity","version"]` 一叶滚；两protocol无templateConformity，不能倒填旧版本声明。合计4 direct record版本叶+58 overlay叶+3registry叶+3正文行=68个版本位置，after/evidence bookkeeping另列，不把字段数当迁移数。

每条维护保完整即时prior current对象（真实build前Git revision/blob/whole-file SHA/唯一entries选择器）；只新的current字段更新。3 direct正文actual afterSHA及其当前evidence.afterSha256/revision.implementationSha等实指current的镜像要同步，旧receipt/历史SHA不刷；新version-maintenance证明指向根唯一控制事件，旧evidence path保历史scope，不说旧raw receipt证明新after。138 overlay原body/主体Template/after/sourceSHA、其它83无显式版本记录均不改；所有旧current/prior整体字节/值进入历史保留。这里0新增迁移、不重新授旧语义/runtime信用。

##### 8. 最小未来写域与单篇pilot

bootstrap先独立验收3文件。合同代码包仅以下6：新 scripts/docs/{html-archive.mjs,git-historical-html-source.mjs,html-archive.test.mjs}、现document-model.mjs、check-document-model.mjs、report-governance-progress.mjs。配置说明只 templates/{registry.json,archive-record.md,README.md}；archive父1.1外其它16 type全对象原样。旧docs tests不修改，新增一个focused testfile；不改check.mjs/quality/F1源或旧test/coverage。根在code-quality-file-ledger真实新库存登记2tool+1test pending，不用工具green增加旧代码已验证数；清单计数动态枚举，不复用3294。

版本维护只第7节68位置及真实current after/evidence/完整prior的8个review文件、document-registry；根独占任务卡、必要质量ledger current record、唯一HTML控制record/设计/索引与中央接入。建议稳定控制路径 `docs/phase-governance/reviews/20261016-historical-static-html.json`、设计路径同目录20261016-historical-static-html-design.md。具体根新控制自身保持pending增量，不自证完成。根在准入时钉新base/文件白名单，合并其它Owner新delta，不以本稿授权写共享树。

工具+版本维护独立通过后，单作者仅 actor-mode-v2.html 与新 `docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-historical-static-html-20261016.json` 两路径首pilot。回执沿用17top/43entry既有同类格式，一条完整逐篇内容记录，真实source/after/Git/phase/caller/legal input/oracle/dedupe/history/supersedes/counter/stop/next/template；原作者日期unknown，治理Owner/日期不冒原始值，作者自验pending非作者接收。不能以本稿syntax witness取代语义五章。

非作者全文读原291+候选所有新增五章/完整回执并真实联合consumer通过后，根逐篇移除structured-content-phase2-01旧current、保即时完整prior、更新registry/typed route/control，避免duplicate。之后才分别准actor-v1/place正文与同回执续2条，逐篇验。README仍导航Owner维护，不抢写；HTML不在phase/lore184 MD catalog，不冒catalog覆盖。最终只有实际接收的逐篇cohort项计数；全量目标与其余12hosts仍继续。

#### 边界与风险

最强替代解释：byte inverse正确但新增span被HTML parser挪动/吞掉正文，或可见五章只是代码/隐藏/泛话；因此要精确文法、whole owned AST、真实共同consumer与逐章非作者语义审四者并用。即使四者满足，也不构成像素/浏览器行为/可访问性或产品运行通过。

source reader联合guard从真实三path/variant/kind出发；把mutable registry pin当信任根、缺Git静默skip、raw HTML挂Markdown或仅parent.format分派都会重开C-HTML-1/2。bootstrap装依赖/完整历史是实测前提；实际clean-installed caller失败就停相应包，不为过门ignore、放宽规则、改测试、伪造F2终端或覆盖并行Owner。

保留全部旧observer失败，包括dottedlabel KeyError、105≠58误纳历史、旧路径/formatter/工具查找错误；本席初库存只把finite标作additional leaf，实际完整读direct3 current后补出三共同top templateVersion的v2，首inventory也保留。它们是观察/设计迭代，不是候选实跑已accept。

无需要用户再次裁决的新产品选择；root已明确byte/source/bootstrap方向。本稿尚待根非作者对精确DOM/CSS/typed tuple/版本维护清单和未来稳定base/Owner白名单作设计agree+freeze，随后才可build。不是让用户逐批确认，不改N6/Q5/A8任何现行准入。

#### 验收

冻结后计划，以下未实施：

1. 新focused tests通过真正joint model+新Gitadapter，分别覆盖三真实33cc UTF8 source的正例及字节/AST保真；不是only parser/metadata断言。验证旧全部docs工具测试未编辑仍通过，真实旧MD/JSON/F1五pins行为不变。
2. 有判别力的独立负例：原grid/8问题/v2 body新增posecard即使刷route/after也必须source拒绝；换sourcepin+模板/variant联合绕行拒绝；缺真实Git/blob/reader或非100644拒绝；有尾LF或span放错/marker伪注入拒绝；CSS加body selector、hidden/nested details/代码假五章/缺章/重复metadata、属性/ID、parse自动闭合、坏UTF8/BOM、悬空或非白名单href分别由对应门拒绝。观察失败须归到明确source/body/link/typed理由，不冒任意collection异常为有效针。
3. 真正无共享node_modules的新clean full-history clone、Node22.23.2/pnpm10.29.2，执行frozen install、`pnpm check:docs`、progress --json、`pnpm lint`、`git diff --check`；parse5包名import且版本8.0.1，33cc blob实际可达。安装前的缺parser/source负观察可留，但不以缺模块异常代替有意义的合同反例。无真实Githubjob则只报本地clean-installed caller结果。
4. owned临时实际Git树用同CLI（不是mock reader）做一条合法typed HTML route正控，再只破坏source preservation，model/progress均非零并明确该path，恢复通过、finally精确清临时树；现1838真实baseline和JSON source仍真，不造小baseline/profile/内容批准。该syntax工具正控0canonical迁移，不能自签content-reviewed。
5. 真正actor-v2 semantic pilot逐章确认CSS-only、原body等式、原日期/未知、DS/历史轴、原链/真实后继与停止线；静态绿但写“动作/多头像已实现/播放/保存/8问题今日实测”必须被非作者counter。首pilot实际source/after与全部record SHA锁定后另验根中央接入。
6. 第7节版本维护3原body只单行diff、138overlay body全字节锁、其它16type/default/JSONpins全对象锁、55whole priors真实可回读、47历史版本原样。68位置和actual after镜像全部核，不以退出码0代语义一致。

全部新语法/source/link/static门须零error/warning/info；最终仍按原1838+全部增量/artifact目标、require-complete和全量独立语义验收，未满足保持build/active，不标done或推main。所有syntax/source对照只属本设计，0产品/旧tests/coverage/HTML JS或CSS执行/浏览器/视觉/E2E信用。

### 同步parser/维护/先后补充（冻结）

### HTML3 C-HTML-3：同步 parser 按需加载与旧 copied caller 前提

Status: draft
Last reviewed: 2026-10-16
Owner: html_contract_refinement（只读设计作者）
Template: design-spec-v1 / 1.0.0

#### 问题与目标

原198行精确合同（SHA14b5fadd0467c42c3931c0fb9ed3e47b1de5969383fd0dc6b5b51c579cb865b8）和非作者51项/0问题design agree保留其实际历史范围。新发现C-HTML-3尚需根独立审查与冻结：**若model或其新helper顶层静态加载parse5，会使现有无node_modules、只复制docs工具的合法Markdown/JSON/F1 caller在选择HTML之前就崩溃。** 本补充禁止这种实现；不改旧tests/F1 API，不改同步接口，不把现有caller迁成需安装依赖才合法。本稿0repo写/0build/0canonical pilot，旧两counter的未来实现验收也未完成。

另补根维护遗漏：模板README仍是current governance-index，更新HTML合同入口时必须维护它在20261015-agent-first-routing-batch.json的唯一current/full prior/after镜像，成为第9必要review文件；不增加原68个版本位置。历史版本叶完整锁为47 nested +15 top candidate=62，不能把47说成全文件总数。

#### 真值与约束

只读基点782128f12f475a7a72bc0d4dc7c6b4fe091c6509，起始clean；其Q6已独立接收。本席全文读 frozen-binding-baseline.test.mjs679、historical-execution-source.test.mjs691、document-model.test.mjs345；testing-index-governance.test只1–75/160–215与其真正generator入口1–30。全scripts目标入口/import检索仅用作caller定位，不继承其它测试正文/覆盖信用。

| 实际caller | 真实形状与约束 |
|---|---|
| frozen-binding-baseline.test.mjs38–166 | owned Git只复制固定commit及baseline路径trees/blobs；69只cp scripts/docs；不复制root package.json、不装依赖、不建node_modules。121–137 spawn复制的model/progress，JSON stdout必须能解析；359–367、490–514、634等复用它。不能因新增HTML格式使这些合法F1正控先报模块缺失。 |
| historical-execution-source.test.mjs29–164/369–374 | owned Git只复制真实冻结source/baseline所需对象；155/369复制scripts/docs；runProgress和runModel运行复制CLI，仍不安装依赖。原JSON五格式/源篡改/route篡改/反控都依赖同步模型返回和CLI可达，不只F1一文件受影响。 |
| document-model.test.mjs与上述两文件的直接import | checkTemplateBody/checkMigratedDocument/checkDocumentModel直接返回array，assert.deepEqual同步核对；不能悄悄返回Promise，不能给测试加await维持绿灯。 |
| testing-index-governance.test.mjs18/187–188 | 根进程直接同步调用model审MD；owned CLI只复制generate-testing-index单文件，该generator仅builtins且不import model。保持此直接caller，不能误把所有临时fixture都改成安装型。 |
| 真实model/progress CLI | 同步read与Git readers；HTML需求方应明确拥有parser依赖，非HTML方不因为registry存在HTML变体就预加载parser。F1两个.json reader文件/API和五JSONpins不改。 |

本机实际node v22.23.2（/Users/zhangxu/.nvm/versions/node/v22.23.2/bin/node）。实际parse5 package是ESM/type module、default export target dist/index.js、版本8.0.1、依赖entities^8.0.0；实际entities8.0.0也是ESM、无runtime dependencies。正式代码仍只包名解析；宿主.pnpm路径仅研究定位和物理拷贝来源。

本席已真实跑**未修改的**两旧suite：`node --test scripts/docs/frozen-binding-baseline.test.mjs scripts/docs/historical-execution-source.test.mjs`，15/15 pass、fail/cancelled/skipped/todo皆0、stderr空、41.106秒。这是当前782旧caller基线；没有未来loader代码，绝非未来实现或HTML迁移accept。

#### 方案

##### 1. 强制同步、按HTML需求加载

允许document-model顶层import本仓新html-archive helper，但该helper及新source adapter的顶层依赖只能是node builtins/不加载外部包的本仓模块。新helper用 `node:module` 的 `createRequire(import.meta.url)` 创建包名resolver；创建resolver可在顶层，**`require('parse5')`及任何resolve/import parser的操作只能在实际已选HTML分支内部发生**。不能在顶层检查parser是否安装，不能因registry含HTML变体或路径扩展枚举就加载它。

同步loader的冻结语义如下（设计伪代码，不是repo实现）：

```js
import { createRequire } from 'node:module'
const request = createRequire(import.meta.url)
let parserNamespace
function loadHtmlParser() {
  if (parserNamespace) return { parser: parserNamespace }
  try {
    const loaded = request('parse5')
    if (typeof loaded?.parse !== 'function')
      return { issues: ['HTML archive parser unavailable: parse5@8.0.1 (INVALID_NAMESPACE)'] }
    parserNamespace = loaded
    return { parser: loaded }
  } catch (error) {
    const code = error !== null && typeof error === 'object' && typeof error.code === 'string'
      ? error.code : 'LOAD_FAILURE'
    return { issues: [`HTML archive parser unavailable: parse5@8.0.1 (${code})`] }
  }
}
```

只缓存已验证有parse函数的成功namespace；失败不缓存成空parser或“已检查”。后续HTML仍必须显式失败。无`.default`别名fallback、dynamic import、异步API、worker/子进程代解析、宿主绝对路径、transitive/global手工查找、正则降级或静默skip。直接依赖/lock与Node22.23.2是已提议前提；以后pin/Node变更须重新核，不增加旧Node兼容分支。

checkTemplateBody仅resolved contract.format=html时调用pure HTML检查→loader；checkMigratedDocument先执行原三path/variant/kind/format联合typed guard。错误绑定可先报typed错误，**合法typed HTML需求则必须实际加载parser后再解析**；缺parser必须返回本path明确issue，不能返回[]/metadata partial-success。Markdown/JSON/F1分支不进入loader，继续返回同步array；CLI仍打印原model report/progress JSON和真实非零，不用顶层MODULE_NOT_FOUND崩溃代替结构化诊断。

新HTML Git adapter读取固定33cc raw Buffer不需要parser，保持builtin同步；两个CLI的source dispatch本身不得额外触发parser。F1 branch不因本格式而要求HTML source、HTML pin域或parser先可用。bootstrap仍必需服务真正HTML caller；并非把所有无依赖caller升级成无效输入。

##### 2. Node22.23.2已真实校准的范围

`/tmp/type-pal-html3-c3-sync-loader-probe-20261016.json` SHA dfaabd9105d3303e54796e0c1f3db0e24f9030f1df77b6ffbf287de45b379a07记录私有mkdtemp、原物理package每文件SHA、全部child命令/stdout/stderr/exit和finally清理。无共享node_modules，child NODE_PATH/NODE_OPTIONS均unset、无实验flag。研究脚本只校准语言/依赖primitive，不是正式helper或共同source consumer。

- 无node_modules：按需prototype的MD/JSON/F1分支exit0、parser load attempts0；顶层静态ESM import反证exit1/ERR_MODULE_NOT_FOUND且未进入普通JSON分支。
- 无parse5：HTML demand返回明确parser-unavailable / MODULE_NOT_FOUND，exit1；随后同一进程普通JSON分支仍返回同步结果，绝非HTML通过。
- 物理parse5 8.0.1有、entities无：HTML demand明确ERR_MODULE_NOT_FOUND（entities），exit1，不能只捕获MODULE_NOT_FOUND而让传递依赖缺失漏过。
- 物理parse5+entities均有且逐文件与原包精确相等：`createRequire`同步require ESM成功，process.features.require_module=true；实际named entities/emoji解析得到“研究& © 👻”，返回AST非Promise，连续HTML两次只请求namespace一次、实际parse两次，stderr空/exit0。此真实可达模块图没有阻止require的top-level-await；不从文本猜测支持。

这些观察支持选择同步loader。若未来实际consumer在相同Node/精确包上报ERR_REQUIRE_ASYNC_MODULE/ERR_REQUIRE_ESM或其它load失败，就停止格式包并保真实反证；不能异步化旧接口/改旧tests/换parser逃门。

##### 3. 真实HTML fixture与clean-installed caller分开

新focused html-archive.test可在**自己的owned临时Git目录**物理复制精确parse58.0.1和entities8.0.0到自身node_modules，逐文件核等且不留symlink；研究/测试复制来源可从根已声明且真实安装的包名resolver定位，不能硬编码宿主cache进入生产。夹具仍用真实固定33cc source/baseline对象和实际复制的两个CLI，不能造小分母/新production profile/假批准。

缺包反例必须每种状态spawn**新进程**：成功namespace缓存后在同进程删除磁盘包并不使已加载模块消失，不能把这种假针当缺依赖验证。用同一已合法的HTML/source/route输入，installed fresh child两CLI绿→owned删除parse5 fresh child明确parser-unavailable/非零→恢复精确物理包 fresh child绿；另parse5存在而entities缺失也精确拒绝。progress仍产可解析JSON、issues带实际HTML path，不能是entry加载失败/空stdout，更不能计该HTML完成。

这类局部物理依赖fixture仅证明共同CLI/source与loader需求行为。原198第6节的真正clean full-history clone仍须**没有共享node_modules、真实frozen-lockfile install**，Node22.23.2/pnpm10.29.2、包名import、真实Git源可达及check:docs/progress/lint/diff零诊断；不能拿局部复制测试冒 clean install/GitHub job通过。

##### 4. 第9 review维护与62历史叶锁

根未来同时更新templates/{registry.json,archive-record.md,README.md}时，必须新增维护 `docs/phase-governance/reviews/20261015-agent-first-routing-batch.json` 唯一 `entries[2].path=docs/phase-governance/templates/README.md`（782实际索引，正式写前重核唯一path）。保存完整即时prior current对象的真实Git revision/blob/whole-file SHA/原生选择器；不可只截摘要，也不可把当前旧F1 source/acceptance改成新的HTML接受。

README本身仍governance-index1.0，**其current.templateVersion与templateConformity的1.0不滚archive1.1**。新增HTML入口/前提/未做pilot的具体正文，重算actual afterSha256、revision.implementationSha、evidence.afterSha256、evidence.lineCount和reviewedLines这些实指current的镜像；source与旧receipt/prior/hash保原轴。新维护的Owner/变更/primary/限制须指向根唯一HTML控制事件，root非作者签实际新快照，避免每处复制可漂移pending句。它是原8版本review之外第9个必要review文件，**68版本位置不变**；质量ledger current位于20261016-historical-cards-d.json，已在原8文件内；库存维护与版本roll须落同一唯一current并保完整prior，不增加第10个review文件。

当前782六overlay review文件中按原生已知三种版本形状全枚举120叶：58白名单current滚、47位于entries内旧prior/authorSnapshot、15位于顶层旧mdPilotCandidates/sharedQualityCandidate，合62全部不滚；这是782已有保护集，后继保存完整priors可新增更多历史叶，须在真实新base扩展保护，不把62当上限。每个62的原生key array/value与九维护补充metadata见 `/tmp/type-pal-html3-c3-caller-and-maintenance-metadata-20261016.json` SHA09b2f0e77b2394c374a2431acd102a52abb35cbba9f4678629351510a6917a2b。不是递归替换任意1.0.0；其它16type、旧原文/全部历史对象仍整体锁。实际新base再枚举差异，不能静默变分母。

##### 5. 138正文锁与新工具库存的写入先后

本席另外核到真实重叠：code-quality-file-ledger.md自己是138个overlay之一，原198又要求新增HTML 2tool+1test pending库存/动态总数，若同一delta实施就不能同时宣称138正文全bytes不变。根Codex在2026-10-16内部明确采用分轴：**新增3工具代码/库存先由根独立接入、维护、验收并提交；之后取实际稳定base冻结68版本滚动映射及138正文锁**。此为设计顺序决定，不是本稿新字节独立accept或实施签字。当前canonical archive仍1.0时，新HTML code只在明确future1.1 test合同中受验；原MD/JSON分支保持，三原HTML仍pending、不写正文、不提前发布variant批准或迁移数。代码/新3 pending库存完成实际独立接收后，根将该commit作为版本roll真实即时source；之后138 body全bytes锁才成立。

代码库存接入轴中，只有该ledger允许精确3个新pending行、由actualtracked inventory派生的当前summary及唯一current维护record修订，保旧rows/原quote/历史并记录真实after/完整prior；A8/L4其它新路径只归它们的根事件，不混入HTML3新3信用。版本滚动轴才执行68个白名单版本位置，3 direct MD各只live Template单行，138 overlay正文从前轴已接受commit全bytes锁。两个轴均0重复迁移/旧代码审计信用；首pilot仍要等两轴各自独立接收。本稿不自行准入合包备选、不写任何代码/账本，不改A8/L4范围。

#### 边界与风险

本次只/tmp研究与元数据观察，无repo文件写入。处理期间根开始接入A8八路径，末次status显示其已stage；本席没有触碰/还原它们，782是本报告固定来源而不是宣称当前dirty树全已验。L4/Q6同样不动。

首次打印README整个current含大量nested历史，输出截断；未冒全记录人工读完。随后只投影实际current字段/镜像与唯一selector，whole prior保留方案由真实Git锚定，未来写入/独立复核另做。本稿也不从“15旧tests绿”推出新loader/F1未来无回归：当前根尚未实现HTML格式。

无新的用户产品裁决需求；本稿把根给定方向具体化。root仍需非作者独立review此补充及真实primary，连同198和原counter冻结后才分包准入。原设计agree不预签C3未来实现，真实旧源码/测试与所有first-counter/观察失败原样保留。

#### 验收

未来最小新增合同放同一个已提议html-archive.test.mjs，不再新增更多测试文件/改旧tests：

1. **同步/需求边界**：实际新model可在无node_modules owned目录被两个CLI加载；MD/JSON/F1只返回既有同步array/报告，不先报parser缺失。完整原两suite15项原文件hash锁定重跑，正控/反控理由与原来一致；原各MD/JSON/default consumer回归也不变。不得通过给旧fixture装包、改env/加await、修改/删断言换绿。
2. **真正HTML依赖合同**：一条合法joint HTML source/body通过两个实际复制CLI；fresh child缺parse5或缺entities时精确path/parser-unavailable、非零且progress JSON仍可读，恢复包后通过。成功场实际parse5.parse被真实source/AST流程使用，代码非作者全文核；只检查包存在不算。
3. **实际安装/全门**：独立clean full-history/frozen install和原198的source/DOM/CSS/links/typed guard负针、68 current版本位置与62历史叶锁、第9 README current/fullprior/after镜像、代码库存先提交后锁138的真实base全部另验；所有error/warning/info零。旧15当前基线、Node语言探针均不替这些结果。

loader研究之外没有新helper实现/格式冻结/HTML canonical migration、浏览器/HTML JS/CSS、产品/旧测试变更、coverage/runtime/E2E/视觉/可访问性或全量完成信用。根目标持续build/active，未达硬验收不done。


## 边界与风险

唯一新增span/精确1475B CSS/严格UTF8/parse5零解析问题/13可见metadata/五章/8ID/原Buffer逆回与AST第二证据全部必需。同步API与MD/JSON/F1无依赖合法caller保持；parser只实际HTML需求时包名require。真实33cc/1838源不能用小profile或候选mutablepin代替；模型和进度同jointconsumer，失败显式拒绝，approval/current/complete或像素可用性均不由格式门授权。

68白名单和62历史叶、138overlay锁是782的观察起点。实际代码库存/并行L4后继接收后必须从稳定fullcommit重新枚举所有current/version/body/history，新增条目不静默漏掉；若与旧映射不同先根复核精确变化再冻结新清单，不能硬卡旧分母或擅自扩写。其它16type、MD默认语义、五JSONpins/两F1 API、全历史对象保留。CODE-QUALITY的新增2tool+1test仅待核，专项closed不增加；同一ledger版本轴只维护唯一current，完整prior实际Git留存。

## 验收

阶段A仅build allowed：根发送本冻结commit并建新managed树后，唯一Owner html_contract_refinement只改package.json、pnpm-lock.yaml、.github/workflows/docs.yml三个路径。root devDependency精确parse5=8.0.1，lock importer复用既有依赖不做无关升级；Documentation流程full-history checkout、pnpm10.29.2/Node22.23.2、真实frozen-lockfile安装与实际docs/progress/lint。不得改packageManager、其他CI、脚本、模板/registry、HTML、旧tests、产品、coverage或质量规则。源码fixed33cc在真正无共享node_modules full-history clone可达，并实际安装/调用零EWI；这里只能报告本地CI等效，不能冒GitHubjob运行。独立接收精确三文件后才准下一阶段。

阶段B代码六路径、阶段C根库存接入/独立commit、阶段D真实新base版本维护、阶段E actor-v2单篇+native两路径pilot、后续v1/place，均尚未build allowed。B真实少精focused反例/同步旧caller不改/两CLI joint与新依赖缺失拒绝、真安装；C只3pending/动态计数及当前ledger/fullprior；D重新冻结具体版本/所有旧正文与历史锁并维护README第9review完整prior/5镜像；E非作者全文291原/全部新五章及43语义、source/DOM/links实际核后另授后两篇。每阶段根明确实际base/单Owner/最小写域，不能由设计自扩。

根最终另接三unique current/registry/routes及非作者精确零门；HTML不在184MD catalog，无虚增phase覆盖。所有新控制/设计/native文件自身是pending增量，不计自迁移；全1838及所有增量/artifacts继续build，最终语义审计/零诊断/main推送清理未完成。
