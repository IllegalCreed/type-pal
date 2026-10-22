# CODE3w战后脚本与特殊结局复审

Status: recorded
Owner: Codex（单Agent）
Date: 2026-10-18
Base: `599d35717d8a5213802f76535eb14ba187f709e5`
Branch: `codex/code-quality-3y`

## 2026-10-22 中间对话时序取证

[逐敌顺序反证与完整原件清单](dialog-order-counter.json)使用原盘team46两只凤梨小妖、无OBJECT改写、原脚本41008；合法高属性V1→实际自动战斗192tick到首提示时，两颗鼠儿果已入包，另条提示仍排队。最终两颗与两提示均保留；SDL的逐敌同步调用及中心窗口等待给出相反中间顺序。当前只是core状态与源码观察，没有浏览器画面或普通玩家开背包复现；[时序卡](../../../tasks/GAME-BATTLE-POSTSCRIPT-DIALOG-ORDER-1.md)仅draft，待用户决定是否逐敌等待，不借HP/MP批准直接实现。

后续用户已明确批准逐敌等待，时序卡转有限build，尚未在此快照实现。另[默认角色上下文正式补证](role-context-fix.json)记录合法夹具15/1红→26直接/61相邻绿及当前TC0；既有eventObjectId传敌槽号，队伍[1,0]不改变role选择。原两次HP/MP反证与原件按固定faaf版本保留，由同一只读快检核对后继两文件增量；不是静默刷新旧指纹。统一门仍留模块收尾，0新增关闭。

## 2026-10-22 战后HP/MP状态归属窄修

用户批准后，两正式业务红→9文件238绿/TC0；[逐文件八维/原件清单](post-player-state-fix.json)、[修前真实输入反证](post-player-context.json)与[统一只读快检](verify-extra-reachability.mjs)可复验。原可接受改动V1经过实际190tick自动战斗，退出HP由394修为500；只传角色表仍394的对照保留。HP/MP只在Phase E移交runtime，普通战中、掉落/对话顺序、存档与装备不改。

当前3356tracked/372closed/115review/2869pending，0新关闭、固定61accept/22partial。结算源及本次修改专测维持review；全仓/official/protected留3w多卡收尾。快检按903→09的Extra两文件及09→当前HP/MP两文件分别锁定，不能由旧快检放行任意新增源码。以下各段是明确历史时点，不是当前门通过或全部脚本等价证明。

## 2026-10-22 当前修复

用户另批清全角色Extra；[两文件八维/正式红绿](extra-cleanup-fix.json)及[完整原件](extra-cleanup-fix-native.json.gz)记录旧一业务红、236局部绿及game TC0。末role5效果经真实出口清零，仙女剑8武术/32760双攻保留。当前3356/373closed/114review/2869pending，0新关闭；全仓与覆盖率在此产品变化后尚未新跑，留3w多卡收尾。下段原反证和静态门绑定修复前，不作当前产品门。

## 2026-10-22 当前边界增量

[本增量文档/零诊断门原件](extra-reachability-gates.json)；产品与测试未改，全仓与覆盖率据原绑定复用，本次未重采集。

[真实导入与逃跑出口反证](extra-reachability.json)、[完整原件](extra-reachability-native.json.gz)、[只读复验](verify-extra-reachability.mjs)：已接受的改动V1输入可让GS队伍与旧BattleState分叉；实际大蒜写入发生在换队重建之后，逃跑清理后离队role4的30毒抗仍可被getter/导出读取。原盘普通剧情可达性仍未知，不能把此反证外推为正常剧情复现；静态闭包不授完整不可达证明。本观察后用户另批清理域窄修，见上段；原物品目标传递修复维持，3w仍partial、0新增closed。下文为10-18原时点结论，不作为当前缺口已消失的证据。

## 实际读域与真值

[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)准入。两测试原347/123行与当前379/153行、新共享夹具96行、settlement249行全文；caller/primary仅[read-boundaries](read-boundaries.json)明确区间，不冒充battle-system/event-system整文件验收。[最终输入](source-inputs-final.json)与原字节gzip成对。

[原SSS静态枚举](asset-census.json)独立解MKF/OBJECT/SCRIPT字段并对当前153敌对象：15对象共10个非零战后入口，只掉落、叙述、结束及可选0x06。四0x89全result0，三0x90仅改turnStart字段。数据仅只读，未运行提取器，未写主树输出。SDL battle.c:1334–1373全敌槽PhaseE、不按HP过滤，之后#if1半恢复；fight.c:735–765只KO敌人获奖励；script.c:2557–2562、3235–3310、3388–3434与global.c:1090–1130核结果/概率/叙述/数量0。battle.c:1770–1858保留局部结果接回；不把PhaseE任意改result当可随意改变接回的合同。

## 修改、oracle与排重

两份开战准备合并到测试专用夹具，实际default/hydrate→projection→startBattle和正式五槽资源，未复制phase、脚本、奖励或恢复算法。两测试原11合同与原断言保留，新增两概率边界及三结果接回，合16；DL23原例延伸实际won宿主、双活敌槽、两真实原盘leaf掉落、零击杀奖励、队列/active box/恢复/释放。原0x89分支枚举单测不再重复。合法0/1/FFFF接回及3胜利域与“当前原盘四站点全0”明确分开。

黑毛球41017–41021搬到ip1且L_0保留，实际runner执行0x06：roll21掉落、roll22跳过，Math.random spy只控制真实宿主并finally恢复。证明阈值及一次执行，不宣称C/TS随机流相同。DL23的公开runner端口仅观察PhaseE并透传真实解释器；turnStart直接runScript，不虚构注入调用。局部GameState/Bus/资源不留全局owner。

## 反控与运行

[六反控](controls.json)：不建活敌won屏、跳过活敌战后脚本、caster强制0槽、忽略数量0、概率等号错误、terminated错误接fled。镜像复制实际game源码与依赖，整份旧测试全绿→当前仅一个指定业务AssertionError，原生JSON/raw/变异字节及恢复证明保留；产品工作树未变异。[首次镜像](controls-first-mirror/attempt-limit.json)tsconfig收集失败不给信用。第六首次已有业务单红，但报告名称+0匹配失败；仅第六重放，前五不重复，分次原件保留。

[最终门](gates.json)：8文件237=16直接+221相邻，game typecheck、五文档消费者、lint/ledger；完整字节原件见各receipt与[native档案](native-archives.json)。两测试作者草稿误读optional defeated/runner端口的红，及五元组类型红均保留，不能冒充产品先红；精确草稿快照见[draft-corrections](draft-corrections.json)。[工作树恢复](recovery.json)只恢复原路径/原3y/原599d，离线依赖自有安装，不改主树。

## 保留边界与下一步

生产执行、UI/公共接口/schema/save/资源/phase2未变。当前叶不需playerRoles/event owner；不据此认证任意新脚本、外部存档、异常副作用。C逐脚本阻塞、TS先入队再显示的中间时序未作等价验收；极端域、视觉与非队员Extra继续待核。

0新增closed；3318 tracked/251 closed/102 review/2965 pending，新helper与既有源/测保持review。83卡55partial/28pending/0accept，仅3w指针更新。全仓check/official coverage/protected依用户要求留大任务收尾；本片不跑全game、原盘runtime、视觉/E2E，不合main。推送后优先处理用户补审三项extract输出守卫/链接入口/错注；然后继续pre94，94–102/editor后置。
