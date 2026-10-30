# GAME-BATTLE-ITEM-ROLE-CONTEXT-1 — 战斗使用物品的脚本角色上下文

Status: done
Owner: Codex
Phase: phase1
Capability: battle item / event interpreter role context
Coding Owner: Codex（治理树唯一写入Owner）
Reviewer: Codex（自身核读，不冒充第三方）
Visual Verification Timing: core-observed / browser与完整战斗未跑
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

补齐第一阶段战斗使用物品的目标角色传递。原盘大蒜84的39536脚本设置目标Extra毒抗30；当前真实物品函数未向通用解释器传eventObjectId，解释器警告后不写，物品仍扣除。

## 范围

已完成actions/item.ts的目标角色传递、event-system.ts必要8D投影刷新及item-poison-boundary直接真实反例。法术/投掷、Extra全角色清理、script pointer、扣物品政策、升级算法/随机、schema/save、二阶段和生成物不在本修复范围。

## 前提真值门

- 原SSS.MKF及实际parseItems：物品84可用/消耗，scriptOnUse39536；该两指令原字为0x17/17/22/30及end。全43503指令计数及这两条与现行all.json一致，未冒称完整重提取证明。
- SDLPal fight.c:4378–4392：UseItem向PAL_RunTriggerScript传选中party slot所对应role，all为0xFFFF；script.c:752–767以该role写Extra字段。
- 修复前performItem只给battleCtx的target；runScript只有opts.eventObjectId才seed通用raw角色，PlayerOpcode0x17没有上下文就warn并返回。真实battle-system两条调用都给普通getBattleRunScript，无自动转换。
- 正式初始化/投影/startBattle的typed私有状态[0,4]，role0对slot1/role4用实际大蒜/脚本：count1→0、目标毒抗0→0、Extra仍0，stderr明确无角色上下文。独立直接解释器提供eventObjectId4对照得到Extra30。

## 证据与停止线

[完整source指纹/命令/双流/producer](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-item-role-context.json)与其配对gzip。该观察不计正式Vitest红/绿；未实际完整打战斗、操作UI或执行原生SDLPal。

这是3w写入链核读的新caller缺陷，不证明非队员Extra残留可达；[原Extra卡](GAME-BATTLE-NONPARTY-EXTRA-CLEANUP-1.md)仍unknown，不借本卡改变其清理循环。原观察是修复前时点；本卡获准范围现已实现，额外整文件/Extra未知不由此解除。

## 设计与风险

最终将选中目标角色（含all哨兵）传给原解释器入口，已有battleCtx保持；不把caster当target，不重排脚本或消费时点。敌目标不伪造玩家role；两个生产路径共用该helper，动画相邻已实跑，未扩展fallback或完整UI信用。

合法影响域补核：原盘金蚕王150的39561为0x8D[1,0,0]。同一角色传递修正后，runtime已升至2但战斗投影仍1，正式同一例在补上下文后仍单红。SDLPal script.c:2591–2597调用global.c:2347–2409，同一SoA直接更新等级/属性而不回满当前HP/MP。故本卡必要白名单加event-system.ts现有battle raw刷新谓词的0x8D，不改升级算法、随机或HP/MP；复用原属性owner的刷新函数。该接线是已批准“效果落在所选队员”合同的必要闭环，不新增产品取舍。

## 验收条件

用户批准后先正式业务红例，选非连续party身份及不同caster/target验证实际Extra效果，核全体哨兵/既有handler影响与隔离。纯重构分提交，集中门按相关模块收尾，未知文件不强关。

## Build: 实现与自测

用户政策已批准，经验/成长完整check20434零诊断已结束。本切片build allowed仅item.ts角色上下文与item-poison-boundary直接测试；先写业务红例，核非连续party、真实role0与all哨兵。原观察stderr49字节是已证诊断，不冒称零诊断质量门。

正式旧实现四旧绿/四新增红：两个毒抗业务红、一个all参数运输红、一个真实runtime升级红，身份分开。只补目标后七绿/一个战斗投影等级业务红，原件保留；依上段必要三文件范围补现有0x8D刷新。旧统一门绑定补前源码；最终game整包TC/测试刷新受影响包，另六包未改按原件复用，最终官方覆盖率仍集中一次，不伪称再次完整check。

## Review: 审查与返工

直接观察与C/原盘域一致支持缺陷；完整UI/剧情未证明，不能把一次core观察当全部物品审查。item文件经全文八维登记review，3r/3s/3w仍partial。

## 用户验收

2026-10-22用户原话：“批准修复目标角色传递（推荐）”。已批准按选中目标传递上下文；先红例后修复，保留消费/脚本时序与其它范围。无需再次申请同一授权。

## 交接日志

- 2026-10-22 Codex：经验/3x冻结门运行期间只读追3w实际写入链，取得缺上下文/消耗但无毒抗效果的真实core观察。仅登记，未改本窗产品。

## 下一位Agent提示词

无下一位Agent，Codex单Owner。先读取用户裁决与实际原件；按已批准目标合同先红后绿，不把本卡当Extra全角色清理准入或完整动作模块接受。

## 最终源验收与限制

[逐文件A–H/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-item-role-context-review.json)含完整四阶段与缺import失败。四旧合同及其fixture/data守恒，四新身份唯一；289相邻、3724当前game TC/整包、单次official20040/758与同报告strict/protected零诊断。HP/MP仍是战斗live值，不因8D基础数值刷新回满。全check20434绑定本修复前，受影响game完整刷新；其余六包未改据证复用，不冒称第二次完整check。

功能窄卡技术done；item.ts与event-system整文件仍review，C返回script pointer等广域生命周期不附带接受。未新跑浏览器、完整fight或视觉。Coding Owner Codex，无下一位Agent，提交a52b7dc3a未包含其它产品取舍；完整主线同步/最终静态以集中回执为准。
