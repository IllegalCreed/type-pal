# TEST-KIMI-EDITOR-WORKFLOWS-1 单点反控 harness

## 组成

- `judge.mjs`：**唯一正式判据** `judgeRun`（run.mjs 与 selftest.mjs 共用；他处不得另写等价谓词）。
- `run.mjs`：注入/控制运行器，把一手事实交给 judgeRun。
- `selftest.mjs`：判据自测（合成事实喂同一个 judgeRun，17 例方向断言）。
- `injections.mjs` / `injections-batchB.mjs` / `injections-batchC.mjs`：批 A/B/C 注入针清单。

## 判据链（run.mjs 对每条注入针执行）

1. 产品目标文件 sha256 前后必须一致（注入只在 vite `load` 钩子内存替换，不落盘）。
2. `find` 串在目标文件必须**恰好一次**出现（唯一注入点），否则该针 invalid。
3. 隔离 vitest 配置跑**声明的测试文件**（`maxWorkers:1`、不并行文件），
   控制台出现 `MUTATION_HIT <label>` 才承认注入被加载；控制针必须无该见证。
4. 判据只信真实 vitest JSON 报告（`--reporter=json --outputFile`）：
   - 注入针恰 exit 1；控制针恰 exit 0；exit 2/null/signal/spawn 错误一律 invalid。
   - 失败记录**绑定声明测试文件的绝对路径**；pending/todo/skipped 一律 invalid。
   - 失败集合精确等于预期 fullName 集合；空 failureMessages invalid。
   - 每条失败消息**首行**必须以 `AssertionError` 开头，且不得含 timeout/其它错误名
     （首行判定，避免堆栈帧里的 vitest 定时器误伤）；实际执行数等于同文件集控制基线。
5. control 针（无注入）必须 exit 0 全绿，否则整批结果作废。

## 运行（仓库根；模块名先按 cwd 解析，找不到再按本目录解析，裸文件名可复跑）

```sh
# 判据自测（不跑 vitest）
node docs/testing/kimi-editor-workflows/counter-control/selftest.mjs
# 全量（含控制针）
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections.mjs
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections-batchB.mjs
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections-batchC.mjs
# 单针模式
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections.mjs --only k01-alive-guard
```

机读 summary 打印到 stdout 并追加 `/tmp/type-pal-kimi-editor-workflows/counter-control.jsonl`。
