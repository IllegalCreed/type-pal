# GAME-ACTION-QUEUE-TIE-ORDER-1 — 第一阶段同速行动排序分叉

Status: build
Phase: phase1
Capability: pre-94 CODE3m / battle action ordering
Coding Owner: Codex
Generation Owner: N/A
Visual Verification Owner: Codex
Contributor: Codex
Reviewer: Codex（源码/原生C片段反证；不冒充第三方）
Branch: codex/code-quality-3y
Visual Verification Timing: e2e-deferred

## 前提与停止线

完整核读turn-queue.ts和117行专测后，发现“严格小于才交换，所以稳定排序等价”的推论错误。SDLPal `PAL_BattleStartFrame` 的双循环交换会间接反转相同dex项；TS稳定sort保持它们的初始顺序。此差异触及第一阶段战斗先后，用户已于本轮批准对齐SDLPal；当前准入限先红后修本排序，尚未修改排序实现。RNG不在白名单。

## 直接反例与caller

合法普通速度输入：敌0=30、敌1=30、玩家0=100，均非dualMove。真实公开`buildActionQueue`返回玩家0→敌0→敌1；原生编译的C排序段返回玩家0→敌1→敌0。C按原定义填13槽，空槽WORD0xffff在SHORT比较中为-1，未缩短队列来制造反例。

- primary：`reference/sdlpal/fight.c:1451-1585`，其中实际排序完整外层右括号在1585；`battle.h:158-166`与`palcommon.h:42,60`。
- 生产caller：`core/battle/battle-system.ts:711-768`，敌人jitter/dualMove二抽后，玩家倍率/jitter后调helper；正整数30/100属于该合同。
- 原件：[core-comment-audit/primary-counters.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/primary-counters.json)和完整C/TS程序、编译/运行raw。此证据是原C片段的最小上下文原生执行，**不是完整SDLPal或浏览器实跑**。

## 未决与验收条件

用户裁决（2026-10-18）：回复“批准对齐 SDLPal（推荐）”。不新增兼容模式，不改公共签名或caller RNG/抖动；C WORD/SHORT比较及空槽终止须先核清，再落有判别力反例。

批准后先落真实业务失败反例，再修最小队列排序；至少核两敌同速被快玩家置换、敌/玩家同速、dualMove同速及fIsSecond、空槽/SHORT域和实际battle-system caller。已有“全员同速稳定”用例只能证明该特殊输入，不能作为全域C等价oracle。WORD/SHORT极端域仍需另行核证，不因普通反例绿灯自动验收。

## 当前交接

2026-10-18 Codex：实际counter已核，旧实现与专测的已验证信用撤回review；用户随后批准窄修，待正式失败测试后实施；3m仍partial。父卡继续搜索注释/测试边界返工和其它pre94核验；全仓/coverage/protected未重跑，未合main。无下一位Agent提示词，Codex单Agent继续独立范围。

## 目标

恢复第一阶段合法行动队列与SDLPal同样的排序及消费先后，消除同速项被较快项交换后的分叉；以用户本轮授权为准，不恢复其它历史兼容实现。

## 范围

范围内为turn-queue.ts、其专测与必要真实battle caller反例；范围外为RNG、动作倍率、毒槽、schema/save、二阶段及公开入口签名。纯注释批次与行为修复分提交。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版/primary | 13槽、WORD dex、SHORT比较、双循环交换；消费遇wDexterity=0xffff结束（不是检查wIndex） | fight.c:1451-1608，battle.h:158-166，palcommon.h:42,60 |
| 第一阶段 | 真实caller先构造敌人再构造玩家，helper目前稳定sort | battle-system.ts:711-768、turn-queue.ts全文及原生片段对照 |
| 当前二阶段 | N/A：Reforge独立战斗设计，不借此修改 | 本卡范围 |
| 目标 | 用户已批准恢复SDL顺序；WORD/空槽边界需先核而不凭猜测扩展非法输入 | 用户2026-10-18裁决、primary-counters.json |

替代解释已排除：不是所有同速输入都分叉，全员同速可同序；现有这类用例不能推广为稳定性。正dex30/100和13空槽重放已复现；若原C相同片段/输入同序，counter应撤回。未改extractor或任何数据。主动偏离真值为no，before→after为稳定sort分叉→原C交换顺序；用户已批准，具体实现仍先反例。

## 上下文锚点

已读AGENTS/CLAUDE/工作流和phase1机制原则；本卡来自父卡pre94复审与3m证据counter。真实caller/原C/专测见前文；不以旧全绿、历史“未发现缺陷”或数组同速例认证C全域。

## 当前模式推进记录

进入build前：Codex单一Owner/3y隔离树；普通三项合法输入counter verified，用户产品裁决已批准。build allowed只含上述队列窄范围，正式先红后修和C边界核证仍须完成。进入done前：实现、自测、独立整文件复核、统一门与演出均pending，done blocked。

## Draft: 设计与风险

复刻原排序/空槽比较，保持既有caller抽样与公开签名。风险为C有符号比较、未用槽、dualMove同速及非法数值域；按合法caller与一手类型区分，不为过门新增断言强转/ignore或更宽兼容策略。

## Build: 实现与自测

当前尚未改生产排序。原生片段对照已执行并保存完整raw；正式失败测试、最小修复和恢复回归留后续独立行为提交。无资产生成。

## Review: 审查与返工

当前counter成立，原turn-queue两文件整文件闭合撤回。普通片段对照不是浏览器动作/E2E；统一check/coverage/protected按用户成本要求留大窗口，不把局部证据冒充done。

## 用户验收

产品方向已批准；完成后仍须真实battle caller回归及集中演出验证：普通战斗两同速敌/更快队员，检查行动动画先后与dualMove第二动标记，准备数据与入口在实现时固定，未执行不计通过。

## 交接日志

- 2026-10-18 Codex：源级及原生C片段反例成立，user批准对齐；先交搜索注释包，再在同一3y分支落队列红例与窄修，分提交。

## 下一位Agent提示词

无；Codex单Agent继续本卡，已有用户批准不重复询问。
