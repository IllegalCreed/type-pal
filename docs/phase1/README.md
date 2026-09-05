# docs/phase1/ — 第一阶段（忠实还原）文档

> v1.0.0 已上线、运行时冻结（根 README）。真值锚 = 大宇原版 `pal.exe` / 原始数据，
> sdlpal C 源为参考实现。
> **第二阶段（重制）**文档在 [`../phase2/`](../phase2/README.md)，两阶段世界观不混。

> **状态表口径（2026-09-06 标注）**：下列 status 表是 **v1.0 冻结时点的覆盖快照**
> （feature-status 2026-06-16、cutscene-status 2026-06-07 等），用于了解冻结时的完成度，
> **不是当前缺陷台账**——上线后新发现的存档/切场景/战斗调用/离线缓存等问题以
> [pre-E2E 审计](../ops/audits/pre-e2e/summary.md) 与后续修复卡为准。表中资源、公式等
> 仍由源码与原始数据背书的条目继续作为专题真值。

## 索引

### 覆盖快照（v1.0 冻结时点；当前缺陷见审计台账）
| 文件 | 内容 |
|---|---|
| [status/feature-status](status/feature-status.md) | 功能完成度总表 |
| [status/opcode-status](status/opcode-status.md) | 事件 opcode 实现状态 |
| [status/cutscene-status](status/cutscene-status.md) | 过场 / 演出状态 |
| [status/item-status](status/item-status.md) · [status/magic-status](status/magic-status.md) | 物品 / 仙术状态 |
| [status/resource-status](status/resource-status.md) | MKF 资源解析状态 |
| [game-mechanics](game-mechanics.md) | 战斗 / 机制考证（标注 sdlpal 验证 vs pal.exe 推断） |

### 设计 / 决策（主线，编号有序）
| 文件 | 内容 |
|---|---|
| [01-feasibility](01-feasibility.md) → [06-testing](06-testing.md) | 可行性 / 架构 / 开发计划 / **决策(04)** / 事件 schema(05) / 测试(06) |

### 工程经验 / 运维
| 文件 | 内容 |
|---|---|
| [engineering-notes](engineering-notes.md) | 跨会话踩坑 + 方法论（CLAUDE.md「工程经验速查」节的展开版） |
| [sdlpal-runbook](sdlpal-runbook.md) | sdlpal 参考 / 反汇编工具链 |

### 历史归档
| 文件 | 内容 |
|---|---|
| [plans/](plans/README.md) | per-milestone 计划 / 审查快照（m0–m5 / d-series）——**过程记录，不反映现状**；查现状看上面的 status 表 |

## 怎么用
- **现状如何** → status 表 + [game-mechanics](game-mechanics.md)
- **为什么这么定** → [04-decisions](04-decisions.md)
- **踩过的坑** → [engineering-notes](engineering-notes.md)
- **当年怎么一步步做的** → [plans/](plans/README.md)（历史，慎用）

## 目录文件索引

- [02-architecture.md](02-architecture.md)
- [03-development-plan.md](03-development-plan.md)
- [05-events-schema.md](05-events-schema.md)

历史计划的完整索引统一维护在 [plans/README](plans/README.md)。
