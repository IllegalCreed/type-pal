# GAME-BATTLE-POSTSCRIPT-DIALOG-ORDER-1 — 战后脚本与提示的逐敌顺序

Status: done
Phase: phase1
Capability: battle / post-battle script-dialog ordering
Coding Owner: Codex（用户2026-10-22批准，三文件窄build allowed）
Generation Owner: N/A
Reviewer: Codex（自身核证，不冒充第三方）
Visual Verification Owner: Codex
Visual Verification Timing: core-observed / 浏览器与像素未跑
Contributor: Codex
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

确定Phase E是否应在每只敌人的战后提示结束后，才执行下一只敌人的战后脚本。当前TS先同步执行全部脚本，再按队列显示提示；最终掉落数量未丢失，但中间状态不同。不得把这一观察冒称普通玩家已报告缺陷或完整画面复现。

## 范围

实现白名单为battle-settlement.ts、battle-settlement.glm-next-wave.test.ts及相邻battle-system.glm-next-wave.test.ts。后者仅迁移0x89特殊胜利的旧同步时序断言，Codex为唯一Owner；仅战后逐敌推进、内部游标与直接测试；runner/hold和SDL只读。不改变战中各类脚本、单条脚本内部yield、原盘资源、存档格式或最终掉落规则。用户已批准逐敌等待，不扩成通用解释器改造。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary | battle.c:1334–1337逐敌同步调用PAL_RunTriggerScript；script.c:3441–3467的消息分支调PAL_ShowDialogText；text.c:1659–1711中心窗口显示后等待1.4秒并结束对话。下一敌调用在当前调用返回后。 | 固定reference源码与[原件入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/dialog-order-counter.json)；不是原生SDL完整战斗运行 |
| 第一阶段 | 原盘team46含OBJECT402、空占位、OBJECT402；两敌均用原SSS41008给鼠儿果后提示。当前真实自动战斗192tick到第一active narration时，背包已2颗、另1条提示排队。 | 同入口的完整TS观察：无敌对象overlay、未手置won、实际runner逐槽0/2调用 |
| 当前二阶段 | N/A，本卡只涉及第一阶段宿主。 | CLAUDE.md阶段路由 |
| 本任务目标 | 明确逐敌等待或保留现状的产品取舍；终态数量相同不能直接证明中间时序相同。 | 原phase E一次/恢复hold证据继续复用，不重做全部结算考据 |

### 反证与替代解释

使用通过现行V1/内存Save的高属性单人夹具确保自动打赢，不声称普通新游戏属性或剧情路线已跑；原盘敌队、对象和脚本未改。前两次低属性夹具实际战败，不能算产品红例，原件保留；调高合法输入后才得到成功观察。

第一条提示仍显示时核心背包为2，这是已证数据状态；B面板物品数量输入直接读gs.inventory且battle允许打开，只有源码可观察性依据，尚未实际打开浏览器面板。本观察不能推导正常战后界面漏物品、普通玩家可中途使用背包，或SDL原版有本项目B面板。

若固定原盘team/OBJECT/指令不符、真实战斗未胜、第二脚本没有在第一框前执行，或SDL中心窗口并非在调用内等待，则推翻相应前提。是否值得改时序仍属用户取舍。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md的战后恢复，以及[工程质量合同](../code-quality.md)。
- 既有[Phase E/caller与原盘十leaf](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/README.md)；全角色Extra与HP/MP两个批准不外推为本次时序批准。
- 3w是逐敌caller/恢复owner；单条脚本内同步/队列与更广动画属于3r/3s，不能通过本卡声称全解释器阻塞等价。

## 验收条件

1. 先取得用户时序取舍，再正式业务红→有限修复→相邻回归；或明确登记保留现状的偏离边界。
2. 原槽顺序、空槽、脚本一次执行/返回指针不回写、掉落数量、已批HP/MP effects、最后所有提示结束才半恢复/cleanup均保留。
3. 修改文件逐项A–H，固定源/caller/原生身份及完整输出；不复制解释器、扩大通用yield接口或为了覆盖率堆测试。
4. 现阶段仅core数据观察；若改显示时序，补实际宿主输入和必要视觉范围。全仓/official/protected集中相关模块窗口，未跑不称通过。

## 当前模式推进记录

Codex单Owner，同一3y。用户2026-10-22批准“按 SDLPal 逐只处理（推荐）”，以上三文件窄build allowed；先正式反例再修。固定三签不恢复。

## Draft: 设计与风险

战后阶段逐敌执行：本敌脚本入队和active提示均结束后，才进入下一敌；无提示的脚本仍可连续推进。私有运行态游标仅由本模块写入，生命周期随当前战斗；不进入V1存档，不解决单条任意脚本的通用yield。最后脚本只执行一次，提示未结束不能半恢复或释放。

## Build: 实现与自测

[当前八维/正式红绿及完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/dialog-order-fix.json)：正式旧源16绿/1业务红；同测试字节在当前源4文件27绿，game TC0。以本场settlement为key的私有WeakMap保存下一敌槽，当前敌的队列/active提示结束后继续；正常完成显式删除，中断随对象回收。没有GS/资源强引用、存档字段或新公共出口。实际原盘team46全战192tick首框库存1、下一敌只在前框结束后运行、最终2并释放；首框导出仍通过现有V1校验。全仓/官方/protected进入集中窗口，浏览器/像素未跑。

## Review: 审查与返工

已证核心中间顺序差别，最终两颗与两条提示均存在；普通剧情与视觉不继承信用。3w、3r/3s仍按各自原合同处理，不把终态绿当逐脚本阻塞等价。

## 用户验收

2026-10-22用户批准：“按 SDLPal 逐只处理（推荐）”。仅本卡战后逐敌等待的时序取舍；不是所有战斗脚本/演出差异的统一批准。

## 交接日志

- 2026-10-22 Codex：最新main903/治理faaf，同一3y只读取证；原盘team46两只凤梨小妖、脚本41008不改。合法高属性V1→真实自动战斗→192tick首框时背包2颗，完整原件登记；低属性战败草稿不算产品反例。记录有限时序选择，未实现。
- 2026-10-22 Codex：用户明确批准后核定三文件build；先收存HP/MP默认角色参数的独立修复，再写逐敌掉落/active box/按键消费/空槽与尾提示恢复反例，避免把两种行为修复混为无版本证据。

## 下一位Agent提示词

无下一位，Codex单Owner。时序已批准，按原反证先正式红例再实施有限推进；覆盖率集中多卡模块收尾，不扩94–102。

- 2026-10-22 Codex：正式时序反例16绿/1业务红；修复后新增例已绿，但相邻DL23仍断言两敌同步入队而失败。把该既有3例文件纳入同Owner测试白名单，保留两条真实提示、掉落与退出断言，改成逐敌观察；不是新增产品范围或降低断言。首轮命令含不存在的finalization.glm-next-wave过滤项，实际只收集3文件21例，未给该未收集文件任何信用；下一轮使用已确认路径battle-finalization.test.ts。

- 2026-10-22 Codex：新增正式业务红后修复；旧同步DL23断言真实失败并迁移，未删合同。首版把游标放进public settlement被TC的V1 shape全字段合同拦下，已撤该字段、未改save代码，采用模块私有弱映射。首个导出取证对原奖励屏作了错误空屏假设，原件保留，修正为原team46的exp300/index1后通过；不算产品缺陷。全仓门集中收尾，卡先review。

- 2026-10-22 Codex模块验收：已批有限行为与五文件A–H均据证收口。完整check20443/七包TC/工具684，官方20045项/保护同报告均零诊断；首轮12超时及重跑原件未删。见[模块收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/module-closeout.json)。仅core原合同，不冒充视觉或整个解释器验收。
