# docs/phase2/ — 第二阶段（重制引擎 + 编辑器 + 内容）文档

> 本目录服务**第二阶段**：现代化重制引擎 + 内容编辑器 + 自有内容生产。
> **第一阶段（忠实还原）**的真值表、决策、架构、历史归档在 [`docs/phase1/`](../phase1/README.md)
> 与 [`docs/phase1/plans/`](../phase1/plans/README.md)，不在此处。两阶段文档不混。
> 版权素材替换、发行工具与远期玩法的第三阶段范围在 [`docs/phase3/`](../phase3/README.md)。

> **导航原则（2026-09-06 起）**：本 README 只维护稳定的目录导航与「现状看哪里」，不再手抄
> 每份计划/设计的实施状态——那是 capability-map 与 roadmap 的职责，手抄必然漂移。
> 各子目录的 `README.md` 负责本目录内文件的 current / historical / superseded 分类。

## 现状看哪里（权威入口）

| 想知道 | 去哪里 |
|---|---|
| 当前队列 / 下一步 | [`roadmap`](roadmap.md) 末节「当前第二阶段队列」+ [`../ops/board.md`](../ops/board.md) |
| 能力做到哪了 | [`capability-map`](capability-map.md)（进度真值表） |
| 开工铁律 | [`READ-FIRST`](READ-FIRST.md)（铁律与串台自查，开工前必读） |
| 已拍板决策 | [`decisions`](decisions.md)（决策正文与后续取代关系） |
| 当前内容/存档格式 | [`foundation/content-schema`](foundation/content-schema.md) 现行契约节 + `packages/content/src/character.ts` 常量 |
| 协作流程 | [工作流](../ops/agent-workflow.md) 与根 [`AGENTS.md`](../../AGENTS.md) |
| 审计与整改 | [审计索引](../ops/audits/README.md) 与 [文档维护](../ops/documentation.md) |

## 文档组织规矩（2026-06-27 立，新增文档照此放）

**两层：顶层放「常查的滚动方针」，下面按「主题」分文件夹。**

| 位置 | 放什么 |
|---|---|
| **顶层** | README（本文）+ 方针：`READ-FIRST` / `roadmap` / `capability-map`（进度真值表）/ `decisions` / `design-backlog` |
| **`foundation/`** | 跨切片地基（内容 schema、美术管线、引擎债审查），长期参照——见 [foundation/README](foundation/README.md) |
| **`<主题>/`** | 某子系统 / 切片的工作文档——见各主题目录 README |

**命名约定：**
- **顶层方针**：语义名，**无阶段前缀、无日期**。
- **文件夹内**：用**角色后缀** — `spec`（规格 / 真值）、`design`（架构）、`plan`（TDD 实现步骤）；去掉冗余的 `p0-`/`p1-`/`slice-` 前缀（文件夹已表达），去掉日期（日期进文件内「状态」行）。
- **多文档子系统**：用「主题前缀 + 角色」区分，如 `dialogue/` 下 `model-design`（数据）/ `visual-plan`（外观）。
- **新切片 / 子系统**：开一个**文件夹**，放它的 spec / design / plan，并补一个目录 README 标注 current/historical。

## 目录索引

| 目录 / 文件 | 职责 | 明细 |
|---|---|---|
| [READ-FIRST](READ-FIRST.md) | 开工铁律与串台自查 | — |
| [roadmap](roadmap.md) | 总纲：愿景 / 北极星 / 执行路线 / 当前队列（活文档） | — |
| [capability-map](capability-map.md) | 进度真值表：8 领域格 + 阶梯依赖 + 下一步选择器（活文档） | — |
| [decisions](decisions.md) | 决策正文及后续取代关系（滚动累积） | — |
| [design-backlog](design-backlog.md) | 设计议题池 | — |
| [foundation/](foundation/README.md) | 跨切片地基：content/save/script/actor 等设计与一阶段知识测绘 | [README](foundation/README.md) |
| [editor/](editor/README.md) | 编辑器子系统：项目设计、设计系统、作者指南 | [README](editor/README.md) |
| [dialogue/](dialogue/README.md) | 对话系统（数据模型 + 外观 + 迁移） | [README](dialogue/README.md) |
| [menu/](menu/README.md) | 菜单系统（D17 起的数据驱动 UI） | [README](menu/README.md) |
| [migrate/](migrate/README.md) | PAL 内容迁移管线 | [README](migrate/README.md) |
| [slice1-indoor/](slice1-indoor/README.md) | 切片 1：室内场景（历史启动切片） | [README](slice1-indoor/README.md) |

> 本 README 曾逐文件维护 70+ 份子文档的实施状态（草案/待实现/活跃等）。该状态层自
> 2026-09-06 起由 capability-map、roadmap 当前队列与各子目录 README 承接；历史状态表见
> Git 历史（`git log -p docs/phase2/README.md`）。

## 顶层专题文档

- [dev-tools.md](dev-tools.md) — DEV 调试面板合同（五 tab/输入隔离/帧步进/实体位置控制权检视）
- [ambience-design.md](ambience-design.md) — 氛围设计及其历史实现记录
- [battle-config-fills-review.md](battle-config-fills-review.md) — 当时的战斗配置审查（evidence）
- [battle-presentation-audit-2026-07-05.md](battle-presentation-audit-2026-07-05.md) — 战斗呈现审计快照（evidence）
- [poison-system-design.md](poison-system-design.md) — 毒系统设计记录；现行实现另查能力地图和源码
