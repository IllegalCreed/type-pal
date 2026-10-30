# CODE-QUALITY-101 — Codex 当前逐文件复核（2026-10-17）

2026-10-18 当前勘误：2daed1bb7的“完全重复/等价迁移”判断不成立；Save域旧roundtrip缺五类字段，读侧克隆也不能由存侧替代。现已在api.test补回六字段及独立读侧克隆，明确内存环境/清理；生产实现未变，文件保持review。原候选结果按历史保留；[当前补审原件与反控](../QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)才是本次范围，不以旧PASS描述声称当前全仓零诊断。

本批是 review-only 的 Save 域复核，不修改生产代码、存档格式、DB_VERSION、迁移或公共接口。完整读取了以下实现与测试，并读取真实 caller、公共出口、相邻类型和生命周期：

- `packages/game/src/core/save/api.ts`
- `packages/game/src/core/save/indexed-db.ts`
- `packages/game/src/core/save/__tests__/api.test.ts`
- `packages/game/src/core/save/__tests__/indexed-db.test.ts`
- `packages/game/src/core/menu/menu-driver.ts`
- `packages/game/src/core/menu/save-slot-menu.ts`
- `packages/game/src/shell/bootstrap.ts`
- `packages/game/src/tools/quick-save.ts`
- `packages/game/src/core/menu/menu-save-chain.glm-msio.test.ts`
- `packages/game/src/tools/quick-save.test.ts`

## 逐文件结论

### `api.ts` — review，公共输入域未裁决

API 在浏览器中委派 `IndexedDbSave`，无 IndexedDB 时使用内存 Map；两条路径共享深克隆、元数据提取和槽位排序，但 `saveSlot` 的运行时守卫仅比较 `slot < 1 || slot > MAX_SAVE_SLOTS`。`NaN` 与小数不满足这两个比较，因此会进入内存 Map；IndexedDB 主路径对同样的值可能抛出 key 编码错误，形成跨路径不一致。生产 caller 当前只生成 1..5 整数，不能证明公开 API 已拒绝其它数值。该发现触及 schema/save 与公共接口，已开 [GAME-SAVE-INPUT-DOMAIN-1](../../tasks/GAME-SAVE-INPUT-DOMAIN-1.md)，等待用户裁决，禁止在本批修复。

同时确认 `deepClone` 的存后变更隔离、缺槽返回 `null`、排序与覆盖行为有真实状态 oracle；不发现可在本批直接修的低风险产品缺陷。

### `indexed-db.ts` — review，事务风险分离，连接生命周期仍未知

驱动层只负责 `openDb`、object store 请求封装和事务请求；版本 2 的 upgrade 会重建旧 store，属于已登记的开发期存档作废纪律。`commitWrite` 只在 transaction `complete` 后 resolve，请求错误/abort 向上传播，三条 fake-indexeddb 真实回归覆盖成功提交、put 后 abort 保留旧槽、delete 后 abort 保留旧槽；这部分由 [GAME-SAVE-IDB-COMMIT-1](../../tasks/GAME-SAVE-IDB-COMMIT-1.md) 独立维护。

`_dbPromise` 没有显式 `db.close()`，`_resetDbConnectionForTest` 只重置句柄；open 失败缓存与连接关闭生命周期没有足够主路径证据。因此保持 review，不把薄包装或包级测试绿灯写成“已验证”。

### `api.test.ts` — review，内存 oracle 有效但缺双路径输入合同

完整核对 8 个测试：合法保存/读取、保存后 mutate 隔离、缺槽、排序与元数据、删除、越界、覆盖、MAX 槽位。fixture 使用真实 `GameState` 构造，beforeEach 清理内存路径；这些断言对已有内存合同有判别力，且不重复 Save API 事务测试。

测试运行环境不提供 IndexedDB，故该文件不能证明浏览器主路径。待输入域裁决后，非法 `NaN`/无穷/小数必须在内存和 fake-indexeddb 路径各有反例，并保持独立工厂与清理；当前不新增弱测试，不改 ledger 为已验证。

## 验证与门状态

- 定向：5 files / 36 tests PASS，`0 stderr`，单 worker；覆盖 api、indexed-db、save-slot-menu、menu-save-chain、quick-save。
- game typecheck：同一源码树通过。
- 最近同一源码树的 `pnpm check`、`pnpm lint`（4962 files，0/0/0）、game typecheck 和 `pnpm check:docs` 通过；ledger 机器检查通过。
- `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 仍因 shared/pal-extract 及总量计数回退失败；没有用 ignore、exclude、断言弱化或覆盖率下降掩盖输入域风险。
- 本批没有关闭文件。新增 3 条 ledger `review` 行后，机器账本预期为 3307 tracked / 231 closed / 15 review / 3061 pending，待门禁复核确认。

## 未解决与下一步

1. 等待用户裁决公开 Save 槽位是否统一要求有限整数 1..5；建议拒绝 `NaN`、无穷和小数。
2. 裁决后先写失败反例，再在两条真实路径实施最窄输入守卫和相邻回归；不得改存档格式或事务策略。
3. 在此之前继续不重叠的逐文件治理；CODE-QUALITY-101、GAME-SAVE-IDB-COMMIT-1 和本卡均保持 review/draft，不合并为 done。
