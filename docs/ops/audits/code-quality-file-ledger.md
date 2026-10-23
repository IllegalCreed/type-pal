# 逐文件代码治理账本

Status: current
Last reviewed: 2026-10-23
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

本账本是 CODE-QUALITY 专项逐路径状态与证据索引，也是 `code-quality-ledger.mjs` 的机器输入。`已验证/保留`表示专项已登记的历史核验，不是本轮重新读过相应产品或认证旧测试质量；全包绿灯、文档迁移和机器PASS都不自动增加已闭合数量。

## 范围

起始基点为 `b9ba7e0faadf56519da024c0343f5b44b9a5c447`。现行清单从Git tracked的packages/scripts指定代码扩展与JSON生成；七包名单仅domain标记，静态caller不是完整运行图。未显式登记的清单路径仍待核，不能静默视为无问题。

原表234条被消费者读取的记录逐路径保留category/status；原末3条GLM待核行在空行后，旧parser未消费，本稿明确归并到唯一连续表，状态仍待核。G批次新增7条本任务docs工具/测试（5tool+2test）仍全部待核；K0另新增1个退休入口合同测试，L再新增1个索引生成链合同测试，九项均仅库存登记；F1再新增真实Git Buffer reader与focused baseline测试各一项pending；A8再新增五个格式工具和一个合同测试，六项均待核，不重设旧状态或增加已闭合核验。

## 当前状态

2026-10-23 CODE3l四片有限收口：14文件八维，12项接受（新关闭精灵源与共享blit，6项旧测试重审恢复），UI规则重复与装配器生命周期仍review；固定65accept／18partial不变。3405tracked／411closed／102review／2892pending。相邻82文件664例，全check20563包例+700工具例、game typecheck；唯一官方采集20134例／775源，按用户授权精确重算game branches/functions并登记26例退役，同报告ratchet／严格protected通过。运行与静态零诊断，原始拒绝／错误断言原件保留；本地有限窗完成，远端检查与合并另核。[3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md)。

2026-10-23 CODE3k／3l有限质量收口：27文件逐项A–H，26接受／draw-number仍review；三项旧测试补强恢复接受，1新数字夹具闭合，相对窗口前净增1closed。当前3404tracked／409closed／103review／2892pending，固定65accept／18partial，两卡仍partial。全check 20589包测试+697工具测试、official20160／774源、同报告strict/protected及静态均零诊断；原失败保留，远端检查/合并另核。[3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md)。

2026-10-23 CODE3j局部校准：五坐标、BGM86与入塔三场景已实跑，checkpoints一文件review→已验证；固定83卡65accept/18partial。当前3403/408closed/103review/2892pending；实现与配置正文保持，不授完整剧情/E2E信用。[原件与快检](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-route-calibration/README.md)。

2026-10-23 CODE3j质量窗口：三文件新关闭（time-format源与toast/map专测）、checkpoints旧关闭撤review，其它同版接受刷新；当前3403/407closed/104review/2892pending，固定83卡仍64accept/19partial。toast真实6→4合同迁移，未改保护规则；坐标/BGM/入口未知不因静态绿关闭。集中门和实际原件见[本窗收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md)。

2026-10-23 CODE3i：13明确文件逐项A–H，10新关闭与3旧接受刷新；固定83卡64accept/19partial，3404tracked/405closed/104review/2895pending。全check20601+692工具、official20172/774与同报告strict/protected均项目零诊断；原中断coverage不计通过，唯一完成报告复用。仅formatter已覆盖结构计数精确协调与client2→1退役，无规则/接口/产品行为变更。原72窄失败卡收口，main/bootstrap/splash/格式广域不附带接受。[本窗原件及只读复验](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md)。最终文档门/远端Action提示与PR按实际后继回执核。

2026-10-23 同步英文main365e582e2：保留本窗七新关闭、上游英文28条pending及两边完整历史，当前3402/395closed/107review/2900pending，固定83卡63accept/20partial。下条3374数字与20512/20086门是同步前d297候选；新组合check20601+691工具、official20172/774与同报告protected已0回退/0项目诊断。后继main94d仅文档，不重采；末轮文档静态、PR的documentation/fast-coverage和合并按实际回执核，不以旧main CI代替。

2026-10-23 RLE／snapshot／启动取消窗口：七个文件新关闭，四个旧关闭只刷新、一份shared专测仍review。原3h六生产文件逐项八维/真实caller与直接测试已闭环，63accept/20partial/0pending；不是shared格式或bootstrap主流程接受。当前3374/395closed/107review/2872pending。[逐文件、迁移与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md)。全check20512+691工具、单次official20086/760与同报告protected通过，项目/静态诊断0；前窗GitHub Coverage success，7条平台弃用提示单列。仅一条精确6→2退役，未降规则/阈值；shared rle.test整文件与格式真值继续review。

2026-10-22 英文发布第二次同步main：保留main`d297e64d0`的blob/宿主/对话逐项裁定、RLE适配源撤review和全部原件，叠加英文28条隐式pending；当前3,402tracked/388closed/111review/2,903pending，unclosed3,014。不新增整文件关闭，用户验收与发布授权继续有效；同步后的统一门、CI及部署按实际后继结果写回。[本次同步](../evidence/GAME-ENGLISH-1/main-sync-2.json)。

2026-10-22 英文发布同步main：合并英文候选`0adec15c5`与main`acb96a123`，保留main五个资产文件已验证状态和英文28条新增隐式pending；当前3,402tracked/382closed/110review/2,910pending，unclosed3,020。以下两分支时点记录原样保留；本次仅核库存与合并差异，不新增整文件关闭。用户已认可英文并授权CI、合并和阿里云发布，合并候选统一门及远端发布仍按实际后继回执记录。见[发布前同步回执](../evidence/GAME-ENGLISH-1/release-preflight.json)。

2026-10-22 第一阶段英文库存同步：相对3,373净增28条tracked实现/测试/修订数据路径，只补隐式pending；当前3,401条，377closed/110review保持，pending2,914、unclosed3,024。实际新增路径与原状态不变证据见[本卡库存核验](../evidence/GAME-ENGLISH-1/docs-maintenance.json)，功能/有限差异验收不自动关闭本专项旧广域文件。

2026-10-22 blob/公共宿主/对话本窗：九文件按具体A–H接受，其中七个review新关闭、两旧关闭刷新；RLE适配源因零生产出口的归属/专测去重未决撤旧关闭，专测仍review，净增加6closed。当前3374/388closed/111review/2875pending，固定83仍62accept/21partial，不接受整个3h/3i。[逐项裁定及原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md)。完整check实际20515+690工具，末尾三测试/精确数据以24定向+TC/99工具刷新；不冒称最后集合重新跑全check。单次official20090/760与同报告protected均0回退/0诊断，无阈值降低或第二采集；最终文档/静态与推送以回执/Git为准。

2026-10-22 当前RLE适配层导出复核：decodeRle仅两测试使用、RleFrame无适配层消费者，不能写成活跃生产公共出口。源旧关闭撤review，专测已review继续；接口归属与shared测试排重另行核定，不在覆盖率采集期间修改。当前381closed/118review/2875pending，0预先新关闭；其它九文件按本窗证据/统一门裁定。[事实与范围](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/review.json)。

2026-10-22 blob/宿主/对话三个相关片：11文件逐项A–H、全局隔离与完整告警反控、6重复例断言去向已记录；七原隐式pending测试登记review，0新关闭。当前382closed/117review/2875pending，固定83仍62accept/21partial。生产仅注释、宿主仅类型/死导出私有化，原正文守恒；全check/official/protected留本冻结窗口集中，未提前通过或接受3h整卡。[blob/宿主/对话逐文件八维](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md)。

2026-10-22 3h本模块有限收口：五个源/测试review→已验证，逐文件八维、正式红绿、排重/typed输入和完整原件见[收口记录](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json)。同步main6a29后完整check20521+686工具、七包TC、official20095/760源与同报告protected均完成，硬静态/测试诊断0；此前缺flag/缺资源/中断原件不改写通过。3374tracked/382closed/110review/2882pending；固定83仍62accept/21partial，3h/helper/格式未决不随包绿关闭。

2026-10-22 3h资产测试质量切片：两个测试从隐式pending登记review，0新关闭；四LRU合法typed输入/引用结果、十条恢复路径完整预期告警已补。loader/RLE适配仅注释正文守恒，UI帧编号反证获批后另提交修复。[本片A–H与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/README.md)。全仓/official/protected留相关模块收尾；固定83仍62accept/21partial，不据定向绿关闭3h。

2026-10-22 双阶段脚本修复库存同步：新增17个tracked实现/测试路径，只补库存及隐式pending计数；377closed/110review保持，pending从2869增至2886，总数3373。CI首轮因旧汇总未含新文件而拒绝，未执行覆盖率；不修改规则或将新路径自动关闭。该功能的有限差异审查和回归独立见[脚本修复任务](../tasks/GAME-SCRIPT-CORRECTIONS-1.md)，库存证据见[本次同步回执](../evidence/GAME-SCRIPT-CORRECTIONS-1/ci-inventory-fix.json)。

2026-10-22 3w模块收口：五文件按逐文件八维及正式反例闭合，[收口原件入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json)。完整check20443/工具684、七包TC、official20045与同报告protected均零诊断；初轮12超时原件保留且未改规则/timeout。当前3356tracked/377closed/110review/2869pending，固定83卡62accept/21partial。仅3w原状态/结算/清理合同，不升格整体battle-system/event-system或视觉E2E。

2026-10-22 3w战后HP/MP窄修：用户批准保留脚本效果；两正式业务红→238定向/相邻绿、game TC0，原导入真实190tick战斗退出394→500。旧结算测试已验证暂恢复review等待模块集中门，0新增关闭；3356tracked/372closed/115review/2869pending，61accept/22partial不变。[本片八维与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/post-player-state-fix.json)。

2026-10-22 3w临时加成窄修：用户另批全角色Extra清理，正式旧一业务红→当前28定向+39/169相邻及game TC0。新测试只登记review，0新增关闭；3356tracked/373closed/114review/2869pending。61accept/22partial不变；修复后全check/official/protected留3w多卡模块收尾，未借旧产品门宣称当前统一门通过。

2026-10-22 3c/92原合同收口候选：3c专属动画回归与92工程纠错据证接受，固定83卡61accept/22partial/0pending。605585752两项明确撤回在89bf84e16合并丢失，live两旧关闭先恢复review；专测本轮完整A–H后单独接受，684行Workbench仍review。相对前窗净减1closed，当前3355/373closed/113review/2869pending；没有因92对30产品批量恢复。3w/3r只修两段失实注释，parsedTS/JS不变，关键未知继续保留。复用完全同版的20434全check、最终game3724及单次official20040/758；当前文档静态与集成另按最终回执，不冒称新采集。[动画/账本入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3c/closeout.json)、[工程入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/92/closeout.json)。

2026-10-22 经验/成长/物品窗口：59恢复接受、3x原合同新接受，固定83卡59accept/24partial/0pending；v1恢复及progression/levelup两review关闭，三旧closed按变更刷新；item由隐式pending登记review，不关闭。账本3355/374closed/112review/2869pending，相对已合31净增2closed。实际全check20434后仅物品三个game文件变化，以完整game TC/3724刷新该包；单次official20040/758与同报告strict/protected零诊断，原件含失败/缺导入勘误。没有新baseline降低授权/规则/退役。最终文档静态按收尾回执，以下旧数字为各时点历史。[唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md)。

2026-10-22 新经验输入反证：仅v1.ts已验证→review、CODE59accept→partial；极大有限余数可经真实导入/内存槽/开战进入不能推进的结算。0新关闭，固定83卡57accept/26partial，3355/371closed/114review/2870pending。产品未改，新增数值域待裁决；原3v/78及旧形状/finite证据不重写。[当前反证](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md)。

2026-10-22 基础动作/移动端影响收口：16明确文件逐项八维、真实反控与当前绑定成立，3v/78按原合同接受；attack/AVI两review恢复，14既有closed刷新不重复计数。固定83卡58accept/25partial/0pending，3355/372closed/113review/2870pending。全check20432、最终官方fast ratchet及同报告strict/protected均零诊断；无测试退役/规则放宽。[唯一回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/README.md)。以下保留各旧时点计数，不覆盖本节。

2026-10-22 移动端影响当前复核：7个既有closed实现需要增量绑定，14新增路径仍pending。AVI连续拒绝发现实证UI重试失效，单个实现撤review；CODE78 accept→partial，当前固定83卡56accept/27partial/0pending，账本3355/370closed/115review/2870pending。原单次拒绝/skip证据保留，不把通过的868完整CI覆盖到新增失败合同。其它六项及3v窗口继续，[当前反例与停止线](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/mobile-revalidation/README.md)。

2026-10-22 后继CI／WORD记录：385主线Docs成功、Coverage在pal-meal-shell normal landing默认5s超时。当前仅核该测试夹具内部重复压缩，九业务主体/timeout与产品不改；该Reforge文件保持隐式pending，0新增关闭。用户已选择隐藏成长保留TS持续增长，明确记录第一阶段偏离，不据此自动接受3x。完整实际门与原件随[战斗窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)后继记录，计数371/114/2870保持。

2026-10-22主线CI窄返工：cb67a6a0e原窗口已FF main，实际Coverage在M05异步就绪断言失败；补真实等待/文案/独立oracle后，又核清K06五条RAF act诊断。最终official20032/758及固定main保护零诊断，全部覆盖率计数不变。两editor测试仍隐式pending，未授整文件接受，0新增关闭；371/114/2870保持。[完整失败、返工及最终原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md#cb67a6a0e远端ci与两测试窄返工)。本笔远端同步/CI另按实际refs/run核对。

2026-10-22 状态／结算／成长窗口：10明确文件八维与反控接受，CODE3u按原合同接受；3w/3x关键余项仍partial。当前371closed/114review/2870pending，库存以机器为准。完整check在未变产品执行上20430零诊断，随后唯一H02测试夹具增量16/TC重验；最终official fast及同报告严格protected按原件记录，未伪造第二次全check。[唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)。

2026-10-22 结算／成长窗口：三源直接owner依赖及三个共用type搬移，新增data文件先登记review，0新增关闭；3355/361closed/124review/2870pending。四文件A–H、声明／正文守恒、七真实函数绑定、40相邻及game TC见[本窗入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)。统一门未跑，WORD新反证待裁决、非队员Extra仍未知，3w/3x不升accept。

2026-10-22 CLI IO相关卡窗口：6个明确文件A–H与必要反控成立后接受，冻结后355→361closed/129→123review；相对窗口最初356净增5。移动端14新库存保持pending，当前3354/361/123/2870。最新main整合后全check20430、official ratchet/protected同报告20032零诊断；首次指标拒绝及第二次移动目标保护拒绝完整保留。CLI/slice大范围仍review，CODE3/3g仍partial。[本窗入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/README.md)。

2026-10-22移动端集成：新增14个tracked代码路径，仅同步库存与隐式pending数量；既有逐路径状态和历史正文不变，0新增专项closed。软件实现、独立复核和运行证据见[移动端任务](../tasks/GAME-MOBILE-LAYOUT-1.md)；不由本次库存同步授予全仓代码治理关闭信用。

2026-10-22 CLI/事件窗口收口：五文件明确范围接受（4新关闭+boundaries撤回后重验1），另3旧关闭维持撤review，相对窗口前净增1closed。全check20392与单次官方ratchet/protected19994零诊断；CLI/其它slice测试仍review，CODE3/3g仍partial。[唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/README.md)。

2026-10-21提取四卡窗口：3b/3d/3f原合同接受、3g仅测试宿主切片，83卡56accept/27partial。17文件当前逐项接受，其中12未闭合转已验证、5既有关闭刷新不重复计数；此前两PNG漂移撤回已单记，sprite.ts整文件仍review。全check20390、ratchet/protected各19992零诊断；SSS删4条已覆盖临时语句按精确授权重算，测试/范围不删。当前3336/355/120/2861以机器实核。[统一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json)。

2026-10-21 CODE3d窄对账：既有README已经明确撤回sprite.ts与sprite.boundaries.test.ts，live却仍旧已验证行；两项按直接撤回记录恢复review，非本轮新增产品缺陷。当前343closed/126review，后继具体合同完成后再逐项接受。

2026-10-21用户要求多卡集中重门：CODE3b/3d/3f/3g合为同一窗口，新增CLI测试宿主及其3合同测试两路径先登记review，未关闭；6+4+3+5当前文件八维与必要返工/反控已登记，full gates仍待。原53accept/30partial不随包绿变化。[四卡原件入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json)。

2026-10-21 shared CODE2/2b：11文件逐项八维与既有native适用性成立，6review转已验证、5既有关闭重新核当前信用且不重复计数。RNG重复17→16保留强oracle；YJ2新增独立归约单红后恢复，解码正文不变。shared114/extract18/game31、20386check、official ratchet/protected各19988全部零诊断；当前3334/345/122/2867由机器复核。O-5为原卡支持域限制，不新增尺寸cap；RLE与广域caller不附带关闭。[唯一回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json)。

2026-10-21 CODE59/60模块收口：九文件逐项A–H及quick-save主测既有八维/反控成立，10review转已验证；quick-save.ts既有关闭不重复计数。原10红/历史2红/角色4红与finite单红保留；52相邻、20386全仓check、19988 official ratchet/protected均零诊断，未降baseline或改规则。当前3333/339closed/126review/2868pending由机器复核；其余pre94与广域Save/IDB/面板不附带关闭。[唯一回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)。

2026-10-21 V1结构候选：4纯守卫+2历史fixture新增，连同data.ts已有类型合同共7pending登记review，0新关闭。96字段/历史非空/角色域、冻结52相邻绿、finite单红和5次原生FileReader/独立IDB证据见[V1入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)。当前329/136/2868由机器核对，最终统一门仍待。

2026-10-21已批准Save内部类型分离：新增data.ts仅定义JSON数据/快照，与四既有caller模块编译正文不变。新增路径保持pending，0新关闭；329/129/2869由机器核对。19定向/相邻与typecheck零诊断，不授完整内容校验信用，详见[五文件有限A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-types-local.json)。

2026-10-21存档中间片：MSIO四合同迁入parser/quick-save后删除旧文件，不算关闭；quick-save主测8→9且统一门待收尾，旧关闭暂撤review。18定向/相邻与静态零诊断、旧绿/新两业务红原件见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-tools-local.json)。329/129/2868须由机器清单复核，不授CODE59完整内容信用。

起始基点机器清单：2,962。当前 tracked 清单：3,405。
当前已闭合核验：411；已读但待审：102；尚未逐文件核验：2892；合计未闭合：2994。

2026-10-18 审计簿记六项按同SHA字节/实际caller修正，另纠正两EOF界；55只后补当前读边界，未找回当时原件，无新增closed或产品/测试改动。见[簿记返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/audit-metadata-repair/README.md)。

2026-10-18 九笔补审：六字段/读侧克隆漏迁已补API，1旧菜单测试关闭转review，0新增closed；提取三边界继续pending。见[补审返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)。

2026-10-18 搜索坏注释/弱边界已补，另有行动同速排序与Wear毒列表两个直接counter；5旧closed转review，0新closed。见[本批证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)。

2026-10-20 GLM敌人/角色四文件：纠正名字索引/带版本行号等错注，补强OBJECT完整投影和非空全零角色断言；两旧产品关闭撤review，两专测从pending登记review，0新关闭。2个GLM实际改动源码补齐有限八维，累计7/41；不是83卡或包级验收。[原件与合同映射](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-enemy-role.json)。

2026-10-20 GLM五处正文变化补证，战内复活漏审两红后修；两旧closed撤review，BGM从pending登记review，0新关闭。当前GLM12/41源码有详细记录，其余29注释源待核。[本轮返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-dead-removals.json)。

2026-10-20 GLM最后29个实际改动源已逐文件补有限八维/原件边界；13源文案纠正、event私有dither去重与两例测试补强。12个旧产品关闭和1个旧测试关闭遇具体B/E反证撤review，10个原未列产品pending及1个相邻dev测试pending登记review，0新关闭；41/41仅表示本次GLM变更源有详细记录，非全部83卡/全仓或文件accept。[本轮入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json)。

2026-10-20本波仅门禁：E2E-route实质发布复核仍proposal；两新增覆盖率工具/测试登记review，runner新授权差异撤当前关闭信用为review，0新closed。精确baseline重算与未执行项见[集中门回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json)。

2026-10-20本波集中主门：check七包20,377例、ratchet/protected各19,979例通过；main保护仍查精确退役与范围，合理结构重算原始计数保留。末轮静态与原件快检见[集中门回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json)；逐文件状态不随门通过升格，0新关闭，两退役文件仅有限数据协调仍待核。

2026-10-20 pre94 C1–C3：69路径按具体证据接收为有限复审，61条原未登记路径仅转review，0新增关闭；八维缺项与产品未知不因原件/门通过消失。Codex修四份测试夹具与RNG弱跳过oracle，详见[本批记录](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/codex-pending27-acceptance.json)。

2026-10-20五卡复审：18份文件逐项A–H/旧证据适用域与必要返工已核，明确接受16个文件，复合Dev/dispatcher/poison及广域上下文继续review；不是因包绿批量关闭。原盘0x61两红、F1/90旧绿新红和精确退役见[五卡入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。

2026-10-20 pre94正式收口首窗：6a/82完整八维与当前源码/原件匹配，6个文件从review接受；79/80/81/90原卡合同已满足，卡接受不附带关闭共享大文件。详见[逐卡裁定](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json)。

2026-10-20菜单模块：CODE83–89/91/93原范围36文件逐项接受（34review与2pending），八维、保留项、实际整改、13旧反控复用与本轮集中零诊断门见[唯一记录](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json)。mode/driver/item-select及其它68卡不随门通过升级。

以下是唯一live机器表。证据描述属于各原卡/日期，尚未再核的当前源码、raw、测试质量或运行结果不继承；Q3k反控摘要只按原卡与总纲明确文字纠正，未重新执行反控。

2026-10-18 RLE校准仅恢复两条已撤回review，0新关闭。独立全表对账另发现89bf84e16合并时243条review记录在活动表丢失；当前尚有65条closed候选、129条未显式登记路径需逐项核后继证据，其余49条已处review/rework，不在本次批量改状态，也不得据本表冒称这些候选已重新验收。完整差异与范围见[RLE校准](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/calibration-20261018/README.md)。

2026-10-18 shared阶段1仅接收有限注释/证据；根据CODE2/2b既有撤回恢复4个测试文件为review，0新关闭，O-5输入域待核。见[阶段验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage1.json)。

2026-10-19 Codex接手GLM后续大包返工：已修错注/格式、补word8/8；shared三份产品类型撤旧关闭为review，四份旧类型测试记录迁移为一个编译合同review（净减3文件），0新关闭。包级全绿不授逐文件八维信用；见[返工与逐文件矩阵](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage2-rework.json)。

2026-10-19 WORD/GBK五文件八维返工：纠错注/私有名、抽共享定宽解码、8→7精简强化与九标点反例；两产品旧关闭撤review、三测试登记review，0新关闭。20独立合同与11新旧输出对比在有限域成立，短输入/旧字段/全仓门仍未收口。见[WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)。

2026-10-19 83卡实际范围对账另确认annotation两测试与既有撤回证据SHA精确一致，live仍旧已验证；只恢复这两行review，其它漂移候选逐项待核。当前范围路由不等于重读/accept，见[83卡范围对账](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-pre94-scope.json)。

2026-10-19 CODE82两文件A–H续审：私有offset-only长度诊断、字段命名/计数复用；原8身份/测试字节保持，定向8与相邻3、原盘等价及有效反控成立。既有脚本review保持、测试从pending登记review；0新关闭，见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-code82.json)。

2026-10-19 CODE6a四文件八维续审：发现隐藏示例可虚增进度/坏输出参数假成功，先反例后修；缓存/命名/夹具隔离纯重构另提交。ledger工具及其测试两旧closed精确撤review，其它原review保持，0新关闭；见[CODE6a四文件续审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-code6a.json)。

2026-10-21用户批准旧OGG路径退役：唯一测试夹具audio-element-fixture.ts随全部consumer删除，从当前tracked/live表移除，未记已验证；三个专测身份与授权见[input/audio回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json)。73/74七个当前文件通过逐文件核验及集中门后转已验证，已删除fixture不计closed。

2026-10-23 CODE3k／3l质量窗口：三项旧测试信用因有效counter暂撤review（framebuffer leaves、dither相位、飘字主测），新共享数字夹具review；其余既有状态不预授新集成信用。四个正式全文件反控旧绿/新单红，当前90定向、695相邻与TC原件已存；统一门尚待集中，零新关闭，固定65accept/18partial。见[八维与快检](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md)。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/shared/src/__tests__/yj2-rescale.json` | fixture | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/pal-extract/src/io/yj2.test.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/game/src/tools/__fixtures__/save-v1-store-v2-nested.json` | fixture | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/tools/__fixtures__/save-v1-store-v2.json` | fixture | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/battle/actions/item.ts` | product | review | [物品上下文八维/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-item-role-context-review.json) | 已批目标传递修复与注释整改；C返回script pointer/异常等广域生命周期影响未核，整文件保持review，未因门绿关闭 |
| `packages/game/src/core/save/v1.ts` | product | 已验证 | [经验/成长八维与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md) | 原合同逐文件接受；已批准WORD输入与TS属性偏离区分，真实红绿/旧反控/原盘表及集中门零诊断；不扩大相邻系统/存档整体信用 |
| `packages/game/src/core/save/v1-battle.ts` | product | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/save/v1-world.ts` | product | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/save/v1-shape.ts` | product | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/save/data.ts` | product | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/menu/__tests__/magic-cost-fixture.ts` | fixture | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/__tests__/inventory-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/shared/src/rle.ts` | product | review | [CODE1撤回与本次独立校准](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/calibration-20261018/README.md) | c727bc81e已撤回；89bf84e16合并旧live表导致状态漂移，本次恢复review；格式/注释/整卡与统一门未收口 |
| `packages/shared/src/rle.test.ts` | test | review | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 仅承接容器完整平面oracle；原整文件/格式与分配真值仍review，不因本片绿转关闭 |
| `packages/shared/src/rle.boundaries.test.ts` | test | review | [pre-94 CODE1 RLE复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md)；strict framing、相邻 offset 截断反例 | 新增前一帧帧头截断合同；注释/整卡/统一门仍待，不计 closed |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 既有关闭按当前指纹和逐项八维刷新；不增加新关闭数，不授shared格式或完整启动视觉信用 |
| `packages/shared/src/mkf.ts` | product | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/mkf.boundaries.test.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/rng.ts` | product | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/rng.boundaries.test.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/editor/src/core/project-reference.pal.test.ts` | test | 已验证 | CODE-QUALITY-1b；collector 直接结果与历史提交证据 | 仅更新过期 oracle |
| `packages/pal-extract/src/events/annotate.ts` | product | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3f/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/events/annotate.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3f/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/events/annotate.glm-runtime-resource.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3f/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/events/slice.ts` | product | review | [已批准slice本地八维](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-slice-approved/review.json) | 6业务红后53/452绿，纯遍历去重；本窗统一门待聚合，不授新关闭或单片运行信用 |
| `packages/pal-extract/src/events/slice.test.ts` | test | review | [已批准slice本地八维](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-slice-approved/review.json) | 6业务红后53/452绿，纯遍历去重；本窗统一门待聚合，不授新关闭或单片运行信用 |
| `packages/pal-extract/src/events/slice.boundaries.test.ts` | test | 已验证 | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 明确五文件范围逐项A–H、旧绿新红与完整冻结门；不附带关闭CLI或其它slice测试 |
| `packages/pal-extract/src/events/slice.glm-runtime-resource.test.ts` | test | review | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 原三防御观察的生产域仍未知；source两批准项已本地修复，452仅回归，本窗统一门待聚合 |
| `packages/pal-extract/src/io/msg.ts` | product | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/io/msg.boundaries.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/io/sss.ts` | product | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/io/sss.boundaries.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/shared/package.json` | product | 已验证 | shared check/typecheck；仅 workspace 元数据 | 无运行时逻辑 |
| `packages/shared/tsconfig.json` | product | 已验证 | shared typecheck；编译边界 | 无产品行为 |
| `packages/shared/src/events.ts` | product | review | [shared八维补维与精确counter](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage2-rework.json) | 旧B/E关闭存在错注/运行时伪类型信用；本批纠正并保持review，公共出口未知不代替闭合 |
| `packages/shared/src/input.ts` | product | 已验证 | 直接读取 AbstractKey/InputSource；input type contract | 类型 schema，未改输入语义 |
| `packages/shared/src/index.ts` | product | 已验证 | 直接读取 barrel exports；shared typecheck | 公共出口保持 |
| `packages/shared/src/pal-authored-map-names.ts` | product | 已验证 | authored fixture hash/222 entries 测试 | 缺名显式 undefined，无 fallback |
| `packages/shared/src/resources.ts` | product | review | [shared八维补维与精确counter](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage2-rework.json) | 旧B/E关闭存在错注/运行时伪类型信用；本批纠正并保持review，公共出口未知不代替闭合 |
| `packages/shared/src/rle-encode.ts` | product | 已验证 | encode roundtrip、独立 byte oracle、128KB guard | 与 RLE decoder 合同一致 |
| `packages/shared/src/tables.ts` | product | review | [shared八维补维与精确counter](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage2-rework.json) | 旧B/E关闭存在错注/运行时伪类型信用；本批纠正并保持review，公共出口未知不代替闭合 |
| `packages/shared/src/yj2.ts` | product | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/__tests__/glm-foundation-fixtures.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/__tests__/public-contracts.ts` | test | review | [编译合同与旧用例映射](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage2-rework.json) | 14个类型/本地fixture运行时用例转编译检查；缺flags反控已证；统一门仍待 |
| `packages/shared/src/index.test.ts` | test | 已验证 | timing constants contract | 公共常量 oracle |
| `packages/shared/src/pal-map-names.test.ts` | test | 已验证 | 222 entries/hash/undefined gaps | authored fixture oracle |
| `packages/shared/src/rle-encode.boundaries.test.ts` | test | 已验证 | 126/127/128 byte oracle、pad/offset | 高判别力反控 |
| `packages/shared/src/rle-encode.glm-runtime-resource.test.ts` | test | 已验证 | 真实 runtime resource encoder contract | caller oracle |
| `packages/shared/src/rle-encode.test.ts` | test | 已验证 | encoder/decoder roundtrip、128KB guard | 合法输入合同 |
| `packages/shared/src/rle.glm-o.test.ts` | test | review | [既有撤回](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2b/README.md)；[阶段1账本校正](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage1.json) | CODE2b四条YJ2重复退役时旧关闭已撤回；本批仅作YJ2相邻原生结果，不授整文件八维accept |
| `packages/shared/src/rng.test.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/shared/src/yj2.boundaries.test.ts` | test | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/pal-extract/src/resources/sprite.ts` | product | review | [CODE3d原明文撤回](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/README.md)；[当前逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/closeout/review.json) | 原回执已撤关闭但live仍旧行；按结果漂移恢复review，当前同窗最终门前不升格 |
| `packages/pal-extract/src/resources/sprite.boundaries.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/editor/src/ui/SpriteFrameWorkbench.tsx` | product | review | [3c明确撤回与当前复核](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3c/README.md) | 605585752已撤回整文件关闭；89bf84e16合并恢复旧行形成漂移。仅动画切片核过，整组件仍review |
| `packages/editor/src/ui/SpriteFrameWorkbench.animation-boundary.test.tsx` | test | 已验证 | [3c当前逐文件A–H与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3c/closeout.json) | 原1身份/三有效反控及当前两完整门单例执行成立；精确同版复用，不附带整个Workbench或runner关闭 |
| `packages/pal-extract/src/resources/parsers/_utils.ts` | product | 已验证 | 直接读取 layout 常量与 u16/s16 helper；所有 parser callers、typecheck | 纯布局 helper |
| `packages/pal-extract/src/resources/parsers/ball.ts` | product | 已验证 | RLE header/坏帧 skip、BALL caller 与 parser tests；全包通过 | 保留空 chunk skip |
| `packages/pal-extract/src/resources/parsers/battle-fields.ts` | product | 已验证 | 12B fixed record/signed effects guard、真实 DATA caller 与 tests | 非整除显式失败 |
| `packages/pal-extract/src/resources/parsers/data-misc.ts` | product | 已验证 | level-up/effect table contracts、现有短输入宽容测试与 real DATA caller | 宽容截断合同有直接测试，未擅改 |
| `packages/pal-extract/src/resources/parsers/enemies.ts` | product | review | [GLM敌人/角色四文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-enemy-role.json) | 错注已纠正、逐文件八维补核；输入策略/DTO保持，整阶段质量门仍待 |
| `packages/pal-extract/src/resources/parsers/enemy-teams.ts` | product | 已验证 | 10B team record、slot sentinel/translation/name map tests | 0/FFFF 语义保真 |
| `packages/pal-extract/src/resources/parsers/fire.ts` | product | 已验证 | FIRE YJ2/raw fallback、empty/short group guard 与 callers/tests | 不改资源降级 |
| `packages/pal-extract/src/resources/parsers/items.ts` | product | 已验证 | OBJECT item range/truncation guard、wObjectID/MengShe split 与 tests | 稳定全局 ID |
| `packages/pal-extract/src/resources/parsers/player-roles.ts` | product | review | [GLM敌人/角色四文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-enemy-role.json) | 错注已纠正、逐文件八维补核；输入策略/DTO保持，整阶段质量门仍待 |
| `packages/pal-extract/src/resources/parsers/rgm.ts` | product | 已验证 | RGM header/RLE/PNG caller 与 tests | 空 chunk skip |
| `packages/pal-extract/src/resources/parsers/rng-frames.ts` | product | 已验证 | shared RNG decoder + PNG adapter caller/fixtures | 不复制 codec |
| `packages/pal-extract/src/resources/parsers/sounds.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/pal-extract/src/resources/parsers/spells.ts` | product | 已验证 | OBJECT magic/union fields、DATA magic callers/tests | 保持 scriptDesc offset contract |
| `packages/pal-extract/src/resources/parsers/stores.ts` | product | 已验证 | 18B STORE guard、zero sentinel/real DATA tests | 不改 store IDs |
| `packages/pal-extract/src/events/disasm.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/pal-extract/src/events/recompile.ts` | product | 已验证 | roundtrip inverse 与全量 bytecode digest | 结构命令 fail-loud |
| `packages/pal-extract/src/events/opcodes.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: opcode-type-exports；不升closed |
| `packages/pal-extract/src/events/roundtrip.ts` | product | 已验证 | parseSss/parseMessages/disasm/recompile 真实入口 | mismatch 报告合同 |
| `packages/pal-extract/src/font/bdf-to-json.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: bdf-untrusted-input；不升closed |
| `packages/pal-extract/src/io/mkf.ts` | product | 已验证 | shared MKF re-export、2,373 raw chunks、shared check | 无重复 codec |
| `packages/pal-extract/src/io/rle.ts` | product | 已验证 | shared RLE re-export、extractor callers | 无重复 codec |
| `packages/pal-extract/src/io/word.ts` | product | review | [WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)；真实CLI/MSG/SDL与raw词条、11组新旧回归 | 修CASH/特殊词条注释、私有名与重复解码；flat/分类短输入策略及公共scenes字段保持，旧关闭不继承 |
| `packages/pal-extract/src/io/yj2.ts` | product | 已验证 | [CODE2/2b当前逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/evidence.json) | 有效native/反控复用、归约独立单红及必要精简成立；不扩展RLE/任意外部输入安全或广域caller |
| `packages/pal-extract/src/resources/asset-manifest.ts` | product | 已验证 | manifest determinism/DS_Store/self exclusion tests、CLI caller | path/version pure contract |
| `packages/pal-extract/src/resources/battle-sprite.ts` | product | 已验证 | kind/id composite key、missing chunk skip、PNG callers/tests | 不混 enemy/player identity |
| `packages/pal-extract/src/resources/enemy-pos.ts` | product | 已验证 | 100B fixed table/signed layout boundary tests、CLI caller | layout transpose explicit |
| `packages/pal-extract/src/resources/map.ts` | product | 已验证 | 65536B map guard、real MAP/GOP decode、CLI caller | raw tilemap output |
| `packages/pal-extract/src/resources/palette.ts` | product | 已验证 | VGA/night color pins、short-input宽容既有合同、CLI caller | 不改变 palette mapping |
| `packages/pal-extract/src/resources/scene.ts` | product | 已验证 | scene range dump/real resource tests、CLI caller | dense scene bounds |
| `packages/pal-extract/src/resources/tables.ts` | product | 已验证 | parser barrel exports、all table callers/typecheck | 无运行时实现 |
| `packages/pal-extract/src/cli.ts` | product | rework | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 具体A–H/风险与反控；本窗统一门已过，未修语义及未知合同仍不授关闭 |
| `packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/output-boundary.ts` | product | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 仅两个输出节点symlink与lstat传播合同；原生ENOENT/ENOTDIR，不认证子项/TOCTOU |
| `packages/pal-extract/src/output-boundary.test.ts` | test | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 5真实自有路径合同；宽吞errno恰1业务红，临时根立即登记清理 |
| `packages/content/src/asset.ts` | product | 已验证 | 直接读取 AssetCatalog/path/origin/role closure validators 与 1490 content tests/full check | 保持 stable AssetId/path ownership |
| `packages/content/src/project-map.ts` | product | 已验证 | 直接读取 canonical version 4/map matrix/stamp placement validator 与 content tests | 不改 schema |
| `packages/content/src/scene-index.ts` | product | 已验证 | 直接读取 stable scene id/path/index validator 与 content tests | 路径 fail-closed |
| `packages/content/src/validate-runtime.ts` | product | 已验证 | 直接读取 runtime scene/hooks/entities validator 与 content tests | 旧 cast 仅校验后 DTO 投影 |
| `packages/content/src/actor-condition.ts` | product | 已验证 | 直接读取 carried-status/condition shape guards 与 content contract tests | 稳定 status/poison 引用 |
| `packages/content/src/entity-lifecycle.ts` | product | 已验证 | 直接读取 lifecycle shape/reference closure/normalization 与 content tests | 缺 map 归一空表合同 |
| `packages/content/src/map-index.ts` | product | 已验证 | 直接读取 stable map id/path/index guards 与 content tests | 路径 fail-closed |
| `packages/content/src/migration-diagnostic.ts` | product | 已验证 | 直接读取 migration sidecar schema/category/source validation 与 content tests | 仅迁移诊断，不污染运行时 schema |
| `packages/content/src/runtime-scene.ts` | product | 已验证 | 直接读取 runtime hostile/chase/victory/flee policy guards 与 content tests | explicit policy contract |
| `packages/content/src/enemy-team.ts` | product | 已验证 | 直接读取 stable enemy-team id/slot/reference validators 与 content tests | 不用数组位置当身份 |
| `packages/content/src/enemy-ai-condition-guard.ts` | product | 已验证 | 直接读取 AI condition recursive guard 与 content tests | 条件联合边界明确 |
| `packages/migrate/src/migration-transaction.ts` | product | 已验证 | 直接读取 journal v2/path/scope/precondition/atomic rename/recovery；migrate 95/723 与 transaction boundary suites | 事务写盘 ownership 已有反控 |
| `packages/migrate/src/pal-source-io.ts` | product | review | 直接读取 extracted source partitions/scene and asset callers；发现 generic JSON casts 需后续 schema/source-contract 批次 | 不改 generated source |
| `packages/migrate/src/migration-project-io.ts` | product | review | 直接读取 managed-file discovery/TOCTOU hash ownership；JSON shape validation 与 content validators 的边界留 Q4 | 不改 project output |
| `scripts/quality/lint-zero.mjs` | tool | 已验证 | whole-repository Biome JSON report/fail-closed wrapper；3198-file zero-diagnostic runs | 不接受过滤参数 |
| `scripts/quality/code-quality-inventory.mjs` | tool | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `scripts/quality/code-quality-ledger.mjs` | tool | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `scripts/quality/code-quality-ledger.test.mjs` | test | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `packages/game/src/core/battle/battle-progression.ts` | product | 已验证 | [经验/成长八维与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md) | 原合同逐文件接受；已批准WORD输入与TS属性偏离区分，真实红绿/旧反控/原盘表及集中门零诊断；不扩大相邻系统/存档整体信用 |
| `packages/game/src/core/battle/battle-progression.glm-next-wave.test.ts` | test | 已验证 | [经验/成长八维与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md) | 既有关闭按当前变更刷新；保留原合同与身份，无退役/弱化，具体限制与原件见回执 |
| `packages/game/src/core/battle/__tests__/battle-levelup.test.ts` | test | 已验证 | [经验/成长八维与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md) | 原合同逐文件接受；已批准WORD输入与TS属性偏离区分，真实红绿/旧反控/原盘表及集中门零诊断；不扩大相邻系统/存档整体信用 |
| `scripts/docs/check.mjs` | tool | review | [Git全路径容量修复](../evidence/QUALITY-DOCS-GIT-PATH-ENUMERATION-1/README.md)；全文/真实CLI，>1MiB合法路径先红后绿 | 完整NUL枚举有限16MiB；独立4MiB namespace不改，原检查策略保留，0新关闭 |
| `scripts/docs/check-testing.mjs` | tool | 已验证 | testing catalog/index/legacy flat verifier；testing docs runs | 独立测试文档门 |
| `scripts/docs/config.mjs` | tool | 已验证 | current docs versions/sections/exceptions source | 不改历史格式 |
| `scripts/coverage/metrics.mjs` | tool | 已验证 | exact integer ratio/aggregate comparison tests | 不用 pct 四舍五入 |
| `scripts/coverage/inventory.mjs` | tool | 已验证 | source/test scope diff and removal contracts | 不静默缩窄范围 |
| `scripts/coverage/environment.mjs` | tool | 已验证 | compile-cache disabled child environment contract | 保留无关环境 |
| `scripts/coverage/protected-baseline.mjs` | tool | 已验证 | protected baseline bootstrap/compare fail-closed tests | 无 baseline 不 fail-open |
| `scripts/coverage/config.mjs` | tool | 已验证 | seven-package source/test selection and fast exclusions | E2E exclusion boundaries |
| `scripts/coverage/run.mjs` | tool | review | [本轮精确结构baseline调整](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json) | 新授权重算与现有scope/test保护分开；旧Q6关闭不覆盖新差异，集中门待验 |
| `scripts/script-governance/run.mjs` | tool | 已验证 | canonical install census CLI, output symlink guard, script-governance tests | 不写产品数据 |
| `packages/pal-extract/package.json` | product | 已验证 | package scripts/dependency boundary；pal-extract check/full gates | 无运行时逻辑 |
| `packages/pal-extract/tsconfig.json` | product | 已验证 | source/scripts include 与 typecheck | 无产品行为 |
| `packages/pal-extract/src/utils/gbk.ts` | product | review | [WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)；MSG/WORD caller、独立BIG5九标点与原用户策定 | 修字符串/扫描成本误述；映射不变，46处历史核验未重做，不升格为全编码真值 |
| `packages/pal-extract/src/io/word.test.ts` | test | review | [WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)；全文A–H/真实oracle/身份映射与原件 | 8→7：4保持/3增强更名/1严格蕴含删除；人物逆序业务反控有效 |
| `packages/pal-extract/src/io/word.boundaries.test.ts` | test | review | [WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)；全文A–H/真实oracle/身份映射与原件 | 3合成完整表合同；fixture仅WORD区域核读，raw/synthetic重复轴已说明 |
| `packages/pal-extract/src/utils/gbk.test.ts` | test | review | [WORD/GBK逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-stage3-word.json)；全文A–H/真实oracle/身份映射与原件 | 10合同，原一例补齐九标点；A142错误业务反控有效；一标题更正 |
| `packages/pal-extract/scripts/grep-sdlpal-chunks.ts` | product | 已验证 | execFile 参数数组、reference-only read helper | 无写盘 |
| `packages/pal-extract/scripts/extract-videos.ts` | product | review | [输出入口补审](../evidence/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1/entrypoint-followup/README.md)；132→136行全文、包脚本/Node IO/真实子进程与六mp4字节oracle | 两共享输出穿透先红后修，复用同一guard且ffmpeg前拒绝；自有增量/raw链接保留，编码/全部失败路径待核 |
| `packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs` | product | review | scene/event/tilemap BFS 与写盘脚本直接读过 | 诊断生成器需后续 path/input 复核 |
| `packages/pal-extract/audit-data-mkf.mjs` | product | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `packages/pal-extract/src/audit-data-mkf.test.ts` | test | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `packages/game/src/assets/loader.ts` | product | 已验证 | [3h有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json) | 真实caller/生命周期与完整八维复用；缺帧按获批原编号，六实际GOP样本/固定输入，当前模块集中门完成；不外推shared格式真值 |
| `packages/game/src/assets/loader.test.ts` | test | 已验证 | [3h有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json) | 7→4合同去向明确；四LRU合法typed输入、结果与淘汰，原生故障反控；包绿不是关闭依据 |
| `packages/game/src/assets/load-all-recover.grok-r1.test.ts` | test | 已验证 | [3h有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json) | 十一恢复合同完整告警/错误参数/次数；C10纠正压紧oracle，C11保留独立物品失败合同；当前UI缺帧不移位 |
| `packages/game/src/assets/load-all-ui-frame-identity.test.ts` | test | 已验证 | [3h有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json) | 三真实PNG/消费像素与缺边框错误合同，正式旧1绿2业务红→绿；typed夹具补核，非浏览器视觉认证 |
| `packages/game/src/assets/load-all-assemble.grok-r1.test.ts` | test | 已验证 | [3h有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/module-closeout.json) | 十装配合同八维；真实Enemy/角色36必需字段、强三字段oracle，A06复用精简/A09标题映射，所有断言去向保留 |
| `packages/game/src/__tests__/grok-render-r1/legal-host.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/tileset-blob.ts` | product | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/png.ts` | product | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 既有关闭按当前指纹和逐项八维刷新；不增加新关闭数，不授shared格式或完整启动视觉信用 |
| `packages/game/src/assets/rle-decode.ts` | product | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/shell/fetch-retry.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/shell/bootstrap.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: bootstrap-context-design；不升closed |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 既有关闭按当前指纹和逐项八维刷新；不增加新关闭数，不授shared格式或完整启动视觉信用 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/shell/fetch-retry.cancellation.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/main.ts` | product | review | [CODE72真实入口修复](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md)；全文、实际PROD404/迟到200与正常按钮/进场 | catch释放计数已实证；其它analytics/noSW/正常intro入口合同仍待，未把短路径升格全main关闭 |
| `packages/game/src/shell/boot-loading.ts` | product | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/boot-loading.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/boot-loading-host.grok-r1.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/precache-ui.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/audio-volume.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | [CODE70边界与key ownership](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/70-audio-volume/README.md)；100行全文、NaN/0/default/key独立合同 | 改正共享键读写注释、去除重复静音状态机；忽略keyMute旧6绿新7绿1指定AssertionError，恢复8绿；不改生产API |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/minimap.ts` | product | review | [minimap分类/缩放返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/minimap-classification-view/README.md)；487行原源全文；caller/Command/原C库存/真实raw数量域核证；只校两注释 | parsedTS/JS相同；425条0x1F中401零量并非地图宝箱分母；raw/具名signed域和其它生命周期仍review |
| `packages/game/src/tools/minimap.test.ts` | test | review | [minimap分类/缩放返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/minimap-classification-view/README.md)；148行原测全文；独立视野中心/四边钳制与item优先双顺序；14例保持 | 三反控各旧14绿→新13绿1指定AssertionError；一无据标题勘误、未退役；未知输入域保持review |
| `packages/game/src/tools/minimap.glm-phase1-leaves.test.ts` | test | review | [minimap分类/缩放返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/minimap-classification-view/README.md)；200行原测全文；原6保留加2真实widget缩放/焦点合同；正式camera、穿透canvas与精确清理 | 两反控各旧6绿→新7绿1指定AssertionError；正式22直接/36相邻；非法持久zoom/完整视觉未验，仍review |
| `packages/game/src/tools/tools-panel.ts` | product | review | [工具缩略图/快捷键返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/tools-thumbnail-hotkeys/README.md)；1106行原源全文/真实bootstrap与minimap/index caller | 640接线与battleSig仅选定字段说明修正；保存/文件IO/完整UI仍未验，旧关闭转review |
| `packages/game/src/tools/tools-panel.test.ts` | test | 已验证 | [CODE58夹具/隔离勘误](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)；310行全文、正式GameState/BattleState/hydrate、真实DOM | 更正旧合法fixture声明；HP/turn分别观测、精确目标HP；跨例旧单红新绿，相邻34files199tests；未认证save/计时器编辑 |
| `packages/game/src/tools/tools-panel.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE58夹具/隔离勘误](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)；70行全文、真实缩放/全屏/FPS输入 | 全屏/FPS拆职责；共用宿主恢复监听/音源/偏好与单例，正式合计19tests；新统一门未运行 |
| `packages/game/src/tools/tools-panel.test-fixtures.ts` | fixture | 已验证 | [CODE58共用宿主](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)；89行全文、两公开test caller、跨例旧19绿1AssertionError→新21绿 | 稳定合法初态/typed依赖；call-through监听精确解绑、timer/rAF/controller/DOM/storage/singleton清理；不改生产API |
| `packages/game/src/tools/quick-save.ts` | product | 已验证 | [CODE-QUALITY-102 Codex独立复核](../evidence/CODE-QUALITY-102/codex-current-review.md)；bootstrap setupQuickSave真实注入、Save API/IDB caller、quick-save/toast tests | F5/F9 时机门、preventDefault、错误反馈、SSR no-op、disposer 与依赖 ownership 逐文件核验；无直接缺陷 |
| `packages/game/src/tools/quick-save.test.ts` | test | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/core/save/api.ts` | product | review | [CODE-QUALITY-101 Codex当前逐文件复核](../evidence/CODE-QUALITY-101/codex-current-review.md)；Save API 双路径 caller、MAX_SAVE_SLOTS=5、内存/IndexedDB 边界 | 已完整读取；NaN/无穷/小数只通过范围守卫，双路径输入合同未裁决；见 GAME-SAVE-INPUT-DOMAIN-1，禁止实现或标已验证 |
| `packages/game/src/core/save/indexed-db.ts` | product | review | [CODE-QUALITY-101 Codex当前逐文件复核](../evidence/CODE-QUALITY-101/codex-current-review.md)；真实事务测试、IndexedDB 生命周期与公共 Save caller | 事务 complete/abort 由 GAME-SAVE-IDB-COMMIT-1 维护；open 失败缓存与 db.close 生命周期仍缺主路径证据，保持 review |
| `packages/game/src/core/save/__tests__/api.test.ts` | test | review | [补审漏迁修复](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)；完整Save实现/9合同、真实caller及双向克隆oracle | 六类字段roundtrip、独立读侧深克隆、原存侧保留；显式内存环境/前后清理；双路径输入/IDB生命周期仍待 |
| `packages/game/src/core/menu/save-slot-menu.ts` | product | 已验证 | [CODE-QUALITY-100 Codex当前独立复核](../evidence/CODE-QUALITY-100/codex-current-review.md)；menu-driver 标题/系统 save-load caller、draw-menu SlotMeta oracle、Save API/IDB 边界、sdlpal uigame.c:169-242 | 选择状态、1-based/defaultSlot、非顺序 id、空表与异步元数据 ownership 逐文件核验；无 schema/写路径或直接产品缺陷 |
| `packages/game/src/core/menu/save-slot-menu.test.ts` | test | review | [补审排重勘误](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)；2daed1bb7删例与Save API合同逐项对照 | 原完全等价排重声明撤回；六字段/读侧克隆现移到API层，菜单15例仍在；等待再次独立整文件/统一门验收 |
| `packages/game/src/core/menu/save-slot-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE-QUALITY-100 Codex当前独立复核](../evidence/CODE-QUALITY-100/codex-current-review.md)；公开工厂同步合同与 sdlpal defaultSlot oracle | 非顺序 id、越界 defaultSlot、空表 Up/Down 反例；与 IO/dispatcher 测试排重 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/time-format.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/time-format.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/time-format.boundaries.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/time-format.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/store.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/tools/speedrun/store.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/store.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/timer.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/timer.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/timer.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/snapshot.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/snapshot.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/detectors.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/detectors.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/detectors.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/index.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/index.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/index.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/overlay.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/overlay.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/overlay.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/checkpoints.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/timer.boundaries.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/countdown.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/countdown.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | [CODE3j局部校准与正文版本桥](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-route-calibration/README.md) | 七项缺口由真实输入/脚本/转场/计时器补证；原八维与测试复用，数据正文未变，不外推完整剧情路线 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/__tests__/digit-frames.ts` | fixture | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/menu/draw-confirm.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/draw-confirm.glm-phase1-leaves.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/draw-menu.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-menu.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-shop.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-opening-menu.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-opening-menu.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-magic.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/draw-magic.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/draw-magic.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/magic-menu-pixels.grok-r1.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/draw-inventory.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 仅重新确认既有接受后的共享依赖delta，不重复计卡；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-inventory.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/inventory-desc-filter.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-49；49-draw-inventory；description/noDesc/filter framebuffer oracle | 全文核验描述行距、scriptDesc=0、noDesc、sellable/potion/important 过滤；与 P01/P02职责排重，执行通过 |
| `packages/game/src/present/menu/draw-equip.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 仅重新确认既有接受后的共享依赖delta，不重复计卡；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-equip.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/equip-role-pixels.grok-r1.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/draw-box.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/draw-box.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/draw-box.glm-phase1-leaves.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/menu/box-shadow-pixels.grok-r1.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/draw-number.ts` | product | review | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 非有限输入的真实生产可达性未证；V1载入先重算装备，不能用直接注入派生效果冒称实际路径。其余合法输入合同已核。 |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/framebuffer.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/framebuffer.glm-phase1-leaves.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-shake.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-shake-bounds.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-wave.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/screen-wave-mirror.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/dither-fade.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/dither-fade-nibble.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/draw-number.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/draw-number-slots.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/follower-pos.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/follower-pos-axis.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | review | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 移除死参／私有死分支并共用blit；有效动作判定仍与core重复，后续核core边界。 |
| `packages/game/src/present/battle/blit-ui-frame.ts` | product | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/present-battle.ts` | product | review | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 真实入场清屏／跨战斗缓存生命周期未核清；消息默认时长与无字形分支不继承旧smoke信用。 |
| `packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/__tests__/draw-battle-effect.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/__tests__/draw-battle-num.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts` | test | 已验证 | CODE-QUALITY-3l；各结算 screen 合法输入合同 | typed settlement oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/__tests__/present-battle.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/battle-effect-num-pixels.grok-r1.test.ts` | test | 已验证 | [3k／3l逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-primitives-quality/README.md) | 当前八维、真实caller/ownership与测试合同已核；必要像素/生命周期补强及重复迁移见逐文件索引，统一门零诊断。 |
| `packages/game/src/present/battle/battle-settlement-pixels.grok-r1.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/battle-sprite-pixels.grok-r1.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/present/battle/battle-ui-pixels.grok-r1.test.ts` | test | 已验证 | [3l四片逐文件A–H／完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/README.md) | 当前八维、caller、像素合同与必要反控已核；测试去重／纯重构分提交，集中门零诊断，具体范围与限制见索引。 |
| `packages/game/src/core/battle/formulas.ts` | product | review | [公式数值/注释与测试返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/README.md)；源全文/原C FLOAT与WORD中间赋值/真实caller；1:1和玩家等级坏注撤回 | 正常域TS160/C161直接counter另开GAME-MAGIC-NUMERIC-ASSIGNMENT-1；执行未改、旧关闭转review |
| `packages/game/src/core/battle/magic-damage.ts` | product | review | [公式数值/注释与测试返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/README.md)；源全文/真实公开GS hydrate→projection→createBattleState→applyMagicDamage与真实SeedableRng | 随机半开与C端点分清、抗性倍率[0,5]及投影前提订正；去注释TS/JS不变，既有review保持 |
| `packages/game/src/core/battle/actions/magic.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: bus-contract-cleanup、large-action-design；不升closed |
| `packages/game/src/core/battle/simulated-magic-target.ts` | product | review | [pre-94机制返工](../evidence/QUALITY-BATTLE-MAGIC-PARITY-1/README.md) | 内部模拟选靶共用helper；显式/全体/上次活敌/全灭分支定向已测；统一门仍待 |
| `packages/game/src/core/battle/__tests__/magic-parity.test.ts` | test | review | [pre-94机制返工](../evidence/QUALITY-BATTLE-MAGIC-PARITY-1/README.md) | 真实runScript/throw/performMagic及动画driver；合法typed输入、手算伤害、15定向与五精确反控；统一门仍待 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m 3m-status；fight.c:1632-1661、battle-system turn-end caller、battle-finalization、status/actions/state-machine tests | 全 status counter tick；敌方按 SDLPal 全槽位递减（含死槽）；canAct/canCast 与 <=999 清理边界已核；3m 整卡仍 partial |
| `packages/game/src/core/battle/__tests__/turn-queue-parity.test.ts` | test | review | [队列批准窄修](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/queue-approved-fix/README.md)；原C片段静态oracle/真实startBattle+Confirm/RNG | 最终7旧红新绿、六精确变异；敌方WORD边界/13满槽/终止标记，统一门/整文件待续 |
| `packages/game/src/__tests__/glm-next-wave/H/harness.ts` | fixture | review | [队列合法工厂复用](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/queue-approved-fix/README.md)；全文核读，makeHRole/Enemy/Field真实caller | 本片只改旧专属头注，复用3个typed工厂；记录型rng其它合同和完整caller未据此接受 |
| `packages/game/src/core/battle/turn-queue.ts` | product | review | [本片直接证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)；完整源码/专测、生产caller与原C | 原C交换/SHORT/13槽及速度0xffff前缀已按批准先红后修；有限回归与六反控，整文件仍review |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-state/opcode/present/UI/sprite callers、battle.c:27/903-939、global.h:401-404、position tests | 1/2/3 人 SDL 表、4/5 fallback、EnemyPos fallback/idx bounds 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m 3m-rng；util.c:169-275、battle/event/progression callers、rng tests | mulberry32 deterministic state/range APIs；`to<=from` 返回起点且不消费状态；SDLPal LCG 差异为已记录设计 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | review | [公式数值/注释与测试返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/README.md)；全文；28例保持，生产除数1/合法倍率1.05、五灵独立oracle与非零毒抗 | 两枚各旧28绿→新27绿1指定AssertionError；C O0/O2矩阵/毒抗oracle；原全数值域信用撤回review |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-status；all status tick、死敌槽位反例、canAct/canCast、相邻 battle lifecycle contracts | counter lifecycle oracle；旧“死敌不 tick”弱 oracle 已改为 primary 全槽位语义 |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | review | [本片直接证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)；完整源码/专测、生产caller与原C | 保留9原oracle，过强稳定性标题勘误；新parity承接置换/WORD/真实caller，旧整文件信用不自动恢复 |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-rng；same seed/different seed/half-open/inclusive/float/state/invalid-bound contracts | deterministic RNG oracle；边界反例验证无额外抽样 |
| `packages/game/src/core/palette-fade.ts` | product | review | [ColorFade输入域/测试返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/palette-approach-tests/README.md)；328行原源全文、C正常4网格/实际提取器8位展开、event/present所有权分段 | 任意8位等价与视觉1:1错注撤回；C有限64步再补终值，原C人工非网格往返不当正常域缺陷；仅注释变化，旧关闭转review |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap/scene-system load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype label negative controls | inherited label 防护与 own-property/null-prototype、zero-item fixup 边界逐文件核对；未发现新缺陷 |
| `packages/game/src/core/palette-fade.test.ts` | test | review | [ColorFade输入域/测试返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/palette-approach-tests/README.md)；235行原测全文；17例保持、行/快照独立、非网格钳制与正反通道/重复重绘 | 四枚各旧17绿→新16绿1指定AssertionError；恢复17/相邻86绿，精确输入域与C/TS分开；不授整文件关闭 |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-system history writer/bootstrap restore/menu caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/player-poison-state.ts` | product | review | [毒/升级注释与夹具](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/poison-progression-comments/README.md)；全文/真实装备与opcode caller/原C；CureKind及Wear/首空槽注释勘误 | 非压缩/全槽去重差异保持review，GAME-PLAYER-POISON-SLOT-COMPACTION-1只读；未改状态、schema或接口 |
| `packages/game/src/core/scene-system-search.ts` | product | review | [本片直接证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)；完整源码/专测、生产caller与原C | 阈值方向坏注释已修，可执行代码不变；本片源码/primary/caller重读，统一门/整文件待续 |
| `packages/game/src/core/scene-system.ts` | product | review | [GLM正文删除与复活返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-dead-removals.json) | 按作者有效证据补逐文件八维；文案/授权复活窄修已核，不改其它卡状态 |
| `packages/game/src/present/dialog-box.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/game/src/present/dialog-box.test.ts` | test | 已验证 | CODE-QUALITY-42 当前复审；42-dialog-box；真实 dialog-box public exports、framebuffer/font/present oracle | 761 行全文核验；控制符/分页/墙钟/尾暂停/Confirm、像素/头像/icon/item-box 合同；定向83例通过；未发现重复或弱断言 |
| `packages/game/src/present/dialog-box.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-42 当前复审；42-dialog-box；公开 parser/title/reset caller 与 text.c oracle | 84 行全文核验；新增 narration `~NN` 反例在修复后通过，title/reset 合同保持；定向83例通过 |
| `packages/game/src/core/event-system.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: event-wide-context；不升closed |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | review | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 大dispatcher/Dev复合设计债仍review；本批有限合同不强关 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | review | [pre-94机制返工](../evidence/QUALITY-BATTLE-MAGIC-PARITY-1/README.md)；SDL fight.c/script.c、真实runScript/action caller、手算oracle | 全文重读；投掷fixture补真实runtime，精确伤害断言保留；其余any/无崩类oracle与排重待核 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | review | [GLM正文删除与复活返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-dead-removals.json) | 两真实红例后修复；旧56身份保留加1，整体E与统一门未代签 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/game-state.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/battle/battle-finalization-extra.test.ts` | test | 已验证 | [3w模块收口/逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json) | 仅本文件明确合同；Extra/HPMP/默认role/逐敌等待反例与原生身份；全仓20443、official/protected及零诊断；不认证whole battle-system/event-system或视觉E2E |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | [3w模块收口/逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json) | 仅本文件明确合同；Extra/HPMP/默认role/逐敌等待反例与原生身份；全仓20443、official/protected及零诊断；不认证whole battle-system/event-system或视觉E2E |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | [3w模块收口/逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json) | 仅本文件明确合同；Extra/HPMP/默认role/逐敌等待反例与原生身份；全仓20443、official/protected及零诊断；不认证whole battle-system/event-system或视觉E2E |
| `packages/game/src/core/battle/battle-settlement-data.ts` | product | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | [3w模块收口/逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json) | 仅本文件明确合同；Extra/HPMP/默认role/逐敌等待反例与原生身份；全仓20443、official/protected及零诊断；不认证whole battle-system/event-system或视觉E2E |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | review | [本片直接证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)；完整源码/专测、生产caller与原C | 旧normal/far/first-hit声明不实；现12例及六旧绿新单红，保持review不以通过数恢复整文件 |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064行全文重读；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同；相邻warning仍待统一清零 |
| `packages/game/src/core/event-system.test.ts` | test | review | [两例oracle返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 原329门带2stderr；缺标签精确告警/合法音效等待结果补强，身份329不增；不代表其余324主测逐例再审，原closed撤review |
| `packages/game/src/core/battle/battle-system.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: battle-system-count、large-state-machine-design；不升closed |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | review | [pre-94机制返工](../evidence/QUALITY-BATTLE-MAGIC-PARITY-1/README.md)；SDL fight.c/script.c、真实runScript/action caller、手算oracle | 3s本会话全文读取后SHA未变；本次补读caller/投掷场景并补裸runtime，未重新认证全4248行 |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 330 行 branch guard/phase/idle/资源缺失/settlement contracts；两个 console.error spy 已用 try/finally 恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | [3w模块收口/逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json) | 仅本文件明确合同；Extra/HPMP/默认role/逐敌等待反例与原生身份；全仓20443、official/protected及零诊断；不认证whole battle-system/event-system或视觉E2E |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system/equip/inventory/poison callers、四 direct tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现新缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |
| `packages/game/src/core/__tests__/stats/e2-equipment-effects.test.ts` | test | review | [QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/C2](../evidence/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/c2/README.md)；真实 `writeEquipmentEffectField`/`removeEquipmentEffect` caller、完整 stats fixture、SDLPal row/part 边界与 warning oracle | 8 tests；未知 row 999 与越界 no-op 合同；warning 已显式捕获并断言，保留 review 等剩余诊断与统一门 |
| `packages/game/src/core/__tests__/stats/e4-run-equip-script.test.ts` | test | review | [QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/C2](../evidence/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1/c2/README.md)；公开 `runEquipScript` 入口、全局 label map、`equip-effect.ts` runner 与 typed command fixture | 8 tests；未注册 `L_99999`、goto/end/signExtend/tick limit；warning 已显式捕获并断言，保留 review 等剩余诊断与统一门 |
| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 CanonicalScriptBodyEditor→EntityAddressEditor caller、合法 EntityAddress 与自动改绑 oracle | 1合同/4定向测试通过；相邻测试有22条 React act诊断，保持 review，不标已验证 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 ItemTab/loader/EditSession/save-gate caller、R1/R3/R5 oracle | 3合同/4定向测试通过；相邻测试有22条 React act诊断，P1 puppet/battleOnly仍是产品裁决，保持 review |
| `packages/editor/src/ui/ItemTab.glm-m.test.tsx` | test | review | [CODE-QUALITY-104 Codex act 生命周期复核](../evidence/CODE-QUALITY-104/codex-current-review.md)；真实 ItemTab/EditSession caller、交易/说明 oracle | 原生 undo 事件已包 act；定向/相邻/全仓 check 零诊断，coverage ratchet/protected 仍受既有 baseline 回退阻塞 |
| `packages/editor/src/ui/ItemUseEffectEditor.glm-m.test.tsx` | test | review | [CODE-QUALITY-104 Codex act 生命周期复核](../evidence/CODE-QUALITY-104/codex-current-review.md)；真实 ItemEffectChainEditor/EditSession caller、效果 schema/undo oracle | 原生 click/undo/redo 已包 act；定向/相邻/全仓 check 零诊断，coverage ratchet/protected 仍受既有 baseline 回退阻塞 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |
| `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts` | test | review | CODE-QUALITY-106；真实 RewardGainQueue.present/handleRewardGainInput caller、Promise resolve/AbortError oracle | 定向5/5、相邻21/118零 stderr；全仓 coverage 仍待批次收口，保持 review |
| `packages/game/src/core/menu/primitives.ts` | product | review | CODE-QUALITY-107；SDLPal ui.c:510-572 cursor、真实 menu/battle/inventory caller、E-4 test-only page API | 纯状态 helper 已完整读取；定向/相邻证据待批次收口，E-4 不删公共出口 |
| `packages/game/src/core/menu/item-select.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: menu-factory-cleanup；不升closed |
| `packages/game/src/core/menu/__tests__/primitives.test.ts` | test | review | CODE-QUALITY-107；Selection/Confirm/Triple/Switch 主干与公开 helper oracle | 7 文件定向 78 tests；相邻有 2 条白名单外预期 stderr，保持 review |
| `packages/game/src/core/menu/primitives.boundaries.test.ts` | test | review | CODE-QUALITY-107；空表/单项/跨页视窗/输入不改写 oracle | 7 文件定向 78 tests；未将 test-only page API 当产品真值 |
| `packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；pageUp/down 现状、全 disabled、负 cursor、identity oracle | 7 文件定向 78 tests；E-4 保留待另卡 |
| `packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；filter 真值、目录外 id、缺名、空库存、奇数卖价 oracle | 7 文件定向 78 tests；important 近似显式披露 |
| `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/magic-script.ts` | product | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/core/menu/magic-script.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/analytics/install-analytics.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/present/draw-sprite.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/draw-sprite.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/analytics/analytics-consent.ts` | product | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/analytics-consent.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/analytics-consent.boundaries.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/google-analytics.ts` | product | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/google-analytics.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/google-analytics.boundaries.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/analytics/google-analytics.test-fixtures.ts` | fixture | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `scripts/quality/code-quality-inventory.test.mjs` | test | 已验证 | [pre94原卡合同正式验收](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json) | 原逐文件八维/真实caller与有效反控复用；当前源码及门版本匹配；未授全输入域/未来设计信用 |
| `packages/game/src/analytics/google-analytics.install-failure.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/core/battle/battle-lifecycle.test-fixtures.ts` | test | 已验证 | [结算成长窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)；逐文件八维／实际caller及原生反控／当前模块门；详见review.json指定合同 | 仅本文件明确合同接受；3w非队员Extra／中间时序与3x WORD仍未闭合，未按包绿扩大信用 |
| `packages/pal-extract/src/cli-entrypoint-paths.test.ts` | test | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 6真实进程/链接/import/默认根合同；错误cwd仅该例红，fake仅替编码器 |
| `packages/pal-extract/src/resources/parsers/__tests__/enemies.boundaries.test.ts` | test | review | [GLM敌人/角色四文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-enemy-role.json) | 既有合同补强；旧绿/新红业务反控成立，统一门仍待 |
| `packages/pal-extract/src/resources/parsers/__tests__/player-roles.boundaries.test.ts` | test | review | [GLM敌人/角色四文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-enemy-role.json) | 既有合同补强；旧绿/新红业务反控成立，统一门仍待 |
| `packages/reforge/src/audio/bgm.ts` | product | review | [GLM正文删除与复活返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-dead-removals.json) | 按作者有效证据补逐文件八维；文案/授权复活窄修已核，不改其它卡状态 |
| `packages/content/src/index.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/game/src/core/command-bus.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: bus-contract-cleanup；不升closed |
| `packages/game/src/core/equip-effect.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/game/src/core/equipment-state.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: poison-compaction；不升closed |
| `packages/game/src/core/menu/menu-driver.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: menu-factory-cleanup；不升closed |
| `packages/game/src/dev/dev-panel.ts` | product | review | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 大dispatcher/Dev复合设计债仍review；本批有限合同不强关 |
| `packages/game/src/present/draw-tilemap.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/menu/draw-player-status.ts` | product | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/present/present.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；未修/限制: render-clock-design；不升closed |
| `packages/pal-extract/src/resources/parsers/rix.ts` | product | review | [GLM29逐文件返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/codex-final29.json) | 作者全文证据复用、Codex定向补八维；有限范围成立，统一门/原卡剩余项不授关闭；不升closed |
| `packages/game/src/dev/dev-panel.pure.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `scripts/coverage/approved-baseline-adjustments.mjs` | tool | review | [本窗精确数据与main重绑](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json)；旧five-cards/GLM授权历史保留 | 仅当前有限项完整旧摘要、166SHA、四计数及额外回退拒绝；旧条目/算法不变，整文件仍review |
| `scripts/coverage/approved-baseline-adjustments.test.mjs` | test | review | [本轮三个合同测试](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json) | 精确迁移、错误/未知输入及额外回退；不计产品覆盖信用 |
| `scripts/coverage/approved-test-retirements.mjs` | tool | review | [五卡精确退役门增量](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 只核本次2快照/33条73净额和14拒绝轴，旧31授权不继承整文件信用 |
| `scripts/coverage/approved-test-retirements.test.mjs` | test | review | [五卡精确退役门增量](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 只核本次2快照/33条73净额和14拒绝轴，旧31授权不继承整文件信用 |
| `packages/game/src/shell/input.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/shell/main-loop.ts` | product | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/audio.ts` | product | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE74原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/rng-player.ts` | product | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/avi-player.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/shell/input.test.ts` | test | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE73原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/input.boundaries.test.ts` | test | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE73原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/input-replay.grok-r1.test.ts` | test | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE73原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/main-loop.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/main-loop-gates.grok-r1.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/audio.test.ts` | test | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE74原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/audio.glm-phase1-leaves.test.ts` | test | 已验证 | [input/audio逐文件A–H与完整集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) | CODE74原合同；用户批准缺口已处理，旧有效caller/oracle/反控按版本复用；不授广域上下文或听觉全流程信用 |
| `packages/game/src/shell/rng-player.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/rng-player.glm-next-wave.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收 |
| `packages/game/src/shell/avi-player.test.ts` | test | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/shell/avi-player.glm-next-wave.test.ts` | test | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/core/menu/menu-mode.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/menu-stack.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/menu-mode.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-menu.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 仅重新确认既有接受后的共享依赖delta，不重复计卡；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/core/menu/inventory-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-action-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-action-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/inventory-action-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/sell-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/sell-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/sell-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/sell-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/shop-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/shop-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/shop-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/shop-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/equip-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/equip-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/equip-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/equip-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/magic-select.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/magic-select.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/magic-select.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-magic-menu.ts` | product | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-magic-menu.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts` | test | 已验证 | [pre94菜单逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json) | 原卡合同、当前依赖/合法typed输入、测试判别力/隔离与必要质量返工成立；相邻广域模块不附带关闭 |
| `packages/game/src/present/font.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/font.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/font.glm-phase1-leaves.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/follower-render.ts` | product | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/follower-render.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/draw-tilemap.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/tools/save-io.ts` | product | 已验证 | [CODE59/60逐文件A–H与冻结门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json) | 具体合同/红绿或有效既有反控、原生入口及全门零诊断；不附带关闭相邻广域源 |
| `packages/game/src/tools/save-io.test.ts` | test | 已验证 | [经验/成长八维与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md) | 既有关闭按当前变更刷新；保留原合同与身份，无退役/弱化，具体限制与原件见回执 |
| `packages/game/src/analytics/analytics-consent-ui.ts` | product | 已验证 | [本窗逐文件八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/review.json) | 原合同与当前caller/源码绑定成立；必要结构/测试/授权重试返工及集中零诊断门已核；上下文、硬件或广域文件不附带关闭 |
| `packages/game/src/analytics/analytics-consent-ui.test.ts` | test | 已验证 | [analytics逐文件A–H及集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json) | 当前同窗生产caller/独立oracle；旧反控据版本复用，类型及测试隔离/判别力已整改；不附带实网/跨realm/广域main信用 |
| `packages/game/src/core/inspect/battle-inspect.ts` | product | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/core/inspect/battle-inspect.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/core/inspect/battle-inspect.glm-phase1-leaves.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/present/menu/draw-player-status.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/present/menu/draw-player-status.glm-phase1-leaves.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/present/menu/status-vitals-pixels.grok-r1.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/core/battle/actions/item-poison-boundary.test.ts` | test | 已验证 | [物品上下文八维/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-item-role-context-review.json) | 四旧case及其fixture/data守恒；四新身份核role0/4、all真实恢复与8D投影；289相邻/3724整包及集中门0诊断，不授完整战斗/视觉 |
| `packages/game/src/dev/dev-panel.glm-next-wave.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/dev/dev-panel.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/dev/dev-panel-party-lifecycle.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/dev/dev-panel-picker-lifecycle.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/core/menu/magic-script.glm-next-wave.test.ts` | test | 已验证 | [五卡逐文件A–H](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json) | 本轮逐文件八维/真实caller及oracle/整改与反控成立；指定未跑视觉不继承；统一门见回执 |
| `packages/game/src/present/player-info-box.ts` | product | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/present/menu/magic-player-info.integration.test.ts` | test | 已验证 | [pre94 present/speedrun逐文件A–H与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json) | 原卡合同/合法输入、caller/oracle、八维与必要整改成立；批准的显示修复有先红后绿，精简合同已映射；上下文文件不附带关闭 |
| `packages/game/src/core/menu/menu-colors.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/blit-indexed-sprite.ts` | product | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/__tests__/grok-present/p04-shop.test.ts` | test | 已验证 | [renderer逐文件A–H/合同迁移/集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json) | 明确原范围/共享叶/合法相邻fixture的八维与必要返工成立；无产品机制/存档/接口变化；宽域与未跑E2E不附带关闭 |
| `packages/game/src/present/font-width.grok-r1.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/present/follower-render-gap.grok-r1.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/shell/fetch-retry.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/shell/fetch-retry.glm-phase1-leaves.test.ts` | test | 已验证 | [Current A-H, evidence and gates](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) | Original explicit scope/current callers and version, necessary rework or same-byte evidence; no broad/adjacent/visual credit |
| `packages/game/src/shell/audio-midi.ts` | product | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收；本轮[仅注释/纯URL接线增量](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json)复核，原范围accept保留 |
| `packages/game/src/shell/audio-midi.test.ts` | test | 已验证 | [shell当前逐文件与集中门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) | 原明确范围/75迁移、真实caller与八维证据；必要返工/同版原件复用；不附带广域或听感/剧情验收；本轮[仅注释/纯URL接线增量](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json)复核，原范围accept保留 |
| `packages/pal-extract/src/__tests__/cli-host.ts` | fixture | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/__tests__/cli-host.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/io/sss.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/io/msg.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/evidence.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/resources/sprite.glm-runtime-resource.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/resources/sprite.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/cli-isolated.glm-q.test.ts` | test | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 6旧身份不删；空MIDI旧6绿/新5绿1业务红，现全字节oracle及真实CLI恢复 |
| `packages/pal-extract/src/cli-font-lookup.glm-q.test.ts` | test | 已验证 | [当前逐文件A–H与四卡全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/closeout/review.json) | 完整caller/输入/oracle/隔离与具体质量缺口成立；20390check及ratchet/protected各19992零诊断；不是包绿批量关闭或相邻广域信用 |
| `packages/pal-extract/src/events/script-entries.ts` | product | 已验证 | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 明确五文件范围逐项A–H、旧绿新红与完整冻结门；不附带关闭CLI或其它slice测试 |
| `packages/pal-extract/src/events/script-entries.test.ts` | test | 已验证 | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 明确五文件范围逐项A–H、旧绿新红与完整冻结门；不附带关闭CLI或其它slice测试 |
| `packages/pal-extract/src/cli-battle-assets.glm-q.test.ts` | test | 已验证 | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 明确五文件范围逐项A–H、旧绿新红与完整冻结门；不附带关闭CLI或其它slice测试 |
| `packages/pal-extract/src/cli-global-entries.glm-q.test.ts` | test | 已验证 | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 明确五文件范围逐项A–H、旧绿新红与完整冻结门；不附带关闭CLI或其它slice测试 |
| `packages/pal-extract/src/events/slice.kimi-r1.test.ts` | test | review | [已批准slice本地八维](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-slice-approved/review.json) | 6业务红后53/452绿，纯遍历去重；本窗统一门待聚合，不授新关闭或单片运行信用 |
| `packages/pal-extract/src/__tests__/glm-q/cli-global-entry-inputs.ts` | fixture | review | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 具体八维缺口维持review；不以统一门全绿或新路径自动关闭 |
| `packages/pal-extract/src/__tests__/glm-q/cli-pipeline-inputs.ts` | fixture | review | [CLI/事件当前逐文件依据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/review.json) | 具体八维缺口维持review；不以统一门全绿或新路径自动关闭 |
| `packages/pal-extract/src/io/write.ts` | product | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 原writer正文不变；显式路径/同步错误传播与真实CLI证据，非目录事务或路径confinement |
| `packages/pal-extract/src/resources/music.ts` | product | 已验证 | [CLI IO逐文件八维与全门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-io-closeout/review.json) | 旧音乐块alpha守恒；opaque MIDI/OGG全字节及RIX原始字节，未认证音视频codec |
| `packages/game/src/assets/tileset-blob.test.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/tileset-gzip.grok-r1.test.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/tileset-load.grok-r1.test.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/rle-decode.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/assets/dialog-assets.glm-phase1-leaves.test.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/dialog-icons.grok-r1.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 既有关闭按当前指纹和逐项八维刷新；不增加新关闭数，不授shared格式或完整启动视觉信用 |
| `packages/game/src/assets/dialog-resources.grok-mid-1.test.ts` | test | 已验证 | [blob/宿主/对话有限收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/README.md) | 逐文件A–H/真实caller与独立oracle、资源/全局清理及退休合同已核；当前单次统一门完成，未授完整可玩宿主或shared格式真值 |
| `packages/game/src/assets/tileset-blob-snapshot.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/shell/bootstrap-resources.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts` | test | 已验证 | [RLE／snapshot／启动取消逐文件收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/README.md) | 逐文件A–H、真实caller/独立oracle及ownership/排重去向已核；本窗口冻结后集中门完成，仅指定合同接受 |
| `packages/game/src/shell/precache-ui-host.grok-r1.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/precache-client.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/precache-client.glm-phase1-leaves.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/trademark-fallback.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/shell/trademark-splash.grok-r1.test.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/__tests__/precache-ui-host.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/__tests__/precache-client-host.ts` | test | 已验证 | [CODE3i逐文件A–H/当前原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md) | 当前caller/有限重构/合法输入、独立oracle和清理/排重已核；集中门通过，不附带广域宿主/离线/视觉信用 |
| `packages/game/src/tools/toast.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |
| `packages/game/src/tools/map-names.test.ts` | test | 已验证 | [CODE3j逐文件与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/README.md) | 逐文件A–H、真实caller/oracle、有效反控与集中零诊断门成立；上窗文件接受保留，整卡状态见最新局部校准；不外推路线或广域 |

| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 CanonicalScriptBodyEditor→EntityAddressEditor caller、合法 EntityAddress 与自动改绑 oracle | 1合同/4定向测试通过；相邻测试有22条 React act诊断，保持 review，不标已验证 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | review | [CODE-QUALITY-103 Codex当前逐文件复核](../evidence/CODE-QUALITY-103/codex-current-review.md)；真实 ItemTab/loader/EditSession/save-gate caller、R1/R3/R5 oracle | 3合同/4定向测试通过；相邻测试有22条 React act诊断，P1 puppet/battleOnly仍是产品裁决，保持 review |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |
| `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts` | test | review | CODE-QUALITY-106；真实 RewardGainQueue.present/handleRewardGainInput caller、Promise resolve/AbortError oracle | 定向5/5、相邻21/118零 stderr；全仓 coverage 仍待批次收口，保持 review |
| `packages/game/src/core/menu/primitives.ts` | product | review | CODE-QUALITY-107；SDLPal ui.c:510-572 cursor、真实 menu/battle/inventory caller、E-4 test-only page API | 纯状态 helper 已完整读取；定向/相邻证据待批次收口，E-4 不删公共出口 |
| `packages/game/src/core/menu/item-select.ts` | product | review | CODE-QUALITY-107；SDLPal itemmenu/play/uigame filter caller、typed Item/Inventory oracle、E-5 无生产 caller | filter/建表合同已完整读取；important 为工程近似，E-5 不删公共出口 |
| `packages/game/src/core/menu/__tests__/primitives.test.ts` | test | review | CODE-QUALITY-107；Selection/Confirm/Triple/Switch 主干与公开 helper oracle | 7 文件定向 78 tests；相邻有 2 条白名单外预期 stderr，保持 review |
| `packages/game/src/core/menu/primitives.boundaries.test.ts` | test | review | CODE-QUALITY-107；空表/单项/跨页视窗/输入不改写 oracle | 7 文件定向 78 tests；未将 test-only page API 当产品真值 |
| `packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；pageUp/down 现状、全 disabled、负 cursor、identity oracle | 7 文件定向 78 tests；E-4 保留待另卡 |
| `packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-107；filter 真值、目录外 id、缺名、空库存、奇数卖价 oracle | 7 文件定向 78 tests；important 近似显式披露 |
| `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` | test | review | CODE-QUALITY-107；真实 item/magic selection caller、MP disabled/排序/rightText oracle | 7 文件定向 78 tests；相邻 magic-script 诊断保持开放 |
| `packages/game/src/core/menu/magic-script.ts` | product | review | CODE-QUALITY-108；SDLPal uigame.c:740-873、script.c:867-1102；menu-driver/in-game-magic 与 battle runScript callers | 258 行完整读取；大世界 runner 的全局 label、HP/MP、复活和 warning ownership 已核；本批未改生产，整卡等统一门 |
| `packages/game/src/core/menu/magic-script.test.ts` | test | review | CODE-QUALITY-108；真实 castOverworldMagic caller、typed global command fixture、warning/HP/return oracle | 37 tests；缺失 label 两项 warning 已精确捕获并恢复 spy，定向与 menu 相邻 0 stderr；整卡等统一门 |
| `packages/game/src/analytics/install-analytics.ts` | product | review | CODE-QUALITY-109；main.ts 唯一生产 caller、consent UI/Google Analytics lifecycle、DNT/GPC 与 dataLayer oracle | 57 行完整读取；安装/销毁 ownership 与生产 gate 对齐；本批未改生产，整卡等统一门 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | review | CODE-QUALITY-109；真实 installation return、DOM/storage/dataLayer oracle | 2 tests；补 afterEach destroy，修复第二例 listener/UI 跨用例泄漏；game analytics 6/23 通过，整卡等统一门 |
| `packages/game/src/present/draw-sprite.ts` | product | review | CODE-QUALITY-110；SDLPal palcommon.c:36-130/scene.c:210-316；present/FBP/ending/dialog callers | 49 行完整读取；逐帧 anchor、opaque mask、palette-0 和 Framebuffer clipping 对齐；无直接缺陷 |
| `packages/game/src/present/draw-sprite.test.ts` | test | review | CODE-QUALITY-110；Framebuffer pixel oracle、present sprite contract | 3 合同/定向 17 tests；帧高、脚底、透明孔、palette-0、屏外均有判别力 |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | review | CODE-QUALITY-110；真实 drawSprite/Framebuffer caller、G03-B clip oracle | 8 边界；奇数宽、左右/上下裁剪、identity、透明孔；与主干排重 |
| `scripts/docs/check-document-model.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/document-model.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/document-model.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/frozen-document-source.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/git-document-source.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/historical-execution-source.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/report-governance-progress.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1；本治理新增tracked工具/测试，仅库存登记 | 后继CODE-QUALITY专项语义核验；文档工具测试通过不自动闭合 |
| `scripts/docs/retired-document-writers.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 K0；历史文档writer真实CLI退休/零写合同，专项语义仍待核 | 仅新增库存；不计产品运行、coverage或代码治理closed |
| `scripts/docs/testing-index-governance.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 L；索引真实writer/CLI与whole-file consumer合同，专项语义仍待核 | 仅新增库存；不计产品运行、coverage或代码治理closed |
| `scripts/docs/git-document-snapshot.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 F1；固定commit/path/regular-blob原Buffer读取合同，专项语义仍待核 | 仅新增库存；不计代码治理closed |
| `scripts/docs/frozen-binding-baseline.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 F1；default等值与真实root/view/progress联改反例，专项语义仍待核 | 仅新增库存；不计产品运行或coverage |
| `scripts/docs/terminal-json.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；有界 UTF8/JSON 语法、重复键与原生字段读取；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-codec.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；固定 gzip header/单流 footer/CRC/ISIZE 精确 framing；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-git.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；真实 Git 工作树发现与元数据边界；合法 caller symlink 归一化；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-namespace.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；唯一工作树 namespace/FD 与 source-format-partial 协调；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-contract.mjs` | tool | 待核 | DOCS-FULL-TEMPLATE-1 A8；终端 JSON 记录/事件格式合同；不授审批与完成信用；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |
| `scripts/docs/terminal-codec.test.mjs` | test | 待核 | DOCS-FULL-TEMPLATE-1 A8；34 个格式/真实公开 caller/反控合同；不计旧业务测试或覆盖率；[格式接入](../../phase-governance/reviews/20261016-terminal-a8.json) | 仅库存登记；专项代码质量仍待核 |

## 入口与责任

[生成器](../../../scripts/quality/code-quality-inventory.mjs)提供路径集合，读取本表的[完整性门](../../../scripts/quality/code-quality-ledger.mjs)要求唯一汇总、唯一表、合法状态/类别、证据和真实数量相等。Codex维护登记与后继独立验收；[路线](code-quality-governance.md)只导航，不复制一套当前数值或自动授build。

源与状态所属卡决定语义信用。未核项保待核；`review/blocked/rework`必须保留具体缺口，不能为了清零账本删候选或把机器字段批量改已验证。表后原三待核行归并只改变消费者可见性，inventory缺省本已将其计pending，因此不增加任何关闭数。

## 证据与下一步

2026-10-16 G相对原3283新增7项，K0和L各新增1项，F1新增2项，A8新增6项，累计17项均在scripts/docs且仍待核；实际tracked集合当前3300，未删路径。原229closed/5review保持；A8独立格式验收仅为source-format-partial，不关闭CODE-QUALITY专项状态。治理期间须在新增/删除真实tracked路径的同一提交同步库存。当前机器结果只证明记录完整性，专项仍有3066待核和5待审文件。

历史Q3k的“4 total/3 fail”误述现改为卡/总纲一致的“4 total/3 passed/1 failed”，旧错句在下方完整snapshot原字节保留；没有以文档一致性充当第二次运行。Q2b131/129及Q3t/u同215时点仍unknown，u/w依各卡排重；新反例按[现行协作流程](../agent-workflow.md)开互斥卡，不恢复旧prompt。

## 历史范围

原273行包含b9ba7e0起始、后继3283库存及截至2026-10-15的增量说明。原234消费记录及空行后三待核均保留；下方完整原稿放fenced text以防旧汇总/表被真实消费者重复读取，可提取原UTF8字节。

## 原始结论

原已闭合229、待审5、待核3049是3283库存的旧状态投影，不等于今天全部源码被本轮读过。原五review风险与三GLM待核不消失；Q3k“3 fail”原错句保留，只纠正live摘要。

## 当时证据

每行原卡/原测试/primary说明逐字保留（唯一Q3k摘要纠错另列）；10-07/11/12/14/15新增文件不授语义闭合的原说明完整保留。旧raw/test/coverage不是本次再执行，失效路径不自动删除或改已验证。

## 当前有效性

live机器字段属于持续维护输入，历史原文属于不可升格的出处。真实consumer只证明tracked集合、唯一记录/状态/证据与汇总一致；未列路径继续待核，不能以PASS宣布全仓语义治理或当前测试质量通过。

## 继任文档

[路线](code-quality-governance.md)与[当前协作](../agent-workflow.md)控制新批准入。G原7、K0与L各1、F1两项及A8六项docs工具/测试只有库存待核信用；全量专项仍待实际逐文件阅读/合法输入与caller/oracle、反控和独立验收。

固定原稿来自revision `22eead43a6c825e1345feb92441e09d340d22c18`，Git blob `8195bf08cf7193b1dffc0c5676629e6692e50b92`；保留所有原日期、结论和证据边界。






2026-10-21 present/speedrun收口：48/49/50/61–69共12卡、36明确文件接受；31旧closed在本窗口复核前撤review，最终本窗口相对原live净新增5closed。当前全局277closed/173review/2875pending，共3325。九卡旧门的两条stdout诊断已勘误，现以新完整零诊断门重建集成依据；整仓pending不因此减少。见[窗口裁定](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-speedrun-gates.json)。

<!-- original-source-fenced:start -->
~~~~text
# 逐文件代码治理账本

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`。机器全量清单由
[`code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs) 生成；本账本只登记已经由
Codex 直接读过源码、生产 caller/合同和验证证据的文件，不把“所在包全绿”推成文件已审。

起始基点机器清单：2,962。当前 tracked 清单（含预览、RNG 回归及第一阶段音乐音源）：3,283。
当前已闭合核验：229；已读但待审：5；尚未逐文件核验：3,049；合计未闭合：3,054。
`待核` 不等于“没有问题”，也不等于允许跳过；只有补齐职责、调用方、风险判断、证据和验证后才可改为 `已验证`、`保留`、`blocked` 或 `rework`。

2026-10-07存档测试有限集成新增`current-codec.contracts.test.ts`，仅同步tracked机器清单及待核数；本专项已审/待审状态不变。测试合同验收见[存档三审](../evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/codex-review-r3.md)，不以测试通过替代本专项逐文件语义审核。

2026-10-11 合入 E2E-CONTINUOUS-001-006 后，实际 inventory 比原清单净增 166 项，计入待核，
不因此增加本专项已闭合数量。PAL 引用测试已核保留独立 collector/index blocker parity，当前
内容 census 与真实 loader 回归通过；coverage 配置仅移除已删除 `pal-project.test.ts` 的排除项，
其历史质量证据不重写。主线验收与本专项全仓逐文件审核仍分开记录。

2026-10-11 CI 干净 checkout 修复新增一份原始记录测试夹具，仅同步库存与待核数；
测试断言及原始 SSS 字节核验不自动计为本专项逐文件审核完成。

2026-10-11 三个 GLM 有限测试包新增三个测试文件，库存增加三项并计入待核；
本次合同验收不自动增加本专项逐文件治理闭合数量。

2026-10-12 编辑器初始状态方案新增两个实现文件、两个测试文件和一份合法场景夹具，
实际 inventory 增加五项并计入待核；功能验收与本专项逐文件治理分开记录。

2026-10-14 酒剑仙传功修复新增 `event-rng-scene-restore.test.ts`，tracked inventory 增加一项并计入待核。
专项四合同、像素回归与反控见[修复证据](../evidence/game-rng-scene-restore-1/README.md)，不自动增加本账本治理闭合数量。

2026-10-15 第一阶段音乐音源与缓存回归新增16项tracked记录，均计入待核；功能/独立复核不自动增加本专项语义治理闭合数。精确路径见[新增机器清单](../evidence/game-rix-music-1/release-inventory-delta.json)。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/shared/src/rle.ts` | product | 已验证 | CODE-QUALITY-1；RLE 定向、shared 全包、check、ratchet、protected fast、lint | generic/strict framing 边界已收 |
| `packages/shared/src/rle.test.ts` | test | 已验证 | CODE-QUALITY-1；合法帧与回归 oracle | 只登记合同，不以数量验收 |
| `packages/shared/src/rle.boundaries.test.ts` | test | review | [pre-94 CODE1 RLE复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md)；strict framing、相邻 offset 截断反例 | 新增前一帧帧头截断合同；注释/整卡/统一门仍待，不计 closed |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-1；真实 runtime resource caller | 宽容入口合同 |
| `packages/shared/src/mkf.ts` | product | 已验证 | CODE-QUALITY-2；raw 2,373 chunks、shared 全包、全仓门 | offset table 边界 |
| `packages/shared/src/mkf.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2；截断/越界/倒序 offset | 纯 codec 合同 |
| `packages/shared/src/rng.ts` | product | 已验证 | CODE-QUALITY-2；raw 1,464 frames、shared 全包、全仓门 | payload/surface 边界 |
| `packages/shared/src/rng.boundaries.test.ts` | test | review | [pre-94 CODE2 MKF/RNG复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md)；opcode payload/surface 与连续 delta surface ownership | 新增同一 surface 连续 delta 累加合同；不扩展 runtime 语义，整卡/统一门仍待 |
| `packages/editor/src/core/project-reference.pal.test.ts` | test | 已验证 | CODE-QUALITY-1b；collector 直接结果与历史提交证据 | 仅更新过期 oracle |
| `packages/pal-extract/src/events/annotate.ts` | product | 已验证 | CODE-QUALITY-3a + Q3f；typed annotation 与 symbols sidecar boundary、全仓 gates | Q3f done |
| `packages/pal-extract/src/events/annotate.test.ts` | test | 已验证 | CODE-QUALITY-3a；annotation 合同 | 纯转换输出 |
| `packages/pal-extract/src/events/annotate.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-3a + Q3f；真实 annotation 与 symbols malformed contracts | Q3f done |
| `packages/pal-extract/src/events/slice.ts` | product | 已验证 | CODE-QUALITY-3a；BFS/recompile round-trip、全包、全仓门 | typed visitor boundary |
| `packages/pal-extract/src/events/slice.test.ts` | test | 已验证 | CODE-QUALITY-3a；scene/global/shared 合同 | 不以 coverage 单独验收 |
| `packages/pal-extract/src/events/slice.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3a；切分边界反例 | 真实 caller |
| `packages/pal-extract/src/events/slice.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-3a；真实资源 slice 合同 | 不改生成物 |
| `packages/pal-extract/src/io/msg.ts` | product | 已验证 | CODE-QUALITY-3b；offset 越界/倒序 34/34，pal-extract/full check、ratchet、protected fast | Q3b done |
| `packages/pal-extract/src/io/msg.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3b；越界/倒序反例 | Q3b done |
| `packages/pal-extract/src/io/sss.ts` | product | 已验证 | CODE-QUALITY-3b；chunk2/3/4 对齐反例，真实 SSS，全包/check/ratchet/protected | Q3b done |
| `packages/pal-extract/src/io/sss.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3b；结构未对齐 34/34 | Q3b done |
| `packages/shared/package.json` | product | 已验证 | shared check/typecheck；仅 workspace 元数据 | 无运行时逻辑 |
| `packages/shared/tsconfig.json` | product | 已验证 | shared typecheck；编译边界 | 无产品行为 |
| `packages/shared/src/events.ts` | product | 已验证 | 直接读取 Command union；shared typecheck/events 合同 | 类型 schema，未改公共接口 |
| `packages/shared/src/input.ts` | product | 已验证 | 直接读取 AbstractKey/InputSource；input type contract | 类型 schema，未改输入语义 |
| `packages/shared/src/index.ts` | product | 已验证 | 直接读取 barrel exports；shared typecheck | 公共出口保持 |
| `packages/shared/src/pal-authored-map-names.ts` | product | 已验证 | authored fixture hash/222 entries 测试 | 缺名显式 undefined，无 fallback |
| `packages/shared/src/resources.ts` | product | 已验证 | 直接读取全部资源接口；pal-extract/game callers 与 typecheck | 纯类型合同 |
| `packages/shared/src/rle-encode.ts` | product | 已验证 | encode roundtrip、独立 byte oracle、128KB guard | 与 RLE decoder 合同一致 |
| `packages/shared/src/tables.ts` | product | 已验证 | 直接读取表类型与 pal-extract/game callers；typecheck/tables type contract | 纯类型合同 |
| `packages/shared/src/yj2.ts` | product | 已验证 | CODE-QUALITY-2b；2,626 raw chunks / 34,367,608B 逐字节一致，位流/回引边界与反控 | Q2b done |
| `packages/shared/src/__tests__/glm-foundation-fixtures.ts` | test | 已验证 | YJ2/MKF/RNG 固定向量直接被 shared tests 消费 | test-only fixture |
| `packages/shared/src/__tests__/resources-types.ts` | test | 已验证 | shared type fixtures；typecheck | test-only fixture |
| `packages/shared/src/events.test.ts` | test | 已验证 | Command union type contract | 不以数量验收 |
| `packages/shared/src/index.test.ts` | test | 已验证 | timing constants contract | 公共常量 oracle |
| `packages/shared/src/input.test.ts` | test | 已验证 | AbstractKey/InputSnapshot/InputSource contract | 类型 contract |
| `packages/shared/src/pal-map-names.test.ts` | test | 已验证 | 222 entries/hash/undefined gaps | authored fixture oracle |
| `packages/shared/src/rle-encode.boundaries.test.ts` | test | 已验证 | 126/127/128 byte oracle、pad/offset | 高判别力反控 |
| `packages/shared/src/rle-encode.glm-runtime-resource.test.ts` | test | 已验证 | 真实 runtime resource encoder contract | caller oracle |
| `packages/shared/src/rle-encode.test.ts` | test | 已验证 | encoder/decoder roundtrip、128KB guard | 合法输入合同 |
| `packages/shared/src/rle.glm-o.test.ts` | test | 已验证 | shared RLE/YJ2 public entry contracts | Q1/Q2 相邻 oracle |
| `packages/shared/src/rng.test.ts` | test | 已验证 | RNG public decoder contract | Q2 相邻 oracle |
| `packages/shared/src/tables.test.ts` | test | 已验证 | type-only Item contract | 类型 contract |
| `packages/shared/src/yj2.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-2b；9 cases 含位流/回引反例、shared 全包 131 tests | Q2b done |
| `packages/pal-extract/src/resources/sprite.ts` | product | 已验证 | CODE-QUALITY-3d；indexed PNG 尺寸/pixels/opaque 输入边界，callers、全包/check/ratchet/protected/lint | Q3d done |
| `packages/pal-extract/src/resources/sprite.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3d；非法尺寸/短 pixels/短 opaque 反例与 negative control | Q3d done |
| `packages/editor/src/ui/SpriteFrameWorkbench.tsx` | product | 已验证 | CODE-QUALITY-3c；174 行缺帧 fallback branch 逐文件定位；公开组件回归与 coverage gate | Q3c done |
| `packages/editor/src/ui/SpriteFrameWorkbench.animation-boundary.test.tsx` | test | 已验证 | CODE-QUALITY-3c；缺帧动画时序合同与 fallback mutant 反控 | Q3c done |
| `packages/pal-extract/src/resources/parsers/_utils.ts` | product | 已验证 | 直接读取 layout 常量与 u16/s16 helper；所有 parser callers、typecheck | 纯布局 helper |
| `packages/pal-extract/src/resources/parsers/ball.ts` | product | 已验证 | RLE header/坏帧 skip、BALL caller 与 parser tests；全包通过 | 保留空 chunk skip |
| `packages/pal-extract/src/resources/parsers/battle-fields.ts` | product | 已验证 | 12B fixed record/signed effects guard、真实 DATA caller 与 tests | 非整除显式失败 |
| `packages/pal-extract/src/resources/parsers/data-misc.ts` | product | 已验证 | level-up/effect table contracts、现有短输入宽容测试与 real DATA caller | 宽容截断合同有直接测试，未擅改 |
| `packages/pal-extract/src/resources/parsers/enemies.ts` | product | 已验证 | ENEMY/OBJECT fixed layout、signed fields、name/map callers 与 tests | short map helper 合同保留 |
| `packages/pal-extract/src/resources/parsers/enemy-teams.ts` | product | 已验证 | 10B team record、slot sentinel/translation/name map tests | 0/FFFF 语义保真 |
| `packages/pal-extract/src/resources/parsers/fire.ts` | product | 已验证 | FIRE YJ2/raw fallback、empty/short group guard 与 callers/tests | 不改资源降级 |
| `packages/pal-extract/src/resources/parsers/items.ts` | product | 已验证 | OBJECT item range/truncation guard、wObjectID/MengShe split 与 tests | 稳定全局 ID |
| `packages/pal-extract/src/resources/parsers/player-roles.ts` | product | 已验证 | 900B SoA exact guard/cursor check、DATA caller/role fixtures | 不改角色 schema |
| `packages/pal-extract/src/resources/parsers/rgm.ts` | product | 已验证 | RGM header/RLE/PNG caller 与 tests | 空 chunk skip |
| `packages/pal-extract/src/resources/parsers/rng-frames.ts` | product | 已验证 | shared RNG decoder + PNG adapter caller/fixtures | 不复制 codec |
| `packages/pal-extract/src/resources/parsers/sounds.ts` | product | 已验证 | metadata pure mapping、SOUNDS caller/tests | 不解析 WAV 内容 |
| `packages/pal-extract/src/resources/parsers/spells.ts` | product | 已验证 | OBJECT magic/union fields、DATA magic callers/tests | 保持 scriptDesc offset contract |
| `packages/pal-extract/src/resources/parsers/stores.ts` | product | 已验证 | 18B STORE guard、zero sentinel/real DATA tests | 不改 store IDs |
| `packages/pal-extract/src/events/disasm.ts` | product | 已验证 | SSS raw disasm/roundtrip callers、事件全包与真实 bytecode | 未改 opcode 语义 |
| `packages/pal-extract/src/events/recompile.ts` | product | 已验证 | roundtrip inverse 与全量 bytecode digest | 结构命令 fail-loud |
| `packages/pal-extract/src/events/opcodes.ts` | product | 已验证 | opcode table 与 primary script.c、disasm/slice callers | raw fallback 保持 |
| `packages/pal-extract/src/events/roundtrip.ts` | product | 已验证 | parseSss/parseMessages/disasm/recompile 真实入口 | mismatch 报告合同 |
| `packages/pal-extract/src/font/bdf-to-json.ts` | product | 已验证 | BDF parser/glyph JSON tests 与 optional CLI caller | 非法行宽容合同已有反例 |
| `packages/pal-extract/src/io/mkf.ts` | product | 已验证 | shared MKF re-export、2,373 raw chunks、shared check | 无重复 codec |
| `packages/pal-extract/src/io/rle.ts` | product | 已验证 | shared RLE re-export、extractor callers | 无重复 codec |
| `packages/pal-extract/src/io/word.ts` | product | 已验证 | WORD raw/content pins 与宽容短输入既有合同 | 不擅改并行宽容行为 |
| `packages/pal-extract/src/io/yj2.ts` | product | 已验证 | shared YJ2 re-export、2,626 raw segments | 无重复 codec |
| `packages/pal-extract/src/resources/asset-manifest.ts` | product | 已验证 | manifest determinism/DS_Store/self exclusion tests、CLI caller | path/version pure contract |
| `packages/pal-extract/src/resources/battle-sprite.ts` | product | 已验证 | kind/id composite key、missing chunk skip、PNG callers/tests | 不混 enemy/player identity |
| `packages/pal-extract/src/resources/enemy-pos.ts` | product | 已验证 | 100B fixed table/signed layout boundary tests、CLI caller | layout transpose explicit |
| `packages/pal-extract/src/resources/map.ts` | product | 已验证 | 65536B map guard、real MAP/GOP decode、CLI caller | raw tilemap output |
| `packages/pal-extract/src/resources/palette.ts` | product | 已验证 | VGA/night color pins、short-input宽容既有合同、CLI caller | 不改变 palette mapping |
| `packages/pal-extract/src/resources/scene.ts` | product | 已验证 | scene range dump/real resource tests、CLI caller | dense scene bounds |
| `packages/pal-extract/src/resources/tables.ts` | product | 已验证 | parser barrel exports、all table callers/typecheck | 无运行时实现 |
| `packages/pal-extract/src/cli.ts` | product | 已验证 | Q3f/Q3g；全量 73-896 行 IO/清理/降级/manifest 直接审计；full check/ratchet/protected/lint | Q3g done |
| `packages/content/src/asset.ts` | product | 已验证 | 直接读取 AssetCatalog/path/origin/role closure validators 与 1490 content tests/full check | 保持 stable AssetId/path ownership |
| `packages/content/src/project-map.ts` | product | 已验证 | 直接读取 canonical version 4/map matrix/stamp placement validator 与 content tests | 不改 schema |
| `packages/content/src/scene-index.ts` | product | 已验证 | 直接读取 stable scene id/path/index validator 与 content tests | 路径 fail-closed |
| `packages/content/src/validate-runtime.ts` | product | 已验证 | 直接读取 runtime scene/hooks/entities validator 与 content tests | 旧 cast 仅校验后 DTO 投影 |
| `packages/content/src/actor-condition.ts` | product | 已验证 | 直接读取 carried-status/condition shape guards 与 content contract tests | 稳定 status/poison 引用 |
| `packages/content/src/entity-lifecycle.ts` | product | 已验证 | 直接读取 lifecycle shape/reference closure/normalization 与 content tests | 缺 map 归一空表合同 |
| `packages/content/src/map-index.ts` | product | 已验证 | 直接读取 stable map id/path/index guards 与 content tests | 路径 fail-closed |
| `packages/content/src/migration-diagnostic.ts` | product | 已验证 | 直接读取 migration sidecar schema/category/source validation 与 content tests | 仅迁移诊断，不污染运行时 schema |
| `packages/content/src/runtime-scene.ts` | product | 已验证 | 直接读取 runtime hostile/chase/victory/flee policy guards 与 content tests | explicit policy contract |
| `packages/content/src/enemy-team.ts` | product | 已验证 | 直接读取 stable enemy-team id/slot/reference validators 与 content tests | 不用数组位置当身份 |
| `packages/content/src/enemy-ai-condition-guard.ts` | product | 已验证 | 直接读取 AI condition recursive guard 与 content tests | 条件联合边界明确 |
| `packages/migrate/src/migration-transaction.ts` | product | 已验证 | 直接读取 journal v2/path/scope/precondition/atomic rename/recovery；migrate 95/723 与 transaction boundary suites | 事务写盘 ownership 已有反控 |
| `packages/migrate/src/pal-source-io.ts` | product | review | 直接读取 extracted source partitions/scene and asset callers；发现 generic JSON casts 需后续 schema/source-contract 批次 | 不改 generated source |
| `packages/migrate/src/migration-project-io.ts` | product | review | 直接读取 managed-file discovery/TOCTOU hash ownership；JSON shape validation 与 content validators 的边界留 Q4 | 不改 project output |
| `scripts/quality/lint-zero.mjs` | tool | 已验证 | whole-repository Biome JSON report/fail-closed wrapper；3198-file zero-diagnostic runs | 不接受过滤参数 |
| `scripts/quality/code-quality-inventory.mjs` | tool | 已验证 | scoped git inventory/caller propagation、quality inventory tests | machine snapshot 不冒充 verdict |
| `scripts/quality/code-quality-ledger.mjs` | tool | 已验证 | CODE-QUALITY-6a；真实 inventory/ledger uniqueness/status/count verifier、37 quality-tool tests | 只校验记录完整性，不把机器 PASS 当语义审查 verdict；fail-closed |
| `scripts/quality/code-quality-ledger.test.mjs` | test | 已验证 | CODE-QUALITY-6a；9 个独立反例/真实仓库调用：重复、未知路径、计数漂移、表形状/状态/证据缺失、inventory 变更 | 真实 Node quality runner 纳入；不修改 ledger |
| `packages/game/src/core/battle/battle-progression.ts` | product | 已验证 | CODE-QUALITY-3x 当前复审；3x-battle-progression；battle.c:991-1373,1226-1328；global.c:2347-2454；settlement/battle-system callers | 306 行实现全文核验主升级、隐藏经验池顺序/整数截断/99 边界、主升级 cap、HP/MP 时机、法术学习去重与 snapshot 有效值；定向4 files/207 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-progression.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3x 当前复审；3x-battle-progression；142 行全文、CHECK_HIDDEN_EXP/主升级边界与定向4 files/207 tests | wLevel>99、隐藏无999 cap、池 RNG 顺序、无主升级不回满/主升级含隐藏回满反例；无重复或弱断言 |
| `packages/game/src/core/battle/__tests__/battle-levelup.test.ts` | test | 已验证 | CODE-QUALITY-3x 当前复审；3x-battle-progression；303 行全文、主升级/法术/投影 oracle 与定向4 files/207 tests | 活人 gate、阈值/余数/连升/满级、STAT_LIMIT、法术去重/level gate、runtime→battle projection 反例；无重复或弱断言 |
| `scripts/docs/check.mjs` | tool | 已验证 | Markdown link/task/board/index verifier；docs check runs | fail-closed task state |
| `scripts/docs/check-testing.mjs` | tool | 已验证 | testing catalog/index/legacy flat verifier；testing docs runs | 独立测试文档门 |
| `scripts/docs/config.mjs` | tool | 已验证 | current docs versions/sections/exceptions source | 不改历史格式 |
| `scripts/coverage/metrics.mjs` | tool | 已验证 | exact integer ratio/aggregate comparison tests | 不用 pct 四舍五入 |
| `scripts/coverage/inventory.mjs` | tool | 已验证 | source/test scope diff and removal contracts | 不静默缩窄范围 |
| `scripts/coverage/environment.mjs` | tool | 已验证 | compile-cache disabled child environment contract | 保留无关环境 |
| `scripts/coverage/protected-baseline.mjs` | tool | 已验证 | protected baseline bootstrap/compare fail-closed tests | 无 baseline 不 fail-open |
| `scripts/coverage/config.mjs` | tool | 已验证 | seven-package source/test selection and fast exclusions | E2E exclusion boundaries |
| `scripts/coverage/run.mjs` | tool | 已验证 | direct read of package runner/ratchet/protected orchestration; Q3c SpriteFrame branch fixed and support-mode gates passed | Q6 runner audit slice |
| `scripts/script-governance/run.mjs` | tool | 已验证 | canonical install census CLI, output symlink guard, script-governance tests | 不写产品数据 |
| `packages/pal-extract/package.json` | product | 已验证 | package scripts/dependency boundary；pal-extract check/full gates | 无运行时逻辑 |
| `packages/pal-extract/tsconfig.json` | product | 已验证 | source/scripts include 与 typecheck | 无产品行为 |
| `packages/pal-extract/src/utils/gbk.ts` | product | 已验证 | GBK/PUA residue mapping tests与M.MSG caller | 资源正文转码合同 |
| `packages/pal-extract/scripts/grep-sdlpal-chunks.ts` | product | 已验证 | execFile 参数数组、reference-only read helper | 无写盘 |
| `packages/pal-extract/scripts/extract-videos.ts` | product | review | ffmpeg external IO/mtime skip/empty output 直接读过 | 需后续工具失败反控，不与主 extract 混写 |
| `packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs` | product | review | scene/event/tilemap BFS 与写盘脚本直接读过 | 诊断生成器需后续 path/input 复核 |
| `packages/pal-extract/audit-data-mkf.mjs` | product | review | DATA.MKF diagnostic census 直接读过；发现绝对 repo path 与 shared MKF duplicate | 仅诊断脚本，Q6/CLI tool audit 待核 |
| `packages/game/src/assets/loader.ts` | product | 已验证 | CODE-QUALITY-3h；全量读取 loadAll/fetchPalette/SceneAssetsCache，真实 bootstrap caller、asset tests、game 定向测试 | fetch/status 与可选资源降级均有 caller；cache LRU/protect 合同保留，未发现直接缺陷 |
| `packages/game/src/assets/tileset-blob.ts` | product | 已验证 | CODE-QUALITY-3h；gzip/raw blob、shared parseSpriteChunk、tileset/NPC/battle/magic callers 与 snapshot/load tests | gzip 魔数防双解压、HTTP 状态和帧 key 合同已有反例；未改资源格式 |
| `packages/game/src/assets/png.ts` | product | 已验证 | CODE-QUALITY-3h；createImageBitmap/canvas/alpha mask caller 与 PNG failure/close tests | 解码失败保留 cause，bitmap finally close；未发现直接缺陷 |
| `packages/game/src/assets/rle-decode.ts` | product | 已验证 | CODE-QUALITY-3h；shared codec re-export、dialog-assets base64 caller、identity tests | 无重复 codec；base64 非法输入继续 fail-loud |
| `packages/game/src/shell/fetch-retry.ts` | product | 已验证 | CODE-QUALITY-3h；main.ts 唯一生产安装 caller；GET/HTTP/非幂等合同、定向测试与 invalid-options negative control | 非法 retries 不再零次请求后 `throw undefined`；非法 backoff 不再交给平台钳制；有效配置行为不变 |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | CODE-QUALITY-3h；bootstrap.ts 真实 soundfont/resourcesReady caller、并发屏障和 rejection/degradation tests | soundfont 原始 rejection 与 settle barrier 分离；glyph 仅显式 tofu 降级；未发现直接缺陷 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3h；无效配置合同、HTTP/method/backoff/最终身份反例；删除 guard 的 mutant 失败 | 高判别力输入合同，不以数量验收 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | CODE-QUALITY-3i；portrait/icon manifest callers、PNG/RLE adapters、dialog-assets/host tests 与 game typecheck | 资产缺失按现行空 map 降级；不伪造 manifest 帧，不改资源格式 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | CODE-QUALITY-3i；main/bootstrap SW caller、ready/start/pause/resume/unavailable tests | onPlayable 前不启动 precache，ready race 仅缓冲 start；现行 SW 协议保留 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | CODE-QUALITY-3i 当前复审；DOM widget/unified phase tests、host boundary 23 contracts、main/bootstrap caller | 修复 NaN/Infinity/负字节污染单调进度；合法两段进度与进入/完成/失败生命周期保留 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | CODE-QUALITY-3i；reference/sdlpal main.c:197-203、rng-player caller、trademark/splash framebuffer/timing tests | 只纠正过时 skipKeys 注释；DOS chunk 6/1000ms/600ms 行为未改 |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3i；NaN/0/default/三通道共享 mute 合同；删除 NaN guard 的 mutant 失败 | 直接 setter/storage/sink oracle，不重复 clamp 主干 |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；canvas/localStorage/fullscreen callers、scale tests；NaN negative control | 修复 NaN 百分比写入 NaN CSS/storage；有限百分比 clamp/居中形态不变；本片未发现新缺陷 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | [pre-94 CODE3j display-scale/fps复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)；tools-panel/rAF caller、启停/采样/DOM tests | module sampling state 在停用时清零；非法持久值仅 `'1'` 开启；本片未发现新缺陷 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；save/tool callers、success/error/info/stack lifecycle tests | DOM 单例/多 toast 到期自删合同完整；本片未发现直接缺陷 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；shared authored map-name caller 与 known/fallback tests | 缺名保持 `地图N` 回退，不改 authored table |
| `packages/game/src/tools/speedrun/time-format.ts` | product | review | [pre-94 CODE3j time-format 当前复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-time-format/README.md)；store/overlay/tools-panel caller、三份直接测试 | 发现超长数字可形成 Infinity 并在 JSON 持久化时静默变 null；已补 finite 反例与解析守卫，整卡/统一门仍待 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | [pre-94 CODE3j countdown复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-countdown/README.md)；speedrun/index caller、singleton/update/remove DOM tests | 单节点复用、null 幂等移除、disabled 清理；本片未发现直接缺陷，3j 整卡仍 partial |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | [pre-94 CODE3j toast/map/checkpoints复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)；speedrun store/detectors caller、21-id/monotonic/BANANA tests 与 PalTimer 注释 | 只读核对坐标/物品/检测器；坐标实跑仍 unknown，不擅改速通数据 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present/draw-tilemap/draw-sprite caller、framebuffer + leaves tests | 默认/离屏尺寸、边界静默写、palette 缺色 fallback 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:710-715 caller、sdlpal video.c:571-620、shake/bounds tests | 奇偶垂直搬移、level 越界、advance=false 补帧和 shakeTime 递减逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:313-317 caller、sdlpal scene.c:365-430、global.h:379/538-539、wave/leaves/mirror tests | `<=0` guard、256 关断、相位/循环与 advance=false 逐文件核验；历史 raw/mutant 结果未在本片重跑 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:658-673、battle fade caller、video.c/battle.c、dither/nibble tests | 72-step RG_INDEX/低位逼近与 backup ownership 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/menu/draw-confirm.ts` | product | 已验证 | CODE-QUALITY-46 当前复审；46-draw-confirm；uigame.c:242-388；present/draw-menu/draw-shop callers；draw-box/font/framebuffer owners | 48 行实现全文核验双框坐标、selectedColor、标签/阴影、空标签与 framebuffer ownership；定向2 files/10 tests、相邻3 files/69 tests、game typecheck通过；未发现 direct defect |
| `packages/game/src/present/menu/draw-confirm.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-46 当前复审；46-draw-confirm；真实 drawConfirmBox/framebuffer pixel oracle | 67 行全文核验选中侧、palette cycle、三影、custom switch labels；定向2 files/10 tests通过，无弱断言 |
| `packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-46 当前复审；46-draw-confirm；opening/pixel caller与状态隔离 oracle | 177 行全文核验背景/光标/状态不可变、多字与空标签边界；定向2 files/10 tests通过，无弱断言 |
| `packages/game/src/present/draw-number.ts` | product | review | CODE-QUALITY-3k 当前复审；battle/menu/dialog callers、sdlpal ui.c:640-732、draw-number/slots tests | 合法颜色/对齐/R-to-L/truncate/opaque mask/缺帧合同完整；正 Infinity 会卡在长度循环，生产可达性未证，留 review |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | CODE-QUALITY-3k 当前复审；present.ts:393-417、sdlpal scene.c:658-780、follower tests | walking/静止冻结/障碍回退/朝向源/trail fallback 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/framebuffer.test.ts` | test | 已验证 | CODE-QUALITY-3k；默认尺寸/write-clear/toImageData RGBA 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/framebuffer.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；越界、自定义尺寸、缺色 fallback 反例 | 高判别力边界合同 |
| `packages/game/src/present/screen-shake.test.ts` | test | 已验证 | CODE-QUALITY-3k；奇偶搬移/递减/level 0/连续帧合同 | 公式 oracle |
| `packages/game/src/present/screen-shake-bounds.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；level 199/200/256、advance=false 边界合同 | 不重复主干 |
| `packages/game/src/present/screen-wave.test.ts` | test | 已验证 | CODE-QUALITY-3k；渐弱/清零/循环守恒合同 | 相位 reset 隔离 |
| `packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；advance=false/循环/跨帧相位/真实 raw 负 progression 收尾合同；mutant 4 total/3 fail→恢复 4/4 | typed indices + raw oracle |
| `packages/game/src/present/screen-wave-mirror.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；镜像 wave 表/关断/累加边界合同 | 独立行 shift oracle |
| `packages/game/src/present/dither-fade.test.ts` | test | 已验证 | CODE-QUALITY-3k；step0/outer1/72-step 收敛合同 | 原版 nibble oracle |
| `packages/game/src/present/dither-fade-nibble.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；RG_INDEX 顺序/低位回退/邻接不动合同 | 相位合同 |
| `packages/game/src/present/draw-number.test.ts` | test | 已验证 | CODE-QUALITY-3k；align/color/truncate/缺帧合同 | sdlpal UI oracle |
| `packages/game/src/present/draw-number-slots.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；opaque mask/末行/缺位/nLength=0 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/follower-pos.test.ts` | test | 已验证 | CODE-QUALITY-3k；walking/frozenOffset/0x46/船/隐龙窟回归合同 | 一阶段行为回归 |
| `packages/game/src/present/follower-pos-axis.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；方向轴/障碍/短 trail/静止不调用 caller 合同 | 轴向反例 |
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:50-90/565-620/982、bg tests | 索引0不透明、尺寸裁剪、召唤低 nibble 染色逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle overlay caller、fight.c:2183/2188/2760、effect/pixel tests | 底中 anchor、opaque mask、缺资源/坏 frame no-op 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle showDamageNum caller、uibattle.c:1746-1810、num/pixel tests | 40ms age、0..10 寿命、y上移、5位 right align/颜色合同逐文件核验；未发现新直接缺陷 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、battle.c:991-1373、ui.c:640-732、settlement pixel tests | exp/cash/level/hidden-exp/learn-magic screens 的布局、文字、数字、mask 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle/battle-positions caller、battle/fight/uibattle/palcommon primary、sprite pixel/leaves tests | target highlight、idle/death/fade、color shift、Y-sort/opaque mask/边缘裁剪逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | 已验证 | CODE-QUALITY-3l 当前复审；present-battle caller、player-poison-state mapper、uibattle/magicmenu/itemmenu primary、UI pixel/leaves tests | dialog/escape/auto early return、menu/target/status layers、party-slot poison color、grid/MP/amount layout 逐文件核验；未发现直接缺陷 |
| `packages/game/src/present/battle/present-battle.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c scene order、screen-wave/shake/dither callers、present-battle tests | bg→wave→sprites→nums→UI→fade/shake 装配顺序直接核对 |
| `packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts` | test | 已验证 | CODE-QUALITY-3l；背景写入/低 nibble shift 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-effect.test.ts` | test | 已验证 | CODE-QUALITY-3l；overlay anchor/mask/缺资源合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-num.test.ts` | test | 已验证 | CODE-QUALITY-3l；floating nums age/position/clear 合同 | 真实 layer caller |
| `packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts` | test | 已验证 | CODE-QUALITY-3l；各结算 screen 合法输入合同 | typed settlement oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts` | test | 已验证 | CODE-QUALITY-3l；anchor/idle/color shift/death 合同 | battle state oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI state/early-return/menu/grid 合同 | typed UI oracle |
| `packages/game/src/present/battle/__tests__/present-battle.test.ts` | test | 已验证 | CODE-QUALITY-3l；装配顺序/命令消费/跨帧状态合同 | 真实 BattlePresent caller |
| `packages/game/src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；结算文字/布局 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite state/target/fade leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI 分支/对话/目标 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/battle-effect-num-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；effect/number pixel 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-settlement-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；settlement pixel/word layout 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-sprite-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite pixel/mask/z-order 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-ui-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；battle UI pixel/early-return 证据 | 高判别力像素 oracle |
| `packages/game/src/core/battle/formulas.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:131-389、battle callers、formula tests | SHORT/WORD、CLASSIC base/physical/magic/dex、resistance/field steps 逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/magic-damage.ts` | product | 已验证 | CODE-QUALITY-3m 3m-formulas-magic；fight.c:4270-4318/5300-5400/4673-4853、inline/Simulate/throw/coop callers、magic tests | per-target RNG/minDamage/def/resistance/autoDefend/defeated skip/object magic 合同逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m 3m-status；fight.c:1632-1661、battle-system turn-end caller、battle-finalization、status/actions/state-machine tests | 全 status counter tick；敌方按 SDLPal 全槽位递减（含死槽）；canAct/canCast 与 <=999 清理边界已核；3m 整卡仍 partial |
| `packages/game/src/core/battle/turn-queue.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-system:680-770 caller、fight.c:1451-1584、battle.h ACTIONQUEUE、queue/state-machine tests | stable dex sort、dualMove dex2/legacy fallback、enemy-first tie 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m 当前只读复审；battle-state/opcode/present/UI/sprite callers、battle.c:27/903-939、global.h:401-404、position tests | 1/2/3 人 SDL 表、4/5 fallback、EnemyPos fallback/idx bounds 逐文件核验；未发现直接缺陷 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m 3m-rng；util.c:169-275、battle/event/progression callers、rng tests | mulberry32 deterministic state/range APIs；`to<=from` 返回起点且不消费状态；SDLPal LCG 差异为已记录设计 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | 已验证 | CODE-QUALITY-3m；base/physical/magic/dex formula contracts | primary-source numeric oracle |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-status；all status tick、死敌槽位反例、canAct/canCast、相邻 battle lifecycle contracts | counter lifecycle oracle；旧“死敌不 tick”弱 oracle 已改为 primary 全槽位语义 |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | 已验证 | CODE-QUALITY-3m；sort/tie/dualMove/dex2 contracts | queue identity oracle |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m 3m-rng；same seed/different seed/half-open/inclusive/float/state/invalid-bound contracts | deterministic RNG oracle；边界反例验证无额外抽样 |
| `packages/game/src/core/palette-fade.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；palette.c:123-666、event-system/present callers、palette/direct boundary tests | fade60/fade63/PaletteFade `/31` integer truncation/approach/freeze/nightColors contracts；已修复 Math.round 差异 |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap/scene-system load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype label negative controls | inherited label 防护与 own-property/null-prototype、zero-item fixup 边界逐文件核对；未发现新缺陷 |
| `packages/game/src/core/palette-fade.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；fade60/fade63/PaletteFade `/31`/approach/finalize/bounds contracts | primary palette oracle；0→1 截断反例 |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n 3n-fade-identity-catalog；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-system history writer/bootstrap restore/menu caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/player-poison-state.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；event-opcode/equipment/battle callers、ownership/poison tests | poison definition ownership/level99/party-slot dedup/cure/runner 合同逐文件核对；未发现新缺陷 |
| `packages/game/src/core/scene-system-search.ts` | product | 已验证 | CODE-QUALITY-3o 3o-mode-history-poison-search；scene-system Confirm caller、play.c:362-510、search tests | 13-cell range、trigger mode 阈值、grid/h/sState/first-hit 合同逐文件核对；反直觉阈值保留 |
| `packages/game/src/core/scene-system.ts` | product | 已验证 | CODE-QUALITY-3q 3q-scene-system；play.c:25-238,362-591、scene.c:512-847、map.c:277-299、res.c:229-301、global.h:75-121,512-531；mode/event/bootstrap callers | 662行逐段重读；移动/碰撞/触发/scene load合同与467定向相邻回归核对；未发现新缺陷，统一门仍待 |
| `packages/game/src/present/dialog-box.ts` | product | 已验证 | CODE-QUALITY-42 当前复审；42-dialog-box；SDLPal text.c:1208-1815/uigame.c:878-930；event-system/menu/present callers | 958 行实现全文核验；先行 narration `~NN` 反例失败后修复为 `!isDialog` 才计尾暂停；分页、title/portrait、Confirm/userSkip、key icon、narration/item-box、资源降级与 framebuffer ownership 对齐；定向83例、game typecheck通过；相邻像素环境诊断保留，coverage/全仓门未在本小批运行 |
| `packages/game/src/present/dialog-box.test.ts` | test | 已验证 | CODE-QUALITY-42 当前复审；42-dialog-box；真实 dialog-box public exports、framebuffer/font/present oracle | 761 行全文核验；控制符/分页/墙钟/尾暂停/Confirm、像素/头像/icon/item-box 合同；定向83例通过；未发现重复或弱断言 |
| `packages/game/src/present/dialog-box.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-42 当前复审；42-dialog-box；公开 parser/title/reset caller 与 text.c oracle | 84 行全文核验；新增 narration `~NN` 反例在修复后通过，title/reset 合同保持；定向83例通过 |
| `packages/game/src/core/event-system.ts` | product | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；script.c:30-307,608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070；play.c:56-238；scene.c:779-930；mode/bootstrap/scene/menu callers | 5,117 行完整读取；global ip、auto/event/runScript、waiting/fade/modal、scene/battle/menu resume、raw opcode、对象解析与移动逐段核验；game package 321 files/3,619 tests、typecheck通过，未发现新 direct defect；coverage/ratchet/protected/full check 未在本小批运行 |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | 已验证 | CODE-QUALITY-3t；script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297；fight.c:602-716,2387-2390,4214-4323,5193-5400；battle.c:1397-1434；event-system/actions/battle-system callers | 1528 行逐段核验 dispatch、BattleCtx ownership、目标/状态/伤害/毒、召唤/分裂/变身/逃跑、动画/偷窃/战斗结果与 consumed/newIp；定向/相邻 470 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷；0x2E `>=` 为 game-mechanics 已记录的原版后期产品决策 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | 已验证 | CODE-QUALITY-3t；2386 行全文、主 oracle、script.c/fight.c caller/合同、470 定向/相邻 tests | 合法目标、边界、失败分支、目标缺失、动画/资源副作用与 consumed/newIp 反控；无弱化断言 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3t；1189 行全文、dispatch family branch contracts、470 定向/相邻 tests | 真实 state/ctx caller 合同、非法/缺资源/满槽/无目标反例；不以 coverage 数量单独验收 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | CODE-QUALITY-3u；battle.h:49-119,158-206；global.h:395-404,441-444；battle.c:900-943,1531-1775；fight.c:117-127,2173-2190,3209-3245；battle-system/finalization/anim callers | 918 行逐段核验 BattleState 字段、phase/UI/queue、玩家/敌人快照、null 空槽、对象身份、脚本/毒/动画/结算 ownership；55 定向/相邻 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | CODE-QUALITY-3u；battle.c:1741-1754,1838-1857；battle-system:324-344；battle-finalization:63；runtime/finalization callers | 98 行逐段核验资源表与 runner stash、live-role identity、override 优先级和 finalize release；未发现跨战斗残留或清理缺口 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | CODE-QUALITY-3u；BattleState 工厂/位置/状态 seed oracle，定向/相邻 55 tests | 383 行逐段读取；未知 role、>3 player、状态 seed、快照、EnemyPos/fallback/y offset 和独立坐标对象反例 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3u；null 空槽、maxHealth/object identity、autoBattle/scriptPrevHp oracle，定向/相邻 55 tests | 81 行逐段读取；0 占位槽不压缩、真实槽浅拷贝、开战 seed 反例 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | 已验证 | CODE-QUALITY-3u；finalization cleanup/resume caller oracle，定向/相邻 55 tests | 80 行逐段读取；状态/波场/模式/资源释放顺序与 0x07 resume 反例 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3618-3754,4910-5148,4591-4654；battle-system action caller；action/anim/formula callers | 614 行实现全文核验玩家/敌方物攻、群攻/DualAttack、auto-defend/cover/protect、equiv poison、混乱友敌与 timeline 委托；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:3760-3853；battle-system attack-mate dispatch；attack-mate/action tests | 111 行实现全文核验随机活友军、目标防御/protect、HP clamp、武器声、动画与无目标 Pass；定向6 files/154 tests通过，未发现 direct defect；coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4110-4117,4924-4929；battle-system dispatch；actions tests | 20 行实现全文核验；只写 defending，减伤由 enemy attack owner 消费，越界 no-op 合同闭合；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；fight.c:4119-4172；battle.c:1455-1528；battle-system dispatch；actions tests | 81 行实现全文核验 flee rate/装备、已批准敌吉运修复、boss RNG、空槽/SHORT 溢出、失败动画与 exp；未发现 direct defect；定向6 files/154 tests通过 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | CODE-QUALITY-3v；111 行实现对应的 7 个 AttackMate oracle，154 定向/相邻 tests | 148 行全文读取；随机 self/dead 跳过、protect/defend/clamp/无活友军/武器声与 HP ownership 反例 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3v 当前复审；3v-battle-actions；64 行命中特效帧基号/缺表反例，定向6 files/154 tests | 全文读取；flat index `sprite*2+1`、×3、undefined fallback 与真实 timeline oracle；未发现重复或弱断言 |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:1822-1857；battle-system:415,530；finalization/settlement callers | 67 行全文核验 outcome、状态/毒/装备/波场/mode/runtime/postBattle cleanup 顺序；196 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:991-1373；battle-system:390-530；progression/settlement callers | 246 行全文核验 exp/cash/HP-MP 回写、屏序/timeout、Phase E once、对话 hold、半血与 finalize；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3w；settlement screen/timeout/Phase E/half-heal oracle，196 定向/相邻 tests | 259 行全文读取；首帧残键、74+1 timeout、屏序、Phase E once/dialog hold/半血恢复反例 |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；13-cell/facing/trigger threshold/first hit contracts | primary search oracle |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q 3q-scene-system；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064行全文重读；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同；相邻warning仍待统一清零 |
| `packages/game/src/core/event-system.test.ts` | test | 已验证 | CODE-QUALITY-3r 当前复审；3r-event-system；真实 tickEventSystem/tickAutoScripts/runScript/runEnterScript callers，script.c/play.c/scene.c/text.c oracle | 5,974 行主测试全文核验；dialog/wait/confirm/end、battle fallback、global ip/call、移动/镜头/fade、scene/item/poison/object 条件与特效生命周期合同完整；当前 package test 321 files/3,619 tests通过，未以覆盖率或旧全仓回执替代本轮证据 |
| `packages/game/src/core/battle/battle-system.ts` | product | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；`mode.ts`、`bootstrap.ts`、battle-finalization/settlement/actions callers；`battle.c`/`fight.c`/`script.c`/`global.h` primary | 3,141 行实现全文核验；startBattle 资源/敌槽/对象脚本/复活与装备播种、tickBattle phase/hold/stall、行动队列/RNG、dialog/animation/flee/escape、毒/status、结算/cleanup/resume owner 与真实 caller 对齐；未发现 direct defect；本片仅修测试隔离 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/mode/menu/actions callers，battle.c/fight.c/uibattle.c/script.c oracle | 4,248 行主生命周期/UI测试全文核验；start/phase/queue/cleanup、菜单/target、动画/dialog、毒/状态/逃跑、敌槽/dualMove、Repeat、投掷/道具/召唤和波场 contracts；测试隔离 spy 已恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 330 行 branch guard/phase/idle/资源缺失/settlement contracts；两个 console.error spy 已用 try/finally 恢复；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3s 当前复审；3s-battle-system；公开 startBattle/tickBattle + event-system battle script caller，battle.c turn-start oracle | 122 行 turn-start dialog-clear 与终态 break contracts；定向9 files/242 tests通过，coverage/全仓门未在本小批运行 |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | CODE-QUALITY-3s；startBattle 安装/cleanup 与 runScript fallback caller | resource/live-role identity、runner override/clear ownership contracts，3 tests 通过 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system/equip/inventory/poison callers、四 direct tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现新缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p 3p-event-opcode-player；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |

| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1；Codex 接收 1 合同与 2 针反控；语义治理待后续专专项读取 | 测试合同已独立验收，未计入逐文件代码治理闭合 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1；Codex 接收 3 合同与 3 针反控；语义治理待后续专项读取 | P1 puppet product-counter 保留，未固化产品行为 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | review | CODE-QUALITY-105；Codex 当前逐文件复核 MenuBox.render 公开 caller、R1/R2/S1/S2/S3 合同与 K1–K5 反控 | 25/25 定向通过；menu 相邻 118/118 但 reward-gain 未 await 诊断；coverage/unified 门仍阻塞，保持 review |

后续每个 Q3b/Q3c/Q4/Q5/Q6 子批都必须先把文件加入这里并写直接证据；只跑 `pnpm check`、只看 lint、只看覆盖率或只看静态计数，都不能把 `待核` 变成已审。全量账本未清零前，专项不得宣布“所有代码治理完成”。
~~~~
<!-- original-source-fenced:end -->
