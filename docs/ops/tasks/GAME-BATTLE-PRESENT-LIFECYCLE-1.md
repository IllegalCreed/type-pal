# GAME-BATTLE-PRESENT-LIFECYCLE-1 — 战斗画面宿主生命周期

Status: done
Phase: phase1
Capability: CODE3l / battle presentation
Coding Owner: Codex
Reviewer: Codex（本人复核，不冒充第三方）
Generation Owner: N/A
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/code-quality-3y

## 目标与范围

入场渐变保存进入前画面；每场战斗独立拥有提示、飘字、入场和召唤缓存，退出时释放。只改 present-battle.ts、present.ts 的宿主接线和对应专测；动作规则的纯提取由父卡单独记录。不改战斗机制、存档、资源或第二阶段。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 入场先备份 gpScreen；新战清消息与数字 | reference/sdlpal/battle.c:685–735、1754–1783；video.c:1080–1140 |
| 第一阶段 | wrapper 先 clear，装配器才捕获；长期实例未接入退出清理 | packages/game/src/present/present.ts:795；present/battle/present-battle.ts:145；shell/bootstrap.ts:436、535 |
| 当前二阶段 | N/A，本任务不接触 Reforge | 范围限定 |
| 目标 | 先捕获后清屏；按 BattleState 身份隔离，退出释放，战中状态页暂停保留 | 真实 startBattle / finalizeBattleCleanup / presentBattleFrame 失败像素反例 |

替代解释已排除：直接 draw 的 P14 测试绕过 wrapper，不能证明宿主已保留入场图；提示/数字在同一场寿命正常不能证明下一场隔离。正式红例 hydrate runtime，敌队为五槽；三项均因像素业务断言失败，无 mock。快速换战的普通剧情可达性尚未证实，不将合成路径称作剧情复现。

用户裁决：2026-10-23 本会话 call_4cdcfa14fc0b4101ad44d4f0370bdf12，用户原话“批准两项修复（推荐）”。批准从进入前画面渐变到战场，以及每场独立提示/飘字/渐变缓存。前提 verified，Codex build allowed。

## 上下文与设计

- 父卡：[pre94复审](QUALITY-PRE94-RETROSPECTIVE-1.md)，沿用其3l全文八维读域；新增宿主边界按实际读域补证，不重授 battle-system 整文件。
- 项目依据：CLAUDE.md、docs/phase1/engineering-notes.md 的状态 ownership 与逻辑/渲染时钟；SDLPal 锚如上。
- 长期 BattlePresent 绑定当前 BattleState；同一战斗开状态页（mode=menu、battleState仍在）不是退出，不能丢缓存。新身份即使没有中间非战斗绘制也须隔离。
- 捕获旧屏与清屏由装配器按顺序负责；不引入模式布尔值，不把呈现状态塞入存档或核心机制。

## 验收条件

- 入场真实宿主红→绿，消息与飘字跨战清理，身份切换与模态暂停反例；既有 P13/P14/P15 合同保留。
- 逐文件 A–H、caller/primary/oracle、迁移/不变性与完整原件纳入父卡本窗证据；静态 error/warning/info=0。
- 相关切片齐备才集中 check / official coverage / 同报告 protected，未跑不报通过。
- 视觉/E2E：入口为实际 bootstrap 开战；核入场起点与渐变中段、结束再战无残留；像素单测不外推完整剧情视觉验收，实际结果后补。

## Build 与原件

基点 bd37e6d8faa72c16c84e301e80d827439cad0ca7；隔离树 /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal；主树只读。

修前原件暂存 /var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-pre94-battle-lifecycle-auulard6。lifecycle-red-hydrated 为正式三红：入场应19实0、消息应20实15、飘字应20实183。早期 no-files 与未hydrate试跑另留，不赋正式信用。冻结时复制完整原件并给只读复验入口。

## Review 与用户验收

Codex有限范围accept/done allowed。2026-10-24 CODE3l规则/生命周期收口：12项读域，8项整文件接受（7新关闭、1旧接受刷新），3个广域源与P13专测仅增量不升级。3l原七源合同接受，固定66accept/17partial/0pending；3410tracked/418closed/100review/2892pending。定向255、相邻1148；完整check 20572包例+700工具例、七包typecheck；唯一官方采集20143例/777源及同报告ratchet/strict protected通过，运行与硬静态0/0/0。规则提取与两项用户批准画面修复分提交；CLI并发上限2保留5秒与全部用例。修前/中断/超时/静态失败原件保留，不覆盖成通过。远端CI/合并另核，不扩94–102。

五项正式业务红→绿；浏览器已渲染世界帧经实际opcode7/bootstrap开战，首帧64000像素原样保留且随后渐变；浏览器0warning/0error。跨战残留由真实core/宿主像素反例覆盖，普通剧情快速换战可达性未知，未宣称自然剧情或整战E2E验收。实际回执及默认只读验收器见[本窗证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/README.md)。

## 交接日志

- 2026-10-24 Codex：范围获批、实施与上述有限验收完成；同一3y分提交，远端CI/合并按后续Git回执，不以本地done代替发布状态。

- 2026-10-23 Codex：真实宿主三红已留存，收到两项批准，单Owner开始实现；与纯规则提取分提交，统一窗口验证。

## 下一位 Agent 提示词

无，Codex继续本窗口，不扩94–102。
