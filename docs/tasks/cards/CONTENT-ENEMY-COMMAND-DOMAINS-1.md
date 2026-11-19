# CONTENT-ENEMY-COMMAND-DOMAINS-1 — 敌脚本字段与命令诊断

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 本次准入

**build allowed**。Codex 准入，单一 Coding Owner。仅修敌脚本目标策略、演出结果的字符串合同和战后命令分派定位。采用真实作者敌人校验红例与合法同形对照，核现行加载与战斗消费。范围为 enemy-script.ts、battle-choreography.ts 及其职责测试。

## 目标

作者敌脚本校验应认识当前字段的严格离散类型，并给非法命令返回可定位诊断。合法作者数据的格式和运行机制由现行二阶段合同管理。

## 范围

记录目标策略、战斗结果枚举及战后命令分派的作者校验问题。工程格式和战斗行为仍由现行合同管理。

## 前提与证据

以完整敌人定义调用公开 `validateAuthorEnemies`。目标策略字段传入单元素数组时，旧守卫将它转换为字符串比较并接受。战斗结束结果也接受同样形状。运行决策与演出读取原声明值，并使用字符串分支。普通项目是否含这些不合法输入尚未核证。

战后命令使用未登记的继承键时，分派遗漏自有键判定，最终抛 JavaScript TypeError。该输入原本也被拒绝，缺失的是本地命令诊断。初审另记录战后台词错误路径多出一层包装下标。

### 一手调用与原件

- [敌脚本动作及分派](../../../packages/content/src/enemy-script.ts#L117)、[战斗演出守卫](../../../packages/content/src/battle-choreography.ts#L80)，实际入口为 [作者敌人校验](../../../packages/content/src/validate-author.ts#L35)。
- [战斗决策与策略读取](../../../packages/reforge/src/battle/battle-core.ts#L919)，作者合同见[脚本说明](../../phase2/specs/script-system.md)。
- [唯一执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)的 `enemy-command-domain-red` 保留三项失败及真实栈和错误，`enemy-command-domain.fixture.txt` 可重放。

## 本次修复

目标策略和结束结果在正式敌人验证入口要求实际字符串。战后命令分派只接受自有登记的命令，错误台词报告真实命令索引。限制沿用当前作者合同，运行机制和有效作者字段维持原语义。

| 文件 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 可读性 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enemy-script.ts | 合法策略通过，数组和未知命令报原位错误，战后台词定位真实索引 | 补充共享数组守卫产生包装下标的原因 | 分派与敌脚本上下文在本模块，作者台词 guard 不改 | 依赖原判型、台词守卫及命令定位 | 同样作者输入的合法对照、数组、未登记命令和第二个命令台词反例 | 当前字段值与自身登记显式表达 | 删除字符串强制转换，继续走唯一台词语法 | 入口同步函数可用合法敌人直接测试 |
| battle-choreography.ts | 三种终止结果按字符串精确接收 | 原动作和事件注释继续适用 | 演出动作校验和播放职责分离 | 保留同一 exactKeys 和作者敌人入口 | lost 同形正反控制，原三态正控仍通过 | 结果字段先检查类型后检查枚举 | 移除隐式转换 | 真实作者入口无需构造战斗 host |

## 验收

归档内 content-red 和 diagnostics-red 含原生失败。content-after-diagnostic-path 覆盖作者验证、老字段和路径精度。既有台词专测改见证实际位置，原拒绝行为、精确文案与输入不变断言均保留。运行消费按当前脚本类型检查，并由相邻运行测试与集中门确认。

## 状态与交接

集中门已通过，实际命令和零诊断回执见后继归档。作者项目、战斗时序和能力边界维持现行语义。

[本次执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-review-closeout.tar.gz)固定实际命令、候选文件、失败与通过。
