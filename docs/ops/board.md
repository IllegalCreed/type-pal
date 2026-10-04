# 多 Agent 任务看板

当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 | [Game player opcode residual contracts](tasks/TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1.md) | build | GLM / player opcode 合同 | role/equipment/magic/status/level-up 合法输入 |
| TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 | [Reforge runtime audio lifecycle contracts](tasks/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1.md) | build | GLM / audio lifecycle 合同 | bgm/midi/sfx 接管、取消、失败与 dispose |
| TEST-GLM-EDITOR-BATTLE-REGISTRY-1 | [Editor battle sprite registry contracts](tasks/TEST-GLM-EDITOR-BATTLE-REGISTRY-1.md) | build | GLM / battle registry 合同 | 战斗精灵注册、敌队引用与 undo |
| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |
| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |
| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 补关键NPC日志与一阶段对比 | 剧情链可达但视觉与关键NPC日志未闭合 |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |
| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [Game battle turn and finalization contracts](tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | build | GLM / battle turn 合同 | turn-queue/finalization 阻塞、拒绝、终局与恢复 |

## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。
