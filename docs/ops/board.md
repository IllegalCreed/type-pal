# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| - | - | - | - | 当前无可直接实现的任务。 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| X3/M3 | 通用 0x73 dither + 开场/opcode 迁移修复 | rework / 二次设计签字 | GLM 复核 | 用户否决 hard dissolve;Codex 提 12 级离散 RGBA 插值,**Codex+Opus agree,待 GLM**。Opus 附 3 复验重点(sRGB gamma 中间色偏暗→已定 gamma-correct 退路 / 首趟跳细节 / 25-75% 亮度取样);s001→s003 黑屏独立阻塞 done 前必解。二次三签未齐不得实现。任务卡:[X3-opening-dither-speaker-inheritance.md](tasks/X3-opening-dither-speaker-inheritance.md) |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
