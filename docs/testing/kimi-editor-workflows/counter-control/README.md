# TEST-KIMI-EDITOR-WORKFLOWS-1 单点反控 harness

`run.mjs` 对每条注入针执行完整判据链：

1. 产品目标文件 sha256 前后必须一致（注入只在 vite `load` 钩子内存替换，不落盘）。
2. `find` 串在目标文件必须**恰好一次**出现（唯一注入点），否则该针 invalid。
3. 隔离 vitest 配置跑**真实新测试文件**（与正式运行同口径，`maxWorkers:1`、不并行文件），
   控制台出现 `MUTATION_HIT <label>` 才承认注入被加载。
4. 判据只信真实 vitest JSON 报告（`--reporter=json --outputFile`）：恰 exit 1、
   失败集合精确等于预期 fullName 集合、每条 failureMessages 以 `AssertionError` 开头、
   实际执行数等于 control 基线；exit 2/null、TypeError、模块解析失败、超时、skip
   一律 invalid。
5. control 针（无注入）必须 exit 0 全绿，否则整批结果作废。

## 运行

```sh
# 全量（含 control）
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections.mjs
# 单针模式
node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections.mjs --only k01-alive-guard
```

机读 summary 打印到 stdout 并追加 `/tmp/type-pal-kimi-editor-workflows/counter-control.jsonl`。
注入清单按批分文件：`injections.mjs`（批A）。
