# Counter 临时树回收证据

## 规则（R2 后）

1. 创建 / 复制 / 跑测纳入 finally；失败、异常、可捕获中断均回收；禁止用 `process.exit` 跳过 finally。
2. `node_modules` 只用 symlink；`MAX_CONCURRENCY=1`、`MAX_LIVE_TREES=1`、`MAX_OWNER_TEMP_GIB=2`，超限拒建。
3. **`cleanupExact` 仅当**：本会话 `registerOwned` 精确命中 **且** 路径为 `os.tmpdir()` 直子目录且 basename 合法前缀。前缀匹配 / 祖先含前缀 **不** 授权删除。
4. Git worktree remove / 锁 / 路径身份失败：**保留报错，禁止 `rm` 兜底**。
5. 成功 / 失败 / SIGTERM / 未登记同前缀哨兵 / 祖先前缀路径 / 非法登记 均有自建哨兵实测；不可捕获终止路径写入 `live-registry.json`（报告-only）。
6. 绝不清其它 Owner / 其它 counter 目录，不做全局 prune。

## 本目录文件

| 文件 | 含义 |
|---|---|
| `cleanup-selftest.json` | 成功 / 失败 / 上限 / SIGTERM / 哨兵拒删 |
| `rejudge-r2.json` | R2-01 六针原字节重判结果 |
| `last-cleanup-*.json` | 单次 counter 收尾报告 |
| `live-registry.json` | 当前进程拥有路径（应为空数组） |
| `interrupt-child.json` | 中断子进程收尾快照 |

实现：`../counter-lifecycle.mjs`、`../counter.mjs`、`../counter-cleanup.selftest.mjs`、`../rejudge-counters-r2.mjs`。
