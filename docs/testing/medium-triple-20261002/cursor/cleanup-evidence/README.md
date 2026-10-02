# Counter 临时树回收证据

## 规则（交付硬要求）

1. 创建 / 复制 / 跑测纳入 finally；失败、异常、可捕获中断均回收；禁止用 `process.exit` 跳过 finally。
2. `node_modules` 只用 symlink，禁止整树递归复制；`MAX_CONCURRENCY=1`、`MAX_LIVE_TREES=1`、`MAX_OWNER_TEMP_GIB=2`，超限拒建。
3. 只删本会话 `registerOwned` 的精确路径；禁止全局 prune / 通配强删。
4. 成功 / 失败 / SIGTERM 均有实测；不可捕获终止留下的路径写入 `live-registry.json` 供后续核验（报告-only，不自动删他人目录）。

## 本目录文件

| 文件 | 含义 |
|---|---|
| `cleanup-selftest.json` | 成功 / 注入失败 / 上限拒建 / SIGTERM 零残留 |
| `last-cleanup-*.json` | 单次 counter 收尾报告 |
| `live-registry.json` | 当前进程拥有路径（应为空数组） |
| `interrupt-child.json` | 中断子进程收尾快照 |
| `run-counters-cleanup.json` | 批量串行后的 residue 快照（若跑过） |

实现：`../counter-lifecycle.mjs`、`../counter.mjs`、`../counter-cleanup.selftest.mjs`、`../run-counters.mjs`。
