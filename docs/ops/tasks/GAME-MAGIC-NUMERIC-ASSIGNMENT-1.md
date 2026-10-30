# GAME-MAGIC-NUMERIC-ASSIGNMENT-1 — 第一阶段法术中间赋值与随机倍率数值差异

Status: review
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

核清第一阶段法术灵力随机乘法与抗性计算的浮点精度和中间赋值。用户2026-10-24已批准有限修复；本轮只改可表示的C转换域，保留PRNG、抽样次数、接口、存档、资源与第二阶段。极大/扩展属性保留当前结果，不擅自引入回绕。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| SDLPal primary | FLOAT为32位float；RandomFloat含端点；灵力先乘后写回WORD，再整数除10 | common.h类型、util.c:250-277、fight.c:173-250原函数 |
| 基点第一阶段 | caller使用1+SeedableRng.next()*0.1，连续JS浮点运算最后Math.trunc；本轮在可表示转换域修FLOAT赋值 | formulas.ts、magic-damage.ts、rng.ts与真实公开调用重放 |
| 当前二阶段 | N/A，不把phase1数值模型移植到Reforge | 本卡边界 |
| 当前目标 | 可感知分叉已获准修复；正式真实caller业务红后修，统一门等全部pre94收尾 | 原生O0/O2及真实TS完整原件 |

## 直接证据

见[完整计数/命令/SHA/原始输出](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/numeric-counter.json)。原C函数体自动按函数边界提取，最小typed globals与指定lrand整数输入；clang O0/O2均零诊断且相同。TS使用实际createSeedableRng(244049)，经createInitialGameState、hydratePlayerRolesRuntime、projectRuntimeToBattleRoles、createBattleState、applyMagicDamage生产函数；只借typed角色/敌人/战场工厂，不stub RNG或伤害函数。

灵力240、敌人原始防御2/等级1（有效防御30）、基础伤害50、无元素、初始HP9000：TS首个next=0.2499999317806214，倍率1.0249999931780622，实际扣160/剩8840；原C使用对应归一化的整数样本536870765，扣161。四分之一采样536870912也给161，而TS叶函数倍率1.025给160。每次伤害仅一次抽样；TS下一状态1831809862与独立一次抽样相同。两边PRNG不同，不声称同seed跨引擎一致或完整游戏原盘实跑。

C样本INT_MAX返回11，故不能把TS半开区间注释反写成原C也半开。将现有表达式中的*10/10单独删除，在本反例中仍得到灵力245，不能当作修复。其余float系数/越界转换、极端输入与完整资产域仍pending，不从本反例推广为全部公式已审。

## 发现与停止线

旧3m“1:1/未发现直接缺陷”及公式关闭信用撤回保留。发现时按AGENTS停线，用户2026-10-24随后批准FLOAT和中间赋值窄修。未定义转换域仍不获新策略；本轮不能恢复全数值域1:1信用。

## 上下文锚点

AGENTS/CLAUDE第一阶段保真与停线原则、docs/phase1/engineering-notes.md数值对拍边界、game-mechanics.md伤害公式与身法真值，以及父卡CODE3m本片原件。源码锚点为formulas.calcMagicDamage、magic-damage.applyMagicDamage、util.RandomFloat与fight.PAL_CalcMagicDamage；不重新引入兼容/upgrader。

## 验收条件

获准后先写实际caller失败反例，再按primary明确32位中间值和WORD赋值域，修复最小有限路径并保持随机算法/次数/公开接口。跑定向、相邻战斗、typecheck与必要反控；静态零诊断。全仓check、官方coverage ratchet和protected fast留完整模块收口，不能以本叶函数反例代替。越界WORD域未定时继续pending，不能主动增加兼容/upgrader。

## 当前模式推进记录

Codex单Agent、同一3y。用户已回复“同意按 SDLPal 步骤修复（推荐）”，build allowed仅FLOAT/中间赋值与正式真实caller反例。父任务其它pre94继续；全部剩余pre94解决后才集中统一门并提交一个PR。

## Draft: 设计与风险

先区分随机分布与数值赋值；拟保留项目SeedableRng算法和抽样次数，仅在批准范围内处理确定的中间数值差异。完整数值域方案未定，不能承诺全公式等价或原版EXE精度。

## Build: 实现与自测

10-18只读取证原件保留。2026-10-24两批各2条真实caller业务红后修；最终精确5例对仅旧formulas源4业务红/1既有增长绿，恢复后5绿。原C有限36向量和5151抗性输入O0/O2一致、UBSan零诊断，修后TS差异0；23实际相邻文件897例及game TC通过。[当前八维、原件与只读复验](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-core-fade-quality/README.md)。两个私有计算步骤明确数值转换责任，未新增公共测试出口。

## Review: 审查与返工

产品方向已批且先红后修，局部技术返工已记录；旧全域1:1信用不恢复。全仓check/official/protected及集成仍待全部pre94冻结，done未准入。极端dex/其它caller边界不借本片接受。

## 用户验收

2026-10-24用户裁决call_d1f8582307ae48cc9b783c31c1bbaaa4：“同意按 SDLPal 步骤修复（推荐）”。保留PRNG和次数，未定义转换域不新增回绕；未做完整数值域/视觉验收。

## 交接日志

- 2026-10-18 Codex：发现正常域160/161直接counter，保存原C/真实TS原件并停数值实现；无弱化规则、无新编号治理卡、未合main。

## 下一位Agent提示词

无，Codex单Agent继续父任务；本卡获准窄修已实现，统一门遵守父卡当前节奏，未准入溢出策略不得顺带实现。

## 2026-10-25 用户裁决与本次准入

call_400efa7c97674487ba183635ba343d7f 第0项批准保留TS极值速度并记录偏离；第1项批准保留有效正防御、先红后修。下方10-24的“尚未答复”仅描述历史时点，不再是当前停线。Coding Owner仍为Codex，build allowed限定玩家0..65535整数防御的SHORT误读修复、真实hydrate/project→伤害入口回归及极值速度偏离说明；扩展属性结果、PRNG/抽样次数、存档及敌方防御路径保持。本卡统一门待全部pre94收尾。

## 2026-10-24 原延期dex边界：具体取证，等待产品取舍

未改任何数值实现。原PAL_CLASSIC两helper函数体与STATUS枚举自动按边界提取，在最小WORD/SHORT globals下clang O0/O2执行159行一致；TS通过真实createInitialGameState→hydratePlayerRolesRuntime→projectRuntimeToBattleRoles→getPlayerActualDexterity读取同一玩家值。身法21846、haste有效时，原C WORD乘法回绕为2再限999，当前TS为999；敌level11000/dex20时C为-32498、TS为33038。154条当前原盘提取敌人数据在本getter输出上全部相等，输入SHA保持；不冒称普通剧情、完整队列/原EXE或浏览器已复现。

已向用户提出保留当前TS、不新增回绕并明确登记偏离的建议；当前回答尚未收到，不能按预选项视为批准。只暂停该极端域的整文件/整卡裁定，其它八维、注释和RNG测试判别力继续。原已批准FLOAT/抗性修复不撤回、不重复实现。完整当前证据将写入父任务battle-core-closeout入口。

### 同轮新增已证输入问题：正防御SHORT误读

公开GS hydrate/project→createBattleState→真实SeedableRng/rollAutoDefend→applyEnemyMagicDamage：防御32767时扣50，防御32768时扣68，两侧RNG终态均3663131668、自动防御false。原C PAL_BattleEnemyPerformAction将PAL_GetPlayerDefense结果保留在int def，再传WORD参数；这里32768是有效正值。按原PAL_CalcBaseDamage的分支，敌灵力远小于def×0.6，基础伤害为0，仅留下50法术基伤。当前TS先asShort把32768转负再钳0，故额外受损。这里50是primary分支推导，不冒称已运行完整C敌方行动函数。

已请求仅对0..65535整数防御去掉错误有符号解释，扩展域处理保持原状、正式红例后修；用户尚未答复，未改实现。该范围独立于前面的速度回绕取舍，magic-damage及其直接专测继续review。当前原件将与本轮RNG判别力/八维版本桥同存battle-core-closeout，不新建编号任务。

2026-10-25实施：正防御正式旧源红后修，域外65536结果及RNG序保留；速度按用户选择不改算法。131相关例／game TC通过，见[当前八维和完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/approved-boundaries/README.md)。仅代码接受，统一门未跑。
