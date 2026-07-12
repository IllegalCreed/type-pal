# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| X3/M3 | 通用 0x73 dither + 开场/opcode 迁移修复 | rework / 四版设计 | Codex 定案(选路+profile 形态),随后 GLM | 四版 target-only:**Opus agree 并交付双路方案**——Route A(主)=烘焙 `pal[i]→pal[i&0xF0]` 256 对 RGB→RGB profile 资产精确复刻异色帧(ramp 知识只进烘焙脚本);Route B(fallback)=`48·(t_c/M)^3`(拟合均差 26.2,仅非 PAL);T1-T7 含反 v3 回归锚。schema 触点(profile 引用形态)三方必审;三签未齐不得实现。任务卡:[X3-opening-dither-speaker-inheritance.md](tasks/X3-opening-dither-speaker-inheritance.md) |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| - | - | - | - | 当前无阻塞任务。 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
