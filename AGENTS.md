# AGENTS.md

本文件只放多 Agent 协作协议本体。项目知识、工程经验、阶段纪律和常用命令见:

- [`CLAUDE.md`](CLAUDE.md): 项目知识、阶段判断、工程经验、常用命令。
- [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md): 第二阶段 Reforge 开工铁律。
- [`docs/ops/agent-workflow.md`](docs/ops/agent-workflow.md): 多 Agent 具体工作流。
- [`docs/ops/board.md`](docs/ops/board.md): 当前任务看板。
- [`docs/ops/tasks/`](docs/ops/tasks/): 任务卡。

## 三贤人系统

“三贤人系统”是本项目的多 Agent 协作机制:Codex、Claude Opus、GLM 三个订阅账号按各自强项协同推进。不要把聊天记录当作唯一真相,可追踪状态必须落在仓库文档里。

### 核心规则

- 默认协作是“实现方 + 一个审查方”;审查方按任务性质选 Opus 或 GLM。
- 推进签字跟任务卡走(用户拍板,2026-07-09):**开卡任务**必须执行推进签字 —— 进入 `build` 前集齐 Codex / Opus / GLM 三方设计签名,进入 `done` 前集齐三方审查/验收签名,签名不齐不得推进。换手或跨会话接手的非小改任务**必须开卡**(见上下文锚点节)→ 必然三签;同一 Coding Owner 同会话连续推进的常规迭代可不开卡、免签,但触碰三方必审清单的必须开卡。
- 不可逆/高风险决策必须三方介入: schema/save/migration/asset pipeline、新能力格、跨包公共接口、capability-map 状态变化、两方分歧、用户要求或 Coding Owner 自评高风险。
- `build` 阶段只能有一个 Coding Owner 修改实现文件。
- 需要 AI 生图或批量生成替代资源时,Generation Owner 必须是 Codex;Opus/GLM 只负责审美术方向、覆盖清单和验收风险。
- 某个或多个订阅账号额度耗尽时,允许由剩余 Agent 临时代班;任务卡必须记录缺席 Agent、代班 Agent、代班范围、风险和后续是否需要补审。
- 三方无法收敛时,停止推进并请用户拍板;继续前必须把裁决写进任务卡。
- 每当一个 Agent 完成当前阶段并需要用户转交下一位 Agent 时,必须给出一段可直接复制的“下一位 Agent 提示词”,并同步写入任务卡。

### 角色分工

| Agent | 主要职责 | 默认参与 |
|---|---|---|
| Codex | 主力编码、本地测试、集成、git 收口、AI 生图与替代资源生成 | build、自验证、实现可行性判断、资源生成 |
| Claude Opus | 架构审查、设计压力测试、代码审查、视觉级验证代班 | 架构/schema/跨包/公共接口/高风险视觉任务 |
| GLM | 通读审计、清单覆盖、中文文档、测试矩阵、数据/schema 检查 | 覆盖/数据/文档/测试矩阵 |
| User | 产品判断、优先级、范围取舍、最终验收 | 阻塞裁决、验收 |

这些是默认分工,不是隔离墙。普通任务默认两方推进;高风险任务和分歧任务必须三方介入。

### 状态机

```txt
draft -> build -> review -> done
```

特殊状态: `blocked`, `rework`, `cancelled`。

### 推进签字

所有**开卡任务**必须在任务卡中维护“推进签字”。签字是阶段门禁,不是普通意见记录。(哪些任务必须开卡见「核心规则」与「上下文锚点」节:换手/跨会话接手的非小改、以及三方必审清单内的任务。)

- `draft -> build`: 必须有 Codex、Opus、GLM 三方对设计/风险/验收条件签 `agree`,或由用户明确批准缺签豁免。
- `review -> done`: 必须有 Codex、Opus、GLM 三方对实现/验证/审查结论签 `accept`,或由用户明确批准缺签豁免。
- 任一方签 `counter` 时任务转 `blocked` 或留在当前阶段,不得继续推进;用户拍板后按裁决更新签字表。
- 任一方额度耗尽时,任务卡必须写清缺席方、原因、代班方、代班范围、风险、是否需要补签,并由用户批准豁免后才能推进。
- Coding Owner 接手前必须检查签字表。即使任务卡 `Status` 写成 `build`,只要 build 准入签字不齐,也不得开始改实现文件。
- 小改不建签字表;未开卡的常规迭代(同 Owner 同会话连续推进)免签;开卡即必须维护签字表。

### 交接提示词

跨 Agent 交接时,完成当前阶段的一方必须在最终回复和任务卡中提供“下一位 Agent 提示词”。

提示词必须可直接复制给下一位 Agent,至少包含:

- 任务卡路径、当前状态、下一位 Agent 的职责。
- 下一位必须先读的文档和上下文锚点。
- 已完成内容、验证证据、剩余风险。
- 下一位需要输出的明确结果:签字 `agree/accept`、`counter` 理由、返工项、或用户待拍板问题。
- 是否允许改实现文件;若签字门禁未满足,必须明确写“不得开始实现/不得标记 done”。

若当前阶段已经无需交给下一位 Agent,必须明确写“无下一位 Agent 提示词,等待用户验收/收口”。

看板只保留轻量责任列:

```md
| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
```

### 任务分级

- 小改: 单文件、低风险、不碰 schema、不改公共接口、不改变用户可感知行为(指纯重构/文档/注释等无行为变化;行为修正类 bug 修属常规迭代)。可 `build -> done`,但必须自测并说明验证。
- 常规迭代: 已定 schema/架构上的编辑器、UX、渲染、普通 bug 修。Coding Owner 自测 + 提交说明写清验证;可事后异步抽审。
- 不可逆/高风险任务: schema/save/migration/asset pipeline、跨包公共接口、新能力格、capability-map 状态变化、关键公式/存档/资源管线。必须开任务卡并走 `draft -> build -> review -> done`。

拿不准时按高一档处理。

### 上下文锚点

所有非小改任务在进入 `build` 前必须有上下文锚点。锚点至少包括:

- 已拍板决策和铁律。
- 相关代码锚点,用 `file:line` 写清。
- 已知坑、审计文档、历史修复或测试。
- 本任务不得重新引入的概念或机制。

第一阶段任务的锚点至少包括:

- [`CLAUDE.md`](CLAUDE.md) 的忠实还原规则和工程经验。
- 相关 [`docs/phase1/engineering-notes.md`](docs/phase1/engineering-notes.md) 条目。
- 涉及机制/战斗/数值时的 [`docs/phase1/game-mechanics.md`](docs/phase1/game-mechanics.md)。
- 相关状态表、审计文档、历史测试或修复记录。

第二阶段任务的锚点至少包括:

- [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md)。
- 相关设计/审计文档,包括需要时的 [`docs/phase2/foundation/phase1-knowledge-harvest.md`](docs/phase2/foundation/phase1-knowledge-harvest.md)。
- 一阶段 UX 真值或代码锚点。

无上下文锚点的非小改任务不得进入 `build`。

锚点的载体按是否换手区分:同一 Coding Owner 在同一会话内连续推进的常规迭代,可不单独建卡,锚点视为自持;凡**换 Owner 或跨会话接手**的非小改任务(含额度代班),接手前必须有 lite 卡及锚点,无锚点不得接手。

### 额度与代班

- Codex 额度耗尽: 编码、验证、git 收口可由 Opus 全量代班;GLM 可代写方案/代码草案,由 Opus 或用户安排落地。AI 生图任务暂停等待 Codex 或由用户另行安排。
- Opus 额度耗尽: 架构审查可由 GLM + Codex 临时代班;高风险架构决策标记“待 Opus 补审”。
- GLM 额度耗尽: 覆盖清单、测试矩阵和文档审查可由 Opus + Codex 临时代班;大范围数据/文档任务标记“待 GLM 补审”。
- Opus + GLM 都耗尽: Codex 可推进小改;非平凡/高风险任务需用户确认是否允许单 Agent 推进。
- 代班方接手前必读任务卡与上下文锚点及其链接文档;上下文重建成本计入排期预期。

### 视觉验证能力

Codex 可在本仓库中通过本地 dev server、Playwright/浏览器工具和截图/像素检查做视觉验证;也可用 `view_image` 检查本地截图。若当前会话缺少浏览器工具、资产或服务不可用,必须在任务卡和最终回复中明确标记视觉验证未完成,并指定 Opus 或用户补验。

### 阶段纪律

动手前先判断阶段:

- 第一阶段: `packages/game`、`packages/pal-extract`、第一阶段文档。遵守 [`CLAUDE.md`](CLAUDE.md) 的忠实还原规则。
- 第二阶段: `packages/reforge`、`packages/editor`、`packages/content`、`docs/phase2`。优先遵守 [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md)。

拿不准时停下来问用户。
