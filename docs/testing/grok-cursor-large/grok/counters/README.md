# G01–G10 反控原始证据

[返回交付入口](../README.md)。索引在 [counters.json](../counters.json)。

每枚针在独立 mkdtemp 里复制 `packages/game`，只改所属源文件一处，然后跑 original、mutant、restored。
`run-counters.mjs` 的 finally 只删除当次临时树。macOS 的 `diff -u /dev/stdin` 会把变异看成无差异，patch 改为两个真实文件的 unified diff。

`probe-reject/` 是真实 Vitest：一条 `expect(1).toBe(2)` 叠 15ms 后抛出的 `probe-unhandled-exception`。
JSON 里只有一条 AssertionError，退出码为 1；stderr 同时有 Unhandled Errors。judge 因此拒收。

GROK-R1-01 把判据抽到 [judge.mjs](../judge.mjs)。`run-counters.mjs` 和 [judge.selftest.mjs](../judge.selftest.mjs) 都 import 这一份。判据核对登记的完整 file 与 fullName，三态 file×fullName 多重集合，实际叶非零且与顶层计数闭合，并拒收 collection、runtime、raw、spawn 和 signal。自测用 G01-A 存档构造四个旧判据会误收的反例，新判据全部拒收；40 组存档只重判、不重采，仍然接受。自测里另起的真实 Vitest 进程也对单红叠未处理异常拒收，退出码 1，signal 为 null。记录在 [judge-selftest.json](../judge-selftest.json)。

GROK-R2-01 在写出 [judge-selftest.json](../judge-selftest.json) 之后调用仓库里的 Biome `format --write`。JSON 值不变，40 组原日志不重写。连续自测结束后报告保持已格式化。

GROK-R1-02 只重写了 G02-C 与 G04-A 的 `patch.diff`。hunk 行数与源码上下文现在能 `git apply`。两枚 mutant SHA256 仍是 `635fc5f54e5afbee61e617967c3647068bdf98e9baa9f87b1ea04438c5fd33ae` 与 `f0b566797559fd4ce97d5595bcf4e2c67f8678be07840eedf4896c223101db3b`。三态 JSON、stdout、stderr 没有重采。索引里的 patch SHA256 已改成新补丁字节。

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
| G07-A | G07-A01 | `expected 90 to be 17 // Object.is equality` |
| G07-B | G07-B01 | `expected 185 to be 181 // Object.is equality` |
| G07-C | G07-C01 | `expected +0 to be 90 // Object.is equality` |
| G07-D | G07-D01 | `expected 90 to be +0 // Object.is equality` |
| G08-A | G08-A01 | `expected 33 to be 20 // Object.is equality` |
| G08-B | G08-B01 | `expected 18 to be 2 // Object.is equality` |
| G08-C | G08-C04 | `expected 90 to be 70 // Object.is equality` |
| G08-D | G08-D01 | `expected 90 to be 45 // Object.is equality` |
| G09-A | G09-A08 | `expected +0 to be 1 // Object.is equality` |
| G09-B | G09-B04 | `expected +0 to be 100 // Object.is equality` |
| G09-C | G09-C01 | `expected '正在加载资源 0 / 811' to be '正在加载资源 0 / 810' // Object.is equality` |
| G09-D | G09-D01 | `expected '1%' to be '0%' // Object.is equality` |
| G10-A | G10-A02 | `expected +0 to be 2 // Object.is equality` |
| G10-B | G10-B01 | `expected [ 200, 80, 20, 255 ] to deeply equal [ 100, 40, 10, 255 ]` |
| G10-C | G10-C03 | `expected 400 to be 800 // Object.is equality` |
| G10-D | G10-D01 | `expected 50 to be 60 // Object.is equality` |

每枚目录含 `patch.diff`、`meta.json`，以及 `original|mutant|restored` 的 `.json`、`.stdout`、`.stderr`。
G01 每枚目录的三态 file × fullName 多重集合相同，各 10 条。G02-A 5 条，G02-B 9 条，G02-C 8 条，G02-D 14 条。G03-A 11 条，G03-B 8 条，G03-C 10 条，G03-D 4 条。G04-A 8 条，G04-B 6 条，G04-C 6 条，G04-D 9 条。G05-A 11 条，G05-B 14 条，G05-C 5 条，G05-D 13 条。G06-A 12 条，G06-B 10 条，G06-C 11 条，G06-D 15 条。G07-A 15 条，G07-B 13 条，G07-C 12 条，G07-D 7 条。G08-A 15 条，G08-B 17 条，G08-C 5 条，G08-D 7 条。G09-A 11 条，G09-B 13 条，G09-C 11 条，G09-D 20 条。G10-A 7 条，G10-B 6 条，G10-C 6 条，G10-D 6 条。clean 与 restored 退出码 0，mutant 退出码 1，signal 都是 null。

`rejects.toThrow` 的失败文本以 `Error:` 开头，judge 不把它当成业务 AssertionError。G02-A、G02-C 因此改针后只重采了这两枚；G02-B、G02-D 与 G01 的原日志保留。
