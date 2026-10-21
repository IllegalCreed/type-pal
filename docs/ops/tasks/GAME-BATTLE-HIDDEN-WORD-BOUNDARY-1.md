# GAME-BATTLE-HIDDEN-WORD-BOUNDARY-1 — 隐藏成长的16位属性边界

Status: draft
Owner: Codex
Phase: phase1
Capability: battle / numeric boundary
Coding Owner: Codex（只读核证；无数值行为build allowed）
Generation Owner: N/A
Visual Verification Owner: N/A
Contributor: Codex
Template: task-card-v1 / 1.0.0
Reviewer: Codex（实际源码／原生证据核对，不冒充第三方）
Visual Verification Timing: N/A（当前仅边界数值；如改变显示差值另核）
Branch: codex/code-quality-3y

## 目标

解除pre94 CODE3x遗留的WORD极端域未知，并取得有证据支撑的第一阶段产品取舍。

## 范围

只核applyHiddenExpGrowth的七项基础属性累加及其成长差值；不把此卡扩展成所有引擎WORD转换治理，不改save格式、内容校验、资源、公共字段、二阶段或其它经验公式。

## 前提真值门

| 来源 | 已核事实与限制 |
|---|---|
| primary | common.h:144的WORD为unsigned short；global.h:297、299–336的PLAYERROLES属性行为WORD数组；battle.c CHECK_HIDDEN_EXP直接对该字段执行`+= RandomLong(1,2)`，之后按新旧字段差显示。 |
| 当前TS | PlayerRolesRuntime行为number[]；applyHiddenExpGrowth只累加，无16位转换；equipment-state有效武术getter也不回绕。主升级999 cap与此不同，本卡不改该cap。 |
| 输入与caller | 当前V1数值guard接受有限number；65535及隐藏exp15/level1可通过guard。探针采用真实DATA.MKF阈值（前3项0/15/40，末项32000），正式loadDefault/project/startBattle后的合法结算边界，经buildBattleWonSettlement进入成长函数。角色主等级99，不触发主升级的999cap；单次攻击的AttackCount1/HealthCount2，存留隐藏exp15使武术涨1。 |
| 已复现 | 原C真实WORD类型、PLAYERROLES完整结构及宏中实际复合赋值语句，用本机cc编译验证：65535+1→0，+2→1。TS同边界由65535涨至65536；指定业务AssertionError `65536 !== 0`，原始双流、实际执行元数据与输入／source SHA保留。 |
| 未声称 | 没有运行完整SDLPal、原盘剧情或浏览器导入；只证明当前V1允许的边界值和真实结算入口下的分歧，不说主线普通流程必然触发。自有测试夹具提供合法post-action／won边界，并非播放完整战斗。 |

原件当前由父卡结算／成长窗口保存；稳定导航随后接入该窗口证据。基点9a5f80e7c，产品当前只做type／依赖纯重构，其余JS已证明不变；这个分歧不是本轮新增。

## Draft: 设计与风险

这是已证边界分歧，尚未取得产品策略裁决，不直接改数值实现。可选择严格复制第一阶段SDLPal的16位回绕，或保留TS的持续增长并明确登记偏离；不能擅自改成封顶65535，也不能误用主升级999cap压隐藏成长。若选择回绕，须先核并测试成长提示使用的新旧差值，不能只改存储字段而保留错误提示。

## 验收条件

用户裁决后，另记窄build allowed、正式失败用例→实现→相邻回归。存档格式／导入guard不由此更改。当前所有行为修改冻结，3x仍partial；同模块纯结构与普通域测试可独立推进，不因本卡未知阻塞其它pre94卡。无下一位Agent提示词，Codex单Agent维护。

## 上下文锚点

[父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[当前模块证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/README.md)、CLAUDE.md、game-mechanics隐藏经验节；原始C类型／宏及当前fixture域见上表。二阶段N/A。不得恢复兼容路径或借此改变格式。

## 当前模式推进记录

Codex已核边界分歧，普通原盘剧情可达性未知；策略裁决pending，只读允许，数值build不允许，done不允许。单Agent，同一3y。

## Build: 实现与自测

无产品数值改动；当前只运行原生C字段更新与TS合法边界探针，后者恰一指定AssertionError。纯类型／依赖重构由父卡另授范围，不当本卡修复。完整SDLPal和视觉未跑。

## Review: 审查与返工

这是已证边界分歧，不把guard通过冒称完整导入／剧情重放；默认只读快检核原件／身份。用户决定策略后再核实施方案及有效红绿，现仍draft。

## 用户验收

已询问“严格回绕／保留持续增长并记录偏离”，回复尚未到达；不以等待时间当批准。

## 交接日志

- 2026-10-22 Codex：原生C更新得到0／1、TS正式结算边界得到65536，保留原件；暂停该数值选择，父卡继续独立纯结构和普通域测试。

## 下一位Agent提示词

无下一位Agent提示词，Codex单Agent维护；先读用户裁决，不从本卡draft或其它已批准修复扩大数值授权。
