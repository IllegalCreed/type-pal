# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| C8 | 物品用途机制、运行时与迁移闭环 | review | Kimi + GLM 审查 | Codex 自测 accept；100 usable = 80 runnable + 20 显式诊断，待三方 done 签字 |
| ED-5I | 物品工作台 CRUD、图标、用途与引用闭环 | review | Kimi + GLM 审查 | Codex 自测 accept；三栏工作台、CRUD、图标、用途与引用闭环待审 |
| N3-1 | 结构化控制流、实体具名行为与内部脚本退役 | build | Codex：P3 无环控制流结构化 | P2 三方 accept 齐；继续 shadow-only，P3 批次审查通过前不进 P4 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
