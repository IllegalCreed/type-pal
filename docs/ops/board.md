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
| CODE-QUALITY-94 | [menu 独立阶段集成窗口](tasks/CODE-QUALITY-94-menu-integration-window.md) | rework | GLM / 修注释与逐文件证据；统一诊断另卡 | Codex counter：exit0仍有act/导航诊断；30条保持review |
| CODE-QUALITY-95 | [menu fixture 合法性 counter](tasks/CODE-QUALITY-95-menu-fixture-legality-counter.md) | rework | GLM / 修单体目标fixture caller前提 | Codex counter：applyAll输入不能冒称真实选人域；不闭合 |
| CODE-QUALITY-97 | [menu 基础 helper 逐文件审核](tasks/CODE-QUALITY-97-menu-helper-primitives-item-select.md) | draft | Codex / 独立验收 review-only 结论 | primitives/item-select 四维通过；E-4/E-5 死面登记 |
| CODE-QUALITY-98 | [menu 剩余状态机审核](tasks/CODE-QUALITY-98-menu-opening-player-status.md) | draft | Codex / 独立验收 review-only 结论 | opening/player-status 四维通过；E-6 登记待实现批 |## 看板规则
| CODE-QUALITY-99 | [menu 输入路由中枢审核](tasks/CODE-QUALITY-99-menu-driver-review.md) | draft | Codex / 独立验收 review-only 结论 | driver 四维通过；E-7 fixture counter/E-8 死参/E-9 死导出登记 |
| CODE-QUALITY-100 | [存档槽菜单审核](tasks/CODE-QUALITY-100-save-slot-menu-review.md) | draft | Codex / 独立验收 review-only 结论 | save-slot-menu 四维通过；save 边界核验无触碰；56 定向 |- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
| CODE-QUALITY-101 | [Save API 存档域审核](tasks/CODE-QUALITY-101-save-api-review.md) | draft | Codex / 独立验收 review-only 结论 | api+indexed-db 四维通过；E-10/E-12 登记、U-1 引用既有卡；29 定向 |- 任务顶部 Status、任务索引和此表必须一致。
| CODE-QUALITY-102 | [快存快读工具审核](tasks/CODE-QUALITY-102-quick-save-review.md) | draft | Codex / 独立验收 review-only 结论 | quick-save 四维通过；E-13 fixture 登记并入 E-批；8 定向 |- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
