# GAME-SAVE-INPUT-DOMAIN-1 — Save 槽位输入域与双路径一致性

Status: draft
Phase: phase1
Capability: save input-domain correctness
Coding Owner: 未分配（等待用户裁决）
Reviewer: Codex
Visual Verification Timing: N/A（IO/公共 API 高风险边界）

## 发现与停止线（2026-10-17）

CODE-QUALITY-101 逐文件复核发现 `packages/game/src/core/save/api.ts` 的公开
`Save.saveSlot(slot, state)` 只做 `slot < 1 || slot > MAX_SAVE_SLOTS` 检查。因而
`NaN` 和小数值会通过范围守卫：内存 fallback 会把它们写入 Map，而 IndexedDB
路径可能在 key 编码时抛出 `DataError`。这使同一个公开 API 在两条运行时路径上
出现不同结果。当前生产 caller（menu-driver、save-slot-menu、quick-save、
bootstrap）均传入 1..5 的整数，但这不能替代公共输入合同。

这是 schema/save 与公共接口边界。当前只登记事实，不修改 `api.ts`、IndexedDB
schema、DB 版本、清档策略或 caller；本卡没有 `build allowed`。不得以测试绿灯、
包级覆盖率或当前 caller 的整数事实把未知合同标成已验证。

## 事实锚点与待裁决项

- Primary source：第一阶段 `MAX_SAVE_SLOTS = 5` 真值，以及当前 `api.ts` 的
  `SaveSlotId`/`saveSlot` 实现；IndexedDB keyPath `id` 与 `indexed-db.ts` 的请求/事务边界。
- 真实 caller：`packages/game/src/core/menu/menu-driver.ts`、
  `packages/game/src/core/menu/save-slot-menu.ts`、
  `packages/game/src/shell/bootstrap.ts`、`packages/game/src/tools/quick-save.ts`。
- 当前相邻 oracle：`core/save/__tests__/api.test.ts` 与
  `core/save/__tests__/indexed-db.test.ts`；本批已运行真实保存菜单/快存链回归。
- 用户需裁决：公开 API 是否拒绝非有限、非整数或越界槽位（推荐在 API 边界统一
  拒绝），还是正式支持其它数值 key。裁决前禁止实现或改变产品行为。

## 需要的反例与验收

若用户批准“整数 1..5”合同，先保留失败反例，再分别在内存 fallback 和
`fake-indexeddb` 主路径验证 `NaN`、`Infinity`、`-Infinity`、`1.5`、`0`、`6`
均被同一错误合同拒绝，并证明合法槽位的保存/读取/删除与已有事务提交语义不回退。
测试必须使用真实 Save caller/oracle、独立数据库工厂和隔离清理；不能只测一个
局部 helper，也不能把类型断言当运行时验证。

不涉及存档格式、迁移、DB_VERSION、旧版本恢复或第二阶段 Reforge。若裁决要求
改变公共接口、存档格式或兼容策略，先回到用户决策，不在本卡顺手扩 scope。

## 当前交接

- CODE-QUALITY-101 的 `api.ts`、`indexed-db.ts`、`api.test.ts` 已完整读取，保持
  `review`；未写入已验证账本状态。
- `GAME-SAVE-IDB-COMMIT-1` 的事务提交/失败传播是独立问题，已实现并仍由其卡
  记录；本卡不重写其历史结论。
- 下一步：等待输入域裁决；裁决前可继续不重叠、非公共 save 边界的逐文件复核。
