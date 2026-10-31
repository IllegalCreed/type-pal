# 第三治理窗口：迁移路径、基线、计划与测试质量

2026-10-31 收尾：[官方单次采集与精确基线重计](coverage-recount.json)；[命名边界与五项 F/G 待核](closeout-naming-boundary.json)。全仓 check 20,548 例通过；一次 fast 20,199 例与同报告 ratchet/protected 已通过，[317个当前路径的代码接收](local-closeout.json)与5个命名待核分列；最终文档、静态及两套证据复验均 exit0／stderr0，lint6301文件0error/0warning/0info。代码修复与重组已分提交，远端发布尚待；以下逐片数字是当时进度，不替代本次收尾。

[Workbench parser/picker/pixel responsibilities](organization-editor-frame-workbench.json):last subject,14identities,21neighbors/TC0,real pixel counter. Goal174/174 locally reviewed;fixed178/178;unified gates/publication pending.

[Canonical script self ownership](organization-editor-script-context.json):1subject,15identities,64neighbors/TC0;three self contracts share actual ScriptEditor host. Goal173/174 remaining1,unified gates pending.

[Editor item field and placement tests](organization-editor-item-fields.json):3subjects,7identities,69neighbors/twoTC0;actual caller and cleanup ownership corrected. Goal172/174 remaining2,unified gates pending.

[Runtime menu layout ownership](organization-menu-layout.json):1subject,5preserved identities,typed per-case passthrough spy;33menu+7text/TC0. Goal169/174 remaining5,unified gates pending.

[Terrain test ownership](organization-content-terrain.json):2subjects,9identities and all assertions conserved;41content+16editor/TC0. Goal168/174 remaining6,unified gates pending.

[Content projection ownership](organization-content-projections.json):4subjects,50conserved identities,1independent-oracle repair;122content+21runtime/TC0. Goal166/174 remaining8,unified gates pending.

[Content fixture ownership](organization-content-fixtures.json):1 subject,2cohesive providers,1unused test-only export removed;40import-only consumers/513native identities conserved. Goal162/174 remaining12,unified gates pending.

[Content values test organization](organization-content-values.json):3 subjects,28 identities,2 redundant assertions removed with exact survivor scope;91neighbors/TC0. Goal161/174 remaining13;no newclosed,unified gates pending.

[Event transition and lifetime organization](organization-event-transitions.json):3 subjects,17target+41auxiliary identities conserved,player state transitions merge while object-layer/map lifecycle split.427neighbors/TC0;goal158/174 remaining16,unified gates pending.

[Battle growth and outcome organization](organization-battle-outcomes.json):2 subjects;25 identities split by numeric/screens/postscript/terminal responsibility; full callbacks/helpers and prior source boundaries proved.228neighbors/TC0; goal155/174 remaining19, unified gates pending.

[Game-state sprite/status organization](organization-game-state-leaves.json):3sprite cases separate,1status constructor case joins initialization;56 other main cases exact.60 identities retained, sealed business control reused. Goal153/174 remaining21; unified gates pending.

[Attack effect lookup organization](organization-attack-effects.json):2 identities retained; sprite2/table20 strengthens existing oracle, real fixed-row0 mutation oldgreen/newone businessred, exact restoration.208neighbors/TC0; goal152/174 remaining22, unified gates pending.

[Dialogue producer and opcode state organization](organization-opcode-controls.json):165 identities ->164+1explicit subsumption;159 main callbacks and remaining module exact, three dialogue and signed-negative callbacks conserved. Real additive mutant oldgreen/newone businessred.236 neighbors/TC0; goal151/174 remaining23, unified heavy gates/publication pending.

[Summon defeated-slot organization: four identities and A-H](organization-summon-slots.json). Shared complete Enemy record, dead private option removal, full callback/helper/data/import proof; TS fallback attribution corrected.226 neighbors/TC0, no product change. Goal150/174 remaining24; unified heavy gates/publication pending.

Approved magic API increment: [four-file A-H,7 calls and9 identities](organization-magic-api.json). Remove only two unused args; targets and driver MP ownership unchanged, whole-file typed-AST proof,163neighbors/TC0 and2 refreshed live-source warning counters. Auxiliary approval debt resolved, no new historical completion: goal149/174 remaining25; unified heavy gates/publication pending.

Battle constructor/scripts increment: [17 constructor identities and A-H](organization-battle-state.json), [3 script identities and A-H](organization-battle-scripts.json). Constructor-only specs merge by initialization/player/enemy responsibility; real script lifecycle stays separate. All callbacks/helpers/inputs preserved, unused private returns/alias removed; exact8-declaration prior-source bridge, no whole-source equality claim. One shared234 neighbors/TC0. Goal149/174 remaining25;0newclosed, unified heavy gates/publication pending.

DEV hotkeys increment: [one historical subject, A-H and3 identities](organization-dev-hotkeys.json). One coherent routing spec, fresh per-case state/listener cleanup, independent close-event prevention counter;44neighbors/TC0, product unchanged. Goal147/174 remaining27; unified heavy gates and publication still pending.

仙术选择增量：[一个历史主体、六当前文件八维与37身份](organization-magic-menu-state.json)。按选人14／请求7／导航11／生命周期5分责，三目录合同保持分开；28完整记录和四整状态对照，选中ID独立oracle抓到空列表真实变异旧绿新唯一业务红。147相邻／TC0，产品仅注释；本目标146/174余28，0新closed，重型门及发布待大批收尾。

只读战况增量：[一个历史主体、五份当前八维与15身份](organization-inspect-readouts.json)。按队伍6／敌人6／场地2／ownership1归位；2角色、7敌人完整记录与5战斗／6整GS对照守恒，两种runtime初始化不硬合。maxHealth80优先于prevHp50的独立oracle抓到真实源码变异旧绿／新单业务红；输入快照使用实际传入角色实例。8实际文件42例、TC0；6条生产console.log已逐源核读、未静音，静态／框架诊断0。产品不改；本目标145/174余29，统一重型门与发布仍留大批收尾。

工具表面增量：[两个历史主体、六当前文件八维与41身份](organization-tools-surfaces.json)。小地图按模型14／Canvas2／控制器6归位，显示委托3与主面板装配16保持各自合同；纯绘制不再安装控制器宿主。12次 cmds 包装内联，合成标记编号105/295合法化；两个真实系统页helper consumer共用，五consumer的短页宿主显式回收断开节点的语言订阅。11实际文件81例、TC0，产品均不改；本目标144/174余30，零新closed，统一重型门与发布集中收尾。

当前显示工具增量：[逐文件八维、22 身份及完整原件](organization-tools-display.json)。混装 leaf 四条缩放与两条 FPS 合同归回各自模块；两份无业务含义的 canvas 包装内联，居中补 top 字面值，非法偏好两条语句迁到既有偏好读写用例。全屏测试在 finally 精确恢复原 document 属性描述符；两个 spec 各自持有存储／采样／DOM／layout，不再共享破坏性清理。6 实际文件 34 例、game TC 零诊断，产品两个实现与现有八维记录精确同版；本目标142/174，余32，统一重型门及发布待大批收尾。

Owner: Codex
Template: evidence-receipt-v1 / 1.0.0

## 任务与候选

[父窗口](../../tasks/QUALITY-PENDING-100-3.md)，[已批控制路径修复](../../tasks/QUALITY-MIGRATION-CONTROL-OWNERSHIP-1.md)、[已批基线路径修复](../../tasks/QUALITY-MIGRATION-BASELINE-PATH-DOMAIN-1.md)、[已批旧审计接口退役](../../tasks/QUALITY-MIGRATION-UNMANAGED-AUDIT-RETIREMENT-1.md)。同一codex/code-quality-94-102，基点e94098f949452bc3bf8d028f21bdc0a4e400ea22，当前未提交候选。未建新分支，未改主工作树。

## 进度与边界

原29个pending主体均已读，曾撤回的9项F/G已补审完成；当前重组后25个主体路径，固定原29主体均获代码信用，merge两项待裁决现已明确批准并按范围修复；详见[逐文件记录](review.json)：首片3、第二片5、第三片3、第四片5、第五片2、第六片2、第七片2、第八片计划/写入守卫专测2，第九片merge实现与主测2完成，第十片boundary/GLM两专测2完成，第十一片Kimi专测1完成。6个新增辅助（控制路径专测、SHA叶、基线路径专测、事务承接专测、共享journal输入、编译合同）另列，不凑100。第四片发现project-io实现/主测原已关闭，未重复计主体；两者因本次实质整改暂review，当前单独八维接受、统一门待。transaction局部修复不授整文件关闭信用；审查/整改、统一门及发布分开。

## 命名与组织补审

用户指出AI标签命名与历史closed漏项。[专项](../../tasks/QUALITY-NAMING-ORGANIZATION-1.md)及[naming-review.json](naming-review.json)登记静态候选：795旧closed中178路径（164测试/14夹具）仅F/G待核转review，旧A–E/H有效证据保留；不认定178个产品缺陷，不把初筛充全文八维。当前612closed／211review／2638pending；固定原29主体完成、当前25主体路径；历史cohort中11项F/G完成/167待续，另6辅助；原重开2为原始主体记录，其中主测已融入当前新文件，不重复计。

当前三专测按JSON值、数组身份/顺序、内容记录规则重组为三文件；[organization.json](organization.json)双射44旧→新身份、回调/必要suite上下文/七helper语法指纹和四文件保全。边界旧11例的两个历史诊断入口按精确身份迁移，不将新44例冒充原11例、不改官方排除；旧mutants源码点可能过期，本片不授当前反控/覆盖率信用。新16文件213绿/TC0，旧结果仍在旧版本。只读verify增加映射核验，无法自动证明设计优良。

本片不计新增主体/新closed；文件内证据保留但不授9项未完成组织取舍的整文件完成。迁移计划主测已读未验收，后续继续；重型门/官方coverage/protected/提交发布仍等稳定窗口。

## 实际问题与整改

旧路径专测把四个节点状态塞在一个身份，且合法检查不观察是否偷写目录。旧八身份保留、综合身份拆为三身份，四个原返回/拒绝断言全部迁移，增加全树不变oracle。mkdir变异旧9绿、新11中唯一指定业务AssertionError，精确恢复source/test；不改生产路径守卫。

真实transaction原生复现：控制目录链接先写外树才拒绝；journal临时文件链接覆写外部字节而返回成功。用户批准“写入前拒绝链接”后先4条正式业务红，再补journal/temp预检、所有staging路径在首写前预检及恢复journal路径拒绝；新4绿，恢复入口的外部journal/目录保全也已覆盖。不改迁移内容、journal版本或存档，不扩大为OS级沙箱。

baseline移除两个无逻辑包装、把SHA原函数提为叶；原public签名/named export保留，两个IO消费者只改导入。冻结纯重构源码与函数体/导入图证明独立保存。旧三专测18例逐例整改格式自比、死参数与断言重复；同一通用JSON变异旧组合1绿、新map/stamp各单业务红，精确恢复。

坏清单跨根读取另行获批后修复：加载、投影和TOCTOU同一规范相对路径合同，当前10个正式业务红→10绿，source精确恢复。绝对负例已改用自有outside文件；早先固定/absolute只触发缺文件，没有读取其正文，原件保留。部分词法输入原已native拒绝，不能把10例称为10项新漏洞。537项真实当前基线只读加载/复核、state字节不变；未改生成物、格式或原盘只读链接，不声称OS级沙箱。

第三片纯计划：澄清复制索引命名、删无操作target别名、修正canonical hash和借用正文注释，允许变换后语法一致。两专测20→22逐合同映射，精简自比/重复与非法theirs夹具；独立固定map摘要、完整冲突归属及summary代替弱存在/正则断言。绕过专用格式化和错配theirs hash两变异均为旧选中1绿、新唯一业务AssertionError，恢复精确。初次counter消费错误地过滤pending而未过滤Vitest4的skipped状态，原绿运行后工具断言失败；r2修消费并保留原producer/失败记录，未弱化判据。最终两选中case及共享prelude与counter候选逐字节相同，另两fixture合法化由最后99例验证。

第四片IO/测试质量：旧raw夹具恰好canonical，错用重序列化hash仍绿；新有效CRLF与独立Node crypto预期为指定单红。旧map contains容忍多收文件，新完整Set/seed不变为第二项旧绿新单红；源/专测精确恢复。保留函数在后继接口退役前后正文相同，两个选中case及shared setup也未改，不重跑相同反控。去核心as-never、旧summary死字段与重复预期，拆索引错误/TOCTOU/资源排序及baseline字节轴；plannedChanges fixture全文和两consumer共13处调用核完，限定无竞态测试桥，未改正文。

生产调用核对推翻旧D/G用途前提：两hash审计出口只被测试消费。用户批准后删除出口/private walker及6个专属旧身份，混合例的有效非托管与只读断言迁现用入口，四保留函数签名/正文精确相同。主测旧7→当前7是退休2加TOCTOU拆轴2的净数，不能据数相同继承验收；全部21旧IO身份/六项退休/20当前IO身份与写入边界2→4逐项映射。实现/主测两旧关闭暂撤review，不计原pending主体或新增关闭。

第五片两写入计划专测：旧glm-o混杂计划/commit/journal，事务IO移到独立辅助。用真实loader替换强转快照，修正raw对象/解析数组矛盾，地图/普通JSON预期用独立字节字面量与Node crypto。旧symlink precondition用例缺write hash，广泛toThrow实际提前假绿；正式精确matcher在未改生产源码时为指定业务红，定性为测试缺陷。合法journal补齐元数据后验证真正守卫及全树保全，原根/scope/越界/precondition组合拆轴。

18旧身份映射22当前身份，加合法seed控制和反向hash-only索引2，共24；没有退休业务合同。三组同变异对照分别旧1/1/4绿，新各唯一指定业务AssertionError（其余未选中或4绿），来源为格式自比、提前误拒绝、漏对称一致性轴。所有生产/候选字节恢复；最终只对两个非反控case补强真实目录清理与回调当时磁盘视图，快检精确桥接，不重复反控。三份生产源码本片前后同字节，未变更资产管线或产品合同。

## 验证与完整原件

基线/控制路径相邻21文件170，以及第三片最后12文件99测试及migrate typecheck通过，default+json reporter完整stdout/stderr，stderr0；集合重叠不相加。首片89与过程160/169均按当时候选保留。控制路径red/首green同字节，后继Biome格式桥单列；基线路径10red/green同字节，独立于纯重构检查点。第三片只做行为保持的plan结构变化，旧相邻证据按准确版本桥保留，不重跑未变的全部170。

第四片最后11文件73测试、migrate typecheck通过，完整default+json输出无诊断。21→24、77属于接口退役前检查点，原件保留，不与73相加；旧反控重放须使用冻结source/spec，不能直接把含旧导入的专测放在删出口的新源上。默认verify只核指纹、原始结果、存活case/函数与合同映射，不执行变异、重新迁移或测试。

第五片最后12文件104测试、migrate typecheck通过，显式default+json完整输出、stderr0；包含当前三专测24身份，不与早期24/104候选相加。新增辅助只承接现有事务合同，不给予其它相邻专测/transaction整源关闭信用。初筛三个文件无函数>10，重复短root清理保留局部所有权；默认verify不认证设计语义。

第六片事务主测/边界专测：10旧身份组合拆轴、raw篡改按职责移到边界文件，形成20当前身份；旧重复id轴合一，其余必要断言保留/加强，没有新增业务轴或退休合同。主测实际验证project/baseline中断、二次false与全树幂等，保留manifest失败/修复的同一生命周期；边界由真实commit生成合法三操作journal，仅在unknown磁盘JSON单轴篡改，去全部核心cast与自制普通文件walker。低层字节载荷不是内容schema正控，不给予真实重导/断电信用。

错误来源与目录所有权两反控：移除id守卫后旧宽抛错仍绿、新精确错误指定单红；拒绝时创建空目录旧普通文件快照仍绿、新全树指定单红。source/spec精确恢复；最终precondition负例只改target且owned victim匹配原hash，r2针对最终字节重放，最后12文件114绿/TC0，显式default+json、stderr0。此前20/114候选原样保留，不相加，生产事务源码本片前后同字节。

第七片GLM/Kimi专测：两文件旧35→当前34，组合拆轴/重复迁至已接受相邻，合法raw输入共享、完整tree替代弱存在/宽抛错，独立Node crypto取代上层SHA包装。旧强转baseline null/注入project undefined不能保留typed caller信用，分别以compiler-only合同明确不可接受；baseline own undefined在当前compiler配置下却合法，直接typed调用保留runtime own-key守卫。类型与runtime的事实分开，不用journal验证冒称等价覆盖commit。

两个反控分别旧1绿/新唯一指定AssertionError：错误地在归一化前排重，以及最终校验后篡改已发布字节。source/spec精确恢复，两个辅助与counter候选同字节；共享seed合法正控和无stage的已应用目标恢复加强判别力。最后12文件113绿，其中两专测34；TC0另含7条仅编译合同（不计runtime数）；完整default+json、stderr0。scoped格式首跑exit0但1warning/3info没有过门，手工修复后清零，原件保留。生产源码和规则本片未变。

第八片计划/写入守卫：修正“缺席delete必致unlink失败”错注，实际事务幂等跳过；baseline退役改用真实loader的合法原子hash-only快照，两种磁盘状态分别核完整Changes/输入/整树不变。写入守卫去非法typed缺键cast及重复规划例，映射既有编译/GLM/next-wave强合同，原15身份到当前14及相邻去向；无新辅助凑数。

保留原生透传FS暂存点注入，journal必须保留、原始hash及恢复错误明确断言，不再条件漏验；输出改为独立字节literal/标准crypto。pending错误清理、普通JSON缺换行两反控各旧选中1绿、新唯一业务AssertionError，生产三源及spec精确恢复。最后12文件112绿/TC0，default+json完整输出无诊断。首候选13绿1红是作者误读injected++计数含义，改一次性boolean后14绿；失败保留但不作产品red信用。

第九片merge获批前检查点：两个原pending全文审查，主测接受、源阻断。已验证并移除Kimi早已登记的private primitive恒false分支/形参，七调用与两scene-index strict选择精确证明；没有产品政策/接口/格式变化。主测完整结果与三侧快照、合法JSON输入和独立身份替代核心cast/部分匹配/重复自比；22旧身份到31当前完整映射，独立拆轴不当新增业务覆盖。相邻弱深克隆/旧页洞不授accept，也不擅删。

base快照错配为ours后，旧选中1绿、新唯一业务AssertionError；source/spec精确恢复。首collector把预期exit1当异常退出，finally恢复；保留原件后r2以原生状态核验完成，同一反控不改变runner/断言。后继仅删sceneFlow未用参数，counter候选冻结并由精确syntax桥限定两处改动。最后14文件168绿/TC0，局部Biome0/0/0，default+json完整stdout/stderr、stderr0。

只读真实merge/plan证明constructor异常和__proto__字段遗漏；合法catalog证明base已authored时快捷路径改回迁移记录。分别登记[JSON字段卡](../../tasks/QUALITY-MIGRATION-MERGE-OWN-JSON-1.md)、[资源接管卡](../../tasks/QUALITY-MIGRATION-ASSET-TAKEOVER-1.md)，用户尚未答复，未写正式产品红例或实施行为修复。generic输入不能授普通工程可达性，未证明真实文件受损/全局污染；源不计完成。实际全部核读与A–H、复杂度初筛和身份指纹见review.json及merge命名空间原件。

第九片获批续行：用户批准“按真实JSON字段修复／保留作者接管项”后，6条正式业务AssertionError红例、旧31绿；JSON字段单独修后36绿，仅资源1红，再修canonical资产路径后同字节37绿。字段用own-key Set/hasOwn与data-property写入，保留普通对象原型；资源修复沿用既有单项接管，正常migrated更新同场景正控。三源码检查点（private、JSON、asset）独立冻结，修复前probe/反控原件字节不动；不把行为修复冒称纯重构。

新增6例与原31helper/业务代码语法分开验证，完整字面量/三侧冲突/own descriptor/真实plan target-writes-summary/合法catalog为oracle，未扩大到磁盘发布。最后16文件215绿、TC0，显式default+json完整raw、stderr0；215含37不能相加。快检先核旧pure/counter冻结身份，再逐项核两个获批差异及当前版本，证据规则未降低。当前26主体完成、0阻断，6辅助/2旧关闭重审另列；两风险卡review等统一门。

保留范围：无id页洞为旧unsupported-current底层characterization，合法current页/stage要求ID，merge不是包根公开API，CLI仍先current publication闭包后commit。未宣称旧页洞已修，也未接受三邻测；邻测假深克隆、脆弱行号、旧模式去向留后续八维，不自动移除。两项新修复仍无普通工程实际受损、真实资源写入或OS沙箱信用。

第十片两合并专测：复用当前生产源5522与上一215运行的原8+28身份为基线，不重跑同字节基线。边界组合拆轴、主测完整合同承接重复；GLM 28→24，实体输入不变并入同输入合并例，动作原子/中删/纯构造器旧重复逐项去向。36旧身份到35当前和主测强合同，零业务合同退休；真实path路由/首次接管/整体文件缺席与集合缺键的不同输入域保留，不以泛型算法相同随意删测试。

14处核心as/GLM6处!及边界5处!清除，模板/精灵伪@string根改生产数组，正控先过实际content validator；原最小JSON没有完整工程信用，非法身份是明确负输入。边界完整presence/fallback/三侧诊断，GLM完整动作/作者资源/错误/稳定ID结果取代弱map/contains/length；root absent负例的empty base明确是内部逻辑基线，非物理文件存在性断言。旧行号/v5/不存在报告/“一侧不变”错注清理，旧页洞不附带实现或关闭。

两有效反控各旧选中1绿、新唯一业务AssertionError：取消clone后真实嵌套三侧与输出相互污染可观察，原scalar条件空跑仍绿；取消escape后新实际冲突路径错误，原不冲突例仍绿。source/spec finally精确恢复，当前GLM与counter候选完全同字节。最后16文件214绿，包含两目标35，TC0/完整default+json/stderr0；TC之后只加边界注释。生产源/已接受主测/Kimi三文件同字节。所有成功/失败原件和逐身份映射见merge-specs命名空间及review.json；旧37/215和当前214不相加、不改写。

第十一片Kimi：全文193旧行、10旧身份核毕，沿冻结source/caller/current PageId约束复用证据。旧LCOV/行号/已删primitive与不可达分支长注释退出；两锚定顺序完整value和三侧冲突、双删过滤、缺键身份/原子路径均保留，根ID并集重复映射boundary更强合同。10旧到9当前和强合同/观察去向，普通集合不用伪items根对象，expected不再以同一pages factory充oracle。

旧无ID页洞观察退出live坏输出oracle：原toEqual不能区分空位与undefined，单独只读observe确认length4/own indices0、1、3/slot2缺席，完整旧spec和原生结果保留；不声称旧洞修复。新增对应运行回归用当前PageId/label、三侧真实公开guard和实体层级/稳定initialPage，toStrictEqual核作者修改、三侧冲突和连续数组；它是不同合法输入域，不虚构为旧域等价修复。其余两无ID例仍仅低层观察，未知旧模式退休留后继，不新建兼容政策。

去保留作者独有项变异时，旧位置观察选中1绿、新合法PageId回归指定唯一业务AssertionError，finally源码/专测精确恢复；当前spec与counter候选同字节。最后16文件213绿包含目标9，TC0/default+json完整raw、stderr0。生产源/已接受main/boundary/GLM四文件同字节，旧214和产品37红绿仍按准确版本复用，不与213相加。逐文件A–H、10身份去向、复杂度线索与preservation见review.json及merge-kimi原件；合并五文件代码接受不授真实发布或统一门信用。

轻量docs、content-review strict、lint、账本及只读verify按最新execution回执核；首片6201文件lint0只属于当时。重组前3470 inventory／795 closed／37 review／2638 pending；29主体、6辅助、2旧关闭重审均代码接受等集中门，新增closed0。两项merge裁决获批后的正式红绿另列，不改写获批前原件。

第六片收尾fetch首跑TLS失败exit128，默认verify如实拒绝；fetch-r2成功exit0、stdout/stderr0，仍与最新main为0/0。失败/恢复原件分别保留，不改写为首跑成功。

[附件索引](native-index.json)对应完整[native.json.gz](native.json.gz)：probe、before源码/测试、原生file×fullName、实际execution、全部成功/失败stdout/stderr与恢复结果。默认只读：`node docs/ops/evidence/QUALITY-PENDING-100-3/verify.mjs`，只核当前版本/原件/指定结果，不跑测试/覆盖率、不自动证明八维设计。重跑实际定向用migrate的unit runner，具体命令在execution原件中。

## 未跑与风险

全仓check、官方coverage ratchet、protected fast均未启动，留多张相关卡/稳定窗口冻结收尾，未提交推送合并。没有真实迁移/重导、生成物、E2E、视觉或真机信用。批准退役仅涉及无生产用途接口，不改现用读取/TOCTOU策略；保护基准的六身份协调留冻结窗口。transaction局部修复不等于整文件质量合格，其邻测非法planned-hash的typed/unknown域仍须后继审查。

[基点main CI](base-main-ci.json)的两个完整ZIP CRC及可见warning/act/stderr/unhandled均0，只证明e940基点，不替本窗口WIP授统一门信用。

## 下一步

保持本窗口累计，不跑重型门或开新PR；后续可从仍pending的migration-plan.test.ts等不重叠范围选择，先核Owner与机器状态，复用当前全文/强合同/真实caller证据；不能凭168相邻绿接受。两项已批修复保持冻结证据，合并五文件声明范围逐文件接受、旧无ID洞未修；不因213相邻绿附带关闭其它pending。

命名片完整文档门另有真实阻塞：`naming/docs-first.*`保留125工具测试通过、docs/model通过后，testing-docs因e2e-001的reviewBy过期退出1；未刷新日期或授E2E信用。最终docs CLI/content-review strict/lint/ledger分别记录，不称完整check:docs通过。178初筛含新增Cursor6项，原172原件仍保留；该初筛时点29已读/20完整完成/9项F/G待补；现已补齐，当前主体25路径。

## 当前组织收口（迁移9项 + shared历史4项）

迁移17旧专测按合同归12当前文件，105注册/131身份和必要helper/import/cleanup闭包保持；发现组等价writer归一，普通文件snap不再携带无人使用的hashOnly模式，地图组保留真实用途。产品和未纳入验收主测等12依赖同字节；238相邻与typecheck按最终候选复核。[当前注册/身份映射](organization-current.json)、review.currentOrganizationProfiles给逐文件具体八维。旧counter/source继续属冻结旧文件；原29是固定受审输入cohort，当前主体现25路径，搬移不算新增完整审查。

历史178中shared四项F/G接受、174待续：[处置索引](naming-resolutions.json)、[shared身份/夹具/import桥](organization-shared.json)。MKF构造与YJ2五向量分文件；五专测归frames/containers/encode.bytes，39RLE身份和37consumer身份保持，六fixture导出逐语法同值，106相邻/shared TC0。无codec/格式/资源变更，不把历史retirement快照改成新路径豁免。两个无标签相邻closed承接至新review路径，机器3464/615/211/2638，0新closed。

完整文档门的E2E期限阻塞保留，不能只刷新日期消诊断；本片docs CLI/model/strict/lint单独记录。全仓check/official/protected未运行，未提交推送合并。默认verify只读重算当前及冻结身份/闭包/原生raw，不执行测试、变异或coverage。新工具分析只支持本片实际语法；不支持的语法失败，不授自动语义accept。

shared追加测试返工：encoder view轴原same-SUT双输入比较撤换为独立手列字节，两侧都核相同literal预期；字面像素置0变异旧指定1绿/新指定1业务红，完整恢复，最后106相邻。旧39身份/31未改注册与一个明确oracle替换分开证明，反控原件在organization-shared-oracle，不借纯组织不变之名掩盖断言变化。

## 持续命名目标：事件codec与annotation/slice

用户2026-10-30设定完成剩余174的goal，本轮7主体完成F/G，余167；固定178总cohort累计11完成。[codec四主体](organization-extract-codec.json)：6旧文件归labels/fidelity/commands/report4文件，19注册/21身份不增删，独立view命令oracle补强及旧绿新唯一业务红；62相邻/TC0。重编译缺label政策仍未裁决，不新增默认0绿测。synthetic report与raw原盘roundtrip因输入/环境不同保留独立文件。

[annotation/slice三主体](organization-extract-commands.json)：命令注释/unknown symbols校验/scene-global入口分3文件，27注册/30身份保持。不同WORDseed保各自beforeEach作用域；symbols5例不再初始化未使用词表；Scene薄fixture同合同合一，不抽模式bool。114相邻/TC0涵盖两片、主测与实际原盘roundtrip，只授其指定范围；两个邻包数字不相加为新覆盖。

旧A–E/H记录按源hash复用，F/G当前逐文件判断与有限helper/oracle桥另列。三项相邻旧closed承接至review等统一门，当前3461／612／211／2638，0新closed。只读模块复验核所有旧/新注册与完整native身份、必要binding/hooks/原始回执、product/caller指纹；unknown syntax失败，工具不授设计语义。重型门和coverage仍集中，E2E文档期限阻塞未变。

### 表解析夹具职责补审

[六provider的A–H与旧出口/consumer映射](organization-extract-fixtures.json)记录两个历史主体的F/G整改，58原运行身份与134相邻/TC0。默认只读[夹具复验](verify-fixture-organization.mjs)检查声明守恒、精确依赖绑定、17个consumer正文、完整原件和未改产品source；不把语法保全充作设计优良的证明，也不新增consumer全文信用。固定cohort累计13/178，本goal9/174，余165；新provider保持review等集中门。

### 三表parser专测组织与oracle

[逐文件A–H、15身份与三反控](organization-extract-tables.json)：六旧文件按三种公开parser职责合并，三个view例各对独立完整对象，反控各旧绿新指定业务红，88相邻/TC0。夹具import-only中间版本由原件桥接，不改写历史结果；固定178累计16，本goal12/174，余162。当前承接文件review，统一重型门仍待。

### items／图片及格式／manifest职责补审

[items/BALL/RGM](organization-extract-images.json)保留13身份和独立PNG/错误来源，98相邻/TC0；[palette/BDF/manifest](organization-extract-formats.json)保留29身份，区分输入/完整输出和纯函数/FS生命周期，两指定旧绿新业务红保留原件。palette原位承接同时绑定旧/新字节；格式桥仅核特定literal或对象断言的token守恒。固定178累计22，本goal18/174，余156；当前路径保持review等统一门。

### scene／sprite与固定配对向量

[scene/sprite逐文件判断与18身份](organization-extract-scene-sprite.json)分纯解析/PNG与外部产物环境；[YJ2 sprite配对向量](organization-extract-vector.json)保留明文/压缩流的所有字节，FIRE只改import。最终26相邻/TC0原件共同复用；实际fast/full文件计划与config五Node测试证明分流保持，未运行覆盖率。固定178累计25，本goal21/174，余153；当前仍review等统一门。

归档修复原件在organization-extract-scene-sprite命名空间：本窗口误删的九条fenced旧行恢复到本轮基点HEAD，默认verify核归档块整字节；不授更早declared-origin新信用。中间consumer版本只从后继精确SHA冻结件接回当前校验，不用路径名或作者passed替代。

### CLI输入与literal编码fixture

[三主体的A–H／真实出口与重用映射](organization-extract-literals.json)保留base及15种hook所有输入size/SHA，六consumer30身份与断言、42相邻/TC0。仅当前fixture已接受F/G，未附带接受五CLI专测；binary辅助未改不计新主体。全局plain-end/真实敌表引用与基础域不同，不用模式参数强合。固定178累计28，本goal24/174，余150；重型门仍未跑。

### CLI职责专测及extract历史主体范围

[五spec的具体A–H与33身份/清理闭包](organization-extract-cli.json)：按preflight/pipeline/资源/font/global保留职责，14hook分真实caller族；九重复输入函数/两死常量清理，两builder完整字节同一性另有实际执行回执。复用原42运行中33指定身份，当前52相邻/TC0；未知argv说明更正，不改产品。初始解析失败与恢复留原件，interface/解构/afterAll不再遗漏。固定178累计33，本goal29/174，余145；extract29主体与shared4已补F/G，仍未通过统一重门，不新增closed。

### 用户追加：001发布复核到期

[001实质发布/源码复核与原件](e2e001-publication-review.json)保留原到期失败；七当前源码锚点/55行原始对白对应有效，64opening工具/9catalog绿，明确下次出版复核11-29。旧实跑日期/版本/runtimeExecution不升格，006未改；这解除的是001文档期限，非当前完整E2E/编辑器预览验收，不计代码cohort进度。

### 战斗record／装配／脚本随机职责片

[一个H主体与辅助provider的限定增量](organization-game-battle-fixtures.json)分离record、partial fixture、strict scripted RNG；两旧record实际同body/参数，field按已核零参域复用；不同随机默认/trace策略保持。38direct consumer不计主体，48相邻前后825同身份/TC0。一个主体补F/G，本goal30/174、144余，当前3456/597/221/2638；辅助legacy仍pending、H专测仍待组织。生成首错与两次只读分析拒绝原件保留，内存两反控验证业务值与const/let守恒，非产品反控。

001发布期限当前已解除：实际完整check:docs125工具测试及所有分门0issues、lint0/0/0，见配对receipt；旧expiry失败保持历史。没有新浏览器/视觉/E2E/checkpoint验收；主goal和统一重门继续，不将文档续期算代码主体进度。

### game夹具专测与资源宿主职责

[七例默认/strict专测归属](organization-game-fixture-specs.json)及[资源scenario/fetch/atlas](organization-game-asset-fixtures.json)为两个历史主体：旧回调/断言、18真实consumer147身份与7fixture身份保全，共20files154相邻/TC0。已有PNG encoder完整IO合同复用，两个测试设施Error文案差异明确登记，target不改；旧reexport直接回owner。旧审查source漂移与post-rename出口表首拒绝原件保留，用确切后继桥补证，不重写旧raw。当前goal32/174、142余；固定178累计36，3459/597/224/2638，仍review等大批统一门。

### loadAll职责与palette独立caller

[三历史专测31合同与四当前文件](organization-game-load-tests.json)按assembly/boundaries/optional-assets和fetch-palette归属。palette两例移除无关PNG/整个scenario宿主，只在fetch IO返回真实Response；原全部expect和cleanup保持，有限生命周期桥明确。31身份/38相邻/TC0，原154baseline复用不混计。unused import的exit0诊断原件保留，r2手工清除后才计clean。当前goal35/174、139余；固定178累计39，3460/597/225/2638，统一重门未跑。

### cache／blob／dialog真实职责组织

[缓存policy/归属/回调](organization-game-cache-tests.json)、[frame/gzip/fetch](organization-game-blob-tests.json)、[dialog资源生命周期与纯adapter](organization-game-dialog-tests.json)覆盖七历史主体及三个必要相邻主测。19/29/20原身份与所有业务断言保全，原48+20两基线，当前九spec68共同相邻/一次game TC0；helper声明、默认值/错误策略、输入字节和两条旧import-only源桥逐项可复验。quote/ordinal/rename顺序首拒绝原件留存，未放松规则。纯case无关cleanup退出，真实IO保清理，PAL原反控按精确新版本复用。当前goal42/174、余132；三个相邻旧closed暂review，3460/594/228/2638，统一重门待。

### PNG与呈现夹具职责组织

[PNG三主体](organization-game-png-tests.json)保六完整合同／独立字节输入与73相邻；[呈现六provider](organization-game-render-fixtures.json)按8真实职责重组、38consumer仅import变化／253身份保全，snapshot不再导入状态reset。相同构造按真实输入域证据共享，不同角色默认／坐标guard／mask合同保留。逐文件A–H与所有原件可只读复验；当前goal51/174、余123，0新增closed，统一重门待。

组织复验器的hook签名已加强为所有适用钩子，修复纯全局清理无词法共享时漏签名的问题。先前实际旧等价结果、固定旧kernel的正式失败回放与新通过、263注册全量复核和五条既有pure Words初始化精确移除桥都保留于render-fixture namespace。未改产品或case，也未重复253运行；P11–P16六spec仅全文读取、不计F/G完成，后续仍需组织整改。

### 六组合层专测职责组织

[逐文件A–H、19身份及完整生命周期](organization-game-composition-tests.json)对应六历史主体；复用253中19基线，当前12files175/TC0。原P12 effects与menu/event overlay分离，helper/色值命名改进；独立证明19callbacks/8helpers只有标识符alpha变化。漏挂hook原候选虽测试绿仍被强守卫拒，原件保留，恢复原hook后再接收；无产品/断言/coverage变化。当前goal57/174余117，中央状态仍review等统一门，0新closed。

### 帧特效专测职责聚合

[逐文件八维、34身份与原hook保全](organization-game-frame-effects.json)：四历史主体和三个实际全文相邻main按dither/shake/wave归三spec，原34callbacks/所有断言与12hook及3inline reset保留；纯shake row builder同合同共享、三种wave图案分清。修正多重集守恒不能证明顺序的旧注释。基线90中34身份复用，当前6files49/game TC0；goal61/174余113，0新closed，主测随重组review，统一重门待。

### 字体与像素专测组织

[七spec八维与46身份映射](organization-game-font-pixels.json)对应四历史主体；字体IO/静态布局/纯绘制分离，Framebuffer/Sprite补测并回真实main。46callbacks/所有断言保留，3个已证16px/空表准备调用共享既有glyphsOf，6纯case去无关fetch清理而4IOcase保原hook。基线46、当前9files66/game TC0；goal65/174余109，机器3457/587/232/2638，0新closed，统一重门待。

### 战斗反馈与结算专测组织

[六spec八维／29身份与80expect点位](organization-game-battle-feedback.json)：三历史主体按effect、数字寿命/布局、结算公式/四屏/边界归三main。原断言/Word表finally保持，4无关clock包装退出；小输入工厂只在已证明实际域共享，其它位图oracle保持独立。前后真实node-canvas PNG同字节原件保留，当前6files58/game TC0；goal68/174余106，机器3454/584/232/2638，0新closed，统一重门待。

### 战斗精灵职责与ownership专测

[三spec/两provider八维与58身份](organization-game-battle-sprites.json)承接两历史主体与一相邻main；pure pose、blit、renderer及state/pixel准备分责，五重复状态工厂整声明保全。所有58case保留，一条ownership oracle由真实末像素变异证实补强。首AST walker不足被尾literal守卫拒，r3完整证明接受；solid类型误判已纠正并直接复用canonical。最终6files87/TC0，goal70/174余104，机器3456/583/235/2638，0新closed，统一重门待。

### 战斗 UI 职责与输入所有权

[五spec/单UI输入provider的逐文件八维与46身份](organization-game-battle-ui.json)承接两历史主体与两相邻main。头像纯规则/显隐/选择/菜单/队员信息分责；46callback与业务断言保全，roster完整帧ownership由真实尾变异证实补强。四完整record声明同值后借用，UI状态/三种像素输入域不强并；四无关clock hook退出，原必要时钟与事件finally保全。最终8files108/TC0/局部零诊断，goal72/174余102、0新closed；统一重门仍待。

### Shell 输入／无音频端口三主体

[键盘/键位/录放及重复退役](organization-shell-keyboard-recording.json)、[MIDI无端口与真实no-IO反控](organization-shell-midi-fallback.json)、[菜单整链与loop夹具](organization-shell-loop-menu.json)保存逐文件八维与49→48映射。另有[用户批准的键位查表窄修](input-keymap-own-key.json)正式2红2绿，34支持键保留。14files110/当前TC0，夹具路径的原运行与当前import-only桥明确分开。goal75/174余99，0新closed；重型门仍待，历史命令/原件不倒写。

### Modal媒体命名／职责与判别力

[两历史主体、九当前spec逐文件A–H与44身份映射](organization-shell-modal-media.json)：播放/音量/autoplay/迟到归属、结局动画/palette/按键与两网络/启动合同归位。38callback守恒加6明确补强，两负时序旧绿新指定业务红、三warning精确数组；14files76/TC0，0新closed。工具[简写依赖解析](organization-program.mjs)补[3个失败合同](organization-program.test.mjs)先红后绿，28既有模块重验。固定178完成81，goal77/174余97，重型门继续集中收尾。

### FBP显示与滚屏专测

[一历史主体／13原case的八维与时点反控](organization-shell-fbp.json)：show8、scroll5；timer-only两例补真正800/20ms framebuffer边界，旧绿新各指定业务红。复用此前palette导入桥，保持旧cohort与当前输入不同版本；23相邻/TC0，0新closed。goal78/174余96，RNG只读候选未计完成。

### RNG合同与测试宿主归属

[一历史主体与四输入的逐文件八维／退休／真实反控](organization-shell-rng.json)：25旧例承接24，1重复在4断言强例保全；原生Canvas、7精确诊断、deferred finally、gate与完整数据交付。2旧绿新业务红，完整大红例不裁剪，等价紧凑oracle降低复验成本。47相邻/TC0，goal79/174余95，0新closed，重型门仍待。

### 商标与开场卷轴专测

[两历史主体逐文件八维、14身份与四个真实反控](organization-shell-opening.json)：四输入按商标6／卷轴8归位；补标题首未露行、精确卷轴停点／按键前未结束和真实监听清理，保留全部旧身份与软件PNG witness。61相邻/TC0，goal81/174余93，0新closed，重型门仍待。

### 网络重试安装与响应专测

[一历史主体逐文件八维、9原身份与实际callback保全](organization-shell-network.json)：卸载/重装并入原main的安装所有权组，恢复/方法组保留；不同取消/退避资源域独立，53相邻/TC0。goal82/174余92，0新closed，重型门仍待。

### 启动资源屏障与默认HTTP

[一主体／三文件八维、13身份及实际失败收尾探针](organization-shell-resources.json)：注入端口与HTTP归责，Owner实际释放4输入+3返回promise后恢复IO；54相邻/TC0，goal83/174余91，0新closed，重型门待。

### 启动覆盖层计数与DOM调度

[一主体／三文件八维、22身份与实际时钟反控](organization-shell-boot.json)：fetch9/DOM13，两个原节点函数严格保全；15/16ms界面反控、早失败的IO/clock/locale恢复，48相邻/TC0。goal84/174余90，0新closed，重型门待。

### 预缓存client、统一进度与widget

[两主体／五文件八维、41身份与三反控](organization-shell-precache.json)：fixture生命周期显式且正文保全，37.5%取floor与25%交接区分旧假绿，ready失败先结清；90相邻/TC0。goal86/174余88，0新closed，统一门待。

### 主循环门控与入口生命周期

[一主体／25身份／隔离与取消反控](organization-shell-loop.json)：frame21/headless+rAF4，两个输入context按各自合同保留，五helper正文严格转移；旧单选失败修复，取消初帧及最新帧，68相邻/TC0。附上一预缓存辅助AST证明勘误与只读完整重验，不重跑未变产品测试。goal87/174余87，0新closed，统一门待。

### 启动错误与速通数据

[错误画布一主体](organization-shell-bootstrap-error.json)2case字节保持、相邻混装6仅注释仍pending；[速通数据三主体](organization-speedrun-data.json)35case归14/12/9，离场判别力与四key/布局失败恢复。共享14files96/TC0，goal91/174余83，0新closed，重型门待。

### 速通倒计时与覆盖层

[两主体／两入口逐文件八维](organization-speedrun-ui.json)：四spec10身份归4/6，8callback保全、合法时间线与真实同对象更新补强，旧绿新业务红、语言／DOM失败恢复。12file87/TC0，goal93/174余81，0新closed，重型门待。

### 速通编排与计时状态机

[两主体／五输入八维与32→31身份](organization-speedrun-control.json)：F4三断言归解绑强例，非空PB reset oracle真实旧绿新红；四key／DOM／布局／时钟／热键失败恢复，十二fixture完整typed树保全。9file86/TC0，goal95/174余79，0新closed，重型门待。

### 菜单框几何与像素

[两主体／21身份与辅助增量](organization-menu-box.json)：九槽补齐、完整裁剪矩形换强／真实旧绿新红；默认哨兵构造迁raster、实际访问域守恒，旧混装支持仍pending。9file72/TC0，goal97/174余77，0新closed，重型门待。

### 确认与开场标题

[三主体／19→18身份与四路径八维](organization-menu-title.json)：重复四断言归强例，WORD7/8实际ownership旧绿新红；31统一字形／坐标守恒，窄语言/词表/clock失败恢复，复验默认只读。7file71/TC0，goal100/174余74，0新closed；重型门待。

### 装备列表与选人呈现

[三主体／16身份与八维](organization-menu-equip.json)：同绘制入口归一，重复两色和四隐含反面精简、done完整缓冲旧绿新红；7声明/Item/63UI槽及窄中文环境保全。8file107/TC0，goal103/174余71，0新closed；重型门待。

### 菜单装配与输入快照

[两历史主体／15身份与两路径八维](organization-menu-stack.json)：同装配入口14例，纯snapshot辅助1例归位；断言保持、maxMP40合法原输入与47区分帧精确保全，窄表/中文生命周期。9file109/TC0，goal105/174余69，0新closed；旧reverse只记历史版本，重型门待。

### 商店纯视图与Canvas读回

[三历史主体／19身份与四路径八维](organization-menu-shop.json)：买14／卖4／CanvasPNG1分责，fixture按真实caller共享；1隐含反面精简，套件依赖和跨两段来源桥显式核。9file70/TC0，goal108/174余66，0新closed；重型门待。

### 物品列表、说明与使用目标

[五历史主体／32物品＋14相邻Shop身份与六路径八维](organization-menu-inventory.json)：按列表17／说明4／目标10／CanvasPNG1分责，共享同体缺帧工厂；15严格蕴含反面精简，1合法fixture、1fallback业务反控，初次坐标接线失败及修复原件保留。12file103/TC0，goal113/174余61，0新closed；重型门待。

### 仙术施法人、法术网格与目标

[三历史主体／23原身份及相邻3身份、五路径八维](organization-menu-magic.json)：caster9／spells13／target2／snapshot2；输入工厂四spec共享，5隐含反面精简、5固定字形坐标同合同接线，1空表ghost业务反控。11file80/TC0，goal116/174余58，0新closed；相邻main转review，重型门待。

### 状态数值、装备、毒行与完整入口

[三历史主体／20原身份及main5身份、五路径八维](organization-menu-status.json)：数值11／装备4／毒8／入口2；共享hydrate工厂，3装备fixture及6角色maxMP合法化，3隐含反面精简，spy窄归属。9file63/TC0，goal119/174余55，0新closed；相邻main转review，重型门待。

### Battle settlement, background and pure formula

[Two historical subjects,6original+14adjacent identities,three A-H profiles](organization-battle-screen.json):20identities retained->13/5/2;18pixel strong oracle catches missinglastrow real source mutant;32sourcebytes/5helpers/43sharedUIslots(superset) conserved,narrow text lifecycle.8files57/TC0;goal121/174 remaining53,0newclosed,oldBGmain review;heavy gates pending.

### Party-member positions and extra-NPC sprite items

[Two historical subjects13identities plusadjacent12,25retained,A-H](organization-followers.json):16position/cache and9extraNPCsprite cases;25callbacks/5typedhelpers conserved, no product/export changes.4files34/TC0;initialspawn/exactset failures kept. Goal123/174 remaining51,0newclosed,two oldmains review;heavy gates pending.

### Native evidence volumes

[Readonly transport, full prior gate preservation and capacity/tamper contracts](native-volume-capacity.json). [Catalog](native-archives.json) lists independently indexed archives; [reader](native-archives.mjs) validates every declared index/archive/member and rejects duplicate members. Original native-index.json/native.json.gz stay byte-frozen at5742members. Extension indexes use the same schema and existing formatter limit. Capacity work adds0cohort completion; goal stays123/174 remaining51.

### Number sprites,base-map pixels and seam repair

[Two historical subjects15identities plusadjacent17,32retained,A-H](organization-pixel-primitives.json):13number/14map/5seams;31callbacks/3typedhelpers conserved,oneunused privateparameter removed,onefenceoracle strengthens getcount tofullpixels witholdgreen/new1pxred.7files58/TC0;goal125/174 remaining49,0newclosed,two oldmains review;heavy gates pending.

### Dialogue indexed pixels,layout returns and Canvas

[Two historical subjects23identities andthree A-H profiles](organization-dialog-render.json):20indexed/2layout/1CanvasPNG,allassertions retained.5typeddeclarations conserved;40boundedprobes/default21frames reuseexistingrasterprobe.6files108/TC0;adjacentmain known E/B/organization debt reopensreview despite68green. Goal127/174 remaining47,0newclosed;heavy gates pending.

### Dialogue state/text/layout and independent oracles

[One historicalsubject,104runtime identities/five A-H profiles](organization-dialog-contracts.json):text22/state32/indexed36/geometry14,85unchangedcallbacks/9explicitqualityrepairs.3realoldgreen/newsinglebusinessred controls,2emptycolorpredicate fixes,independent480/481boundary scopedtoTSmodel.108neighbors/TC0;0newclosed,goal128/174 remaining46,heavy gates pending.

### Present frame ownership and output boundaries

[One historical subject,67identities/nine A-H profiles](organization-present.json):frameholds13/fade8/palette7/party19/scene12/Canvas1/Framebuffer7;3exactfactories and11localhelpers. Fullframehold oldgreen/newred,product comments-only completeAST equal.13files114/TC0. Goal129/174 remaining45;0newclosed,heavy gates pending.

### Menu state and package-level word/clock ownership

[Three subjects,44identities and four scoped A-H profiles](organization-menu-state.json);[two exact providers/19import-only consumers161identities](organization-menu-text-clock.json). State specs14/8/22,private unused parameter actual3calls,driver2comments only wholeAST exact.24files251/TC0;9tool guards/22Node. Goal132/174 remaining42;0newclosed,heavy gates/publication pending.

### Item flags and learned-spell selection

[Two subjects,15identities and scoped A-H](organization-menu-selection.json):5item predicate/10spell selection,one common typedcaster preserving level1/10,one duplicate assertion and one outerclone removed.13callbacks conserved/2explicitdeltas,all constants/import targets proved. Product4comments only wholeAST exact.9files108/TC0;goal134/174 remaining40,0newclosed,heavy/publication pending.

### Item actions and save-slot state/metadata ownership

[Two subjects,26identities/three A-H profiles](organization-menu-choices.json):action8/syncstate12/metadata6;word lifecycle andIO finally cleanup explicit. Independent full5slot mapping catches truekeyswap oldgreen/newsinglebusinessred,source/test exactlyrestored. Wholetypedmodule/import proof,9files125/TC0;goal136/174 remaining38,0newclosed,heavy/publication pending.

### Equipment list and role-request state

[One subject,22identities/two scoped A-H profiles](organization-menu-equip-state.json):three specs ->one,7full Item records with legal IDs/scripts0,one privateItemfactory/3distinctGSbuilders. Cashownership legaloldgreen/newsinglebusinessred,exactrestore;firstzero-execution attempt rejected. Productheaderonly wholeAST exact.9files130/TC0;goal137/174 remaining37,0newclosed,heavy/publication pending. Inventory readcontext notcredited.

### Inventory rules, snapshots, grid and target ownership

[One subject, four reorganized specs and shared data fixture](organization-inventory-state.json):40 original cases map to 39 retained and one weaker cancellation duplicate subsumed by a stronger case. Full 12 Item records, four roles and grid data retain declared metadata; IDs, equipment slot/permission and explicit party fixtures are corrected. Independent color literals and full slot tables catch two real mutations: old selected green, new single business red, exact restoration. Nine files/129 adjacent cases, 15 shuffled target cases and game typecheck pass without diagnostics. Three production comments are checked by complete typed AST, including re-exports; the registration parser remains strict. The narrow verifier addition has 29 tool tests and frozen predecessors. Goal138/174, remaining36; fixed cohort142/178. No new closed files or heavy-gate/publication credit.

The original 5,742-member archive remains sealed. Continuations use the existing [volume catalog](native-archives.json), including [third-volume index](native-index-003.json) and [third-volume bytes](native-003.json.gz); every prior member remains exact. These attachments preserve execution facts and failures, not additional file-review credit.

### Buying, selling and script-to-menu ownership

[Two historical subjects, 30 identities and six A–H profiles](organization-trading-state.json):buy-state10/sell-state15/script-flow5;five catalogs share the current pure Item constructor,14 complete records checked. One local GS initializer replaces duplicated setup only within actual input contracts. Two casts become real typed handler state plus stack identity;only flow owns handler/catalog cleanup. A legal end replaces opaque continuation;nameless item keeps explicit undefined with legal ID105. Product comments only,full typed AST equal. Seven files/91 adjacent cases, five shuffled flow cases and game TC pass without diagnostics. Bitmap drift missed by green state tests was caught and repaired by full-record proof. Goal140/174,remaining34;0newclosed,heavy/publication pending. The injected three-item shop is not a bootstrap store-lookup or browser E2E claim.

### Synchronous magic effects, control and phase composition

[One historical subject, 35 identities and five A–H profiles](organization-magic-runner.json):vitals20/control11/program-and-phases4;22 command records and10 literal labels remain exact. The shared state factory preserves real maxHP inputs200/400. Two warning-count strengthenings catch duplicated real warnings:old selected green/new single business red,exact restore. Six files/116 adjacent cases and game typecheck pass without diagnostics. Five numeric helpers retain pre-b110 syntax;current OBJECT progression is bounded separately by existing formal cases and a read-only real-API reset probe (HP61→83,full OBJECT,shared Spell unchanged),not inflated into test count. Product changes only comments and one ignored third-operand local. Goal141/174,remaining33;0newclosed,heavy/publication pending. The two unused public cast parameters remain unchanged pending user decision;source review is retained.
