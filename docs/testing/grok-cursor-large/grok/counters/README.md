# G01–G06 反控原始证据

[返回交付入口](../README.md)。索引在 [counters.json](../counters.json)。

每枚针在独立 mkdtemp 里复制 `packages/game`，只改所属源文件一处，然后跑 original、mutant、restored。
`run-counters.mjs` 的 finally 只删除当次临时树。macOS 的 `diff -u /dev/stdin` 会把变异看成无差异，patch 改为两个真实文件的 unified diff。

`probe-reject/` 是真实 Vitest：一条 `expect(1).toBe(2)` 叠 15ms 后抛出的 `probe-unhandled-exception`。
JSON 里只有一条 AssertionError，退出码为 1；stderr 同时有 Unhandled Errors。judge 因此拒收。

| 针 | 目标测试 | mutant 首行 |
|---|---|---|
| G01-A | G01-A07 | `expected [ 'enemy:4', 'player:2' ] to deeply equal [ 'enemy-4', 'player-2' ]` |
| G01-B | G01-B06 | `expected [ 'MUT' ] to deeply equal []` |
| G01-C | G01-C01 | `expected [ { id: -1 } ] to deeply equal []` |
| G01-D | G01-D02 | `expected -1 to be 3` |
| G02-A | G02-A05 | `expected undefined to be an instance of Error` |
| G02-B | G02-B05 | `expected [ 7, 8, +0 ] to deeply equal [ 9, 8, 7 ]` |
| G02-C | G02-C03 | `expected 2 to be 1` |
| G02-D | G02-D07 | `expected false to be true` |
| G03-A | G03-A09 | `expected 9 to be 4 // Object.is equality` |
| G03-B | G03-B01 | `expected 2 to be 3 // Object.is equality` |
| G03-C | G03-C05 | `expected { x: 1000, y: 508, dir: 'down' } to deeply equal { x: 968, y: 508, dir: 'down' }` |
| G03-D | G03-D02 | `expected [] to have a length of 1 but got +0` |
| G04-A | G04-A01 | `expected 30 to be 34 // Object.is equality` |
| G04-B | G04-B01 | `expected +0 to be 10 // Object.is equality` |
| G04-C | G04-C02 | `expected 170 to be 168 // Object.is equality` |
| G04-D | G04-D01 | `expected +0 to be 173 // Object.is equality` |
| G05-A | G05-A05 | `expected +0 to be 26 // Object.is equality` |
| G05-B | G05-B08 | `expected 'font: fetch glyphs.json failed' to be 'font: fetch glyphs.json failed (404)' // Object.is equality` |
| G05-C | G05-C03 | `expected +0 to be 20 // Object.is equality` |
| G05-D | G05-D01 | `expected 11 to be 22 // Object.is equality` |
| G06-A | G06-A01 | `expected 82 to be 85 // Object.is equality` |
| G06-B | G06-B01 | `expected 90 to be 60 // Object.is equality` |
| G06-C | G06-C01 | `expected 90 to be 17 // Object.is equality` |
| G06-D | G06-D10 | `expected 90 to be 25 // Object.is equality` |

每枚目录含 `patch.diff`、`meta.json`，以及 `original|mutant|restored` 的 `.json`、`.stdout`、`.stderr`。
G01 每枚目录的三态 file × fullName 多重集合相同，各 10 条。G02-A 5 条，G02-B 9 条，G02-C 8 条，G02-D 14 条。G03-A 11 条，G03-B 8 条，G03-C 10 条，G03-D 4 条。G04-A 8 条，G04-B 6 条，G04-C 6 条，G04-D 9 条。G05-A 11 条，G05-B 14 条，G05-C 5 条，G05-D 13 条。G06-A 12 条，G06-B 10 条，G06-C 11 条，G06-D 15 条。clean 与 restored 退出码 0，mutant 退出码 1，signal 都是 null。

`rejects.toThrow` 的失败文本以 `Error:` 开头，judge 不把它当成业务 AssertionError。G02-A、G02-C 因此改针后只重采了这两枚；G02-B、G02-D 与 G01 的原日志保留。
