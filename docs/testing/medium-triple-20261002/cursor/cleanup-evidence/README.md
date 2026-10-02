# Counter 临时树回收证据

## 规则（R4 后）

1. 创建 / 复制 / 跑测纳入 finally；失败、异常、可捕获中断均回收。
2. `node_modules` 只用 symlink；`MAX_CONCURRENCY=1`、`MAX_LIVE_TREES=1`、`MAX_OWNER_TEMP_GIB=2`。
3. **`cleanupExact` / 创建失败回滚**均核：登记或创建身份 `dev/ino`、目录/非 symlink、必要 Git worktree。
4. 同路径新 inode 替换 / symlink / Git 身份不明或 remove 失败：**保留报错，禁止 `rm` 兜底**。
5. 仅确认未进入 Git 的空创建对象，可在身份核对后精确 `rm`。
6. 自建哨兵：成功 / 失败 / SIGTERM / 未登记 / 祖先前缀 / 登记后 inode 替换 / **创建回滚替换** / 干净创建失败回收。
7. 绝不清其它 Owner / 其它 counter 目录，不做全局 prune。

## 本目录文件

| 文件 | 含义 |
|---|---|
| `cleanup-selftest.json` | 上述哨兵实测 |
| `rejudge-r4.json` | R4 六针原字节重判结果 |
| `rejudge-r3.json` / `rejudge-r2.json` | 历史重判快照 |
| `live-registry.json` | 当前进程拥有路径与身份（应为空） |
| `interrupt-child.json` | 中断子进程收尾快照 |

实现：`../counter-lifecycle.mjs`、`../counter-cleanup.selftest.mjs`、`../rejudge-counters-r2.mjs`。
