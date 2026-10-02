# Counter 临时树回收证据

## 规则（R3 后）

1. 创建 / 复制 / 跑测纳入 finally；失败、异常、可捕获中断均回收。
2. `node_modules` 只用 symlink；`MAX_CONCURRENCY=1`、`MAX_LIVE_TREES=1`、`MAX_OWNER_TEMP_GIB=2`。
3. **`cleanupExact` 仅当**：本会话 `registerOwned` 精确命中 **且** 合法临时路径 **且** 当前 `lstat` 的 `dev/ino`/目录/非 symlink 与登记一致（Git worktree 另核 `git worktree list`）。
4. 同路径新 inode 替换物 / symlink 替换 / Git 身份丢失：**保留报错，禁止删除**。
5. Git worktree remove 失败：**保留报错，禁止 `rm` 兜底**。
6. 自建哨兵覆盖：成功 / 失败 / SIGTERM / 未登记同前缀 / 祖先前缀 / **同路径 inode 替换**。
7. 绝不清其它 Owner / 其它 counter 目录，不做全局 prune。

## 本目录文件

| 文件 | 含义 |
|---|---|
| `cleanup-selftest.json` | 成功 / 失败 / 上限 / SIGTERM / 哨兵拒删 |
| `rejudge-r3.json` | R3 六针原字节重判结果 |
| `last-cleanup-*.json` | 单次 counter 收尾报告 |
| `live-registry.json` | 当前进程拥有路径与身份（应为空） |
| `interrupt-child.json` | 中断子进程收尾快照 |

实现：`../counter-lifecycle.mjs`、`../counter-cleanup.selftest.mjs`、`../rejudge-counters-r2.mjs`。
