# GAME-SAVE-EXPERIENCE-DOMAIN-1 — 导入经验余数与结算终止性

Status: done
Owner: Codex
Phase: phase1
Capability: save input / battle progression liveness
Coding Owner: Codex（同一治理树唯一写入Owner）
Reviewer: Codex（自身源码与原件核证，不冒充第三方）
Visual Verification Timing: 当前为Node真实内存Save及core观察；未授浏览器/IDB/剧情验收
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

解决V1导入接受极大有限经验余数后，正式胜利结算不能终止的跨边界问题。该余数与本场获得的经验、角色武术/体力等属性分别管理，不改用户已批准的隐藏属性持续增长决定。

## 范围

本次build仅core/save/v1.ts的八组经验余数输入守卫与tools/save-io.test.ts直接导入反例。输入必须为0..65535整数；坏输入在写槽前报错，原槽位和metadata保持。V1格式/DB版本、迁移、其它数值政策、结算RNG、奖励和第二阶段保持原合同。

## 前提真值门

当前V1的wExp只用finite-number守卫。真实parseImportedSave→进程独有的内存Save/saveSlot/loadSlot接受Number.MAX_VALUE；bootstrap正式load直接Object.assign，未归一经验。实际default/hydrate→projection→startBattle后仍保留该余数，hidden计数按真实开战清零。正常WORD65535在真实DATA阈值32000下，主/隐藏两对照均小于1ms得到余数1535；极大数两例在模块初始化完成并ready后运行1s仍无完成结果，父进程请求终止整个私有进程组。

同一数值满足MAX_VALUE-32000===MAX_VALUE，99级循环的阈值/级别不变，递减不能推进。隐藏观察只提供真实一次普攻的Health2/Attack1胜利边界，不冒称打完整场。没有访问用户IndexedDB或修改产品。

SDLPal global.h:475–493的EXPERIENCE.wExp是WORD；当前合法历史样本均在该域。但本项目V1是JSON接口，原导入卡明确“不借原版名义补政策”，不能仅凭C字段擅自新增JSON整数/上限政策。用户此前批准完整内容校验与类型分离；新的数值域仍须明确，不能把“任何finite”自动解释为WORD。

## 设计与风险

用户已明确选择只对已保存的八池经验余数采用0..65535整数合同，在写槽前拒绝异常值；合法旧V1保留，不改变本场经验奖励或已批准的属性持续增长。守卫留在V1模块内部并复用既有八池行布局，不扩展通用number政策或公共出口。

## 上下文锚点

[父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[原导入批准与合同](GAME-SAVE-IMPORT-PAYLOAD-VALIDATION-1.md)、[源码/完整观察原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-progression-input/README.md)。旧CODE59形状/有限值证据保留，但其当前接受与v1.ts整文件关闭信用按新真实caller反证暂撤；3x原本partial，继续保持。

## 验收条件

政策确定后先保留正式业务失败反例，再修与相邻回归。至少观察合法端点/历史V1保留、八池各角色输入守卫、错误先于Save写入且原槽/metadata不变；不得通过旧强转、循环上限截断或默默修改数值掩盖问题。统一门留多卡窗口收尾，当前不重跑全仓/coverage。

## Build: 实现与自测

正式两例先运行旧守卫：28绿1指定业务测试红，八组坏数被接受并覆盖原槽。私有experienceRemainder接既有八池行后，六文件66定向/相邻及game typecheck、四文件局部Biome均零诊断。整数端点0/65535原样保留，属性65536未受限制。原结构/历史/声明合同复用，不恢复旧fallback。

四个子进程旧观察仍包括两对照完成与两非终止，outer exit0不是通过的质量门。原件保留ready、无done、after-ready计时、实际退出与终止请求；正式红/绿另见当前回执。完整check20434、当前game刷新3724、单次official20040/758与strict/protected源门均零诊断，最终文档静态见集中回执。CODE59/v1按已批准合同恢复接受。

## Review: 审查与返工

输入反证已修；当前五文件A–H、完整原件与只读快检在同一证据目录review.json。正常原盘剧情自然产生Number.MAX_VALUE未证明；本次没有新跑完整SDLPal/浏览器FileReader/实际IDB或演出。59/v1原合同恢复接受，3w Extra未知不由此解除；不主动迁移/归一已损坏旧槽位或手工修改的运行态。

## 用户验收

2026-10-22用户原话：“按 WORD 范围拒绝异常余数（推荐）”。对应问题明确0～65,535整数、异常报错并保留原槽位；不限制本场经验奖励，不改变属性持续增长。Codex据此核准本卡有限范围build allowed，无需再次申请同一授权。

## 交接日志

- 2026-10-22 Codex：3x余项核读中取得真实输入→槽位→开战→结算非终止观察。源码31c9775ce未改，CODE59与v1.ts暂撤当前接受，3x仍partial。其它pre94范围继续，不扩94–102。
- 2026-10-22 Codex：收到上述数值政策裁决，进入两文件有限build。先保存正式业务红例，再改守卫与相邻回归；统一重门仍留多卡模块收尾。

## 下一位Agent提示词

无下一位Agent，Codex单Owner。按本卡明确批准的八池经验余数合同完成先红后绿；不扩展其它数值政策，不把旧观察的outer exit0计成通过门。

2026-10-22最终源交接：守卫/两例提交0016e1a15；纯成长整理e0b1e0439，获批物品上下文a52b7dc3a另提交。源门完整零诊断及当前计数见同目录gates.json；最终文档静态/推送/main/远端CI由实际回执补记，无下一位Agent，继续pre94剩余24partial。
