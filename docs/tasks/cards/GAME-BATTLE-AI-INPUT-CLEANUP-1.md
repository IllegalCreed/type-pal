# GAME-BATTLE-AI-INPUT-CLEANUP-1 — 敌方决策输入只保留生产目标表

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-05
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: N/A（内部输入合同整理）

## 目标

删除敌方行动决策仅供旧测试使用的预过滤目标池，统一使用当前生产传入的完整队伍/敌槽表。保持游戏中的目标选择、状态门与RNG调用顺序。

## 范围

`core/battle/enemy-ai.ts` 的 `alivePlayers`/`aliveEnemies` 与对应旧分支；完整 `party`/`enemySlots` 改为必传。同步唯一生产caller `battle-system.ts` 中对应装配与两测试文件的调用。当前已存在的64次重试上限、状态判断、空目标处理、普通动作和随机算法均不借此变更。不删除 `status` 或 `selfIdx`。

## 前提与证据

父批[QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md)。当前全文读取enemy-ai与主测，实际引用只有battle-system生产caller和enemy-ai.test/battle-state-machine旧专测。生产caller总是同时传party、enemySlots，alivePlayers/aliveEnemies因此在生产从不被读取；仍额外构造两份过滤数组。主测多数走旧池，confused拒绝例还使用三槽外selfIdx=9，不能代表生产合法输入。

SDLPal一手 `fight.c::PAL_BattleEnemySelectTargetIndex` / `PAL_BattleEnemySelectEnemyTargetIndex`（4489–4548）均在完整槽表拒绝采样。当前生产路径已这样做，旧分支仅为fixture保留且抽样方法不同。只读搜索和caller核读不等于新增产品bug；本项分类为已证无用接口与测试前提整改。新接口取舍批准前不删产品分支。

## 验收

核全仓引用和类型检查，旧测试逐合同迁到完整槽表；固定法术概率、目标拒绝抽样、sleep/paralyzed先选目标、confused自攻pass及silence仍掷骰。保持生产合法输入的决策/调用顺序，针对关键测试补有效业务反控；scoped与相邻测试零诊断。重型门随父批。

## 状态与交接

Codex已核前提、范围与单一Owner。内部导出函数输入形状变化按原API停止线待用户裁决；仅测试整理、注释和其它独立主体继续。历史TEST-GLM-GAME-BATTLE-STATE-1已归档done，不是活跃Owner；回合边界返工卡不在此白名单。

2026-11-05用户批准“清理旧路径并迁移测试”，Codex build allowed。删除两份预过滤池及分支，完整槽表改必传；生产装配删两份从未读取的过滤数组。主测迁到完整槽表，旧selfIdx=9非法前提改为有活着施法者的4槽；合并状态机文件的silence抽样合同到本模块，改精确调用顺序和完整动作结果。局部门及反控待本轮记录，不授统一门或视觉信用。

本轮定向4文件40绿、后继13文件102绿，stderr均空；game typecheck exit0/stdout/stderr空。silence短路反控恰1指定业务AssertionError，完整动作与先后方法序同时可判；来源字节恢复及捕获脚本引号勘误见父批唯一证据。删除旧分支是获批内部接口整理，不声称发现/修复了普通游戏AI行为错误。统一门与提交等父批。

当前文件层整改与逐维复核已完成；实际定向/反控/恢复身份以[父批唯一审查](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md)为准，早期“待跑”只记录当时阶段。统一门与交付尚未完成，随父批集中收口。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
