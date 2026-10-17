# GAME-BATTLE-NONPARTY-EXTRA-CLEANUP-1 — 非队员Extra战后清理可达性

Status: draft
Owner: Codex
Phase: phase1
Capability: battle / equipment effect lifecycle
Coding Owner: Codex（只读核证；无产品build allowed）
Reviewer: Codex（自身核读，不冒充独立第三方）
Visual Verification Timing: e2e-deferred（如后续证明实际场景并获产品准入）
Branch: codex/code-quality-3y

## 目标

核清战后Extra角色域的静态差异是否能由真实生产caller触发。当前只证C全角色/TS在队角色循环不同，尚无合法生产反例，不称已发现产品bug。

## 范围

只读battle-finalization、startBattle、setParty/updateAllEquipments、装备与脚本写入caller及必要原始数据。当前不修改这些产品执行、队伍/毒键、装备buff、schema/save、资产或公共接口；四文件测试治理另归父卡。新增产品方案须先证可达性并由用户裁决。

## 前提真值门

| 维度 | 当前证据与边界 |
|---|---|
| primary | reference/sdlpal/battle.c:1822–1830：ClearAllPlayerStatus后，对0..MAX_PLAYER_ROLES-1调用CurePoisonByLevel(3)/RemoveEquipmentEffect(Extra)。global.c:1567–1614的解毒函数会先role→party查找，离队role直接return，因此不能把Extra差异混成解毒角色域bug。 |
| 第一阶段 | battle-finalization.ts:47–51只遍历partyMembers清毒/Extra；battle-system.ts:280–285开战先updateAllEquipments；event-system.ts:4449–4464换队清毒并调refresh handler重建。equipment-state.ts:360–392清指定role/part字段。 |
| 二阶段 | N/A，第一阶段数值槽/回合约定不外推Reforge。 |
| 本卡目标 | 找真实写入非队员Extra且跨过重建、最终到cleanup的完整生产链；没有这条链则保持unknown，不造手搭反例、不改清理循环。 |

### 反证与替代解释

最强替代解释是开战和换队的全量装备重建已消除这类残留；单独给离队role手塞Extra再直调cleanup，不能证明真实可达。反证应包含正式输入/脚本入口、角色身份、写入时点、之后无重建、实际战斗出口和再次消费；若只出现于无owner fixture，则本前提不成立。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)与[本批证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3u-3w-finalization/README.md)。
- docs/phase1/game-mechanics.md:1529–1577为历史机制说明；“1:1等价”须按当前caller收窄，不能当已证明全域等价。
- CODE-QUALITY-53/79/90的毒/复活停止线不由本卡解除；只核Extra角色域。

## 验收条件

1. 先核所有Extra写入和开战/换队/战后脚本真实caller，使用合法typed输入和原始数据锚。
2. 可达则另定有限产品白名单、用户裁决、先精确失败反例后修；不可达须给完整不变量证明，不凭一次绿测关闭。
3. 语义、静态、runtime/视觉证据分别记录；不复用旧统一门作为当前结果。

## Draft: 设计与风险

没有设计选择批准；不能直接把party循环改成六角色循环。当前未知项是非队员Extra的真实写入路径和生命周期，技术核证无需让用户猜选项。

## Build: 实现与自测

产品执行未改。父卡本片只纠正清理注释的等价信用；两实现parsedTS/去注释JS相同。没有执行伪业务红例，也没有原版运行时或浏览器观察。

## Review: 审查与返工

静态差异成立，生产影响unknown；draft不等于产品build。没有恢复历史固定三签或冒充他席验收。

## 用户验收

尚无可交付的产品取舍；若前提被证实，再给具体场景与before→after请用户裁决。

## 交接日志

- 2026-10-18 Codex：实际核读cleanup、C战末/解毒、真实开战和换队重建路径，先登记unknown并冻结实现；父卡继续合法fixture、handoff时序和资源owner测试治理。

## 下一位Agent提示词

无下一位Agent提示词，Codex单Agent维护。先证生产可达性，不把手搭状态、循环字面差异或本卡draft当修复授权。
