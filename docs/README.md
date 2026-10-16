# 文档总入口

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

按工作职责找到可信入口，再按需要下钻任务和证据。普通开发从[操作路由](../AGENTS.md#操作与必读)进入；全 docs 审计才逐篇读取，不能把路径猜测当作语义审查。

## 范围

这里导航 lore、协作运维、三个阶段、测试和文档治理。包、工程及第三方资源的专属说明就地维护；本页不复制任务状态或测试通过结论。

## 当前状态

本页是 current 导航。任务状态以任务卡顶部为准；测试状态以 catalog 为准；文档审查与迁移进度单列在治理任务，不能把旧 registry 的 reviewed 当成全量完成。

## 入口与责任

| 工作职责 | 入口 | 下一跳 |
|---|---|---|
| 项目文档怎么读写 | [项目文档模型](ops/guides/documentation-model.md) | 路由、事实权、模板与写回闭环 |
| 找正在推进的任务 | [协作与工程维护](ops/README.md) | 看板、任务卡与生成索引 |
| 查世界观来源或创意 | [Lore](lore/README.md) | 区分 canon 与 ideas |
| 第一阶段保真与机制 | [Phase 1](phase1/README.md) | 机制真值、工程知识与历史状态 |
| 第二阶段 Reforge | [Phase 2](phase2/README.md) | READ-FIRST、当前规范与路线 |
| 第三阶段候选与参考 | [Phase 3](phase3/README.md) | backlog 与输入边界 |
| 测试合同与执行证据 | [测试与验证](testing/README.md) | governance、catalog、E2E、domain reports |
| 文档类型和审查覆盖 | [全 docs 治理](phase-governance/README.md) | 模板、review records 与一致性矩阵 |

Owner 为当前 Coding Owner；修改正文后同步相关事实源和 review record。索引只导航，不另立结论。

### 就地维护的说明

- 项目：[仓库 README](../README.md)、[English README](../README.en.md)、[贡献说明](../CONTRIBUTING.md)、[协作协议](../AGENTS.md)、[第一阶段知识](../CLAUDE.md)。
- 包：[content](../packages/content/README.md)、[editor](../packages/editor/README.md)、[reforge](../packages/reforge/README.md)、[migrate](../packages/migrate/README.md)、[game](../packages/game/README.md)、[shared](../packages/shared/README.md)、[pal-extract](../packages/pal-extract/README.md)。
- 工程与来源：[PAL 检查点](../projects/pal/e2e-checkpoints/README.md)、[自造地图测试工程](../projects/e2e-own/README.md)、[原始素材](../data/raw/README.md)、[参考源码](../reference/README.md)、[引擎资源来源](../packages/reforge/src/engine-chrome/assets/PROVENANCE.md)。

## 证据与下一步

正文治理见 [DOCS-FULL-TEMPLATE-1](ops/tasks/DOCS-FULL-TEMPLATE-1.md)。历史材料按原始日期与候选范围读取；静态治理不证明 runtime、E2E、视觉或 coverage。若入口与实现冲突，先登记证据和停止线，再核正权威来源。
