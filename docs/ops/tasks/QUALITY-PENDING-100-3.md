# QUALITY-PENDING-100-3 — 第三治理窗口：按复杂度逐片核验 pending

Status: review
Owner: Codex
Reviewer: Codex（单 Agent）
Phase: ops（具体文件按第一／二阶段区分）
Capability: code-quality
Visual Verification Timing: N/A（不授视觉或 E2E 信用）
Branch: codex/code-quality-94-102

## 目标

接续最近200文件复查，从仍 pending 的模块推进八维审核与必要质量返工。约100个实际完成主体只是集中重型门的默认节奏；按用户2026-10-28指示，复杂模块缩小切片，不降低标准、不用依赖补读凑数。

## 范围与单一 Owner

2026-10-29 首片仅3主体：`packages/migrate/src/migration-path.ts`、`migration-path.test.ts`、`__tests__/migration-guard-fixture.ts`。Coding Owner 为 Codex；看板与现行卡未发现此三文件活跃 Owner。英文 localization、实体预览、E2E及视频任务不写。

白名单：三主体的全文审查、必要的注释/专测质量调整、任务/账本/证据投影。产品路径政策、事务写入、资源格式、journal、schema/save和生成物均不改；真实调用层的新风险按[控制目录风险卡](QUALITY-MIGRATION-CONTROL-OWNERSHIP-1.md)单独停止线处理。临时反控仅在本治理树串行运行，finally逐字节恢复，不进入提交。

## 前提真值门

基点 `e94098f949452bc3bf8d028f21bdc0a4e400ea22`。fetch成功、树干净、origin/main与同一治理分支0/0；机器3464 inventory／797 closed／0 review／2667 pending。main的 documentation 40708753365、fast-coverage 40708753193已成功，完整ZIP逐成员CRC通过，可见warning/act/stderr/unhandled均0；这些只证明基点，不替本窗口未提交代码授门禁信用。

第一阶段/SDLPal N/A：这是第二阶段离线写入保护与测试组织，不判断PAL机制或原盘格式。当前合同来自migrate README操作纪律、真实transaction/materializer和历史MIGRATION-WRITE-GUARD-1的明确单writer/非OS沙箱边界。历史GLM migrate-all只有域级总结，没有逐文件完整八维，不能继承整包accept。

最强替代解释：既有真实caller已经覆盖符号链接和写前拒绝，不能只因单测未重复这些轴就强加测试；需要具体断言缺口才补强。生产守卫正确不代表每个调用方都在正确时点使用它。

## 上下文锚点

[长期八维](../code-quality.md)、[现行工作流](../agent-workflow.md)、[阶段规则](../../phase2/READ-FIRST.md)、[历史写入保护卡](../archive/tasks/done/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md)。旧GLM材料为 `QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/migrate-all`，只复用版本有效的来源与合同，不把739包级绿数当全文验收。

## 验证与低成本复验

逐文件A–H、准确读域/调用边界、旧→新断言映射、原生身份、完整raw和失效条件落在[窗口证据](../evidence/QUALITY-PENDING-100-3/README.md)。快速入口只核指纹/原件/指定结果，不认证设计语义，不自动运行测试。

只运行必要的定向/相邻、受影响typecheck与静态门。全仓check、官方coverage ratchet、protected fast留稳定窗口冻结收尾；本片不启动，不提前声称集成完成。纯重构与行为修复继续分提交；两个迁移风险卡的窄修已单独获批，不扩张到其它产品行为。

## 当前模式推进记录

2026-10-29 Codex build allowed：仅上述3主体质量审查及获准的纯测试/注释整改，同一隔离树/分支，未建新分支，未动主工作树。审查完整、整改完成、统一门、提交推送和合并分别登记；本卡不能继承PR33门禁。

## 交接

首片3个原pending主体八维及测试整改完成，代码接受，统一门待窗口收尾；3／约100，不把新专测或依赖补读凑数。相邻transaction控制目录问题经原生复现、用户批准、正式4红后窄修，4绿/89相邻/TC0；单独卡代码接受，不附带整源关闭。全仓/官方coverage/protected未启动，未提交推送合并。

第二片已完成，累计8／约100原pending主体，新增3辅助单列、不凑主体。真实写入失败/格式取舍依旧执行原停止线；未提交推送合并。

## 下一位 Agent 提示词

无下一位Agent提示词；Codex单Agent继续此卡，未委派旧只读Agent。

## 第二片准入：baseline 文件合同与专测

2026-10-29 Codex build allowed，单一Owner、同一治理树/分支。已核看板及卡顶，没有此模块的其它活跃Owner。主体为 `migration-files.ts`、`migration-baseline.ts`、`migration-baseline.test.ts`、`migration-baseline-pure.boundaries.test.ts`、`migration-baseline.glm-next-wave.test.ts` 五个原pending文件，构成一个baseline模块切片；计划/CLI/内容formatter补读不充主体。

只做行为保持的内部结构及测试质量整改：消除两个单caller转发包装；把完全相同的SHA函数提为内部叶，保留baseline原named export/签名，事务/工程IO改为直接依赖叶；精确格式oracle、合法夹具、死参数与重复断言逐项核清。没有迁移内容/路径政策/磁盘state版本/公共接口变化；若发现需要改变这些合同，停止该项另核准入。纯重构与已批控制路径行为修复留待窗口收尾分提交。

已有第一片证据不重做；依赖基线模块/事务导入变化时登记具体版本桥及行为保持依据。只跑本片与实际相邻验证，重型全仓/官方coverage/protected不启动。

## 第二片局部验收

2026-10-29 五主体全文八维与必要返工接受。两个转发包装移除、SHA原函数提为叶，public签名/原named export保留，事务/工程IO只改SHA导入；纯重构检查点有函数体逐字节证明，未与后继行为修复混称不变。三个旧专测逐例整改自比、格式oracle、死参和重复合同；18例总数不变，旧格式组合对同一变异仍绿，新map/stamp各唯一业务红。

坏清单越界读取已单开[路径输入域卡](QUALITY-MIGRATION-BASELINE-PATH-DOMAIN-1.md)，用户批准后正式10红→10绿；当前21文件170相邻与TC0、真实537项基线只读正控成立。`migration-hash.ts`、新baseline路径专测与首片control专测为3辅助，均有独立八维但不计8主体。transaction及project-io只获精确导入/局部修复信用，整文件仍pending。

当前本窗口8原pending主体代码接受，账本暂review待集中门，closed不增加。下一相关切片为migration-plan与snapshot专测；先核Owner和已有版本有效证据，重型门继续延后。

## 第三片准入：纯迁移计划与边界专测

2026-10-29 Codex build allowed：`migration-plan.ts`、`migration-plan.boundaries.test.ts`、`migration-plan.glm-o.test.ts` 三原pending主体，同一隔离树/分支，单一Owner Codex；看板无重叠Owner。只清理无信息中间变量、错误/脆弱注释、非法fixture/自比/重复与弱断言；正常三方合并、原子地图选择、写删/冲突策略和接口冻结。主测与merge/caller只为排重和合同补读，不随相邻绿接受；真实资产管线行为新取舍仍单独停线。

## 第三片局部验收与当时交接

2026-10-29 三主体逐文件八维接受，累计11／约100，3辅助另列。计划的私有索引复制函数改为达意名称，移除无操作target别名；说明canonical hash与原子正文借用的边界，删除顺序保持。允许变换后去注释语法精确一致，无机制、接口或迁移输出变更。分支初筛14/34已逐段核，不为指标强拆职责。

两专测20→22：原万能例拆轴，普通保作者/重放和值冲突复用更强既有合同；删formatter自比/clone标准库自证，完整输入不变与真实计划结果保留。map专用hash及三方冲突归属分别旧选中1绿、新唯一业务AssertionError，精确恢复。两条theirs偷带未声明hash-only状态的夹具撤换为已声明base/ours边界，不再因全绿继承错误域。最终12文件99绿、TC0，完整default+json输出无诊断；先前170属于另一已固定相邻集合，不与99相加。

当前3467 inventory／797 closed／14 review／2656 pending；本窗口代码接受14路径（11主体＋3辅助）暂review等统一门，closed新增0。重型check/official/protected仍未运行，未提交推送合并。下一片选migration-project-io及其真实IO专测，核Owner后继续；不据本片99绿接受主测、merge或广域publication。

## 第四片准入与库存勘误

2026-10-29 Codex build allowed：`migration-project-io.boundaries.test.ts`、`migration-project-io.glm-o.test.ts`、`migration-project-io.glm-next-wave.test.ts` 三原pending主体，单一Owner、看板无重叠。实现/主测在52阶段已关闭，复用旧证据，不再计本窗口主体；先前第二、三片关于实现“仍pending”的文字为交接勘误，历史时点原文保留。当前source的SHA叶导入仍只有已批精确变化。

完整调用链核验又发现实现旧D/G有具体反证：两项非托管哈希出口及walker只有测试调用，旧“真实plan/执行用途”不成立。源旧关闭撤review，退役待[窄接口卡](QUALITY-MIGRATION-UNMANAGED-AUDIT-RETIREMENT-1.md)裁决；不改变三项现用API或写入政策。三专测在既有授权内补注释/合法夹具/独立oracle、拆轴和有效反控，退出码绿不自动关闭涉及未决接口的文件。

同片相邻追加两原pending文件：`__tests__/planned-changes-fixture.ts`、`migration-write-plan.boundaries.test.ts`，已核全部真实consumer与单一Owner，无活动任务重叠。fixture正文保留；边界专测只清理核心as-never、过宽/陈旧summary夹具、组合用例与自造格式预期，不改生产写入策略或路径合同。主测仅为合同/caller补读，不计新增完成数。

## 第四片局部验收与当前交接

2026-10-29 五原pending主体逐文件八维及必要返工接受，累计16／约100，3新增辅助另列。raw字节旧夹具恰好canonical，错误地重新序列化仍旧绿；新有效CRLF＋独立Node crypto oracle为指定业务单红。map旧contains容忍多收文件，新完整集合为另一旧绿新唯一红，两组均精确恢复。拆schema/TOCTOU/资源排序与baseline字节轴，去核心强转、过宽旧summary及重复预期。

用户已批准退役两无生产用途hash接口；出口/walker与6专属旧身份移除，有效非托管/只读断言迁现用入口。四保留函数签名/正文不变，未改输出/资源格式。实现/主测属于旧关闭重开复核，不计五个原pending；主测本次发生实质合同迁移，亦暂review等集中门。

最终11文件73相邻、migrate TC0；77/24/21为各历史检查点原样保留，不相加。当前3467 inventory／795 closed／21 review／2651 pending，0新增closed、两旧关闭暂review。当前无待裁决项，未跑重型check/official/protected、未提交推送合并。下一片从写入计划余下专测选实际pending、先核Owner/机器状态；不再将已关闭源误算新增主体。

## 第五片准入：写入计划专测与事务测试职责

2026-10-29 Codex build allowed：用户指定的 `migration-write-plan.glm-o.test.ts`、`migration-write-plan.glm-next-wave.test.ts` 两原pending主体，已核39路径WIP检查点完整匹配、fetch成功0/0、看板无其它Owner，单一Owner Codex。生产builder/transaction/CLI及已有相邻证据按有效版本复用；本片不改产品签名、journal/schema、写入行为或生成物。

按复杂度拆两子片：先纯builder专测（合法磁盘快照、独立字节oracle、校验边界、重复与注释），再从旧glm-o移出事务/journal/恢复生命周期专测到独立文件。新承接文件只记辅助，不凑原pending主体；旧→新身份和必要断言逐项映射。无必需产品取舍，坏journal只进入原始JSON IO边界；测试夹具错误不能报成产品缺陷。临时反控串行、精确恢复，定向/相邻与typecheck集中本片末运行，重型门继续留约100稳定窗口。

## 第五片局部验收与当前交接

2026-10-29 两原pending主体全文八维及必要返工接受，累计18／约100；新增事务承接专测独立八维接受，4辅助均不凑主体。纯builder/快照一致性与raw journal/commit/recover生命周期分文件；真实loader取代强转夹具、独立字节/Node crypto取代格式自比，组合失败轴拆开。旧symlink precondition因write hash缺失提前假绿，精确探针确认测试缺陷而非产品漏洞；补齐合法journal后才核真正路径守卫。

三项反控旧1/1/4绿、新各唯一指定业务AssertionError，所有source/test字节恢复。18旧身份→22现有身份＋2新增控制/反向索引共24，无业务合同退休；最后补强正控目录和回调当时磁盘视图，精确版本桥保留反控信用。最终12文件104绿、migrate TC0、显式default+json完整原件，生产三源本片前后字节不变。当前3468／795closed／24review／2649pending，0新增closed；单一治理分支0/0，未跑重型check/official/protected，未提交推送合并。

下一片从transaction主测/边界/glm-o实际pending选择有限范围；复用本片生命周期/排重证据，补未知typed输入域与八维，不能因相邻全绿自动关闭。先核Owner与机器状态，不扩大资产管线授权。

## 第六片准入：事务主测与恢复边界

2026-10-29 Codex build allowed：用户指定的 `migration-transaction.test.ts`、`migration-transaction.boundaries.test.ts` 两原pending主体，核看板/现行卡无重叠Owner；42路径WIP指纹完整匹配、默认快检通过，fetch后同一治理分支与最新main为0/0。单一Owner Codex，不委派、不动主树。

先逐合同核提交/中断/manifest切换/并发保护，再核真实journal的未知IO拒绝及恢复；主测raw篡改合同按职责迁边界专测。只整改合法夹具、独立oracle、组合/重复/弱断言、误导注释和测试组织；生产事务、CLI、journal格式、生成物和写入策略冻结。实际生产caller与上一片控制/生命周期证据按相同指纹复用，不重复整包审查或反控；若发现产品行为风险，另登记并执行原停止线。重型check/coverage/protected继续延后约100稳定窗口。

## 第六片局部验收与当前交接

2026-10-29 两原pending主体完整八维接受，累计20／约100，4辅助/2旧关闭重审另列。提交主测与raw恢复边界分责；10旧身份映射20当前身份，拆退役/manifest拒绝及恢复坏轴，重复id合同合一，原必要断言均有去向。去上层SHA oracle、核心cast/宽catch、自制只看普通文件的walker，补真实二次恢复及全树不变。

错误来源与目录所有权两变异分别旧选中1绿、新指定单AssertionError；最终precondition只改target并维持匹配的owned victim，r2再核最终spec字节，source/spec恢复精确。最后12文件114绿/TC0、完整default+json无诊断；生产源码不变、无待裁决项。当前3468／795closed／26review／2647pending，新增closed0；仍同一治理分支，重型check/official/protected/提交推送合并未启动。

下一片从transaction.glm-o/kimi实际pending专测选有限范围，复用本片真实pending/全树合同与精确错误反控；核typed-invalid及与当前更强合同的重复，不因相邻绿关闭其它文件。Owner与分支状态仍须接手先核。

## 第七片准入：事务剩余专测与类型边界

2026-10-29 Codex build allowed：用户指定的 `migration-transaction.glm-o.test.ts`、`migration-transaction.kimi-r1.test.ts` 两原pending主体，44路径WIP/快检一致，看板无重叠Owner；首次fetch TLS失败，重试fetch-r2成功，同一治理分支与最新main为0/0，单一Owner Codex。

按typed commit与unknown journal、编译期合同拆片。只改专测及必要同域共享fixture/编译合同，修误导注释、核心强转、非法typed夹具、重复/弱断言及隔离；新辅助单独八维、不凑主体。生产事务/CLI/格式/资源策略冻结，不以坏fixture制造产品缺陷。复用已接受主测/边界/ownership合同，精简须逐身份和断言映射；runtime与typecheck分别记录，重型check/coverage/protected继续延后稳定窗口。

## 第七片局部验收与当前交接

2026-10-29 两原pending主体及两个新增辅助分别完整八维接受，累计22／约100；6辅助/2旧关闭重审不凑主体。旧35runtime身份→当前34，组合拆轴、重复迁相邻强合同；非法typed null/undefined退出到compiler-only合同，合法baseline own undefined直接验证runtime own-key。共享journal输入只填充caller预先登记root，不管理runner清理或充期望结果。

规范化排重与cleanup字节两反控各旧1绿/新单业务红，source/spec恢复精确；最终12文件113绿、TC0含7编译合同，default+json完整输出无诊断。格式首跑exit0带1warning/3info拒绝信用，手工修复后0诊断。当前3470／795closed／30review／2645pending；生产源码/配置不变，无新裁决；仍同一分支、未跑重型check/coverage/protected或提交推送合并。

下一片候选为计划/事务相邻专测或merge模块，先核机器状态/Owner及当前证据；已审文件不因相邻未审而重复全文，也不因包绿替其它文件接受。无下一位Agent提示词，Codex单Agent继续。

## 第八片准入：计划／事务衔接与写入快照守卫

2026-10-29 Codex build allowed：用户指定 `migration-plan-transaction.glm-r1.test.ts`、`migration-write-guard.test.ts` 两原pending主体，48路径WIP与快检一致；fetch成功、同一治理分支与最新main为0/0，看板无重叠Owner。单一Owner Codex，主树不写。

先核manifest单例/基线退役的低层计划输入，再核真实snapshot→plan→changes→commit/recover链路及暂存窗口IO。只改专测、必要注释/夹具/断言与证据；生产源、journal/schema、接口、生成物和安全政策冻结。复用已接受写入计划／事务边界／编译合同，重复或非法typed身份逐项映射；原生透传FS注入只用于确定暂存时点，不能mock业务或把次数当唯一oracle。重型check/coverage/protected仍等稳定窗口。

## 第八片局部验收与当前交接

2026-10-29 两原pending主体完整八维接受，累计24／约100，6辅助/2旧关闭重审另列。修baseline不一致fixture及缺席delete必抛错的错误注释，真实hash-only原子地图快照/完整Changes区分磁盘两状态；去写入守卫非法typed cast和重复规划例，15旧身份到14当前及强合同/编译去向。原生透传IO只用于两个暂存时点，不mock业务。

pending清理与输出缺换行两变异分别旧选中1绿/新唯一业务红，source/spec恢复精确；112相邻/TC0，default+json完整原件。初次13绿1红是作者把stage写次数误当注入次数，改bool后14绿，原失败不作产品红例。当前3470／795closed／32review／2643pending，生产三个源字节不变，无新裁决；全仓check/coverage/protected及提交推送合并继续等窗口。

下一片候选merge模块，先核Owner/机器状态和已有证据。已审测试/fixtures只作有效依赖复用，不重复计数；相关性或包绿不授其它pending信用。无下一位Agent提示词，Codex单Agent继续。

## 第九片准入：三方合并与主测

2026-10-29 Codex build allowed：用户指定 `migration-merge.ts`、`migration-merge.test.ts` 两原pending主体。50路径WIP/快检一致，fetch成功，同一治理分支与最新main为0/0；看板无重叠Owner，单一Owner Codex。

复杂模块分为内部无行为清理、主测质量、迁移边界三子片。私有primitive标志全7处实参恒false，对应reader死分支可清理；新缺陷先单独风险卡/只读复现，未经裁决不改合并政策。主测不把泛型JSON样例冒称完整current工程，逐例核冲突完整性、snapshot ownership、合法输入/去核心强转、复合拆轴与重复。已有三方策略/资产/内容来源按版本复用，重型门继续留窗口。

## 第九片局部结论与当前交接

2026-10-29 两主体全文八维完成审查，主测质量整改局部接受；实现因[自有JSON字段](QUALITY-MIGRATION-MERGE-OWN-JSON-1.md)、[已接管资源快捷路径](QUALITY-MIGRATION-ASSET-TAKEOVER-1.md)两个新裁决阻断，不计实际完成。当前26已读／25完成／1阻断，6辅助与2旧关闭重审另列；不要将26写成完成，也不把review写成closed。

私有primitive恒false reader/形参移除：七调用与两strict选择逐一证明、允许变换后语法一致，复用Kimi已登记的死支证据，不冒报新发现。主测去核心cast、重复调用自比和同槽add-add弱演示，纠正真值表/旧版本标题；22旧身份完整迁到31当前身份，增加的是组合拆轴而非新业务轴。完整结果与file/path/type/三侧快照代替部分匹配；错配base快照变异旧选中1绿、新唯一业务红，精确恢复。

最终14文件168相邻、migrate TC0、局部Biome0/0/0；default+json完整原件、stderr0。counter初版collector误把预期exit1当执行异常，finally已恢复；r2核原生状态后重放相同反控，原始两轮均保留。后继仅删未用fixture参数，有允许的精确桥和最后168候选证明，不重复未变反控。

两项风险只读复现，未写正式产品红例、未修行为；合法generic JSON不冒称完整current工程，合法asset catalog也未证明普通基线可达。已知无id页洞和邻测假深克隆轴保留后继审查，未擅删政策、未给予相邻全维。当前3470／795closed／34review／2641pending；重型check/coverage/protected及提交推送合并仍留稳定窗口。

下一独立切片可选merge的boundaries/GLM/Kimi余测，先核Owner、待裁决答复与现有读域，复用全文和历史页洞材料，只补八维缺口。两个行为裁决答复后另先正式红例再窄修；不把无答复当批准。Codex单Agent继续，无分派提示词。


## 第九片获批返工续行

2026-10-29 两项用户裁决均明确批准。Codex核54路径检查点精确一致、fetch后origin/main与当前分支0/0；单一Owner不变。复用429/407行全文八维和现有合同，不重开已审24主体。新增正式反例覆盖自有字段/冲突缺席/安全结果定义及真实plan承接、base已接管资源与正常迁移更新正控；先完整红，再分离JSON字段与资源快捷路径两个实现检查点。未经最终验收不先改blocked或完成数，重门/coverage/PR仍留稳定窗口。


## 第九片获批返工验收与当前交接

2026-10-29 两项产品裁决均按批准范围闭合代码：5条JSON字段/真实计划反例与1条合法已接管catalog反例先正式红，原31绿；JSON单独检查点36绿/资源1红，第二修复后同字节37绿。own-key枚举、缺席读取、安全data-property与canonical资产路径分别有精确允许差异，纯重构检查点不改写为行为不变。无键黑名单、公共接口/格式/生成物或实际资源写入。

原31例与helper语法完全不变，新增6逐例caller/oracle/隔离/判别力已核；必要的not.toThrow把DataCloneError转成明确业务断言。已有snapshot反控仍绑定冻结private源，当前conflict/选中case不变并有新版本桥，不重复执行。最终16文件215绿（含主测37）、TC0，完整default+json/stderr0；未将重叠计数相加。已知无id页洞仍限unsupported-current低层characterization，当前合法scene页/stage具ID、包根不出口merge，CLI先current闭包再commit；不对邻测或历史缺陷授新关闭信用。

当前26原pending主体实际完成，0阻断；6辅助、2旧关闭重审另列。3470／795closed／34review／2641pending不变，所有review仍等统一门，没有新closed。保持同一治理分支与54路径WIP边界，重型check/official/protected与提交推送合并继续集中到稳定窗口；下一相关切片仍为merge三邻测八维/旧引用/假深克隆与排重，只补已有证据缺口，不扩其它任务。

## 第十片准入：合并边界与 GLM 专测质量

2026-10-29 Codex build allowed：用户指定 `migration-merge.boundaries.test.ts`、`migration-merge.glm-o.test.ts` 两原pending主体。54路径检查点逐项匹配，fetch后与origin/main为0/0；看板/现行卡没有重叠Owner，单一Coding Owner仍为Codex。merge/source/main及三方caller的已验读域与两项已批红绿按版本复用；旧215报告中8+28原目标身份为现版本基线，不重复跑同字节基线。

只修专测/必要注释与证据：拆原子真值表组合，去核心cast/无效条件变异，精确冲突快照和输入/输出所有权，正确JSON Pointer反例；stamps/sprites恢复生产根数组形状，catalog先核合法性。确定重复逐条映射到更强既有合同，当前页/stage身份与旧无ID位置模式明确分域；不将历史schema/源码行号当当前事实，不修改既有页洞或资产政策。生产源码/公共出口/规则/config全部冻结。串行两项必要业务反控后，一次当前定向/相邻与TC；重型check/coverage/protected/PR继续等稳定窗口。

## 第十片局部验收与当前交接

2026-10-29 两原pending主体全文八维及必要返工接受，累计28主体，6辅助与2旧关闭重审另列，不凑数。边界专测8→11，复合presence调用拆轴，重复普通值冲突/迁移新增去主测强合同；GLM 28→24，输入不变并入同一entities例，旧中删/动作原子/两行构造器重复映射强合同，36旧身份全部有去向，无业务合同退休。

GLM核心14处as/6处!及边界5处!消除；模板/精灵伪@string对象改为生产根数组，当前validator先核合法正控，完整时间线/作者记录代替keys/contains；普通最小JSON不冒称完整工程。无id页明确仅低层characterization，不修/不声称当前schema或旧洞已闭合。失效行号、错尾增标题与已不存在的报告引用清理；root缺席非法身份的诊断base是算法逻辑empty，不冒称物理文件快照。

深克隆由scalar条件空分支改为真实嵌套输入与输出的双向引用观察；Pointer由无冲突改为实际冲突路径，分别核~0/~1。两项同变异各旧选中1绿、新唯一指定业务AssertionError，finally source/spec逐字节恢复；最终16文件214绿，含两目标35，TC0，default+json完整raw/stderr0。生产源、已接受主测及Kimi同字节，原37产品红绿继续有效，不重跑；没有修改产品、API、schema、资产政策或配置。

当前3470／795closed／36review／2639pending，0新closed；重型check/official/protected及提交推送合并仍等稳定窗口。下一片可选Kimi合并余测或其它不重叠pending模块，先核Owner/机器状态、复用本轮读域与页洞历史，只补八维缺口；不凭214绿接受相邻文件。Codex单Agent继续，无分派提示词。

## 第十一片准入：Kimi 合并余测

2026-10-29 Codex build allowed：单一Owner仍为Codex，看板/现行卡未发现 `migration-merge.kimi-r1.test.ts` 重叠Owner；56路径WIP逐项匹配、fetch成功、同一治理分支与main为0/0。原10身份与当前已验source/caller/相邻读域按固定版本复用；上一214报告包含原10例，不重跑同字节基线。

仅改此专测/必要注释与证据，生产规则/公开出口/schema/资产管线/config冻结。清过期LCOV/已删除primitive/行号注释，补完整冲突oracle及排重映射。旧无ID页洞是未修缺陷观察，转证据保留，不把undefined与空洞等价当正确性；对应运行回归用当前带PageId的合法页，核作者修改/连续输出，不修改旧fallback。必要指定业务反控串行恢复，再一次定向/相邻与TC；重型门/coverage/发布继续留窗口。

## 第十一片局部验收与当前交接

2026-10-29 Kimi单原pending主体全文八维与必要返工接受，累计29主体，6辅助/2旧关闭重审不凑数。193旧行到299当前行，清失效LCOV/行号/已删primitive注释，顺序用例补独立完整value和三侧冲突，普通集合修正伪items根object；根缺席ID并集重复由已接受boundary更强合同承接，10旧身份到9当前和明确去向。

旧无ID洞的toEqual把空位与显式undefined视同，不能当正确输出oracle；只读观察确认own indices为0/1/3、slot2缺席，全文raw与旧spec留存，旧洞未修。运行回归改为当前带PageId的对应合同，三侧先过真实公开checkBaseEntityPages、沿entity/pages和稳定initialPage合并，toStrictEqual核完整作者修改/连续输出。它与旧域不是等价输入，不冒称支持旧schema或已修洞；另两无ID例只保留低层观察范围，不新授产品兼容。

临时去掉保留作者独有项的逻辑：旧选中位置观察1绿、新合法PageId回归唯一业务AssertionError，source/spec finally精确恢复；新身份与counter候选同字节。最终16文件213绿含9目标、TC0，default+json完整raw/stderr0；生产源/已接受主测/boundary/GLM四文件同字节，原产品红绿与214旧结果按版本复用、不相加。

当前3470／795closed／37review／2638pending，新增closed0。合并五文件当前声明范围均完成代码审查，统一门仍待较大窗口；旧无ID模式退休和缺陷不由本片擅修。下一候选migration-plan.test.ts仍pending，开工前核Owner/账本/已有读域；不把213相邻绿当主测已验。仍同一治理分支，重型check/official/protected与提交推送合并未启动，Codex单Agent继续。

## 命名与组织补审（用户2026-10-29）

用户追问AI名称及历史closed。此前F/G把文件内命名与删除影响当成充分，漏了按作者/批次分文件的长期组织成本；这项信用纠正，不重做已有效的正确性/测试考据。转[命名组织专项](QUALITY-NAMING-ORGANIZATION-1.md)登记178个旧closed静态候选为review，仅F/G待补审，原证据留存；不是178项新产品缺陷或新增全文复审。

本片先将刚审的boundary/GLM/Kimi三专测按JSON、数组身份、内容记录重组，44回调/闭包/七helper与原合同逐项迁移，生产merge/main/plan和主测不变。16文件213相邻、migrate TC0；新名字与旧raw各属自己的版本，默认快检有精确映射。原29已读中另9项仍按模型/批次分文件的F/G取舍未核，完整完成更正为20、9项F/G待补；6辅助/2原旧关闭重审不变，另178旧closed只作命名维度补审。migration-plan.test.ts已读，尚未整改或新增验收，不把相邻绿充其审核完成。

重型check/coverage/protected、提交推送合并仍待稳定窗口，不因改名立即启动。下一步继续plan主测必要质量返工与同模块职责命名判断，未知旧位置域政策不扩张。

## 命名组织返工后当前进度

原9项F/G欠账均处理，17输入专测按纯baseline/磁盘、普通文件/地图计划、发现/snapshot、project/baseline/排序、typed入参/lifecycle/raw journal归为12文件。131原身份/105注册与闭包保全，两个helper结构问题在本片解决；原受审29主体全恢复代码信用，当前实际主体路径25，不以搬移或依赖补读凑百文件。6辅助与现存原重开实现1另列，旧重开主测已融入当前snapshot/discovery承接，不重复计。

随后历史178命名cohort首模块shared四项完成F/G补审，余174；复用有效A–E/H，不计入本窗口新全文主体。39RLE身份/37consumer、106相邻及shared TC0，原codec/格式/生成物不变。当前3464／615closed／211review／2638pending；两个相邻旧关闭路径随重组暂review，0新closed。重型门、coverage、protected及提交推送合并仍留稳定窗口；完整文档门的E2E期限阻塞未伪装解除。

## 2026-10-31 集中代码接收

原29主体与命名历史固定178沿各自完整八维/版本桥接收，当前317路径汇总见[窗口收尾](../evidence/QUALITY-PENDING-100-3/local-closeout.json)。全仓20,548／单次fast20,199及同报告ratchet/protected通过；最终文档静态与发布待办，不声称已合并。5个范围外cov85文件F/G继续review，原有效行为证据保留；其余2632pending不改。

## 2026-10-31 本地门与发布交接

本窗口代码接收、完整原件及最终文档/静态复验已完成；check20,548、单次fast20,199、同报告ratchet/protected、6301文件lint零诊断。行为修复1c0de481a与职责重组7f6b41d9a分提交；本卡转review只等待同一治理分支的PR、远端必需检查与合并，未声称已发布。历史阶段性待门文本按当时范围保留，以本节及窗口local-closeout为当前本地状态。固定cohort178已补审，本goal174无剩余；范围外5项F/G仍review、2632pending不动。无下一位Agent提示词，由Codex完成发布。
