# 作者脚本与运行时合同

类型：现行规范（current）。当前产品为 contentVersion 21 / SAVE10；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/script-system-design.md)，不作为当前执行入口。

## canonical script 契约（contentVersion 21）

### 作者身份与存储

- 实体只用复合地址 `EntityAddress { scene, entity }`。命令、条件、`self` 和存档映射均不得保存
  脱离场景的裸实体 id。
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

### 控制流

`AuthorScriptFlow` 有两种 canonical 形态：

普通作者界面以「方案 → 步骤 → 指令」为默认模型：方案区分不同剧情时期的行为，步骤区分首次、
再次激活及复读。首次执行后转下次内容，不需要另建连续流程状态机。2026-10-01已将PAL中29套
简单历史machine真正整理为stages；编辑器也为默认节拍、仅下次去向的machine提供显式「整理为步骤」，
经过正常引用校验、撤销/重做和保存，不在加载或运行时偷偷转换。原连续流程及状态名称不保留，
步骤及指令稳定编号、正文、出现前准备和运行去向保留；外部游标引用阻止无效整理。
跨方案由正文中的显式`selectEntityBehavior`指令完成，编辑器入口为「添加指令 → 切换实体脚本」，
指定场景/实体、交互或自动脚本类型及目标具名方案；列表摘要显示「切换交互脚本／切换自动行为」。
点击方案卡只选择编辑/预览对象，不切换游戏运行态；步骤详情「下次运行」只指定本方案内部步骤或完成。
步骤区域标题统一为「步骤列表」，数量与帮助紧邻标题；一或多个步骤均显示同样的完整步骤卡，
不按数量隐藏卡片或引入另一个单步编辑概念。每套方案至少保留一步，是否继续由显式去向决定。
剩余165套涉及同次继续、跨拍或分派的历史machine仍保留原逻辑，随E2E逐项合理化，不代表
推荐作者理解第二套状态机，也不宣称本轮已退役其schema或兼容旧machine游标存档。

2026-10-01客栈李大娘下楼的46个逐拍状态重写为一个普通步骤，包含六段目标坐标与速度指令；
转折路段不是再次激活的步骤，最后明确完成，不再用空结束状态持续轮询。
自动脚本保存位置由SAVE10的引擎内部continuation承载，作者不为存档拆步骤。
目标移动沿投影平面直线推进，四档速度保持原菱形轴步距对应的平面距离；
只有完整剩余距离不超过当前一步才到点，不能因单轴已接近而吸附另一条远距离轴。
脚本方案显示名按「剧情时期/触发背景：实际用途」命名，稳定ID与显示名分离；
全PAL命名治理仍未完成，不将已核客栈批次等同全工程改名完成。

复杂流程的作者提示区分「本次立即/稍后继续」与「下次重复/起始/指定段落」，
目标下拉显示中文状态名并保存原稳定ID；restart采用配置的initial，不是列表首项。
世界拍/宏任务仍是内部枚举，界面以「下一次世界更新/稍后继续（不等世界更新）」及解释呈现。

```ts
type AuthorScriptFlow =
  | {
      kind: 'stages'
      initial: StageId
      stages: Array<{
        id: StageId
        entry?: BaseSceneEntryPresentation
        body: AuthorCommand[]
        next?: StageId | { kind: 'complete' }
      }>
    }
  | {
      kind: 'stateMachine'
      machine: {
        id: MachineId
        label: string
        cadence?: 'transition'
        initial: StateId
        states: Record<
          StateId,
          {
            label: string
            entry?: BaseSceneEntryPresentation
            body: AuthorCommand[]
            next: BaseStateTransition
          }
        >
      }
    }

type BaseStateTransition =
  | { kind: 'complete' }
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: StateId }
  | { kind: 'advance'; state: StateId }
  | { kind: 'to'; state: StateId; yield: 'macroTask' | 'worldTick' }
  | { kind: 'branch'; cond: AuthorCondition; then: BaseStateTransition; else: BaseStateTransition }
  | {
      kind: 'commandOutcome'
      commandId: CommandId
      command: 'confirm'
      outcome: 'no'
      then: BaseStateTransition
      else: BaseStateTransition
    }
```

`continue` 表示同一次 invocation 内同步进入下一 state；`advance` 在 safe-point 提交 cursor；
`to` 还显式声明宏任务或世界拍让步；`commandOutcome` 绑定稳定 `CommandId`，承接命令结果分支。
stage省略next表示下次仍运行当前步骤，指定StageId表示下一次激活转到该步骤；
stage与machine都可显式`{kind:'complete'}`，正文成功结束后在安全点提交`{kind:'completed'}`游标。
完成的owner保留方案身份但不再获取lease、触发前台或自动轮询；保存/读回保持完成状态。
同有效方案选择保留游标；真正切换方案（含禁用后重新启用）仍从初始节点复位。
取消、stopScript、未结束的共享调用、未通过modal安全门或过期epoch不得制造完成；
完成绑定刷新不重置无关实体动画。不用作者空结束节点表达一次性结束。
`jumpScript`、匿名 binding 和作者可见 generated block 均不是 v5 作者命令。

`cadence:'transition'` 是显式节拍模式：compiler 不在 state 正文及其嵌套分支、循环、战斗结果、
共享脚本调用之间插入兼容等待，正文的多条命令视为同一条源指令在同一帧内完成，只有 state
transition 决定是否进入下一世界拍。它主要用于忠实承载迁移后的源指令状态机；普通作者脚本
省略该字段，继续使用既有的 per-command 节拍。PAL 的世界拍为 100ms，而源引擎 `0x09` 以
40ms 帧计数；迁移后统一展开为每计数一个 100ms 世界拍，这是明确登记的节拍近似，不冒充
绝对时长无损。

compiler 将 canonical flow 降成只存在于内存或可删缓存的 `ExecutableFlow`。生成块可以有内部
地址和调度节点，但必须带 compiler/content digest，且绝不能回写 canonical 内容、存档、引用索引
或 MG2 冲突键。SAVE10只存带同一content digest的自动执行帧，不存生成块或可执行代码；
内部指令ordinal属于执行定位，不作为任何内容对象身份。

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
  `CanonicalScriptFlowEditor` 在它外层统一编辑 stage/state/transition。共享脚本、物品私有脚本、
  实体 Behavior 和场景 Hook 只保留各自的 identity、选择、引用和元数据外壳，不各写一套正文
  编辑器。
- 所有修改都派发到同一个 `ScriptEditSession`，因此共用 schema/reference/cursor 校验以及
  undo/redo/save 闭环。canonical 作者界面不以整段 JSON textarea 作为日常编辑入口。
- 场景脚本入口仍是完整场景工作台：上半区保留真实地图和播放、单步、重置、引擎试玩，下半区
  是可调高度的通用脚本编辑抽屉，可在“场景 Hook / 实体行为”间切换。不能因为正文组件统一而
  降级成脱离地图的纯表单。
- 场景预览会把当前 canonical flow 和共享调用只读降级到既有预览播放器；该投影不回写
  canonical 内容。共享脚本库和物品工作台按所有者上下文编辑正文，需要空间语境时应从具体场景
  调用点打开或进入场景工作台预览，不能为每种所有者复制一套地图/播放器。

### 持久状态与调度

- `WorldScriptState` 保存 flags/vars、按场景分区的 `entityState/entityPos/entityLayer`，
  以及 Page/Behavior/Hook 选择、epoch 和 `FlowCursor`。
- 作者cursor仍在flow业务边界提交；SAVE10另保存自动flow的引擎内部命令续跑位置、嵌套控制帧及单步提交相位，
  不把它们变成作者步骤，也不保存临时交互/战斗调用栈。后台移动不等待整步结束才允许存档，详见当前存档合同。
- 默认 auto 的 100ms compatibility boundary、段间 40ms、hidden/authority 等兼容调度由
  compiler 显式物化；`cadence:'transition'` 则只物化 transition 声明的节拍。runtime 不再靠
  遍历 AST 后的隐式 sleep 猜节拍。
- Page/Behavior/Hook 选择真正变化时递增 owner epoch；旧 invocation 持 lease 跑到下一
  safe-point，过期 cursor 的 CAS 会被丢弃。
- 保存活动身份只在同runtime、exact AbortSignal和真实live lease之间共享；owner epoch失效与lease关闭不是同一件事。
  内联场景钩子/行为有独立owner互斥与cursor，作为父命令的子调用自然结束前仍被保存barrier计数；
  它不会因保存gate在`to`链中途返回假成功，但abort/epoch检查仍有效。同owner busy不重入。
  独立新根仍等待gate并在醒来时复核来源场景/session，独立在途根仍按原安全点暂停规则执行。

### 当前加载与发布边界

- HTTP/runtime/editor loader 只接受 contentVersion 21；存档只接受 SAVE10 / content21。
- 作者正文直接维护；已退役的原版完整脚本转换核不再参与发布。保留的窄资源/地图供应分区
  经三方merge与完整闭包预检后提交manifest；不发布脚本分片、版本transition或migration sidecar。
- 旧工程和旧开发期存档可由 Git 取回对应历史代码重建，但不进入当前产品路径。发现版本不匹配时
  fail-loud，不猜字段、不读取旧 sidecar，也不保留“以后可能用到”的兼容 fallback。

## 场景入场呈现

场景 `onEnter` 流程的初始节点可以声明 `entry: { prepare, reveal }`；对于 stages 是 `initial` 指定的 stage，
对于 stateMachine 是 `machine.initial` 指定的 state。其他节点、实体行为和普通共享脚本不能声明此字段。
`prepare` 为作者指令列表，`reveal` 使用 `SceneReveal`；执行顺序为准备目标画面、呈现切换、正文。

该范围由 [作者流程校验](../../../packages/content/src/author-script-core.ts#L938) 的
`allowSceneEntry` 与初始节点检查共同约束；字段定义见同文件 `BaseSceneEntryPresentation`。
编辑方法见 [场景入场指南](../guides/scene-entry-authoring.md)。
