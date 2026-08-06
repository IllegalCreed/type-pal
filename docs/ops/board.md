# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 设计冻结完成（Codex agree），待 Kimi / GLM 设计压测签字 | 四态状态机 + 320×320 边界 + 0x52 toggle 前态 + BattleResult 四分类；828+193 源账本待 GLM 冻结 |
| B10-1 | 混乱敌人攻击同伴 | draft | 语义空槽 schema 冻结完成（Codex agree），待 Kimi / GLM 设计压测签字 | slots 保序保空（0 占位/65535 不占位）、wMaxEnemyIndex=slots.length-1；380 队源账本待 GLM 冻结 |
| D14-1 | 对话系统外观继承（版式/头像/光标/字体/自动播放） | draft | 首批版式对齐：核实 sdlpal 长行与头像关系后冻结设计，待三方签字 | 孤儿换行根因=带头像收窄至 ~13 字/行；9111 行 ≤39 行受影响；首批不做迁移期改文本 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
