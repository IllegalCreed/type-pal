# 多 Agent 任务看板

当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。

Last reviewed: 2026-10-17
Template: governance-index-v1 / 1.0.0

## 目的
- 记录当前未终态任务的责任、状态和唯一入口，避免历史任务重新获得执行授权。

## 范围
- 当前包含：活动任务卡、负责人和下一步。
- 明确不包含：产品 runtime、E2E、视觉、coverage 或部署验收。

## 当前状态
- `status`: current
- `lastReviewed`: 2026-10-17

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
| DOCS-RECORD-INTEGRITY-1 | [R 波记录可信度撤回与补救](tasks/DOCS-RECORD-INTEGRITY-1.md) | build | Codex / 降档、真实重跑、待非作者复核 | 机械保真不授语义信用；原回执保全 |
| DOCS-FULL-TEMPLATE-1 | [全 docs 深度治理与模板化改写](tasks/DOCS-FULL-TEMPLATE-1.md) | rework | Codex / 按勘误清单逐篇重审 | 原 done 和 R39 后过度信用已撤回 |
| DOCS-CATALOG-SPLIT-1 | [phase/lore catalog 分片](tasks/DOCS-CATALOG-SPLIT-1.md) | rework | Codex / 非作者复核待补 | 实现保留；自验冒称独立与过早done撤回 |
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案、脚本组合与编辑器预览](tasks/ED-ENTITY-STATE-PLAN-1.md) | review | Codex / 完整现场与E2E采集待续 | 首批UI用户验收通过；临时方案丢弃，正式状态须经E2E核对 |
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [战斗回合与结算边界测试](tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | rework | GLM / 补原始反控与合法输入；Codex复核 | 先前accept撤回；全绿与已合入不等于合同验收 |
| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |
| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |
| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 补关键NPC日志与一阶段对比 | 剧情链可达但视觉与关键NPC日志未闭合 |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |
| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |

## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
