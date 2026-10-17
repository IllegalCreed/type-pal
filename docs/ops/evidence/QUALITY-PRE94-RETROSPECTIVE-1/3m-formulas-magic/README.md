# CODE3m formulas / magic-damage 只读复审切片

> 2026-10-18 当前 counter：本片漏报 simulateMagic 上次目标、0x66 裸武术与非伤害敌法术预掷三个 caller 分叉，撤回下文相应“未发现缺陷/接线已核”的当前信用。历史原文保留；新卡先红后修与原件见[机制返工](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)。magic-damage 和 battle-opcodes 当前转 review，不据旧222绿数关闭。

基点：`369c5596a`；分支：`codex/code-quality-3y`。本片完整复审 3m 的公式与伤害共享 helper；只读核验，没有改变公式、伤害下限、随机抽样、公共接口、存档或资源格式。3m 整卡保持 `partial`。

完整读取：

- `packages/game/src/core/battle/formulas.ts` 及 `__tests__/formulas.test.ts`；
- `packages/game/src/core/battle/magic-damage.ts` 及 `__tests__/magic-damage.test.ts`。

生产 caller 逐段读取：`actions/magic.ts` 的 player→enemy / enemy→player guard、脚本前 auto-defend 预掷、动画后数字提交；`actions/attack.ts` 的物攻公式入口；`actions/coop-magic.ts` 的合击伤害入口；`battle-opcodes.ts` 的 0x42 SimulateMagic / 0x66 ThrowWeapon 参数映射；`battle-system.ts` 的 dex 队列消费与动作倍率。公共类型和生命周期核对 `BattleState`、`PlayerRoles`、runtime→battle 投影的装备加成/抗性 clamp、`SeedableRng`。

primary / oracle：`fight.c:131-389`（base/physical/magic/dex）、`fight.c:4012-4017` 与 `4270-4318`（玩家攻击法术）、`fight.c:4673-4853`（敌方攻击法术、auto-defend、抗性/除数）、`fight.c:5300-5400`（SimulateMagic）、`global.c:1736-1975`（玩家属性/抗性 getter）、`util.c:251-275`（RandomFloat）以及 `docs/phase1/game-mechanics.md:259-350,400-445,745-805,855-890`。逐项核对 SHORT/WORD 转换、三段 base damage、元素/毒抗与场效、玩家与敌人两套 resistance multiplier、敌方玩家防御不加等级、各目标独立 RNG、auto-defend 的前置抽样、inline=1 与 simulate=0 下限、死队员/空敌槽跳过和 object-magic 解析。

结论：未发现新的可证伪实现缺陷。`calcMagicDamage` 的整数步骤与 C 的 SHORT 赋值顺序一致；player→enemy、enemy→player 与 SimulateMagic 的 guard/target/下限/抗性/除数均由真实 caller 接线。测试直接覆盖手算公式、SHORT 边界、五灵/毒/场效、逐目标独立 RNG、auto-defend 抽样顺序、玩家防御等级不混入、protect/defending 组合、死队员跳过、object id 解析和模拟 guard；fixture 中的窄 `as any` 只用于补齐大型共享类型，不改变生产输入或 oracle。

验证：公式、magic-damage、battle actions、coop magic、敌法术 E2、battle opcode、throw-item 共 8 个测试文件 `222 passed`，无测试 stderr；`pnpm --filter @type-pal/game typecheck` 通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口。

高风险边界：本片读取第一阶段 battle formula / magic 机制，但没有改变产品行为、schema/save、公共接口、生成物或第二阶段模型。未宣称 3m 整卡完成；RNG helper 与统一质量门仍需独立证据。
