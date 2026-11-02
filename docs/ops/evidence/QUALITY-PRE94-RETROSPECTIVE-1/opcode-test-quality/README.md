# CODE3t opcode 专测的真实执行与判别力

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3t opcode 专测整改的治理候选页;原件为 Codex 单Agent 技术审查回执(原文 Status: local technical review; whole pre94 incomplete,base 457cfe0b)。复用[3t历史全文](../../../archive/tasks/done/CODE-QUALITY-3t-game-battle-opcodes.md)与[已修机制counter](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md);本片全文核 cov85 的 1217 行、glm-next-wave 的 70 行及真实输入 helper,只改两专测;逐文件八维、primary/caller、标题身份映射与限制在 review.json,不授主实现或主测试当前整文件信用。

## 来源与输入

0x66 旧例 roll=0 且只检查掉血,无法判别武术项;现在真实 hydrate 裸武术 60、roll2,以独立手算 313 验证 HP 和完整数字命令;敌 caster 例明确零玩家武术项并断言 53 伤害。0x28 旧标题冒称抗性 9,但只打另一目标;删除误称,真实 runScript 替代 ip+1 回调,核目标1立即扣5、非目标不动、advance 续点3与完整弹字;复活例注册 level2/4 毒定义,明确高等级毒保留;没有新增测试。glm 测试只修 ClearDialog 锚点(实际调用 3271/3432),五例非标题 token 相同。

## 断言与业务 oracle

同两枚精确变异,旧例各绿,修正后新例各单业务 AssertionError,原源/测试已恢复:throw 变异 oracle 为 HP8687 对缺失武术项 8747;poison-self 变异 oracle 为正确目标 health[9000,8995] 对错接 [8995,9000]。最初新例有两处错误预期(期望命令漏 op 字段、plain end 场景错设),失败和无效首轮 counter 原件均保留,不能当正式反控。

## 结果

62 身份保留,仅准确改名映射(renamed=4,added/removed=0);相邻 5 文件 241 例通过、0 失败、stderr 0,game 类型检查通过;不叠加重复数量。glm 旧关闭保留,本片 0 新 closed;账本时点 3424 tracked/414 closed/120 review/2890 pending。主测试残缺核心强转和 dispatcher 结构余域(2428 行主测试 any/partial 夹具)另续。本治理不重跑、不改写原判定。

## 限制与复核

全部剩余 pre94 冻结后才统一 check/official coverage/protected/一个 PR;本片均未运行;94–102 不扩展。只读快检按原文保留(仓库根 verify.mjs,核指纹、完整原件、有效 counter、身份及注释级 token;不写文件、不重跑测试)。原件逐字节保全在下方;候选待Owner非作者接收。

原文存活链接原样保留:[CODE-QUALITY-3t-game-battle-opcodes.md](../../../archive/tasks/done/CODE-QUALITY-3t-game-battle-opcodes.md) [README.md](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1942B / SHA-256 aeb08a790526e450cc92c5226e1cb8dc07f0280795b49aebdbee52fa7920aad1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3t opcode 专测的真实执行与判别力

Status: local technical review; whole pre94 incomplete
Owner: Codex（单 Agent）
Base: 457cfe0b80e1d8b44023a0446c6d91e1ae916155

复用[3t历史全文](../../../archive/tasks/done/CODE-QUALITY-3t-game-battle-opcodes.md)与[已修机制counter](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)；本片全文核 cov85 的1217行、glm-next-wave的70行及真实输入helper，只改两专测。逐文件八维、primary/caller、标题身份映射与限制在review.json，不授主实现或主测试当前整文件信用。

- 0x66旧例roll=0且只检查掉血，无法判别武术项；现在真实hydrate裸武术60、roll2，以独立手算313验证HP和完整数字命令。敌caster例明确零玩家武术项并断言53伤害。
- 0x28旧标题冒称抗性9，但只打另一目标；删除误称，真实runScript替代ip+1回调，核目标1立即扣5、非目标不动、advance续点3与完整弹字。复活例注册level2/4毒定义，明确高等级毒保留。没有新增测试。
- 同两枚精确变异，旧例各绿，修正后新例各单业务AssertionError；原源/测试已恢复。最初新例有两处错误预期，失败和无效首轮counter原件均保留，不能当正式反控。glm测试只修ClearDialog锚点；五例非标题token相同。

62身份保留，仅准确改名映射；相邻5文件241例、game类型检查通过，无stderr及可见运行诊断；不叠加重复数量。glm旧关闭保留，本片不新关闭文件。只读快检：仓库根 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/opcode-test-quality/verify.mjs`，核指纹、完整原件、有效counter、身份及注释级token；不写文件、不重跑测试。

0新closed。主测试残缺核心强转和dispatcher结构余域另续。全部剩余pre94冻结后才统一check／official coverage／protected／一个PR；本片均未运行。94–102不扩展。
```
<!-- incremental-original-source:end -->
