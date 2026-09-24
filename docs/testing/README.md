# 跨阶段测试与验证

覆盖率说明统计范围和防回退门槛；E2E 合同定义业务断言、检查点链、战斗速胜边界与录像条件。两者各自维护，不能互相替代。

上级：[文档总入口](../README.md)。

- [九批收窄返工独立接收](glm-nine-final-review.md)、[机账](glm-nine-final-evidence.json)与[PNG宿主尺寸见证](import-codec-png-host-review.mjs)（八批256116ee三席齐、已done归档，check7709/严格fast7220为既有证据；TB03另排）

## 文档与附件

- [A3首段：帧调度与输入仲裁](runtime-frame-refactor.md)、[机账](runtime-frame-refactor-evidence.json)、[冻结编排对照](runtime-frame-parity.mjs)与[11针负控](runtime-frame-mutants.mjs)（8eb93bb7/A3-a done；36新增/check8499/strict8008/639，不等于A3整批完成）

- [GLM架构治理八组并行支持包](glm-architecture-support/README.md)（冻结b11d4bc9；6组源码/回归边界+2组实际视觉初审，只读取证；Codex接收，不授权改产品）

- [战斗宿主生命周期拆分](battle-host-refactor.md)、[机账](battle-host-refactor-evidence.json)、[11针隔离负控](battle-host-refactor-mutants.mjs)与[未改主壳结构对照](battle-host-shell-parity.mjs)（A2/done/46287966；23新增，check8463/单次strict7972/637，用户全架构队列独立推进授权）

- [战斗宿主旧败北测试随机性见证](battle-host-rng-witness.mjs)（7f3840e6 与 A2 拆分树：0.99 持续闪避同红、0.5 无闪避同绿；只固定该路由测试输入，不改变帧数/断言/产品 RNG）

- [运行时菜单/物品控制器拆分](menu-session-refactor.md)、[机账](menu-session-refactor-evidence.json)、[冻结源码逐步等价](menu-session-parity.mjs)与[隔离负控](menu-session-refactor-mutants.mjs)（A1 dbe55b55/done；28新增、155序列3798步与10针，check8440/单次strict7949/635，用户本批独立推进授权）

- [真实宿主二批：战斗/物品/装备/实体](codex-runtime-shell-wave2.md)、[机账](codex-runtime-shell-wave2-evidence.json)与[隔离负控](codex-runtime-shell-wave2-mutants.mjs)（94b59a6f/done；28项/8针、check8412/单次严格fast7921/633；full8230为补测前校准，Kimi/GLM本批用户豁免）

- [检查环境隔离与宿主测试负载](check-environment-stability.md)及[统一机账](stability-fire-closeout-evidence.json)（e17af240，两卡done；check8384/ratchet与单次strict7893/633，缓存污染与AST重复编译闭环）
- [PAL工程七套预制试打方案](pal-simulator-presets.md)（从ea80749a按文件接入，FIRE窄修已done；七套原生开战，三人/巫后停止重开通过，不覆盖其它工程作者配置）

- [战斗流程统一集成与下一批建议](battle-workflows-integration.md)及[机账](battle-workflows-integration-evidence.json)（fd4efd76→2ba3142f；Codex接收/GLM自验/Kimi用户豁免，done；check8363/ratchet与单次strict7872/633，净增97L/82B，full/E2E未跑）

- [战斗流程r5独立接收](battle-workflows-r5-review.md)与[机账](battle-workflows-r5-evidence.json)（fd4efd76 Codex accept，46/1460；r4反证已闭；后续集成/门禁已完成，当前done见上方统一记录）

- [战斗流程r4独立接收](battle-workflows-r4-review.md)、[机账](battle-workflows-r4-evidence.json)与[会话层见证](battle-workflows-r4-witnesses.mjs)（d9fb606e窄counter；N1/N2/N4业务已闭，仅合击队友消费缺口，45/1459绿不替代该合同；不跑并集/不转Kimi）

- [战斗流程r3独立接收](battle-workflows-r3-review.md)、[机账](battle-workflows-r3-evidence.json)与[隔离反证](battle-workflows-r3-witnesses.mjs)（7a2f1608仍counter；r2四反证/finally已闭；幂等/钳制调用域/等待零提交/去重边界/判据残项，保持无并集与无Kimi交接）

- [战斗流程r2独立接收](battle-workflows-r2-review.md)、[机账](battle-workflows-r2-evidence.json)与[隔离反证](battle-workflows-r2-witnesses.mjs)（b7ba48bb仍counter；原五反证已闭，新反证证明完整写回/敌后续/清理/判据与原合同残项未闭；不改GLM语义、不跑并集）

- [STAT-1覆盖率合并根因与实施](coverage-initializer-diagnosis.md)、[机账](coverage-initializer-evidence.json)、[历史原生最小复现](coverage-initializer-probe.mjs)与[raw捕获/离线复算](coverage-initializer-capture.mjs)（b6286df0/done；三席accept齐，Codex核定归档；check8317/单次strict7826与远端CI通过）

- [战斗流程GLM包独立接收](battle-workflows-review.md)、[反证机账](battle-workflows-review-evidence.json)与[冻结旧候选见证](battle-workflows-review-witnesses.mjs)（16ac8cee counter/rework；31绿不能证明所称业务，正式fixture/断言/终态/工具回执四组返工，不改官方基线）

- [Codex真实运行时宿主六组实施](codex-runtime-shell.md)、[机账](codex-runtime-shell-evidence.json)、[负控与统计见证](codex-runtime-shell-mutants.mjs)及[局部覆盖配置](codex-runtime-shell-coverage.config.mts)（b6286df0/done；三席accept齐，36项/8针与统一门禁、远端CI通过；视觉/full/Q1/Q2边界保持）

- [大业务域双线补测计划](coverage-large-domain-plan.md)、[7790冻结盘点](coverage-large-domain-evidence.json)与[只读复算器](coverage-large-domain-census.mjs)（战斗公开流程由GLM、真实启动/菜单宿主由Codex；两卡r1已三席准入build，最终增量待整包验证）
- [GLM战斗流程实施回执](glm-battle-workflows.md)与[机账](glm-battle-workflows-evidence.json)（原r5交付记录；9代码文件46项、6+10负控、全reforge1460绿；Codex已独立接收/集成并核done，GLM作为测试贡献者披露，render段保留）

- [Codex内容六模块边界补测](codex-content-boundaries.md)（77项，角色状态/地图放置归属/战斗形象/奖励/运行脚本/场景索引；整批统一质量门）

- [Codex人物/命令引用补测](codex-reference-coverage.md)（12项，精确改名/引用路径/深保真；与GLM目标源码不冲突，间接guard命中单列）

- [第二波六组覆盖率整包](glm-coverage-wave2.md)、[冻结机账](glm-coverage-wave2-evidence.json)与[只读复算器](glm-coverage-wave2-census.mjs)（2026-09-23，25非视觉模块；27bd8c00三席accept齐、Codex核定done；不是重领TB00～TB10）
- [第二波回执（Codex实施/历史GLM准备）](glm-coverage-wave2-receipt.md)与[机账v5+Codex增量](glm-coverage-wave2-results.json)（163项、17针，check8281/受保护单次strict7790与集成CI通过；GLM贡献者复核/Kimi独立终审齐，未达项/输入解耦仍留账）

- [迁移写盘保护实施记录](migration-write-guard.md)及[隔离负控](migration-write-guard-mutants.mjs)/[配置](migration-write-guard.config.mjs)/[真实发布见证](migration-write-guard-publish.mjs)（57dda7ed三席accept齐、用户授权、已done；A-08/A-09按r1收口，不代表R4/N6b已执行）

- [E2E前置欠账与R4准入核对](pre-e2e-admission.md)（2026-09-21冻结14257da7；迁移两缺陷当前复现、U-02待证、49相邻/17检查点绿；不是E2E开门或全欠账清零）

- [TB00/TB01窄返工接手与集成](tb00-tb01-completion.md)及[机账](tb00-tb01-completion-evidence.json)（两卡done，44b9b763；三席accept齐、用户授权收口，check7988/strict7497证据保持；frame在途invalidate及full/Q1/Q2边界保留）

- [物品作者记录/脚本身份修复卡](../ops/archive/tasks/done/EDITOR-ITEM-AUTHORING-1-item-script-identity.md)、[实施记录](item-authoring-implementation.md)与[修复前前提探针](item-authoring-premise.mjs)（done/r1，451cbbb7；三席accept齐、用户授权收口，check7909/strict7418及原生保存重开证据保持；TB00/TB01另排）
- [GLM物品作者只读取证包](item-authoring-glm-audit.md)（冻结1e0388b0静态G1～G5；站点完整性与PAL概括已由Codex在卡面勘误，不作全量消费者证明）

- [PNG编码失败位图释放修复](image-import-cleanup.md)（用户授权常规修复；真实函数先红后绿，统一finally释放，不改格式/成功结果）

- [TB-03 r5独立接收与集成](import-codec-acceptance.md)及[机账](import-codec-acceptance-evidence.json)（e4461a30→4894719e三席齐、已done归档；check7748/严格fast7259既有证据；close缺陷仍另修）

- [TB-03 r4独立接收](import-codec-r4-review.md)、[机账](import-codec-r4-evidence.json)与[预览返回值见证](import-codec-preview-review.mjs)（r4历史反例；r5已闭合，当前见上方接收记录）

- [TB-02～10首轮接收历史](glm-nine-intake-review.md)、[首轮机账](glm-nine-intake-evidence.json)、[原独立见证](glm-nine-intake-witnesses.mjs)（原七针与五夹具已在二轮闭合；历史counter不重开）
- [九批二轮接收历史](glm-nine-rework-review.md)、[当轮机账](glm-nine-rework-evidence.json)、[残项见证](glm-nine-rework-witnesses.mjs)（当轮counter已由最新接收逐项关闭/收窄，不作为新候选结论）

- [GLM非视觉补测长队列](glm-coverage-work-queue.md)与[617文件机器台账](glm-coverage-work-queue.json)（当前批之外十批78候选模块；先细化/逐卡准入，不新增E2E前置门；[快照复算](glm-coverage-queue-census.mjs)）
- [GLM交付前自检清单](glm-delivery-checklist.md)（强制；历次counter根因四类与六步自检，fixture守卫门/变异自检/实参保真/取消三件套/回执从树生成，缺一不交）
- [GLM运行时状态与元数据六组补测](glm-runtime-state-boundaries.md)（r1/done；Codex补D6真实finally和失败自证，56项，三席同候选已收口）
- [运行时状态补测Codex复核](runtime-state-review.md)与[独立反证工具](runtime-state-review-witnesses.mjs)（当前8/8 detected、四fixture accepted；旧counter历史保留）
- [前三批r2准入与连续实施交接](glm-coverage-queue-design-review.md)（设计三签保持；当前接收状态见最新报告；193既有测试与[前提探针](glm-coverage-queue-premise.mjs)是设计证据）
- [后续七批统一细化与审核](glm-coverage-remaining-review.md)（TB-04～10设计三签保持；已逐批接收集成并三席终审收口，后续待证项仍按原归属）
- [原版表格与文本自包含补测工作包](glm-pal-tables.md)（TB-04，合法输入/旧测试去重/白名单/负控及排除项）
- [RLE、事件与资源工具补测工作包](glm-resource-tools.md)（TB-05，合法输入/旧测试去重/白名单/负控及排除项）
- [地图选区与组合模板数据补测工作包](glm-editor-map-data.md)（TB-06，合法输入/旧测试去重/白名单/负控及排除项）
- [脚本与内容编辑辅助补测工作包](glm-editor-script-helpers.md)（TB-07，合法输入/旧测试去重/白名单/负控及排除项）
- [第一阶段菜单导航与请求补测工作包](glm-game-menu-boundaries.md)（TB-08，合法输入/旧测试去重/白名单/负控及排除项）
- [第一阶段宿主、隐私与计时补测工作包](glm-game-host-boundaries.md)（TB-09，合法输入/旧测试去重/白名单/负控及排除项）
- [当前迁移辅助与隔离文件系统补测工作包](glm-migration-boundaries.md)（TB-10，合法输入/旧测试去重/白名单/负控及排除项）
- [内容合同残项工作包](glm-content-residual.md)（TB01 r2/done，23项；Codex补正CR-R1，三席同候选已收口）
- [内容残项Codex接收复核](content-residual-review.md)与[可重建独立见证](content-residual-review-witnesses.mjs)（五针detected、混合错误判据拒绝、七fixture accepted；统一质量门已过）
- [资源读取缓存与音效准备工作包](glm-reforge-asset-io.md)（TB-02已随八批256116ee三席收口；工作包保留历轮counter原文）
- [导入编码线程与视频元数据工作包](glm-editor-import-codec.md)（TB-03已按4894719e三席收口；PNG编码失败释放另已独立修复，见上方回执）
- [共享战斗模拟器首批](../ops/archive/tasks/done/EDITOR-SKILL-TRIAL-1-isolated-battle.md)与[原技能入口前提探针](skill-trial-premise.mjs)（fe0fee84主体和d394eccc列宽增量三席齐，用户UI验收通过，已done归档；我方1～3/敌方五槽）
- [共享战斗模拟器全域复用评估](battle-simulator-assessment.md)（8模块27子页：7直接/8上下文/12专用验证；首批已验收，其余全域入口仍属规划）
- [战斗模拟器r2首批冻结设计](battle-simulator-r2-design.md)（r2a首批已done；我方1～3人/敌方五槽，未获准的新入口不随收口开放）
- [战斗模拟器r2实施记录](battle-simulator-implementation.md)与[配置/保存负控](battle-simulator-s1-mutants.mjs)（首批已done；主体check7895/strict7404、列宽定向22通过，原生选择器及其它边界仍披露）
- [战斗模拟器自有工程功能宿主](battle-simulator-functional.mjs)（6011实际编辑器/真实战斗，不改PAL；仅开发期最小功能验证）
- [编辑器功能视觉补证](editor-functional-visual-2026-09-22.md)（Codex短窗/键盘/错误恢复8项；启动区缺少就近错误说明，360及原生保存边界未关闭）
- [战斗模拟器运行边界负控](battle-simulator-runtime-mutants.mjs)（人数、资源快照、迟到准入、存档快捷键、技能带入、音乐释放）
- [第一阶段资源测试输入合同](phase1-resource-test-inputs.md)（E-01完成；20项隔离输入回归、真实资源对拍通过，check7478/严格fast6989绿）
- [编辑器预览缓存连续修复](editor-preview-cache.md)（E-03/E-04完成；15项真实字节回归、7负控及原生绘制验证，check7457/严格fast6969通过）
- [场景删除引用保护实现与验证](scene-reference-guard.md)（D-02/done；83598cc4三席accept并归档；22回归/PAL补1边、最小界面验证及check7442/严格fast6954通过）
- [GLM运行时基础功能五组补测工作包](glm-reforge-runtime-contracts.md)与[任务卡](../ops/archive/tasks/done/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)（done；62a18137三席accept、用户确认，核零漂移归档）
- [运行时补测Codex接收复核](reforge-runtime-contracts-review.md)（60/1190、五见证/原15跑通过；check7538/严格fast7049，已收口）
- [六组内容合同补测工作包](glm-content-contracts.md)与[任务卡](../ops/archive/tasks/done/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md)（done；adbabb84三席accept、用户确认签字，118项，GLM贡献/Codex集成/Kimi独立终审）
- [内容合同补测Codex复核](content-contracts-review.md)（R1～R4闭环、六见证/12负控、43族归属订正；check7420/严格fast6932通过，已核零漂移归档）
- [精灵上传选图归属](sprite-selection.md)（a88ab18d三席accept、用户验收通过并done；真实组件乱序/字节/历史、六负控及最小界面验证）
- [当前检查点导出](checkpoint-export.md)（真实DEV注册、安全快照共队列、失败恢复与隔离负控；R4整页闭环待执行）
- [编辑器命令与引用补测工作包](../ops/archive/tasks/done/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)与[GLM回执](glm-editor-logic-coverage-receipt.md)（done；四组非视觉测试，GLM贡献、Codex集成、Kimi独立终审）
- [编辑器补测Codex接收复核](editor-logic-coverage-review.md)（5ca9dad2三席accept并收口；47项/四见证、check7282、严格fast6794通过；历史counter保留）
- [四包基础边界测试补强](../ops/archive/tasks/done/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)与[GLM回执](glm-foundation-coverage-receipt.md)（done；shared/content/pal-extract/migrate，产品不变、非视觉）
- [四包测试Codex接收复核](glm-foundation-coverage-review.md)（48d3b8e3三席accept并收口，139项/14反控、check7218与strict fast6730通过；历轮counter原文保留）
- [世界异步操作提交一致性](world-async-commit.md)（B-05/08/09；真实入口回归、隔离反控与集中E2E登记）
- [保存与嵌套脚本活动互等](save-barrier-lineage.md)（B-06/B-07；真实lease准入、子流程完整执行、反控与集中E2E登记）
- [测试覆盖率基线与只升不降门禁](coverage.md)
- [GLM剩余边界大批工作包（二）](glm-pre-e2e-boundary-batch-2.md)与[回执](glm-pre-e2e-boundary-batch-2-report.md)（Codex接手完成六组72项诊断准备；34覆盖/23复现/15待证，不代表产品已修复或官方覆盖率提升）
- [两阶段 E2E 与录像验证合同](e2e.md)
- [未保存修改的离开保护](editor-leave-guard.md)（A-07；真实菜单/保存回归、原生刷新与选夹、负控制和质量门）
- [GLM并行审计准备工作包](glm-pre-e2e-prep.md)与[整批回执](glm-pre-e2e-prep-report.md)（44项只读取证；D-01签字先回，引用删除/上传/缓存三组并行准备，不授权产品修复）
- [D-01：GLM配对工作流正式回归](glm-editor-history-workflows.md)与[回执及Codex接收勘误](glm-editor-history-workflows-receipt.md)（20项检查范围；Codex适配核心、补强断言并负责视觉/集成）
- [作者保存恢复：GLM大批测试工作包](editor-save-recovery-glm-batch.md)与[整批回执](editor-save-recovery-glm-batch-report.md)（父卡r2实施期附件）
- [作者保存恢复：保存前校验与序列化测试包](editor-save-recovery-glm-preflight.md)（preflight-r1；含GLM回执区）
- [保存恢复：接收侧未覆盖分支台账](editor-save-recovery-coverage-pending.md)（逐臂事实；可达性待Codex核实，不冒称已覆盖）
- [作者保存恢复：原生目录与界面验证](editor-save-recovery-native-ui.md)（系统授权、关闭编辑页恢复、继续保存/试玩及外部冲突实测；边界与API验证分栏）
- [作者保存恢复：GLM打开身份测试包](editor-save-recovery-glm-open-identity.md)（open-identity-r1；只做代码级测试，不含浏览器或视觉任务）
- [作者保存恢复：GLM身份基础测试包](editor-save-recovery-glm-identity-foundation.md)（identity-foundation-r1；标记/指纹/锁与存储代码合同，两个新测试文件）
- [编辑器保存中断恢复：最终候选收口](editor-save-recovery-closeout.md)（旧作者链退役、OS目录重启/撤权补证、性能边界及最终质量门）
- [作者保存恢复：project-io边界复核](editor-save-recovery-project-io-review.md)（Codex写侧回归；构造保证与旧路径退役候选不冒充覆盖）
- [作者保存恢复：写入授权生命周期](editor-save-recovery-capability-review.md)（真实token失效、提交后写保护、登记/计划归属与单点负控）
