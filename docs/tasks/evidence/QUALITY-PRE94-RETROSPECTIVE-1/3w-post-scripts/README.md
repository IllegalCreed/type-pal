# CODE3w战后脚本与特殊结局复审

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-3w「战后脚本与特殊结局复审」证据目录(工作基点自 599d3571 起,收口于 8599c94b)的治理候选页;证据原件即下方逐字节保全的固定main源(9263B,SHA 9dcb3cd3b820)。本目录承载的真实结论:3w 卡按原「状态/结算/清理」合同接受,收口决定与五文件名单见 module-closeout.json(decision=accept,视觉 E2E 按原卡仍 deferred);六个变异反控(controls.json)全部达成「old 全绿、current 恰好一条预期业务红」;逐敌等待(dialog-order-counter 反证 → dialog-order-fix 修复)、战后 HP/MP 状态归属(post-player-context 修前反证:退出 394 vs C 参照 500 → post-player-state-fix/role-context-fix 修复)、Extra 清理(extra-reachability 反证:离队 role4 Extra 30 逃跑后仍被导出消费)四个窄修各自先红后修;原盘 SSS.MKF 静态普查(asset-census.json)定位 10 个 battleEnd 直达叶/15 owner 与 4×0x89 全 result0、3×0x90 只写 turnStart。

## 来源与输入

来源为固定Git载体,非本次运行;原23个链接处置见作者review的linkDisposition。当前存活入口:[GAME-BATTLE-POSTSCRIPT-DIALOG-ORDER-1.md](../../../cards/GAME-BATTLE-POSTSCRIPT-DIALOG-ORDER-1.md) [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) [asset-census.json](asset-census.json) [attempt-limit.json](controls-first-mirror/attempt-limit.json) [controls.json](controls.json) [dialog-order-counter.json](dialog-order-counter.json) [dialog-order-fix.json](dialog-order-fix.json) [draft-corrections.json](draft-corrections.json) [extra-cleanup-fix-native.json.gz](extra-cleanup-fix-native.json.gz) [extra-cleanup-fix.json](extra-cleanup-fix.json) [extra-reachability-gates.json](extra-reachability-gates.json) [extra-reachability-native.json.gz](extra-reachability-native.json.gz) [extra-reachability.json](extra-reachability.json) [gates.json](gates.json) [module-closeout.json](module-closeout.json) [native-archives.json](native-archives.json) [post-player-context.json](post-player-context.json) [post-player-state-fix.json](post-player-state-fix.json) [read-boundaries.json](read-boundaries.json) [recovery.json](recovery.json) [role-context-fix.json](role-context-fix.json) [source-inputs-final.json](source-inputs-final.json) [verify-extra-reachability.mjs](verify-extra-reachability.mjs) 。首次镜像失败零分的原件在 attempt-limit.json;原始 raw/native 档案清单在 native-archives.json;修复中 worktree 消失重建记录在 recovery.json;最终代码输入快照在 source-inputs-final.json;只读复验入口为 verify-extra-reachability.mjs。

## 断言与业务 oracle

本页正文按原文各节时点转述其真实断言:统一门完整 check 20,443 业务例+684 工具例、七包 TC 与官方覆盖率棘轮 20045 tests/758 sources 均零诊断,且首轮 12 个 pal-extract 5s 超时、ledger 申报 372/115 与实际 377/110 不符等失败原样保留、复跑后才通过(module-check→bounded455绿→完整重跑);反控六项在不建活敌 won 屏、跳过活敌战后脚本、caster 强制 0 槽、忽略数量 0、概率等号错误、terminated 错误接 fled 六个变异点上证明 spec 判别力;HP/MP 与 Extra 修复的判别力来自修前反证(394 vs C 500;Extra 30 逃跑保留导出)加各自正式业务红。空数组/exit0/成功字样不外推为零诊断或产品通过;原文自带「以下旧段均按日期/基点读取,draft或未实施描述不是当前状态」的时点边界在本页同样成立。

## 结果

CODE-QUALITY-3w 模块收口:五文件接受(battle-finalization.ts 及其 extra 测试、battle-settlement.ts 及 glm-next-wave 直测、battle-system glm-next-wave spec),账本 3356 tracked/377 closed/110 review/2869 pending,卡 62 accept/21 partial/0 pending,0 新关闭语义保持;覆盖率基线 20040→20045(新增 Extra 1+settlement 4),758 sources 不变、无回退、未放宽规则。治理结果=原文保全完整、模板符合、链接处置如实;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;原文明言不是浏览器/像素/完整 SDL 运行,visual E2E 仍 deferred;更宽的 GS/BattleState 名单分叉与单脚本通用 yield 属 3r/3s,不随本目录接受。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 9263B / SHA-256 9dcb3cd3b820bf97b7098c83cf58c8917c3dc2ec2388ee2ab5c52d4e92abe3f3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3w战后脚本与特殊结局复审

Status: recorded
Owner: Codex（单Agent）
Date: 2026-10-18
Base: `599d35717d8a5213802f76535eb14ba187f709e5`
Branch: `codex/code-quality-3y`

## 2026-10-22 模块接受

[当前收口清单](module-closeout.json)：CODE3w按原“状态/结算/清理”合同接受，五个review文件闭合；不扩大为整个battle-system/event-system或视觉E2E。统一门完整check20,443业务例与684工具例、七包TC、官方覆盖率与同报告保护比较均零诊断；全部原件见[当前证明](dialog-order-fix.json)。首轮12超时、bounded455绿与完整重跑分别记录，没有把退出码或存量诊断称通过。官方覆盖率只采集一轮，保护核验不重复采集。

固定83卡62accept/21partial/0pending；源账本3356tracked/377closed/110review/2869pending，以最终机器回执再次确认。all-cards旧header59/24与实际61/22不一致已明确勘误，本次只新增3w一张。下一3h四个资产源的八维余项，复用既有PNG/bootstrap/fetch证据；94–102不扩展。下段372/115及“门待”均为明确旧快照。

## 2026-10-22 已批逐敌等待修复与模块收尾

[当前三文件八维/版本与原件](dialog-order-fix.json)在8599角色参数修复后单独先红后修：16绿/1业务红→当前4文件27绿、game TC0，stderr均0。私有弱映射按本场结算续跑，不把游标写入V1；旧同步DL23只迁移时序断言、保留真实双leaf/活敌/掉落/退出合同。实际原盘team46自动战斗192tick首框背包1颗，前框关后才处理第二敌，最终2颗并清理；首框JSON仍通过现有V1 shape。不是浏览器/像素或完整SDL运行。

统一[只读快检](verify-extra-reachability.mjs)冻结旧角色修复于8599，并单独核后继三文件、正式单红/27绿身份、首1终2和原生附件；不把新字段静默加入历史凭据。Extra/HPMP/角色/逐敌四项相关修复集中全仓与单次官方覆盖率窗口；当前372closed/115review、固定61accept/22partial，门完成前不升格。

以下旧段均按日期/基点读取，draft或未实施描述不是当前状态。

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
```
<!-- incremental-original-source:end -->
