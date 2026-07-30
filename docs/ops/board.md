# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| N3-1 | 结构化控制流、实体具名行为与内部脚本退役 | build | Kimi / GLM 审 R13-5 公共 delta，三签后 Codex 实现 | 12 enemy / 31 site 源账已冻结；敌钩持久 cursor、明王成长与 canonical onDefeated 触及 public schema/runtime，R13-5 专项暂 blocked on 两席设计签字 |
| C8 | 物品用途机制、运行时与迁移闭环 | review | 等待 N3-1 完成后交用户联合验收 | `0d4aa48b` 三方最终 accept 已齐；100/0、20 件/21 根及引用反跳均通过审查 |
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | Kimi / GLM 设计审查，Codex 等三签 | backlog 18b 已确认是 world/save/migration/editor 系统缺口；一阶段机制真值、固定 320×320 离屏门和验收矩阵已写入任务卡，未准入 build |
| B10-1 | 混乱敌人攻击同伴 | draft | Kimi / GLM 设计审查，Codex 等三签 | backlog 18a 已核实为 decision/结算/session/动画完整链缺口；目标、公式与 12 帧演出均锚定一阶段真值 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-5I | 物品工作台 CRUD、图标、用途与引用闭环 | blocked | N3-1 最终 accept 后 Codex 跑 canonical v5 回归并发起三方补签 | `0d4aa48b` 已关闭本次反跳反例；仍须按终态重验脚本选择/引用闭包/删除/保存 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
