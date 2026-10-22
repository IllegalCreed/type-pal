# GAME-BATTLE-POSTSCRIPT-PLAYER-STATE-1 — 战后脚本角色状态归属

Status: done
Phase: phase1
Capability: battle / post-battle player state ownership
Owner: Codex
Coding Owner: Codex（用户2026-10-22批准，以下窄范围build allowed）
Generation Owner: N/A
Reviewer: Codex（自身核证，不冒充第三方）
Visual Verification Owner: Codex
Visual Verification Timing: core-observed / 浏览器与普通剧情未跑
Contributor: Codex
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

核清并修复战后脚本的HP/MP写入与最终结算状态Owner。当前已证可被V1接受的改动存档让真实战斗结束后的治疗丢失；正常原盘剧情可达性未证。用户2026-10-22已批准保留脚本的体力／真气效果，再执行现有半恢复。

## 范围

实现白名单为battle-settlement.ts的Phase E角色视图/结算接线，以及battle-settlement.glm-next-wave.test.ts的直接反例；其余runner、操作码、存档入口、C/原盘片段只读。不修改战中动作、掉落/对话顺序、毒规则、装备常驻、schema/save、资产或公共接口。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary | 原SSS39554为0x1B[1,300,0]；SDL脚本治疗和半恢复写同一SoA。 | script.c:867–892；global.c:1254–1330；battle.c:1334–1372；[原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/post-player-context.json) |
| 第一阶段 | post caller不给playerRoles；补该参数后仍只改战斗投影，finishBattleWon读取旧runtime。 | battle-settlement.ts:runBattleWonPostScripts/finishBattleWon；battle-opcodes.ts:1027–1080 |
| 当前二阶段 | N/A，本卡仅第一阶段。 | CLAUDE.md阶段路由 |
| 本任务目标 | 先确定上下文和HP/MP唯一写入Owner，效果在后续脚本及半恢复保留；不能只补一个参数。 | 两个真实core观察与C O0/O2片段 |

### 反证与替代解释

原盘十个战后入口只有掉落/叙述/概率，可能普通剧情从不执行治疗。当前反证故意改一项可被V1接受的敌对象脚本指针，不能冒称普通剧情复现。没有手置won或回填战中HP：真实自动战斗190tick击败两只史莱姆，战后入口运行两次；289HP应被治疗至500，C片段及半恢复仍500，实际退出只有394。

只给真实runner补角色表的对照使投影变500，但退出仍394，排除“仅漏参数”的解释。若输入并不能通过当前V1/原脚本字节不符/未进真实战斗或原生C片段不能复现，则本前提失效。当前这些事实均有固定字节和完整原件。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[工程质量合同](../code-quality.md)、CLAUDE.md。
- docs/phase1/game-mechanics.md的战后恢复与HP/MP机制；engineering-notes.md的脚本同步/异步边界。
- [当前两文件窄修](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/extra-cleanup-fix.json)只清Extra，授权不外推至本卡；原修复和236局部绿保持。

## 验收条件

1. 核定用户取舍后，正式失败反例→有限修复→相邻回归；兼顾战斗HP写入及通用raw写runtime，不盲目用旧投影覆盖脚本改动。
2. HP/MP变化供下一条脚本与半恢复读取；标准原盘掉落、对话hold、一次执行、资源释放/接回与装备效果保留。
3. 逐文件八维、源/caller指纹、原生身份/红绿/诊断可低成本复验。运行时或视觉证据不由静态门替代；全仓/official/protected在3w多卡模块冻结后集中运行。

## 当前模式推进记录

前提：已证上述输入域的两个接线/ownership问题。Coding Owner Codex单Agent，同一隔离治理树；用户已独立批准本卡，以上两文件窄范围build allowed。固定三贤人不恢复，证据并非第三方审查。

## Draft: 设计与风险

战后脚本提供以当前运行态为准的角色视图，使HP/MP读写与Phase F共用Owner；不能仅加playerRoles或在脚本末盲回写。仅在Phase E开始时移交HP/MP所有权，普通战中仍由原战斗投影承接。普通原盘可达性仍未知，核心目标不扩成所有解释器/动画等价。

## Build: 实现与自测

正式旧版15例中13绿、两新增业务AssertionError；固定测试字节后修复Phase E角色上下文及HP/MP绑定。9文件238例绿、game TC0；原导入/自动战斗同190tick由394HP退出变500，两个实际post调用都共享runtime/live。C原函数/半恢复片段与明确0x1A赋值的数值对照为500/30、325/23，不冒充完整SDL解释器。浏览器与本卡统一门未跑，按成本规则集中模块收尾。见[有限八维与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/post-player-state-fix.json)。

## Review: 审查与返工

3w继续partial；settlement实现与修改后的专测保留review。本反证是该caller自身的资源与状态Owner缺口，不能仅归为被排除的解释器广域未知后关闭文件。原已接受状态、数据类型、测试和Extra窄修不撤回无关信用。

## 用户验收

2026-10-22用户批准：“批准保留战后脚本的体力／真气效果（推荐）”。授权仅限本卡已证丢失和顺序问题；不变更存档格式、战中机制或装备效果。

## 交接日志

- 2026-10-22 Codex：复用十原盘leaf/既有反控，定向追实际Phase E caller，完成可接受改动V1→真实190tick自动战斗→两个post调用→394HP退出的观察；补角色表对照仍394，精确C片段O0/O2均500。登记停止线，产品未动。
- 2026-10-22 Codex：用户明确批准后，核定两文件窄build；先增正式HP/MP反例与raw/治疗交错反例，再修接线和所有权。全仓重门仍留模块收尾。
- 2026-10-22 Codex：两个正式业务红后，Phase E复用当前runtime投影并绑定HP/MP，原13身份/断言保留；两种独立新增输入核缺参数与raw交错写序。238局部绿/TC0和原真实战斗修复成立，不声称全脚本/中间对话等价或本卡统一门完成。
- 2026-10-22 Codex：同两文件已批范围补核默认角色上下文。SDL battle.c:1336传敌槽i给PAL_RunTriggerScript；当前caller未传既有eventObjectId，raw 0x1A的op2=0无法接到角色。先补第二槽／队伍[1,0]的HP/MP失败例再改caller，不借此批准单条脚本yield或逐敌提示等待。
- 2026-10-22 Codex：正式合法0奖励双敌边界15绿/1业务红→补既有eventObjectId参数→26结算/61玩家属性相邻绿、当前game TC0。原草稿敌人奖励与快照不齐，已纠正后重采有效单红并finally恢复自有源；失败草稿原件保留，不冒充正式红。当前review等统一门；逐敌等待随后另获用户批准，仍由独立时序卡实施。

## 下一位Agent提示词

无下一位Agent，Codex单Owner。复用本原件实施两文件已批窄修，保留正式先红后绿；不重做无关全文或逐片跑覆盖率，不扩94–102。

- 2026-10-22 Codex模块验收：已批有限行为与五文件A–H均据证收口。完整check20443/七包TC/工具684，官方20045项/保护同报告均零诊断；首轮12超时及重跑原件未删。见[模块收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json)。仅core原合同，不冒充视觉或整个解释器验收。
