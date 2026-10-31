# CODE3m status 只读复审与最小修复切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3m 战斗 status 生命周期切片（基点 e63bb2051，分支 codex/code-quality-3y）：只处理 status tick 与战后清理边界，不改变 status schema、存档格式、公共接口或第二阶段模型；3m 整卡保持 partial。证据原件为下方逐字节保全的固定main源；读域明细见同目录 read-boundaries.json（2 个全文读取 + 7 个部分区间）。

## 来源与输入

全文读取 status.ts（54 行：status 键集、计数递减、玩家/敌方归属、canAct/canCast 谓词）与 __tests__/status.test.ts（124 行：合法计数、零下限、敌方槽位 oracle）。部分区间：battle-state.ts 的 BattleStatus 形状/持久状态 seed/生命周期、battle-system.ts 的开战 status seed/消费/回合末 tick caller、battle-finalization.ts 全 67 行（战后清理与 <=999 状态、装备/毒清理归属）。primary 核对 global.h:38-56 status 枚举与 kStatusAll 基数、fight.c:1632-1661 玩家/敌方回合末递减、global.c:2280-2344 按 <=999 清理、battle.c:1820-1832 战后清理、script.c:1052-1102 复活路径，并对照 docs/phase1/game-mechanics.md 第一阶段状态/装备边界。来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

核心发现一个直接可证伪问题：TS tickStatusEffects 以 health > 0 过滤敌方槽位，而原版 SDLPal 在 0..wMaxEnemyIndex 上无 HP 条件地递减每个槽位的全部 status。先把原测试「死敌不 tick」的错误 oracle 改为 primary oracle，定向运行确认旧实现失败（1 failed / 6 passed），再删除 HP 过滤完成最小修复；死槽状态的计数器生命周期由 SDLPal 槽位遍历定义，不能用「当前无消费」替代机制真值。状态字段仍统一按计数器递减；>999 装备授予状态在回合中按 C 规则递减，战后清理仅清 <=999，装备效果由 removeEquipmentEffect 明确清除。文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

修复后 status、actions、battle-system、state-machine、battle-finalization、battle-state 六组定向共 308 passed，无测试 stderr；pnpm --filter @type-pal/game typecheck 通过。小批按用户成本规则未运行 coverage、official ratchet、protected fast 或全仓 pnpm check，不宣称统一质量门通过。

## 限制与复核

本片触碰第一阶段 battle core 高风险边界（状态生命周期），但变更由 SDLPal 直接循环和失败反例限定；未触碰产品取舍、存档格式、公共接口或生成物，未扩展到 schema/save 或第二阶段 grantedStatuses。公式、magic-damage、RNG 与统一质量门仍需独立证据，3m 整卡保持 partial。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2264B / SHA-256 f13dfd5e53eb87b2880ba8d4ddefb9cb1749cbc606fa02b7fba97e478ca96692；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3m status 只读复审与最小修复切片

基点：`e63bb2051`；分支：`codex/code-quality-3y`。本片只处理 3m battle status 生命周期；不改变 status schema、存档格式、公共接口或第二阶段模型。3m 整卡保持 `partial`。

完整读取 `status.ts` 与 `__tests__/status.test.ts`；读取 `battle-state.ts` 的 `BattleStatus`、持久状态 seed 与生命周期，`battle-system.ts` 的回合末 caller，`battle-finalization.ts` 的战后清理，以及 `game-mechanics.md` 的第一阶段状态/装备边界。SDLPal primary 核对 `global.h:38-56` 的 status 枚举、`fight.c:1632-1661` 的玩家/敌方回合末递减、`global.c:2280-2344` 的按 `<=999` 清理、`battle.c:1820-1832` 的战后清理和 `script.c:1052-1102` 的复活路径。

发现一个直接可证伪问题：TS `tickStatusEffects` 以 `health > 0` 过滤敌方槽位，原版在 `0..wMaxEnemyIndex` 上无 HP 条件地递减每个槽位的全部 status。先把原测试“死敌不 tick”改为 primary oracle，定向运行确认旧实现失败，再删除 HP 过滤完成最小修复。死槽状态虽然通常不参与当前行动，但其计数器生命周期仍由 SDLPal 的槽位遍历定义，不能用“当前无消费”替代机制真值。

状态字段仍按计数器统一递减；`>999` 装备授予状态在回合中同样按 C 规则递减，但战后清理仅清 `<=999`，并由 `removeEquipmentEffect` 负责装备效果的明确清除。复活和战后边界已有相邻 oracle，本片没有扩展到 schema/save 或第二阶段 `grantedStatuses`。

验证：先行反例 `status.test.ts` 为 `1 failed / 6 passed`；修复后 status、actions、battle-system、state-machine、battle-finalization、battle-state 六组定向共 `308 passed`，无测试 stderr；`pnpm --filter @type-pal/game typecheck` 通过。小批按用户成本规则未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`。

本片触碰第一阶段 battle core 高风险边界（状态生命周期），但变更由 SDLPal 直接循环和失败反例限定；未触碰产品取舍、存档格式、公共接口或生成物。未宣称 3m 整卡完成；公式、magic-damage、RNG 与统一质量门仍需独立证据。
```
<!-- incremental-original-source:end -->
