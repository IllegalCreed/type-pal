# 多 Agent 任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

**当前协作模式（用户 2026-09-25）**：三贤人固定签字暂休。Codex 分派、贡献者实施、Codex 独立验收并负责集成/清理；旧签字和历史批次照原记录保留，活动任务不再因 Kimi/GLM 缺签自动停线。高风险产品取舍仍由用户裁决，见 [`AGENTS.md`](../../AGENTS.md)。

额度按接手时实际状态确认；历史额度快照不作为当前准入依据。

**当前优先级（用户2026-09-22拍板）**：先补测试覆盖率，E2E准备与实施后置，不立即推进R4检查点或新UI改造。
**2026-09-24补充**：用户要求推进[全仓架构治理](audits/architecture-debt.md)，改为按职责拆分与补测同步推进。
第一阶段允许行为不漂移的结构优化，也检查实现bug；纯重构与行为修正分提交。首批A1已独立准入并收口，不扩张为整仓同时重写。
**同日追加授权**：13批架构治理全队列由Codex独立设计、实施、自验收口，Kimi/GLM不参与、免补签。
仍按职责逐批推进和验证；不把结构治理授权解释为玩法、格式或界面变更授权。
第二波整包已于2026-09-23三席收口；后续由Codex与GLM按最新覆盖基线选择不重叠、有现行消费者且合同明确的补测批次，新范围先走准入，不重领已完成项。
2026-09-23已按[大业务域计划](../testing/coverage-large-domain-plan.md)启动战斗流程/运行时宿主两卡，r1三席齐并由Codex核build；各Owner连续完成六组，最终统一统计，不逐用例跑覆盖率。
补测发现的产品缺陷单列，按当前“Codex核前提与独立验收、必要产品取舍交用户”的流程处理；七套预制及65535资源准备阻断已于2026-09-24按当时授权修复交付，见下方历史收口记录。
后置不取消R4→N6b→完整Q1/Q2，也不新增“必须先达全仓90%/85%才允许E2E”的门槛。

GLM后续补测候选见[十批长队列](../testing/glm-coverage-work-queue.md)（78模块、617文件历史路由台账）。这里只链接候选池，不把旧规划自动列成当前 build；新分派和验收按顶部当前模式，排期以上述用户裁决为准。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](templates/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](templates/TASK-lite-template.md)

前两轮[九批返工复核](../testing/glm-nine-rework-review.md)保留历史证据；最新结论以下方当前接收为准。Mimosa不参与；TB00/TB01已由Codex补正、统一集成并分别核定done，见[收口记录](../testing/tb00-tb01-completion.md)。

八批（TB02/TB04～TB10）候选256116ee已三席accept齐，2026-09-20用户授权后由Codex[核定done归档](../testing/glm-nine-final-review.md)。当时只核签字与既有证据、不重跑测试；TB03随后单独收口，见下。

2026-09-20 TB03候选4894719e三席accept齐，用户授权后由Codex[核定done归档](../testing/import-codec-acceptance.md)。本次无测试/基线改动；PNG编码失败close没有随补测关闭；用户后续授权后已由Codex[独立修复](../testing/image-import-cleanup.md)，18回归及check7766/严格fast7277通过。

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| DOC-CURSOR-4 | [场景入场指南当前UI事实核对](tasks/DOC-CURSOR-4-scene-entry-current-ui.md) | draft | Codex材料accept / 指南已窄修 | 31618c0d证据闭合；当前UI两页签、reveal不可编辑；prepare安全目录尚未接入菜单/保存守卫，产品缺口另排 |
| TEST-GROK-PRESENT-2 | [一阶段画面合成与战斗呈现候选回归](tasks/TEST-GROK-PRESENT-2-phase1-composition.md) | draft | Grok定点返工 / Codex复核 | e0d7511e 18绿四针成立；P15可用性手填、P16裸字形未证、role99防御归属待修 |
| DOC-CURSOR-2 | [十二组包说明/CLI/索引核对](tasks/DOC-CURSOR-2-package-tools-indexes.md) | draft | Codex / 按用户边界保留材料接收 | 4b75d1c3/cc2720c5 accept，含NB1/NB2文字观察；无阻断counter，不合main/不标done，修订另核 |
| DOC-CURSOR-1 | [十二份现行文档轻量核对](tasks/DOC-CURSOR-1-current-guide-check.md) | draft | Codex / 按用户边界保留材料接收 | 65193a84/320800ec accept；CR-1/CR-2闭合，无剩余返工，不合main/不标done |
| ARCH-REGRESSION-LAB-GLM-1 | [十二组候选回归与功能视觉](tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md) | draft | GLM按三轮counter纠账/收窄 | bc8613d1实际32绿；40条账11标题过期，跨调用与视觉矩阵仍未闭，未入官方覆盖率 |
| ARCH-SUPPORT-GLM-1 | [八组并行架构/视觉准备](tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md) | draft | Codex / 后续归属与收口 | 58cdf938材料accept，counter清零；文档已合入，按用户要求未标done/未开产品门 |

2026-09-25 [一阶段菜单与索引渲染十组补测](../testing/grok-present-integration.md)由Grok贡献隔离候选、Codex三轮独立复核后选择性接入正式game测试：25项（23生产绘制/解码+2快照自测）、check/受保护ratchet/单次严格fast均通过；fast8090项/641生产文件，全仓分支43067/63176、同分母净增157。旧候选分支未直接merge以免回退主线；full/E2E/视觉观感另排。

2026-09-25 [一阶段有效属性与状态投影补测](../testing/gemini-phase1-stats-integration.md)已按当前委派模式由 Codex 独立验收收口：Gemini 贡献26项，额度耗尽后 Codex 修订 typed fixture/边界断言并正式接入；check、官方ratchet、受保护单次strict-fast均通过，fast8065项/641生产文件，全仓分支42910/63176。无产品源码或统计范围缩减，full/E2E仍另排。

2026-09-25 [A3-b场景资源与预检](../testing/scene-preparation-refactor.md)fdad980f已独立核定done：
26新增/11针、16冻结对照、18函数+2切场宿主保真、check8525/strict8034/641与最小场景往返通过。
main6427→6260；资源缓存与只读准备各有所有者，原同步提交不改。**A3整体仍未完成，总队列仍2/13**，
后续继续活动场景/移动/绘制边界。cb1远端旧测试等待预算失败已由独立ad16修复、远端双门success。

2026-09-25 [A3首段](../testing/runtime-frame-refactor.md)8eb93bb7已独立验证done：36新增/11针、
384帧/896输入对照、check8499/strict8008/639通过；时钟/等待/单步/输入所有权迁出。
**A3整体未完成**，场景/移动/绘制职责续段仍待推进，13批总队列仍为2批完成；GLM八包是后续既有批次的准备支持，不增加8个架构大批。

2026-09-24 [架构治理A2](../testing/battle-host-refactor.md)最终46287966已按用户全队列独立授权done：
战斗启动/准备/会话所有权移出主壳，main6798→6486；23新增/11针、check8463/单次strict7972/637通过，
旧败北随机输入及自审发现的两处时序边界已单列修正。A1+A2共2/13完成；后续从A3继续，不等待Kimi/GLM。

2026-09-24 [架构治理A1](../testing/menu-session-refactor.md)实现dbe55b55已按用户本批单席授权done：
菜单/物品15状态移出主壳，main7153→6798；28新增、155序列3798步等价、10针、最小功能视觉、
check8440/ratchet与单次strict7949/635全过。A2/A3、编辑器与第一阶段仍按队列推进；demo旧地图/调试落点观察单列，不混修。

2026-09-24 用户要求Codex本批独立推进后，[真实宿主二批](../testing/codex-runtime-shell-wave2.md)实现94b59a6f
新增28项/8业务负控，check8412、ratchet与受保护单次strict7921/633全部通过，已核done。
新增715行/507分支、另六包完整基线不变；full校准8230是补测前快照，不混报。Kimi/GLM仅本批豁免，未代签，未跑E2E。

2026-09-24 用户授权本批Codex独立完成后，[环境稳定性](../testing/check-environment-stability.md)与
[FIRE准备/七预制交付](../testing/pal-simulator-presets.md)同源码e17af240通过check8384、ratchet与单次strict7893/633，
两卡核done归档。七套真实开战、三人/巫后停止重开通过；Kimi/GLM缺签按用户裁决登记，不代签、不外推后续任务。
[工作树清理](archive/audits/worktree-retirement-2026-09-24.md)已将21个旧工作树可恢复地移入废纸篓，登记仅剩main，分支未删/恢复。

2026-09-24 [战斗会话流程补测](../testing/battle-workflows-integration.md)源fd4efd76经Codex独立接收与统一集成，
GLM实施者自验accept、Kimi额度耗尽由用户明确豁免；check8363/ratchet7872/单次受保护strict7872（633生产文件）全过，
Codex核定done归档。净增97行/82分支，另六包完整基线对象不变。下一批建议见报告（真实宿主二批与迁移主链去重），
尚未开新卡/授权build；full/Q1/Q2与DEV-TOAST-1不借此关闭。

2026-09-23 统计真值修复与真实宿主补测两卡同候选b6286df0三席accept齐（Codex实施者、Kimi aa436d9f、GLM 326e4906），
用户确认后Codex分别核定done并归档。check8317/ratchet7826/单次受保护strict7826与525c40cd远端CI为既有证据；
本次不跑统计并集。DEV-TOAST-1、其它统计盲点与视觉/full/Q1/Q2边界保持；GLM战斗r2另行接收，不借本次放行。

2026-09-23 [第二波六领域非视觉补测](../testing/glm-coverage-wave2-receipt.md)候选27bd8c00三席accept齐（Codex实施者自验、GLM贡献者复核d8b9dfa7、Kimi独立终审5b44c37d），用户确认后Codex核零漂移并done归档。163项/17针、check8281/单次strict7790与集成f703e49c双CI为既有证据；未达whole-file目标、无caller旧入口、E-05/U-02/frame政策和full/Q1/Q2边界保持。本次只做文档收口，不重跑覆盖率。

2026-09-21 [迁移规划快照与二进制路径保护](../testing/migration-write-guard.md)候选57dda7ed三席accept齐（Codex实现者自验、GLM6ca25cf6、Kimiafb05943），用户授权后Codex核零漂移并done归档；A-08/A-09按r1关闭。check8029/strict7538、五负控、隔离发布双跑及远端#286为既有证据，本次仅文档收口；E-05/U-02/N6b/Q2与单writer等边界保持。

2026-09-21 [E2E前置欠账与准入核对](../testing/pre-e2e-admission.md)已更新：A-08/A-09已按r1收口，但不代表全部欠账清零；U-02保持待证，E-05/Q2/N6b与一阶段分流。R4尚无实施卡与连续检查点，003～010边界待起草确认；不改变R4→N6b→完整Q1/Q2顺序。

2026-09-21 [TB00/TB01窄返工](../testing/tb00-tb01-completion.md)候选44b9b763三席分别accept齐（Codex 430fba79、GLM f38c23dc、Kimi 2c042bf5），用户授权后Codex逐卡核零漂移并done归档；check7988/strict7497及13业务见证/37跑为既有证据，本次只做文档收口。frame在途invalidate回填政策仍待证（Codex后续合同核定，不固化为通过或已知bug）；A3跨包/rows无上限/levelUp owner warn与full/Q1/Q2边界保持。

2026-09-21 [物品作者记录/脚本身份](../testing/item-authoring-implementation.md)候选451cbbb7三席accept齐（Codex c86ad00f、GLM b895a367、Kimi 139c0b04），用户授权后Codex核零漂移并done归档。D-06/D-07关闭；check7909/strict7418、五组负控与原生保存重开为既有证据，本轮只做文档收口。TB00/TB01窄counter与full/Q1/Q2边界保持。

2026-09-20 [共享战斗模拟器首批](../testing/battle-simulator-implementation.md)主体fe0fee84及列宽补丁d394eccc三席accept齐，用户明确「UI验收通过，可以收口」，Codex已done归档。D-04/D-05关闭；原生选择器保存重开浏览器链、360主壳、full/Q1/Q2边界保持，未扩展所有评估入口或宣布完整E2E完成。

2026-09-19 [运行时基础功能补测](../testing/reforge-runtime-contracts-review.md)候选62a18137三席accept齐、无返工，用户确认签字；Codex核零漂移后done归档。60项新增、check7538/严格fast7049通过；后续BGM initP政策与完整E2E仍按原归属推进。

2026-09-19 Codex完成[E-01资源测试输入合同](../testing/phase1-resource-test-inputs.md)：20项无PAL依赖输入回归及真实资源对拍通过，check7478/严格fast6989绿；不改GLM目标面或游戏运行逻辑，不新增三签卡。D-04/D-05独立临时试玩已于2026-09-20共同收口，裁决与历史证据见[审计台账](audits/pre-e2e/editor-workflows.md#d-05--临时试放不改存档的告知与保存行为不一致)。

2026-09-19 Codex完成[E-03/E-04预览缓存常规修复](../testing/editor-preview-cache.md)：仅两个组件私有缓存，15项回归/7负控/原生绘制及check7457/严格fast6969通过；同Owner连续迭代不开新签字卡，不涉及资源格式或公共加载器。

场景引用保护候选83598cc4已三席accept，用户要求本人继续，2026-09-19由Codex[核定done归档](../testing/scene-reference-guard.md)；22新回归、check7442/strict fast6954及功能验证通过，其它审计缺陷不借此关闭。
内容合同补测候选adbabb84已三席accept、用户确认签字，2026-09-18由Codex[核定done归档](../testing/content-contracts-review.md)；新增118项，check7420/strict fast6932通过，43族剩余覆盖及其它审计修复保持原归属。
D-01已完成；B-06/B-07[保存子链修复](../testing/save-barrier-lineage.md)已三席accept、用户要求收口，2026-09-17已done归档。
精灵上传选图修复候选a88ab18d已三席accept、用户验收通过，2026-09-18由Codex[收口归档](../testing/sprite-selection.md)；check7302/strict fast6814通过，G-I04与R4后续边界保持。
编辑器逻辑补测候选5ca9dad2已三席accept、用户授权收口，2026-09-18由Codex[核定done归档](../testing/editor-logic-coverage-review.md)；47项新增、check7282与strict fast6794通过，后续缺口按台账另推。
四包基础测试候选48d3b8e3也已三席accept、用户确认，2026-09-17由Codex[收口归档](../testing/glm-foundation-coverage-review.md)；139项新增、check7218与strict fast6730通过。
世界异步提交候选e13216e7已三席accept、用户确认，2026-09-17由Codex核定done归档；WA-E1～3仍待R4集中执行，不互相借用签字。
检查点导出候选27e605ef也已三席accept、无返工，2026-09-18由Codex核零漂移并done归档；[接口回执](../testing/checkpoint-export.md)的跨页/视觉闭环仍归R4。

准备工作：[六组72检查点工作包（二）](../testing/glm-pre-e2e-boundary-batch-2.md)已由Codex接手完成取证返工与集成（GLM额度耗尽）；[最终回执](../testing/glm-pre-e2e-boundary-batch-2-report.md)记录34覆盖/23复现/15待证及13项隔离鉴别力验证。
这是卡前非视觉诊断准备，不是23个独立bug或已完成修复；该历史取证产品冻结70e3f627。B-05/08/09后续[实现与验证](../testing/world-async-commit.md)已三席accept收口，不代表其余诊断条目已修。

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|

商店生命周期已完成，全仓五批首轮审计亦已取证收口；不代表问题已修复或E2E验收。
全仓文档纠错与结构整理均已收口，日常检查与 CI 已接入。[E-06 质量门禁](audits/pre-e2e/quality-gate-remediation.md)
已修复，完整 `pnpm check` 通过；[B-04 存档预检修复](audits/pre-e2e/save-preflight-remediation.md)已三签收口。
[编辑器覆盖率确定性修复](audits/pre-e2e/coverage-determinism.md)亦已三签收口；D-01整卡实现时fast为6,493项，最新数量见[覆盖率记录](../testing/coverage.md)，覆盖率未下调；废弃源码和旧模型测试退役/迁移已单列记录，计数不代表完整E2E已通过。
A-01 存档隔离已三席 accept、用户免复验通过并收口；证据入口见下方总收口。
A-02 作者保存冲突保护亦已三席及用户验收通过并收口；A-03 [保存中断恢复](../testing/editor-save-recovery-closeout.md)候选cd3de679已三席accept，用户免手动复审通过，已归档。已测大克隆成本与完整E2E待办仍保留；A-07[离开保护](../testing/editor-leave-guard.md)三席终审通过，用户授权继续，已收口；D-01全局撤销顺序候选70e3f627已三席accept，用户明确验收通过，已done归档。
接下来按总收口处理其余审计缺陷并补回归/覆盖率，
然后进入 R4 content20 薄基线 → N6b content21 → 完整 E2E。
修复分组见[总收口](audits/pre-e2e/summary.md)；U-02 待证，第一阶段缺陷与可后置优化分别保留。
GLM的[44项并行只读工作包](../testing/glm-pre-e2e-prep.md)收尾11fb8148已由Codex复核accept并接收（见[接收结论与转正节奏](../testing/glm-pre-e2e-prep-report.md)）：19复现/14覆盖/11待证，非缺陷修复数。先随D-01实施转正式回归，其余随对应卡；D-01设计不重签，本次未改产品/正式测试/覆盖率。

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
