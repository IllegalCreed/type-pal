# 多 Agent 协作工作流

本文定义 Codex、Claude Opus、GLM 和用户如何在 type-pal 中协同工作。目标是把聊天里的临时上下文落成仓库里的可追踪状态。

## 文件分工

| 文件 | 用途 |
|---|---|
| [`../../AGENTS.md`](../../AGENTS.md) | 所有 Agent 的根协作协议。 |
| [`board.md`](board.md) | 当前任务看板:状态、负责人、下一棒、阻塞项。 |
| [`tasks/`](tasks/) | 非平凡任务一任务一卡。 |
| [`tasks/TASK-template.md`](tasks/TASK-template.md) | 新任务卡模板。 |

## 任务类型

| 类型 | 例子 | 要求 |
|---|---|---|
| 轻量 | 回答问题、运行 `date`、修错别字 | 不必建任务卡;改文件仍要自检。 |
| 小改 | 单文件、低风险文档或代码调整 | 任务卡可选;编码仍然单 Owner。 |
| 非平凡 | 引擎/编辑器/内容、schema、迁移、UX、战斗、存档、渲染、多包改动 | 必须有看板行 + 任务卡 + 设计共识 + 审核共识。 |

拿不准时按“非平凡”处理。

## 状态机

```txt
backlog
-> ready
-> design-draft
-> design-consensus
-> implementation
-> self-verify
-> review-consensus
-> user-acceptance
-> done
```

特殊状态:

- `blocked`: 缺用户拍板或外部输入,无法继续。
- `rework`: 审核后需要返工。
- `cancelled`: 用户或三方共识决定不继续。

## 状态含义

| 状态 | Current Owner 要做什么 | 退出条件 |
|---|---|---|
| `backlog` | 记录候选任务和粗范围。 | 用户或 Agent 确认值得准备。 |
| `ready` | 补齐目标、阶段、参考资料、验收条件。 | 可以进入设计草案。 |
| `design-draft` | 产出具体设计选项和已知风险。 | 三方都有足够上下文开始评审。 |
| `design-consensus` | Codex、Claude Opus、GLM 分别写明立场。 | `Consensus Result` 允许实现。 |
| `implementation` | Coding Owner 改代码;其他 Agent 不改实现文件。 | 代码完成到可以本地验证。 |
| `self-verify` | Coding Owner 跑检查并记录结果。 | 测试/检查结果已写入任务卡。 |
| `review-consensus` | 三方共同审核设计匹配、覆盖、测试、文档。 | 允许用户验收,或退回 `rework`。 |
| `user-acceptance` | 用户检查产品体验、范围和取舍。 | 用户接受或要求调整。 |
| `done` | 收尾并保持看板准确。 | 无剩余必做工作。 |

## 共识关卡

### Design Consensus Gate

进入实现前,任务卡必须包含:

- Claude Opus 立场:架构、风险、推荐形态。
- GLM 立场:覆盖面、数据/schema 完整性、测试矩阵。
- Codex 立场:实现边界、本地验证计划。
- 共识结论:已达成一致、未解决分歧、需用户拍板项,以及 `Allow implementation: yes`。

任一 Agent 标记 `Allow implementation: no` 时,任务必须停在 `design-consensus`,或转为 `blocked` 等用户拍板。

### Review Consensus Gate

进入用户验收前,任务卡必须包含:

- Codex 的实现摘要和本地验证结果。
- Claude Opus 的架构审核和接受/返工结论。
- GLM 的覆盖、测试、文档审核和接受/返工结论。
- 共识结论中写明 `Allow user acceptance: yes`。

任一 Agent 要求返工时,任务转为 `rework`,指定新的 Current Owner,并记录必改项。

## 角色契约

### Codex

- 负责本地仓库执行:改文件、跑测试、浏览器验证、检查 git 状态、集成收口。
- 非平凡任务在 Design Consensus Gate 通过前不得开始实现。
- 接手或交接任务时必须更新看板和任务卡。
- 必须如实报告验证结果,包括未跑的检查。

### Claude Opus

- 负责架构压力测试和高层设计审查。
- 重点寻找阶段串台、隐藏耦合、陈旧抽象、未来扩展陷阱。
- 审核阶段必须给出明确的接受/返工结论。

### GLM

- 负责清单完整性、中文文档质量、schema/数据覆盖、测试矩阵。
- 重点寻找遗漏场景、缺失文档、验收条件不完整、迁移/数据连锁影响。
- 审核阶段必须给出明确的接受/返工结论。

### 用户

- 负责优先级、产品品味、范围取舍和最终验收。
- 负责裁决三方无法达成一致的问题。

## 交接规则

每次交接必须更新任务卡:

- 改了什么或决定了什么。
- 证据:文件引用、测试结果、截图、命令输出摘要或文档链接。
- 新的 `Current Owner` 和 `Next Actor`。
- 阻塞项或需要用户回答的问题。

当前状态的退出条件没满足时,不要写“done”交接。

## 文件与编码 Owner

`implementation` 阶段只能由 Coding Owner 修改该任务的实现文件。其他 Agent 可以在任务卡里评论、审核或提补丁建议,但不能直接修改同一批实现文件,除非任务卡明确重新分配 Owner。

仅记录审核意见的文档可以由审核 Agent 更新,但任务卡必须写清楚谁改了什么。

## 阶段纪律

设计或实现前先判断任务阶段:

- 第一阶段: `packages/game`、`packages/pal-extract`、第一阶段文档。遵守 `AGENTS.md` / `CLAUDE.md` 的忠实还原规则。
- 第二阶段: `packages/reforge`、`packages/editor`、`packages/content`、`docs/phase2`。优先遵守 `docs/phase2/READ-FIRST.md`。

拿不准时停下来问用户。

## Done 标准

任务只有同时满足以下条件才能进 `done`:

- 验收条件已满足,或已被明确修改。
- 必要测试/检查已运行,或未运行原因已记录。
- 相关文档和能力地图已更新。
- 看板行指向最终状态。
- 需要用户验收的任务已被用户接受。
