# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **2026-08-15 额度状态：Kimi、GLM 均可用。** ED-DS-2 恢复完整三贤人流程：Kimi 主审架构/视觉，
> GLM 主审覆盖/测试；两席对最新版重签后才可 build，不再走额度豁免。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| PRE-E2E-AUDIT-1 | 两阶段全仓只读审计 | review（只读取证，非修复验收） | Codex：继续D批编辑器工作流审计 | [台账](audits/pre-e2e/README.md)：A/B/C已取证，C新增7项；U-02待证；未改实现、未启动修复。 |

商店生命周期已完成。当前全仓审计按[路线图](../phase2/roadmap.md)分五批推进；A/B/C已取证，不能视为全仓完成。
确认缺陷/疑点/可选优化分开记录，审计后按风险安排修复，再进入R4 content20薄E2E。

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
