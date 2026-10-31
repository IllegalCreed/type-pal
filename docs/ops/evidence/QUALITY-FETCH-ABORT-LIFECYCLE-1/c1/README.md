# fetch-retry 取消生命周期 C1 证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「fetch-retry 取消生命周期 C1 证据」的主题按原文时点保留(摘录:旧基点为治理分支 `8f5a9af5d314`；同步后的复跑基点为合并提交 `89bf84e16`，相对 `origin/main=36caec0251b48f94fa5b9d5c)。

## 范围与证据

原报告含章节[fetch-retry 取消生命周期 C1 证据、反控、逐文件结论、尚未证明]、0个链接;固定main源2517B(SHA d3a1b83ce61e)。当前存活入口:无当前仓库内存活链接。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2517B / SHA-256 d3a1b83ce61e4b43d768970797b236206ddd9c89d47d11ae3639cd648a91783a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# fetch-retry 取消生命周期 C1 证据

旧基点为治理分支 `8f5a9af5d314`；同步后的复跑基点为合并提交 `89bf84e16`，相对 `origin/main=36caec0251b48f94fa5b9d5c4c786571037f9869` 为0 behind。范围是 `packages/game/src/shell/fetch-retry.ts`、三份既有测试和新增 `fetch-retry.cancellation.test.ts`。生产 caller 是 `packages/game/src/main.ts` 的全局安装，真实 signal caller 是 `packages/game/src/shell/audio-midi.ts` 的曲目/音色加载与 stop/dispose；WHATWG Fetch 的 Request 构造先于取消判断，`init.signal` 显式覆盖 Request.signal，`null` 表示不绑定。

## 反控

- `counter.json` 重建四份隔离临时测试副本；旧实现 23 passed / 3 failed，控制轮 26 / 0；移除退避清理、错误 null 回退、首次预检遮蔽 Request 构造三种变异各产生恰一指定 AssertionError；所有轮次 0 pending、0 stderr/act/environment，源文件恢复且临时副本清理。
- `initial-oracle-red.*` 保留先前六例初始红的原件；其中一处错误资源基线随后在生产修改前校正，不能计产品缺陷。
- `green.json`、`green.raw.gz`、`green.runner.json.gz` 为合并最新 main 后的定向结果；26 passed / 0 failed / 0 pending，game typecheck 通过。全仓门仍未由此通过。

## 逐文件结论

`fetch-retry.ts` 的取消逻辑此前只在底层 reject 后检查 `init.signal`，退避 timer 不可取消，Request 自定义 reason 可能重复 attempt。当前私有 `waitForRetry` 在 signal abort 时清理 timer/listener 并原样 reject；正常完成同样移除 listener，下一次 attempt 前再检查 signal。没有改公开 API、重试次数、GET/状态码/HTTP 结果、音频状态机或资源格式。

新增测试使用公开安装入口、真实 `Request`/`AbortController`、typed fetch transport 和原生 fetch 正控；覆盖已取消 Request 自定义/默认 reason、退避中 init/Request 取消、显式 signal/null 覆盖、输入构造错误不被预检遮蔽、监听器/timer 清理。没有 `as unknown as`、ignore、放宽超时或生产核心 mock。旧测试合同仍保留，新增输入轴与既有 71 合同不重复。

## 尚未证明

全仓 `pnpm check` 已通过，但官方 coverage ratchet 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 都因 shared/pal-extract 相对 baseline 回退失败；完整 game 曾有17块 stderr，editor仍有运行时诊断。此证据不关闭任何 ledger 文件，不代表可合 main。
```
<!-- incremental-original-source:end -->
