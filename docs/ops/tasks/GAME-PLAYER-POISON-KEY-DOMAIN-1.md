# GAME-PLAYER-POISON-KEY-DOMAIN-1 — 玩家毒键域前提返工

Status: draft
Owner: Codex
Reviewer: Codex（待完整caller独立复核）
Phase: phase1
Capability: player poison ownership
Visual Verification Timing: e2e-deferred（仅在确认UI行为修复后登记可执行场景）

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

证据：[94前回溯](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)。无下一位Agent提示词，Codex后续核前提。
