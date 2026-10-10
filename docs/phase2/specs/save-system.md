# 当前存档合同

类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE12；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/save-system-design.md)，不作为当前执行入口。

## 当前实现 SAVE12 与 content22

`SAVE_VERSION` 与工程 `contentVersion` 是两个独立版本轴。正式上线前只支持当前 canonical，
当前写出的唯一 payload 为：

```ts
interface CurrentSavePayload {
  version: 12
  projectId: string
  contentVersion: 22
  world: WorldState
  position: { sceneId: string; pos: GridPos; facing: Facing }
  sceneRuntime: Record<string, SceneRuntimeState>
}
```

`world.script` 由当前无版本领域模型 `WorldScriptState` 承载。它使用复合实体地址和
Page/Behavior/Hook 选择，保存作者 `FlowCursor`。自动槽的cursor可带引擎内部`resume`：冻结内容digest、
命令执行帧、已选分支、固定循环迭代及确认选择臂；它不是作者步骤或额外状态机，也不在编辑器中展示。
ordinal只定位同一digest的编译正文，不充当实体/方案身份；恢复前严格校验内容、地址、帧和引用。
恢复中的未入栈子帧也属于续跑位置；确认结果直接保存在当前控制帧，不再有按命令id登记的outcomes表。
循环帧记录固定次数的位置或条件循环相位，不保存机器状态名；恢复不重问确认或重新求值已选中的chance分支。
一次性方案保存`{kind:'completed'}`，只接受所属flow显式声明complete的游标。
非当前开发档直接拒绝；E2E前驱须由当前版本真实流程重新生成，不修改旧证据或升级旧档。
后台自动flow无需执行完整步骤或结束巡逻才可保存。已完成指令推进执行帧后即可快照；
目标moveEntity从快照的NPC实际在途坐标重入同一目标指令，恢复保存的步态相位与慢速移动节拍；
自动wait按保存的剩余时长继续，不重新等待整段时长。
自动stepEntity/chasePlayer的未落步意图可重入；实际落步与内部continuation相位在同一同步motion batch提交，
恢复后只等target/owner续行门，不重复相对位移。追逐尚未发出的触发仍待发；交互开始后不可拍，结束才记done，避免奖励重放。
非可重入指令的提交期必须先结算该指令，避免半提交或重复奖励；不等待整个自动flow。
主壳在同一同步边界捕获当前场景所有NPC实际位置与下述运行态，不将终点或初始位置冒充在途位置。
作者chase保留的接触认领可跨wait/shared后继指令，不能只从当前叶逆推；快照另存当前活auto认领的
owner/target/behavior稳定地址于所属场景的`sceneRuntime[sceneId].chaseClaims`，恢复前校验实体、场景、
方案绑定，随新activation同步重建。旧顶层`automaticChaseClaims`不是SAVE12合同。
不持久化motion slot、commandEpoch、AbortSignal或Promise，不改变下一matching chase才触发self的既有语义。

### 场景现场与动作恢复

`sceneRuntime`是必需的引擎运行态容器，不是作者内容、状态方案或剧情阶段；新建且尚无现场的容器可为空。
场景和实体使用稳定id索引，场景内的automatic owner由所属场景限定，不是运行时epoch。

| 字段 | 保存的现场 |
|---|---|
| `world.script.entityPos[sceneId][entityId]` | NPC实际坐标的唯一持久来源；不在`sceneRuntime`另存位置副本 |
| `sceneRuntime[sceneId].entities[entityId]` | 朝向、显式定帧，以及motion中的步态相位/来源/owner、显式动画相位、在途move目标/速度/owner/慢速休止与节拍状态 |
| `sceneRuntime[sceneId].automatic[ownerId]` | 与world一致的自动cursor及可选等待；等待记录`kind/durationMs/remainingMs`，区分普通指令、追逐节拍/终点/距离/隐藏等待 |
| `sceneRuntime[sceneId].actions` | base/override动作binding、来源、是否awaited、步骤索引、步骤内耗时、结束标记和待应用循环相位；automatic override另含稳定owner，并可保留尚待cursor确认的正常兑现收据 |
| `sceneRuntime[sceneId].chaseClaims` | 已落地自动追逐的owner/target/behavior认领 |

动作仅保存纯数据进度，不复制canonical动作定义，不保存Promise、AbortSignal、运行时activation/command epoch。
恢复先验证全部场景引用、cursor/指令身份和动作进度，再同步提交world与scene；预检失败不替换当前世界。
基础页动作绑定未变时保持原相位；新增或改变的base独立启动，不清空其它实体或覆盖轨，也不重发已播放的起始cue。
被等待的automatic非循环动作接回新runner，从原相位继续；正常兑现但cursor尚未确认的收据直接接续，
不重播动作或历史清定帧副作用。收据表示指令正常兑现，不等于动画一定播到末帧；abort拒绝不产生收据。
非等待动作（`wait:false`，包括循环动作）的安装与其叶cursor推进对保存barrier为同一提交，不开放半安装快照。
后台动作可在所属行为完成后继续播放；恢复仍重建其取消owner，后续切方案、换页或终止owner可以清理跨实体动作。
script来源的覆盖轨只恢复动画进度，不重建已经结束或离场取消的前台runner。

正常离场在teardown前保存现场，未活动场景不后台模拟；返回先恢复现场再渲染/续跑，正常`onEnter`仍按当前绑定执行。
读档恢复同一现场但不重跑`onEnter`。离场期间显式定位、切方案/换页或生命周期命令使对应旧进度失效时，
不能以旧快照覆盖这些新的世界变更；这不要求作者把NPC初始状态复制进每个脚本。

同一runtime、同一个AbortSignal的内联子调用只在父lease仍属于当前coordinator的active登记时复用活动身份。
嵌套交互flow仍有自己的lease/owner/cursor，不因保存请求在嵌套正文中途返回；独立交互根flow仍在安全点结算。
已具备内部续跑记录的独立自动根lease在命令边界/可重入走位期间可保持活跃而允许快照；
新激活和下一条指令在短快照窗口等gate释放，保存不会停止巡逻。没有持久续跑的交互/临时活动仍须完成业务边界，
不声明战斗或对话中途保存。残留登记、已关闭或其他coordinator的lease不得绕过gate。
10秒仅保留给尚未结算的非可重入/交互业务；它不是后台走位的期限，也不靠延长或进展watchdog等待常驻NPC。

玩家F5快速存档与主动打开存档菜单共用探索输入准入；快速键不能越过确认框、对话、商店、奖励、战斗、
活动剧情或遇敌准备。普通后台NPC移动不剥夺这项准入；手动/快速存档共用快照与写槽队列。

DEV检查点导出使用`await window.__tpE2e.dumpSave()`，与普通槽保存共用主壳快照队列。
捕获时点是排队及barrier等待结束后的同步边界，而不是请求发出时；输出为独立当前payload，
不读写槽/缩略图、不增加保存次数。错误直接reject，调用者必须await并处理失败；失败不阻断后续请求。
存储和缩略图I/O继续在barrier外。该接口只保存自动flow内部执行帧，不保存临时交互调用栈或中途战斗态，
不替代R4的业务结束断言。
实现验证见[检查点导出](../../testing/checkpoint-export.md)，当前冻结旅程收据与剩余状态见本修复任务卡。

### 当前读档边界

1. `preflightCurrentSave` 只接受 `SAVE12/content22`；`normalizeCurrentSave` 校验后返回隔离副本，`sceneRuntime`缺失拒绝。
2. 非当前 SAVE、非 content22、项目 id 不匹配或非法 `minimumSaveVersion` 都 fail-loud；不读
   sidecar、不尝试升级、不提供产品迁移入口。
3. PAL 与其他开发期工程重新生成 current 数据；开发期旧存档重新开档。历史实现由 Git 保存。

`manifest.minimumSaveVersion` 当前必须为 12。

| payload `version` | payload `contentVersion` | content22 项目结果 |
|---:|---:|---|
| 12 | 22 | current codec；校验并克隆返回 |
| 1..11 / 13+ | 任意 | 拒绝：不是当前 SAVE envelope |
| 12 | 非 22 | 拒绝：不是当前 content epoch |

### 角色临时状态的 restore 边界

`CharacterInstance.poisons`、`extraStatuses`、`extraPoisonRes` 可存在于运行中的世界快照，但恢复存档时
必须对 party 与 reserve 全部清除，包含 `incurable` 毒；入口 `StartWorld.seedConditions` 也不得在读档时
重新消费。该边界不同于战斗结束：战后只清定时状态、临时毒抗和 `common/severe` 毒，`incurable` 保留。

### 实现锚点

- `packages/reforge/src/save/types.ts`：`SAVE_VERSION = 12` 与唯一 `CurrentSavePayload`。
- `packages/reforge/src/scene-runtime-state.ts`、`world-motion-runtime.ts`、`entity-action-player.ts`：场景现场、运动和动作进度。
- `packages/reforge/src/main.ts`：`captureSceneRuntime/captureCurrentSavePayload`同步捕获、`prepareSceneActions/restorePayload`恢复事务及正常切场景接线。
- `packages/reforge/src/runtime-script-project.ts`：`validateSceneRuntimeContinuations`核对现场进度与canonical自动指令。
- `packages/reforge/src/save/current-codec.ts`：current-only preflight/normalize、边界拒绝与隔离克隆。
- `packages/reforge/src/save/current-save.current-characterization.test.ts`：当前 round-trip 和非当前
  fail-loud 回归。
- `packages/content/src/character.ts`：`CONTENT_VERSION = 22`、
  `CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 12`。
- [后台脚本快照修复任务](../../ops/archive/tasks/done/SAVE-AUTO-CHECKPOINT-1-background-script-snapshots.md)：前提、反控和当前交付状态。
- [001–006连续验证任务](../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)：SAVE12现场恢复修复及新版本E2E待验证状态；历史收据不改写为当前版本通过。
