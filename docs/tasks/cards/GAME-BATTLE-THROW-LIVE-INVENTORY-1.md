# GAME-BATTLE-THROW-LIVE-INVENTORY-1 — 投掷脚本后的库存归属

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: N/A（库存数值，不改布局或动画）

## 目标

修复已复现的投掷消耗漏扣：投掷前库存为1，合法投掷脚本删除后补回2，当前返回仍2；按SDLPal脚本结束后按物品ID查当前库存再扣，应该剩1。普通原盘剧情是否出现此脚本组合未证，不声称玩家已经遇到。

## 范围

仅 `packages/game/src/core/battle/actions/throw-item.ts` 的脚本后库存读取及其专测。保留普通最后一次投掷的count0行、目标/脚本续点、动画、格式和存档；不借本项删除敌人投掷参数等接口。

## 前提与证据

父批[QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md)，基点00e38451b4594512c9236d5e214eb47d2cdf6e89，单一Owner。真实caller为battle-system的throw-item分支；执行前库存检查不阻止随后脚本重建数组。现实现持有脚本前entry，之后对旧对象count--。

一手：`reference/sdlpal/fight.c`的kBattleActionThrowItem（4332–4376）先PAL_RunTriggerScript再PAL_AddItemToInventory；`global.c::PAL_AddItemToInventory`（1063–1177）调用时按ID查库存。`event-system`的0x20删除和giveItem追加均走当前inventory owner。先例[GAME-BATTLE-ITEM-LIVE-INVENTORY-1](GAME-BATTLE-ITEM-LIVE-INVENTORY-1.md)只批准使用物品的item.ts，不自动授权本投掷行为。

正式反例已加入现用throw-item.test.ts：真实loadDefaultGame→startBattle夹具、合法可投掷物品、真实runScript，0x20移除1再giveItem补2。旧6例绿，新增恰1个业务AssertionError（实际2/期望1），不是类型/装载失败。原件暂存父批唯一仓外目录 `~/.codex/quality-evidence/type-pal/pending-93-20261103/throw-live-inventory-red.*`，包括base、输入SHA、补丁、default完整stdout/stderr与JSON；随父批集中保全，不另造副本。

## 验收

若获准，脚本后重查同ID且count>0才扣，保持普通count0表示；同一正式失败身份先红后绿，补普通最后一个/脚本消耗完边界并核相邻item合同。测试质量整改与机制修复分提交。重型门随父批，不为本项提前跑覆盖率。

## 状态与交接

2026-11-03：只取证和添加正式失败回归，产品实现未改。第一阶段机制行为取舍按AGENTS停止线待用户；本卡不授产品build，不影响其它无冲突主体继续。

2026-11-03 用户明确批准投掷脚本后读取当前库存。Codex build allowed，范围如上；复用已冻结正式1红。实现重查当前同ID条目且count>0才扣；未触及动画/续点/存档。定向和相邻结果待实跑记录。

本轮补记：原正式1红后绿色，旧entry复活变异恰1红且字节恢复；新7身份包括原缺条目与零数分别拒绝、脚本删除重建/脚本耗尽。伤害/挥臂/蓝字旧3执行合为真实tick到最终精确蓝字，不弱化消费入口。逐文件八维及映射写回父批；最终7身份相关恢复仍待本片最后改动后运行，统一门/提交未完成。

当前文件层整改与逐维复核已完成；实际定向/反控/恢复身份以[父批唯一审查](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md)为准，早期“待跑”只记录当时阶段。统一门与交付尚未完成，随父批集中收口。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
