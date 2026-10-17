# CODE3s battle-system 当前复审切片

> 2026-10-18 当前counter：H01单敌fixture误造敌人101，显式reporter产生1块stderr；撤回下文对应“无stderr”当前信用，历史原文保留。roster单红后改用0xffff终止符，主测与H01登记review；结果见[相邻返工](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)，不扩大为整卡重验。

基点：`d2c5ca463`；分支：`codex/code-quality-3y`。本片重新复审历史 3s 的战斗宿主，不把历史 done、旧行数、旧测试数量或旧全仓门当作当前验收。3s 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/core/battle/battle-system.ts`（3,141 行）和 `packages/game/src/core/battle/__tests__/battle-system.test.ts`（4,248 行）。完整读取相邻生命周期合同：`battle-system.cov85.test.ts`（330 行）、`battle-system.glm-next-wave.test.ts`（122 行）、`battle-runtime-context.test.ts`（75 行）、`battle-finalization.test.ts`（80 行）、`battle-settlement.glm-next-wave.test.ts`（259 行）、`battle-state.glm-next-wave.test.ts`（81 行）、`battle-state-machine.glm-battle.test.ts`（464 行）和 `battle-turn-boundaries.glm-turn.test.ts`（504 行）。测试核验真实 `startBattle`/`tickBattle`/`tickEnemyIdleGestures` caller、typed BattleState 生命周期、结算/清理 owner、输入/动作/队列和异常资源边界；未以包级全绿替代逐文件判别力检查。

生产 caller 读取 `packages/game/src/core/mode.ts`、`packages/game/src/shell/bootstrap.ts` 的战斗分派与资源注入，以及 `battle-finalization.ts`、`battle-settlement.ts` 的收尾所有权。primary source 核对 `reference/sdlpal/battle.c:565-682,685-988,991-1372,1390-1528,1531-1838`、`reference/sdlpal/fight.c:740-885,1080-1190,1390-1710,1770-1860`、`reference/sdlpal/script.c:3318-3331` 和 `reference/sdlpal/global.h` 的战斗对象/状态字段。核对轴包括 startBattle 敌槽/对象脚本 overlay/资源播种/复活与装备重建、phase/hold/stall、turn-start/ready、行动队列与 RNG 顺序、死亡/濒死脚本、dialog/animation/fade/flee、毒与状态、结算/清理/resume 的 owner 边界。

本片发现并修复一项测试隔离问题：`battle-system.cov85.test.ts` 中两个 `console.error` spy 未恢复，`battle-system.test.ts` 的两个战斗集成 describe 中 `console.warn` spy 也未在用例后恢复；现分别使用 `try/finally` 或 describe `afterEach` 恢复，避免诊断静音跨用例污染。该改动只影响测试隔离，不改变产品行为、战斗机制、schema/save、公共接口或生成物。

未发现能由 primary source + 真实 caller 证实的新实现缺陷。测试判别力方面，主测试和相邻测试均有合法输入、反例和业务 oracle；少数测试为隔离单个 phase/guard 直接摆 typed BattleState 字段，已在测试注释中标明，不将这些 fixture 扩张为完整生产路径验收。未发现本片可直接证实的恒真或重复测试需要删除；未知的视觉/E2E、battle-opcodes 全文件、公式/status/queue/RNG 及 save/schema/migration 继续留在各自范围。

验证：定向 9 files / 242 tests passed；`pnpm --filter @type-pal/game typecheck` passed；测试无失败、跳过或 stderr。coverage ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户批次成本要求未运行，不能据此宣称统一质量门已通过。后续文档静态门只验证治理记录完整性，不替代这些高成本门。

高风险边界：本片触及第一阶段战斗生命周期、状态所有权和战后清理，但保持现有 canonical 行为；没有改 schema/save、公共 API、资产管线、生成物、UI 形态或用户可见战斗取舍。下一批继续选择不重叠的 pre-94 pending 文件，避开活跃任务和 94–102/editor。
