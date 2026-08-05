# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| N3-1 | 结构化控制流、实体具名行为与内部脚本退役 | build | Codex 继续关闭 R13-Z；source sites 归零，剩 4 条观察级条目（3×lossy 需 R13-6C 取代 6A seal，1×段转移备注待裁决） | 调色盘备注已按用户拍板用 pal-palette-resolution 证据闭合，dry-run `open sites=0 / observations=4`；N3-1/C8/ED-5I 仍未完成 |
| C8 | 物品用途机制、运行时与迁移闭环 | review | 等待 N3-1 完成后交用户联合验收 | `0d4aa48b` 三方最终 accept 已齐；100/0、20 件/21 根及引用反跳均通过审查 |
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 先冻结精确状态机，再由 Kimi / GLM 设计审查 | 18b 二次真值核对补入 0x4B 手动确认、0x52 toggle、world-update pause、敌逃/terminate success；Codex 签字撤回 pending，未准入 build |
| B10-1 | 混乱敌人攻击同伴 | draft | 先冻结语义空槽 schema，再由三方设计签字 | 18a 二次真值核对补入 confused 前废弃玩家抽样；二阶段已压掉 68/380 队源空槽，不能用活目标分布冒充 RNG 忠实，Codex 签字 pending |
| B11-1 | 队友阵亡/濒死战斗脚本（scriptOnFriendDeath/scriptOnDying） | review | Codex 自验完成（P1-P6/G1 全钉），交 Kimi / GLM 实现审查 | 实现提交 58f8f846/e2fb035d/9bf68fe7/0ea144c2；R13-Z 110 actor 站点已销账，dry-run open=0/observations=4 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-5I | 物品工作台 CRUD、图标、用途与引用闭环 | blocked | N3-1 最终 accept 后 Codex 跑 canonical v5 回归并发起三方补签 | `0d4aa48b` 已关闭本次反跳反例；仍须按终态重验脚本选择/引用闭包/删除/保存 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
