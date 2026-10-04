---
testingSchema: 2
id: e2e-002
evidence: e2e/evidence/e2e-002.json
---

# 002 — 客栈路线、住客与赏银核心

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-002","sourceRefs":[{"path":"scripts/e2e/inn-both.mjs","lines":"1-85"},{"path":"projects/pal/content/scenes/s001.json","lines":"299-332"},{"path":"projects/pal/content/scenes/s003.json","lines":"835-1242"}],"publicCallers":["pnpm e2e:002","pnpm e2e:002:reforge","pnpm e2e:002:both"],"legalInputs":["same-engine current 001 end save","normal movement into s003/e56","isolated fresh restore context"],"businessOracle":{"type":"inn-guest-reward-and-restore","assertions":["20 dialogue rows","cash 0→500","three guests enter and restore"]},"dedupe":{"result":"renamed-and-reviewed","against":["e2e-001","e2e-003","legacy path docs/testing/e2e/stages/002-inn-guests-and-reward"],"notes":"e56/s003 remain sourceRefs only"},"revision":{"currentSha":"9d15218b","contentVersion":21,"minimumSaveVersion":10,"currentVersion":{"content":22,"minimumSave":11},"history":["2026-10-02 verify","2026-10-04 semantic rename and metadata audit"]},"evidence":"e2e/evidence/e2e-002.json"}
-->

002 双引擎 verify 已收口：正常路线、核心编排、真实存读档与恢复画面通过，全仓质量门零诊断。实现准入与完整前提见
[子卡](../../../../ops/archive/tasks/done/E2E-002-1-inn-route-and-trio.md)，后续全局范围见
[母卡](../../../../ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md)。

2026-10-02脚本治理后，当前二阶段检查点使用[本轮重建链](../../../script-governance/current-checkpoints.md)。
下文各轮目录、版本与数字仍是历史原始证据，不自动成为新内容的可加载前驱。

## 用户边界与两块验证

用户 2026-09-30 钉定 `s003/e56` 靠近触发长脚本是 002 核心；从 001 李逍遥房间正常走到
触发区是另一个要解决的问题。执行器须分别报告，不以跳场景后的演出替代完整路线。

- 路线准入：各自真实 passed 001 结束档 → 正式恢复 → 正常输入经过 s001/e3 门 → s003
  默认入口 → 靠近 e56。两引擎各用自己的碰撞/距离模型，超限、无进展或未知场景失败关闭。
- 核心演出：首 stage 20 行正文/说话人 → 实际 cash 0→500 与奖励文字 → 三苗人真实进房、
  房内替身出现、原实体隐藏 → 脚本阶段提交与控制恢复 → 真实结束档 → 新上下文正式读回。

本轮正文 TextId 为 `25,27,29,30,32,33,34,36,37,38,40,41,43,45,46,47,49,50,51,53`。
`dlg.54` 属于 e56 下一次激活，不能混入本轮对白矩阵。

## 证据基线

2026-10-01自动脚本保存修复使用SAVE10/content21；后续RF002必须消费新版本正常实跑的RF001前驱。
下列SAVE9及更早回执均是历史证据，不改原字节/版本，不升级后喂给当前执行器。

- 原始数据：`data/extracted/events/all.json` 的 L_285，首次正文至 advance end；
  L_406/L_411/L_420 分别是三人进房动作链。Codex 与贡献者已各自直接读取。
- 作者内容：`projects/pal/content/scenes/s001.json:299/332` 出口；
  `projects/pal/content/scenes/s003.json:835/1242` 首次触发与实际 500 文；
  `:6312/7681/9181` 三人被选中的 auto/legacy-003。
- 前驱：game仍使用真实 `build/e2e/game-001-2026-09-28T04-14-33-487Z`。
  Reforge因canonical切换当前content21/SAVE9，已正常执行001生成
  `build/e2e/reforge-001-2026-09-30T15-05-01-983Z`（passed）；不得升级历史001档冒充新前驱。
  旧Sept28回执原样保留。002须记录自己的内容/执行器/输入摘要。
- 既有 001 collector 限 s000/s001 与房间角色；002 须独立观测实际提交与呈现，
  不能改字段名后直接套用 001 的通过结论。

## 脚本编排审查（源码、实际时序与最终恢复已核）

### 三苗人移动表达：已有目标坐标＋速度

被选中的 e59/e60/e61 auto 使用 `moveEntity` 的 `to` 与 `speed:'slow'`，不是移动时长。
宿主只在真实终点提交后兑现 Promise，后续隐藏本身不需要再猜走路耗时。
`packages/content/src/author-script-core.ts:188`、`packages/reforge/src/main.ts:2910`、
`entity-walk.ts:13` 为对应语义；slow 还有休拍，不能用“距离÷固定时长”冒充生产运动。

保留坐标＋速度。每人各自走完整路线再隐藏，已有独立 auto 可以表达并行离场；
本段并没有“必须三人一起到齐才进行下一步”的已核剧情要求，故暂不引入 parallel/join。
若实证有多人汇合要求而当前合同无法表达，再另开能力设计和列表可视化任务。

### 离场启动与说话者：已证差异，按一阶段编排修正

e56 在首领 `dlg.32` 开口之前就选中三人的离场 auto，再 wait600。
第一阶段 `packages/game/src/core/mode.ts:29–47` 在对白 typing/wait-key 期间暂停 auto；
Reforge `packages/reforge/src/main.ts:2710/3749` 允许普通 NPC 在对白时继续移动。
因此同一低层派发顺序在新模型中可能表现为“首领已经进房/隐藏，仍在交代和给赏银”。

首轮正常确认实跑已证：RF e59 在 15.243s 隐藏（order176），`dlg.45–47` 全显为
14.748s/order164，逍遥谢赏 `dlg.49–50` 全显为 15.283s/order177，奖励提示为
15.350s/order181。因此本次头领交代赏银时仍在场，但谢赏/钱到帐时已进房。
game e59 隐藏为 26.318s/order185，晚于 `dlg.53` 全显的 23.618s/order130。
这证明了两套对白调度下的实际离场差异，不应夸大成此次 RF 首领第一句开口时已消失。

Codex 已直接读取两 trace 并看 RF 首领/奖励截图；首轮产物为隔离树
`build/e2e/*002-2026-09-30T08-54-21-859Z`。该轮工具尚未冻结、两个 report 都正确标 failed：
RF 说话人 locale key 尚未解码，game 缺 blocker push 提交点与 narration 实绘分支，
这些是观测器待补项，不是产品修复或通过证据。不得把失败产物冒称完整对白矩阵已绿。

进一步核第一阶段实际 trace：三人首次移动分别为 order62/72/70；`dlg.32` 全显为
order95，此时坐标为 e59 `(1248,1360)`、e60 `(1204,1322)`、e61 `(1176,1332)`。
至 `dlg.45` 全显 order104，坐标完全相同，期间没有提交移动；`dlg.53` 全显 order130
时三人又分别到 `(1264,1352)`、`(1224,1332)`、`(1192,1324)`，仍全可见。
所以顺序是“先起步 → 交谈暂停 → 赏银后的短等待继续走 → 最后一句暂停 → 关闭后离场”，
不是“三人全部等最后一句后才起步”。这些是同一首轮实跑记录，不追加重复巡检。

2026-09-30 用户指出应先参考一阶段，不应让用户重新选择已存在的演出。
Codex 撤回先前产品选择和机械搬尾部建议，按已核 UX 修正，见
[窄作者卡](../../../../ops/archive/tasks/done/E2E-002-CHOREO-1-trio-dialogue-authority.md)：保留三人 auto 派发、
原路线/速度和起步 wait600；`dlg.32` 前显式 take 三位参与者，奖励 `dlg.51` 关闭后 release；
原 wait320/转身/wait40 后，`dlg.53` 前再次 take，关闭后 release。
只用既有命令，不冻结全局 NPC、不恢复原版转换器、不新增 parallel/join 或估时等待。
修正后的正常读与32/53各3秒停读、短等待续走、真实进房与实际保存已验证；
最终持久World与Canvas正式读回均严格相同，见下方最终回执。此前两轮 failed 保留为历史证据。

### 李大娘 46 状态：重复展开，不等于可机械替换

e56 auto/legacy-006 是 cadence transition 的 46 状态机器，包含 12 轮
“nudge(5,5)+anim → nudge(3,3)+anim → advance”展开，再接后续目标移动与触发选择。
像素增量在 `main.ts:2431` 转换成小数格坐标；它并不是两次普通向某方向迈步。
12 轮理论总增量从 `(122,49)` 到 `(131,52)`；最终冻结 trace 的24次 `commit:e.pos`
确实从 `(122,49)` 经首步 `(122.46875,49.15625)` 到 `(131,52)`，随后正式目标移动至 `(137,66)`。
证据为 RF002 `16-31-19-969Z/inn-trace.json` 中 e56 的实际位置提交，不是采样位置写入。

建议方向是用可读的走廊/楼梯/厨房路径意图组织正文，消除机械展开和 opaque 标签。
但单个 moveEntity 的轴向步进、朝向、动画、节拍及安全点可能不同，不能只据最终坐标替换。
本轮保留并已采集实际轨迹；当前只证明路线与结束状态正确，未证明可替换的中间动画/节拍等价。
后续路径表达候选须逐段核上述差异，再另开窄作者/能力任务；不把002通过说成46状态已全部现代化。

### 开门表达：改用持久页面意图

e60进房链与两门交互原来用瞬态 `setEntityFrame(1)` 表示已打开，正式恢复清除呈现Map后变回关闭帧。
已核全部18条实体引用及三处开门链，按既有模型将六个定帧叶替换为 `selectEntityPage(use open)`；
sprite53/54各声明单帧、无cue、nonloop的open动作。默认页仍关闭，open页仍绑定原default交互，
状态/碰撞、原命令位置和其它演出不变。持久的是“门已打开”意图，而非所有临时帧。
见[门卡](../../../../ops/archive/tasks/done/E2E-002-DOOR-1-persistent-open-presentation.md)。未新增schema/save兼容层或关门剧情。

本段结论：坐标＋速度及独立auto并行保留；局部接管与持久开门已改进；等待和零位移边界保留；
大娘低层路径作为有证据的后续候选，不机械压成一个move，不新增parallel/join或大改列表结构。

### 等待、零位移与奖励边界

- e56 的 wait400/600 与三人的 wait80/160 先按原始调用域核节拍/错峰目的，
  不笼统称为冗余，不用更大 wait 掩盖异步关系。
- e60 首个目标 `(119,45)` 等于静态初始位置，仍参与真实终点结算/接触顺序；
  `main.ts:3396` 明确保留该边界。不能仅因没有可见位移就直接删除。
- 500 文在真实 giveMoney 命令提交，不由奖励提示代替；stage next 决定下次激活。
  完成条件必须核一次性加钱、正确 cursor 与读回，不能只看最后一行对白。
- e54/e55 消隐和 e73/e74 门精灵出现属于本轮配套演出；门精灵不是新增/重复苗人角色。

## 实际验证与未完成项

- 工具独立交付并由Codex直接复核，新增页动作观测反控后当前57项；未知采样/缺锚/顺序错误均失败关闭。
- 作者接管与SAVE-v2窄修已集成；最终冻结完整 `pnpm check` 10648项通过，
  lint2703文件0 errors/0 warnings/0 infos；工具后续提交点窄改56项单列，不冒称重复完整门。
- Codex已直接核最终正式字节/hash/轨迹/提交点，并看首领、奖励、最后一句及结束/恢复画面；
  门瞬态frame读回丢失已修，最终002 passed，最后全仓门通过见下方。
- 执行器不改作者/产品内容；已证缺陷独立卡核定，不恢复原版转换核。
- capture 音轨、003 以后与完整 Q1/Q2 不借本段关闭。

### 当前正式链（2026-10-01；历史失败不改写）

- RF001 `15-05-01-983Z`：revision b83faa50；55行/24cue，原始SAVE9/content21档SHA
  `4104d7c3540f523d9b42dc062ac32db2c716edee0fe3a7da65f9f8bd4dfabcfc`；
  fresh-context实际World与Canvas均严格相同，passed。Codex独立核原始字节及结束图。
- RF002首次 `15-07-24-839Z`：正常28步route、20正文、实际0→500、三人真实起步/暂停/续走/隐藏
  passed；32/53实际停读3027/3031ms位置稳定且仍可见；生产保存15ms。
  fresh-context已loaded，但晚到二次dump等待553ms期间正常e62循环推进，原报告failed并保留。
- 只修工具取证域`9d15218b`：成功restorePayload唯一startAutoRunners之前读真实World payload，
  核直接成功tail顺序/无await、有界深克隆、唯一提交；不取原档/p/candidate作观测。
  提交全量openingSaveView严格比原档；晚到postResumeWorld全量另存，所有游标不删、世界不暂停。
  Root直接读五文件diff并独立重跑56项；499实际钱但原档/晚World500、缺/重复/前移/await锚全部拒绝。
- RF002第二轮 `15-29-25-294Z`：revision9d15218b，执行
  `pnpm e2e:002:reforge --headless --hold-leader --from build/e2e/reforge-001-2026-09-30T15-05-01-983Z/report.json`。
  route/core/实际三人编排保持通过；正式barrier13ms、fresh-context loaded，成功恢复提交点
  全量持久World（钱/位置/所有游标/completed）严格相等。原始002档SHA
  `3b444c4856fdde4e8491ce3c66d5debb76f8c9b406a3228d86aec333f4f0beef`。
- 第二轮整体仍failed：waitForOpeningFrame原10000ms内Canvas未与结束帧相等。
  end/restore e73/e74同pos/state1/visible/sprite，但frame1→0；Codex实际看`002-end.png`和`failure.png`，
  门从打开变为关闭。生产setEntityFrame仅写瞬态Map，正式restore的abortScript清除此Map。
  修复候选为持久门page/action意图，须先核所有调用方，见
  [E2E-002-DOOR-1](../../../../ops/archive/tasks/done/E2E-002-DOOR-1-persistent-open-presentation.md)；不得过滤门像素或放宽阈值。
- 两轮原始回执和当前001均已复制到main同名`build/e2e/`；RF正式链使用生产dumpSave，
  不冒称浏览器F5。真实F5/F9由`main.auto-save-flows.test.ts`6项正式主壳回归单独证明。
- 主树集成`fc1d5804`后typecheck/严格lint/作者检查与相邻编辑器81项通过；6012保持运行。
  002及母任务未收口；当前不重跑同一失败视觉流程，待门修复冻结后最终验收。

### 最终正式回执（2026-10-01）

- 第一阶段正式 `build/e2e/game-002-2026-09-30T09-06-32-906Z` passed，revision `0869a707`：
  本引擎真实001档正常28步路线、20行、0→500、三人终点/隐藏、F5真实快存及新上下文标题槽位读回通过。
  原档SHA `4c6e7c9af68013952789a2a977c90c8cc8ccc0a2a72dbd47fee61c13aff3af19`；
  全持久域通过、320×200结束/恢复Canvas同SHA
  `b66199d84496f4dc82a15478dd4e4c0be736dfd68303dd44b3ff7d1cebf6a194`（49157非黑像素）。
  Root直接读原档/trace并看两图，七个已记录game源码hash与当前相同；RF内容/版本和其后窄工具改动
  不冒称旧report全部hash相同。后续不重复已通过一阶段视觉流程。
- Reforge正式 `build/e2e/reforge-002-2026-09-30T16-31-19-969Z` passed，冻结revision `4fc15826`：
  当前SAVE9/content21真实RF001 `15-05-01-983Z` → 正常28步 → s003/e56首次触发。
  20行/说话人全部实绘、0→500，32/53停读3045/3024ms三人可见同坐标且局部接管；
  保留先起步、交谈暂停、赏银短停顿续走、最后一句暂停、关闭后各自进房的偏序。
  三人真实终点e59(124,42)、e60(134,43)、e61(133,43)后隐藏，房内e24/e25/e26 state2，
  三人auto cursor completed，控制权恢复；不手工隐藏、不跳场景或伪造世界。
- 正式生产保存屏障195ms（原timeout10000ms未改），真实002档SHA
  `42ac15aff0719f8f11b3f59d6001266c59e2075c715d616f5c75985bcfb0136f`。
  新浏览器/新IndexedDB正式restore loaded；唯一真实成功提交点全量openingSaveView与原档严格相同，
  晚到postResumeWorld另存且e62正常推进。RF浏览器使用生产dumpSave，不称浏览器F5。
- 两门结束/恢复均page open/frame1；1280×800 Canvas同SHA
  `90e49d7cc22b1a454d250a54ca7447fde8cefc3452c239e2b5320bcd72612400`（723264非黑像素）。
  该结束SHA亦与此前门失败轮的结束画面相同，改进没有改保存前观感。
  Root逐一核49源hash及原档字节，实际看首领/奖励/最后句与两图；没有屏蔽门像素或改变采样合同。
  runtime errors0；仅隔离新局缺可选`.type-pal/save-state.json`的404 warning，非硬性静态诊断。
- 门回归7项与邻接46项绿，覆盖真实主壳F5/F9与普通临时帧仍清除；小地图fixture包含11帧合成资产
  适配，e60仅抽6条开门段，完整链/PAL像素由上述正式E2E另证。工具新增fallback反控保持override0优先。
  非作者独立accept `4fc15826`；编辑器引用同步followup `3feb5a77` 独立accept：+2动作/+2行为/+2父alias，
  精确身份断言与原parity/删除阻挡/payload上限均保留。followup不改49个冻结E2E源文件。
- 第一次完整check因旧editor census385→387失败，原日志保留；窄同步1/1绿、editor typecheck零诊断、
  lint2704文件零诊断。重新冻结`3feb5a77`完整`pnpm check` exit0（`door-20261001/check-final-v2.log`）：
  game1224、pal-extract128、content2773、platform357、Reforge2031、editor3692、migrate450，
  共10655项全绿；E2E工具57项、docs工具37项及其余工具门通过，lint2704文件0 error/warning/info。
  没有降低规则或新增排除；随后只有回执/归档文档改动，另核docs/lint。

Root最终accept、四张002子卡done归档；母卡与完成表达用户检视卡不借此关闭。
主树fast-forward到`74848291`后全包typecheck、严格lint、docs及PAL作者工程检查再次通过；
49个冻结E2E源hash与主树逐一相同，1933个migrated资产及113个证据文件复制后逐字节hash相同。
`build/e2e/door-20261001/main-*.log`记录集成门；完整包测试仍明确来自冻结候选，不冒称又跑了一轮。
6012持续HTTP200、页面工程已保存；没有关闭/重启服务或刷新用户当前页面，作者新页可在用户刷新后检视。

本段已形成各自真实001→002 checkpoint链；003边界/后续runner、capture录像音轨和完整Q1/Q2仍未完成。

## 演示反馈后续：主角遮挡与连续输入（2026-10-01）

用户批准只当前受控主角主动触发前景透明，NPC/队友/编外跟随者仍保留普通深度遮挡；
沿用整块瓦片透明和120ms迟滞，主角触发的同一块墙可能顺带显露NPC，不是NPC本体alpha。
本轮不改运行时100ms格步、不加插值、不动作者脚本或6012编辑器。
见[反馈卡](../../../../ops/archive/tasks/done/E2E-002-FEEDBACK-1-player-occlusion-and-held-input.md)，隔离分支
`codex/002-feedback`；代码复核accept，用户体验pending，未集成main。

- 真实输入从逐格down/up改为同向持续held，转向/已观察到场景或脚本接管时释放，失败时有界清理。
  路由仍读实际位置与动态障碍重规划；慢轮询可跨格，route.steps只称进度样本，不补造中间格。
  原始commit另存；恢复提交排除、切场落点单列。game先在旧scene用0x46落点，RF在新scene落点，
  分类必须核提交域与ready-scene段边界，不只看位置差或source单字段。
- 中间 `012a87bd` RF `23-06-43-433Z` 原报告failed，保留：控制已恢复且snapshot三人hidden，
  collector仍停在e61终点visible=true。结束采集已加强等待真实三人hidden/替身visible/500/control，
  不增加总预算、不篡改World、不放宽原57项对白/奖励/保存/恢复合同；新增反控后全工具71项绿。
- 最终冻结 `10e65063`：RF headed `build/e2e/reforge-002-2026-09-30T23-09-35-990Z`、
  game headless `build/e2e/game-002-2026-09-30T23-09-37-718Z` 均passed，均从各自真实001前驱正常进入e56。
  各28次正常输入提交＋1切场落点；各只两对down/up，没有逐格松键。
  RF Down1037ms/Left1709ms，实际格步间隔91.5–111ms、中位100ms；仍不是60fps平滑移动的证明。
- 两引擎20正文/说话人、0→500、32/53各3秒停读、真实三人进房/隐藏、控制恢复、生产存档及
  fresh-context持久World/Canvas严格恢复全通过。RF使用production dumpSave，game为F5实际快槽。
  实际档SHA分别为 `42ac15aff0719f8f11b3f59d6001266c59e2075c715d616f5c75985bcfb0136f`、
  `b5db78c6e09bebd543b859b9b29ad07bf728a5f4980d84459dd7aa3b6b0ac7aa`。
  Root逐一核51个source hash及档字节、实际看RF结束/恢复两图（Canvas SHA仍与上述正式基线相同）。
  runtime errors0；RF可选save-state.json的404 warning保留，不冒称全浏览器日志零消息。
- 6051保留修正版试玩，已从同字节真实RF001档恢复到房间，可直接持续方向输入继续002；
  6012仍HTTP200，未重启或刷新。用户体验和后续全局E2E不借本轮自动关闭。
- 全仓check exit0：10658包测试通过，typecheck零诊断、lint2706文件0 errors/0 warnings/0 infos。
  完整check启动后仅CLI工具继续窄修，packages未变；该次工具门69项，最终工具71项、docs37项和严格lint
  分别补核通过，不冒称最后CLI提交又重复完整包测试。原资源复制层级错误的5项ENOENT失败日志保留。
  独立代码与实际回执均accept；证据/log在隔离树 `build/e2e/feedback-20261001/`，用户体验仍pending。
