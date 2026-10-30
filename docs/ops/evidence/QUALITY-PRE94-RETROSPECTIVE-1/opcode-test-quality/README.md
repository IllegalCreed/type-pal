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
