# GAME-MAGIC-NUMERIC-ASSIGNMENT-1 — 第一阶段法术中间赋值与随机倍率数值差异

Status: draft
Phase: phase1
Capability: pre-94 CODE3m / battle damage numerical fidelity
Coding Owner: Codex
Generation Owner: N/A
Visual Verification Owner: Codex
Contributor: Codex
Reviewer: Codex（当前源码及原生C片段核证，不冒充第三方）
Branch: codex/code-quality-3y
Visual Verification Timing: e2e-deferred

## 目标

核清第一阶段法术数值与SDLPal的已复现分叉，按裁决确定有限修复。

## 范围

核清第一阶段法术灵力随机乘法的中间赋值与取整差异，再按用户裁决做有限修复。当前只读核证，不改公式执行、随机算法、抽样次数、公共接口、存档、资源或第二阶段。注释与既有测试质量返工仍由父卡推进。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| SDLPal primary | FLOAT为32位float；RandomFloat含端点；灵力先乘后写回WORD，再整数除10 | common.h类型、util.c:250-277、fight.c:173-250原函数 |
| 当前第一阶段 | caller使用1+SeedableRng.next()*0.1，连续JS浮点运算最后Math.trunc | formulas.ts、magic-damage.ts、rng.ts与真实公开调用重放 |
| 当前二阶段 | N/A，不把phase1数值模型移植到Reforge | 本卡边界 |
| 当前目标 | 可感知伤害分叉已复现；获准前冻结数值实现 | 原生O0/O2及真实TS完整原件 |

## 直接证据

见[完整计数/命令/SHA/原始输出](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/numeric-counter.json)。原C函数体自动按函数边界提取，最小typed globals与指定lrand整数输入；clang O0/O2均零诊断且相同。TS使用实际createSeedableRng(244049)，经createInitialGameState、hydratePlayerRolesRuntime、projectRuntimeToBattleRoles、createBattleState、applyMagicDamage生产函数；只借typed角色/敌人/战场工厂，不stub RNG或伤害函数。

灵力240、敌人原始防御2/等级1（有效防御30）、基础伤害50、无元素、初始HP9000：TS首个next=0.2499999317806214，倍率1.0249999931780622，实际扣160/剩8840；原C使用对应归一化的整数样本536870765，扣161。四分之一采样536870912也给161，而TS叶函数倍率1.025给160。每次伤害仅一次抽样；TS下一状态1831809862与独立一次抽样相同。两边PRNG不同，不声称同seed跨引擎一致或完整游戏原盘实跑。

C样本INT_MAX返回11，故不能把TS半开区间注释反写成原C也半开。将现有表达式中的*10/10单独删除，在本反例中仍得到灵力245，不能当作修复。其余float系数/越界转换、极端输入与完整资产域仍pending，不从本反例推广为全部公式已审。

## 发现与停止线

旧3m“1:1/未发现直接缺陷”及公式文件关闭信用须撤回当前使用。此差异涉及用户可见伤害，按AGENTS高风险规则及用户“机制变更先裁决”边界停数值实现；不以删除死代码或纯重构名义顺带改变结果。

## 上下文锚点

AGENTS/CLAUDE第一阶段保真与停线原则、docs/phase1/engineering-notes.md数值对拍边界、game-mechanics.md伤害公式与身法真值，以及父卡CODE3m本片原件。源码锚点为formulas.calcMagicDamage、magic-damage.applyMagicDamage、util.RandomFloat与fight.PAL_CalcMagicDamage；不重新引入兼容/upgrader。

## 验收条件

获准后先写实际caller失败反例，再按primary明确32位中间值和WORD赋值域，修复最小有限路径并保持随机算法/次数/公开接口。跑定向、相邻战斗、typecheck与必要反控；静态零诊断。全仓check、官方coverage ratchet和protected fast留完整模块收口，不能以本叶函数反例代替。越界WORD域未定时继续pending，不能主动增加兼容/upgrader。

## 当前模式推进记录

Codex单Agent、唯一3y工作树；仅只读核证准入，无产品build allowed。父任务其它注释/测试可继续。产品裁决pending；本卡不是整goal blocked。

## Draft: 设计与风险

先区分随机分布与数值赋值；拟保留项目SeedableRng算法和抽样次数，仅在批准范围内处理确定的中间数值差异。完整数值域方案未定，不能承诺全公式等价或原版EXE精度。

## Build: 实现与自测

未改产品。原生O0/O2与TS对照均exit0，完整未裁剪输出及程序gz已保存，精确临时目录已清理；这是差异取证，不是修复后通过。

## Review: 审查与返工

原C FLOAT/WORD赋值与真实TS caller已经核证；旧1:1结论撤回。待用户裁决、先红后修及独立逐文件复核；done未准入。

## 用户验收

待裁决：是否按SDLPal修复本次中间赋值/取整口径，保留现有PRNG、抽样次数及接口。未收到回复前不实施数值变化。

## 交接日志

- 2026-10-18 Codex：发现正常域160/161直接counter，保存原C/真实TS原件并停数值实现；无弱化规则、无新编号治理卡、未合main。

## 下一位Agent提示词

无，Codex单Agent继续父任务；本卡未批准不得实现。
