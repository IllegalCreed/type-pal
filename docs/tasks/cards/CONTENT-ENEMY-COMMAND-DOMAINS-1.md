# CONTENT-ENEMY-COMMAND-DOMAINS-1 — 敌脚本字段与命令诊断

Status: draft
Phase: phase2
Owner: Codex
Coding Owner: 未分配
Reviewer: Codex
Last reviewed: 2026-11-18
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

作者敌脚本校验应认识当前字段的严格离散类型，并给非法命令返回可定位诊断。合法作者数据的格式和运行机制由现行二阶段合同管理。

## 范围

记录目标策略、战斗结果枚举及战后命令分派的作者校验问题。工程格式和战斗行为仍由现行合同管理。

## 前提与证据

以完整敌人定义调用公开 `validateAuthorEnemies`。目标策略字段传入单元素数组时，旧守卫将它转换为字符串比较并接受。战斗结束结果也接受同样形状。运行决策与演出读取原声明值，并使用字符串分支。普通项目是否含这些不合法输入尚未核证。

战后命令使用未登记的继承键时，分派遗漏自有键判定，最终抛 JavaScript TypeError。该输入原本也被拒绝，缺失的是本地命令诊断。合法战后台词错误路径另有一层包装下标，后续核诊断消费者后处理。

### 一手调用与原件

- [敌脚本动作及分派](../../../packages/content/src/enemy-script.ts#L117)、[战斗演出守卫](../../../packages/content/src/battle-choreography.ts#L80)，实际入口为 [作者敌人校验](../../../packages/content/src/validate-author.ts#L35)。
- [战斗决策与策略读取](../../../packages/reforge/src/battle/battle-core.ts#L919)，作者合同见[脚本说明](../../phase2/specs/script-system.md)。
- [唯一执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)的 `enemy-command-domain-red` 保留三项失败及真实栈和错误，`enemy-command-domain.fixture.txt` 可重放。

## 验收

待准入后分别核两类合法字符串与数组负例、未知命令诊断及合法战后台词定位。用作者校验与真实战斗调用承接各自合同。

## 状态与交接

`enemy-script.ts` 与 `battle-choreography.ts` 维持 review。两项离散字段拒绝涉及作者格式守卫，准入后须保留合法字符串正控、真实加载及战斗消费者验证。未调整作者数据或实现。
