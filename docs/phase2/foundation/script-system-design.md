# 剧情脚本系统

> **当前实现（contentVersion 20 / SAVE 8，2026-09-06 复核）**：canonical 脚本模型没有版本后缀，位于
> `packages/content/src/author-script*.ts`、`runtime-script.ts`、`author-scene.ts` 与
> `runtime-scene.ts`；compiler/runtime/editor/save 直接消费当前模型。正式上线前不支持历史工程或
> 存档，旧脚本类型、upgrader、sidecar、fixture 和产品迁移入口已删除。本文后半保留的 v0 草稿只用于
> 追溯早期取舍，字段名和作者模型不再是当前契约。
> 最终验收状态见
> [`N3-1` 任务卡](../../ops/tasks/N3-1-script-control-flow-modernization.md)。

## canonical script 契约（当前 contentVersion 20；下文旧版本号为历史快照）

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

```ts
type AuthorScriptFlow =
  | {
      kind: 'stages'
      initial: StageId
      stages: Array<{
        id: StageId
        entry?: BaseSceneEntryPresentation
        body: AuthorCommand[]
        next?: StageId
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
`jumpScript`、匿名 binding 和作者可见 generated block 均不是 v5 作者命令。

`cadence:'transition'` 是显式节拍模式：compiler 不在 state 正文及其嵌套分支、循环、战斗结果、
共享脚本调用之间插入兼容等待，正文的多条命令视为同一条源指令在同一帧内完成，只有 state
transition 决定是否进入下一世界拍。它主要用于忠实承载迁移后的源指令状态机；普通作者脚本
省略该字段，继续使用既有的 per-command 节拍。PAL 的世界拍为 100ms，而源引擎 `0x09` 以
40ms 帧计数；迁移后统一展开为每计数一个 100ms 世界拍，这是明确登记的节拍近似，不冒充
绝对时长无损。

compiler 将 canonical flow 降成只存在于内存或可删缓存的 `ExecutableFlow`。生成块可以有内部
地址和调度节点，但必须带 compiler/content digest，且绝不能回写 canonical 内容、存档、引用索引
或 MG2 冲突键。

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
- 存档只在 flow safe-point 捕获 cursor；不持久化 command index、调用栈或 wait 中间相位。
- 默认 auto 的 100ms compatibility boundary、段间 40ms、hidden/authority 等兼容调度由
  compiler 显式物化；`cadence:'transition'` 则只物化 transition 声明的节拍。runtime 不再靠
  遍历 AST 后的隐式 sleep 猜节拍。
- Page/Behavior/Hook 选择真正变化时递增 owner epoch；旧 invocation 持 lease 跑到下一
  safe-point，过期 cursor 的 CAS 会被丢弃。

### 当前加载与发布边界

- HTTP/runtime/editor loader 只接受 contentVersion 20；存档只接受 SAVE 8 / content20。
- 迁移器从真实提取输入与当前作者 baseline 直接构建 current publication，三方 merge、完整闭包预检后
  最后提交 manifest；不发布脚本分片、版本 transition 或 migration sidecar。
- 旧工程和旧开发期存档可由 Git 取回对应历史代码重建，但不进入当前产品路径。发现版本不匹配时
  fail-loud，不猜字段、不读取旧 sidecar，也不保留“以后可能用到”的兼容 fallback。

---

## 历史 v0 草稿（已被上文 supersede）

> 第二阶段（Reforge）地基。本文**只定数据形状**，不写运行时解释器、不碰查看器/编辑器。
> 目标：让运行时、查看器、将来的编辑器三层都吃同一个干净、可序列化的模型。

## 一句话架构

**世界 = 实体 + 触发器 + 脚本。** NPC 对话、宝箱、地上道具、过场动画、用道具触发的剧情……
本质都是同一件事：某个**触发器**启动一段**脚本**，脚本按命令流演出（出字 / 给物 / 走位 / 镜头 / 换场景…）。
没有独立的「对话系统 / 宝箱系统 / 拾取系统」——只有一个解释器 + 一套命令 + 一层触发器。

> 活证：RPG Maker 的 Event = 触发条件（页）+ 命令列表，跑了 25 年;原版仙剑引擎本来就是这个。
> 我们是把这个被验证过的设计 clean-rewrite，**不沿用原版扁平 bytecode + IP 跳转，改结构化嵌套 AST**（见决策①）。

## 核心 shape

```ts
import type { DialogueLine, EntityDef, Facing, GridPos } from '@type-pal/content'

// ── 持久世界状态(跟存档)── 在现有 WorldState(party/money/learnedSkills/inventory)上加两层:
//    脚本的 branch 读它、命令写它。宝箱开过、NPC 说过、剧情进度,全是这里的 flag/var。
interface WorldStateScriptExt {
  flags: Record<string, boolean> // 开关:'chest_42_opened' / 'met_linger'
  vars: Record<string, number> // 计数/进度变量
}

// ── 条件 ── 只读 world flags/vars/背包;用于 branch、触发器守卫、模板生成。
type Condition =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'hasItem'; itemId: string; atLeast?: number }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; cond: Condition }

// 指谁:玩家 / 某实体(NPC、可动物件)。
type ActorRef = 'player' | { entity: string }

// ── 命令 ── 脚本的"指令"。判别联合 = clean-rewrite 自原版 opcode。
//    控制流(branch/parallel/wait)用**结构化嵌套**:子命令直接内嵌,不是 IP 跳转(决策①)。
//    下面是**起步集**,更多命令按内容需要再加(content-first,别一次造全)。
type Command =
  // —— 演出 / 对话 ——
  | { kind: 'dialog'; line: DialogueLine } // 出一句(复用现有 DialogueLine 载荷)
  | { kind: 'choice'; prompt?: DialogueLine; options: ChoiceOption[] } // 选项 → 各自分支
  // —— 角色 / 镜头 ——
  | {
      kind: 'moveActor'
      actor: ActorRef
      path: GridPos[] // 途经点,逐段直线走;非直线就拆成多点(不做自动寻路,演出要精准可控)
      speed?: 'slow' | 'normal' | 'fast' | 'run' // 移动速度可调
      wait?: boolean // true=阻塞到走完
    }
  | { kind: 'faceActor'; actor: ActorRef; facing: Facing }
  | { kind: 'camera'; to: { actor: ActorRef } | { pos: GridPos } | { follow: 'player' }; wait?: boolean }
  // —— 写世界状态 ——
  | { kind: 'giveItem'; itemId: string; count?: number }
  | { kind: 'loseItem'; itemId: string; count?: number }
  | { kind: 'learnSkill'; charId: string; skillId: string }
  | { kind: 'giveMoney'; delta: number } // 负数 = 扣钱
  | { kind: 'setFlag'; flag: string; value: boolean }
  | { kind: 'setVar'; var: string; value: number }
  | { kind: 'addVar'; var: string; delta: number }
  // —— 表现 ——
  | { kind: 'playEffect'; effectId: string; at?: ActorRef | GridPos }
  | { kind: 'playVideo'; asset: AssetId } // 工程内视频，稳定 AssetId
  | { kind: 'playFrameAnimation'; asset: AssetId; startFrame?: number; endFrame?: number; frameRate?: number }
  | { kind: 'playSound'; soundId: string }
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number }
  // —— 流程控制(结构化嵌套)——
  | { kind: 'wait'; ms?: number; until?: Condition }
  | { kind: 'branch'; cond: Condition; then: Command[]; else?: Command[] }
  | { kind: 'parallel'; branches: Command[][] } // fork-join:全部并发,全完成才继续(多 NPC 同时动)
  | { kind: 'callScript'; scriptId: string } // 调用另一段脚本(复用)
  | { kind: 'loadScene'; sceneId: string; entry?: GridPos } // 换场景
  | { kind: 'startBattle'; enemyTeamId: string; onWin?: Command[]; onLose?: Command[] } // 调进战斗(边界:战斗是另一套系统)
  | { kind: 'stop' } // 提前结束本脚本

interface ChoiceOption {
  label: string
  cond?: Condition // 不满足则该选项隐藏/置灰
  body: Command[]
}

// ── 脚本 ── 一串命令,顺序执行;末尾隐含结束。
interface Script {
  id: string
  body: Command[]
}

type TriggerKind = 'interact' | 'use' | 'sceneEnter' | 'touch' | 'auto'

// ── 实体 ── 世界里的"东西"(NPC/宝箱/门/道具),类型不是子系统,只是"页"的集合。
//    用"页"模型(RPG Maker pages):实体挂多套**条件状态**,进场(及 flag 变化)时选**最末一个
//    when 满足**的页生效——决定造型/位置/在不在/交互脚本。这就是**跨场景联动**机制(决策⑥):
//    场景 A 的脚本置 flag → 场景 B 的 NPC 进场自己读 flag 选页(不是 A "通知" B)。
interface EntityPage {
  when?: Condition // 省略 = 默认页(兜底)
  sprite?: string
  pos?: GridPos
  facing?: Facing
  visible?: boolean // false = 这状态下 NPC 不出现
  trigger?: { on: TriggerKind; run: Script | { scriptId: string } } // 该页的触发口 + 脚本
}
interface Entity {
  id: string
  pages: EntityPage[] // 无 when 的页兜底;有 template 时由模板按 params 展开成 pages
  template?: TemplateInstance // 见决策③(模板=带参智能实体)
}

// ── 模板(决策③,b 方案:带参智能实体)──
//    存的是 params(永远能用友好表单改),expand(t) → Trigger[]/Script(标准命令,运行时/查看器零特判)。
//    expand 是逻辑(运行时/编辑器),不在 shape 里;这里只定 params 形状。
type TemplateInstance =
  | { kind: 'chest'; itemId: string; count?: number; message?: string; flag: string } // 宝箱
  | { kind: 'pickup'; itemId: string; count?: number; flag: string } // 地上道具
  | { kind: 'talk'; lines: DialogueLine[]; cond?: Condition } // 一句话/多句 NPC
// …更多模板按内容需要加,全部 expand 成标准 Command,底层统一。
```

## 关键决策

① **结构化嵌套 AST，不用扁平 IP 跳转。** 原版/sdlpal 是扁平 bytecode + goto;我们让 `branch`/`parallel`
   把子命令**直接内嵌**（`then: Command[]` / `branches: Command[][]`）。理由:人读、查看器渲染、编辑器
   都对树形友好,且杜绝悬空 goto。代价:不能表达任意 spaghetti 跳转——但 clean-rewrite 本就不想要。

② **持久状态是一等公民。** 脚本不是纯线性——它读/写 world `flags`/`vars`,`branch` 据此分支。
   宝箱开过、NPC 说过、进度计数全在这里。挂到现有 `WorldState`(跟存档)。

③ **模板 = 带参智能实体(b 方案)。** 高频物件(宝箱/捡道具/一句话 NPC)不手搓命令——存 `params`,
   编辑器给友好表单,运行/导出时 `expand` 成标准命令。**底层模型统一,编辑器在上面铺易用 UI**,
   复杂的 5% 留「降到原始脚本」逃生口。和现有「能力块 + effect[] 判别联合 / 菜单特化视图」同一原则。

④ **战斗是边界外的独立系统。** 脚本用一条 `startBattle` 命令**调进去**,回合战引擎本身不是脚本。
   世界交互/演出 = 脚本;战斗 = 脚本能调用的另一套。接口就是这一条命令,别糊一起。

⑤ **命令集 content-first 增长。** 上面是起步集,不追求一次造全;真做某段剧情时缺什么加什么。

⑥ **实体是场景本地的;跨场景联动只靠全局 flag。** 脚本/实体跟着场景加载(进哪个场景加载哪个的)。
   每个场景加载时读全局 `flags`/`vars`,决定**本场景内**哪些 NPC 出现、以何状态出现(= 实体的多个
   条件"版本/页",**作用域仅在本场景**;大多数 NPC 只一版)。NPC 不知道别的场景,只看全局 flag。
   - 跨场景:场景 A 置 flag → 回场景 B 时,B 自己加载、自己读 flag 呈现(A/B 互不知情)。
   - **同一角色可在多个场景各自独立定义**(碰巧同造型/名),无"全局 NPC 对象",故无冲突、无需注册表。
     (= RPG Maker:同一人物在两张图 = 两个互不相干的事件。)

⑦ **移动是路径点,不做自动寻路。** `moveActor` 给一串途经点逐段直线走 + 速度可调;非直线就拆点。
   演出要精准编排(走你指定的路线),寻路(A*)对过场不划算且多套陌生技术。自由游荡 NPC 的寻路将来另说。

## 接到现有的东西

- `dialog` 命令的载荷 = 现有 **`DialogueLine`**;`dialog-box` 仍是表现层,改由脚本驱动+排序。
  现有 `Dialogue{id,lines[]}` ≈ 一段全是 `dialog` 命令的脚本。
- `EntityDef` 升级成"页"模型(`pages[]`),泛化当前 demo 的 `interact`(= 单页、单 interact 触发)。
- `ItemUseEffect.triggerScript`(风灵珠/桂花酒)= `use` 触发口指向一段脚本。
- `WorldState` 加 `flags`/`vars`。

## 本文不含（按梯度推迟）

- **运行时解释器**（跑这棵树;第一阶段 `event-system.ts` 是 1:1 参考）——下一步地基。
- **查看器/检查器**（渲成树/流程 + 高亮执行到哪）——和运行时一对,早做,是单人开发的验证眼睛。
- **模板 expand 逻辑** + **可视化拖拽编辑** + **完整命令集**——增量、可推迟。

## 待定 / 评审点

- 命令起步集是否够覆盖第一段要做的剧情？
- `Condition` 表达力够不够（要不要表达式而非固定 kind）？
- `parallel` 的 join 语义（全完成才继续）是否够，要不要「任一完成」/超时？
- 模板起步三个（chest/pickup/talk）选得对不对？
