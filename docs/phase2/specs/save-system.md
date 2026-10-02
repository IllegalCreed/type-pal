# 当前存档合同

类型：现行规范（current）。当前产品为 contentVersion 21 / SAVE10；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/save-system-design.md)，不作为当前执行入口。

## 当前实现：SAVE10 / content21（2026-10-01）

`SAVE_VERSION` 与工程 `contentVersion` 是两个独立版本轴。正式上线前只支持当前 canonical，
当前写出的唯一 payload 为：

```ts
interface CurrentSavePayload {
  version: 10
  projectId: string
  contentVersion: 21
  world: WorldState
  position: { sceneId: string; pos: GridPos; facing: Facing }
  automaticChaseClaims?: { owner: EntityAddress; target: EntityAddress; behavior: string }[]
}
```

`world.script` 由当前无版本领域模型 `WorldScriptState` 承载。它使用复合实体地址和
Page/Behavior/Hook 选择，保存作者 `FlowCursor`。自动槽的cursor可带引擎内部`resume`：冻结内容digest、
命令执行帧、已选分支/循环迭代及confirm结果；它不是作者步骤或额外状态机，也不在编辑器中展示。
ordinal只定位同一digest的编译正文，不充当实体/方案身份；恢复前严格校验内容、地址、帧和引用。
恢复中的未入栈子帧也属于续跑位置；顶层已执行confirm结果必须完整且与控制帧一致。
一次性方案保存`{kind:'completed'}`，只接受所属flow显式声明complete的游标。
非当前开发档直接拒绝；E2E前驱须由当前版本真实流程重新生成，不修改旧证据或升级旧档。
后台自动flow无需执行完整步骤或结束巡逻才可保存。已完成指令推进执行帧后即可快照；
目标moveEntity从快照的NPC实际在途坐标重入同一目标指令，wait允许重等当前时长。
自动stepEntity/chasePlayer的未落步意图可重入；实际落步与内部continuation相位在同一同步motion batch提交，
恢复后只等target/owner续行门，不重复相对位移。追逐尚未发出的触发仍待发；交互开始后不可拍，结束才记done，避免奖励重放。
非可重入指令的提交期必须先结算该指令，避免半提交或重复奖励；不等待整个自动flow。
主壳同步快照覆盖当前场景所有NPC实际位置，不将终点或初始位置冒充在途位置。
作者chase保留的接触认领可跨wait/shared后继指令，不能只从当前叶逆推；快照另存当前活auto认领的
owner/target/behavior稳定地址，恢复前校验实体、场景、方案绑定，随新activation同步重建。
不持久化motion slot、commandEpoch、AbortSignal或Promise，不改变下一matching chase才触发self的既有语义。

同一runtime、同一个AbortSignal的内联子调用只在父lease仍属于当前coordinator的active登记时复用活动身份。
嵌套交互flow仍有自己的lease/owner/cursor，不因保存请求在`to`链中途返回；独立交互根flow仍在安全点结算。
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

1. `preflightCurrentSave` 只接受 `SAVE10/content21`；`normalizeCurrentSave` 校验后返回隔离副本。
2. 非当前 SAVE、非 content21、项目 id 不匹配或非法 `minimumSaveVersion` 都 fail-loud；不读
   sidecar、不尝试升级、不提供产品迁移入口。
3. PAL 与其他开发期工程重新生成 current 数据；开发期旧存档重新开档。历史实现由 Git 保存。

`manifest.minimumSaveVersion` 当前必须为 10。

| payload `version` | payload `contentVersion` | content21 项目结果 |
|---:|---:|---|
| 10 | 21 | current codec；校验并克隆返回 |
| 1..9 / 11+ | 任意 | 拒绝：不是当前 SAVE envelope |
| 10 | 非 21 | 拒绝：不是当前 content epoch |

### 角色临时状态的 restore 边界

`CharacterInstance.poisons`、`extraStatuses`、`extraPoisonRes` 可存在于运行中的世界快照，但恢复存档时
必须对 party 与 reserve 全部清除，包含 `incurable` 毒；入口 `StartWorld.seedConditions` 也不得在读档时
重新消费。该边界不同于战斗结束：战后只清定时状态、临时毒抗和 `common/severe` 毒，`incurable` 保留。

### 实现锚点

- `packages/reforge/src/save/types.ts`：`SAVE_VERSION = 10` 与唯一 `CurrentSavePayload`。
- `packages/reforge/src/save/current-codec.ts`：current-only preflight/normalize、边界拒绝与隔离克隆。
- `packages/reforge/src/save/current-save.current-characterization.test.ts`：当前 round-trip 和非当前
  fail-loud 回归。
- `packages/content/src/character.ts`：`CONTENT_VERSION = 21`、
  `CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 10`。
- [后台脚本快照修复任务](../../ops/archive/tasks/done/SAVE-AUTO-CHECKPOINT-1-background-script-snapshots.md)：前提、反控和当前交付状态。
