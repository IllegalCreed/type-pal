---
testingSchema: 2
id: e2e-004
evidence: e2e/evidence/e2e-004.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-004","sourceRefs":[{"path":"scripts/e2e/meal-game.mjs","lines":"3-3","anchor":"await runMealJourney","role":"caller","sha256":"a922f13f014cb4923e0f3ede5d7ddcacc030d892a75a8aeb86cf202d478aad8f"},{"path":"scripts/e2e/meal-contract.mjs","lines":"395-415","anchor":"export function validateMealPredecessor(","role":"input","sha256":"811e6a262c332ad7f9c1608df3cc11d6d8fcd995a39db72bda3aa41a342ea4ad"},{"path":"scripts/e2e/meal-contract.mjs","lines":"302-325","anchor":"export function assertMealSuite(","role":"oracle","sha256":"811e6a262c332ad7f9c1608df3cc11d6d8fcd995a39db72bda3aa41a342ea4ad"},{"path":"scripts/e2e/meal-contract.mjs","lines":"744-769","anchor":"export function assertMealGameSaveInput(","role":"oracle","sha256":"811e6a262c332ad7f9c1608df3cc11d6d8fcd995a39db72bda3aa41a342ea4ad"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"},{"path":"scripts/e2e/meal-contract.mjs","lines":"685-732","anchor":"export function assertMealCollector(","role":"collector consumer","sha256":"811e6a262c332ad7f9c1608df3cc11d6d8fcd995a39db72bda3aa41a342ea4ad"},{"path":"scripts/e2e/meal-observer.mjs","lines":"1-115","anchor":"const worldRenderLimit = 60_000","role":"collector","sha256":"78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"}],"publicCallers":["pnpm e2e:004","pnpm e2e:004:reforge","pnpm e2e:004:both"],"legalInputs":["same-engine current 003 kitchen save","normal menu use","isolated save/restore case"],"businessOracle":{"type":"meal-gift-continuity","assertions":["story/items/saves 六 case 分开","取消/错误 use 不扣酒","赠酒正文、消失、喊话后恢复控制权"]},"dedupe":{"result":"reviewed","against":["e2e-003","e2e-005","e2e/stages/004-meal/report.md#历史"],"notes":"旧 failed/诊断回执保留，不把 receipt-only revalidation 伪装成新演出。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-004.json"}
-->

2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。

2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。

# 004 · 端菜、送菜与使用桂花酒赠道士

2026-10-06 采集/消费合同源核验：assertMealCollector 同时核worldRenders、提交/对白/菜单/输入/存读列表的序号和全局顺序；NPC连续性按sceneVisit区分，party连续链保留。collector的世界绘制时钟独立60,000条，稳定姿态保留span，Game drawn与Reforge selected/world-pass-only有别。六case和保存输入断言未被帧证据替代；story/saves以真实storyEndControl收口，不再要求尾部测试走位。本次未新跑E2E。

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核本页公开执行入口与现有断言职责；本步仅刷新版本源，不新增阶段覆盖或重算旧实跑结论。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。

## 2026-10-04 文档深审

9a488c02 六 case 是旧版本历史执行；不能把当前 canonical 22/11 倒填到旧回执。receipt-model-only 复核不等于新增实跑。

2026-10-04 核读基线为 `d02278dc0154dd73b5db24388a35c30bb096cc81`，content22/SAVE11。本轮没有执行游戏；配对 evidence 记录精确 source/caller/oracle、源 hash 与缺失原始产物。下文数值/告警/通过结论保留为各轮历史记录。


## 当前状态

2026-10-02用户复验后按[E2E-004-2](../../../../ops/archive/tasks/done/E2E-004-2-continuous-story-and-presentation-clock.md)返工：
默认004现在只演示连续剧情，取消/错误use及慢读/存读分别独立执行；主壳两处混钟已修，作者正文完全未改。
当前六份真实case均已passed，同revision/source/各自同003前驱；Root逐项复算原字节和完整存读证据。
原both比较器曾错误拒绝浏览器advisory，已恢复原factory规则并只读重新汇总六份原回执，不改历史failed报告。
最新统一质量门与6012交付见下文；录屏/音轨和用户连续观感仍独立验收，历史通过记录不追溯改写。


2026-10-06：按用户要求删除剧情结束后的 `control-move` 测试走位；正文结束并恢复控制时原地收口，终点取执行器完成后的真实世界，不取最后路线采样。存读专项仍独立验证；下文历史回执中的尾部移动仅代表当时执行。

## 独立执行入口

```sh
pnpm e2e:004 --from /绝对路径/game-003/report.json --headless
pnpm e2e:004:reforge --from /绝对路径/reforge-003/report.json --headed
pnpm e2e:004:reforge:items --from /绝对路径/reforge-003/report.json --headless
pnpm e2e:004:reforge:saves --from /绝对路径/reforge-003/report.json --headless
pnpm e2e:004:both --game-report /绝对路径/game-003/report.json --reforge-report /绝对路径/reforge-003/report.json
```

第一阶段亦有`e2e:004:items`与`e2e:004:saves`；也可传`--case story|items|saves`，默认story。

| case | 独立范围 | 检查点合同 |
| --- | --- | --- |
| story | 正常取菜→送菜→菜单赠酒→完整40行→恢复控制权，不插专项或保存读档 | 仅live结束World/画面，不生成005前驱 |
| items | 从真实003正常取菜/送菜，验证取消与错误use不耗酒/不改绑定 | 酒仍1、道士可见；不冒充完整赠酒 |
| saves | 慢读姿态、端菜208中途存读、完整成功剧情末尾存读 | 唯一产生合法`004.end.save.json`的case |

只读收集实际位移提交/绘制/物品菜单cursor与节点/真实use dispatch；正常held导航和菜单输入。
源/工具/当前作者/档原字节冻结；正式保存与fresh空IDB读回，既不造物品也不直接启动剧情。
both全覆盖要求两引擎三case六份回执，同revision/source、同引擎同真实003原档；仅两份story不是完整both。

## 连续性修复与当前六case证据

最后邀约→隐藏→720ms dither→消失旁白的作者编排原样保留。原始709/710邀约、711隐藏、712溶解亦无尾部wait。
旧实跑二阶段hidden→旁白完整实绘17.334s，第一阶段约1.1s；源码dither起点/debug是real，渲染却减gameplay起点。
首次普通对白open亦误用gameplay，而render/advance一直是real，会在滞后后直接瞬显。仅main这两处恢复UI实钟，
不改字速、720ms/72步、预算后起算、GameplayClock、fade、世界暂停或NPC自动策略。
Root真主壳两counter双红→绿；独立11项含正常/长帧/世界单步/合法跳字与尾停顿/72步/预算/取消通过。

本轮Root六case冻结`9a488c02`，报告分别为`build/e2e/{game,reforge}-004-{story,items,saves}-2026-10-02T07-.../report.json`，
实际目录由`both-004-2026-10-02T07-09-29-171Z/comparison.json`的children列明。
原comparison保留failed；新`004-continuity-reviewed-suite.json`明确kind为
`receipt-model-only-revalidation-not-new-e2e`，不把收据复核改名为新演出。
Root独立核404来源（398 Git、6资产）、全部trace/四原档、完整World/Canvas及game两次save clone输入/成功ack。

- story两引擎40正文、各1空IDB上下文，全流程无取消/错误use/慢读/保存读档；正常移动已提交。
- items两引擎15前置正文、各1上下文，取消0dispatch，错误use1dispatch且库存/绑定保持。
- saves两引擎40正文、各3上下文，中途208及末档完整World/Canvas fresh相等；原保存硬门不减。
- 新实跑邀约完整实绘→消失旁白：game1.200s、Reforge1.217s；hidden→旁白为1.101/1.173s。
  RF尾dither prepare17.4ms，从预算起点到成功输出72步约733.8ms。实际像素过渡/旁白阅读时间不与隐藏提交混称。
- 正常确认热路径仅有界页/菜单/序号/error DTO，阶段结束仍dump全trace并做原硬断言；
  实际DOM输入与Node RPC分别记各自时间域，不把两域直接相减。旧3.25MB整tape不在每帧菜单/确认RPC搬运。
- 浏览器原始warning计数game story/items/saves为0/0/1，RF为2/1/2：可选state404与Canvas读回性能advisory。
  factory原协议保留warnings、拒绝engine/collector errors。新wrong `warnings===[]`是工具模型错误，已撤销；
  不新增过滤/ignore，不改Canvas后台或制造state文件，不宣称console零警告。静态零诊断硬门照常执行。

原PAL主壳单位夹具的外部Clock同步到RAF；原5业务/存读断言保持。夹具只索引本来已隔离执行的完整s001/s003，
真实生产loader/BDF/所有资源与5000ms/160预算保留，未索引但disk存在的s004正规loadScene明确失败。
此不代表缩小正式PAL工程；两次旧5000ms超时日志保留，完整统一门另核。

最新`004-continuity-full-quality.log`全仓pnpm check退出0：七包types及10971测试通过，
136 E2E工具、docs/coverage/quality工具门绿，lint2760文件0error/0warning/0info。技术返工独立accept；
正常演示/专项分离与一期观感对照现可交用户复验，不将capture或用户体验自动标为done。

## NPC正文归属与修复入口

用户明确开发者在NPC身上找、编辑和场景预览剧情。因此唯一赠酒正文仍留在s003/e62
“赠桂花酒：约定山神庙学剑”方案。桂花酒私有use只做面对守卫、选目标方案、显式发起并等待执行。
把成功正文搬到道具的旧设计已撤销，没有修改过作者JSON。

基线只有select/touch，而新touch扫描依赖playerMoved；静止使用缺可靠立即执行入口。
已补普通指令runEntityTrigger，复用目标当前方案/步骤游标和同一signal/activity lineage，
不是第三种步骤模型，也不恢复全局touch轮询/对话冻结/旧存档兼容。
自然交互距离由使用条件判断；显式调用不模拟互动键。busy/递归/异session等边界和scratch预览按任务卡硬反控。
仅interactive调用；auto直接/经共享调用、prepare明确拒绝。当前场景演出可用，切场/战斗须在调用返回后编排。
主壳与scratch使用同一项目运行桥；暂停/单步/停止有效，跨场景绑定只读解析，不加载别的地图或修改作者树。

后续1cf2e7f07冻结的`reforge-004-stationary-baseline-2026-10-02T03-21-56-707Z`已实际确认该反例：
正常取菜送菜/正式菜单use，party137,72朝下、e62137,73可见；已select赠酒/touch，但静止2秒无172、酒数组仍1。
Root复算400源和trace原字节、collector错误0；kind=counter-diagnostic/core=counter-confirmed，不能当RF004passed。
两个之前的failed分别为工具未落步、缺materialization提交采集；原失败保留，不错归到游戏脚本。
库存Array误读map已通过真实RF档/生产类型反控修正；来源固定唯一NPC正文，不保留private正文fallback。

显式调用aa340e033经独立审查另有两个结束边界counter，Root真实反控双红；07816dc52窄修cursor commit守卫与
scope registration后，同两反控/lineage/save相邻123项绿，编辑器完整PAL NPC/caller预览74项绿。
七包types/全仓lint2755文件零诊断；端菜preview持久sprite overlay额外16项绿。
作者内容46362585f与真实主壳回归c6bf58dd9已由Root接收。真实菜单取消/错误位置/静止有效使用、
端菜持久208、手动菜单存档/fresh恢复及送菜恢复普通外观共5项主壳回归通过；正式RF004另有实跑证据如下。

取菜跨交互的208外观应使用已支持的持久appearance，而不是仅存活于Map的setActorSprite。
003交接合同同步严格要求待取菜正文使用持久命令，结束尚未取菜、party未变；Root两文件回归19项红→绿。
厨房e19反复up/frame0的无用auto已退役；取菜显式朝下/第0帧，141/142结束后显式返做饭朝上/第0帧。
醉道士auto在喝酒姿态之前禁用，防后台动作覆盖。Root全树比较证明除六项批准改动与已核名称外，
其余对白/动作/速度/等待/方案去向原样保留；送菜e26六次nudge及12–15手势没有机械压缩。

## 当前Reforge正式证据

Root树的三个正式报告分别是`build/e2e/reforge-002-2026-10-02T03-56-55-009Z/report.json`、
`reforge-003-2026-10-02T04-02-01-367Z/report.json`、`reforge-004-2026-10-02T04-03-35-170Z/report.json`。
004冻结`e5b4326852e26a311f4ba38f1bee592987be6023`，使用本次真实003档
`3f5f74b90988273967988600c953767f71afa15e8ee425faf49ac06b4f02b0db`；不是编辑旧档或直跳剧情。

- 400来源项Stable，40正文/说话人完整，collector error0，3个fresh空IDB上下文。
- 李大娘取菜慢读朝下3013ms；真实保存/新上下文恢复仍端菜208，送完恢复普通外观。
- 取消零dispatch；错误位置正常use一条失败dispatch，不耗酒/推进；有效静止use一条成功dispatch，
  唯一NPC正文完整25行、只扣一次酒，喝酒/消失/大娘207及逍遥209后实际恢复移动。
- 末尾普通`commit:player.pos`137,72→136,72；实际保存与fresh恢复的完整持久域及同引擎Canvas相等。
- 端菜恢复后上下文109普通提交、40脚本/摆位提交；取菜前上下文另外保存，不误报为全004步数。
- 中途档/World SHA：`7dc6e7e1d5329a9547519f0e8acd7e35027d4ae5e1276c135e9c62523ec8f44c`；
  Canvas：`6533c1e4c31e1a9a1e218d21a160385b551f4bce9067f2d6ddc01062adeae067`。
- 终档/World SHA：`3c90ba17cbfeafd4f600a4d119e0216aa0d7bb2c0238ac596f59e1c046f6e867`；
  Canvas：`f19137a2c0c2712cf5325e0f96ddd91dfb2396b5d0a0c50302e14c9e49fe8fdf`。

Root逐项复算400源、三trace、两档原字节和World/Canvas，目视赠酒与端菜恢复截图；不以单测冒充像素验收。
003首次重跑只因JSON持久域与内存自有undefined字段比较错误而失败；严格比较所有可保存party字段后19回归绿，
旧失败保留。根因在测试合同，不改生产存档、不忽略已有持久值。

## 集中质量门与脚本合理化收据

`004-final-frozen-quality.log`全仓`pnpm check`退出0：七包typecheck/测试10957项通过，
lint2757文件0error/0warning/0info，docs/coverage/quality/E2E工具门通过。
其后只有新meal工具增量，最终126项及全仓lint零诊断另核（`004-final-atomic-root-{tests,lint}.log`）。
正常held导航已移除每步整份trace RPC；异常边界先松键再核本leg普通commit。两新增反控先双红再绿，
无目标提交的意外脚本/切场仍拒绝；RF与旧001–003导航不改。
两次更早全仓check因PAL引用golden落后于真实内容改动失败，原日志保留；Root只更新计数与真实语义见证，
地址总数38111不变，compiler/actor边界/worker硬门未放宽。作者工程294场景/223地图/1934资产校验通过。

编排审查结果：

- 改进：物品→NPC显式await，避免“切了方案还要玩家再走一步”；正文仍能在NPC场景预览。
- 改进：e19无意义姿态auto退役，由取菜正文表达转身和回身，不全局冻结NPC。
- 改进：端菜身份用持久appearance，普通存读和预览均支持，不新增save版本/兼容分支。
- 保留：送菜细动作与对白等待有现行演出依据，不用终点相同证明中途动作可删。
- 命名：实际经过8个门/触发区/物件及对应方案、步骤补用途名；内部ID与引用不变，后期未核内容不猜名。

004名称增量为8个实体、5个方案显示名、11个步骤名。正常流程执行了其中取菜/出厨房/楼梯/进出客房/送菜/赠酒；
e20“未受托时”及e62“端菜时讨酒”“客人退酒后复读”仅相邻正文核读，不写成额外E2E执行覆盖。

## 第一阶段正式重跑证据

贡献树`build/e2e/game-004-2026-10-02T05-39-02-763Z/report.json`冻结
`6ac5744060cc1a4cfce5fc3abc073c0fd22a8a90`。Root独立复算401来源项（395 Git、6资产）、三trace、两档，
完整World/Canvas与fresh恢复相等；实际F5同步clone输入与落盘payload视图逐字段相等，每次恰好一条成功ack。
3个空IDB上下文、40正文/说话人、3192ms取菜朝向、取消/错误站位/静止成功、完整赠酒与控制恢复均passed、error0。

- 正常客房入场已自然启动L469：本leg内e15真实hide提交，当前scene2/owner15/IP472，随后严格验完13行送菜；
  不能以inactive或已消失猜成功。末尾普通commit137,72→136,72；恢复端菜后上下文101普通/43脚本提交。
- 中途档SHA：`3c33c7d27ffb3ab91972868bd867e82f7b467fc84027985b923cd92860235c99`；World：
  `57e5e5d26acbfad9c09e04002113c5900b4c9bc605e42e6ad9a8a8b31b68a979`；Canvas：
  `9013abce736849a81b5b06eeeb028a0b77a6647c23dc6ca98a7a6aabf76ed056`。
- 终档SHA：`bf4a71868f71b51c2516cbbd16373490be2772f906334a8804ebc2c5802ac33e`；World：
  `98bf347be1b358b85a065a47bc47286848e1a1cd3d7fc4107d48b03675a096db`；Canvas：
  `c77ce1354d319cd06de28a3bfe90dd5b52c7bff5447a0591380a983e3d8b24d9`。

旧工具失败分别为save前采样被合法auto转向、touch像素足迹/目标接管窗口、held期间整traceRPC导致过时坐标、
以及送菜已启动后误读active足迹；原失败均保留。其后的同DOM原子取样窄修另核工具回归，
不修改上述报告的source/revision，也不冒称当前工具另有一份完整剧情报告。
最终工具fd377664d（Root89bc9b5e5）已独立接收：active同快照冻结真实足迹，inactive才读取本leg启动证明，
126工具/完整lint零诊断，真实05-39 trace入口回放通过；仅采样表达窄修，不重复既有剧情视觉验收。

## 第一阶段历史候选证据

工具初稿02b270e7745aed2bc0f1fa4eb510cd79be007453；4e1a5ab7965c1e40262a4677c65a3203d3ef5051
修正trace落盘同字节哈希。首份通过回执保留原样，不追溯改写。

最终game报告在贡献树`build/e2e/game-004-2026-10-02T02-34-30-900Z/report.json`，冻结4e1a5ab79。
Root独立复算391来源项（385对应冻结Git字节、6资产当前原字节）、三trace哈希、两档原字节、
完整持久域及Canvas读回相等；实际检查赠酒和恢复端菜截图。

- 3空IDB上下文；真实003前驱，40正文/说话人完整，error0，sourceHashesStable=true。
- 取菜时李大娘朝下3032ms；中途F5→fresh标题读档仍绘制208，送完恢复普通2。
- 取消零dispatch；远离道士正常use一条失败dispatch/提示、不改库存/trigger；
  有效静止use恰好一条成功dispatch，完整25行赠酒、唯一扣酒、消失、207/209结束。
- 末尾正常方向键真实commit:tickSceneInput，137,72→136,72；正式F5及fresh读回相等。
- 恢复端菜后的上下文含102普通提交、43脚本/摆位提交；取菜前上下文另外保留，不误称102为全004总步数。
- 终档SHA：fbaf7402cd31e2611eb549edd93e2df61d8afde56b616830e3233a729abf185a。
- 结束/恢复World：d34cfbb8c4f71e9cec0de7c485a4a57dd9203eec881ad4de5f4eee9f040cb0d4。
- 结束/恢复Canvas：c77ce1354d319cd06de28a3bfe90dd5b52c7bff5447a0591380a983e3d8b24d9。

工具独立复核发现“private有成功正文便跳过NPC来源”仍接受已撤销设计；ff2b3ac166410dc5457fed6a4fb823c80b88bc92
窄返工固定唯一NPC正文，复制/搬家/缺NPC/私有耗酒/额外对白反控红→绿。
上述game报告不改工具revision；新冻结正式运行另出新回执，不给历史回执换SHA。

## 6012交付与另排

- 用户确认无草稿后，main安全ff到c46a458d2，6012原服务PID88523不重启，原Chrome页正常刷新一次。
  已选择s003/e62→交互脚本→“赠桂花酒：约定山神庙学剑”，实际播放到首句后reset就绪；保存禁用且作者树零写回。
  截图保存在main的`build/e2e/004-editor-delivery/6012-npc-owned-gift.png`，Root已目视；页面继续打开供用户查看。
- 当前game正式重跑及最终工具窄修独立接收；旧失败记录不删除。
- 用户判断命名/可编辑性与剧情观感；001–003既有流程无需重新验一遍。
- capture视频与音轨另排，技术verify不自动证明capture；本节交付时005尚未定义，现行买虾至报信范围及实跑见[005回执](../005-shrimp/report.md)。
