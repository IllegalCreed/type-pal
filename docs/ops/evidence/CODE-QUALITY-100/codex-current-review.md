# CODE-QUALITY-100 Codex 当前独立复核（2026-10-17）

2026-10-18 当前勘误：2daed1bb7的“完全重复/等价迁移”判断不成立；Save域旧roundtrip缺五类字段，读侧克隆也不能由存侧替代。现已在api.test补回六字段及独立读侧克隆，明确内存环境/清理；生产实现未变，文件保持review。原候选结果按历史保留；[当前补审原件与反控](../QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)才是本次范围，不以旧PASS描述声称当前全仓零诊断。

## 范围与实际读取

本次在 `codex/code-quality-3y` 隔离 worktree、最新 `origin/main=36caec0251b48f94fa5b9d5c4c786571037f9869` 基点复核了：

- `packages/game/src/core/menu/save-slot-menu.ts`
- `packages/game/src/core/menu/save-slot-menu.test.ts`
- `packages/game/src/core/menu/save-slot-menu.glm-phase1-leaves.test.ts`
- `packages/game/src/core/menu/menu-driver.ts`（save/load/opening 与 Confirm/Cancel ownership caller）
- `packages/game/src/present/menu/draw-menu.ts`（SlotMeta 每帧渲染 oracle）
- `packages/game/src/core/save/api.ts`
- `packages/game/src/core/save/indexed-db.ts`
- `packages/game/src/core/menu/primitives.ts`
- `packages/game/src/core/menu/menu-save-chain.glm-msio.test.ts`
- `packages/game/src/core/menu/menu-driver.cov85.test.ts`
- `packages/game/src/core/save/__tests__/api.test.ts`
- `packages/game/src/core/save/__tests__/indexed-db.test.ts`

Primary source 是 `sdlpal/uigame.c:169-242` 的 `PAL_SaveSlotMenu`、
`:225` 的 1-based default slot→cursor 语义和 `:589-597` 的 savedTimes
跨槽计数；第二阶段没有新的 schema 或 UI 取舍。

## 结论

`save-slot-menu.ts` 的职责收敛为同步选择状态、slot id 读取和 `Save.listSlots()`
只读元数据填充。真实 caller 在 `menu-driver.ts` 的标题读档、系统保存/读档和
save-slot Confirm/Cancel 分支；`draw-menu.ts` 每帧从同一 `slotMetas` Map 读取，
不需要额外 UI trigger。`Save.saveSlot/loadSlot` 写/读 ownership 留在 dispatcher
和 bootstrap/Save API 域。检查了输入合法性、空表、越界 defaultSlot、非顺序 id、
异步 reject、状态 ownership 和无资源需要清理的生命周期，未发现直接产品缺陷。

`save-slot-menu.glm-phase1-leaves.test.ts` 只覆盖同步工厂/导航/current，和 IO
测试不重叠。`save-slot-menu.test.ts` 原有三条纯 Save API roundtrip 与
`core/save/__tests__/api.test.ts` 重复，已移除；原标为“边界 wrap”却只测中间项，
已改为准确语义并补首项→末项反例；新增 `Save.listSlots()` reject 后 warning、
已有 Map 不被污染的测试，并在该 describe 的 `afterEach` 恢复 spies。此前一次
定向运行确实捕获到 spy 泄漏污染后续 `savedTimes` 用例，修复后隔离验证通过。

## 验证

- 定向：`save-slot-menu.test.ts`、`save-slot-menu.glm-phase1-leaves.test.ts`、
  `menu-save-chain.glm-msio.test.ts`、`menu-driver.cov85.test.ts`；4 files / 58 tests
  PASS，0 stderr，`--maxWorkers=1`。
- `pnpm --filter @type-pal/game typecheck`：PASS。
- 当前树完整 `pnpm check`：PASS；game 321 files / 3613 tests、pal-extract 72 / 434、
  reforge 359 / 8964、editor 631 / 4943、migrate 96 / 739；lint 4962 文件
  0 errors / 0 warnings / 0 infos。
- `pnpm check:docs`：PASS（1470 Markdown / 8706 links / 2340 content reviews），
  `node scripts/quality/code-quality-ledger.mjs`：PASS（3307 / 231 / 12 / 3064）。
- 为同步本批真实 test identity，按用户授权刷新了 `scripts/coverage/baseline.fast.json`
  的 game 包窗口：3536→3585 tests，game statements 13869/15836→14152/15914，
  branches 9045/11456→9214/11532，functions 1591/1910→1623/1915，lines
  12385/13891→12634/13951；shared 与 pal-extract baseline 原值未改。该基线刷新
  没有降低 game 指标，属于测试身份/既有 game 交付同步，不是降低门槛。
- `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：运行完整 736-file
  fast coverage 后，保护身份删除已不再报告；仍因既有 shared/pal-extract 及 total
  coverage 回退退出 1（详见当前门禁日志），没有把失败写成通过。
- `pnpm coverage:ratchet`：同样完整运行 736 files / 19918 tests 后退出 1；失败项
  精确为 shared statements/branches、pal-extract statements/branches/functions/lines
  以及由它们造成的 total 四项比例回退。没有用 `--allow-scope-removal`、ignore 或
  降低阈值掩盖该失败。
- 全仓硬门仍未作为本批通过：editor 运行时诊断、game 全包 stderr，以及
  shared/pal-extract official coverage ratchet/protected fast baseline 回退仍在
  全局治理卡中；因此任务卡保持 `review`，不把整卡标成 `done`。
- 本批不触碰 schema/save 格式、公共接口、产品 UI 形态或生成物。

