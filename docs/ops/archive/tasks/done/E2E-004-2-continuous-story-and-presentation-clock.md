# E2E-004-2 - 连续剧情演示与呈现时钟修正

Status: done
Phase: phase2
Capability: E2E-R4-1 / X3 / W1
Coding Owner: entity_names（主壳呈现时钟）；e2e004_runner（004工具）；Root（独立反控/文档/接收），各文件单一Owner
Reviewer: Codex Root独立验收；e2e004_phase1_premise独立一手前提/源码复核
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Branch: codex/e2e-004-continuity（Root）；贡献者另从554b8a055隔离开分支

## 2026-10-02清账收口（当前结论）

`9a488c02`六case通过，`7a01ba090`回执模型复核不冒称新演出；一期1.20秒/二期1.22秒和用户最新“非常好”确认连续演示。原comparison failed与六child原字节保留。
本轮按用户“先清当前边角再继续005”授权核既定范围与证据，Codex技术accept并归档。
除004上述明确认可外，不补写用户逐项体验签名；下文旧pending/返工/提示保留为过程记录，非当前阻塞。
本次不重跑未变剧情来重复取证。原声录像由E2E-CAPTURE-1承接；全量Q1/Q2、后期命名和发布素材库未因此完成。
无下一位Agent提示词，本卡已收口；[清账母卡](PRE-005-DEBT-1-current-edge-closeout.md)继续当前未完事项。

## 用户反馈与边界（2026-10-02）

用户指出004演示夹杂取消/错误站位检查不连贯，要求把专项测试分出去；道士尾段站很久仍未消失，
并明确要求比较第一阶段。上一轮verify报告原样保留，但不代表本次连续观感通过；[004母卡](E2E-004-1-meal-and-beggar-wine.md)转rework。
6012原服务/页面保持，候选验证不更新用户正在看的工程，不关闭其它项目窗口。

## 前提真值门

一句话前提：正常剧情不应插技术反控；末尾720ms溶解不应为不同计时域补追十几秒，更不能通过改作者等待掩盖。

| 维度 | 直接证据与目标 |
| --- | --- |
| 原始内容 | `data/extracted/events/all.json`全局709/710最后邀约201/202，711隐藏、712原0x73[0,0,0]、714/715消失旁白；无尾部站立wait。 |
| 第一阶段UX | 真实game004 05-39 trace：完整邀约61979.4ms→hidden62579.0→fade结束ip714为63378.9→完整旁白63825.7；event-system与present以同一wall clock推进dither。不是内部帧/坐标对拍。 |
| 当前二阶段 | main:1916首次dialog open用frames.now，5049 render/performance与5390 advance/real为UI实钟；dither:5174起点performance，5181却消费frames.now，741 debug仍real。RuntimeFrameSession:93/94来自GameplayClock，gameplay-clock:22截长帧100ms，两个域可拉开。 |
| 当前实际反例 | main的RF004 06-26 trace：完整邀约80080.6→hidden81997.1→完整旁白99331.1，隐藏后17.334s；中间snapshot为dialog=null/ditherActive=true/e62.visible=false。无逐像素消失或精确Enter atMs，不能把hidden当实际画面消失，或把全部17秒归单个CPU成本。 |
| 目标 | 仅恢复已有时钟归属：普通对白首次open用real，dither渲染消费用real，起点/debug保留real。字速/720ms/72步/零帧/预算后起算/取消/世界暂停/GameplayClock/fade不变。 |

独立e2e004_phase1_premise已直接读取原始、两真实trace及三条调用域，签`premise verified / design agree`。
历史`bede6b14d`dither起点/消费为rAF实钟；`bdd35ff65`预算后起点精确用performance；`6a8296a15`全局gameplay化漏分域；
`8eb93bb72`仅机械改名。`debug-tools.ts:1149`、现行debug指南明确世界单步不单步演出/对白。
先前“起点/debug改gameplay”的相邻猜测已撤销且未改产品；该方案会改变既有呈现域，不授权build。

最强替代解释：palette首算慢、渲染或整trace RPC阻塞、读对白/确认时间。现trace不足以精确分摊这些成本，
但不推翻源码混钟。普通菜单只冻结locomotion（main:3333），framePorts:5434仅confirm冻钟；004无confirm，
不声称这次菜单直接冻结了GameplayClock。不是内容迁移缺陷，不恢复转换器或全局NPC冻结。
可证伪：真主壳先产生>100ms长帧滞后，再正常触dither；旧版不额外step0停留或修后仍停留则重新归因。
普通非narration/speed>0未跳字的dialog首帧应typing，按原字速才全显；observe.pageText是完整布局，不能作已实绘字数。

Root `premise verified / design agree / build allowed`：源码、历史政策与真实对照齐全；先红后绿、独立接收，不等固定三席。

## 单一Owner白名单

- entity_names：独立干净候选从554b8a055；仅`main.ts`两处时钟域修正及必要相邻呈现时钟测试。
  可补独立`main.presentation-clock.test.ts`。不改Root的`main.presentation-clock-root.test.ts`，不动GameplayClock、
  RuntimeFrameSession、fade、字速/分页、72步像素算法、schema/save/content/资产/作者工程；不得为过门降低规则/扩大忽略。
- e2e004_runner：独立干净候选从554b8a055；仅新meal-journey/contract/observer/trace-plugin/both和相邻meal tests。
  三显式case：story默认正常40行/实际移动，不插慢读/取消/非法使用/中途或末尾存读；items从真003正常取得酒后单测取消/错误use；
  saves从真003正常做慢读/持久208中途存读及完整剧情末尾真实存读，产合法004.end。无造库存/坐标或中间档兼容。
  report name/scope/case明确，story不冒充005前驱；both全覆盖核两引擎三case同revision/source/各自同003原档，
  只两story不能冒充完整both。原World/Canvas/实际save clone/来源/collector/唯一NPC正文/消费/40行硬门不得放宽。
  正常热路径仅有界只读页面/菜单/序号/错误DTO，阶段边界dump全trace原硬断言保持；snapshot取菜单不clone全collector。
  记录实际输入时刻与RPC耗时，补dither步进/prepareMs有界只读记录，供分辨渲染成本与确认延迟。
  现行旧入口stationary baseline仅历史无调用方，可从当前执行器移除（日志/历史Git保留），不保留旧入口兼容路径。
- Root：本卡/004母卡/看板/索引、package case入口/使用文档、独立`main.presentation-clock-root.test.ts`及真trace复算，
  统一质量门/集成/6012交付；不与贡献者同时改其文件。

### 根因反控与相邻夹具准入

- Root c12fc4ef4两项真主壳反控双红：长帧后debug pr=1/3而实际step0（应24）；普通首cue无跳字却waiting-input（应typing）。
  原失败日志`004-presentation-root-counter-red.log`保留，types零诊断；不是参考公式自写模型。
- entity_names独立11项合法主壳：正常/长帧、世界step下UI、合法skip/翻页/不可加速auto尾停顿、72步/forcedzero、
  预算后2000ms成本、实际debug Abort无尾款，先7红/11再11绿。生产diff只main两处。
- 贡献者首轮完整reforge264文件2238测试2236绿/2红：Root尾lease cleanup断言尚缺真实task turn；
  pal-meal-shell夹具只有虚拟RAF，未同步performance实钟，旧160轮不能用于加速修正后的UI秒数。原全套红留存。
- Root38e0da051仅自持测试在effect/tail已提交后`h.settleIO()+drain`再严格核busy false，不推进时钟、不减断言。
  entity_names白名单追加仅`pal-meal-shell.test.ts`的外部Clock IO：每个fresh boot将performance与现有虚拟RAF同域，
  不变160预算、字速、720ms、真实资源/字体/Source/codec/所有World与保存断言；不修生产回到错误gameplay域。
  上述针对测试边界的修正不将旧2236/2238追溯写成全绿，统一质量门由Root冻结候选另跑。

## 验收

1. 独立真主壳混钟反控先红后绿；长帧差不进入dither时长，debug step/pr与实际输出一致，世界步进时演出仍实钟推进。
2. dialog新cue首帧不因gameplay落后而瞬显；原字速、普通翻页/合法跳字、自动尾停顿/世界冻结下UI语义保持。
3. 三case CLI/报告准入/覆盖与both缺case、伪passed、异源/异前驱负例；原所有持久域与正常物品验收保留。
4. 两引擎正常story对照004尾段，源码预算720ms之外的观测/prepare/确认费用分开说明；一个干净完整演示，不重复旧001–003视觉。
5. 产品/工具独立复读、七包types/必要测试、全仓静态error/warning/info零诊断。完整门未绿不报完成。
6. 6012更新前再次确认无草稿；页面/服务保持；用户决定可感知的连续性，capture另排。

## 上下文

- [第二阶段铁律](../../../../phase2/READ-FIRST.md)、[一期知识harvest N/X](../../../../phase2/reference/phase1-knowledge-harvest.md)、[工程经验](../../../../phase1/engineering-notes.md)。
- [004收据](../../../../testing/e2e/stages/004-meal/report.md)、[E2E合同](../../../../testing/e2e/contract.md)、[现行脚本合同](../../../../phase2/specs/script-system.md)。
- [X3历史溶解](X3-opening-dither-speaker-inheritance.md)仅视觉与独立snapshot算法参考，旧入场前瞻已退役，不复活。
- [现行debug时钟范围](../../../../phase2/guides/debug-tools.md)、当前main/RuntimeFrameSession/GameplayClock/DialogBox/typewriter。

## 交接

贡献者按上述白名单隔离施工、自验后交冻结SHA并停写；Root独立红绿复核、质量门、真正更新再交用户。
不合main、不碰6012、不需要用户转发给固定席位。未跑的三case/正常演示不得写passed。

## 独立接收与实跑（2026-10-02）

- 产品fdb697d09/夹具c3411f052接为Root3132b6904/0334a897d：完整复读main仅两处、11项实际主壳与Root两个counter。
  Root独立定向56/57后5000ms超时、单pal4/5另用例超时保留；不是业务/计时断言失败，不做超时豁免。
  一手核隔离夹具却枚举294scene造成无关读/验证/digest；91d8178a2（Roote98be9c89）仅fixture index指向原完整两scene，
  真实9MB BDF/生产parser/资源/地图/全部defs/原5业务断言与5000ms/160预算不变；新增disk有但未索引s004正规loadScene拒绝。
  原5及新拒绝反控6项绿，不把此fixture冒称全PAL出版闭包；正式六case仍消费完整PAL项目。
- 工具f36170a1接为Roote88e0ba6b：三case/有界drive DTO/阶段末原全trace强门、实际DOM输入/RPC记录、成功dither输出锚；
  Root独立135工具绿、全仓lint2760文件0/0/0。Root新增四个items/saves入口，默认两个004入口为story。
- Root冻结9a488c02实际六case：story两40行/各1context；items两15前置行/各1context＋cancel0dispatch/invalid1且不耗酒；
  saves两40行/各3context＋实际carry/end World/Canvas fresh相等。全部child status/core/route/sourceStable passed，collector error0。
  Root逐项复算404来源（398Git/6资产）、全部trace/四原档、game两次真实save clone输入与exact1成功ack。
- 原both比较器failed仅因新增错误warnings===[]模型：factory原协议保留Chrome性能advisory/exactURL可选state404。
  5b318a91（Root7a01ba090）恢复Array结构及原errors零规则，136工具绿，不新增filter/ignore、不改Canvas后台/制造state文件。
  旧comparison原字节保留；Root新004-continuity-reviewed-suite.json明确model-only复核原六回执，绝非新六次演出。
  warning原计数game0/0/1、RF2/1/2保留，不声称console零警告；硬性静态零诊断不变。
- 新正常story尾段同域观测：邀约完整实绘→旁白game1.200s/RF1.217s，hidden→旁白1.101/1.173s；
  RF尾dither准备17.4ms、预算后约733.8ms到实际输出72。旧隐藏后17.334s停留已消除，正文/720ms/72步/字速零diff。
- 全仓统一check正在Root冻结候选执行；源只因测试fixture/收据模型后续增量更新，历史E2E revision9a不重写。
  仅完成硬门与安全更新后才交6012；当前main/用户页面仍原样保持，不提前报done。

### 统一质量门与交付结论

`004-continuity-full-quality.log`全仓pnpm check已完成退出0：七包types、10971测试全绿，
lint2760文件0error/0warning/0info、docs/coverage/quality工具及136 E2E工具门通过。
Root后续仅文档/等树历史合并，文档门另核；两早期timeout与模型错误comparison不重写。
原产品贡献者历史91d8178a2等树合并，实际通过的代码树不变；现场报告revision9a保留在main可达历史。
Codex独立accept，技术返工收口转review等待用户连续观感；无需固定席位签字、不标done/capture通过。

用户最小复验：正常浏览器004只用默认story（从真实003开始），取菜→送菜→物品菜单赠酒→喊话结束可移动。
取消/错误位置、慢读/存读均从独立items/saves入口看，不会插入这场正常演示；001–003不需再走一遍。
道士末句后的短溶解应立即衔接消失旁白，不应出现十几秒站定旧帧。6012页面/服务保持。
无下一位Agent提示词：隔离贡献者已停写，Root独立接收完成，等待用户体验确认。
