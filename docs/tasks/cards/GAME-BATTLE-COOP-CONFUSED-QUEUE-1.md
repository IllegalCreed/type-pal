# GAME-BATTLE-COOP-CONFUSED-QUEUE-1 — 合击后的混乱队员不得追加行动

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-05
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: core-functional（画面未验）

## 目标

修复合击之后，同回合的混乱队员仍追加普通攻击的问题。只修被吞行动重新选靶/出手，不扩大混乱或合击规则。

## 范围

父批 [QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md) 的回合边界专测。只涉及 battle-system.ts 的行动吞并与混乱解算先后；保留现有混乱可攻击敌友、合击健康参与者、伤害公式与存档合同。不以此调整其它状态、围攻或 SDLPal 差异。

## 前提与证据

- 原专测直接手填 fThisTurnCoop=true，只验后续正常队员，未执行合击生产者。其15绿不证明真实合击与混乱的接线。
- 新 battle-round-lifecycle.test.ts 经真实 startBattle/hydrate、0x2D 状态入口、合击菜单和 tickBattle。两位健康队员合击，第三位混乱；敌人睡眠隔离敌方伤害。三人的生命为 499/499/500，证明真实合击先执行且只向健康参与者扣费。
- 独立算式：两位贡献者各武术100/灵力0，合力50；敌防御10+(0+6)*4=34；无元素、随机倍率1，基础伤害46/4取整11，再加法术100，合击应仅扣111。实到 postAction 敌HP29742而非29889，多扣147。
- 根因：当前 fThisTurnCoop 先把动作设 pass，后面的 confused 分支再调用 resolveConfusedAttack 覆盖 pass 并消耗选靶随机数。SDLPal PAL_CLASSIC 的 fight.c:1731–1767 先解析混乱，PAL_BattlePlayerPerformAction 的 kBattleActionAttackMate（3760起）在 fThisTurnCoop 时直接 break；普通攻击等 case 也有此门，不执行后续伤害/抽样。
- 正式单红原件 turn-coop-real-predecessor-red（JSON、stdout、stderr、命令、输入SHA、exit1）在父批唯一仓外暂存目录，失败为指定敌HP业务 AssertionError，其余5例因 -t 未选择，不计通过。普通原盘剧情是否到达该组合尚未证明，真实菜单/状态/controller组合已证。

## 验收

消费上述红例，窄修吞并先后；核不产生额外伤害/攻击经验/选靶抽样，正常混乱与围攻不受影响。与合击、队列和状态相邻测试集中验证，重型门随父批。不得改伤害预期为当前错误输出、静音或跳过失败。

## 状态与交接

2026-11-05 Codex：此前只读取证并保留失败，回合原主体未升格。用户现批准“合击后吞掉后续混乱行动”；Codex build allowed且是唯一Coding Owner，按已证反例补齐零额外抽样断言再窄修，统一门随父批。

2026-11-05本地复核：只为confused分支加!fThisTurnCoop门；真实合击后的HP/EXP及随机trace精确核验，正式1红转绿；生产者同错反控旧绿新指定1业务红，源SHA恢复。完整A–H与原件指针见[父批回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#回合开发落点与资源宿主最后4个原主体)。统一门与集成随父批，未完成前保持review。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
