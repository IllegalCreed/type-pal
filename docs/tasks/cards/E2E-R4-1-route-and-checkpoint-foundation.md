# E2E-R4-1 — 路线驱动与合法检查点薄基线

Status: build
Owner: Codex（当前状态维护与后续协调；原执行身份见原件）
Last reviewed: 2026-11-05
Template: task-card-v1 / 1.0.0

本页维护R4现行推进位置；原调研、准入、实现、实跑、失败与用户裁决在下方quote逐字保留。2026-10-02的下一步与“本轮未生成录像”均限于原时点；2026-11-03的文档核对仅据后继原件更正状态，不新增产品、E2E或视觉信用。11-04新执行范围以下文原件为准。

## 目标

- 在当前canonical上完成前十段路线驱动、合法检查点薄基线、四种取物canary及一条“编辑→保存→重开→试玩”工作流；既有001–006按各自有限接受复用，不重复建设或据此宣布R4整体完成。

## 范围

- 同引擎真实前驱与正式存档恢复，双阶段各按实际输入/报告验收。后继006仅接受其求药、出海、完整岛口收尾及明确编辑预览范围，不外推后期剧情、未跑专项或当前全链。
- 薄基线先于N6b窄版及其同基线复验；完整Q1/Q2、综合编辑器E2E、capture/音频与发布闭环分别后置，N6b开工时再核canonical版本，不沿用旧预占号。

## 状态与交接

- R4保持build。001–006连续链已在冻结33afa37候选独立接受并合入主线，见[连续卡原最终验收](../archive/done/E2E-CONTINUOUS-001-006.md)；10-27的006后继技术/C1与用户短片判断另由[006当前卡](E2E-006-1-inn-doctor-and-boat-to-island.md#状态与交接)和[唯一正式报告](../../testing/e2e/stages/006-doctor-boat/report.md)持有。前轮12入口/11状态与起伏补修后11入口/10状态分轮保留，不升格为新同版001–006全测。
- 下一步由Codex核准前十段尚余边界与实际接受，补齐剩余薄基线、四取物canary和完整编辑保存重开试玩；006已闭合部分直接复用，不再以“协调006接入”作待办，也不以其NPC预览另存样本代替整条R4编辑器基线。
- 运行器独立deadline与自有进程清理已有[后继实现及专测提交](https://github.com/IllegalCreed/type-pal/commit/f83f2aebb75eb50d1bd20abcc4b45db131b2a076)：当前caller对launch/connect/newContext、整段与清理分别限时，专测含真实Chrome挂起newContext后终止/回收。连续卡保存更早45秒超时及后继含真实Chrome watchdog的379/384工具门记载。本次只核当前实现、测试与Git承接，未取回该专测原生运行包或新跑故障；不据正常001–006授异常通过，也不再称机制仍未实现。后续先定位原专测执行身份及当前受影响边界，再决定是否有具体补验缺口。
- 原294场景/4459 stages/195 machine/13849 stepEntity只作原调研快照。当前格式与推进顺序以[能力地图当前层](../../phase2/capability-map.md#当前状态)、各段原件及本卡为准；六段有限接受不刷新全表、全量剧情或录制/音频状态。

## 2026-11-05 001–006脚本与预览基线收尾

本节是本轮当前结论；下方11-04各次保存、缺口与待复核查询保留其原时点。本卡仍为build：本轮关闭001–006的指定脚本审查、当前场景静态初态与保存复验，前十段、四种取物canary及完整R4工作流继续按原范围推进；未开始007。

- 唯一[逐步骤台账](../../testing/e2e/cross-stage/script-progress.md)保留原160事件，追加当前复核。完整核读120个唯一步骤（原83、同方案/已安装后继及3个遗漏出入口），共130个调用/静态审查context；59步本轮无需行为整改，61步完成必要命名整改。110个label字段（52方案、58步骤）由根精确应用并经非作者逐字段审查，5份场景除这些字段外零变化：指令、顺序、next与稳定ID保持。楼梯24拍节奏、环境随机动作、随从姿态轮询及已接受的船行nudge均有具体用途，不机械合并。
- 初态按95个实际入口现场验收，仅授已观测当前场景NPC/区域静态字段；其中12个为手动选择的回访现场，播放/重置后撤销临时默认选择，原绑定保持。另34个只读相关步骤没有初态实跑信用。旧001 e25现场缺pose，仍为unreviewed；新正常RF001的run12/首命令8713另建现场，不倒填旧记录。13个涉及未观测跨场景目标的现场明确保留该限制，s000无NPC不虚构实体证据，不授party、背包、在途帧或并行auto完整恢复。
- 编辑器真实配置、Save与正常重开后为39份初态、309条实体覆盖、43条步骤绑定。28份旧状态逐值保持；3份苗人头领状态补齐e63/e64隐藏且不挡路，划桨状态按首命令时点修正两项四分之一格行坐标，7份新回访初态由UI创建。原42条绑定逐值保持，仅新增e25到既有“大娘离开后”状态的默认绑定。全部309条保存后Inspector属性逐项读取，0缺失/重复/差异；83个默认入口及12个手动现场完成SingleStep/Reset与作者场景/脚本选择保持。此项核起播和复原，不替代全演出视觉验收。
- 普通Save修复已接收为`6b8cd0aea0089825c880f48b0018e819f493975c`：打开态作者输出快照与确切磁盘基线分工，同目标保存仅写相对打开态的修改，真正新目标/SaveAs仍完整复制。实际FSA首笔改名/保存/重开及恢复保存中，2473份受保护文件只有预览侧车字节和mtime改变，未改资产不重暂存；最终39/43保存事务committed。PAL首绑资源验证、冲突/恢复协议与浏览器安全设置未改；没有证明旧Safe Browsing内部拦截原因，也不授任意资源变化的耗时承诺。catalog变化仍可触发现有保守引用表重写。
- label-only摘要变化后，公开执行器正常取得RF001→002→003→004 saves→005 saves→006六份同版passed报告；前驱逐段按正式reader与真实终档SHA衔接。006正式终档及fresh恢复通过，终档SHA `6a1e7c69632a29ecbc908e8df38fac18ff02b5cea3a9bd0054cca7e922e0c85a`，工程摘要 `6506aaf10473b1aa5375caad65162e762d9946670f4a7298ac0e1ae4f30d79af`。后续输入为`build/e2e/reforge-006-2026-11-04T14-32-37-544Z/report.json`及其正式终档；原件包可恢复。未新跑Game、items/guards、音频或双轨船行视觉；006既有用户接受保持。
- 独立验收核2694个报告声明文件hash均与当前文件匹配；001/002原生报告没有sourceHashesStable字段，保持缺字段，不补写during-run稳定测量。001/004/005各一条Canvas性能提示原样保留，不将其写成零运行告警。Save作者217项真实caller回归与单业务反控复用同候选原件；根62项插桩/trace回归、有效e25缺采样反控及恢复通过，首遍fixture缺e25的TypeError失败仍保留。根全仓typecheck、lint（6678文件、0 error/warning/info）、39项脚本台账工具测试通过。

测试文档只更新e2e-001/common-issues的e25观测源pin和适用边界：两篇报告、catalog两个条目及两份配对原生JSON由独立作者审查，根核实际差异、5份afterSHA与消费者；其余18条catalog、原claims/history/runtimeExecution与治理字段精确保留。原生JSON沿现有测试证据合同，不登记到只接收Markdown的位置迁移表，也不改写旧执行为新通过。具体原件为包内trace-docs-receipt.json。

收尾文档门发现维护合同缺口：两份`document-audit-v2`是可更新来源说明的审查文档，却同时受rollforward历史整字节锁定；只刷新after会破坏旧签名，不能据此重签历史。实际consumer又证明，catalog虽有零信用维护记录机制，位置迁移门仍冻结其review载体，不能直接刷新并重打包旧review；根已保留失败并精确撤回该尝试。2026-11-05 build allowed：贡献者`/root/e2e_baseline_docs`在隔离树为这两份audit及原catalog身份补充严格的来源维护校验与必要测试，Codex独立验收。白名单为该原生维护校验、其准入数据、rollforward/current-native-control/document-location消费者、对应测试及文档模型说明；不更改旧review行、签名、原始执行或其他原生路径规则。只允许已独立核过的sourceRefs哈希更新、保留旧findings的适用说明及catalog对应两条reviewScope说明，逐项核实际来源、固定前身和精确候选SHA；候选外字段变化、增加运行信用、坏来源或未准入路径必须拒绝。验收须保留旧字节保护反例，并实际通过新消费者、相关测试和全仓文档门。

该维护缺口现已独立接受并接入`e79c95698ff2176e4825789b17297616675e442d`；真实CLI夹具仅补齐新增模块的复制清单，后继为`ad3b91b13`。作者新增合同8项、相邻76项及terminal34项通过，来源比较单项反控恰1个业务AssertionError，最终候选恢复全绿。根实际完整`pnpm check:docs`通过513项测试及全部后续文档门；lint覆盖6681文件，error/warning/info均0；台账810事件、130审查现场和95当前场景初态现场，needsReview/orphan均0。旧review行、签名和执行原件逐字节保持，早期夹具错误、位置门失败、撤回与恢复均在[末轮质量原件包](../evidence/E2E-R4-1-final-quality-20261105.tar.gz)中单列，不能作为运行或覆盖率信用。

本轮清理限定为可重建缓存及已封存的废弃更新器；原7份缓存净减33,429,509字节，封存后另清除2份自有衍生文件净减64,956字节，共9份、净减33,494,465字节，恢复入口见本地`build/e2e-preview-closeout/post-seal-cleanup.json`及两包索引。必要原件新增2包共31,278,672字节；这不是全仓净体积结论。末轮附件登记后的轻量复验及清理回执由Codex保留在本工作树build目录，待本分支远端CI/合入回执承接后复核退出；当前开发服务、合法006后继缓存和原未跟踪save-state保留。

[本轮最小原件包](../evidence/E2E-R4-1-script-baseline-closeout-20261105.tar.gz)保存作者/独立回执、必要失败与恢复、UI逐入口/属性观察、六段当前报告/终档和006恢复；包内archive-index逐件提供SHA。旧001–005复用既有基线包，旧006复用固定Release `evidence-e2e006-20261027`及其验证恢复回执，不再次复制旧运行树。源码按上述固定Git提交恢复。本轮未把当前开发服务器或未跟踪save-state登记为交付；原未跟踪文件保留，不入Git。

2026-11-05用户要求提交PR：本分支对齐主线`08d67e28ec454d29941f8fab614644c5e160d790`，只协调文档位置表及其准入摘要的冲突。主线清理规则/原卡与本轮R4/初态记录均保留，共用看板和生成索引按合并后的真实正文重新绑定，旧review行及原生签名不改。编辑器、Reforge运行时、PAL场景/预览配置与`c01daf490`逐字节相同，沿用其游戏及UI证据；新组合只补受影响的中央文档、静态与迁移工具检查，远端检查另取PR原生结果。本工作树/本地与远端功能分支仍用于PR及当前会话；初态与Save作者分支/worktree仍承载固定来源，保留至CI与合入回执承接后核消费者再退出，其余会话资源不在本轮处置范围。新的合并复验原件留`build/e2e-preview-closeout/pr-preparation/`，Owner为Codex，退出触发同上；不新增临时worktree或原生档案副本。

PR44首轮CI追踪：coverage run `41954840381`、job `127007149647`在前置quality-tools以43/45退出，覆盖率尚未采集；原始日志保留在`build/e2e-preview-closeout/ci-followup/`。一项为真实docs-index隔离CLI漏复制新来源维护模块，另一项为代码治理账本仍声明3636条、实际tracked库存3651条。用户已授权修复CI并在必需门通过后合入主线。build allowed：`/root/e2e_baseline_docs`只在隔离树补`code-quality-inventory.test.mjs`的实际依赖清单，全部原断言/反控保持；Codex单写库存账本及中央绑定，只更新经真实生成器核过的库存/未核汇总，846条live行与closed计数原样保全。修复不授代码专项新关闭，不改门槛、排除、覆盖率规则或产品；根核源差异和恢复后继续跟踪同一PR原生检查。

首轮修复已接入`51b581bd4`：夹具恰新增两条真实模块路径，作者单文件5项通过；库存两条汇总经独立复核为3651/846/0/2805，16新增、1删除均不涉及原846条live，整块字节保持。根完整quality-tools恢复45/45，文档结构/模型和lint零诊断；远端必需门及合入事实继续取PR44原生结果。必要失败、源码/库存身份和恢复原件新增1份[CI质量修复包](../evidence/E2E-R4-1-ci-quality-recovery-20261105.tar.gz)，复用此前执行/保存/预览原件；本轮没有删除其它资源，CI临时材料仍按上述Owner和合入触发退出。

同一PR后继head `83f80fb40174834ab3e4ab05ac1713e4ad9550ca`的documentation通过；coverage run `41956913787`在editor报两项失败：初态字段根的测试调用全量审计超时，G03保存生命周期测试只修改manifest却要求content写闭。根定向核当前保存实现及project-lifecycle合同：同目标未修改正文必须保持原字节，不能为恢复旧测试而重写。build allowed：`/root/raw_initial_state_audit`在隔离树只维护`packages/editor/src/__tests__/architecture-lab/app-lifecycle.test.tsx`，补一笔公开命令产生的合法内容修改及确切落盘oracle，保留committed终态、卸载后零IO与断开派发断言；产品保存实现、协议和超时不变。初态审计先由`/root/e2e_baseline_docs`只读测量归因，确定最小整改边界后另行准入；不得提高deadline或绕开真实组件遍历。原生失败日志与后继恢复由本轮CI-followup原件持有，未通过前不合并。

审计定向准入：原生测量确认`deriveFieldAdoptionTruth`默认遍历32个登记页，而新增测试仅断言初态页。build allowed：`/root/e2e_baseline_docs`在隔离树只改`packages/editor/scripts/design-system-audit.mjs`及`design-system-audit-layering.test.mjs`，为同一派生函数增加已登记页的明确查询范围，初态测试按真实初态根遍历；默认全量结果、manifest/CSS/source缓存失效、字段所有权与连接规则不变。错误登记名须明确拒绝，保留三项初态断言及三个路由反例，以默认全量输出与定向输出的原生投影一致性、定向与相邻回归和覆盖率条件实测验收；不改任何deadline、runner选择、覆盖率配置或产品模块。

根根据实际三文件差异、作者逐文件A–H及原生结果独立接受第二轮定向修复，保留作者提交`84ec961ed8bb4217fab72c38d8a8b472f2788f98`与`85b7c6c606112a84a730af459c91df3f7a254546`，组合为`7d397fac27422c51be6bdfbc2d87aaa7252e09a5`。G03及相邻增量保存10项、审计V8定向12项与相邻10项均通过、无跳过；默认32页JSON与原版逐字相同，全部定向查询均等于全量对应投影。根核源码/依赖与原件SHA，未重复作者同候选测试，不授新UI、E2E或whole-file关闭信用。第一次本地完整coverage预检仍如实失败：迁移包O04两项同步图像语料测试超时，尚未进入editor或ratio门；该包从远端已通过的83f到7d整树字节未变，现有远端718项通过不改写为本地通过，也不据后时点负载推断已证根因。后继完整门和远端结果继续取实际执行。新建`ci-g03-lifecycle`隔离树仅属本轮，Owner为Codex；必要原件有持久恢复入口、作者提交可达合入main且无新Owner/进程/消费者后退役，旧作者树与当前会话资源仍按先前精确范围核查。

## 2026-11-04 编辑器初态补齐准入

用户追问001–006相关NPC初态是否已经在编辑器核对并保存，确认上一轮仅盘点而未补齐。build allowed：Codex为`projects/pal/editor/script-preview.json`单一写入Owner，在本隔离工作树复用006已接受范围，补核001–005真实步骤入口前态、配置、步骤绑定与编辑器保存/切换/重开/播放/重置；只读贡献者整理原始现场证据，Codex核实际投影与UI。必要时使用现有公开Reforge执行器正常重建当前版本前驱，不能改旧存档digest、正式场景/脚本或假定默认初态正确。现行说明写回本卡，逐入口证据留在本次原生回执；无新产品能力或测试规则变更准入。未完成项继续明确保留，不以静态JSON存在代替编辑器验收。

用户同日追加逐脚本线性记录要求：准入`/root/script_progress_ledger`在独立`codex/script-progress-ledger`工作树实现`scripts/script-governance`下的只读清单/进度工具、必要新测试及唯一持久进度事件文件；根独立验收后接入现行合同和中央文档记录。按场景/实体/通道/方案/步骤定位，未有证据一律未核；脚本审查、初态、优化分轴，保存有序历史和调用现场，版本变化派生待复核。工具不授运行通过、不改编辑器或游戏、不从旧done卡推断全部脚本已优化。

用户同日反馈保存卡死：首笔PAL开发基线保存实际在资源暂存阶段被浏览器拒绝（`Blocked by Safe Browsing`），原预览JSON未改变。准入贡献者在隔离树仅补普通Save缺失的staging/validating活动回调与必要新回归测试；不改事务、安全检查或复制语义。根保留失败原件、独立验收，并通过既有打开工程恢复入口处理未封存事务。001–005候选初态已按当前真实首命令前态与正式解析/投影消费者核对，配置持久化和逐入口UI复验分开记录，未完成操作不授verified。

后继editor整包采用当前官方fast选择、V8来源范围与固定deadline实跑，626文件/4836项全部通过，生产文件census精确匹配，S/B/F/L四项均高于保护基线；这仅接受editor整包，不将上述多包失败改绿。必要远端失败、两份作者交付、根独立核验、本地多包失败与editor恢复保存于[第二轮CI修复原件包](../evidence/E2E-R4-1-ci-editor-recovery-20261105.tar.gz)。远端必需检查与合入结论仍以PR44原生结果为准；该次复验未改覆盖率基线或测试门槛，后继范围同步另见下段准入。

第三轮CI `41964876884`在head `2dd5dbda46ab83958361002a51ae8f53a3adde1e`已完成七包20277项、822份生产源码，所有测试通过且覆盖率不降；最后仍因editor新增3份生产文件、fast测试文件7增1删及身份/摘要变化拒绝旧范围基线，不能称整个必需门已通过。根此前只核比值，漏同步官方范围基线。本轮build allowed：Codex单写`scripts/coverage/baseline.fast.json`，仅由现有官方ratchet按完整实测生成；先核真实删除/迁移的旧测试合同，必要时依官方选项明确允许已核范围退出，不移除仍存在的生产文件，不改选择、deadline、阈值、protected比较或退役规则。贡献者只读核身份迁移，根集中执行完整ratchet、复核与主线保护基点不降及新范围精确一致，再推送同一PR重跑必需门。第三轮原生失败及summary保留在当前CI-followup，旧失败与成功原件不改写。

范围核验由`/root/e2e_baseline_docs`完成：旧内嵌初态文件5例已迁至独立工作区与步骤预览，新增7文件29例、其余净增10例，4802→4836；唯一仍存文件下降为`SceneScriptWorkspace.test.tsx`的10→9，其画布选择/拖动合同由独立工作区与真实App已有用例承接，旧Tab断言随用户批准的入口迁移退出。根定向核实际新oracle及原生身份，build allowed：该贡献者在隔离树只为`approved-test-retirements.mjs`补一条精确10→9的双方identityDigest/当前fileSHA记录，并在其既有测试固定该条、保全原95条历史集合和既有反例；比较谓词与其它旧行字节不变。Codex核原生CI summary、固定旧基线及迁移证据后接收，再以官方`--allow-scope-removal`处理已核两项退出；不把一般UI批准扩成全表退役授权。

根按实际差异接受`5cd9684f74a719b865143a510a6bb102f763df88`的精确迁移登记。既有96条审批数据与比较谓词逐字保全，新增条目只匹配原生10→9两份身份摘要和当前文件SHA。定向Node测试112项通过，Biome两文件零诊断。官方`pnpm run coverage:ratchet --allow-scope-removal`对保护基点`08d67e28`完整运行，159项工具测试和七包20277项通过，覆盖822份生产文件。`/root/raw_initial_state_audit`独立核验官方投影与新基线精确相等，六个非editor对象与保护基线相等，32项比值24平8升。当前报告与新基线的范围差异为0，原保护比较对真实10→9登记与已删除文件通过。第三轮远端范围门失败和本地ratchet通过分别保留执行身份。原生报告及可逐字恢复的本地报告、两次命令的退出事实、迁移和独立验收收于[覆盖范围同步原件包](../evidence/E2E-R4-1-ci-coverage-ratchet-20261105.tar.gz)。后继必需检查和合入仍取PR44原生状态。

## 2026-11-04 基线收尾与逐脚本复核准入

用户在状态方案与跨场景预览接入并推送`8e7ea5b3c`后明确要求继续收尾，同时复核001–006所有相关脚本是否满足简洁性、合理性，并给对应入口分阶段标记。当前范围为既有001–006涉及的场景hook、实体trigger/auto及其真实共享/嵌套调用；全仓未执行步骤继续由工具枚举为未核，不把本批范围扩大成全部5492步骤，也不启动007验收。

build allowed：Codex为本树预览侧车、唯一逐步骤台账及本卡/看板的单一写入Owner；只读贡献者分别整理现有现场原件与入口映射、复核脚本编排、核保存管线根因。先复用已接受的006与已有八次RF原件，核当前v3迁移和实际影响，再通过编辑器完成逐入口切回、保存重开、播放/重置。脚本核对、初态与优化按三轴分别追加事件，未复验或能力不足的入口保留准确状态；正文核读不冒充实际演出，确认无需修改的优化结论须写明理由并独立复核。已接受的船行/漂浮结论按原范围复用。

保存调查先核source/target身份、脏文档与资产计划、事务活动及首笔拦截原件，定位后才冻结必要产品修复白名单。不得关闭浏览器安全保护或用脚本绕过安全拦截，不再无依据反复全量Save。正常编辑器Open/Save及可恢复的独立工程样本属于本轮复验；原PAL正文与既有未跟踪save-state先保全，试用修改不混入正式内容。需要改变正式演出或保存合同的具体修复另补根因、反例、单一Owner和验证范围；不凭本段概括授权批量改写脚本或共享存档协议。

保存缺陷定向准入：当前use-editor-project-session.ts的snapshotRef在正常Open后仍为null，首个Save用空Map令writeProject全写正文；HTTP PAL首次绑定时rememberDirectory又无条件启动assetCopyInputs，未改资产亦逐件暂存。原版及一阶段没有本作者FSA工程保存，适用真值为当前workspace-persistence的目标身份/空目标授权、AuthorDiskBaseline的确切原字节、journal的prepare/commit/recovery及现行用户“普通保存不重写未改内容”的意图。最强反例是单纯预置已编辑态快照而漏存修改、把真正新目标当同源而缺正文/资产、跳过PAL首存资源校验、外部修改或中断后旧快照掩盖磁盘变化。

build allowed：/root/ui_affordances为单一产品Owner，在既有隔离树从8e7ea5b3c创建codex/editor-incremental-save。白名单为use-editor-project-session、project-io及按真实职责必要的保存基线模块、open-actions/App最小基线传递接线、现行project-lifecycle与editor-architecture及真实caller回归；不改workspace身份政策、journal格式/恢复协议、schema或浏览器安全设置。实现编辑前规范作者输出基线与确切磁盘基线的职责分离；普通同源保存相对打开态做diff，只有真正空目标/SaveAs完整复制。PAL首次绑定继续沿sentinel/关键指纹及完整作者基线授权，保留首存全资源hash/格式验证；缺失/损坏/外改明确失败，不从HTTP静默覆盖。测试核编辑前捕获、首笔侧车单改不写未改正文/资产、真正新目标完整性、外改/缺资源、取消/失败重试和恢复，保留有效失败/反控与逐文件A–H。根独立复核后在真实编辑器验收保存重开；此准入不授性能或安全拦截已解决。

脚本命名定向准入：只读审查覆盖83个已登记步骤及同方案/已安装后继，共117步骤；59步仍有泛化或缺失标签。build allowed：根Codex为`projects/pal/content/scenes/s001.json`、`s003.json`、`s004.json`、`s005.json`的单一写入Owner，仅应用提案`naming-candidate.json`（SHA `46795935064cd2a21f1c7647ea351f60609a1a062288478ab9775850b7b0a5fc`）列出的106个label字段（50方案、56步骤）。提案按当前命令、对白和已知用途命名；不猜未具名实体身份，不改稳定ID、指令、顺序、next、绑定或006船行。只读审查者独立核完整差异和逐项语义；新名称改变canonical摘要后按正常执行器重建必要RF前驱，旧存档与原件不改写。楼梯逐拍、环境随机动作及随从姿态轮询有实际节拍/并行用途，不能因重复而机械删改。

初态观测补口准入：原001矩阵的实体名单漏掉`s001/e25`，不能用002恢复时的姿态倒填001前态。build allowed：根Codex仅在`scripts/e2e/opening-trace-plugin.mjs`的RF001已存在实体观测名单加入e25；不改游戏行为、调度、输入或判等。沿现有真实插桩回归核锚点和无副作用，再从正常起点重跑RF001取首命令姿态；保留旧缺证context，新执行另建context。标签补名还纳入006实际调用但旧清单遗漏的`s003/e49`、`s002/e32`两出入口，共4个label字段；仅描述其单条loadScene指令，不改行为。

观测增补源码复核：根完整核读opening-trace-plugin及实际RF001 caller、定向核真实projection回归。A：e25为当前s001固定实体，仍读已提交运行态，不写世界；缺实体沿原异常通道拒绝。B：原“只插钩、不改引擎表达式”注释继续适用。C/D：名单留在隔离RF001采样职责内，不另造全局观察器或共享抽象。E：原62项相关回归全绿；真实projection用例补合法e25输入和观测断言，移除唯一e25采样后恰一指定AssertionError，恢复后通过。首遍因fixture少e25导致TypeError的失败另保留，不算有效反控。F/G：沿稳定实体ID，只增必要样本，正式产品零变化。H：正常RF001首命令实态仍待实跑，不以此源码/工具测试替代。测试未新增case或覆盖率信用；普通dev/生产构建不加载此插件。

## 2026-11-04 当前执行与保存边界

本次使用现有公开执行器正常重建RF001→002→003→004 saves→005 saves→006，并分别采集004/005 story现场；八份报告均passed，当前工程摘要仍为`f88a584c3c64e3db35a5a3afa093035e7ff8177eafd8d54d3d737f1915ab469b`，006正式终档及fresh恢复已完成。此前“所核旧终档不可续用”的历史判断不改写，本次已取得新的合法同引擎前驱；未重跑Game、专项items/guards或新的双轨视觉验收，不撤销006船体起伏的用户接受。

001–005现场候选为22套状态、31个默认绑定，连同原006共32套/42绑定。第二笔committed保存时原00610套/11绑定逐值不变。候选按实际首命令前态、正式解析器与状态投影核对；同一步骤的不同现场保留context，缺现场的入口不自动配置。逐入口状态由[唯一脚本台账](../../testing/e2e/cross-stage/script-progress.md)持有，未录入步骤仍从canonical枚举为未核，不能从本段数量推断全部相关脚本已验或已优化。

真实编辑器操作先创建001大娘离房初态，但首笔PAL开发基线保存于资源暂存阶段失败，UI为`Blocked by Safe Browsing`；当时原预览文件字节未变。最后零字节暂存文件名对应`assets/migrated/sprites/002.rle`的内容SHA，此为落点关联，尚未证明浏览器拦截原因。常规Save漏接staging/validating回调另导致一直显示“正在准备工程文件”；已独立接收窄修复`4bdcd36c05c0523c9b2a2ed4caec59e69c7967f2`，4项定向回归及原实现反控支持进度修复，不授安全拦截已解决。

随后通过编辑器正常Open清理未封存事务、打开本工作树工程、载入候选并在UI修改001方案名称后保存。第二笔事务`bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4`已committed，界面显示已保存，预览SHA为`cdf2b616afbb1bbfd5ac7edce70f86788ef5426c9ea79282c74d622a3c4c4efa`；32套/42绑定真实落盘。保存同时重排296份未编辑内容：295份JSON深相等，skills按唯一ID逐值相等、仅数组排序不同；原生差异已保留后，仅撤回本次保存产生的正文重写，正式作者数据恢复原Git字节。未因此新增游戏内容变更。

随后用户明确否定初态tab的可理解性、卡片溢出与内部地址命名，转入[初态UI整改](ED-ENTITY-STATE-PLAN-1.md#2026-11-04-用户反馈与交互整改准入)。当前32份方案仅将名称改为中文剧情用途，实体字段、稳定ID及绑定不变；名称变更没有新增编辑器保存或逐入口播放信用。

用户再次质疑长时间保存后停止继续重试；首笔安全拦截原因和普通首次绑定保存的全量重写耗时仍待定位。001–005切回、保存后重开、逐入口Play/Reset尚未全部完成，当前不能称“完美基线”或启动007验收。台账工具还分别保留脚本核对与优化轴，未核项不由初态保存或剧情跑通自动完成。

本次[基线原件包](../evidence/E2E-R4-1-preview-baseline-20261104.tar.gz)保留8次RF执行报告、必要真实现场与正式终档、保存失败/成功及296文件重写的可恢复差异；SHA为`e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2`。后续用途名称及UI修复原件归[独立UI包](../evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz)，包内manifest列每件身份；恢复使用`tar -xzf <包路径> -C <自有空目录>`。不复制整棵临时运行树。

继承改造前的逐步骤台账为160条事件、5492个canonical步骤、86个调用现场；5495行查询中74个现场为初态已保存、11条006旧记录因名称及UI依赖变化待复核。该历史查询不改写；11条不是新发现船体观感缺陷。

同日[初态继承改造](ED-ENTITY-STATE-PLAN-1.md#2026-11-04-继承候选与实际页面复验)将侧车迁为v2并增加空方案默认，32份状态和42条步骤关联逐值保持。台账160条历史事件原字节不变；当前查询因共用初态模块依赖变化，将86个已有现场派生为needs-review，另5409行未核，orphan为0，`--check --against 2b83fc42f`按合同返回1。原recorded状态和原因均可查，不把格式迁移或工具UI回归续签为新的保存/Play/Reset，也不撤销006原有船体观感接受。脚本审查与优化轴仍各自未核；完整基线尚未收口。

## 2026-11-03 续办核对与预览初态范围

本轮按`document-delivery-acceptance / 1.0.0`准入文档状态核对和配置盘点；根Codex核范围与独立验收，贡献者`/root/e2e_baseline_docs`为本卡及006报告、阶段入口的单一写入Owner。只修这三篇现行说明，中央记录由根维护；不修改产品、预览配置、原始回执或catalog发布状态，不重开已接受的船体观感。

核对基点为主线`00e38451b4594512c9236d5e214eb47d2cdf6e89`；006最终候选`33cfb9ad89f8696802b7c2ec466fbc93cccf8149`已在其祖先链，任务卡done及PR38/39收口与当前看板一致。`node scripts/docs/testing-revisions.mjs e2e-006`的声明版本/来源指纹为matching、无differences/missing；这仅核声明边界，不是新同版全链实跑，也不自动证明旧终档可作为007当前输入。

根Codex另以真实`loadCurrentProjectFrom`与`loadAllScenes`加载当前294场景，按`packages/reforge/src/main.ts:3544-3558`的正式表达式得到工程摘要`f88a584c3c64e3db35a5a3afa093035e7ff8177eafd8d54d3d737f1915ab469b`。船体起伏归档`build/evidence-archive/e2e006-boat-bob-20261027/boat-bob.tar.gz`内`native/reforge-006-2026-10-27T05-14-20-236Z/006.end.save.json`的76个`resume.digest`均为`a3fac493656dfe8b17e98564cfdcb0fd5339255946cb19d7a2aea53f0c62d022`；后继内容已改变全工程摘要。根从该原档取`s001/e25/auto/default`游标，以当前实体flow及摘要调用`compileRuntimeScriptFlow`和`validateScriptContinuation`，在`packages/reforge/src/script-continuation.ts:29`精确拒绝“auto resume: 内容digest不匹配”。未启动浏览器、未改原档。

007先寻找并核准匹配当前工程的合法同引擎前驱；本次所核10-27的RF006终档不可直接使用，缺少匹配前驱时才正常重建必要链，不能改写旧档digest绕过守卫。本次未穷举其它保存目录，不据此要求Game重跑。此项是续办输入适用性，不撤销006原候选技术及用户视觉接受；本轮未因此重跑剧情。

当前[预览配置](../../../projects/pal/editor/script-preview.json)只有006用途的10套状态、11个步骤绑定；前轮12入口/11状态属于船身旧auto退役前的验收。001–005报告中未找到逐入口预览初态验收完成记录，当前配置也未登记这些片段的状态；因此不能宣布001–006的NPC初态全部完成。已有场景默认或006共享人物的站位不能自动代替另一个脚本入口执行前的现场。

后续按[E2E逐入口初态合同](../../testing/e2e/contract.md#每段核对编辑器预览初始状态用户2026-10-12)补齐001–005入口清单与实际前态，逐项确认可沿用的场景默认或配置独立方案，再完成步骤关联、保存重开及Play/Reset记录；缺证入口保持未完成。006有效范围直接复用。本轮仅做文档与配置核对，未新跑剧情、编辑器播放/重开或007。

## 前提与证据

- [E2E合同](../../testing/e2e/contract.md)、[共性问题族](../../testing/e2e/cross-stage/common-issues.md)、[路线方案](../../testing/e2e/route-proposal.md)按各自声明合同范围读取；旧版本/旧006待办不能覆盖后继原卡接受。
- [001报告](../../testing/e2e/stages/001-opening/report.md)至[006报告](../../testing/e2e/stages/006-doctor-boat/report.md)、[剧情时间线](../../lore/timeline.md)及连续卡持有分段、检查点和后继证据，不相互代授信用。
- 监督范围源码：[独立deadline/清理工具](../../../scripts/e2e/browser-watchdog.mjs)、[真实caller](../../../scripts/e2e/browser-journey.mjs)、[现有专测](../../../scripts/e2e/browser-watchdog.test.mjs)。源码和测试存在不等于本轮实际执行通过。

## 验收

- 每段合法前驱、正文/控制返回、正式终档与fresh恢复按其同版原件接受；连续演示不替代独立段专项。已有有效接受不默认重跑，真实版本/源码影响按相关合同定向核。
- 当前仍需前十段、四canary和编辑器工作流的完整薄基线接受，随后才核N6b；不授完整Q1/Q2、后期剧情、新故障实跑、capture/音频或新ledger信用。异常监督按上述源码/历史记载与执行原件缺口分记，不用正常流程passed补证。

## 原文保全

固定 source revision `fb83030c29ad9599c4135950d552d7c75ab3009f`，source SHA `2880d6b8ba976b74e52d607e2ff806894d73214634a132e2c54f54ee8f386aec`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # E2E-R4-1 — 路线驱动与合法检查点薄基线
>
> Status: build
> Owner: Codex
> Phase: ops
> Visual Verification Timing: e2e-consolidated（001独立执行器首批）
>
> ## 当前推进位置（2026-10-02）
>
> 001–004已按各自边界核定verify，本轮当前边角已[收口](../archive/tasks/done/PRE-005-DEBT-1-current-edge-closeout.md)。
> 用户确认005为回厨房接买虾委托、码头水生叔/张四对话、返回盛渔村听丁香兰报信，止于恢复控制，不继续探病。
> 鱼嫂对话纳入自然路线建议，但不是报信硬条件；源码与人物/时序纠正见[滚动攻略](../../lore/timeline.md#005-买虾出门与香兰报信)。
> 005执行器及作者编排已实现；[六份同版实跑与真实终档](../../testing/e2e/stages/005-shrimp/report.md)已独立核验，用户观感复验另列。
> 用户同时要求后续逐段回写剧情知识，维护既有timeline及碎片目录，避免仅靠对话记忆。
> 下一步优先[001–005共性问题族治理](../../testing/e2e/cross-stage/common-issues.md)：机械状态展开、动态入口后继、时基及作者模型统一，
> 不等待每段E2E重复踩同根问题。运行器browser.newContext崩溃/无返回时的独立超时与自动清理仍待补；
> 本轮未生成录像，完整Q1/Q2和后期剧情仍未完成，不把正常六case通过当作异常监督机制已完善。
>
> ## 先前进展（2026-10-01）
>
> 002最终双引擎verify与完整质量门已通过并收口，见[002回执](../../testing/e2e/stages/002-inn-guests-and-reward/report.md)。
> 各自真实001档正常出房至s003/e56，20正文/500文、三人起步/两段对白停步/短续走/终点隐藏、
> 真实002档新上下文恢复与同引擎Canvas均通过；两门持久open页修复未改变保存前结束画面。
> 已交付编排审查：保留目标＋速度与独立auto并行；落实局部参与者接管、完成语义与持久门意图；
> 李大娘24次nudge实际路径留作后续表达候选，中间动画/节拍等价未证，不机械压缩或引入parallel/join。
> 冻结3feb5a77完整check10655项、E2E工具57项通过，lint2704文件零诊断；四张002子卡done归档。
> 后续核实002下一段大娘绑定选错次日方案，已补第一天初次链并从真实001正常重跑RF002；
> 旧passed档及报告保留，新002结束/恢复/003 donor均增加交接语义门，不用恢复相等替代故事正确。
> 现有两引擎真实001→002→003链，00314正文/12楼梯实际脚步、厨房交代不取菜、生产保存与新上下文恢复已通过。
> 详见[003回执](../../testing/e2e/stages/003-kitchen/report.md)；003新统一门/用户观感与004厨房朝向counter各自记录。
> 本母卡仍build：004以后、跨片段完整runner、capture录像音轨及全局Q1/Q2未完成。
>
> 2026-10-02用户已定义[004](../archive/tasks/done/E2E-004-1-meal-and-beggar-wine.md)：取酒菜→送苗族跟班→正常物品菜单赠桂花酒给醉道士→
> 完整剧情结束且恢复移动，包含物品使用，不停在得到桂花酒。现已落实NPC正文归属与显式await，
> 当前RF002→003→004正常重建并passed；历史game004也已独立accept，新工具game重跑诊断另记。
> 40正文、正常菜单取消/失败/静止成功、唯一耗酒、持久端菜外观、完整剧情/恢复移动及两次fresh存读皆有实证，
> 全仓质量门通过，见[004收据](../../testing/e2e/stages/004-meal/report.md)。不是同revision both汇总，capture仍待办；
> 当时005尚未定义；现行边界见顶部更新，仍不造档/道具或把未执行流程标为通过。
>
> ### 001收口记录（2026-09-28）
>
> 001已按[独立验证子卡](../archive/tasks/done/E2E-001-CLOSE-1-dialogue-and-actors.md)核定verify done：
> 55正文及说话人/24对白块、5角色或对象、两个站定区间/演出偏序、真实结束档和新页正式恢复、
> 同引擎Canvas像素一致及10截图目视通过；一阶段翻页漏行/自动淡入变暗两缺陷已修。
> 完整check10,207/受保护strict9,746/静态零诊断。下面“逐页/其它角色未完成”均为早期批次历史。
> 下一步002：继承各自真实001结束档，正常出房间、到s003/e56附近触发李大娘/三苗人演出，
> 按既定消失/控制权边界收段并核实际500文奖励；不造档、不跳场景、不重问已定范围。
> 母卡仍build，后续片段与capture/录像音轨独立继续，不能把001通过说成全局Q1/Q2通过。
>
> ## 脚本合理化要求（用户，2026-09-30）
>
> 用户要求后续E2E增加脚本合理化任务：逐段判断剧情脚本的编排是否合理、是否需要改进、
> 以及如何以更清晰、更现代的内容表达实现目标观感。Codex负责结合源码与实际演出给出判断，
> 从002开始与流程验证一并交付。001既有verify收口保留，不追溯冒称已经完成本次新增审查。
>
> 每段重点检查：动作与对白的先后/并行关系；移动目标与速度的表达；等待究竟服务演出节拍还是
> 猜测异步动作完成；NPC自动行为与剧情接管的所有权；场景退出/取消后的收尾；阶段切换、奖励
> 与控制权恢复；重复步骤、隐式全局依赖和迁移遗留低层指令是否有必要。优先使用已有明确命令，
> 按动作完成条件衔接后续步骤；有观感依据的停顿保留并写明理由，不机械删wait或把速度改成时长。
>
> 已核例子：`packages/content/src/author-script-core.ts:188`的moveEntity使用target/to/speed；
> `projects/pal/content/scenes/s001.json:7288`起李大娘按目标坐标、normal速度分段移动，另有wait与对白。
> 当前不是“坐标+指定移动时间”。新编排应表达“走到哪里、何时说话、何时转身/离场”的演出意图，
> 不以改参数名字、增加指令或复制原版逐帧机制作为现代化判据。上下文按
> [READ-FIRST](../../phase2/READ-FIRST.md)铁律4/6/8/9/10及相关一阶段知识核定。
>
> 每段回执须有“脚本编排审查”：源码/实际事件证据 → 问题或保留理由 → 建议表达与收益 →
> 保留 / 本段改进 / 后续能力建设 / 待产品裁决，并列出验证结果和未完成项。
> 保持既定剧情与观感的局部编排改进可在核前提、单Owner和白名单后落实；触及schema/公共接口、
> 移动语义或主动改变节拍/剧情目标时开对应任务，产品取舍给出before→after和代表场景。
> 完整原版脚本转换核现已退役：编排改进直接维护canonical作者内容，不复活转换/overlay重写；
> 仅原始源拥有的资源/地图缺陷仍先定位并修对应供给真源，再刷新、核白名单和双跑幂等。
> 验证改进后的实际演出与真实检查点接续，测试不得为了迁就错误编排放宽预期。
> 语义与时序断言用于证明剧情目标，不要求两引擎内部坐标、步数或指令数相等。
>
> 2026-09-30 002已开[独立执行与编排审查子卡](../archive/tasks/done/E2E-002-1-inn-route-and-trio.md)，
> 用户再次钉定核心为s003/e56首次触发长脚本；正常出房间至e56是独立路线准入问题。
> Codex核primary/现行内容/真档后批准隔离工具实现，产品与作者脚本暂不改；实际演出尚待验证。
>
> ## 脚本系统调研（Codex，2026-09-30）
>
> 用户要求深入调研当前脚本系统。本轮只读核作者模型、编辑器、迁移发布、编译执行、生产宿主、
> 所有权与保存链，并以一阶段和001作对照；未修改产品脚本、schema、运行时或迁移实现，未实跑002。
> 下述是源码与契约测试结论，不是所有场景的合理性审计或新的剧情视觉验收。
>
> ### 当前链路与关键语义
>
> - 作者内容：实体Page选择具名trigger/auto行为，场景选择具名onEnter/onTeleport钩子；跨处复用
>   走共享库`callScript`和显式`self`契约，物品私有正文归物品。实体地址为`{scene, entity}`，
>   stage/state/behavior/hook均有稳定身份。当前作者命令取自current runtime方言，不应把内部Base
>   类型中的旧命令当作产品仍接受的语法。锚点：`packages/content/src/author-script.ts:37`、
>   `packages/content/src/runtime-script.ts:1`及[现行合同](../../phase2/specs/script-system.md)。
> - 编辑：通用正文/flow组件经`ScriptEditSession`维护canonical内容、引用校验、undo/redo/save；
>   场景投影不是作者真源。锚点：`packages/editor/src/core/script-editor.ts:1299`、
>   `packages/editor/src/ui/ScriptEditor.tsx:3105/3812`、`packages/editor/src/core/script-editor-projection.ts`。
> - 执行：作者对白身份解析成runtime命令；编译器生成只读、带content digest的内存Executable，
>   runner递归顺序await正文、分支与共享调用。`callScript`不是并行派发；目前无通用parallel/join
>   作者结构。锚点：`packages/content/src/author-script.ts:57`、`packages/reforge/src/runtime-script-compiler.ts`、
>   `packages/reforge/src/script-runner-core.ts:300/325`。
> - 阶段：stages每次激活只执行当前stage，`next`写下次激活cursor；没有next会再次执行本stage。
>   stateMachine的continue在同次激活继续且不提交安全点，advance提交后返回，to提交后显式让步
>   并继续。默认auto编译为每命令后的100ms边界；`cadence:'transition'`改由状态迁移控制节拍。
>   改分组/内联/复用可能改变节拍和保存边界，不能当成纯文字整理。
>   锚点：`packages/reforge/src/script-runner-core.ts:153/193`、`packages/reforge/src/script-compiler-core.ts:166/304`。
> - 移动：当前moveEntity是目标坐标+速度枚举，正式宿主等待实际终点提交才返回；不是固定时长
>   tween。生产按100ms世界拍、速度对应格距和slow休拍推进。其后的wait应单独审查演出意图，
>   不能默认解释为等走完。锚点：`packages/content/src/author-script-core.ts:188`、
>   `packages/reforge/src/entity-walk.ts:13`、`packages/reforge/src/script-project-core.ts:157`、`packages/reforge/src/main.ts:2910`。
> - 并行/接管：各NPC自动行为有独立activation，和前台剧情并行；前台位移隐式接管目标，转向/
>   定帧不接管。被接管的auto move保留终点并在release后续走，auto单步可因权限而跳过。
>   对话不全局冻结NPC，中央confirm等执行门是另一机制；正常脚本链finally和强停负责归还权限、
>   取消悬挂效果。锚点：`packages/reforge/src/main.ts:2676/2710/3776/4233`及motion-runtime-coordinator。
> - 持久化：WorldScriptState保存场景分区状态、选择与flow cursor，不保存命令索引、调用栈或
>   wait半程。保存gate等待真实活动lease到安全边界，旧owner epoch不能回写过期cursor；共享/
>   物品/嵌套活动也计数，不能漏掉等待中的效果。锚点：`packages/reforge/src/script-world.ts:441`、
>   `packages/reforge/src/runtime-script-project.ts:466`。重排奖励/隐藏/阶段切换须验证防重复与读回接续。
>
> ### 维护入口与验证边界
>
> 第一阶段已同时存在方向单步与坐标+速度NPCWalkTo，不是本来只有方向+速度。纯转换分别映射为
> stepEntity和moveEntity；当前坐标模型也不是“坐标+移动时间”。锚点：
> `packages/game/src/core/event-system.ts:1415/2680/4699`、`packages/migrate/src/translate-event-motion.ts:37/48`。
> 001当前的李大娘分段move/dialog/facing编排见`projects/pal/content/scenes/s001.json:7288`；
> 纯迁移overlay亦有这套编排，但不能据此断言改overlay会直接覆盖当前场景正文。
>
> 当前publication从current baseline保留作者场景/共享正文，刷新原始源拥有的资源、地图等分区，
> 再与当前工程三方合并。作者编排改进应维护canonical作者内容；已证实的生成缺陷才修对应生成
> 真源。baseline禁止手工拼接。锚点：`packages/migrate/src/pal-current-publication.ts:100/108/147`、
> `packages/migrate/scripts/migrate-content.mts:56/69`及[发布维护入口](../../../packages/migrate/README.md)。
>
> 编辑器实际场景工作台使用playCanonical，复用当前compiler/runner；但移动预览仍以简化半格步进
> 和独立SPEED_MS推进，只加载当前场景。预览不是正式移动节拍、完整多人调度或存读档的证据。
> 锚点：`packages/editor/src/ui/SceneScriptWorkspace.tsx:246`、`packages/editor/src/core/playback.ts:73/85/437/456`。
>
> 只读盘点294场景及共享库（含未选中方案和全部登记flow，非活跃调用图）有4459个stages、195个
> stateMachine，含13849处stepEntity与3430处nudgeEntity。数字只说明仍有大批低层表达待按实际
> 调用域审查，不证明全部是缺陷，也不授权全仓批量改写。
>
> ### 后续E2E采用的判断顺序
>
> 先确认选中行为/调用链和剧情意图，再核实际事件偏序；优先以现有moveEntity、动作完成等待、
> 明确接管/归还和合理阶段边界表达。逐拍步进只有在确认中间路线、朝向、动画、触发与节拍无
> 必要差异时才考虑替换；wait逐个区分停顿、节拍和冗余等待。重复正文只有真复用时才抽共享脚本。
> 确需“多人同走后汇合”而现有表达不足时登记parallel/join等能力候选，另开语义设计，不以auto
> 旁路或估算wait拼凑同步。每个保留/改进结论仍须在本段E2E回执附实际演出和检查点接续证据。
>
> 验证：Reforge五文件56项、编辑器canonical播放相关四文件39项、迁移移动/overlay/current
> publication三文件12项，共107项全部通过；其中publication读取真实PAL source并核作者保留及
> 重放零差异。本轮未跑全仓统一质量门、未新增覆盖率结论、未重复001视觉流程或执行002。
> 本轮无跨Agent交接；无下一位Agent提示词，研究结论供本卡后续002编排审查使用。
>
> ## 用户意图与首批准入（首批已完成，当前二阶段增量见后文）
>
> 2026-09-27用户要求“回到E2E，推进001”。Codex核定首批build allowed，不再请求已定剧情边界：
> 先完成一阶段001从正常新游戏到房间可控的独立Playwright脚本、正式快存导出与新浏览器上下文读回。
> 二阶段对话观测仍缺cue/page状态，单列后续适配，不以盲发确认键或手造世界补齐。
> 本批不改游戏产品代码、存档格式、场景内容/迁移，也不接速胜；不把采样位置日志冒充完整已提交移动事件。
> 完整NPC静止区间诊断、二阶段001、002及后续仍未完成，本母卡保持build。
>
> 实施白名单：根package.json/pnpm-lock.yaml（独立Playwright工具依赖/命令）、scripts/e2e/**、
> 本卡/看板/测试索引/001执行文档及碎片目录状态。临时浏览器存储与产物仅build/e2e/，用户6010和存档不动。
>
> | 前提 | 原版/primary | 第一阶段 | 第二阶段 | 本批目标 |
> |---|---|---|---|---|
> | 001正常新局 | 用户已定碎片；原始提取scene/0=L_4、scene/1=L_3545 | bootstrap:1765起新游戏handler先3.mp4再startNewGameFromPrimary | s000→s001/onEnter，dialogue仅暴露active | 正常菜单输入，不用skip-intro/dev-scene |
> | 对话正常确认 | 原始脚本与用户“不跳对话”裁决 | dialogBox.phase及event-system等待门、正常KeyboardInputSource | DialogBox cue/page仍为内部状态 | 一阶段状态驱动确认、尾停顿等待；不改cursor |
> | 结束档真实来源 | N/A，不改变游戏数据格式 | F5正式quick-save；tools/save-io.ts与Save API | 已有__tpE2e.dumpSave，后续使用 | 只导出本次实跑存档，正式parse/import+菜单读取回验 |
> | 诊断证据边界 | 用户要求实际提交位移、有界日志 | 本批仅只读现有DEV状态与dialogHistory | 提交前motion trace不能证明静止 | 仅声明流程/检查点小样，不冒充完整时序或跨引擎验收 |
>
> 最强反例：跳过开场/旧槽恢复/新页读档失败落新局也显示场景。脚本须证明3.mp4完整结束、梦境/房间剧情锚、
> 菜单控制权、全新上下文起档与导出hash；恢复后比较实际世界摘要，不能仅以页面出现通过。
>
> 2026-09-27用户要求不再由Codex持续补覆盖率，转向讨论快速通关E2E，避免模型盲探剧情与迷宫。
> GLM/Cursor仍后台补测，用户不承担手动通关。固定三签暂休。
> 最终执行器必须无Agent/模型API依赖：AI只在开发期设计/校准，运行时所有分支由程序决定，
> 未知状态失败留证；独立进程可连续跑声明流程是最终验收门，不以AI操作浏览器通关替代。
> 用户已追加确认两阶段双线、主线优先+大型支线、普通遇敌速胜/剧情Boss个案、保留对话和后续录制用途。
> 下述为准备期记录，已由上方001首批准入更新：范围不再重复请示；核两引擎实际观察/输入/保存/战斗结果入口、实施白名单与隔离方式，
> 再据[路线方案](../../testing/e2e/route-proposal.md)开执行器建设。不会因旧审计或check通过就宣称前置清零。
> 二阶段R4→N6b版本顺序保持，第一阶段独立向前，不等待二阶段卡住的片段。
>
> ## 一手锚点与真值
>
> ### 2026-09-27 二阶段001首批准入
>
> 用户要求继续001。Codex核定本批build allowed：增加只读对话/标题/恢复结果观测和独立Reforge执行器，
> 走正式标题、新游戏、自然视频结束、键盘对话与现有安全快照/恢复链。不得通过调试advance/跳场景/赋值世界推进。
> 前提：DialogBox:158-177按pageDone/分页/autoAdvance决定按键效果，render:229后才确认已显示；
> runOpeningMenu:85起在局部维护phase/cursor；main:5372的现有dumpSave走save barrier，
> e2e-load:5383成功/失败已有明确分叉。本批只读导出这些既有事实，不改变其执行顺序或游戏语义。
> 一阶段只提供001内容锚和结束可控目标，不复制旧引擎的对话冻结NPC机制；原版内部模型N/A。
> 反例：观测器自己推进打字/回调持有真实对象可改状态/失败读档落新局冒充恢复。须有读无副作用、快照隔离、
> 正常输入推进及显式恢复结果测试；出现真实剧情阻断就留证，不以放宽门禁或改存档掩盖。
>
> 本批新增白名单：reforge的dialog/dialog-box.ts、opening-menu.ts、main.ts（只读DEV桥接/观测绑定）、
> 相应新*.observation.test.ts与必要薄fixture、scripts/e2e/**、根运行命令及本卡/E2E文档。
> 必要基线只由整批check→ratchet→单次strict统一更新。GLM四批16模块与主目录WIP零触碰。
> 完整NPC实际提交事件与双阶段时序仍单列，不把本批快照采样冒充完整移动轨迹。
>
> - 当前版本content20/SAVE8，`content/src/character.ts:168-170`；切版checkpoint重建，禁止兼容层。
> - Reforge main:5372-5418的导出/恢复，main:797-809/5073后的读观察点；package.json没有runner。
> - 碰撞与地图实例：reforge/src/collision.ts；动态移动继续走生产输入链，不用测试路径规划替换它。
> - 用户已确认001/002见[剧情边界](../../../projects/pal/e2e-checkpoints/README.md)，003–010仍须Codex先起草。
> - [现行E2E合同](../../testing/e2e/contract.md)、[旧前置盘点](../../testing/archive/legacy/e2e/route-and-checkpoint/pre-e2e-admission.md)和READ-FIRST：
>   旧日期/行号/缺陷状态必须按当前树重核；一阶段只作内容/UX参考，不对齐内部状态。
> - 最强替代解释：直跳场景或读档失败回落新游戏造成假通；必须有正式恢复成功与起始契约、真实前驱档hash。
> - 第一阶段bootstrap:1120-1133/1918-1919的DEV状态与core/save/api.ts；game与reforge对话分页接口不同，
>   不能共享内部存档或照搬固定回车次数。主线checkpoint只继承本引擎前段实跑结束状态。
>
> ## 准备期边界（历史）
>
> 不实现runner/测试后门/速胜，不改存档/迁移，不跑剧情或共享coverage，不替用户决定特殊战斗胜负。
> Codex帧动画补测WIP冻结保留、未计入基线；+5pp目标未完成但不阻塞本卡讨论。
> 后续build卡须明确允许动作、只读状态协议、失败停线/预算、检查点来源链和小样验证。
>
> 2026-09-27追加诊断约束：重要NPC按实际位移变化记录，与对话/控制权事件共用时间线；
> 跨引擎按剧情节点/静止区间/事件偏序比较，不做每帧全世界dump或内部状态硬对拍。
> 现行Reforge trace在提交前，只作计划诊断；正式断言须看实际提交，溢出/漏事件不得静默放行。
> 李大娘站定说话→说完继续移动作为代表性回归；不复活Reforge全局对话冻结NPC。
>
> ## 2026-09-27 首批执行交接
>
> [001执行说明](../../testing/e2e/stages/001-opening/report.md)：正常新局、3.mp4自然结束、梦境/叫醒全对话、房间可控，
> F5导出真实档→第二隔离上下文正式导入/菜单读回/菜单控制验证。有窗口实跑exit0，36个正常按键，
> 131条状态变化，约76秒；无浏览器错误。保存/恢复持久域hash均为
> `92bd6265f5c532be8e9bc7bac55b3494f7b54fea1cf0983d92f4e991fb4855aa`。
> 结束与读回截图已目视：房间/人物可见、淡入结束、无剧情对话残留。
> 产物`build/e2e/game-001-2026-09-27T01-32-07-387Z/`；checkpoint
> `a34f8d900a49b2bbe63a63034b20a91aaf702a8d4b7fb6e29692896fa96e7fa5`。
>
> 校准记录：首次误用scene编号验证dialogHistory.map而失败；第二次流程/读回绿但截图处于自动淡入初始窗，
> 故补needToFadeIn观察与回归，第三次有窗口实跑闭合。未修改产品/资产/旧测试/覆盖基线；
> 安装Playwright时包管理器顺带升级spessasynth_core已撤回并frozen重装，音频依赖保持生产原值。
> 执行器7项合同测试通过；不以此小样宣布完整001/Q1/Q2通过。
>
> 统一质量门：隔离提交树`9d45ef11`执行`env -u NODE_COMPILE_CACHE pnpm check` exit0，
> 七包9741/9741、全包TC零诊断、严格lint扫描2247文件为0error/0warning/0info；
> docs/coverage-tools/quality-tools/e2e-tools全部通过，日志`/tmp/codex-e2e-001-check.log`。
> 其后相同执行器散列经`pnpm e2e:001 --headless`独立复跑exit0：131事件/36按键/约76秒，
> 结束/读回持久域hash与有窗口跑相同；新档hash为
> `5805d87f8c3dfb03ef5afc6a94c27b73e1052020832136c44b782e8c0c11a599`，
> 产物`build/e2e/game-001-2026-09-27T01-39-32-894Z/`。不同实跑档含运行时瞬态，
> 不要求跨次全文件hash相等；每次均钉本次F5字节与实际恢复持久域。
> Codex核首批流程/检查点小样accept，可集成；packages/与coverage实现/基线零diff，
> 本轮不重复ratchet/strict-fast、不宣称官方覆盖增长。主树未提交帧编辑测试/临时探针保持原样，
> 质量门针对隔离的提交树，不把这些未完成WIP计入结果。
>
> ## 2026-09-27 二阶段001实现与实跑
>
> Reforge只读标题/对话/恢复结果接口已落；不修改locale/scene/script内容、移动语义、SAVE8/content20或GLM目标。
> 6项观测回归证明读取不推进/不绘制、DTO不可修改真实状态、实际分页与auto尾停顿、正常标题键盘与正式恢复loaded/failed。
> 工具合同12项通过；页证明须同时满足实际pageTextIds、已全显phase和排版正文，声明了但没显示的未来行不能充数。
> 人物位置/淡入连续值不充当按键确认消费，日志按有意义状态变化记录，不逐帧dump。
>
> Reforge有窗口实跑exit0（约66秒、86事件/30按键），真实检查点sha
> `c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`，恢复前后持久域hash均
> `d401e9d17c413e26c4ec128e9a7e0feb6b478b4a56d35f51669253c252341f98`。
> 产物`build/e2e/reforge-001-2026-09-27T03-07-46-121Z/`；截图已目视房间/人物及恢复闭环。
> 后续收紧正文证明后的`pnpm e2e:001:both --headless`亦两子进程exit0，日志`/tmp/codex-e2e-001-both-final.log`。
> 两套真实结束档各自产生，各自新上下文验证空IndexedDB、正式恢复和菜单可操作，不跨引擎互喂存档。
> 新增`e2e:001:reforge`与`e2e:001:both`入口；两套同时跑，一方失败不跳过另一方，运行时不调用AI。
>
> 开发校准：新测试host全局窄化导致TC失败，改用boot返回句柄后修复；无产品输入强转或规则降级。
> 已知浏览器信息：干净工程save-state文件缺席404与Canvas读回性能提示列报告，不算资产失败或静态诊断豁免。
> Reforge生产build通过，已扫描dist确认__tpE2e/readBootObservation/checkpointLoad桥接不进入生产JS。
> 完整NPC实际提交日志、对话序列偏序比较和capture-ready仍未完成。
>
> 首遍完整check如实失败：checkpoint-export旧AST回归要求唯一DEV导出注册，早期标题注册造成17项红。
> 未改旧fixture/断言：将新只读观测独立为__tpObserve，原__tpE2e注册块与e0844fe7逐字相同。
> 原17项+新6项合计23/23复跑通过，桥接修订后Reforge实跑再次exit0，检查点hash与前述相同。
> 生产build退出0但有Vite大于500kB的包体积提示；这不包含在lint/typecheck零诊断声明中，未通过改阈值消警。
>
> 3901f1d6最终整批门：完整check **9793项**（Reforge1749），另12项E2E工具合同；
> 全部包TC与严格lint **2265文件/0error/0warning/0info**。官方ratchet与保护e0844fe7的单次strict-fast
> **9301项/728生产文件**通过，按官方baselineView投影精确相等。源码集合未变，其它六包完整基线对象不变。
> 本批是E2E观测能力，不是恢复主动追覆盖率：S +72覆盖/+37分母，B +49/+32，F +11/+8，L +60/+31单列。
> 全仓当前B46201/63315=72.97%，L57806/70877=81.56%。不把这次生产分母变化计作GLM补测。
>
> 旧检查点17项未改；最终桥接修订后Reforge独立实跑产物为
> `build/e2e/reforge-001-2026-09-27T03-22-22-947Z/`，检查点与持久域hash仍与上文一致。
> 双引擎并行证明位于`game-001-2026-09-27T03-14-49-389Z/`与`reforge-001-2026-09-27T03-14-49-393Z/`。
> 正式日志`/tmp/codex-reforge-001-{check2,ratchet,strict}.log`；首遍check失败日志另存check.log，未覆盖。
> Vite旧基线e0844fe7隔离替换三原模块构建也有653.46kB提示（baseline-build.log，源hash不变），
> 当前包大小未作阈值豁免或性能修复；DEV的__tpObserve/__tpE2e/checkpointLoad均已证不进入生产JS。
> 本席核本次流程/检查点增量accept并集成；母卡继续build，不标整个001时序/full-Q1-Q2通过。
>
> 无下一位Agent提示词；Codex继续实际NPC提交事件与双阶段差异比较，母卡保持build。
>
> ## 2026-09-27 001稀疏提交观测增量准入
>
> Codex核定build allowed。本批只改scripts/e2e/**与E2E文档，不改产品、内容、存档、官方覆盖配置/基线。
> 使用独立Vite配置在隔离服务内对真实源码作只读AST插桩，保留原调用/返回/异常；普通dev和生产构建不加载插件。
> 静态锚失配、未覆盖来源的位移、观测异常或有界日志溢出必须失败，不将没有日志解释为静止。
>
> 四向依据：用户指定“李大娘站定说话”内容目标；原始提取scene/1与全局事件对象10（非厨房19）；
> 一阶段event-system的applyRawOpcode、npcWalkTo、partyRideEventObject、monsterChasePlayer实际执行边界，
> 后者中间碰撞试探不是提交；二阶段main的五处实体pos赋值在authority校验后、DialogBox.render先画后update。
> 目标只比较语义对话区间/移动偏序，不比较两引擎坐标、步数或逐帧时刻；不引入对话冻结NPC耦合。
> 二阶段s001/e10与一阶段wNumScene=2/id10独立映射，dlg.1369/1371为选定区间；001之外不宣称完整NPC覆盖。
> 最强反例：同次采样间往返、计划位移未提交、源码换位置导致漏钩、对话auto尾停顿被采样漏掉。
> 验收包含真实函数插桩合同、上述反例判别、两套独立实跑及真实检查点回验。差异先留证归因，不自动修内容。
>
> ### 本批执行证据
>
> 两引擎正常并行实跑与真实档读回exit0；比较回执
> `build/e2e/both-001-2026-09-27T04-03-40-429Z/comparison.json`。
> game产物`game-001-2026-09-27T04-03-40-662Z/`，Reforge产物`reforge-001-2026-09-27T04-03-40-666Z/`。
> 原生视频自然结束、正常确认输入与房间控制权均保持；结尾截图已目视人物/房间可见、无对话或淡入残留。
>
> | 证据 | game | Reforge |
> |---|---|---|
> | NPC稀疏事件 | 138 | 103 |
> | 实际移动提交 | 29 | 29 |
> | 两段对话内位移 | 0 / 0 | 0 / 0 |
> | 对话前/中/后非空移动见证 | 12 / 4 / 13 | 12 / 4 / 13 |
> | 日志丢失/溢出/观测异常 | 0 | 0 |
> | 结束/恢复持久域 | 92bd6265…均相等 | d401e9d1…均相等 |
>
> 相同步数是本次观察结果，不是跨引擎门禁；断言只核内容区间与偏序。
> game新档sha `f9e12d9f589fb1f930ade42803a7ec4f020b46986e057730eed129fbd027e9cd`；
> Reforge新档sha `c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`。
> 两个明确等键区间均见NPC可见且零位移，不复现“边说边走”；没有为此改游戏移动/对话/内容规则。
> 新增10项工具合同、现合计22项：真实npcWalkTo同输入与未插桩实现全状态/返回值相等、同窗往返两笔、
> 删提交钩子必报漏观测、计划不算位移、异常身份保留、DTO隔离、溢出/身份/事件gap/缺等键等拒绝。
>
> 校准失败保留：首次工具断言预期锚点错误信息，新增更早的write-census门后实际在该门拒绝，已改断言为精确错误；
> `/tmp/codex-001-trace-tools2.log`原红保留，tools3.log为22绿。
> 第一次带比较门的浏览器运行期间本人格式化插件触发Vite重启，视频自然结束等待按预期超时；
> 失败产物`both-001-2026-09-27T04-02-19-887Z/`与`/tmp/codex-001-trace-gate.log`保留。
> 冻结工具文件后重跑`/tmp/codex-001-trace-gate2.log`通过，不是多数票重试或放宽超时。
>
> 本批只读插桩为执行器工具，不进入正常构建/官方测试选择；packages/、旧测试、资源、覆盖配置和基线零diff。
> 因此不为本批重跑/抬高官方ratchet，不冒充生产覆盖率增长。全对话逐页、e11等替身与录制/音轨仍待验证；
> 001全视觉/capture-ready与母卡done均未开放。
>
> 最终质量：完整`pnpm check` exit0，七包9793项，全包typecheck零诊断，严格lint
> 2272文件/0error/0warning/0info（`/tmp/codex-001-timing-check.log`）。收紧回头正证后工具22/22、
> 17个E2E工具文件Biome零诊断再次通过；文档/链接门独立复跑通过。
> 最终有窗口`pnpm e2e:001:both --headed`两子进程与比较均exit0（`/tmp/codex-001-timing-headed-final.log`），
> 回执`both-001-2026-09-27T04-10-09-058Z/comparison.json`；两引擎仍为138/103事件、各29次移动，
> 两个静止区间与实际回头事件（game序96、Reforge序68）均通过。
> 原始NPC日志分别62180/65109字节；不是每帧世界dump。
> 最终子产物`game-001-2026-09-27T04-10-09-326Z/`与`reforge-001-2026-09-27T04-10-09-331Z/`。
> Codex核本批关键NPC时序增量accept并集成；GLM四组源文件及主目录两份帧动画WIP散列均未触碰。
> 下一步为001全对话逐页/其它演出角色与录制音轨矩阵；无下一位Agent提示词，由Codex继续，母卡保持build。
>
<!-- original-source-quote:end -->
