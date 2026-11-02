# 项目任务看板

Status: current
Owner: Codex（分类与分工维护；各卡 Owner 负责事实写回）
Last reviewed: 2026-11-02
Template: governance-index-v1 / 1.0.0

## 目的

在同一入口区分长期质量治理、第二阶段功能开发和第三阶段储备，明确当前状态、阶段、依赖和下一步。
任务卡保存执行事实，本看板安排分工；[生成任务索引](cards/index.md)负责全量检索，[任务入口](README.md)负责导航。

## 范围

- 包含四条长期质量线、未终态任务和已有规划的依赖顺序；规划行不是新任务卡，也不授 build。
- 完成/取消任务从活动表退出，历史仍从生成索引及[原看板快照](archive/board-history/board-20261004.md)检索；不为分类搬文件、重编号或复制报告。
- 分类整理不验收产品、E2E、视觉、coverage 或部署，不把长期治理全量完成设为功能开发的共同前置。

## 当前状态

分类承接已批准主线 `02a67c5aa639d43813511a552d44a1c4e5a99b78`；当前事实按本候选任务卡与原始证据核对。表内英文状态严格取本树任务卡顶部；
“候选已接收”“代码已合入”“整卡 done”分别解释，不能相互替代。历史卡面未同步时明确列为待对账，不照旧诊断重复开工。

- 文档治理：DOCS-FULL-TEMPLATE-1及五张治理子卡已完成；4536活动/6历史退役、严格待办与完整性0。GLM四包非作者accept及远端399工具/20222覆盖率测试、lint6681零诊断已实取，PR38已依保护规则合入main 75929310。长期规范继续生效，后续新增与清理另按实际范围推进。
- 006：技术与用户观感接收按后继 `33cfb9ad89f8696802b7c2ec466fbc93cccf8149` 及当前原卡范围复用；本候选原卡已明确船身起伏补修后11入口/10状态，不把前轮12/11推广成新同版全测。原技术/用户接受与文档/集成停止线均已闭合，任务done；不重做已闭合NPC和视觉，不授新剧情或音频信用。
- 代码治理：后继批次已产生接收与统一门回执，最新逐路径状态以[代码账本](audits/code-quality-file-ledger.md)为准。卡面仍 build/review 不自动等于源码还需重做；整卡的产品/视觉及发布义务逐项对账。

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
| 仓库瘦身 | [产物退出流程](../engineering/guides/agent-workflow.md#任务产物收口用户-2026-11-02-固化)、[任务索引](cards/index.md) | 本轮存量done；日常流程持续 | 全仓 / 文档与工具 | 读取、恢复、独立接受与必要本地门已通过 | 本轮REPO-SLIM-PLAN-1从索引追溯；新任务按退出条件清理，远端集成结果取对应PR |
| 测试与覆盖率 | [测试治理](../testing/governance.md)、[官方 fast 基线](../../scripts/coverage/baseline.fast.json)、[测试目录](../testing/indexes/README.md) | 持续；基线已有，按真实业务缺口补强 | 跨第一/二阶段 | 合法输入、真实 caller/oracle、排重；集中窗口核官方门 | 结合当前模块补关键未覆盖分支、精简弱测试；不以例数/总比例替代质量 |

### 文档治理：已完成批次

全量父卡、catalog/registry存储、原生JSON/Vitest与记录可信度五子卡已经按后继有效接受和最终主线硬门收口，006任务仅复用原技术/用户判断解除集成停止线。终态卡从活动分工退出，通过[生成索引](cards/index.md)检索；旧R波撤信不恢复，未知历史来源不认证。

### 代码治理：既有批次与卡面收口

下表保留未终态卡的身份和卡面状态。“待对账义务”指接手时要在原卡及后继证据中核实的范围，不宣称每项仍是当前产品缺陷。
后继[pre94 回执](evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/README.md)、
[52 文件收口](evidence/QUALITY-REVIEW-52-CLOSEOUT-1/README.md)、[第三窗口收口](evidence/QUALITY-PENDING-100-3/local-closeout.json)
和[语言资源批次](evidence/QUALITY-GAME-LOCALIZATION-1/README.md)按各自版本消费；不能把旧 coverage/act 阻塞当成今天统一门仍红。
除另标 draft 外，下一步均由 Codex 先映射后继接收、实际主线提交和原卡剩余义务，再写回原卡终态；仅对新差异或具体缺口定向复验。

| ID | 原任务入口 | 卡面状态 | 阶段 | 依赖 / 待对账义务 | 下一步 |
|---|---|---|---|---|---|
| GAME-INPUT-KEYMAP-OWN-KEY-1 | [键位查表自有字段](cards/GAME-INPUT-KEYMAP-OWN-KEY-1.md) | review | 第一阶段 | 自有字段窄修与普通键盘可达性的不同边界 | 核后继证据并同步原卡 |
| QUALITY-PENDING-100-3 | [第三治理窗口](cards/QUALITY-PENDING-100-3.md) | review | 跨阶段 / ops | 本地代码/统一门已接收；主线发布与卡面尚需同步 | 核后继证据并同步原卡 |
| QUALITY-MIGRATION-MERGE-OWN-JSON-1 | [三方合并 JSON 字段所有权](cards/QUALITY-MIGRATION-MERGE-OWN-JSON-1.md) | review | 第二阶段 | 第三窗口；JSON 字段所有权窄修 | 核后继证据并同步原卡 |
| QUALITY-MIGRATION-ASSET-TAKEOVER-1 | [作者资源接管与快捷路径](cards/QUALITY-MIGRATION-ASSET-TAKEOVER-1.md) | review | 第二阶段 | 第三窗口；作者接管与真实重导边界 | 核后继证据并同步原卡 |
| QUALITY-MIGRATION-CONTROL-OWNERSHIP-1 | [事务内部写入路径所有权](cards/QUALITY-MIGRATION-CONTROL-OWNERSHIP-1.md) | review | 第二阶段 | 第三窗口；事务内部路径与恢复保全 | 核后继证据并同步原卡 |
| QUALITY-MIGRATION-BASELINE-PATH-DOMAIN-1 | [基线清单路径输入域](cards/QUALITY-MIGRATION-BASELINE-PATH-DOMAIN-1.md) | review | 第二阶段 | 第三窗口；基线路径输入域 | 核后继证据并同步原卡 |
| QUALITY-MIGRATION-UNMANAGED-AUDIT-RETIREMENT-1 | [无用非托管哈希接口退役](cards/QUALITY-MIGRATION-UNMANAGED-AUDIT-RETIREMENT-1.md) | review | 第二阶段 | 第三窗口；退役接口与有效断言去向 | 核后继证据并同步原卡 |
| QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1 | [战斗精灵帧需求边界](cards/QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1.md) | draft | 第二阶段 | 资产帧需求合法域与 RangeError 原因尚待准入 | 核前提/Owner/范围后才可 build |
| GAME-VIDEO-PUBLISH-BOUNDARY-1 | [视频子路径所有权与失败发布](cards/GAME-VIDEO-PUBLISH-BOUNDARY-1.md) | build | 第一阶段 | 窄修已实施；52 窗口已接收视频边界，卡面待同步 | 核后继证据并同步原卡 |
| CODE-QUALITY-3Y-CLOSEOUT-1 | [统一治理分支与3y复审](cards/CODE-QUALITY-3Y-CLOSEOUT-1.md) | build | 第一阶段 | pre94 接收、PR22 之后的实际发布与原卡状态 | 核后继证据并同步原卡 |
| CODE-QUALITY-53 | [game player status runtime-zero ownership conflict](cards/CODE-QUALITY-53-player-status-runtime-zero.md) | review | 第一阶段 | 状态/毒/失败拒绝接收与剩余产品义务 | 核后继证据并同步原卡 |
| CODE-QUALITY-57 | [game bootstrap thumbnail seam boundary](cards/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | 第一阶段 | thumbnail 像素 oracle 与视觉边界 | 核后继证据并同步原卡 |
| CODE-QUALITY-103 | [editor残余测试逐文件复核](cards/CODE-QUALITY-103-editor-residual-tests-review.md) | review | 第二阶段 | 52 窗口专测接收；puppet 产品取舍单列 | 核后继证据并同步原卡 |
| CODE-QUALITY-104 | [editor M02 测试 act 生命周期诊断](cards/CODE-QUALITY-104-editor-act-diagnostics.md) | review | 第二阶段 | 数值表单专测与后继统一门 | 核后继证据并同步原卡 |
| CODE-QUALITY-105 | [Reforge MenuBox 残余测试逐文件复核](cards/CODE-QUALITY-105-reforge-menu-box-residual-review.md) | review | 第二阶段 | MenuBox 合同、反控与后继统一门 | 核后继证据并同步原卡 |
| CODE-QUALITY-106 | [Reforge reward-gain 测试 Promise 诊断](cards/CODE-QUALITY-106-reforge-reward-gain-act-diagnostic.md) | review | 第二阶段 | reward-gain Promise/Abort 合同 | 核后继证据并同步原卡 |
| CODE-QUALITY-107 | [Game menu primitives / item-select 逐文件复核](cards/CODE-QUALITY-107-game-menu-primitives-item-select-review.md) | review | 第一阶段 | menu primitives/item-select 与相邻诊断归属 | 核后继证据并同步原卡 |
| CODE-QUALITY-108 | [game magic-script warning ownership](cards/CODE-QUALITY-108-game-magic-script-warning-diagnostic.md) | review | 第一阶段 | magic-script warning 归属与后继统一门 | 核后继证据并同步原卡 |
| CODE-QUALITY-109 | [game analytics 安装器生命周期复核](cards/CODE-QUALITY-109-game-analytics-install-review.md) | review | 第一阶段 | analytics 安装器/teardown 所有权 | 核后继证据并同步原卡 |
| CODE-QUALITY-110 | [game present draw-sprite 逐文件复核](cards/CODE-QUALITY-110-game-draw-sprite-review.md) | review | 第一阶段 | draw-sprite 有限读域与统一门 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-DIAGNOSTICS-1 | [editor测试诊断清理](cards/QUALITY-EDITOR-DIAGNOSTICS-1.md) | review | 第二阶段 | editor 专测诊断切片 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-DIAGNOSTICS-2 | [C02宿主与删除生命周期](cards/QUALITY-EDITOR-DIAGNOSTICS-2.md) | review | 第二阶段 | C02 宿主/删除生命周期 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-DIAGNOSTICS-3 | [C02导入与历史回流](cards/QUALITY-EDITOR-DIAGNOSTICS-3.md) | review | 第二阶段 | C02 导入/历史回流 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-DIAGNOSTICS-4 | [Kimi战斗精灵工作流](cards/QUALITY-EDITOR-DIAGNOSTICS-4.md) | review | 第二阶段 | 战斗精灵工作流与实际宿主 | 核后继证据并同步原卡 |
| QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1 | [宿主导航与真实事件](cards/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md) | review | 第二阶段 | 宿主导航与真实事件 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-FORM-FIXTURES-1 | [数值表单合法夹具与生命周期](cards/QUALITY-EDITOR-FORM-FIXTURES-1.md) | review | 第二阶段 | 合法数值夹具与生命周期 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1 | [大世界精灵真实宿主](cards/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1.md) | build | 第二阶段 | 大世界精灵真实宿主与后继接收 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1 | [C03查看器宿主与迟到读取](cards/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md) | build | 第二阶段 | 查看器迟到读取与后继接收 | 核后继证据并同步原卡 |
| QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1 | [C03向导真实异步等待](cards/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1.md) | build | 第二阶段 | 上传向导异步等待与后继接收 | 核后继证据并同步原卡 |
| QUALITY-DOCS-GIT-PATH-ENUMERATION-1 | [Git全路径枚举容量](cards/QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md) | review | 跨阶段 / ops | Git 完整路径枚举合同与后继集中门 | 核后继证据并同步原卡 |
| GAME-TOOLS-SAVE-IMPORT-READ-ERROR-1 | [pre94导入读取失败提示](cards/GAME-TOOLS-SAVE-IMPORT-READ-ERROR-1.md) | review | 第一阶段 | 导入读取失败反馈与槽位不变 | 核后继证据并同步原卡 |
| GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1 | [pre94换图失败资源/拒绝归属](cards/GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1.md) | review | 第一阶段 | 换图失败、迟到结果及重访所有权 | 核后继证据并同步原卡 |
| GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1 | [pre94工具导出失败提示](cards/GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1.md) | review | 第一阶段 | 导出失败反馈、URL 清理及真实 IO | 核后继证据并同步原卡 |
| GAME-ACTION-QUEUE-TIE-ORDER-1 | [第一阶段同速队列](cards/GAME-ACTION-QUEUE-TIE-ORDER-1.md) | review | 第一阶段 | 同速队列机制证据与视觉义务 | 核后继证据并同步原卡 |
| GAME-PLAYER-POISON-SLOT-COMPACTION-1 | [毒列表与入口所有权](cards/GAME-PLAYER-POISON-SLOT-COMPACTION-1.md) | review | 第一阶段 | 全槽稳定压缩、入口所有权及嵌套边界 | 核后继证据并同步原卡 |
| GAME-MAGIC-NUMERIC-ASSIGNMENT-1 | [第一阶段法术数值赋值](cards/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md) | review | 第一阶段 | 数值赋值/抗性一手依据与扩展域边界 | 核后继证据并同步原卡 |
| QUALITY-BATTLE-MAGIC-PARITY-1 | [pre-94战斗机制counter](cards/QUALITY-BATTLE-MAGIC-PARITY-1.md) | review | 第一阶段 | 战斗机制 counter、复活装备状态与视觉范围 | 核后继证据并同步原卡 |
| QUALITY-FETCH-ABORT-LIFECYCLE-1 | [重试等待与Request取消](cards/QUALITY-FETCH-ABORT-LIFECYCLE-1.md) | build | 第一阶段 | 取消反例、当前修复及后继统一门 | 核后继证据并同步原卡 |
| QUALITY-GAME-RUNTIME-DIAGNOSTICS-1 | [game运行时诊断核清](cards/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md) | build | 第一阶段 | game 逐文件诊断归因与后继接收 | 核后继证据并同步原卡 |
| QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 | [提取器共享输出清理边界](cards/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md) | build | 第一阶段 | 共享输出保护；视频/其它策略分别核 | 核后继证据并同步原卡 |
| QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 | [extract原盘执行完整性](cards/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md) | build | 第一阶段 | 真实原盘测试执行、反控与编号卡映射 | 核后继证据并同步原卡 |
| QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 | [事件切分控制流与元数据](cards/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md) | review | 第一阶段 | 原盘控制流接边、元数据与 CLI 范围 | 核后继证据并同步原卡 |
| QUALITY-RLE-COMMAND-TRUTH-1 | [PAL资源来源规则](cards/QUALITY-RLE-COMMAND-TRUTH-1.md) | review | 跨阶段 / 资源 | PAL/作者资源分域与供应产物范围 | 核后继证据并同步原卡 |
| GAME-SAVE-IDB-COMMIT-1 | [存档事务提交与失败传播](cards/GAME-SAVE-IDB-COMMIT-1.md) | review | 第一阶段 | 事务提交/失败传播与真实 IDB 回归 | 核后继证据并同步原卡 |
| GAME-OPENING-CANCEL-CURSOR-1 | [标题取消光标](cards/GAME-OPENING-CANCEL-CURSOR-1.md) | review | 第一阶段 | 标题取消光标与已采浏览器证据 | 核后继证据并同步原卡 |
| GAME-OUTSIDE-MAGIC-DISABLED-1 | [大世界法术显示与禁用](cards/GAME-OUTSIDE-MAGIC-DISABLED-1.md) | draft | 第一阶段 | 显示真值/可用范围尚未获行为修改准入 | 核前提/Owner/范围后才可 build |

### 测试与覆盖率：当前返工卡

| ID | 原任务入口 | 卡面状态 | 阶段 | 依赖 / 当前范围 | Owner / 下一步 |
|---|---|---|---|---|---|
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [战斗回合与结算边界](cards/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | rework | 第一阶段 | 原 accept 撤回；合法输入和原始业务反控须对账 | GLM 原贡献 / Codex 接收；先核当前后继证据，只补未闭合合同，不按全绿自动 accept |

## 第二阶段功能开发

依赖主线沿既定[路线](../phase2/roadmap.md)与[能力地图](../phase2/capability-map.md)推进：
薄 E2E（前十段、四种取物 canary、编辑保存重开试玩）→ N6b 窄版 → 同一基线复验 → 完整战斗/剧情与编辑器综合验证 → 录制与发布闭环。
代码、文档和覆盖率按影响范围提供门禁，不要求全部存量先清零。实体初态与脚本用途整理随实际剧情一起推进。

### 当前执行任务

| ID | 原任务入口 | 卡面状态 | 阶段 | 依赖 / 当前范围 | Owner / 下一步 |
|---|---|---|---|---|---|
| E2E-R4-1 | [路线驱动与合法检查点薄基线](cards/E2E-R4-1-route-and-checkpoint-foundation.md) | build | 第二阶段；双阶段对照 / ops | 同引擎真实前驱与检查点；001–006 各自证据范围；异常清理单独核 | Codex / 协调 006 接入，补前十段薄基线、四取物 canary 与编辑保存重开试玩；完整 Q1/Q2 后置 |
| E2E-005-1 | [买虾出门与香兰报信](cards/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | 第二阶段；双阶段对照 | 原卡技术接收与用户观感分开；005 也是 006 前驱 | Codex / 核后继连续链和用户裁决覆盖范围，回写原卡；后继跑通不自动接收未覆盖专项 |
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案与编辑器预览](cards/ED-ENTITY-STATE-PLAN-1.md) | review | 第二阶段 | 静态 UI 已通过试用；每段现场决定位置/朝向/显隐等初态 | Codex / 随 E2E 采集并保存步骤关联，核重开/播放/重置；完整动态现场恢复另核范围 |
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

- 本次导航改动的授权、白名单、验证和交接写回原 DOCS-FULL-TEMPLATE-1；没有新建平行路线图、任务卡或清理账本。
- 最新状态先写原卡，再由 `node scripts/docs/check.mjs --print-task-index` 生成索引；本表同步原状态和真正下一步。
- 已合入代码、局部接收、统一门、远端发布和用户观感各有范围；旧失败仍按原时点保留，不冒充当前失败，也不删除未闭合义务。
- 纯导航检查只验证可达性、状态一致和本次文档差异；不能代替全仓语义治理、runtime、E2E、视觉或 coverage 验收。
