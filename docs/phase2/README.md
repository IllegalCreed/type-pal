# docs/phase2/ — 第二阶段（重制 + 编辑器）文档

> 本目录服务**第二阶段**：现代化重制引擎 + 内容编辑器 + 自有内容生产。
> **第一阶段（忠实还原）**的真值表、决策、架构、历史归档在 `docs/` 顶层与 `docs/plans/`，不在此处。两阶段文档不混。
> **第三阶段（MMO + 深度玩法系统）**的远期设想在 [`docs/phase3/`](../phase3/README.md)——第二阶段不碰、只存放避免丢失。

## 索引

| 文件 | 内容 | 状态 |
|---|---|---|
| [00-roadmap](00-roadmap.md) | 第二阶段总纲：愿景 / 架构判断 / 子项目分解 / 切入策略 | 草案 |
| [READ-FIRST](READ-FIRST.md) | 六条铁律 + 串台自查（开工前必读） | 定稿 |
| [decisions](decisions.md) | 已拍板的第二阶段架构 / 范围决策（D1–D4 / D9；D5–D8 玩法系统已移交 phase3） | 滚动 |
| [p0-content-schema](p0-content-schema.md) | 内容数据模型（三层状态 / 稳定 id / 场景包 / 事件演出 / 角色实例化） + 迁移器 | 草案 |
| [p1-slice1-indoor-scene](p1-slice1-indoor-scene.md) | P1 第一刀 spec：室内场景跑通（走路 + 撞墙 + NPC 对话），起 content + reforge 两包 | 草案 |
| [p1-slice1-indoor-scene-plan](p1-slice1-indoor-scene-plan.md) | 切片 1 实现计划（TDD 任务分解：0 接线 / A content / B 引擎逻辑 / C 渲染+dev） | 草案 |
| [design-backlog](design-backlog.md) | 设计议题池（每条 = 痛点 + 方向 + 归属 + 状态） | 滚动 |
| [2026-06-22-phase1-engine-debt-audit](2026-06-22-phase1-engine-debt-audit.md) | 第一阶段引擎架构债审查（18 条 finding + 反查表），P1 新引擎 spec 的反面输入 | 定稿 |

（更多 P1 切片 / P2 编辑器 spec、现状真值表随开工逐步加入）

## 怎么用

- 想知道第二阶段**整体方向** → 读 [00-roadmap](00-roadmap.md)。
- 想知道**开工铁律** → 读 [READ-FIRST](READ-FIRST.md)。
- 想知道**已拍板了什么 / 还在议什么** → 读 [decisions](decisions.md)（已决 D1–D9）与 [design-backlog](design-backlog.md)（在议）。
- 想知道**内容格式怎么定** → 读 [p0-content-schema](p0-content-schema.md)。
- 想知道**第一刀（切片 1）做什么** → 读 [p1-slice1-indoor-scene](p1-slice1-indoor-scene.md)。
- 想知道**旧引擎哪些债必须绕开、为什么** → 读 [2026-06-22-phase1-engine-debt-audit](2026-06-22-phase1-engine-debt-audit.md)。
- 想知道**某子项目细节** → 读对应 spec（P0 起逐步补）。
- 第二阶段的「现状真值表」将在子项目落地后建立，届时本表更新。
