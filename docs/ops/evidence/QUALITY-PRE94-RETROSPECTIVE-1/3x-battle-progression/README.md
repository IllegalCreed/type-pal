# CODE3x battle progression 当前复审切片

基点：`8038fb167`；分支：`codex/code-quality-3y`。本片重新复审历史 3x 的战斗升级、隐藏经验和法术学习，不把历史 done、旧行数、旧测试数量或旧全仓门当作当前整卡验收。3x 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/core/battle/battle-progression.ts`（306 行）、`battle-progression.glm-next-wave.test.ts`（142 行）和 `__tests__/battle-levelup.test.ts`（303 行）。核对 `battle-settlement.ts` 的真实升级/屏序 caller（完整 246 行）与 `battle-system.ts` 的公开导出/settlement 边界；不把结算 owner 或 battle-system 全文件重复关闭。对照 SDLPal `reference/sdlpal/battle.c:991-1373`、`reference/sdlpal/global.c:2347-2409`，并结合 progression/levelup 的 runtime projection、装备有效值和隐藏经验池所有权。

核对轴包括活人经验 gate、主经验余数与满级扣除、主升级 RNG/stat cap/HP-MP 回满、隐藏池严格顺序与整数截断、隐藏池不套主升级 999 cap、隐藏涨点后的回满时机、法术等级门/去重/槽满和 snapshot 的 raw runtime 与有效装备值分离。当前实现与 primary/caller 一致，未发现能由直接证据证实的新实现 defect；没有修改数值、schema/save、公共接口、生成物、结算 UI 或用户可见行为。

测试判别力：定向 4 files / 207 tests 全绿；专属 progression/levelup 测试包含 >99 level、隐藏无 cap、多池 RNG 顺序、死队员、阈值/连升/满级、法术去重/等级门、runtime→battle projection 和主升级/隐藏经验回满反例。settlement 与主 battle-system 测试只作为相邻 caller/oracle，不扩张为本片新关闭；未发现本片可直接证实的恒真或重复合同。

验证：定向 `4 files / 207 tests passed`；本片未改产品实现，因此不重复运行 game typecheck。coverage ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户成本边界未运行。后续文档/lint/ledger 门只验证治理记录完整性，不替代这些高成本门。

2026-10-18 源区间勘误：旧上界越过实际EOF，现按[直接源码核对](../53-wave-gates/receipt-audit/anchor-corrections.json)更正；原read-boundaries字节在审计附件保留，不据此补签未运行的产品/全仓/coverage门。
