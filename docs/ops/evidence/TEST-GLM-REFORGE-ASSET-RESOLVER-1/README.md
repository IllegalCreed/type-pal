# TEST-GLM-REFORGE-ASSET-RESOLVER-1 证据索引（GLM r1）

- 交付物（仅新增测试，产品零 diff）：
  - `packages/reforge/src/asset-resolver.failure-causes.test.ts`（C1/C2）
  - `packages/reforge/src/project-image-cache.decode-lifecycle.test.ts`（C3/C4/C5）
  - `packages/reforge/src/project-image-cache.inflight-dispose.test.ts`（C6/C7）
  - `packages/reforge/src/project-loader.image-cache-binding.test.ts`（C8）
- 排重账：[dedup-ledger.md](dedup-ledger.md)（8 新增合同 + 登记未测项 + 现行政策登记 + 判例）
- 身份集：[identity.json](identity.json)（执行集 10 文件 43 测试全绿；含 8 条新合同 fullName）
- 反控：[mutation-results.json](mutation-results.json) 7/7 VALID；逐相位 raw 见
  [mutation-logs/](mutation-logs/)（`SHARED-original.*` + 每针 `-red.*`/`-restored.*` 的
  stdout 与身份集；`.log` 受 .gitignore 约束，须 `git add -f`）

## 反控口径

每针 = 产品源码单点变异（find 在目标文件命中恰 1 次才有效）→ 执行集全量跑（见下）。
红相位验收：exit≠0 且 failed-total 恰 1 且唯一失败为目标合同且首条失败为业务
AssertionError；恢复相位：按字节恢复源码（sha256 与原始一致）→ 复跑全绿且身份集 hash
与原始绿一致。原始绿/恢复绿身份集、变异/恢复源码 sha（四态 hash）逐针落
mutation-results.json；变异全程在 mkdtemp 副本内进行，交付树从未被变异触碰
（clean-tree 见下），副本用后即删（清理证明见任务卡回执）。

执行集（10 文件 = 4 新 + 6 旧模块测）：

```txt
packages/reforge/src/asset-resolver.failure-causes.test.ts      （新）
packages/reforge/src/project-image-cache.decode-lifecycle.test.ts（新）
packages/reforge/src/project-image-cache.inflight-dispose.test.ts（新）
packages/reforge/src/project-loader.image-cache-binding.test.ts （新）
packages/reforge/src/asset-resolver.test.ts
packages/reforge/src/asset-resolver.io-boundaries.test.ts
packages/reforge/src/project-image-cache.test.ts
packages/reforge/src/project-image-cache.lifecycle.test.ts
packages/reforge/src/project-loader.test.ts
packages/reforge/src/project-loader.current-boundaries.test.ts
```

| 针 | 源行（基线 f83ed41e9） | 变异（节选） | 目标合同 |
|---|---|---|---|
| MUT-01 | asset-resolver.ts:96 | `: String(error)` → `: 'opaque-fault'` | C1 非 Error 原因包装 |
| MUT-02 | asset-resolver.ts:84 | `dispose?.()` → `dispose()` | C2 无 dispose 源 no-op |
| MUT-03 | project-image-cache.ts:58 | `解码 AssetId` → `解码资产` | C3 解码失败消息 |
| MUT-04 | project-image-cache.ts:55 | `type: record.mediaType` → 硬编码 octet-stream | C4 Blob mediaType 保真 |
| MUT-05 | project-image-cache.ts:7 | 删 `'item-icon',` | C5 kind 正面枚举 |
| MUT-06 | project-image-cache.ts:44 | 删 `this.pending.clear()` | C6 dispose 清 pending |
| MUT-07 | project-loader.ts:455 | 绑定换空 catalog resolver | C8 loader 绑定 |

（C7 为组合轴，无独立单点针，登记见排重账。完整 argv/find/replace/sha/首条业务
AssertionError 见 mutation-results.json。）

## 四态 hash 摘要

- 原始绿：43/43，identitySha `2155c250…40a5d`（执行集，mkdtemp 副本，biome 格式化落盘字节）
- 每针红：failed-total 恰 1（目标合同，AssertionError），identitySha 见 mutation-results.json
- 每针恢复：43/43 全绿，identitySha 与原始绿一致（`2155c250…40a5d`）
- 源码恢复：三份目标源文件恢复后 sha256 与原始逐字节一致
  （`sourceRestoredByteIdentical: true`，`sourceOriginalSha === sourceFinalSha`）
- 交付树定向身份集（绝对路径规整后）：43/43，identitySha `b690153d…e131`（identity.json）

## clean-tree 与 mkdtemp 清理

- 变异仅在 `/tmp/type-pal-asset-resolver-mut.XrgrBS`（mkdtemp）副本内发生；跑完
  `rm -rf` 后 `ls -d /tmp/type-pal-asset-resolver-mut.*` 无匹配（no mut dirs remain）。
- 交付 worktree 全程 `git status` 只有 4 个新测试文件与证据目录；
  `git diff f83ed41e9 -- packages/reforge/src/asset-resolver.ts packages/reforge/src/project-image-cache.ts packages/reforge/src/project-loader.ts` 为空（产品零改动）。

## 质量门（数值见任务卡回执）

定向 8/8（4 文件）；执行集 43/43；相邻（reforge 全包）、typecheck、lint 0/0/0、
docs、`git diff --check` 见任务卡回执。覆盖率只记录到整体 main，不作本卡完成条件。
