# GAME-SAVE-INPUT-DOMAIN-1 — Save 槽位输入域与双路径一致性

Status: done
Phase: phase1
Capability: save input-domain correctness
Coding Owner: Codex
Reviewer: Codex
Visual Verification Timing: N/A（IO/公共 API 高风险边界）

## 2026-10-25 本地统一门收口（当前）

单一Owner Codex；同一codex/code-quality-94-102，main基点8ebcb70f0。用户两项裁决已落实，原范围54路径中20个新关闭、34既有关闭按版本桥接保留；12个相邻路径只验实际delta，不另授整文件信用。逐文件A–H、精确合同去向与完整失败/恢复原件见[当前收口](../evidence/CODE-QUALITY-94/approved-closeout/README.md)。

全仓20605产品＋714工具、七包TC与lint6111文件0/0/0；唯一official20168例／807源完成，原四条比率拒绝保留，仅三文件结构删除精确重计，同报告原ratchet/protected判据exit0；五项精确退役全部匹配。收尾docs/lint/ledger/diff原件提交前补齐，未齐不发布。状态done仅指本卡有限代码/质量门收口；本地冻结时尚未推送/PR/合并，实际远端发布由关联Git/PR与main CI记录，不能从本节预告继承。

旧日期或下方“当前/待裁决/rework”属于其明示候选，历史原件保留；不扩103+或重开pre94。

## 当前裁决与准入（2026-10-25）

用户明确批准保存、读取、删除统一只接受整数1–5，非法槽号报错。Codex单Owner，build allowed限api.ts私有守卫和独立memory/fake-IDB专测，先保存正式红例再修。NaN、正负Infinity、小数、0、6在两路径逐项验证；合法边界及已有事务complete/abort合同保留。listSlots、存档JSON、DB_VERSION、store/schema、迁移和清档不变。

唯一分支codex/code-quality-94-102，最新main8eb；相关94–102返工稳定后集中全仓/coverage/protected。下方等待裁决与禁止实现语句为旧日期历史，本轮已获准，不重复请示。

已实施统一私有整数边界守卫，三个入口在存储前验证；共同错误明确1–5整数合同。新专测8例覆盖两backend×三非法操作与合法1/5往返；正式基线2绿/6个指定AssertionError后，Save/IDB相邻3文件25例全绿、stderr0。首版Promise matcher在原生JSON中被Vitest包装为Error，原件保留，不用该包装结果冒充指定AssertionError。全仓/coverage和文件关闭仍等94–102整体冻结。

## 发现与停止线（历史，2026-10-17）

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
