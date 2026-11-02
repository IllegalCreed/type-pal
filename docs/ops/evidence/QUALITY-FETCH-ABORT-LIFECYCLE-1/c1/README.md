# fetch-retry 取消生命周期 C1 证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本片是fetch-retry取消生命周期任务[QUALITY-FETCH-ABORT-LIFECYCLE-1.md](../../../tasks/QUALITY-FETCH-ABORT-LIFECYCLE-1.md)的C1实现证据:旧基点为治理分支8f5a9af5d314,合并最新main后的复跑基点为89bf84e16(相对origin/main=36caec0251…为0 behind)。范围是packages/game/src/shell/fetch-retry.ts、三份既有测试与新增fetch-retry.cancellation.test.ts;生产caller是main.ts全局安装,真实signal caller是audio-midi.ts的曲目/音色加载与stop/dispose。时点结论按原文保留,本页不重开任务、不授新信用。

## 范围与证据

旧实现缺陷:取消逻辑只在底层reject后检查init.signal,退避timer不可取消,Request自定义reason可能重复attempt。修复为私有waitForRetry在signal abort时清timer/listener并原样reject,正常完成同样移除listener,下一次attempt前再检查signal;不改公开API、重试次数、GET/状态码/HTTP结果、音频状态机或资源格式。新增测试用公开安装入口、真实Request/AbortController与原生fetch正控,无as unknown as、ignore或放宽超时。[red.json](red.json)见证旧生产源(acece0be)配合修正基线后的测试为3红(已取消Request自定义Error仍两次setTimeout退避;init/Request signal退避中取消时timer清理断言undefined);[initial-oracle-red.json](initial-oracle-red.json)保留更早六例4红的原件,其中一处红来自测试自身错误资源基线并在生产修改前校正,不计产品缺陷;[initial-before-admission-green.json](initial-before-admission-green.json)是准入流程事故(Python编码失败+补丁误执行已精确反向撤回)期间的首次green,按任务卡明示不作为准入后验证。

## 发现

[counter.json](counter.json)以隔离临时副本执行5轮:before-final(旧实现acece0be+适配副本)26例中23过3败(即上述三处取消合同红);control(终版实现6a583e9a)26/0;三个源码变异各恰一指定AssertionError——移除timer内removeEventListener导致监听器计数2不等于1、init?.signal !== undefined改为!= null导致null覆盖用例返回false而非Response200、在try前加signal?.aborted预抛遮蔽Request构造的TypeError。所有轮次0 pending、0 stderr/act/environment,正式源/测试SHA逐一登记,副本清理。初版green为25例(cancellation尚为6例、无遮蔽用例);合并最新main后[green.json](green.json)为4文件26例全绿、0 pending、0 runtime诊断,game typecheck通过。

## 结论

本片修复仅限fetch-retry.ts私有可取消退避与测试oracle;首次调用仍交底层fetch做Request构造/输入校验。全仓pnpm check已过,但官方coverage ratchet与TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast均因shared/pal-extract基线回退失败;完整game曾有17块stderr,editor仍有运行时诊断。本证据不关闭任何ledger文件,不代表可合main。

## 整改与复核

本页为治理候选正文重写:原文本逐字节保全于下方保全块,本轮逐篇语义整改将本片目标、判决矩阵与边界载入可见正文;不重跑任何命令,时点边界以原文为准。统一门未清前不关闭文件、不合main。

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
