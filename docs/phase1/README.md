# 第一阶段：忠实还原

Status: current
Last reviewed: 2026-11-02
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

这是 [AGENTS](../../AGENTS.md#操作与必读)下的第一阶段薄索引；按任务选下表一项，不默认全文读取所有知识或历史材料。

## 范围

第一阶段包括 `packages/game`、原版资源提取及相应机制考证。玩法与可见表现受忠实还原约束，代码结构允许治理；第二阶段引擎、编辑器与迁移内容按[Reforge规则](../phase2/READ-FIRST.md)，不能把第一阶段架构当成其合同。

## 当前状态

current 仅表示本导航和阶段边界有效。产品能力、已验行为和未完缺陷分别查原任务及证据；下游历史文档保留其日期与有效范围，不因被本索引引用而升级为现行事实。

## 入口与责任

| 需要解决的问题 | 按需阅读 |
|---|---|
| 运行时结构、开发命令、资源链与原版考证 | [game 包说明](../../packages/game/README.md)；提取细节查 [pal-extract](../../packages/pal-extract/README.md) |
| 战斗公式、脚本或游戏机制 | [机制资料](game-mechanics.md)，按专题核来源、版本及待证项 |
| 调试经验、渲染/脚本/音频陷阱 | [工程记录](engineering-notes.md)，按症状查对应小节，再核当前实现 |
| sdlpal 构建、运行与原版分析工具 | [参考运行记录](sdlpal-runbook.md)，执行旧命令前核当前工具与路径 |
| 已定取舍与事件格式的由来 | [决策记录](04-decisions.md)、[事件格式记录](05-events-schema.md) |
| 正在做什么、某缺陷是否关闭 | [活动看板](../tasks/board.md)及原任务；问题背景见[审计汇总](../tasks/audits/pre-e2e/summary.md) |

仅追溯时进入：[冻结状态快照](status/README.md)、[历史规划](plans/README.md)、[可行性](01-feasibility.md)、[架构](02-architecture.md)、[开发计划](03-development-plan.md)、[测试方案](06-testing.md)。这些目录不充当当前任务状态源。

## 证据与下一步

按根入口选择开发、测试或 E2E 规则；变更确认的知识写回对应唯一正文，历史观察保留来源边界。原版数据、sdlpal 参考、本项目实现及用户观察分别记录，证据冲突按当前任务核验与裁决。本页不重复存放旧索引和已退役根入口的全文；需要追溯时读取固定主线的[旧索引](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/phase1/README.md)或[旧知识入口](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/CLAUDE.md)。
