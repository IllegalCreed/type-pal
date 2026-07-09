# Agent 任务看板

这张看板回答一个问题:现在做到哪了,轮到谁继续。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)

## 进行中

| ID | 任务 | 阶段 | 状态 | Current Owner | Next Actor | Coding Owner | 阻塞项 | 任务卡 |
|---|---|---|---|---|---|---|---|---|
| OPS-0001 | 建立多 Agent 协作工作流 | ops | user-acceptance | User | Codex | Codex | 等用户验收 | [`tasks/OPS-0001-agent-workflow-bootstrap.md`](tasks/OPS-0001-agent-workflow-bootstrap.md) |

## 候选 / 待排期

| ID | 任务 | 阶段 | 状态 | Current Owner | Next Actor | 阻塞项 | 备注 |
|---|---|---|---|---|---|---|---|
| W7C | 地图 tile 绘制工具 | phase2 | backlog | User | Claude Opus | 需要确认范围 | W7a 地基完成后,可能是编辑器最高价值缺口。 |
| W7B | tileset 库与选择 | phase2 | backlog | User | Claude Opus | 需要决定和 W7C 的先后 | 让自有地图摆脱“借用原版 tileset”。 |
| A4 | 用户自有素材导入 | phase2 | backlog | User | Claude Opus | 需要定义 MVP 范围 | PNG / 精灵 / tileset 导入到自包含工程。 |

## 最近完成

| ID | 任务 | 阶段 | 完成日期 | Owner | 备注 |
|---|---|---|---|---|---|
| W7A-5 | 自有地图创建 + 实时渲染地基 | phase2 | 2026-07-09 | Codex | 建立本工作流前的最新提交。 |

## 看板规则

- 非平凡任务必须在这里有一行,并在 `tasks/` 下有对应任务卡。
- `Current Owner` 负责推动当前状态。
- `Next Actor` 是下一棒交接对象。
- 任务进入 `implementation` 后必须填写 `Coding Owner`。
- 看板只写摘要;细节、证据、讨论放任务卡。
- 任务阻塞时,必须写清楚缺哪个决定或输入。
