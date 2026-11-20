# 作者脚本与运行时合同

Status: current
Owner: Codex（规格维护）
Last reviewed: 2026-11-20
Template: design-spec-v1 / 1.0.0

## 问题与目标

本页规定canonical作者脚本的身份、步骤、命令根和运行态所有权。方案区分剧情时期，步骤区分首次/再次激活与复读，一次走路、转向、对白、选择和等待留在同一步。恢复原稿的现行合同用途，不因旧R33历史封套重新开放机器状态编辑或旧转换器。

## 真值与约束

当前内容contentVersion 23 / SAVE12，版本常量与[内容格式](content-schema.md)分轴；作者类型和guard来自[author-script-core](../../../packages/content/src/author-script-core.ts)，实体子调用来自[当前project runtime](../../../packages/reforge/src/runtime-script-project.ts)。具体场景的运行和预览由任务回执、合法输入和实跑证据证明。

实体地址必须是EntityAddress{scene,entity}；实例label、人物名和精灵名只显示，不替代稳定id或合并同名实体。PageId选择外观/触发/具名BehaviorId，不内嵌匿名脚本；onEnter/onTeleport各有HookId registry及initial选择，切换走显式selectSceneHooks。跨处复用只进AuthorScriptLibrary共享库，callScript只存稳定script和可选复合self，不带chunk提示。物品私有脚本归单件物品，复杂NPC剧情回其具名方案，不复制到物品或等玩家再移动触发。

## 方案

### 步骤与命令根

| 构造 | 正常语义 | 拒绝/边界 |
|---|---|---|
| flow.kind=stages、initial、stages[] | 稳定StageId和作者label分开；每步body、可选next | initial/next须命中稳定ID；不能按数组下标持久化身份 |
| 省略next / StageId / complete | 分别下次仍本步、下次指定步、方案完成 | next不是本次立即执行下一步 |
| finishStep{next:stay/stage/complete} | 原子结束本次步骤并指定下次去向 | 只在flow步骤正文/结构子树；无self不等于非flow；共享/私有/prepare不允许 |
| returnScript | 返回当前独立共享/私有命令根，调用方步骤不变 | 不能代替finishStep，也不跨根break/continue |
| confirm | yes/no臂结束后继续下方正文 | 结束整步必须显式finishStep，不造commandOutcome状态映射 |
| repeat / while / until / forever | 正安全整数次数 / 前测 / 后测 / 明确长期循环 | break最近循环；continue可按同根词法祖先loop id，非祖先/同级/跨根拒绝 |

有名循环仅在内层需指向外层时使用，复制重映射内部引用，移动后非法祖先引用不能静默保存。步骤列表单步/多步均完整显示；label不写入执行树身份，选择方案卡只选编辑/预览对象，不改变游戏运行态。

选择真正变更才推进owner epoch；同有效方案保留游标，换方案从initial重新开始。completed保留绑定但不再获取执行权；取消、过期epoch、settlement gate失败或未返回子调用不能制造完成。编译器只产内存/可删缓存执行树，compilerVersion/content digest不是作者机器状态；SAVE12续跑绑定同一digest，执行序号不能变为内容对象ID。

### 四类类型化取物流程

content23 作者树支持内联 `grantReward`（剧情奖励）及实体 trigger 专用 `flow.kind: acquisition`。后者使用固定 `builtin/item/chest`、`builtin/item/pickup`、`builtin/item/search` 名称与参数；不能挂到 auto、场景 hook、共享或物品私有根。物品/金钱奖励是有序非空列表，数量为正安全整数，物品、声音及自定义提示引用均按真实参数路径校验。

参数是唯一作者真值。`expandAuthorScriptTree` 与 `resolveAuthorDialogueTree` 共用展开遍历，运行态、编辑器预览及显式脱离最终使用同一 `expandAcquisitionFlow` / `expandGrantReward` 实现。运行态仍消费普通 stages 和叶子指令，存档延用 SAVE12 的 owner/cursor；不新增全局领取表或 recipe 运行指令。稳定 available/collected 步骤 ID 维护既有预览绑定和逐步台账，生成位置不冒充作者参数地址。

宝箱开盖后发奖，游标转到空箱步骤；拾取先隐藏实体，提示/发奖后完成方案；搜刮可在提示/发奖后停用本点，或保持可调查并转空反馈步骤。剧情奖励不自行决定外层剧情重复策略。提示分标准、静默、自定义，非静默必须明确 before/after；标准按奖励顺序生成独立对话，显式奖励行引用物品名称 TextId/数量或金钱数量，由显示层本地化，不使用魔法字符、伪文本 ID 或运行时额外发奖。特殊多次调查箱继续使用普通独立脚本。

业务参数、作者操作及受影响 E2E 范围见[作者指南](../guides/shared-script-author-guide.md#四类取物流程)与 [N6b 任务](../../tasks/cards/N6B-ITEM-FLOWS-1.md)。

### 显式交互与场景呈现

runEntityTrigger{target:{scene,entity}}等待目标当前trigger/当前步骤结束，不切方案/重置游标，也不模拟自然距离、按键或触碰。只允许interactive链；auto经共享调用也不行，prepare禁止。子self是目标，父self返回不变，共用同signal/host与真实活动lineage；busy/递归、缺目标、永久removed或异场景明确失败，无绑定/禁用/completed才是no-op，隐藏不等于removed。

子链在同场景session内，直接/间接loadScene、loadLastSave、quitToTitle、gameOver、teleportOut、startBattle都须在副作用前拒绝；需要这些效果时放在调用返回后。session替换取消旧父/子尾，最终派发和游标提交仍核signal/session，不新增存档调用栈或parallel/join。

场景切换 `loadScene` 通过 `entryId` 指定命名落点，或通过 `pos` 指定临时坐标。省略二者时用目标默认落点。`pos: 'current'` 用于原地换景，切换事务在等待资源前取得队伍当前脚点、朝向及跟随轨迹，目标第一次揭示就使用该落点。目标入场准备仍可明确安排新的位置和动作。编辑器预览用同一落点解析，`entryId` 与 `pos` 互斥。 [场景入场指南](../guides/scene-entry-authoring.md)

onEnter 的各步骤可声明 `entry{prepare,reveal}`。切场时根据目标 onEnter 当前游标选择入场步骤，回访时沿用已推进的游标。默认先准备目标画面，揭示完成后开始正文。需要角色在淡入期间完成演出时，为 fade 揭示设置 `withBody: true`。准备结束后，淡入和正文共享本次入场 runner 的生命周期，步骤收尾等待两者结束。移动、定姿和对白的先后关系由正文编排。onTeleport、实体行为、共享及物品私有脚本不能声明 entry。 [场景入场指南](../guides/scene-entry-authoring.md)

剧情内 `startBattle` 由正在执行的脚本持有，使用真实世界画面作入场底帧。剧情战与明雷共用实绘后的结算按键门。首领经验页在 5.5 秒后自动继续，其余奖励页等 3 秒。原盘败北地址与自然后继相同的关卡，只在同一位置保留一份续段。作者可在战斗对白演出中使用「清除对话框」主动清除已留显的上、下槽。敌方逃跑先完成撤离演出，当前演出脚本可继续显示 1.4 秒自动关闭的中央旁白并回到场景后续。 [双端验证](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-15-敌方逃跑剧情必败与战后存读)

场景入场步骤结束后重新激活目标场景的自动行为，物品脚本切场也经过同一收尾。恢复的等待绑定原自动游标。入场步骤切换有效行为时，新方案从自己的指令开始计时。

### 姿态、condition与时间

- `setEntityFacing` 和 `setEntityFrame` 的具体目标使用 `EntityAddress`。共享脚本声明 `self: 'required'` 时，这两条指令可在正文及其嵌套分支中选 `target: 'self'`。调用点显式传入的 `callScript.self` 优先，否则继承调用上下文。缺少调用实体会拒绝调用。解析后的姿态目标遵守现有场景与自动行为的权限约束；其它正文根仍须给出具体地址。
- takeEntity暂停目标自身整条auto执行链，包括剩余等待、结构判断及由该链驱动的跨实体动作；release接原进度而非重启。已加载资源可完成，但暂停时不能提交效果；其他实体链不被全局冻结，对目标移动/姿态仍受其权威控制。原2026-10-07醉道士对白确认仅属该合同来源，不是本轮E2E。
- faceEntityToParty是显式执行时实时坐标转向，同点保方向、异场景无现场副作用；不移动、不停步、不定帧、不接管。对白不隐式接管或朝向修正，需要时作者编排take→face→setFrame→dialog→release，恢复工作朝向也显式写。
- `setPartyFacing` 默认点名队长；`member` 选择当前队伍里的一个成员。跟随者的显式站姿挂在该角色实例上，不改变队长朝向、轨迹或其他成员。实际走位、队伍队形重排、切场景或强停后回到当前队形的姿势。编辑器的单队长预览不代替跟随者实绘，也不让跟随者命令改变队长。
- `setParty` 变更成员时沿用同一队首的现有移动轨迹，新队员按该轨迹取得第一帧坐标和朝向。更换队首时从当前脚点和朝向建立队形。
- 前景 `sceneTimeline` 把一次性多角色动作放在同一步骤。各轨道有稳定 ID 和名字；实体轨只安排指定实体的转向、定姿、步态和微步，无实体目标的灯光轨只安排淡变。各 cue 按同一游戏时钟的毫秒位置执行，可有限重复。同拍的角色命令依作者顺序提交；淡变可并行，下一正文命令须等剩余 cue 和淡变均结束。取消时收回淡变并取消未执行 cue。该结构不进入自动、准备或独立脚本根。
- applyActorCondition/clearActorCondition引用稳定ActorId，目标必须已在party/reserve且唯一；setParty只改阵容。施毒走显式必中合同，定时状态排除puppet且回合1..999，坏状态不刷新、好状态取更长且不施给倒下角色；脚本不复制condition owner或让世界自行衰减。
- `setActorAppearance` 加载新资源后更新活动队伍或队外保留的角色实例。角色离队时可先设定持久形象，随后携带该形象入队。
- 前景步骤的有限 `repeat` 可选 `intervalMs`。第一轮立即开始；后续轮次以第一轮的游戏时钟为锚，按指定间隔启动。上一轮须执行完，过期的轮次至少等下一绘制拍，不在同一拍追赶。末轮完成即退出；站定、转身等额外停顿显式写在循环之后。该选项不用于可保存续跑的自动行为或独立脚本根。
- 指令只有明确等待/真实异步动作消耗游戏时间；节拍由正文repeat/loop/wait表达，不给每条auto加100ms、循环强塞世界拍或步后40ms。零时间循环用工作量保护，不限制正常巡逻累计寿命；公平yield/已兑现Promise/wait0不算真实进展，技术计数不暴露成作者状态。

多帧 `cameraPan` 的步数以探索帧为单位。首个合格运行帧推进第一步，后续每到 100 毫秒推进一步，帧间延迟时依次经过中间位置。前景游标等最后位置提交到场景绘制后继续正文。换镜、淡入等段落需要清除旧对白时，作者在相应时点显式使用 `clearDialog`。实际镜头终点、时长和转场对白层分别核对。 [镜头推进](../../../packages/reforge/src/world-camera.ts) · [原盘相对镜头](../../../reference/sdlpal/script.c#L2358-L2377) · [009 任务卡](../../tasks/cards/E2E-009-1-fairy-island-pool.md)

剧情 `moveParty` 记录每次离开原位置时的队长朝向。最后一拍先落实跟随者坐标，再切到站姿。玩家落步后触发脚本时也先落实这一步的跟随者坐标，首张接触画面延续该队形。 [扬州逐页实绘](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-15-分屏返工与明雷暂停复验)

普通明雷在世界拍开始时统一以小于 1.5 格判定接敌。拍后检查仍以贴脸为准，并让玩家最终落点触发优先。引擎自动追逐每个合格世界拍按 `min(speed / 8, 1)` 格推进，感知距离严格小于作者设置的追逐范围。脚本追逐按自己的命令节拍和接触认领执行。采用 `static` 布局的无方向多帧精灵在引擎追逐实际落步时推进步态，站定归回静止绘制。实际对照见 [007 任务卡](../../tasks/cards/E2E-007-1-island-entrance-to-maze.md)。

循环脚本的 `chasePlayer` 可选择 `worldStep: true`。每次命令等待一个合格的世界拍，默认速度为 4，每次以半格提出朝向队伍的追逐，由现有地形和实体碰撞裁定。指定速度按 `min(speed / 8, 1)` 换算，0 采用默认速度。受阻时不会另试横向滑步。移动完成后循环直接提交下一拍的请求，接敌沿用实际生效的接触范围和现有触发权。余杭客栈伏击后两名随从的持续追逐使用该节拍。 [原盘 0x4C](../../../reference/sdlpal/script.c#L1733-L1750)

队伍相对位移 `nudgeParty` 默认将当前朝向写入跟随轨迹，后退时队伍可保持朝向。指定 `facing` 的转弯步会从新朝向起步，保留刚离开位置的旧朝向供跟随者使用。编辑器预览使用同一指令的朝向。第三操作数的队伍层用于排序和遮挡，由当前存档保存，普通切场时清零。

脚本 `shakeScreen` 按当前输出的世界拍、帧动画帧或 `ditherScreen` 渐变步推进。整幅合成画面沿纵向交替位移，零帧立即清除。重绘同一渐变步时保留相同位移，渐变合成之后施加位移和黑边。原盘先清框重绘再渐变的段落，在 `clearDialog` 后保留对应的重绘等待，令渐变从已经清框的画面起步。需要从黑幕揭示帧动画时，作者在对应播放指令的 `initialFadeInMs` 指定首帧淡入。 [原盘退移与倒塌演出](../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出) · [血池清框和渐变震屏](../../phase1/game-mechanics.md#2026-11-20-将军冢与血池的起战和返场)

大世界的 `narration` 场景叙述显式填写 `autoAdvance` 时，从首次绘制起计时，超时或任意按键均结束这条提示。结束键由当前提示消费。普通对白仅在最后一页完整显示时进入 `autoAdvance` 尾停顿，前面的页保持显示并等待确认翻页。放置受阻和「无任何效果」走同一场景叙述退场入口，时长为 1400 毫秒。 [原盘提示等待](../../../reference/sdlpal/text.c#L1663-L1710)

脚本淡出接在仍有实绘对白的画面之后时，由最后一张完整画面承接淡出。姓名、头像、正文和背景一起变暗。
脚本进战需要清场时，在 `startBattle` 前显式使用 `clearDialog`。同拍的转场允许最后实绘世界帧上的旧对白随地图被六带替换。首张完整战场画面必须清空世界对白槽。 [场景绘制与战斗入口](../../../packages/reforge/src/main.ts) · [进战换场原盘依据](../../phase1/game-mechanics.md#进战换场期间的旧对白像素)
脚本战斗结算和场景声效恢复期间保留最后绘出的战斗画面。战后指令紧接淡出时沿用这张画面，先实绘全黑的战场，再绘制已经提交敌人状态的地图。脚本仍负责选择淡入和后续命令。

战斗因脚本终止、败阵或逃跑结束时，场景续段收到战斗的实际 HP 和 MP，倒下成员保留 0 HP。场景指令决定是否复活及恢复量。天鬼皇战斗脚本在第十回合结束战斗，原场景续段将倒下的队员复活至半血。开战前的末页先随场景画面进入换场，交给本场的入战演出等待确认，随后才执行敌方的第一段对白。 [原盘结算和续段](../../phase1/game-mechanics.md#2026-11-20-锁妖塔天鬼皇开坛与停战)

前景脚本淡出结束时，完整幕布实际呈现后才继续下一条命令。淡出带有场景对白或战斗交接画面时，保留该画面直到幕布呈现。开坛后的站位与角色帧在幕布遮住期间提交，随后从新画面淡入。
实际走入触发格并立即起战时，先实绘落点和跟随队形，再交给战斗开场。无方向的静态触碰精灵保留队伍当时的步态，有方向的触碰仍按前景接管收步。
没有头像的对白默认按无头像排版。实际需要保留头像排版时，作者可明确设 `portraitLayout: true`，说话人与头像仍各自按身份声明决定。
客栈失忆旁白使用上方无名、无头像的对白槽和原版文字起点。

过场淡出可以由帧动画的 `holdLastFrame` 保留影片末帧。黑幕后用 `clearFrameAnimation` 交回当下场景，切场提交也会收掉影片层。新场景在首个可见帧前要定位队伍或清除旧震屏时，将这些动作放在目标 `entry.prepare`，由 `entry.reveal` 接续。片段间需要才恢复的后台职责由当前演出显式接通。固定剧情走位的起步、步数、停点和后续对白由前景正文持有。 [场景入场编排](../guides/scene-entry-authoring.md)

驱魔香、十里香用现有 `hostileAwareness` 倒计时调节引擎追逐。倍率为零时，原本可追逐的明雷在原脚点每拍推进步态，每两拍沿下、左、上、右转向。场景内已有的姿态覆盖、已编排动作及移动步态优先绘制。世界计时结束后恢复场景默认感知距离。 [原盘行为](../../phase1/game-mechanics.md) · [引擎计时](../../../packages/reforge/src/main.ts) · [精灵绘制](../../../packages/reforge/src/world-scene-presentation.ts)

传送出口指令 `teleportOut` 运行当前有效的 `onTeleport`。配置 `gatherParty: true` 时，出口的目的场景从首个揭示帧起按聚拢队形摆放，成功收尾时以队首重置跟随轨迹。`arrivalSound` 在目的场景提交时播放一次，位于淡入之前。失败执行 `onFail`。引路蜂和土灵珠都用这两个选项。引路蜂成功扣库存，土灵珠用于传送时保留库存，两者失败都显示旁白。 [原盘行为](../../phase1/game-mechanics.md) · [当前宿主](../../../packages/reforge/src/main.ts)

普通明雷的胜利回场在「项目设置 → 项目概览 → 明雷战斗」统一设置，保存为 `manifest.hostileVictoryTransition`。实体的「行为 → 胜利回场转场」默认沿用项目设置；只有需要例外才保存 `hostile.victoryTransition`，选择「沿用默认」即清除覆盖。未设置项目默认时直接返回地图。PAL 项目默认淡出战场、淡入地图，现有 828 个普通明雷全部继承。这个默认只用于引擎接敌；剧情或触碰脚本发起的战斗仍由自己的指令编排。

选择淡出淡入后，先完成胜利奖励、逐槽脚本和半恢复，再应用敌人胜利后的世界状态。保留最后实际绘制的战场帧淡到全黑，随后淡入更新后的地图。地图恢复前由当前遭遇持有控制权。

胜利结算连续显示相同文字的两个战利品卷轴时，第二条在清掉第一条且实绘战场后显示。第二条的自动关闭时钟从首次实绘开始，两个敌槽各自发奖。

玩家用快捷键或杂项菜单选择逃跑时，全队可行动成员本轮采用逃跑指令，先前选中的道具也立即释放预占。尝试顺序跟随战斗行动队列，成功后回原地图。普通明雷按实体的 `hostile.onPlayerFlee` 执行留在场上或短时暂停。PAL 十里坡的蜜蜂保持可见并暂停接敌 15 世界拍。剧情战自行处理 `startBattle.onFlee`。

普通明雷从接敌到恢复地图期间，当前场景的自动脚本保留执行位置和剩余等待。战斗自身的动作、声音和战后敌槽脚本仍正常推进。十里坡与山神庙共用的环境声，把原盘地图节拍写在共享脚本里，不依赖运行器额外插帧。

`ride` 在每次已提交的载具位移中，以实际行进方向更新队伍方向和轨迹。挂载队伍默认面向行进方向站立。当前交互演出用 `setPartyFacing` 明确指定队长姿势时，骑乘画面使用该姿势。队伍自行走位、切图或该演出结束后释放。载具保留自己的朝向和动作姿态。原地停留延续队伍当前姿态。

### 作者编辑与持久现场

CanonicalScriptBodyEditor统一AuthorCommand[]，外层FlowEditor维护步骤/默认去向，各owner只保留identity/选择/元数据壳；修改进同一ScriptEditSession，共用schema/reference/cursor与undo/redo/save。场景入口仍是有真实地图的工作台与可调抽屉；共享库/物品需要空间语境时回真实场景调用点，不复制owner-less地图播放器。scratch预览不写canonical，跨场景只读定义不等视觉切场，动态轨迹未知不得画假连接。

WorldScriptState按场景保存entityState/entityPos/entityLayer及Page/Behavior/Hook选择和业务cursor。SAVE12另保存自动flow的内部帧/分类等待/动作/追逐现场；位置唯一在entityPos，与sceneRuntime同步捕获，返回现场后仍跑当前onEnter，读档不重跑。它不变成作者状态方案或交互/战斗调用栈。

playEntityAction的wait与loop分轴；wait:false安装动作和该叶cursor推进对保存barrier是一笔提交，被等待动作的中途/已兑现待确认收据不得恢复时重发cue。后台动作可跨行为完成但稳定owner仍负责取消，不保存Promise/AbortSignal或运行epoch。活动身份只在同runtime、exact signal和真实live lease间共享；owner epoch失效与lease关闭不同。内联子调用未自然结束仍被barrier计数，同owner不重入；独立根等gate后复验场景/session。详见[存档合同](save-system.md)。

## 边界与风险

本次恢复规范表达，不替所有runner、保存门、UI与实际数据进行全路径代码审计。rootScope/loop祖先/initial entry和runEntityTrigger关键守卫按实际源码切片核；暂停时序、动作保存及UI表现保留原已定合同，实施是否全满足仍待各自新证据。

作者正文直接维护；供应核仅负责已批准资源/地图窄分区，不恢复旧完整脚本转换、脚本分片/transition/sidecar或旧开发档fallback。新玩法、状态模型、时序或可见交互取舍须另卡，不从本文current获得build许可。

## 验收

静态oracle：阶段/命令根/entry守卫与公开runtime调用域匹配、原quote逆回、源/after和链接有效。运行oracle：合法同场景interactive子链及坏根/坏祖先/session过期拒绝，保存/恢复不重发副作用，真实预览不污染作者内容；本轮未运行这些例子，不写全绿。正文独立验收由未参与者据证完成，父卡和全量门保持未完成。

## 历史范围

R33登记2026-10-07，原稿含更早作者模型与后续SAVE12/实体交互补充；固定0d5311075b4f5e67362d1953a138d678c0a4aa42。旧源日期和真实用户裁决保持，不把整篇降成过时设计。

## 原始结论

原文以稳定身份、方案→步骤→指令、显式根权限和运行态分层作为current合同；R33标题/行数型语义接受已撤回。本文不继承该旧review或其SAVE11摘要残句，也不恢复旧机器编辑器。

## 当时证据

原take/release确认、源链接和历史“已验收”完整保留在quote；只说明当时裁决或执行声明，不伪造本轮runtime/E2E。

## 当前有效性

适用当前产品合同：contentVersion 23 / SAVE12 / minimumSaveVersion 12。

规范current，原文history overlay用于回读；设计合同、实现合规、独立语义接受和运行信用分别成立，不用静态通过相互替代。

## 继任文档

[内容格式](content-schema.md)约束载体，[工程生命周期](project-lifecycle.md)约束编辑持久化，[场景入场](../guides/scene-entry-authoring.md)给作者操作；[原设计快照](../archive/designs/script-system-design.md)只供查历史。

## 原文保全

固定原源revision `0d5311075b4f5e67362d1953a138d678c0a4aa42`及source SHA见唯一review记录。marker至EOF对本批基点逐字节保持；逆回只剥每行 `> ` / 空行裸 `>`，精确排除end marker前恰一个未引用分隔LF后等固定原源，不trim或全局替换。原稿中的current说明原合同，旧执行仍只按其日期读取。
<!-- original-source-quote:start -->
> # 作者脚本与运行时合同
>
> 类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE12；格式与实现以源码常量和校验器为准。
> 本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
> 原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/script-system-design.md)，不作为当前执行入口。
>
> ## canonical script 契约（contentVersion 22）
>
> ### 作者身份与存储
>
> - 实体只用复合地址 `EntityAddress { scene, entity }`。命令、条件、`self` 和存档映射均不得保存
>   脱离场景的裸实体 id。
> - 场景实例可填写非空`label`作为作者“实体名称”，与稳定ID、预制人物名和共享精灵名分离。
>   编辑器优先显示实例名称，其次人物预制名称，未命名则显示ID；名称相同不合并实体，目标选择继续保存稳定ID。
>   名称可编辑、清除、撤销/重做并保存重开，脚本参数与移动轨迹即时采用当前实例名称，不修改对白说话人或运行身份。
> - `AuthorSceneDef.entities[].pages[]` 以稳定 `PageId` 命名；Page 只选择行为、触发方式和外观，
>   不内嵌匿名脚本。
> - `behaviors.trigger/auto` 是按稳定 `BehaviorId` 登记的具名本地行为；Page 的
>   `trigger`/`auto` 只保存选择。运行时也可通过 `selectEntityPage`、
>   `selectEntityBehavior`、`setEntityTriggerActivation` 改变选择。
> - 场景 `hooks.onEnter/onTeleport` 是按稳定 `HookId` 登记的 variant registry，并各自拥有
>   `initial` 选择。运行时切换统一使用 `selectSceneHooks`。
> - 真正跨处复用的脚本只存在于 `content/shared-scripts.json`，形状为
>   `AuthorScriptLibrary`。`callScript` 只保存稳定 `script` id 和可选
>   `EntityAddress self`，不保存 chunk 提示。
> - 共享脚本库只编辑项目级正文、作者元数据与 `self` 调用契约，不伪造默认场景或调用实体。需要地图、实体和
>   播放语境的验证从真实场景调用点进入场景工作台；共享库本身不提供 owner-less 地图预览。
> - 只服务一件物品的复杂用途使用 `itemPrivateScript`，正文内联归该物品拥有；它不进入共享脚本库。
>   与特定NPC相关的剧情正文可留在NPC具名方案；物品私有脚本只检查使用条件、选择该方案并显式调用，
>   如桂花酒→醉道士赠酒，不复制正文到物品或依赖玩家再移动触发。
>
> ### 控制流
>
> 作者只使用「方案 → 步骤 → 指令」：方案区分剧情时期，步骤区分首次、再次激活和复读。
> 一次执行中的走路、转弯、说话、选择和等待留在同一步正文中；不再有机器状态、连续流程或整理旧机器的入口。
> 跨方案仍使用显式的selectEntityBehavior；点击方案卡仅选择编辑或预览对象，不改变游戏运行态。
>
> ```ts
> type AuthorScriptFlow = {
>   kind: 'stages'
>   initial: StageId
>   stages: Array<{
>     id: StageId
>     label?: string
>     entry?: BaseSceneEntryPresentation
>     body: AuthorCommand[]
>     next?: StageId | { kind: 'complete' }
>   }>
> }
>
> type StepExit =
>   | { kind: 'stay' }
>   | { kind: 'stage'; stage: StageId }
>   | { kind: 'complete' }
>
> type StructuredCommand =
>   | { kind: 'finishStep'; next: StepExit }
>   | { kind: 'returnScript' }
>   | { kind: 'confirm'; onYes: AuthorCommand[]; onNo: AuthorCommand[] }
>   | { kind: 'repeat'; count: number; body: AuthorCommand[]; id?: string; label?: string }
>   | { kind: 'loop'; mode: 'while' | 'until'; cond: AuthorCondition; body: AuthorCommand[]; id?: string; label?: string }
>   | { kind: 'loop'; mode: 'forever'; body: AuthorCommand[]; id?: string; label?: string }
>   | { kind: 'breakLoop' }
>   | { kind: 'continueLoop'; loop?: string }
> ```
>
> 步骤next只描述正文正常结束后的默认去向：省略表示下次仍在当前步骤，稳定ID表示下次进入指定步骤，
> complete表示完成方案。正文可用finishStep提前结束本次执行并显式覆盖下次去向；它不是立即跳去执行下一步骤。
> finishStep仅允许行为或场景hook的步骤正文及结构化子树，不允许共享、物品私有、敌AI、技能或入场prepare。
> 没有self不等于没有步骤，判断权限使用明确的命令根作用域和本flow步骤集合。
>
> returnScript仅返回当前共享或私有命令根，不修改调用方步骤。跨调用根不可break/continue。
> confirm两臂各自编辑，臂正常结束后仍继续下方指令；需要结束整个步骤必须显式finishStep。
> 不保存命令结果识别名，也不把结果经commandOutcome映射到状态。
>
> repeat精确执行正安全整数次；while前测、until后测、forever明确长期循环。
> 条件判断一次后记录选中的分支，恢复不重掷chance。breakLoop退出最近循环；
> continueLoop默认开始最近循环的下一轮，可按稳定loop id选择同根词法祖先，不能跳同级或任意节点。
> 只有需要从内层引用外层的循环才需命名，同根重复id、非祖先目标和跨根引用拒绝。
> 复制有名循环须重映射其内部引用，移动到目标不再是祖先的位置不可静默保存。
>
> 步骤区域仍统一为「步骤列表」，数量和帮助紧邻标题；单步与多步都显示完整卡片。
> 步骤label是作者用途说明，稳定id才是游标身份。目标选择显示可读名称，compiler不把label写入执行树。
> 正文、步骤选择、引用定位和移动轨迹沿用同一套指令树；场景播放从实际选中的步骤开始。
> 当前content digest仍覆盖作者元数据，不对旧开发档放宽校验。
>
> 一次性方案保存completed游标，保留绑定身份但不继续获取执行权。取消、过期epoch、未通过settlement gate
> 或尚未返回的子调用不能制造完成。finishStep在当前lease上原子提交一次目标并清理续跑帧，旧执行器不能覆盖新绑定。
> 同有效方案选择保留游标；真正切换方案重新从其初始步骤执行，不继承旧巡逻等待计数或内部执行位置。
>
> 指令顺序执行，只有明确等待或真实异步动作消耗游戏时间；没有每条auto指令附加100ms、循环强制世界拍，
> 也没有成功执行一步后额外40ms。保留观感所需的节拍写在正文，重复帧和动作以repeat/loop表达，
> 不能把每一拍包装成一个步骤。固定姿态位移不自动改成会改变步态的走路指令。
>
> 零时间循环以运行器工作量保护停止，而不是用累计循环次数限制正常巡逻寿命。
> 预算跨自动实体的方案重启和signal更换、步骤返回与共享调用；CPU公平让步、既返Promise和wait0不算真实进展。
> 实际宿主时间或明确的真实交互进展才允许重置，相关技术计数不成为作者日常表单。
>
> compiler只在内存或可删缓存里产生执行树，带compilerVersion和content digest。
> SAVE12保存同一digest下的内部执行帧，不保存机器状态、生成块或可执行代码。
> 内部指令序号用于执行定位，不成为任何内容对象的身份。
>
> ### 显式执行实体交互方案
>
> ```ts
> { kind: 'runEntityTrigger', target: { scene: SceneId, entity: EntityId } }
> ```
>
> - 编辑器显示「执行实体交互方案」，等待目标当前选中trigger及其当前步骤执行完成再继续；
>   不切方案、不重置游标，不模拟自然交互键/触碰/距离。需要切换时先显式`selectEntityBehavior`，
>   物品的面对/距离条件仍由调用方编排。
> - 只允许interactive链；auto直接/经共享调用与入场prepare都拒绝。使用同一个signal、宿主与活动链，
>   子self为目标，返回后父self不变；子finishStep结束子步骤，取消向上传播。busy/递归显式失败，不静默截断。
> - 无绑定、禁用或completed目标为no-op；缺目标、异当前场景、永久移除明确失败。已有实体可隐藏，
>   显式调用不等于玩家自然交互；目标在正文中隐藏仍可完成后续对白。
> - 当前调用限定同场景session。子链直接/间接`loadScene`、`loadLastSave`、`quitToTitle`、`gameOver`、
>   `teleportOut`、`startBattle`在副作用前拒绝，切场或战斗放在调用返回后编排；普通根脚本语义不变。
>   外部session替换取消旧子/父尾，命令最终派发与cursor提交均核session/signal，过期执行不能回写。
> - 不新增作者步骤/状态模型、parallel/join、存档执行栈或兼容版本；目标游标仍由现有coordinator持久化。
>
> ### 角色当前状态命令
>
> 剧情对已实例化角色的临时状态变化使用两条显式作者命令，不扩张 `setParty`，也不使用队伍下标：
>
> ```ts
> { kind: 'applyActorCondition', actor: ActorId, condition:
>   | { kind: 'poison', poisonId: PoisonDefId }
>   | { kind: 'status', status: CarryableStatusId, turns: number }
>   | { kind: 'poisonResistance', amount: number } }
>
> { kind: 'clearActorCondition', actor: ActorId, condition:
>   | { kind: 'poison', poisonId: PoisonDefId }
>   | { kind: 'status', status: CarryableStatusId }
>   | { kind: 'poisonResistance' } }
> ```
>
> - `actor` 是稳定 ActorId；目标必须已存在于 party 或 reserve，缺失或重复实例 fail-loud。典型顺序是先
>   `setParty`，再施加状态。
> - 作者显式施毒必中，不投毒抗概率骰；它复用 content 的自毒相克/致死规则。毒和状态名称由工程定义与共享
>   registry 显示，不暴露 `tickIndex` 或裸英文枚举。
> - 可携带状态不含死人专用 `puppet`，回合为 1..999；坏状态已有时不刷新，好状态只取更长回合且不施加给
>   倒下角色。
> - 世界中 condition 不自行衰减。入战、战后与读档清理复用运行时唯一 owner，脚本 runner 不复制规则。
>
> ### 编辑器分层与场景预览
>
> - `CanonicalScriptBodyEditor` 是所有 `AuthorCommand[]` 的唯一作者态正文组件；
>   `CanonicalScriptFlowEditor` 在它外层统一编辑步骤与默认下次去向。共享脚本、物品私有脚本、
>   实体 Behavior 和场景 Hook 只保留各自的 identity、选择、引用和元数据外壳，不各写一套正文
>   编辑器。
> - 所有修改都派发到同一个 `ScriptEditSession`，因此共用 schema/reference/cursor 校验以及
>   undo/redo/save 闭环。canonical 作者界面不以整段 JSON textarea 作为日常编辑入口。
> - 场景脚本入口仍是完整场景工作台：上半区保留真实地图和播放、单步、重置、引擎试玩，下半区
>   是可调高度的通用脚本编辑抽屉，可在“场景 Hook / 实体行为”间切换。不能因为正文组件统一而
>   降级成脱离地图的纯表单。
> - 场景预览使用同一项目runtime运行当前canonical flow、共享调用和显式实体子链；scratch宿主只改预览状态，
>   不回写canonical内容。现有项目场景定义可只读解析跨场景绑定，不载其他地图/视觉切场。
>   动态目标当前方案的移动不能静态推定时，轨迹标明调用边界，后续起点未知，不画假连接。
>   共享脚本库和物品工作台按所有者上下文编辑正文，需要空间语境时应从具体场景
>   调用点打开或进入场景工作台预览，不能为每种所有者复制一套地图/播放器。
>
> ### 持久状态与调度
>
> - `takeEntity` 暂停目标实体自身的整个自动执行链，包括等待的剩余时间、结构判断和该链驱动的跨实体动作；
>   `releaseEntity` 从原进度继续，不重启脚本或整段等待。已开始的资源加载可以完成，但暂停期间不得提交其效果。
>   不冻结其它实体的自动链；其它自动链操作被接管目标时，仍遵守目标的移动/姿态权威。
>   已选定终结的内部cursor提交须原子收尾，不因接管重新选择分支。对白本身不隐式接管。
>   2026-10-07用户以003客栈门口醉道士首次讨酒对白确认此语义；不新增作者指令或剧情阶段。
>
> - `faceEntityToParty { target: { scene, entity } }`：显式令当前场景实体面向队长，按执行时双方的实时地面坐标
>   与精灵像素轴象限计算；同点保持原朝向，异场景目标无现场副作用。只转向，不移动、不停步、不定帧、不接管。
>   自动脚本遵守目标实体的既有姿态权威等待；对白不会隐式调用它。交互演出需要时由作者编排
>   `takeEntity → faceEntityToParty → setEntityFrame → dialog → releaseEntity`，静态NPC无须额外接管。
>   对话后恢复工作朝向也须显式编排；编辑器预览读取当前overlay位置，不改作者场景数据。
>
> - `WorldScriptState` 保存 flags/vars、按场景分区的 `entityState/entityPos/entityLayer`，
>   以及 Page/Behavior/Hook 选择、epoch 和仅含stage/completed的`FlowCursor`。
> - 作者cursor仍在flow业务边界提交；SAVE12另保存自动flow的引擎内部命令续跑位置、嵌套控制帧及单步提交相位，
>   不把它们变成作者步骤，也不保存临时交互/战斗调用栈。后台移动不等待整步结束才允许存档。
> - SAVE12的必需`sceneRuntime`保存NPC朝向、定帧、步态/显式动画相位、move节拍、分类wait剩余时长、
>   base/override动作时间轴与稳定owner及追逐认领；位置仍唯一存于`world.script.entityPos`并同步捕获。
>   自动wait只继续剩余时长；离场暂停，返回恢复现场后仍按当前绑定执行`onEnter`，读档不重跑入场正文。
>   这些都是引擎现场，不是作者状态方案或剧情阶段，详见[当前存档合同](save-system.md)。
> - `playEntityAction`的`wait`与`loop`分轴：`wait:false`安装动作与推进该叶cursor对保存barrier为一次提交；
>   被等待的非循环动作可保存中途进度或已兑现、待cursor确认的收据，恢复不重发历史cue或清姿势副作用。
>   后台动作可跨越行为完成，稳定owner仍负责后续取消；不保存Promise、AbortSignal或运行时activation/command epoch。
> - 自动行为的动作节拍在正文显式表达；调度只处理生命周期、权限和保存门的挂起/唤醒，不附加指令等待。
> - Page/Behavior/Hook 选择真正变化时递增 owner epoch；旧 invocation 持 lease 跑到下一
>   safe-point，过期 cursor 的 CAS 会被丢弃。
> - 保存活动身份只在同runtime、exact AbortSignal和真实live lease之间共享；owner epoch失效与lease关闭不是同一件事。
>   内联场景钩子/行为有独立owner互斥与cursor，作为父命令的子调用自然结束前仍被保存barrier计数；
>   它不会因保存gate在嵌套指令中途返回假成功，但abort/epoch检查仍有效。同owner busy不重入。
>   独立新根仍等待gate并在醒来时复核来源场景/session，独立在途根仍按原安全点暂停规则执行。
>
> ### 当前加载与发布边界
>
> - HTTP/runtime/editor loader 只接受 contentVersion 22；存档只接受 SAVE12 / content22，manifest最低存档版本为12。
> - 作者正文直接维护；已退役的原版完整脚本转换核不再参与发布。保留的窄资源/地图供应分区
>   经三方merge与完整闭包预检后提交manifest；不发布脚本分片、版本transition或migration sidecar。
> - 旧工程和旧开发期存档可由 Git 取回对应历史代码重建，但不进入当前产品路径。发现版本不匹配时
>   fail-loud，不猜字段、不读取旧 sidecar，也不保留“以后可能用到”的兼容 fallback。
>
> ## 场景入场呈现
>
> 场景 `onEnter` 流程仅在`initial`指定的初始步骤声明`entry: { prepare, reveal }`。
> 其他步骤、实体行为和普通共享脚本不能声明此字段。
> `prepare` 为作者指令列表，`reveal` 使用 `SceneReveal`；执行顺序为准备目标画面、呈现切换、正文。
>
> 该范围由 [作者流程校验](../../../packages/content/src/author-script-core.ts) 的
> `allowSceneEntry` 与初始节点检查共同约束；字段定义见同文件 `BaseSceneEntryPresentation`。
> 编辑方法见 [场景入场指南](../guides/scene-entry-authoring.md)。

<!-- original-source-quote:end -->
