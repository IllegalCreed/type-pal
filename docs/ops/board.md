# 多 Agent 任务看板

当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案、脚本组合与编辑器预览](tasks/ED-ENTITY-STATE-PLAN-1.md) | review | Codex / 完整现场与E2E采集待续 | 首批UI用户验收通过；临时方案丢弃，正式状态须经E2E核对 |
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [战斗回合与结算边界测试](tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | rework | GLM / 补原始反控与合法输入；Codex复核 | 先前accept撤回；全绿与已合入不等于合同验收 |
| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |
| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |
| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 补关键NPC日志与一阶段对比 | 剧情链可达但视觉与关键NPC日志未闭合 |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |
| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |
| CODE-QUALITY-3Y-CLOSEOUT-1 | [统一治理分支与3y复审](tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md) | build | Codex / 先统一3y，逐卡复审 | 65差异/58卡，未知review；未合main |
| CODE-QUALITY-53 | [game player status runtime-zero ownership conflict](tasks/CODE-QUALITY-53-player-status-runtime-zero.md) | build | Codex / ownership测试已补；0x61与毒键边界仍待独立收口 | 重复角色候选已修；CODE80裁决与质量门已过，但本卡自身状态/机制核验未完成，禁止合main |
| CODE-QUALITY-57 | [game bootstrap thumbnail seam boundary](tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | Codex / 缺 thumbnail 像素 oracle 与视觉裁决，禁止实现 | bootstrap 两层直绘未调用 seam repair；与 gameplay 补偿边界待核 |
| CODE-QUALITY-79 | [战斗0x61装备伪毒判定边界](tasks/CODE-QUALITY-79-battle-poison-level-boundary.md) | draft | Codex / 只读核原始脚本与后期真值 | 不与CODE53键迁移混改；未授权实现 |
| CODE-QUALITY-80 | [game Dev Panel 换队生命周期](tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md) | review | Codex / 行为切片已验收；CODE81 收 observer/thumbnail | 用户裁决已实现且该批质量门通过；listener/observer/thumbnail 风险分拆，dev-panel 仍不整文件关闭 |
| CODE-QUALITY-81 | [game Dev Panel picker 生命周期](tasks/CODE-QUALITY-81-dev-panel-picker-lifecycle.md) | review | Codex / 新增生命周期测试可收口；复合 dev-panel 继续待核 | 5 个真实夹具反例与两项精确反控；全量 check、ratchet、protected fast、lint、ledger 均通过 |
| CODE-QUALITY-90 | [magic revive status clearing boundary](tasks/CODE-QUALITY-90-magic-revive-status-boundary.md) | review | Codex / 两文件整文件审查继续 | 行为切片的全仓 check/ratchet/protected fast 已通过；spell-chain、输入与测试隔离仍未闭合 |
| CODE-QUALITY-95 | [menu合法夹具](tasks/CODE-QUALITY-95-menu-fixture-legality-counter.md) | review | Codex / 等统一门 | 三份局部accept保持，不关闭文件 |
| CODE-QUALITY-94 | [menu阶段集成](tasks/CODE-QUALITY-94-menu-integration-window.md) | rework | Codex / 已接手返工 | 两项获批行为已修；完整门带诊断，第三项法术显示未动 |
| CODE-QUALITY-97 | [menu基础helper](tasks/CODE-QUALITY-97-menu-helper-primitives-item-select.md) | review | Codex / 已修注释 | 撤回伪原版锚；test-only合同仍待核 |
| CODE-QUALITY-98 | [opening/player-status](tasks/CODE-QUALITY-98-menu-opening-player-status.md) | review | Codex / 已修注释与排重 | 取消链产品风险另卡，未关闭文件 |
| CODE-QUALITY-99 | [menu输入路由](tasks/CODE-QUALITY-99-menu-driver-review.md) | review | Codex / 已修标题取消 | 单测先红后绿、实际浏览器回新游戏高亮 |
| CODE-QUALITY-100 | [存档槽菜单](tasks/CODE-QUALITY-100-save-slot-menu-review.md) | review | Codex / 已修caller说明 | 保留真实driver聚合、撤掉自写模型 |
| CODE-QUALITY-101 | [Save API/IDB](tasks/CODE-QUALITY-101-save-api-review.md) | review | Codex / 已修事务提交 | commit后才报成功；失败传播/旧槽保留已测 |
| CODE-QUALITY-102 | [快存快读](tasks/CODE-QUALITY-102-quick-save-review.md) | review | Codex / 已修隔离 | 真实事件oracle，监听器探针恢复通过 |
| QUALITY-EDITOR-DIAGNOSTICS-1 | [editor测试诊断清理](tasks/QUALITY-EDITOR-DIAGNOSTICS-1.md) | review | Codex / 后续诊断切片待核 | 67定向0诊断；完整门仍非零诊断，未合main |
| QUALITY-EDITOR-DIAGNOSTICS-2 | [C02宿主与删除生命周期](tasks/QUALITY-EDITOR-DIAGNOSTICS-2.md) | review | Codex / 续C02剩余用例 | 九例0诊断、两反控；完整门仍非零，不合main |
| QUALITY-EDITOR-DIAGNOSTICS-3 | [C02导入与历史回流](tasks/QUALITY-EDITOR-DIAGNOSTICS-3.md) | review | Codex / 续Kimi工作流 | 29定向/77相邻0诊断；完整门带其它诊断，未合main |
| QUALITY-EDITOR-DIAGNOSTICS-4 | [Kimi战斗精灵工作流](tasks/QUALITY-EDITOR-DIAGNOSTICS-4.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1 | [宿主导航与真实事件](tasks/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-EDITOR-FORM-FIXTURES-1 | [数值表单合法夹具与生命周期](tasks/QUALITY-EDITOR-FORM-FIXTURES-1.md) | review | Codex / 统一诊断未清 | 联合check/ratchet/protected已测；act/环境仍在，0关闭 |
| QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1 | [大世界精灵真实宿主](tasks/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1.md) | build | Codex / 待下一稳定窗口 | 9定向/121相邻零诊断，两枚旧绿新红；0关闭 |
| QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1 | [C03查看器宿主与迟到读取](tasks/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md) | build | Codex / 续Wizard与Uploader | C09五例0诊断；editor全包仍759act/243环境及1表单告警，0关闭 |
| QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1 | [C03向导真实异步等待](tasks/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1.md) | build | Codex / 未完成检查点，先复审94前成果 | 30例仍2act、相邻80例仍8act；未排重/反控/统一门，0关闭 |
| QUALITY-PRE94-RETROSPECTIVE-1 | [94前全部治理成果复审](tasks/QUALITY-PRE94-RETROSPECTIVE-1.md) | build | Codex / 续C2敌队诊断合同 | 全83卡9partial/74pending/0accept；C1八反控/53定向/局部V8保持，仍2stderr块 |
| QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 | [extract原盘执行完整性](tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md) | build | Codex / 续C2正向fixture/未知域IO | C1八反控/53定向，extract431仍2stderr块，0关闭 |
| QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 | [事件切分控制流与元数据](tasks/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md) | draft | Codex / 算法冻结，核真实影响域 | 更名伪边/计数goto分歧；raw17站点，默认全局runtime，不冒称游戏故障 |
| QUALITY-RLE-COMMAND-TRUTH-1 | [RLE高位literal格式真值](tasks/QUALITY-RLE-COMMAND-TRUTH-1.md) | draft | Codex / 只读取证，算法冻结 | SDL native与TS分歧已证；GOP未见分类差异，canonical域/其它资源待核 |
| GAME-SAVE-IDB-COMMIT-1 | [存档事务提交与失败传播](tasks/GAME-SAVE-IDB-COMMIT-1.md) | review | Codex / 统一门诊断未清零 | ①已修、三条真实IDB回归通过，不改版本/清档/schema |
| GAME-OPENING-CANCEL-CURSOR-1 | [标题取消光标](tasks/GAME-OPENING-CANCEL-CURSOR-1.md) | review | Codex / 统一门诊断未清零 | ②已修、真实标题浏览器链与截图已核 |
| GAME-OUTSIDE-MAGIC-DISABLED-1 | [大世界法术显示与禁用](tasks/GAME-OUTSIDE-MAGIC-DISABLED-1.md) | draft | Codex / 核前提、Owner与白名单 | 仅①②获批；③未批准，7项可用范围与显示真值分开核 |

## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
