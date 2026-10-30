# CODE3m RNG 复审与边界修复切片

基点：`f6a88d3c4`；分支：`codex/code-quality-3y`。本片完整复审 `rng.ts` 与直接测试，读取真实战斗/事件 caller；仅修复 range API 的已证边界，不改随机算法、seed 格式、存档结构或产品抽样策略。3m 整卡保持 `partial`。

完整读取 `packages/game/src/core/rng.ts`、`rng.test.ts`；读取 `enemy-ai.ts`、`actions/flee.ts`、`battle-progression.ts`，以及 `battle-system.ts` 的队列 jitter、自动选法术、混乱目标、隐藏经验与升级调用区间。primary 为 `reference/sdlpal/util.c:169-275` 的 `lsrand/lrand/RandomLong/RandomFloat`，并核对 `fight.c:1474-1563`、`fight.c:3637-3658`、`fight.c:4143`、`fight.c:4540-4658`、`battle.c:1238-1284` 的实际消费顺序。

发现并修复：SDLPal 的三个随机区间 API 在 `to <= from` 时直接返回 `from`，不推进 RNG；TS 原实现仍调用 `next()`，倒序区间还可能产生错误值。先加入“相等/倒序返回 from 且 state 不变”的失败反例，旧实现 `1 failed / 7 passed`；再为 `range`、`rangeInclusive`、`rangeFloat` 增加同样的前置分支。这样不改变合法区间的分布或返回范围，只消除边界输入的错误结果与额外抽样。

为隔离修复后的真实 RNG 消费语义，更新一条 battle-system 相邻回归测试，在单人队 `RandomLong(0,0)` 场景显式固定后续伤害掷骰；该测试原先隐式依赖错误的额外抽样，修后仍验证越界目标不崩溃且实际受击。没有扩大生产调用范围。

验证：`rng.test.ts`、enemy-ai、battle actions/system、progression、state-machine、event-system 共 `7 files / 638 passed`，无新增测试诊断；先行边界反例按预期失败，修复后通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口。

高风险边界：触及第一阶段随机抽样与 RNG 消费顺序，但只恢复 SDLPal `to <= from` 合同；mulberry32 与 SDLPal LCG 的既有架构差异保留，未触碰 seed/save/public schema。公式、magic/status/queue/positions 与 RNG helper 证据现已形成，3m 统一质量门仍未收口。
