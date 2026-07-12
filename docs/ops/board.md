# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| X3/M3 | 通用 0x73 dither + 开场/opcode 迁移修复 | rework | Opus 审第三版假色桥接设计，随后 GLM | 用户否决第二版 RGB crossfade：原版不是 palette1→0，而是 palette0 内首趟 `target 高 nibble + source 低 nibble`，约 180ms 进入目标假色态，再用 11 趟恢复正常。Codex 已提纯 RGBA 的 source-lightness + target-chroma bridge 方案；第三版三签未齐，不得实现。任务卡:[X3-opening-dither-speaker-inheritance.md](tasks/X3-opening-dither-speaker-inheritance.md) |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| - | - | - | - | 当前无阻塞任务。 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
