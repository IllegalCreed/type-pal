# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| N3-1 | 结构化控制流、实体具名行为与内部脚本退役 | build | Codex 进入 R13-6 技能/palette 表现债闭包 | R13-5 三方复审 accept 已齐并收口；R13-6 仍须按既有 10 pending + 4 lossy skill + 14 palette 源账逐组销账，R13-Z 未开始 |
| OPS-TST-PERF | 迁移测试 fixture 分层与冷启动性能债 | rework | Codex 补 G1/G2 映射、G7 顺序探针并拆分 G8 建链峰值 | synthetic trust-boundary 6/6；fast 70/506；canary 精简存活引用后 2/2 为 484.80s、RSS 3.45GB，G7/RSS 仍阻塞 |
| C8 | 物品用途机制、运行时与迁移闭环 | review | 等待 N3-1 完成后交用户联合验收 | `0d4aa48b` 三方最终 accept 已齐；100/0、20 件/21 根及引用反跳均通过审查 |
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 先冻结精确状态机，再由 Kimi / GLM 设计审查 | 18b 二次真值核对补入 0x4B 手动确认、0x52 toggle、world-update pause、敌逃/terminate success；Codex 签字撤回 pending，未准入 build |
| B10-1 | 混乱敌人攻击同伴 | draft | 先冻结语义空槽 schema，再由三方设计签字 | 18a 二次真值核对补入 confused 前废弃玩家抽样；二阶段已压掉 68/380 队源空槽，不能用活目标分布冒充 RNG 忠实，Codex 签字 pending |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-5I | 物品工作台 CRUD、图标、用途与引用闭环 | blocked | N3-1 最终 accept 后 Codex 跑 canonical v5 回归并发起三方补签 | `0d4aa48b` 已关闭本次反跳反例；仍须按终态重验脚本选择/引用闭包/删除/保存 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
