# CODE3v battle actions 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3v 基础战斗 action（attack/attack-mate/defend/flee）的当前复审切片（基点 f412c7dce，分支 codex/code-quality-3y）：重新复审不把历史 done、旧测试数量或旧全仓门当作当前整卡验收；原始切片 3v 提升 partial、未标 accept/done。页首两条更新不改写下方历史时点：2026-10-22 四 action+两专测八维返工全门收口、3v 原合同已接受（见后继片）；2026-10-18 attack 注释 counter 把原整文件关闭信用转 review。证据原件为下方逐字节保全的固定main源；读域明细见同目录 read-boundaries.json（6 全文+10 区间，含逃跑抵抗区间 808-855 到 933-945 勘正）。

## 来源与输入

完整读取 4 个实现文件：attack.ts（614 行）、attack-mate.ts（111 行）、defend.ts（20 行）、flee.ts（81 行）；完整读取专属 attack-mate.test.ts（148 行七例）与 attack.glm-next-wave.test.ts（64 行 battleEffectIndex 平查/缺表负控）。读取 actions.test.ts 的基础 attack/混乱敌攻/defend/flee 相关段（218-520、920-1120，整文件不在本片关闭）及 battle animation/formula 相邻 oracle 区间。生产 caller 核对 battle-system.ts 的 performBattleAction、目标重选、行动前合法性/降级链和 mode.ts 战斗分派；动画所有权留在 anim-timeline/battle-anim-driver，不在 action 中重复实现。primary 核对 fight.c:3618-3854,4110-4172,4591-4654,4910-5175、battle.c:1397-1528、battle.h:49-68，并对照 game-mechanics.md 已批准的敌方逃跑抵抗修复（使用敌吉运而非 SDLPal 原始误用的身法）。当前逐文件与完整原件见[README.md](../game-actions-mobile/README.md)；注释 counter 见[README.md](../core-comment-audit/runtime-projection-comments/README.md)。

## 断言与业务 oracle

原始切片结论：未发现能由 primary source+真实 caller 证实的新实现 direct defect；performFlee 的敌吉运字段是第一阶段文档中已由用户批准的行为取舍，保留、不回改 SDLPal 原始 bug。核对轴包括玩家/敌人物攻 SHORT 与等级项、群攻命中顺序和 division、DualAttack/暴击/RNG、混乱攻友/无目标 Pass、Defend ownership、敌方自动防御/cover/protect/毒物脚本、Flee boss/RNG/失败经验/动画以及 timeline/CommandBus 与 HP 写回顺序。测试判别力：专属测试有合法目标、死亡/空目标、边界、RNG、动画资源缺失、cover/auto-defend、boss/装备和失败反例；actions.test.ts 只作相关段相邻 oracle，不计入本片逐文件关闭；未发现可证实的恒真或跨文件重复用例。2026-10-18 counter：全文补审发现 attack 的投影/状态/生命周期说明与实际 caller 不符，原整文件关闭信用转 review，仅事实错注已修、执行代码不变。文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原始切片验证：定向 6 files / 154 tests passed；本片未改产品实现，因此不重复运行 game typecheck；覆盖率 ratchet、protected fast、全仓 pnpm check 和官方 coverage 按用户成本边界未运行。后续文档/lint/ledger 门只验证治理记录完整性，不替代这些高成本门。2026-10-22 后继：四 action+两专测八维/结构与测试返工、全门收口，3v 原合同已接受；大 actions/host 仍未整文件接受。

## 限制与复核

原始切片保留风险：动作主测试整文件、完整 animation/formula 轴、battle-opcodes/magic/item/throw/coop、视觉/E2E 和统一覆盖率门不在本片关闭；未知项继续由各自卡与后续模块批次处理。本片无实现改动、无行为修复、无 schema/save、公共 API、资产管线、生成物或 UI 改动。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3514B / SHA-256 24449ee3ce79e18f2377fb69365b0ba85678ddd83b8cc42c5040b566e527ee18；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3v battle actions 当前复审切片

> 2026-10-22当前：原四action+两专测八维/结构与测试返工、全门收口，3v原合同已接受；[当前逐文件与完整原件](../game-actions-mobile/README.md)。下方为原只读/注释counter时点，保留其partial与旧门未跑记录，不覆盖当前决定；大actions/host仍未整文件接受。

> 2026-10-18 当前注释counter：本轮全文补审发现attack的投影、状态或生命周期说明与实际caller不符；原整文件关闭信用转review。原有限数值结果不据此否定，也不扩成“全部注释/测试合法/全生命周期等价”。仅事实错注已修、执行代码不变；详见[投影/宿主返工](../core-comment-audit/runtime-projection-comments/README.md)。

基点：`f412c7dce`；分支：`codex/code-quality-3y`。本片重新复审历史 3v 的基础战斗 action，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。3v 当前复审提升为 `partial`，未标 accept/done。

完整读取 4 个实现文件：`packages/game/src/core/battle/actions/attack.ts`（614 行）、`attack-mate.ts`（111 行）、`defend.ts`（20 行）和 `flee.ts`（81 行）。完整读取专属 `attack-mate.test.ts`（148 行）与 `actions/attack.glm-next-wave.test.ts`（64 行）；读取 `actions.test.ts` 的基础 attack / confused-enemy / defend / flee 相关段（218–520、920–1120），以及 battle animation/formula 相邻 oracle 的直接区间。生产 caller 核对 `battle-system.ts` 的 `performBattleAction`、目标重选、行动前合法性/降级链和 `mode.ts` 战斗分派；动画所有权留在 `anim-timeline.ts` / `battle-anim-driver.ts`，不在 action 中重复实现。

primary source 核对 `reference/sdlpal/fight.c:3618-3854,4110-4172,4591-4654,4910-5175`、`battle.c:1397-1528`、`battle.h:49-68`，并对照 `docs/phase1/game-mechanics.md` 已批准的敌方逃跑抵抗修复（使用敌吉运而非 SDLPal 原始误用的身法）。核对轴包括玩家/敌人物攻 SHORT 与等级项、群攻命中顺序和 division、DualAttack/暴击/RNG、混乱攻友/无目标 Pass、Defend ownership、敌方自动防御/cover/protect/毒物脚本、Flee boss/RNG/失败经验/动画以及 timeline/CommandBus 与 HP 写回顺序。

未发现能由 primary source + 真实 caller 证实的新实现 direct defect。`performFlee` 的敌吉运字段是第一阶段文档中已由用户批准的行为取舍，保留，不回改 SDLPal 原始 bug。测试判别力核验：定向 6 files / 154 tests 全绿；专属测试有合法目标、死亡/空目标、边界、RNG、动画资源缺失、cover/auto-defend、boss/装备和失败反例。`actions.test.ts` 只作为相关段相邻 oracle，不计入本片逐文件关闭；未发现本片可直接证实的恒真或跨文件重复用例。

本片无实现改动、无行为修复、无 schema/save、公共 API、资产管线、生成物或 UI 改动。保留风险：动作主测试整文件、完整 animation/formula 轴、battle-opcodes/magic/item/throw/coop、视觉/E2E 和统一覆盖率门不在本片关闭；未知项继续由各自卡与后续模块批次处理。

验证：定向 6 files / 154 tests passed；本片未改产品实现，因此不重复运行 game typecheck；覆盖率 ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户成本边界未运行。后续文档/lint/ledger 门只验证治理记录完整性，不替代这些高成本门。
```
<!-- incremental-original-source:end -->
