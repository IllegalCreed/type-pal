# 多 Agent 任务看板

当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。

Last reviewed: 2026-10-23
Template: governance-index-v1 / 1.0.0

## 目的
- 记录当前未终态任务的责任、状态和唯一入口，避免历史任务重新获得执行授权。

## 范围
- 当前包含：活动任务卡、负责人和下一步。
- 明确不包含：产品 runtime、E2E、视觉、coverage 或部署验收。

## 当前状态
- `status`: current
- `lastReviewed`: 2026-10-23

## 入口与责任
- canonical 入口：本看板、`docs/ops/tasks/index.md` 和各任务卡。
- Owner：Codex 维护看板一致性；各 Coding Owner 维护任务卡状态。
- 下游使用者：任务卡检查器、文档 registry 和跨阶段治理矩阵。

## 证据与下一步
- 关键来源：任务卡顶部 `Status`、任务卡正文、对应 evidence 目录和历史看板快照。
- 未决/阻塞：每个活动任务的具体缺口以卡内证据和状态为准。
- 下一步：任务状态变化时同步看板、生成索引、registry 和 review SHA。

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案、脚本组合与编辑器预览](tasks/ED-ENTITY-STATE-PLAN-1.md) | review | Codex / 完整现场与E2E采集待续 | 首批UI用户验收通过；临时方案丢弃，正式状态须经E2E核对 |
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [战斗回合与结算边界测试](tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | rework | GLM / 补原始反控与合法输入；Codex复核 | 先前accept撤回；全绿与已合入不等于合同验收 |
| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |
| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |
| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 补关键NPC日志与一阶段对比 | 剧情链可达但视觉与关键NPC日志未闭合 |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |
| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |
| CODE-QUALITY-3Y-CLOSEOUT-1 | [统一治理分支与3y复审](tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md) | build | Codex / 统一3y，逐卡复审 | 既有阶段已同步main；余项沿pre94逐卡复审，未知仍review |
| CODE-QUALITY-53 | [game player status runtime-zero ownership conflict](tasks/CODE-QUALITY-53-player-status-runtime-zero.md) | review | Codex / 代码接受，统一集成另核 | 既有状态/毒/GS/Dev/专测证据保留；0x99失败拒绝counter修复，event-system与53整卡代码信用恢复。 |
| CODE-QUALITY-57 | [game bootstrap thumbnail seam boundary](tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | Codex / 缺 thumbnail 像素 oracle 与视觉裁决，禁止实现 | bootstrap 两层直绘未调用 seam repair；与 gameplay 补偿边界待核 |
| CODE-QUALITY-95 | [menu合法夹具](tasks/CODE-QUALITY-95-menu-fixture-legality-counter.md) | review | Codex / 等统一门 | 三份局部accept保持，不关闭文件 |
| CODE-QUALITY-94 | [menu阶段集成](tasks/CODE-QUALITY-94-menu-integration-window.md) | rework | Codex / 已接手返工 | 两项获批行为已修；完整门带诊断，第三项法术显示未动 |
| CODE-QUALITY-97 | [menu基础helper](tasks/CODE-QUALITY-97-menu-helper-primitives-item-select.md) | review | Codex / 已修注释 | 撤回伪原版锚；test-only合同仍待核 |
| CODE-QUALITY-98 | [opening/player-status](tasks/CODE-QUALITY-98-menu-opening-player-status.md) | review | Codex / 已修注释与排重 | 取消链产品风险另卡，未关闭文件 |
| CODE-QUALITY-99 | [menu输入路由](tasks/CODE-QUALITY-99-menu-driver-review.md) | review | Codex / 已修标题取消 | 单测先红后绿、实际浏览器回新游戏高亮 |
| CODE-QUALITY-100 | [存档槽菜单](tasks/CODE-QUALITY-100-save-slot-menu-review.md) | review | Codex / 排重漏迁勘误与API补证 | 原完全等价排重撤回，六字段/读侧克隆补回API；菜单主测重开review，统一门仍待 |
| CODE-QUALITY-101 | [Save API/IDB](tasks/CODE-QUALITY-101-save-api-review.md) | review | Codex / 补审漏迁合同已补，输入域另卡 | 六字段与读侧克隆9例；事务主路径独立测试保留，输入/连接生命周期未闭合 |
| CODE-QUALITY-102 | [快存快读](tasks/CODE-QUALITY-102-quick-save-review.md) | review | Codex / 两文件已独立核验 | quick-save.ts 与 quick-save.test.ts 已登记已验证；任务卡仍等统一诊断与 coverage 收口 |
| CODE-QUALITY-103 | [editor残余测试逐文件复核](tasks/CODE-QUALITY-103-editor-residual-tests-review.md) | review | Codex / 相邻诊断清零后复验 | 两文件定向4/4；相邻224/224但22条React act诊断，未关闭 |
| CODE-QUALITY-104 | [editor M02 测试 act 生命周期诊断](tasks/CODE-QUALITY-104-editor-act-diagnostics.md) | review | Codex / coverage baseline 收口后复验 | 两文件/24相邻测试零诊断；coverage ratchet/protected 仍受 shared/pal-extract baseline 阻塞 |
| CODE-QUALITY-105 | [Reforge MenuBox 残余测试逐文件复核](tasks/CODE-QUALITY-105-reforge-menu-box-residual-review.md) | review | Codex / 先处理相邻 Vitest 未 await 诊断 | 5合同/25定向通过，K1–K5反控当前重放通过；相邻118测试仍有一条未 await 诊断，coverage门阻塞 |
| CODE-QUALITY-106 | [Reforge reward-gain 测试 Promise 诊断](tasks/CODE-QUALITY-106-reforge-reward-gain-act-diagnostic.md) | review | Codex / 运行全仓质量门后复验 | 定向5/5、相邻21/118零 stderr；仅测试 Promise/Abort oracle 修复，coverage门仍待收口 |
| CODE-QUALITY-107 | [Game menu primitives / item-select 逐文件复核](tasks/CODE-QUALITY-107-game-menu-primitives-item-select-review.md) | review | Codex / 先处理相邻 magic-script 诊断并跑全仓门 | 7文件/78定向通过；相邻40/377保留2条预期 labelMap stderr，E-4/E-5另卡 |
| CODE-QUALITY-108 | [game magic-script warning ownership](tasks/CODE-QUALITY-108-game-magic-script-warning-diagnostic.md) | review | Codex / coverage baseline 收口后复验 | 缺失 label 两项 warning 已捕获；定向37/37、相邻377/377、全仓 check 零 stderr；coverage baseline 仍阻塞 |
| GAME-MENU-HELPER-API-1 | [menu helper 公共出口删除准入](tasks/GAME-MENU-HELPER-API-1.md) | draft | Codex / 等公共接口准入裁决 | E-4/E-5 caller census 完成；只登记，不删除、不改公共接口 |
| CODE-QUALITY-109 | [game analytics 安装器生命周期复核](tasks/CODE-QUALITY-109-game-analytics-install-review.md) | review | Codex / 完整门后复验 | 补 test teardown ownership；analytics 6/23 定向、game typecheck 通过，待全仓门 |
| CODE-QUALITY-110 | [game present draw-sprite 逐文件复核](tasks/CODE-QUALITY-110-game-draw-sprite-review.md) | review | Codex / 完整门后复验 | 3文件/17定向、game typecheck 通过；未发现直接缺陷，待全仓门 |
| QUALITY-EDITOR-DIAGNOSTICS-1 | [editor测试诊断清理](tasks/QUALITY-EDITOR-DIAGNOSTICS-1.md) | review | Codex / 后续诊断切片待核 | 67定向0诊断；完整门仍非零诊断，未合main |
| QUALITY-EDITOR-DIAGNOSTICS-2 | [C02宿主与删除生命周期](tasks/QUALITY-EDITOR-DIAGNOSTICS-2.md) | review | Codex / 续C02剩余用例 | 九例0诊断、两反控；完整门仍非零，不合main |
| QUALITY-EDITOR-DIAGNOSTICS-3 | [C02导入与历史回流](tasks/QUALITY-EDITOR-DIAGNOSTICS-3.md) | review | Codex / 续Kimi工作流 | 29定向/77相邻0诊断；完整门带其它诊断，未合main |
| QUALITY-EDITOR-DIAGNOSTICS-4 | [Kimi战斗精灵工作流](tasks/QUALITY-EDITOR-DIAGNOSTICS-4.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1 | [宿主导航与真实事件](tasks/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-EDITOR-FORM-FIXTURES-1 | [数值表单合法夹具与生命周期](tasks/QUALITY-EDITOR-FORM-FIXTURES-1.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1 | [大世界精灵真实宿主](tasks/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1.md) | build | Codex / 待下一稳定窗口 | 9定向/121相邻零诊断，两枚旧绿新红；0关闭 |
| QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1 | [C03查看器宿主与迟到读取](tasks/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md) | build | Codex / 续Wizard与Uploader | C09五例0诊断；editor全包仍759act/243环境及1表单告警，0关闭 |
| QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1 | [C03向导真实异步等待](tasks/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1.md) | build | Codex / 保存C10恢复，余诊断待稳定窗口 | Wizard28零诊断/两业务反控；相邻6act、editor624act/243环境，0关闭不合main |
| QUALITY-DOCS-GIT-PATH-ENUMERATION-1 | [Git全路径枚举容量](tasks/QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md) | review | Codex / 三文件窄修，待统一门 | 两真实CLI>1MiB先红后绿，完整枚举16MiB/固定namespace4MiB不变；随后接回3u/3w |
| QUALITY-PRE94-RETROSPECTIVE-1 | [94前全部治理成果复审](tasks/QUALITY-PRE94-RETROSPECTIVE-1.md) | build | Codex / 80代码accept、3partial续核 | CODE1工程／Q1b接受，格式counter及3m/42待裁决，80/3不变。统一门/coverage/一个PR等全部pre94，不扩94–102。 |
| GAME-TOOLS-SAVE-IMPORT-READ-ERROR-1 | [pre94导入读取失败提示](tasks/GAME-TOOLS-SAVE-IMPORT-READ-ERROR-1.md) | review | Codex / 已批单红后修，等统一门 | 原生NotFoundError反馈、0写/槽不变/同路径重选；102相关/TC0、IO叶精确搬移；不改格式/DB。 |
| GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1 | [pre94换图失败资源/拒绝归属](tasks/GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1.md) | review | Codex / 已批修复、代码验收 | 失败保留/完整发布/迟到归属/地图身份与重访均有正式红绿；7native/391相邻/TC0，统一集成待父卡。 |
| GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1 | [pre94工具导出失败提示](tasks/GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1.md) | review | Codex / 已批先红后修，等统一门 | 错误toast／URL清理／4不同IO合同及真实Chrome Save/IDB失败链通过；340相邻，未改槽位/DB；只读证据已落。 |
| GAME-ACTION-QUEUE-TIE-ORDER-1 | [第一阶段同速队列](tasks/GAME-ACTION-QUEUE-TIE-ORDER-1.md) | review | Codex / 批准窄修已测，统一门/视觉待续 | 先7红后绿、真实Confirm/RNG、38/942与六单红反控；整文件不关闭 |
| GAME-PLAYER-POISON-SLOT-COMPACTION-1 | [毒列表与入口所有权](tasks/GAME-PLAYER-POISON-SLOT-COMPACTION-1.md) | review | Codex / 两项用户批准均修，待统一门 | 全16槽稳定保留、不丢毒不重复；入口先占槽／续点随record，四正式红后7绿、491相邻；普通剧情嵌套未证。 |
| GAME-MAGIC-NUMERIC-ASSIGNMENT-1 | [第一阶段法术数值赋值](tasks/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md) | review | Codex / 已批正式红后窄修 | FLOAT/中间赋值与抗性已修；扩展域不加回绕，统一门等全部pre94收尾 |
| QUALITY-BATTLE-MAGIC-PARITY-1 | [pre-94战斗机制counter](tasks/QUALITY-BATTLE-MAGIC-PARITY-1.md) | review | Codex / 新增复活装备状态窄修已测 | 原三项保留；0x22两红后修、284game相邻0stderr；统一门/视觉仍待，不关闭整文件 |
| QUALITY-FETCH-ABORT-LIFECYCLE-1 | [重试等待与Request取消](tasks/QUALITY-FETCH-ABORT-LIFECYCLE-1.md) | build | Codex / 同步main后复跑并收口 | 取消反例旧23/3红、控制26绿、变异3枚各单红；当前修复26例绿，统一门未清 |
| QUALITY-GAME-RUNTIME-DIAGNOSTICS-1 | [game运行时诊断核清](tasks/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md) | build | Codex / 逐file归因后选有限包 | C2 两装备负输入测试已逐文件核验；8/8 绿、0 stderr，game typecheck 与相邻6文件66 tests通过；两行保留review，其余15块stderr仍未全文验收 |
| QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 | [提取器共享输出清理边界](tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md) | build | Codex / 原三缺口已补并过集中门 | guard/两测试明确合同接受；整体视频/其它输出策略不附带关闭 |
| QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 | [extract原盘执行完整性](tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md) | build | Codex / C2证据已落，回编号卡复审 | 完整extract431零stderr、七有效反控；两个测试review，0关闭 |
| QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 | [事件切分控制流与元数据](tasks/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md) | review | Codex / P3另获批已修，待统一门 | 旧两获批修复保留；raw7两接回边正式2红→83相邻绿、原盘增15删0／零漏边，未写生成物，不附带关闭CLI。 |
| QUALITY-RLE-COMMAND-TRUTH-1 | [RLE高位literal格式真值](tasks/QUALITY-RLE-COMMAND-TRUTH-1.md) | draft | Codex / 只读取证，算法冻结 | SDL native与TS分歧已证；GOP未见分类差异，canonical域/其它资源待核 |
| GAME-SAVE-IDB-COMMIT-1 | [存档事务提交与失败传播](tasks/GAME-SAVE-IDB-COMMIT-1.md) | review | Codex / 统一门诊断未清零 | ①已修、三条真实IDB回归通过，不改版本/清档/schema |
| GAME-SAVE-INPUT-DOMAIN-1 | [Save槽位输入域与双路径一致性](tasks/GAME-SAVE-INPUT-DOMAIN-1.md) | draft | Codex / 等用户裁决，禁止实现 | NaN/小数通过内存范围守卫，IndexedDB路径可能不同；不改API/schema |
| GAME-OPENING-CANCEL-CURSOR-1 | [标题取消光标](tasks/GAME-OPENING-CANCEL-CURSOR-1.md) | review | Codex / 统一门诊断未清零 | ②已修、真实标题浏览器链与截图已核 |
| GAME-OUTSIDE-MAGIC-DISABLED-1 | [大世界法术显示与禁用](tasks/GAME-OUTSIDE-MAGIC-DISABLED-1.md) | draft | Codex / 核前提、Owner与白名单 | 仅①②获批；③未批准，7项可用范围与显示真值分开核 |


## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
