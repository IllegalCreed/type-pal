# G01 反控原始证据

[返回交付入口](../README.md)。索引在 [counters.json](../counters.json)。

每枚针在独立 mkdtemp 里复制 `packages/game`，只改 `loader.ts` 一处，然后跑 original、mutant、restored。
`run-counters.mjs` 的 finally 只删除当次临时树。macOS 的 `diff -u /dev/stdin` 会把变异看成无差异，patch 改为两个真实文件的 unified diff。

`probe-reject/` 是真实 Vitest：一条 `expect(1).toBe(2)` 叠 15ms 后抛出的 `probe-unhandled-exception`。
JSON 里只有一条 AssertionError，退出码为 1；stderr 同时有 Unhandled Errors。judge 因此拒收。

| 针 | 目标测试 | mutant 首行 |
|---|---|---|
| G01-A | G01-A07 | `expected [ 'enemy:4', 'player:2' ] to deeply equal [ 'enemy-4', 'player-2' ]` |
| G01-B | G01-B06 | `expected [ 'MUT' ] to deeply equal []` |
| G01-C | G01-C01 | `expected [ { id: -1 } ] to deeply equal []` |
| G01-D | G01-D02 | `expected -1 to be 3` |

每枚目录含 `patch.diff`、`meta.json`，以及 `original|mutant|restored` 的 `.json`、`.stdout`、`.stderr`。
三态 file × fullName 多重集合相同，各 10 条。clean 与 restored 退出码 0，mutant 退出码 1，signal 都是 null。
