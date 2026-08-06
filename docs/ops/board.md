# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-5J | 物品私有脚本新建入口 | build | Kimi 已实现并自验；GLM 异步抽审 | 命令+双会话写入+宽松投影；editor 93/800 绿、浏览器实测通过 |
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 设计冻结完成（Codex agree），待 Kimi / GLM 设计压测签字 | 四态状态机 + 320×320 边界 + 0x52 toggle 前态 + BattleResult 四分类；828+193 源账本待 GLM 冻结 |
| B10-1 | 混乱敌人攻击同伴 | draft | 先冻结语义空槽 schema，再由三方设计签字 | 18a 二次真值核对补入 confused 前废弃玩家抽样；二阶段已压掉 68/380 队源空槽，不能用活目标分布冒充 RNG 忠实，Codex 签字 pending |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
