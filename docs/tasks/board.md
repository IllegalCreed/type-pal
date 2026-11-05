# 项目任务看板

Status: current
Owner: Codex（分类与分工维护；各卡 Owner 负责事实写回）
Last reviewed: 2026-11-05
Template: governance-index-v1 / 1.0.0

## 目的

在同一入口区分长期质量治理、第二阶段功能开发和第三阶段储备，明确当前状态、阶段、依赖和下一步。
任务卡保存执行事实，本看板安排分工；[生成任务索引](cards/index.md)负责全量检索，[任务入口](README.md)负责导航。

## 范围

- 包含四条长期质量线、未终态任务和已有规划的依赖顺序；规划行不是新任务卡，也不授 build。
- 完成/取消任务从活动表退出，历史仍从生成索引及[原看板快照](archive/board-history/board-20261004.md)检索；不为分类搬文件、重编号或复制报告。
- 分类整理不验收产品、E2E、视觉、coverage 或部署，不把长期治理全量完成设为功能开发的共同前置。

## 当前状态

续办以PR40合并提交 `eb223e8ae7b9f0062cbbaaf9869e890b6a974c91` 为基点；当前事实按本候选任务卡与原始证据核对。表内英文状态严格取本树任务卡顶部；
“候选已接收”“代码已合入”“整卡 done”分别解释，不能相互替代。旧卡状态已按有限后继接受、主线归属与真实剩余义务对账，不照旧诊断重复开工。

- 文档治理：DOCS-FULL-TEMPLATE-1及五张治理子卡已完成；4536活动/6历史退役、严格待办与完整性0。GLM四包非作者accept及远端399工具/20222覆盖率测试、lint6681零诊断已实取，PR38已依保护规则合入main 75929310。长期规范继续生效，后续新增与清理另按实际范围推进。
- 006：技术与用户观感接收按后继 `33cfb9ad89f8696802b7c2ec466fbc93cccf8149` 及当前原卡范围复用；本候选原卡已明确船身起伏补修后11入口/10状态，不把前轮12/11推广成新同版全测。原技术/用户接受与文档/集成停止线均已闭合，任务done；不重做已闭合NPC和视觉，不授新剧情或音频信用。
- 代码治理：本轮46张旧在办卡实质对账后，34张有限done、10张review、2张draft；终态卡已退出下表，原文和失败不改。剩余12张分别有产品/视觉或测试宿主范围内的未完义务，原全仓告警与未合main不再作为泛化阻塞。逐文件质量仍取[代码账本](audits/code-quality-file-ledger.md)，本次不新授whole-file信用。

## 入口与责任

- Codex 维护本看板、状态一致性和跨工作包依赖；实现仍按原卡单一 Owner 与白名单执行。
- [长期质量治理](#长期质量治理)：代码、文档、仓库瘦身、测试与覆盖率。
- [第二阶段功能开发](#第二阶段功能开发)：E2E、公共脚本与模式、实体初态、脚本内容、发布闭环。
- [第三阶段储备](#第三阶段储备)：完整美术构件还原及其它后续方向。
- 从[任务入口](cards/README.md)读准入和状态规则；新状态先写回原卡，再生成索引并更新本表。

## 长期质量治理

常驻方向与有限批次分开：方向长期存在，每批有明确范围和完成出口。文档治理核保留内容的准确性，仓库瘦身核文件是否仍需存在。

| 工作线 | 唯一事实入口 | 当前状态 | 阶段 | 依赖 | 下一步 |
|---|---|---|---|---|---|
| 代码治理 | [逐文件账本](audits/code-quality-file-ledger.md)、[质量规范](../engineering/guides/code-quality.md) | 持续；当前批次与存量分开 | 跨第一/二阶段及工程工具 | 真实 caller、风险与单一 Owner；不等覆盖率目标才推进 | 核下表旧卡收口义务；新批从实际 pending 选有限模块，复用有效证据 |
| 文档治理 | [质量与验收](../engineering/guides/document-quality.md)、[生成任务索引](cards/index.md) | 本全量批次done；日常增量持续 | ops / 跨阶段 | 原固定接受/来源及真实变更范围 | 新增或变更按公共合同接入；不重复治理已接受正文 |
| 仓库瘦身 | [产物退出流程](../engineering/guides/agent-workflow.md#任务产物收口用户-2026-11-02-固化)、[长期覆盖清单](../engineering/guides/agent-workflow.md#长期清理覆盖范围) | 本批本地清理done；长期方向持续 | 全仓 / 文件与本地Git资源 | 当前归属/会话占用、未提交及忽略内容、真实消费者与可恢复来源 | 本批统一PR；后续任务按现行流程收口新产物，保留活跃开发与有Owner/触发的必要恢复资料 |
| 测试与覆盖率 | [测试治理](../testing/governance.md)、[官方 fast 基线](../../scripts/coverage/baseline.fast.json)、[测试目录](../testing/indexes/README.md) | 持续；基线已有，按真实业务缺口补强 | 跨第一/二阶段 | 合法输入、真实 caller/oracle、排重；集中窗口核官方门 | 结合当前模块补关键未覆盖分支、精简弱测试；不以例数/总比例替代质量 |

### 文档治理：已完成批次

全量父卡、catalog/registry存储、原生JSON/Vitest与记录可信度五子卡已经按后继有效接受和最终主线硬门收口，006任务仅复用原技术/用户判断解除集成停止线。终态卡从活动分工退出，通过[生成索引](cards/index.md)检索；旧R波撤信不恢复，未知历史来源不认证。

### 代码治理：最近完成的文件批次

`QUALITY-PHASE1-PENDING-93-1`：原game78/pal-extract15已逐文件接受，含6项获准整改与旧回合15合同返工；Codex单一Coding Owner。中央3667/970/0/2697；原93不按拆分目的路径重复计数。组成门及必要失败恢复见[唯一回执](evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)，旧撤回不恢复。文件批次done不预授PR/main未来结果；发布按同一治理分支保护检查执行。

### 代码治理：既有批次与卡面收口

下表仅保留本轮对账后仍未终态的12张卡，范围与下一步取原卡当前层；不能把登记风险当作已证玩家缺陷。
后继[pre94 回执](evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/README.md)、
[52 文件收口](evidence/QUALITY-REVIEW-52-CLOSEOUT-1/README.md)、[第三窗口收口](evidence/QUALITY-PENDING-100-3/local-closeout.json)
和[语言资源批次](evidence/QUALITY-GAME-LOCALIZATION-1/README.md)按各自版本消费；不能把旧 coverage/act 阻塞当成今天统一门仍红。
Codex按原卡现有范围推进剩余有界工作，复用已核原件；新的产品取舍与真实缺口各自准入，不重做已接受范围。

| ID | 原任务入口 | 卡面状态 | 阶段 | 当前剩余范围 | 下一步 |
|---|---|---|---|---|---|
| QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1 | [战斗精灵帧需求边界](cards/QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1.md) | draft | 第二阶段 | 合法帧需求/资源边界尚未获产品build准入 | 核最小输入、真实caller与资源前提，再定Owner/白名单 |
| CODE-QUALITY-103 | [editor残余测试逐文件复核](cards/CODE-QUALITY-103-editor-residual-tests-review.md) | review | 第二阶段 | 仅P1 puppet自动battleOnly的产品选择；测试及旧发布已承接 | 明确可见before/after后交用户裁定，不夹改行为 |
| QUALITY-EDITOR-DIAGNOSTICS-1 | [editor测试诊断清理](cards/QUALITY-EDITOR-DIAGNOSTICS-1.md) | review | 第二阶段 | 共享host挂起/异常清理及C01三个oracle候选 | 按原卡真实caller窄核root/DOM/spy恢复与指定oracle |
| QUALITY-EDITOR-DIAGNOSTICS-2 | [C02宿主与删除生命周期](cards/QUALITY-EDITOR-DIAGNOSTICS-2.md) | review | 第二阶段 | 共享host pending/失败退出与清理独验 | 只核已有harness catch/finally及实际caller |
| QUALITY-EDITOR-DIAGNOSTICS-3 | [C02导入与历史回流](cards/QUALITY-EDITOR-DIAGNOSTICS-3.md) | review | 第二阶段 | 原挂起输入的导航/退出清理证据 | 复用29例与反控，补具体故障路径，不全库重扫 |
| QUALITY-EDITOR-DIAGNOSTICS-4 | [Kimi战斗精灵工作流](cards/QUALITY-EDITOR-DIAGNOSTICS-4.md) | review | 第二阶段 | C02/C03 host前提及六工作流复用范围 | 跟随共享host有界接受，再核本卡六工作流 |
| QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1 | [C03向导真实异步等待](cards/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1.md) | review | 第二阶段 | 原四scope完整非作者据证接受；作者已交付 | 核before/after/native/身份转移，仅矛盾再展开 |
| GAME-ACTION-QUEUE-TIE-ORDER-1 | [第一阶段同速队列](cards/GAME-ACTION-QUEUE-TIE-ORDER-1.md) | review | 第一阶段 | 真实动画/dualMove的功能表现接受 | 按原两敌一玩家/seed5范围观察动作先后 |
| GAME-MAGIC-NUMERIC-ASSIGNMENT-1 | [第一阶段法术数值赋值](cards/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md) | review | 第一阶段 | 原授权的有限caller/数值域及功能展示 | 按原卡seed/正防御边界核实际可见结果 |
| QUALITY-BATTLE-MAGIC-PARITY-1 | [pre-94战斗机制counter](cards/QUALITY-BATTLE-MAGIC-PARITY-1.md) | review | 第一阶段 | 原卡明示的浏览器功能表现；机制窄修已接受 | 先核合法caller，再按原批准核模拟选靶/防御/复活 |
| QUALITY-RLE-COMMAND-TRUTH-1 | [PAL资源来源规则](cards/QUALITY-RLE-COMMAND-TRUTH-1.md) | review | 跨阶段 / 资源 | 当前canonical格式/decoder catch判别力边界 | 核合法大图与caller合同，不默认扩大格式修复 |
| GAME-OUTSIDE-MAGIC-DISABLED-1 | [大世界法术显示与禁用](cards/GAME-OUTSIDE-MAGIC-DISABLED-1.md) | draft | 第一阶段 | 未批③：已学法术显示真值与可用范围 | 先核DOS实机或用户产品选择，保持draft |

战斗回合返工已并入上述有限批次收口，旧15VALID/accept永久撤回；原卡由[生成索引](cards/index.md)按需追溯，不再保留活动席位。

## 第二阶段功能开发

依赖主线沿既定[路线](../phase2/roadmap.md)与[能力地图](../phase2/capability-map.md)推进：
薄 E2E（前十段、四种取物 canary、编辑保存重开试玩）→ N6b 窄版 → 同一基线复验 → 完整战斗/剧情与编辑器综合验证 → 录制与发布闭环。
代码、文档和覆盖率按影响范围提供门禁，不要求全部存量先清零。实体初态与脚本用途整理随实际剧情一起推进。

### 当前执行任务

| ID | 原任务入口 | 卡面状态 | 阶段 | 依赖 / 当前范围 | Owner / 下一步 |
|---|---|---|---|---|---|
| E2E-R4-1 | [路线驱动与合法检查点薄基线](cards/E2E-R4-1-route-and-checkpoint-foundation.md) | build | 第二阶段与双阶段对照 | 同引擎真实前驱与检查点，完整战斗专项后置 | Codex / 001–006 有限基线收尾，007 双轨技术候选已到迷宫并验证正式终档。前十段、四种取物与编辑保存工作流继续按原范围推进 |
| E2E-007-1 | [从仙灵岛码头到迷宫入口](cards/E2E-007-1-island-entrance-to-maze.md) | rework | 双阶段剧情验证 | 各自正式 006 终档，普通遭遇速胜并正式结算 | Codex / Reforge 奖励窗修正及双轨实跑通过，待用户查看新版分屏确认观感。正式测试目录另按发布准入处理 |
| E2E-005-1 | [买虾出门与香兰报信](cards/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | 第二阶段；双阶段对照 | 原卡技术接收与用户观感分开；005 也是 006 前驱 | Codex / 核后继连续链和用户裁决覆盖范围，回写原卡；后继跑通不自动接收未覆盖专项 |
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案与编辑器预览](cards/ED-ENTITY-STATE-PLAN-1.md) | review | 第二阶段 | 初态编排UI已获用户接受；跨场景预览已接入，006船入口到仙灵岛对白/暂停/返回实页通过 | /root/ui_affordances / Codex；编辑选择与起播视角保持，载具/音乐等预览桩限制保留；001–006当前场景静态前态与保存已在R4有限收尾，完整现场恢复不外推 |
| SCRIPT-AUTHOR-2 | [脚本用途命名与编排整理](cards/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | 第二阶段 / 作者内容 | 已核正文、真实调用和 E2E 现场；保存 counter 已有后继闭合 | Codex / 按实际剧情补用途名、整理复杂流程；不猜未读剧情、不恢复退役转换规则 |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档 IO 失败](cards/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 第二阶段 | 失败传播、真实 caller、Owner 与白名单尚待准入 | Codex / 先复现并核当前前提，再决定有限修复；draft 不授权实现 |

### 已有规划的后续工作

这些行只指向已有规范/规划，没有另建任务状态源；实际开工仍从原方向核定有限任务范围。

| 工作 | 已有入口 | 当前状态 | 阶段 | 依赖 | 下一步 |
|---|---|---|---|---|---|
| 公共脚本提取与 N6b 意图模式 | [共享脚本指南](../phase2/guides/shared-script-author-guide.md)、[N6b 范围](../phase2/design-backlog.md#n6b-强类型脚本模式库) | N6 基础能力已有；N6b 窄版未实施 | 第二阶段 | R4 前十段薄基线、四种取物 canary 和编辑器工作流 | 先以四种取物生命周期核类型参数/业务表单/单向展开；开卡时核当前格式，不预占旧版本号 |
| 完整战斗、剧情与编辑器 E2E | [E2E 合同](../testing/e2e/contract.md)、[阶段路线](../phase2/roadmap.md) | 薄基线之后扩展，未全量完成 | 第二阶段 | N6b 变更后的同基线复验；编辑器综合前核敌队大目录滚动 | 分批推进 Q2、Q1 全剧情和空白工程创作保存试玩；与单元覆盖率分别验收 |
| 录制与第二阶段发布闭环 | [能力地图](../phase2/capability-map.md)、[路线图](../phase2/roadmap.md) | 后续收口；不是当前已交付 | 第二阶段 | Q1/Q2 与编辑器工作流；当前 canonical 工程资源闭包 | 按既定顺序核 capture/录制、A1 版本化预制库、A8 独立可玩包及干净环境 E2E |

## 第三阶段储备

| 工作 | 已有入口 | 当前状态 | 阶段 | 依赖 | 下一步 |
|---|---|---|---|---|---|
| 从碎 tile 还原完整游戏美术构件 | [构件提取、房间重绘与场景脚本迁移](../phase3/map-reconstruction.md)、[D32](../phase2/decisions.md#d32--构件化地图重建与拆房迁移归第三阶段2026-09-28) | 方向已确认；设计 draft，未 build | 第三阶段 | 第二阶段范围保持；试点先核原始像素、遮挡高度、地图/脚本坐标与引用迁移 | 从一扇门/一个房间试点，再扩完整构件、刷绘和重建；不是第二阶段 E2E 前置，也不等于自有素材替换 |
| 自有素材替换及其它第三阶段方向 | [第三阶段 backlog](../phase3/backlog.md) | 候选池，按原决定分别排期 | 第三阶段 | 第二阶段发布边界与各方向自己的前提 | 开工时核当前范围；不借本次导航整理提前实施或改变阶段 |

## 证据与下一步

- PR40/41的状态对账与产物清退已交付；本轮本地资源批次已收齐106个旧分支、15棵手工工作树、用户删除的S53及已核临时载体，5棵活动工作树保护。已完成卡经[生成索引](cards/index.md)按需追溯；长期清理规则回现行工程流程，本批统一PR。此前文档治理仍取原DOCS-FULL-TEMPLATE-1，不新建平行状态或清理账本。
- 最新状态先写原卡，再由 `node scripts/docs/check.mjs --print-task-index` 生成索引；本表同步原状态和真正下一步。
- 已合入代码、局部接收、统一门、远端发布和用户观感各有范围；旧失败仍按原时点保留，不冒充当前失败，也不删除未闭合义务。
- 纯导航检查只验证可达性、状态一致和本次文档差异；不能代替全仓语义治理、runtime、E2E、视觉或 coverage 验收。
