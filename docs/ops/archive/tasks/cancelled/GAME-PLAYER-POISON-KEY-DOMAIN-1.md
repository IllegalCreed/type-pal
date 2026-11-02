# GAME-PLAYER-POISON-KEY-DOMAIN-1 — 玩家毒键域前提返工

Status: cancelled
Owner: Codex
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留这张玩家毒键域前提返工卡的取消原因和接替边界；不重复启动CODE53已接管的工作。

## 范围

原卡属于phase1玩家毒表的role/party-slot入口与生命周期，明确不扩展至二阶段origin/schema、存档迁移或新的产品实现。

## 前提与证据

原卡基于f0cf0f7f主线系观察；统一3y后，139行helper已有partySlotForRole/indexOf与离队guard，因此取消此重复入口。原卡同时保留SDL原版锚与TS旧caller观察，二者属于各自时点，不用旧role键段落描述合并树当前实现。

## 验收

本页治理核取消归属与历史边界，未复跑毒表、战斗tick、状态页或视觉。取消不等于候选accept，旧probe事实和强替代解释保留在原文。

## 状态与交接

终态仍cancelled；端到端caller、队伍生命周期及视觉的后继裁决回[CODE53](../../../tasks/CODE-QUALITY-53-player-status-runtime-zero.md)。无本卡产品build授权。

## 历史范围

卡内Owner为Codex，Reviewer原标待完整caller独立复核；原始phase1身份与取消日期不改写成当前测试通过。

## 原始结论

统一接回旧3y的CODE53候选，取消重复卡；原先“完全等价”的证据不足与完整跨域核读义务没有因取消自动闭合。

## 当时证据

原卡列global.c施/解/查毒、uigame.c状态页、旧TS生产caller与合法party[2,0] probe；原件入口是[94前回溯](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)。本次保全这些引用，没有重新认证其执行。

## 当前有效性

当前仅有效于历史任务归属；不凭原卡旧基点认定今天TS的键域，也不将用户既有取舍外推成未知schema/save变更授权。

## 继任文档

CODE53是原卡明确接替入口。若该卡的原验收或当时反例变化，应在其唯一事实源裁定；本页不新增平行产品状态。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2889B / SHA-256 bb31071760398d043e4188297a05c9b4c3a36f62e09884eb769c8f805918eadb；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-PLAYER-POISON-KEY-DOMAIN-1 — 玩家毒键域前提返工

Status: cancelled
Owner: Codex
Reviewer: Codex（待完整caller独立复核）
Phase: phase1
Capability: player poison ownership
Visual Verification Timing: e2e-deferred（仅在确认UI行为修复后登记可执行场景）

## 统一3y候选后的归属更正

本卡基于f0cf0f7f主线系观察；旧3y已有CODE53的party-slot候选，现已统一接回。139行helper全文核实存在partySlotForRole/indexOf和离队guard。为避免重复开工，本卡取消并由[CODE53](../../../tasks/CODE-QUALITY-53-player-status-runtime-zero.md)继续核端到端与视觉；取消不代表候选已accept，不修改旧probe事实。

## 一句话前提与停线

当前TS毒表使用roleId键，SDL使用party-slot；旧3o“完全等价”声称证据不足。先核端到端调用/生命周期，不能直接替换键或迁移存档。本卡没有产品build allowed。用户此前选择“保留真实0、按队伍位置对齐SDLPal”，战斗调试禁止入/离队；授权历史保留，不再重复问同一选择，但尚未核实的跨域影响不能靠旧批准代替。

| 维度 | 事实/直接依据 |
|---|---|
| Primary | global.c:1487-1502 add、1540-1558 cure-kind、1589-1618 cure-level先找rgParty[index].wPlayerRole；uigame.c:1245-1253按iCurrent显示毒。 |
| 第一阶段 | player-poison-state.ts全文role键；battle-system.ts:3030-3040按player.roleId读取；draw-player-status.ts:380-396按roleId显示；合法party[2,0]→role2施毒得0_2，见回溯probe。 |
| 二阶段 | N/A，禁止把phase1键域搬到Reforge；二阶段状态origin/schema不在本卡。 |
| 目标 | 暂只撤回“SDL等价”关闭结论；后续完整核操作/队伍改变/读档重建/装备授毒与战斗tick后给最小修复候选。 |

最强替代解释：TS有意以role作为canonical以让毒跟随人，所有TS入口自洽，队伍重建会清毒、读档也清毒；单个键值差异不等于玩家可见错毒。必须直接核每个生产入口与状态消费，再证明真实行为差异，不能只改helper。event-system.ts:4447-4465重建队伍时清毒，bootstrap.ts:1685-1700读档清毒；两者为已读caller段，不等于整个文件审查。

## 下一步与禁止项

先全文读相关实现并列完整key读写清单，核队伍加入/离开/重排与战斗期间约束、旧存档实际输入、equipment脚本、真实状态页caller。构造合法非[0,1,2]队伍与施毒→入战→tick/清理oracle。只有事实与产品目标一致且无需新取舍时才记build allowed；涉及新schema/save/迁移/产品取舍继续停线，不主动恢复兼容代码。当前未改实现、不迁存档、不删测试、不标done。

证据：[94前回溯](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)。无下一位Agent提示词，Codex后续核前提。
```
<!-- incremental-original-source:end -->
