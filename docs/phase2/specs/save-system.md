# 当前存档合同

类型：现行规范（current）。当前产品为 contentVersion 20 / SAVE8；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/save-system-design.md)，不作为当前执行入口。

## 当前实现：SAVE8 / content20（2026-09-05）

`SAVE_VERSION` 与工程 `contentVersion` 是两个独立版本轴。正式上线前只支持当前 canonical，
当前写出的唯一 payload 为：

```ts
interface CurrentSavePayload {
  version: 8
  projectId: string
  contentVersion: 20
  world: WorldState
  position: { sceneId: string; pos: GridPos; facing: Facing }
}
```

`world.script` 由当前无版本领域模型 `WorldScriptState` 承载。它使用复合实体地址和
Page/Behavior/Hook 选择，保存 `FlowCursor`，不保存匿名 command index、调用栈或 wait 中间相位。
存档请求通过 flow safe-point barrier 后才拍快照；超时不提交半成品。

### 当前读档边界

1. `preflightCurrentSave` 只接受 `SAVE8/content20`；`normalizeCurrentSave` 校验后返回隔离副本。
2. 非当前 SAVE、非 content20、项目 id 不匹配或非法 `minimumSaveVersion` 都 fail-loud；不读
   sidecar、不尝试升级、不提供产品迁移入口。
3. PAL 与其他开发期工程重新生成 current 数据；开发期旧存档重新开档。历史实现由 Git 保存。

`manifest.minimumSaveVersion` 当前必须为 8。

| payload `version` | payload `contentVersion` | content20 项目结果 |
|---:|---:|---|
| 8 | 20 | current codec；校验并克隆返回 |
| 1..7 / 9+ | 任意 | 拒绝：不是当前 SAVE envelope |
| 8 | 非 20 | 拒绝：不是当前 content epoch |

### 角色临时状态的 restore 边界

`CharacterInstance.poisons`、`extraStatuses`、`extraPoisonRes` 可存在于运行中的世界快照，但恢复存档时
必须对 party 与 reserve 全部清除，包含 `incurable` 毒；入口 `StartWorld.seedConditions` 也不得在读档时
重新消费。该边界不同于战斗结束：战后只清定时状态、临时毒抗和 `common/severe` 毒，`incurable` 保留。

### 实现锚点

- `packages/reforge/src/save/types.ts`：`SAVE_VERSION = 8` 与唯一 `CurrentSavePayload`。
- `packages/reforge/src/save/current-codec.ts`：current-only preflight/normalize、边界拒绝与隔离克隆。
- `packages/reforge/src/save/current-save.current-characterization.test.ts`：当前 round-trip 和非当前
  fail-loud 回归。
- `packages/content/src/character.ts`：`CONTENT_VERSION = 20`、
  `CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 8`。
