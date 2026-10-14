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
| CODE-QUALITY-53 | [game player status runtime-zero ownership conflict](tasks/CODE-QUALITY-53-player-status-runtime-zero.md) | build | Codex / ownership测试已补；0x61与毒键边界仍待独立收口 | 重复角色候选已修；CODE80裁决与质量门已过，但本卡自身状态/机制核验未完成，禁止合main |
| CODE-QUALITY-57 | [game bootstrap thumbnail seam boundary](tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | Codex / 缺 thumbnail 像素 oracle 与视觉裁决，禁止实现 | bootstrap 两层直绘未调用 seam repair；与 gameplay 补偿边界待核 |
| CODE-QUALITY-79 | [战斗0x61装备伪毒判定边界](tasks/CODE-QUALITY-79-battle-poison-level-boundary.md) | draft | Codex / 只读核原始脚本与后期真值 | 不与CODE53键迁移混改；未授权实现 |
| CODE-QUALITY-80 | [game Dev Panel 换队生命周期](tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md) | review | Codex / 行为切片已验收；CODE81 收 observer/thumbnail | 用户裁决已实现且该批质量门通过；listener/observer/thumbnail 风险分拆，dev-panel 仍不整文件关闭 |
| CODE-QUALITY-81 | [game Dev Panel picker 生命周期](tasks/CODE-QUALITY-81-dev-panel-picker-lifecycle.md) | review | Codex / 新增生命周期测试可收口；复合 dev-panel 继续待核 | 5 个真实夹具反例与两项精确反控；全量 check、ratchet、protected fast、lint、ledger 均通过 |
| CODE-QUALITY-90 | [magic revive status clearing boundary](tasks/CODE-QUALITY-90-magic-revive-status-boundary.md) | review | Codex / 两文件整文件审查继续 | 行为切片的全仓 check/ratchet/protected fast 已通过；spell-chain、输入与测试隔离仍未闭合 |
| CODE-QUALITY-93 | [game sell menu state contract](tasks/CODE-QUALITY-93-game-sell-menu-contract.md) | review | Codex / 质量门与逐文件收口 | sell-menu 四文件已完整核验；仅测试夹具强转清理，等待全仓门 |


## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
