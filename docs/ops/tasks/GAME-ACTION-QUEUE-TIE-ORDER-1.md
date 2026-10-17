# GAME-ACTION-QUEUE-TIE-ORDER-1 — 第一阶段同速行动排序分叉

Status: review
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

完整核读turn-queue.ts和117行专测后，发现“严格小于才交换，所以稳定排序等价”的推论错误。SDLPal `PAL_BattleStartFrame` 的双循环交换会间接反转相同dex项；TS稳定sort保持它们的初始顺序。此差异触及第一阶段战斗先后，用户已于本轮批准对齐SDLPal；已完成先红后修本排序，当前等待统一门/视觉及整文件剩余域核验。RNG调用方未修改。

## 直接反例与caller

合法普通速度输入：敌0=30、敌1=30、玩家0=100，均非dualMove。真实公开`buildActionQueue`返回玩家0→敌0→敌1；原生编译的C排序段返回玩家0→敌1→敌0。C按原定义填13槽，空槽WORD0xffff在SHORT比较中为-1，未缩短队列来制造反例。

- primary：`reference/sdlpal/fight.c:1451-1585`，其中实际排序完整外层右括号在1585；`battle.h:158-166`与`palcommon.h:42,60`。
- 生产caller：`core/battle/battle-system.ts:711-768`，敌人jitter/dualMove二抽后，玩家倍率/jitter后调helper；正整数30/100属于该合同。
- 原件：[core-comment-audit/primary-counters.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/primary-counters.json)和完整C/TS程序、编译/运行raw。此证据是原C片段的最小上下文原生执行，**不是完整SDLPal或浏览器实跑**。

## 验收条件与剩余域

用户裁决（2026-10-18）：回复“批准对齐 SDLPal（推荐）”。不新增兼容模式，不改公共签名或caller RNG/抖动；C WORD/SHORT比较及空槽终止须先核清，再落有判别力反例。

批准后先落真实业务失败反例，再修最小队列排序；至少核两敌同速被快玩家置换、敌/玩家同速、dualMove同速及fIsSecond、空槽/SHORT域和实际battle-system caller。已有“全员同速稳定”用例只能证明该特殊输入，不能作为全域C等价oracle。WORD/SHORT极端域仍需另行核证，不因普通反例绿灯自动验收。

## 开工交接（c3d943dde历史）

2026-10-18 Codex：实际counter已核，旧实现与专测的已验证信用撤回review；用户随后批准窄修，待正式失败测试后实施；3m仍partial。父卡继续搜索注释/测试边界返工和其它pre94核验；全仓/coverage/protected未重跑，未合main。无下一位Agent提示词，Codex单Agent继续独立范围。

## 目标

恢复第一阶段合法行动队列与SDLPal同样的排序及消费先后，消除同速项被较快项交换后的分叉；以用户本轮授权为准，不恢复其它历史兼容实现。

## 范围

范围内为turn-queue.ts、其专测与必要真实battle caller反例；范围外为RNG、动作倍率、毒槽、schema/save、二阶段及公开入口签名。纯注释批次与行为修复分提交。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版/primary | 13槽、WORD dex、SHORT比较、双循环交换；消费遇wDexterity=0xffff结束（不是检查wIndex） | fight.c:1451-1608，battle.h:158-166，palcommon.h:42,60 |
| 第一阶段 | 真实caller先构造敌人再构造玩家；基点helper稳定sort，本次已按原C交换修复 | battle-system.ts:711-768、turn-queue.ts全文及原生片段对照 |
| 当前二阶段 | N/A：Reforge独立战斗设计，不借此修改 | 本卡范围 |
| 目标 | 用户已批准恢复SDL顺序；WORD/空槽边界需先核而不凭猜测扩展非法输入 | 用户2026-10-18裁决、primary-counters.json |

替代解释已排除：不是所有同速输入都分叉，全员同速可同序；现有这类用例不能推广为稳定性。正dex30/100和13空槽重放已复现；若原C相同片段/输入同序，counter应撤回。未改extractor或任何数据。主动偏离真值为no，before→after为稳定sort分叉→原C交换顺序；用户已批准，具体实现仍先反例。

## 上下文锚点

已读AGENTS/CLAUDE/工作流和phase1机制原则；本卡来自父卡pre94复审与3m证据counter。真实caller/原C/专测见前文；不以旧全绿、历史“未发现缺陷”或数组同速例认证C全域。

## 当前模式推进记录

进入build前：Codex单一Owner/3y隔离树；普通三项合法输入counter verified，用户产品裁决已批准。build allowed只含上述队列窄范围，正式先红后修与本切片C边界核证已完成，结果及剩余域以下方当前实施回执为准。实现与本切片自测已完成；进入done前的整文件剩余域复核、统一门与演出仍pending，done blocked。

## Draft: 设计与风险

复刻原排序/空槽比较，保持既有caller抽样与公开签名。风险为C有符号比较、未用槽、dualMove同速及非法数值域；按合法caller与一手类型区分，不为过门新增断言强转/ignore或更宽兼容策略。

## Build: 实现与自测

已落正式失败测试后修复turn-queue：保留13槽、SHORT比较双循环交换，按速度0xffff截取可执行前缀；原C对照、当前回归与六反控见本次实施回执。无资产生成。

## Review: 审查与返工

当前counter成立，原turn-queue两文件整文件闭合撤回。普通片段对照不是浏览器动作/E2E；统一check/coverage/protected按用户成本要求留大窗口，不把局部证据冒充done。

## 用户验收

产品方向已批准、真实battle caller回归已通过；集中演出验证仍待：普通战斗两同速敌/更快队员，检查行动动画先后与dualMove第二动标记，准备数据与入口在实现时固定，未执行不计通过。

## 交接日志

- 2026-10-18 Codex：源级及原生C片段反例成立，user批准对齐；先交搜索注释包，再在同一3y分支落队列红例与窄修，分提交。

## 下一位Agent提示词

无；Codex单Agent继续本卡，已有用户批准不重复询问。

## 2026-10-18 实施结果与交接（当前）

候选基点c3d943dde，产品方向为本轮用户原话“批准对齐 SDLPal（推荐）”。Coding Owner Codex，正式修前7条均指定业务AssertionError（无runtime error suite），随后才改生产。初版3条边界把高WORD速度放在队员侧，虽属C primitive输入但超当前TS玩家速度范围；不保留其生产caller信用。现改敌方WORD边界，最终精确spec对仅c3旧queue源码重放仍7红0绿，源finally恢复，不冒充整旧checkout实跑。普通错序三例/真实按键链在最初改生产前即已合法失败。

最终实现采用原C双循环交换，不用稳定sort；速度按WORD→SHORT比较，补齐13槽并以wDexterity=0xffff结束本轮，返回前缀供现有tick按长度消费。不是按wIndex结束，也不把所有负SHORT速度无条件删除（满13槽时可能没有空槽）。dualMove的fIsSecond按原两抽比较标记，同速时排序后可能先执行被标记条目。真实caller的两敌和一玩家seed5抖动31/31/94，按键选择后队列P0→E1→E0，RNG state1199730148。

专测6条静态oracle逐项匹配原生C片段输出，另1条走公开startBattle→真实Confirm→tickBattle；六变异各恰1业务AssertionError，源/spec恢复字节。9条旧专测保留断言，仅改两条过强稳定性标题；共用H工厂只更正“仅H01–H06”旧头注，未改fixture实现。2文件16定向及38文件942相邻绿零stderr；边界fixture修正后只重跑变化的7条，未重复不变935条。game typecheck零诊断；完整docs/lint/ledger/diff以[当前原始回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/queue-approved-fix/README.md)为准。

剩余：超过原3玩家/5敌容量、非整数/NaN/无穷、caller极端SHORT结果/浮点→WORD转换、缺省dex2既有近似均不据本片自动接受；未增加非法输入兼容/校验策略，也未改公开签名。新parity测试与H fixture登记review，队列源/旧测继续review，0新closed。用户观感/实际动作动画与统一check/official ratchet/protected fast未执行，任务review、done blocked。两条旧测试fullName勘误映射保存，baseline/退役payload本片均未改，身份门待大窗口实际核对。

下一步回pre94剩余8组注释与两UI差异核证；毒列表压缩保持只读。无需再次询问本卡已经批准的排序方向。
