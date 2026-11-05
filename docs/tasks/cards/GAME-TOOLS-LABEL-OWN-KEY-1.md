# GAME-TOOLS-LABEL-OWN-KEY-1 — 工具标签仅读取自有译文

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-04
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: dev-functional（DOM文字，不改布局）

## 目标

工具标签查译文时不把JavaScript继承属性当成文字；保留已定义标签翻译与未知标签原样回退。

## 范围

`packages/game/src/localization/ui-text.ts`及通过tools-panel-dom::sectionTitle的专测。仅lookup ownership，不改语言包、翻译文案、格式、存档和UI结构。

## 前提与证据

父批[QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md)，基点00e38451。当前ENGLISH_LABELS为普通object，`ENGLISH_LABELS[chinese] ?? chinese`接受原型成员；localize在英文时原样返回第二参数。正式DOM caller输入“constructor”时标签变成原生Object函数源码，而非原文字。该字符串是string签名允许的未知标签；尚未证明普通工具操作会产生此名称，不冒称现有玩家路径已受影响。

正式新专测 `localization/ui-text.test.ts`先核中文/已知英文/普通未知，再以同一sectionTitle入口核constructor；实现未改时恰1个业务AssertionError。原件在父批唯一仓外暂存 `~/.codex/quality-evidence/type-pal/pending-93-20261103/tools-label-own-key-red.*`，含执行身份、source SHA、当前尚未提交的唯一test source及完整raw；随父批收口保全。

Git归因：查询语句来自2026-10-22 `f029948de`，后续 `ae9e3226c`只增控制旋转文案，查询未变；本文件基点仍pending。本次是独立遗漏入口，并非该语句修复后回退。既有对话引用、商店、文本表、迁移合并和按键映射修复在当前代码中仍有自有属性守卫；它们没有修改本表，也不证明所有字典都安全。

## 验收

仅读自有译文，缺键沿现有原文字回退；同一正式反例转绿，当前tools-panel英语功能和语言隔离相邻验证。无新增ignore/弱化规则。整批结束再跑重型门；未重跑或未证明范围明确保留。

## 状态与交接

2026-11-03 Codex：已证明边界输出分叉，当前只取证。AGENTS要求新用户可见行为取舍交用户，待裁决；其它主体继续，不把pending强行关闭。

2026-11-04 Codex：用户批准“按已定义译文读取”，build allowed，Coding Owner仍为Codex。实现限定自有属性后沿用原回退，不改表内容，不新增名称黑名单或公共helper。原红例与工具英语/语言生命周期3文件10/10，显式default+JSON、stderr空，原件 `tools-label-own-key-green.*`；两改动TS文件scoped Biome 0诊断。全仓/coverage仍等父批，不提前提交合并。将字典输入域/所有权及重复根因扩查要求写入唯一长期质量规范。

本轮横向初筛范围为game/localization、game/tools中的动态索引，命中后读输入域及生产者，不给整文件八维信用：`messages`用Map存译文组；`layout`/`map-names`以number读布局/场景ID，不用未知文本键；`speedrun/store`读取持久化key时已有hasOwn守卫。速通`checkpointName`的Record查表仍是同形候选，其生产caller目前传固定CHECKPOINTS；自定义ID合同与普通界面可达性待核，未改动、未宣称安全。minimap的labelMap还需结合脚本目录生产者确认，不凭语法命中认定缺陷。父批其余字符串查表仍逐片跟进；本轮未做全仓模式清零。

当前文件层整改与逐维复核已完成；实际定向/反控/恢复身份以[父批唯一审查](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md)为准，早期“待跑”只记录当时阶段。统一门与交付尚未完成，随父批集中收口。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
