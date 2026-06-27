# docs/phase2/ — 第二阶段（重制引擎 + 编辑器 + 内容）文档

> 本目录服务**第二阶段**：现代化重制引擎 + 内容编辑器 + 自有内容生产。
> **第一阶段（忠实还原）**的真值表、决策、架构、历史归档在 `docs/` 顶层与 `docs/plans/`，不在此处。两阶段文档不混。
> **第三阶段（MMO + 深度玩法）**的远期设想在 [`docs/phase3/`](../phase3/README.md)——第二阶段不碰、只存放。

## 文档组织规矩（2026-06-27 立，新增文档照此放）

**两层：顶层放「常查的滚动方针」，下面按「主题」分文件夹。**

| 位置 | 放什么 |
|---|---|
| **顶层** | README（本文）+ 方针：`READ-FIRST` / `roadmap` / `decisions` / `design-backlog` |
| **`foundation/`** | 跨切片地基（内容 schema、美术管线、引擎债审查），长期参照 |
| **`<主题>/`** | 某子系统 / 切片的工作文档（如 `slice1-indoor/`、`dialogue/`） |

**命名约定：**
- **顶层方针**：语义名，**无阶段前缀、无日期**。
- **文件夹内**：用**角色后缀** — `spec`（规格 / 真值）、`design`（架构）、`plan`（TDD 实现步骤）；去掉冗余的 `p0-`/`p1-`/`slice-` 前缀（文件夹已表达），去掉日期（日期进文件内「状态」行）。
- **多文档子系统**：用「主题前缀 + 角色」区分，如 `dialogue/` 下 `model-design`（数据）/ `visual-plan`（外观）。
- **新切片 / 子系统**：开一个**文件夹**，放它的 spec / design / plan。

## 索引

### 顶层 · 方针（常查 / 滚动）
| 文件 | 内容 | 状态 |
|---|---|---|
| [READ-FIRST](READ-FIRST.md) | 六条铁律 + 串台自查（**开工前必读**） | 定稿 |
| [roadmap](roadmap.md) | 总纲：愿景 / 架构判断 / 子项目分解 / 切入策略 | 草案 |
| [decisions](decisions.md) | 已拍板决策 **D1–D17**（滚动累积） | 滚动 |
| [design-backlog](design-backlog.md) | 设计议题池（痛点 + 方向 + 归属 + 状态） | 滚动 |

### foundation/ · 跨切片地基（长期参照）
| 文件 | 内容 | 状态 |
|---|---|---|
| [content-schema](foundation/content-schema.md) | 内容数据模型（三层状态 / 稳定 id / 场景包 / 事件演出 / 角色实例化）+ 迁移器 | 草案 |
| [art-pipeline](foundation/art-pipeline.md) | 美术资产生图管线（像素风 / 动画现实路径） | 草案 |
| [engine-debt-audit](foundation/engine-debt-audit.md) | 第一阶段引擎架构债（18 finding + 反查表）—— 重写的反面输入 | 定稿 |

### slice1-indoor/ · 切片 1：室内场景跑通
| 文件 | 内容 | 状态 |
|---|---|---|
| [guijie-minju](slice1-indoor/guijie-minju.md) | **鬼界民居 demo**（Canvas 2D，借原版民居裁一间，走 / 撞 / 对话） | 活跃 |
| [spec](slice1-indoor/spec.md) | 旧 spec（WebGL / MMO / 通用房间）→ 已被重新聚焦取代 | 存档 |
| [plan](slice1-indoor/plan.md) | 旧实现计划（1300 行 TDD，旧范围） | 存档 |

### dialogue/ · 对话系统（跨 ①②③ 的子系统）
> 三刀：① 数据结构化(model) → ② 外观 Canvas2D(visual) → ③ 迁移器(留后)。

| 文件 | 内容 | 状态 |
|---|---|---|
| [model-design](dialogue/model-design.md) | ① 对话数据结构化设计（去 in-band 控制符 + i18n + slot） | 已实现 |
| [model-plan](dialogue/model-plan.md) | ① TDD 实现计划（数据模型 + 状态机） | 已实现 |
| [visual-spec](dialogue/visual-spec.md) | 对话框外观**真值参考**（原版坐标 / 色值 / 打字时序，GLM 整理） | 参考 |
| [visual-design](dialogue/visual-design.md) | ② 外观设计（Canvas2D 适配 + slot 共存 + 完整技术点仪表盘） | 已认可 |
| [visual-plan](dialogue/visual-plan.md) | ② TDD 实现计划（7 Task） | 待实现 |

## 怎么用（阅读路径）
- **整体方向** → [roadmap](roadmap.md)
- **开工铁律** → [READ-FIRST](READ-FIRST.md)
- **已拍 / 在议** → [decisions](decisions.md) / [design-backlog](design-backlog.md)
- **内容格式怎么定** → [foundation/content-schema](foundation/content-schema.md)
- **当前切片做什么** → [slice1-indoor/guijie-minju](slice1-indoor/guijie-minju.md)
- **对话系统** → [dialogue/](dialogue/model-design.md)（model 数据 → visual 外观）
- **旧引擎哪些债必须绕开** → [foundation/engine-debt-audit](foundation/engine-debt-audit.md)
