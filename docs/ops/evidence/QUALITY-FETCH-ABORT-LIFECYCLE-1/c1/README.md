# fetch-retry 取消生命周期 C1 证据

基点为治理分支 `8f5a9af5d314`；本目录是同步最新 `origin/main` 前的可重放证据，不能代替同步后的复跑。范围是 `packages/game/src/shell/fetch-retry.ts`、三份既有测试和新增 `fetch-retry.cancellation.test.ts`。生产 caller 是 `packages/game/src/main.ts` 的全局安装，真实 signal caller 是 `packages/game/src/shell/audio-midi.ts` 的曲目/音色加载与 stop/dispose；WHATWG Fetch 的 Request 构造先于取消判断，`init.signal` 显式覆盖 Request.signal，`null` 表示不绑定。

## 反控

- `counter.json` 重建四份隔离临时测试副本；旧实现 23 passed / 3 failed，控制轮 26 / 0；移除退避清理、错误 null 回退、首次预检遮蔽 Request 构造三种变异各产生恰一指定 AssertionError；所有轮次 0 pending、0 stderr/act/environment，源文件恢复且临时副本清理。
- `initial-oracle-red.*` 保留先前六例初始红的原件；其中一处错误资源基线随后在生产修改前校正，不能计产品缺陷。
- `green.json`、`green.raw.gz`、`green.runner.json.gz` 为当前工作树 26 例定向结果；26 passed / 0 failed / 0 pending，game typecheck 通过。该结果在同步 main 后必须重跑。

## 逐文件结论

`fetch-retry.ts` 的取消逻辑此前只在底层 reject 后检查 `init.signal`，退避 timer 不可取消，Request 自定义 reason 可能重复 attempt。当前私有 `waitForRetry` 在 signal abort 时清理 timer/listener 并原样 reject；正常完成同样移除 listener，下一次 attempt 前再检查 signal。没有改公开 API、重试次数、GET/状态码/HTTP 结果、音频状态机或资源格式。

新增测试使用公开安装入口、真实 `Request`/`AbortController`、typed fetch transport 和原生 fetch 正控；覆盖已取消 Request 自定义/默认 reason、退避中 init/Request 取消、显式 signal/null 覆盖、输入构造错误不被预检遮蔽、监听器/timer 清理。没有 `as unknown as`、ignore、放宽超时或生产核心 mock。旧测试合同仍保留，新增输入轴与既有 71 合同不重复。

## 尚未证明

完整 game 曾有 17 块 stderr，editor 仍有运行时诊断；全仓 check、官方 coverage ratchet、protected fast 尚未在本批复跑。此证据不关闭任何 ledger 文件，不代表可合 main。
