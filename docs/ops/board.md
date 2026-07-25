# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| N3-1 | 结构化控制流、实体具名行为与内部脚本退役 | review | GLM：P7 架构/数据/测试合并终审；随后用户验收 | P7 canonical v5、compiler/runtime/editor、SAVE 5、PAL 全量重迁及本地 v4→v5 事务已完成，Codex 自验 accept |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| C8 | 物品用途机制、运行时与迁移闭环 | blocked | N3-1 最终 accept 后 Codex 跑 canonical v5 回归，GLM 代审 | 三方前置审查已 accept；P7 已落地，仍等 N3-1 终审与本卡 267/268/270 独立复验 |
| ED-5I | 物品工作台 CRUD、图标、用途与引用闭环 | blocked | N3-1 最终 accept 后 Codex 跑 canonical v5 回归，GLM 代审 | 三方前置审查已 accept；P7 已落地，仍须按终态重验脚本选择/反跳/引用/删除/保存 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
