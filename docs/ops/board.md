# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **✅ 2026-08-12 额度状态：GLM 与 Kimi 均可用**——当前无补审队列；W9、B10-1、D14-1 均已完成用户验收
> 与三方收口。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| OPS-TST-PERF-B | shared/fresh 隔离并行 runner | draft | Codex 起草 runner；真实 Kimi/GLM 设计签字后实现 | manifest→canary→unit/preflight 串行；shared/fresh 并行；RSS、路径隔离及三次串行对照为硬门禁 |
| OPS-TST-PERF-C | P2/P3/P4 consolidated determinism proof | draft | Codex 起草逐标题 coverage map；真实 Kimi/GLM 设计签字后实现 | 保留每阶段独立 live default/reversed 双建；不得用 pinned bundle 或删 source-backed 双建冒充证明 |
| D15-1 | NPC 移动补全：动态碰撞 + 互相让路 + 转向（议题 15） | draft | 待设计冻结，三方签字 | auto 巡逻已有；缺不穿墙/不互穿/让路滑步/转向动画 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
