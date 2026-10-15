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
| CODE-QUALITY-94 | [menu阶段集成](tasks/CODE-QUALITY-94-menu-integration-window.md) | rework | Codex / 已接手返工 | 测试/注释/manifest已修；统一门与法术风险未闭合 |
| CODE-QUALITY-95 | [menu合法夹具](tasks/CODE-QUALITY-95-menu-fixture-legality-counter.md) | review | Codex / 等统一门 | 三份局部accept保持，不关闭文件 |
| CODE-QUALITY-97 | [menu基础helper](tasks/CODE-QUALITY-97-menu-helper-primitives-item-select.md) | review | Codex / 已修注释 | 撤回伪原版锚；test-only合同仍待核 |
| CODE-QUALITY-98 | [opening/player-status](tasks/CODE-QUALITY-98-menu-opening-player-status.md) | review | Codex / 已修注释与排重 | 取消链产品风险另卡，未关闭文件 |
| CODE-QUALITY-99 | [menu输入路由](tasks/CODE-QUALITY-99-menu-driver-review.md) | review | Codex / 已修标题取消 | 单测先红后绿、实际浏览器回新游戏高亮 |
| CODE-QUALITY-100 | [存档槽菜单](tasks/CODE-QUALITY-100-save-slot-menu-review.md) | review | Codex / 已修caller说明 | 保留真实driver聚合、撤掉自写模型 |
| CODE-QUALITY-101 | [Save API/IDB](tasks/CODE-QUALITY-101-save-api-review.md) | review | Codex / 已修事务提交 | commit后才报成功；失败传播/旧槽保留已测 |
| CODE-QUALITY-102 | [快存快读](tasks/CODE-QUALITY-102-quick-save-review.md) | review | Codex / 已修隔离 | 真实事件oracle，监听器探针恢复通过 |
| QUALITY-EDITOR-DIAGNOSTICS-1 | [editor测试诊断清理](tasks/QUALITY-EDITOR-DIAGNOSTICS-1.md) | draft | Codex / 核首片前提 | 52文件头归属，禁止静音或批量套act冒充逐文件验收 |
| GAME-SAVE-IDB-COMMIT-1 | [存档事务提交与失败传播](tasks/GAME-SAVE-IDB-COMMIT-1.md) | review | Codex / 等完整门 | ①已修、三条真实IDB回归通过，不改版本/清档/schema |
| GAME-OPENING-CANCEL-CURSOR-1 | [标题取消光标](tasks/GAME-OPENING-CANCEL-CURSOR-1.md) | review | Codex / 等完整门 | ②已修、真实标题浏览器链与截图已核 |
| GAME-OUTSIDE-MAGIC-DISABLED-1 | [大世界法术显示与禁用](tasks/GAME-OUTSIDE-MAGIC-DISABLED-1.md) | draft | Codex / 核前提、Owner与白名单 | 只读反证已核；无build allowed，不得实现 |

## 看板规则

- 只把当前未终态任务放在这里；done/cancelled 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
