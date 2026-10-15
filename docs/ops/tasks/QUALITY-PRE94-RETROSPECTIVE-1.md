# QUALITY-PRE94-RETROSPECTIVE-1 — 94前全部治理成果逐卡复审

Status: build
Owner: Codex
Reviewer: Codex（当前源码与证据复核；不冒充第三方）
Phase: engineering first; phase1/phase2按真实路径分别准入
Capability: governance evidence reliability
Visual Verification Timing: 按逐卡风险登记，源码/测试工具本身N/A

## 当前用户要求、范围与准入

用户2026-10-16重申“复审94号之前的所有卡的成果”，本卡当前覆盖全部83张CODE-QUALITY编号小于94的卡，包含字母后缀，不是抽样。77张历史done、1张build、4张review、1张draft仅是原卡状态；本轮重新accept为0。按当前Git tracked路径收集，大小写敏感编号规则排除行政卡CODE-QUALITY-3Y-CLOSEOUT-1；不按编号空缺虚构卡。完整83行清单与卡SHA见[复审队列](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.md)。原36卡结构/8卡全文抽查是历史部分证据，不能替代任何整卡成果复验。3y的58差异卡矩阵也不是全部83卡。

唯一工作树/分支codex/code-quality-3y；主树和其它Owner只读，不再新建治理分支。94–102及editor既有返工继续保留；C10未完成检查点bea19f80c已提交推送，当前先推进本卡。工程→模块→功能→文件；先6a的账本/清单四文件，再核92的受保护门证据，继而逐卡回到shared/extract/game等模块。活跃53/57/79/80/81/90只读协调，未核前不抢写其实现。

Codex premise verified / design agree / build allowed：完整读取任务卡、实现、真实caller/出口/类型/生命周期，核注释事实、可复用代码边界、内聚耦合、输入/错误/异步取消/清理/ownership；测试核合法输入、真实oracle、排重、判别力与隔离。只读复核、隔离反控、测试与治理证据允许；发现需修复时先钉有限白名单和反例，低风险工具/测试补证逐批准入。产品机制、schema/save/migration/资产、公共接口或可感知行为变化立即停线专卡，不用本卡泛化授权。

逐卡状态只记pending/partial/rework/accept等实际结论；源码全文读取不等于caller已核，测试全绿不等于合同完备，旧done不等于本轮accept。原账本关闭遇直接counter才精确重开，不批量假验收/假否定。每个有限切片记录实际读取路径和SHA、primary/caller/oracle、问题/未修、定向相邻和反控；完整check/official ratchet/protected fast在稳定模块窗口集中。error/warning/info及运行时诊断未清前不合main，不宣布全仓完成。

## 当前推进

83卡当前全量accept=0、10partial/73pending；6a、92、CODE1 RLE、CODE2 MKF/RNG、CODE2b YJ2、3b SSS/MSG、3c动画清理、CODE3切分测试已有逐文件证据与有限返工，仍partial、统一门待续。CODE75已有MIDI重复退役局部证据，仍不等于该卡整文件复审结束。其它卡既有抽查/旧卡证据按历史保留，当前未完成项仍pending/partial。每卡范围须由全文读取后人工核定；清单生成只抽取文本和字节SHA，不伪装为语义阅读。

无下一位Agent提示词，Codex单Agent继续全量复审，不把本卡交回GLM。

## 历史：2026-10-15抽查准入原文（已被上方全量范围取代）

Historical status: review
Owner: Codex
Reviewer: Codex（只读抽审；不冒充第三方）
Phase: engineering / phase1 sample
Capability: governance evidence reliability
Visual Verification Timing: N/A（只读代码/证据）

## 用户目标与边界

用户要求大致浏览94卡之前的治理，确认注释、复用、内聚/耦合及测试质量。不能按模型名称推断质量；本卡按当前源码、实际caller、SDLPal与原件核对。36张卡结构盘点不等于全文复验；完整读取名单与部分caller段分别记录。单Agent，主树/GLM树只读。94–102与editor诊断清理原goal继续，不被本卡替换。

## 准入

Codex premise verified / design agree，build allowed仅只读抽审、探针、测试执行及治理记录；不修改产品/schema/save/迁移/资产/公共接口。高风险毒状态域转专卡draft。不能给全部旧卡补accept，也不能把历史文字改成已执行新门。

本轮先抽3o毒键、3u/3w清理测试、2b codec/边界与6a账本门，另核92工程纠错。保留历史原件，直接反证才撤回对应文件结论；其它229旧闭合不批量撤销或重验通过。

## 输出与交接

报告须区分直接支持、确认不足、未知待复验；记录实际读取文件、测试原件与未修问题，机器账本按当前结果。全仓门与editor稳定窗口合跑，本卡只读不会授权集成。无下一位Agent提示词，Codex继续。

## 6a有限测试补证准入（2026-10-16）

已全文读取ledger实现142行/测试123行、inventory实现216行/测试48行，以及原6a卡、根package.json caller。隔离副本仅删除ledger的CLI导入guard，原九例仍全部通过且导入产生真实CLI输出，证明“导入不启动CLI”缺乏测试判别力；实现当前guard正确，不称为产品缺陷。inventory原例标题声称deterministic但只运行一次、未检验--out出口，属测试证据缺口。

Codex build allowed补证白名单仅两份现有测试：ledger.test.mjs新增隔离子进程导入安静合同；inventory.test.mjs在原例核对stdout和临时目录--out字节一致、从无关cwd调用并finally/after清理。两实现只读；不新建公共helper/配置，不改任何游戏行为/覆盖规则。反控在同目录临时副本运行，真实原件SHA保持且finally清除；全量门待稳定窗口，不凭补证关闭文件。

### 6a当前结果

两枚隔离反控旧绿/新精确单例红，恢复11/11、相邻quality-tools38/38；工具实现未修改，仅两测试补证。ledger测试旧关闭撤回review，inventory测试pending→review，0新增关闭。四源职责/输入/caller/oracle/注释/复用与未核范围见[6a证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/6a/README.md)。全仓check/ratchet/protected未重跑，editor诊断未清，6a整卡partial，本轮83卡accept仍0。下一片92工程门原件和源码快照。

6a检查点docs/lint-zero/ledger/diff-check均通过，lint4376文件0/0/0；机器3287/222closed/201review/2864pending。全仓check/ratchet/protected未重跑，editor诊断仍未清，保持build/partial，禁止合main。

## CODE92当前复审

历史protected失败/成功与同commit全仓check原件已核SHA/exit，旧收口实际有门执行；当前30源20相同/10变化，全部继续review。成功raw缺结构化环境，后续保存环境白名单/ref/baseline SHA，不追补原件。工程门实现/依赖与原生定向测试实际读取见[92证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/92/README.md)。0新增关闭、全83卡accept仍0；下一片CODE1 shared RLE，94–102/editor原返工继续保留。

## CODE1 RLE有限复审与测试补证准入

已全文读取rle.ts/主测试/boundaries/runtime-resource及相邻glm-o，核shared公共barrel、game tileset/rle-decode、extract sprite全文件与reforge assets实际caller分段；读取SDLPal原函数和phase2铁律。发现高位literal语义差异已立即停线至QUALITY-RLE-COMMAND-TRUTH-1 draft，算法/格式/资源与公共接口不得实现。

独立的已定测试合同：原CODE1明确宽容入口必须捕获decoder畸形输入并保留其后合法帧。隔离副本把catch改成rethrow，四份原RLE测试54/54仍绿；主测试所谓截断样本连header不完整，实际未进入catch。Codex build allowed仅修packages/shared/src/rle.test.ts这一现有测试的合法容器/坏帧字节和精确oracle，保持测试身份数量；先验证旧反控存活，再新反控精确一红、恢复定向/共享包与相邻。rle.ts与encoder/资源/格式probe边界全部只读；这不是允许实施高位literal修复。其它原卡范围仍pending/partial，0新增关闭。

### CODE1本片结果

只补主RLE测试一例，54身份保持，rethrow反控旧54绿→新53绿1业务红，恢复shared typecheck/131例与game21/extract6/reforge20通过。decoder/主测试/boundary三旧关闭撤回review；高位literal格式真值专卡draft，未改算法或资源。GOP67715成功帧结构trace未见分类分歧，不等同SDL native像素对比。全83卡accept仍0、统一门待续；下一片CODE2 MKF/RNG。

## CODE2 MKF/RNG补证准入（2026-10-16）

全文读mkf.ts、rng.ts、两boundary测试与rng主测试；核共享fixture/barrel、extract MKF重导出及RNG PNG wrapper、game rng-player caller全文件，SDLPal对应MKF/RNG函数。当前没有生产实现缺陷证据。隔离删整数guard，MKF旧11例仍绿；YJ2失败catch错误清空surface，RNG旧16例仍绿。原注释还把已拒绝的offset越界写成未定义，与实现/现有反例矛盾。

Codex premise verified/design agree/build allowed白名单仅两现有测试：mkf.boundaries.test.ts校正注释、在同一索引拒绝例加入NaN/非整数并明确共享视图ownership；rng.boundaries.test.ts把坏YJ2例加强为正常帧→坏帧→后续delta，直接核旧画面保持和最终完整plane。保持例数，不改mkf/rng/YJ2实现、公共API、错误政策或资源。原例标题必要时精确更名，映射落证据，不伪造旧身份相同；官方baseline仅后续真实ratchet生成。先旧反控存活→新精确单例红→恢复定向/相邻与必要typecheck。

同时只读核真实MKF区间与RNG当前解码结果；若运行native源码则记录原函数SHA/给定解压payload的比较边界，不把它冒充YJ2或pal.exe验证。无新产品取舍，不借本片解除RLE格式draft或接管CODE53等活动实现。

### CODE2 B段：已证重复精简准入

A段保持例数的两项补证已通过旧绿/新单例红与恢复绿。全文排重确认rng.test.ts的“delta累加”与rng.boundaries.test.ts“连续帧基面保留”均是literal写前两字节→0x02跳过→写后两字节；后者还精确约束全320×200未触区域。小零面与大MARK面在该调用无尺寸/像素值分支，前者断言是后者合同的弱子集，真实caller面为320×200；其它小面/越界合同仍在，不能因文件短保留重复。

按用户测试少而精规则，Codex build allowed B段只退役rng.test.ts该一例（7→6）并核oracle转移反控；A段两测试保留。仅必要时新增approved-test-retirements.mjs精确7→6/双身份digest/源SHA条目，更新固定表测试23项/净52；matcher、拒绝合同、scope规则及baseline比例不改。原生Vitest list身份与三父快照比对后再登记，baseline只由后续官方ratchet生成。无产品/算法变化，统一门未跑不合main。

### CODE2当前结果

两项补证各有旧绿/新单例AssertionError；精确退役一条重复delta并验证oracle转移。生产MKF/RNG及YJ2字节未改；原始15MKF/2373chunks区间一致，给定相同解压payload的native SDL1464帧逐像素/索引一致。最终33定向、shared130+typecheck、game13/extract17与coverage-tools68通过。三测试旧关闭转review、0新关闭，统一门仍待续；全83卡accept仍0，下一片CODE2b YJ2。

## CODE2b YJ2有限测试精度准入

全文读取shared/yj2.ts、边界测试、rle.glm-o.test.ts与固定fixture，extract/io/yj2.ts及测试、resources/map.ts，SDLPal YJ2类型/查表/建树/调整/位读/解压原函数；核shared/rng完整caller沿CODE2源hash，CLI分段定位。当前无算法修改授权。原注释仍否认已存在的空窗口反例；extract两例仅核预分配长度；GLM-o的YJ2四例由规范边界合同覆盖，固定向量两次自比不能证明字节真值。

Codex premise verified/design agree/build allowed限三个现有测试：yj2.boundaries.test.ts校注释并承接精确异常、零长尾随payload和两次独立固定expected输出；rle.glm-o.test.ts只移除YJ2四例/专用imports并修文件职责说明，RLE测试体不改；extract/io/yj2.test.ts把两个smoke整合为真实MGO前20chunk的独立native冻结字节digest。只在未改SDL原函数与真实raw对拍/合法输入前提确认后写golden，不用当前TS结果自制oracle。精确退役所需table数据/固定计数可同步，matcher/规则/基线不改，源实现与资源只读。

先隔离length-only解压变异证明旧测试盲点，再原生oracle/转移反控/恢复；混合文件13→9需原生list旧/新digest与源SHA精确登记，extract raw测试不在fast inventory则不伪造退役豁免。未知树归约独立fixture仍pending，不用raw数量冒充该轴已证。若真实native/raw有分歧立即停线专卡，不直接实现。

### CODE2b当前结果

原算法/重导出未改，native SDL2626段/34367608B对拍一致；规范9例承接四条混合YJ2合同并纠正注释，混合13→9、extract2弱例→1独立native字节oracle。共享变异七个失败集合完整保留，extract旧2绿/新1业务红。恢复34定向/shared126+typecheck/相邻18+typecheck/coverage-tools69通过。树归约独立向量仍待证，统一门未跑，0新关闭；下一片CODE3c工程runner，再回CODE3。

## CODE3c当前复审及有限补证准入

全文读取原卡、SpriteFrameWorkbench.tsx及四份相邻测试、SpriteFrames/BattleSpriteInlinePreview真实caller、world/battle语义组生成器、content sprite类型；按实际区间读取reforge公共出口与resolveSpriteActionPosition及相邻测试。原3c最终交付是缺帧动画测试，并非runner实现修复；该生产文件与专属测试仍与8fea6a4ec字节相同。缺帧是编辑器修复预览输入，非运行时严格动作绑定接受越界的新授权。

隔离副本三针：删除缺帧fallback与完成guard均使现有1例产生指定AssertionError；只删除clearTimeout则原例仍1绿，证明活动定时器的卸载清理未被本例判别。生产cleanup当前正确，不称为用户行为bug。Codex premise verified/design agree/build allowed白名单仅animation-boundary.test.tsx：在同一动作合同内再激活后带活动timer卸载，断言queue归零且卸载画布不再绘制；把帧初始化移入try并用嵌套finally保证恢复。保持1例身份，不新增helper、规则、ignore、sleep或产品改动。先旧绿/新精确业务红，再恢复定向/相邻与typecheck；旧覆盖率门保留历史，当前统一门仍待续。

### CODE3c本片结果

原1身份加强活动timer卸载，三针各精确1个业务AssertionError、恢复正常1绿；生产与规则/baseline未动。editor模块36绿但6act，reforge相邻22零诊断、editor typecheck通过；全仓门未新跑，不合main。原两条关闭转review、0新关闭，当前机器已确认213closed/211review/2863pending。3c本轮partial；全部83卡accept仍0，7卡partial/76pending，下一片CODE3 extraction event/type模块。

## CODE3切分测试有限补证准入

全文读取slice/annotate实现、四slice测试/两annotation测试、disasm/recompile/roundtrip、shared事件类型、SSS/WORD/MSG解析，真实CLI入口收集/事件写出片段及SDLPal相关case。原卡纯类型收紧未改变BFS，当前annotate另含3f parseSymbols增量。人读元数据伪边与带计数goto遗漏续行已停线QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 draft，生产算法/重复BFS抽取与生成物冻结。

隔离三针（删A2随机边、resetTo有值时漏续行、EO auto入口错定为1），原四文件28例均绿，证明对应旧断言不能判别。Codex premise verified/design agree/build allowed白名单仅slice.test.ts及slice.kimi-r1.test.ts：原A2例用end隔断普通fall-through并核完整有序集合；原reset例用非零idleFrames与完整目标/续行oracle；原EO auto例区分目标身份，修正现有fixture raw字段布局、相关注释。保持28身份，不新增测试、ignore、弱断言、规则/runner或生成物；先新三针各指定AssertionError再恢复定向/相邻/typecheck。Kimi字符串扫描旧例仅保留历史行为观察，不能作为正确控制流真值；不借补证实施高风险算法修复。

### CODE3本片结果

三针旧28绿/新各27绿1指定业务红，恢复定向45、extract72/434+typecheck、shared16/126+typecheck均零诊断。仅两测试补证，生产/规则/baseline与资源未改；控制流/元数据风险专卡draft继续，不借此抽重复BFS。机器已确认211closed/214review/2862pending，0新关闭；全83卡8partial/75pending/0accept。下一片继续CODE3 annotation测试质量，之后3b；94–102与editor返工保留，统一门未清不合main。

## CODE3/3f annotation测试有限返工准入

全文重读annotate109行及两测试106/121行、3f原卡、WORD parser/测试、shared类型与出口；核真实CLI和schema人读注释边界。无生产修改证据或授权。六枚隔离变异（截sequence、改choice文本、漏无else then、改调用数组、丢合法spell表、漏表类型guard）旧17例全部绿。旧“零突变”传的是新数组且仅1项；结构断言多靠强转后单字段，不能证明完整输出。

Codex premise verified/design agree/build allowed白名单为annotate.test.ts、annotate.glm-runtime-resource.test.ts：用独立完整expected替代局部强转、每例新建词表、直接检查真实调用数组及输入所有权；现有sequence承接多步骤、choice承接完整选项、无else承接有效then注释。主测试两远端缺名/一raw用例与GLM一正向/优先级用例已证重复，明确转移到保留的邻位缺名/直接输入守恒/主WORD与symbols合同；旧混合坏symbols拆为顶层形状、未知键、表形状、表值四个合同，不为少测而混轴。最终9→6、8→10，共17→16。名称更正与拆分精确记录，不伪称身份保持。

仅在原生list核旧/新身份并对main/旧3y快照后，为主文件9→6登记approved-test-retirements精确count/双digest/新SHA，固定表25项/净59可同步；matcher、拒绝合同、runner和baseline不改。其它三枚oracle转移诊断单独记录完整失败集合，不冒充六枚单例业务反控。当前symbols/annotation算法、切分高风险专卡及生成物保持冻结；统一门仍待后续窗口。

### CODE3/3f本片结果与包诊断纠正

两测试17→16，四条已证重复有精确转移，坏symbols四层合同独立；六针旧17绿/新各15绿1指定AssertionError，恢复正常16绿；三多红转移诊断另记，非单例针。主文件9→6双digest/新SHA经main与旧3y对照登记，其他24项/matcher和baseline原字节不变。定向52、shared126/typecheck、extract typecheck和coverage工具70通过，原件见[标注证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3-annotate/README.md)。

完整extract虽原生72文件433 passed/0pending，完整stderr却有10块/52行，六例因root指错packages/data/raw后return而未执行断言；另四块parser负面日志。故包验收未过。上一片434的“均零诊断”说法不成立，只有act/环境/navigation三模式为0，历史日志保留且当前纠正。新开[原盘测试执行完整性](QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)draft，下一批先核两测试和实际caller/primary，不静音、不新增排除、不改decoder/原盘/生成物。

本片两旧关闭撤回review，0新增关闭；CODE3/3f仍partial，全83卡9partial/74pending/0accept。原卡范围其它文件/统一check、ratchet、protected和editor诊断未清；不合main。先处理六条假绿，再续3b及94–102/editor；无下一位Agent提示词，单Agent继续。

本检查点docs/ledger/diff-check通过，lint-zero4428文件error/warning/info全0。机器3287 inventory /209closed /216review /2862pending；没有新增关闭或统一门通过声明。恢复、原件与精确退役已另进程复核，不冒充第三方验收。

### 原盘执行完整性支持片

[原盘任务/证据](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)已修两测试六假绿，native SDL1332图像完整RGBA oracle、七旧绿新红；一空块重复转移，21→20。共享test-only摘要与相邻事实注释均review，0关闭；完整extract432仍4stderr块，统一门未清。全83卡仍9partial/74pending/0accept；本支持片不替代CODE3b/3g/其它卡全文复审。先核四处诊断真实输出合同，再续编号卡与94–102/editor。

### C1同步诊断合同支持片

[C1完整证据](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md)：两测试补真实warn/Error/null与异常恢复，八有效反控；BALL精简一同输入弱例，53定向/shared126/typecheck/71工具通过、生产局部V8保持。extract431仍2stderr块，三测试/helper仅review、0关闭；全83卡仍9partial/74pending/0accept，不以支持片代替编号卡成果复审。先C2，再3b及94–102/editor。


### C2实际检查点

[C2原件与逐文件结论](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md)：两测试完整DTO/实际输入ownership/真实同步IO，7旧绿新单例AssertionError；raw名字既有oracle和同999字节oracle各1→1转移另列。tables90→89、P07 2→3，总92但原生身份变化公开；既有fast不含tables，无新增豁免/baseline改动。生产enemy-teams实际V8 32/32、2/2、22/22保持。完整extract72/431、shared126、真实战斗caller186、双方typecheck与71工具通过，0stderr块。

两测试只review；enemies.ts两处不存在的EnemyTeam.slots注释是直接counter，旧关闭撤回review，生产未改。机器3289/208closed/226review/2855pending，0新关闭；全83卡仍9partial/74pending/0accept。完整check/ratchet/protected未新跑、editor诊断未清，不合main；回CODE3b四文件继续，原94–102/editor保留。无下一位Agent提示词。

C2静态门与历史失败保留见[最终回执](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/gates.md)；只更新本卡导航，无其它Owner状态变化。整体验收/统一三门未通过不合main。

## CODE3b 当前复审与有限测试准入

已全文读原3b卡、msg.ts/sss.ts、两boundary及两真实raw测试、utils/gbk.ts、roundtrip.ts、io/mkf.ts；共享fixture沿C1全文同SHA并重读1–155。真实CLI200–250、SDL global.h95–121、text.c792–850及工程笔记22/62/172为当前锚点。生产两个parser继续只读，未发现本片实现缺陷；SSS固定结构的非对齐拒绝和MSG越界/倒序拒绝已由旧3b实施，不能沿用旧P03“政策未定”注释。

Codex premise verified/design agree/build allowed白名单仅sss.boundaries.test.ts、msg.boundaries.test.ts：将SSS的实际父buffer及其前后非零保护区纳入调用前后比较，手列两EO/两scene完整语义与raw字段及独立bytecode字节；MSG核实际bytes/offsets和父buffer不变。六项隔离故障（SSS前/后保护、第二EO/scene字段、MSG两输入修改）须先证旧绿，再新各恰一指定AssertionError，原件/源/测试hash与清理完整保存。

原SSS两组混合拒绝拆成五个独立chunk输入轴，MSG混合拒绝拆成越界/倒序两例，明确身份变化，不用总数假装相同。原两正例、合法单offset零消息合同保留；只修错误注释与测试证据，不新增共享helper或改变解码/资源/schema/API/错误策略。生产bytecode当前借用输入视图、其它解析数组自行分配；本片不擅自改变返回ownership。全量统一门仍在诊断稳定窗口集中，editor未清不合main，不因局部反控关闭文件/整卡。


### CODE3b 本片结果

[逐文件与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md)：六针旧16绿→新各19绿1指定AssertionError，恢复20绿；保护父buffer、两完整EO/scene、两MSG输入ownership，原拒绝轴拆独立5+2例并修过期注释。生产两个parser字节不变；独立Python struct全量5077 EO/295 scene/3955 WORD/13514 offsets/43503指令一致，正文摘要只作观察，不冒充native/text oracle。

42定向相邻含真实roundtrip、extract72/435、shared126及双方typecheck、71工具通过，0stderr；全仓check/ratchet/protected未新跑。两boundary旧关闭撤回review，两个raw sanity pending→review待精度/排重，0关闭。机器3289/206closed/230review/2853pending；83卡10partial/73pending/0accept。下一片先两raw测试，再3d/3g；94–102/editor保留，未统一零诊断不合main。无下一位Agent提示词。

## CODE3b raw测试有限准入

Codex premise verified/design agree/build allowed：只改io/sss.test.ts与io/msg.test.ts两现有原盘测试，生产/共享fixture/资源/规则/baseline保持。SSS沿上片独立Python struct全5077 EO/295 scene/3955 WORD/13514 offsets/43503指令结果与原件SHA，固定完整字段/表/字节码摘要；expected不由当前TS生成。MSG仅以独立raw DWORD偏移和Python严格GBK直接读出的0/1/100/6757/13512五条原字节为固定文本oracle，保留控制标记/标点/全角空格，明确是当前原盘已核子集，不冒充全正文/fixup/native验证。

原SSS六sanity→一个完整同次解析结果合同，固定count/全字段/原字节摘要蕴含旧非空、8B和raw16槽；MSG三smoke→一个精确count/五文本合同，13513条蕴含旧规模、ID1明确逍遥、ID100精确字符串承接旧类型抽查。类型smoke不另计业务。两文件均既有fast排除，不新增退役豁免，不动matcher/基线；须原生JSON公开9→2及身份变化，不把少测等于质量。

反控先证五缺口旧绿（后续EO字段丢失、真实字节码尾损、正文首/中/末错值），再新各一指定AssertionError；字节码空与逍遥名字替换的旧有oracle转移单列1→1，不计新缺口。完整四测试集合、源/副本/原生JSON/raw/exit/signal与临时清理全保留；恢复后定向/相邻/TC及静态门。正文全量未知、其它旧卡及94–102/editor原目标继续；统一门未过不关闭/合main。


### CODE3b raw测试本片结果

[raw逐文件/独立oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/raw-tests/README.md)：两raw测试9→2，完整四文件20→13；SSS固定全5077 EO/295 scene/3955 WORD/13514offsets/43503指令的独立struct oracle，MSG独立raw区间/严格GBK五原文与13513条数。五针旧20绿/新各12绿1指定AssertionError，字节码空/逍遥替换两原oracle各1→1单列，恢复13绿；两生产实现未改，原盘/规则/baseline不动，无新增退役豁免。

35定向相邻、extract72/428、shared126及双方typecheck、71工具通过，0stderr；原3b after按Git3a9重建7轮，当前16轮原件/源/副本/清理另进程核验。两raw仅review，MSG其余正文/fixup全量与其它边界仍待；机器3289/206closed/230review/2853pending不变，0新关闭。全83卡10partial/73pending/0accept，下一片3d PNG输入，再续3g和94–102/editor；统一check/ratchet/protected未新跑，不合main。无下一位Agent提示词。

阶段合并优先级：本原盘片提交后先回QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1的C10阻塞，争取统一零诊断窗口与阶段合并，再续83卡队列中的3d/3g。范围仍含全部83卡及94–102/editor，未核项不变更为accept。
