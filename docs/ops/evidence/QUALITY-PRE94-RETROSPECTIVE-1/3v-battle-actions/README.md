# CODE3v battle actions 当前复审切片

基点：`f412c7dce`；分支：`codex/code-quality-3y`。本片重新复审历史 3v 的基础战斗 action，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。3v 当前复审提升为 `partial`，未标 accept/done。

完整读取 4 个实现文件：`packages/game/src/core/battle/actions/attack.ts`（614 行）、`attack-mate.ts`（111 行）、`defend.ts`（20 行）和 `flee.ts`（81 行）。完整读取专属 `attack-mate.test.ts`（148 行）与 `actions/attack.glm-next-wave.test.ts`（64 行）；读取 `actions.test.ts` 的基础 attack / confused-enemy / defend / flee 相关段（218–520、920–1120），以及 battle animation/formula 相邻 oracle 的直接区间。生产 caller 核对 `battle-system.ts` 的 `performBattleAction`、目标重选、行动前合法性/降级链和 `mode.ts` 战斗分派；动画所有权留在 `anim-timeline.ts` / `battle-anim-driver.ts`，不在 action 中重复实现。

primary source 核对 `reference/sdlpal/fight.c:3618-3854,4110-4172,4591-4654,4910-5175`、`battle.c:1397-1528`、`battle.h:49-68`，并对照 `docs/phase1/game-mechanics.md` 已批准的敌方逃跑抵抗修复（使用敌吉运而非 SDLPal 原始误用的身法）。核对轴包括玩家/敌人物攻 SHORT 与等级项、群攻命中顺序和 division、DualAttack/暴击/RNG、混乱攻友/无目标 Pass、Defend ownership、敌方自动防御/cover/protect/毒物脚本、Flee boss/RNG/失败经验/动画以及 timeline/CommandBus 与 HP 写回顺序。

未发现能由 primary source + 真实 caller 证实的新实现 direct defect。`performFlee` 的敌吉运字段是第一阶段文档中已由用户批准的行为取舍，保留，不回改 SDLPal 原始 bug。测试判别力核验：定向 6 files / 154 tests 全绿；专属测试有合法目标、死亡/空目标、边界、RNG、动画资源缺失、cover/auto-defend、boss/装备和失败反例。`actions.test.ts` 只作为相关段相邻 oracle，不计入本片逐文件关闭；未发现本片可直接证实的恒真或跨文件重复用例。

本片无实现改动、无行为修复、无 schema/save、公共 API、资产管线、生成物或 UI 改动。保留风险：动作主测试整文件、完整 animation/formula 轴、battle-opcodes/magic/item/throw/coop、视觉/E2E 和统一覆盖率门不在本片关闭；未知项继续由各自卡与后续模块批次处理。

验证：定向 6 files / 154 tests passed；本片未改产品实现，因此不重复运行 game typecheck；覆盖率 ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户成本边界未运行。后续文档/lint/ledger 门只验证治理记录完整性，不替代这些高成本门。
