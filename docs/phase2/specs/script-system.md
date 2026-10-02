# 作者脚本与运行时合同

类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE11；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/script-system-design.md)，不作为当前执行入口。

## canonical script 契约（contentVersion 22）

### 作者身份与存储

- 实体只用复合地址 `EntityAddress { scene, entity }`。命令、条件、`self` 和存档映射均不得保存
  脱离场景的裸实体 id。
- 场景实例可填写非空`label`作为作者“实体名称”，与稳定ID、预制人物名和共享精灵名分离。
  编辑器优先显示实例名称，其次人物预制名称，未命名则显示ID；名称相同不合并实体，目标选择继续保存稳定ID。
  名称可编辑、清除、撤销/重做并保存重开，脚本参数与移动轨迹即时采用当前实例名称，不修改对白说话人或运行身份。
- `AuthorSceneDef.entities[].pages[]` 以稳定 `PageId` 命名；Page 只选择行为、触发方式和外观，
  不内嵌匿名脚本。
- `behaviors.trigger/auto` 是按稳定 `BehaviorId` 登记的具名本地行为；Page 的
  `trigger`/`auto` 只保存选择。运行时也可通过 `selectEntityPage`、
  `selectEntityBehavior`、`setEntityTriggerActivation` 改变选择。
- 场景 `hooks.onEnter/onTeleport` 是按稳定 `HookId` 登记的 variant registry，并各自拥有
  `initial` 选择。运行时切换统一使用 `selectSceneHooks`。
- 真正跨处复用的脚本只存在于 `content/shared-scripts.json`，形状为
  `AuthorScriptLibrary`。`callScript` 只保存稳定 `script` id 和可选
  `EntityAddress self`，不保存 chunk 提示。
- 共享脚本库只编辑项目级正文、作者元数据与 `self` 调用契约，不伪造默认场景或调用实体。需要地图、实体和
  播放语境的验证从真实场景调用点进入场景工作台；共享库本身不提供 owner-less 地图预览。
- 只服务一件物品的复杂用途使用 `itemPrivateScript`，正文内联归该物品拥有；它不进入共享脚本库。
  与特定NPC相关的剧情正文可留在NPC具名方案；物品私有脚本只检查使用条件、选择该方案并显式调用，
  如桂花酒→醉道士赠酒，不复制正文到物品或依赖玩家再移动触发。

### 控制流

作者只使用「方案 → 步骤 → 指令」：方案区分剧情时期，步骤区分首次、再次激活和复读。
一次执行中的走路、转弯、说话、选择和等待留在同一步正文中；不再有机器状态、连续流程或整理旧机器的入口。
跨方案仍使用显式的selectEntityBehavior；点击方案卡仅选择编辑或预览对象，不改变游戏运行态。

```ts
type AuthorScriptFlow = {
  kind: 'stages'
  initial: StageId
  stages: Array<{
    id: StageId
    label?: string
    entry?: BaseSceneEntryPresentation
    body: AuthorCommand[]
    next?: StageId | { kind: 'complete' }
  }>
}

type StepExit =
  | { kind: 'stay' }
  | { kind: 'stage'; stage: StageId }
  | { kind: 'complete' }

type StructuredCommand =
  | { kind: 'finishStep'; next: StepExit }
  | { kind: 'returnScript' }
  | { kind: 'confirm'; onYes: AuthorCommand[]; onNo: AuthorCommand[] }
  | { kind: 'repeat'; count: number; body: AuthorCommand[]; id?: string; label?: string }
  | { kind: 'loop'; mode: 'while' | 'until'; cond: AuthorCondition; body: AuthorCommand[]; id?: string; label?: string }
  | { kind: 'loop'; mode: 'forever'; body: AuthorCommand[]; id?: string; label?: string }
  | { kind: 'breakLoop' }
  | { kind: 'continueLoop'; loop?: string }
```

步骤next只描述正文正常结束后的默认去向：省略表示下次仍在当前步骤，稳定ID表示下次进入指定步骤，
complete表示完成方案。正文可用finishStep提前结束本次执行并显式覆盖下次去向；它不是立即跳去执行下一步骤。
finishStep仅允许行为或场景hook的步骤正文及结构化子树，不允许共享、物品私有、敌AI、技能或入场prepare。
没有self不等于没有步骤，判断权限使用明确的命令根作用域和本flow步骤集合。

returnScript仅返回当前共享或私有命令根，不修改调用方步骤。跨调用根不可break/continue。
confirm两臂各自编辑，臂正常结束后仍继续下方指令；需要结束整个步骤必须显式finishStep。
不保存命令结果识别名，也不把结果经commandOutcome映射到状态。

repeat精确执行正安全整数次；while前测、until后测、forever明确长期循环。
条件判断一次后记录选中的分支，恢复不重掷chance。breakLoop退出最近循环；
continueLoop默认开始最近循环的下一轮，可按稳定loop id选择同根词法祖先，不能跳同级或任意节点。
只有需要从内层引用外层的循环才需命名，同根重复id、非祖先目标和跨根引用拒绝。
复制有名循环须重映射其内部引用，移动到目标不再是祖先的位置不可静默保存。

步骤区域仍统一为「步骤列表」，数量和帮助紧邻标题；单步与多步都显示完整卡片。
步骤label是作者用途说明，稳定id才是游标身份。目标选择显示可读名称，compiler不把label写入执行树。
正文、步骤选择、引用定位和移动轨迹沿用同一套指令树；场景播放从实际选中的步骤开始。
当前content digest仍覆盖作者元数据，不对旧开发档放宽校验。

一次性方案保存completed游标，保留绑定身份但不继续获取执行权。取消、过期epoch、未通过settlement gate
或尚未返回的子调用不能制造完成。finishStep在当前lease上原子提交一次目标并清理续跑帧，旧执行器不能覆盖新绑定。
同有效方案选择保留游标；真正切换方案重新从其初始步骤执行，不继承旧巡逻等待计数或内部执行位置。

指令顺序执行，只有明确等待或真实异步动作消耗游戏时间；没有每条auto指令附加100ms、循环强制世界拍，
也没有成功执行一步后额外40ms。保留观感所需的节拍写在正文，重复帧和动作以repeat/loop表达，
不能把每一拍包装成一个步骤。固定姿态位移不自动改成会改变步态的走路指令。

零时间循环以运行器工作量保护停止，而不是用累计循环次数限制正常巡逻寿命。
预算跨自动实体的方案重启和signal更换、步骤返回与共享调用；CPU公平让步、既返Promise和wait0不算真实进展。
实际宿主时间或明确的真实交互进展才允许重置，相关技术计数不成为作者日常表单。

compiler只在内存或可删缓存里产生执行树，带compilerVersion和content digest。
SAVE11保存同一digest下的内部执行帧，不保存机器状态、生成块或可执行代码。
内部指令序号用于执行定位，不成为任何内容对象的身份。

### 显式执行实体交互方案

```ts
{ kind: 'runEntityTrigger', target: { scene: SceneId, entity: EntityId } }
```

- 编辑器显示「执行实体交互方案」，等待目标当前选中trigger及其当前步骤执行完成再继续；
  不切方案、不重置游标，不模拟自然交互键/触碰/距离。需要切换时先显式`selectEntityBehavior`，
  物品的面对/距离条件仍由调用方编排。
- 只允许interactive链；auto直接/经共享调用与入场prepare都拒绝。使用同一个signal、宿主与活动链，
  子self为目标，返回后父self不变；子finishStep结束子步骤，取消向上传播。busy/递归显式失败，不静默截断。
- 无绑定、禁用或completed目标为no-op；缺目标、异当前场景、永久移除明确失败。已有实体可隐藏，
  显式调用不等于玩家自然交互；目标在正文中隐藏仍可完成后续对白。
- 当前调用限定同场景session。子链直接/间接`loadScene`、`loadLastSave`、`quitToTitle`、`gameOver`、
  `teleportOut`、`startBattle`在副作用前拒绝，切场或战斗放在调用返回后编排；普通根脚本语义不变。
  外部session替换取消旧子/父尾，命令最终派发与cursor提交均核session/signal，过期执行不能回写。
- 不新增作者步骤/状态模型、parallel/join、存档执行栈或兼容版本；目标游标仍由现有coordinator持久化。

### 角色当前状态命令

剧情对已实例化角色的临时状态变化使用两条显式作者命令，不扩张 `setParty`，也不使用队伍下标：

```ts
{ kind: 'applyActorCondition', actor: ActorId, condition:
  | { kind: 'poison', poisonId: PoisonDefId }
  | { kind: 'status', status: CarryableStatusId, turns: number }
  | { kind: 'poisonResistance', amount: number } }

{ kind: 'clearActorCondition', actor: ActorId, condition:
  | { kind: 'poison', poisonId: PoisonDefId }
  | { kind: 'status', status: CarryableStatusId }
  | { kind: 'poisonResistance' } }
```

- `actor` 是稳定 ActorId；目标必须已存在于 party 或 reserve，缺失或重复实例 fail-loud。典型顺序是先
  `setParty`，再施加状态。
- 作者显式施毒必中，不投毒抗概率骰；它复用 content 的自毒相克/致死规则。毒和状态名称由工程定义与共享
  registry 显示，不暴露 `tickIndex` 或裸英文枚举。
- 可携带状态不含死人专用 `puppet`，回合为 1..999；坏状态已有时不刷新，好状态只取更长回合且不施加给
  倒下角色。
- 世界中 condition 不自行衰减。入战、战后与读档清理复用运行时唯一 owner，脚本 runner 不复制规则。

### 编辑器分层与场景预览

- `CanonicalScriptBodyEditor` 是所有 `AuthorCommand[]` 的唯一作者态正文组件；
  `CanonicalScriptFlowEditor` 在它外层统一编辑步骤与默认下次去向。共享脚本、物品私有脚本、
  实体 Behavior 和场景 Hook 只保留各自的 identity、选择、引用和元数据外壳，不各写一套正文
  编辑器。
- 所有修改都派发到同一个 `ScriptEditSession`，因此共用 schema/reference/cursor 校验以及
  undo/redo/save 闭环。canonical 作者界面不以整段 JSON textarea 作为日常编辑入口。
- 场景脚本入口仍是完整场景工作台：上半区保留真实地图和播放、单步、重置、引擎试玩，下半区
  是可调高度的通用脚本编辑抽屉，可在“场景 Hook / 实体行为”间切换。不能因为正文组件统一而
  降级成脱离地图的纯表单。
- 场景预览使用同一项目runtime运行当前canonical flow、共享调用和显式实体子链；scratch宿主只改预览状态，
  不回写canonical内容。现有项目场景定义可只读解析跨场景绑定，不载其他地图/视觉切场。
  动态目标当前方案的移动不能静态推定时，轨迹标明调用边界，后续起点未知，不画假连接。
  共享脚本库和物品工作台按所有者上下文编辑正文，需要空间语境时应从具体场景
  调用点打开或进入场景工作台预览，不能为每种所有者复制一套地图/播放器。

### 持久状态与调度

- `WorldScriptState` 保存 flags/vars、按场景分区的 `entityState/entityPos/entityLayer`，
  以及 Page/Behavior/Hook 选择、epoch 和仅含stage/completed的`FlowCursor`。
- 作者cursor仍在flow业务边界提交；SAVE11另保存自动flow的引擎内部命令续跑位置、嵌套控制帧及单步提交相位，
  不把它们变成作者步骤，也不保存临时交互/战斗调用栈。后台移动不等待整步结束才允许存档，详见当前存档合同。
- 自动行为的动作节拍在正文显式表达；调度只处理生命周期、权限和保存门的挂起/唤醒，不附加指令等待。
- Page/Behavior/Hook 选择真正变化时递增 owner epoch；旧 invocation 持 lease 跑到下一
  safe-point，过期 cursor 的 CAS 会被丢弃。
- 保存活动身份只在同runtime、exact AbortSignal和真实live lease之间共享；owner epoch失效与lease关闭不是同一件事。
  内联场景钩子/行为有独立owner互斥与cursor，作为父命令的子调用自然结束前仍被保存barrier计数；
  它不会因保存gate在嵌套指令中途返回假成功，但abort/epoch检查仍有效。同owner busy不重入。
  独立新根仍等待gate并在醒来时复核来源场景/session，独立在途根仍按原安全点暂停规则执行。

### 当前加载与发布边界

- HTTP/runtime/editor loader 只接受 contentVersion 22；存档只接受 SAVE11 / content22。
- 作者正文直接维护；已退役的原版完整脚本转换核不再参与发布。保留的窄资源/地图供应分区
  经三方merge与完整闭包预检后提交manifest；不发布脚本分片、版本transition或migration sidecar。
- 旧工程和旧开发期存档可由 Git 取回对应历史代码重建，但不进入当前产品路径。发现版本不匹配时
  fail-loud，不猜字段、不读取旧 sidecar，也不保留“以后可能用到”的兼容 fallback。

## 场景入场呈现

场景 `onEnter` 流程仅在`initial`指定的初始步骤声明`entry: { prepare, reveal }`。
其他步骤、实体行为和普通共享脚本不能声明此字段。
`prepare` 为作者指令列表，`reveal` 使用 `SceneReveal`；执行顺序为准备目标画面、呈现切换、正文。

该范围由 [作者流程校验](../../../packages/content/src/author-script-core.ts) 的
`allowSceneEntry` 与初始节点检查共同约束；字段定义见同文件 `BaseSceneEntryPresentation`。
编辑方法见 [场景入场指南](../guides/scene-entry-authoring.md)。
