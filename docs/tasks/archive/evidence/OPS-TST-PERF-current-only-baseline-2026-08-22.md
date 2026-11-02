# OPS-TST-PERF current-only baseline（2026-08-22）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: evidence-receipt-v1 / 1.0.0

本页是 OPS-TST-PERF current-only 一次性基线的证据回执。测试拓扑、一次性测量与保留证明在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前测试拓扑或 coverage 信用。

## 证据身份

- OPS-TST-PERF current-only baseline，2026-08-22；HEAD `8d2f07c3410c6af18f651cf64e96b2f5c5508939`，分支 `codex/ops-tst-perf-current-baseline`；主机 Mac15,6（11 逻辑 CPU）、Node v22.19.0、pnpm 10.29.2。

## 来源与输入

- 一手配置：`packages/migrate/package.json` 仅保留 `test`/`test:fast`/`test:pal`/`check` 等 current-only 命令；`vitest.config.ts` 两个 project（unit 排除 `*.pal.test.ts`、pal 仅含之，均 forks+isolate）。机械 `vitest list --json`：unit 37 文件/330 测试、pal 3 文件/10 测试、0 重复 file/title。
- 测量纪律：每条执行路由只跑一次，无重复长测，未运行已删除的旧 release proof；`/usr/bin/time -l` 记录墙钟与 RSS。

## 断言与业务 oracle

- 断言：ARCH-CURRENT-ONLY-1 已删除旧 release/shared/fresh、P2/P3/P4 shadow 与历史 transition/seal 证明链；旧 B/C 的实现对象已不存在。

## 结果

- unit 一次性基线 10.03s（Vitest 9.48s，RSS 331,497,472B）；pal 46.91s（Vitest 46.01s，RSS 966,115,928B）；两段总和 56.94s。结论：`OPS-TST-PERF-B`/`C` 取消，不重建 shared/fresh parallel runner；理论墙钟收益上限约 10.03s，不抵新 runner 的隔离、失败传播、报告守卫与维护成本。
- 保留 current-only 证明：`pal-sprite-action-census.pal.test.ts:152-159` 同源双建 determinism 与 `pal-current-publication.pal.test.ts:14-34` current publication 闭包，证明域不同。

## 限制与复核

- historical。两段独立路由的一次性测量不冒充 `pnpm test` 端到端单次墙钟；后续仅当逐文件 profiling 证明双建成为主要回归来源时才另开 current-only 窄卡；source-backed determinism 不得被 pinned/self-digest 替代，不得恢复 release epoch、transition、rewind、seal、oracle、prepared lease 或兼容路径。目录导航见[历史证据回执](../README.md)。

## 原文保全

固定源 revision `1cfb47719fd36122d73b3d1ac7642cec192ccc15`，source SHA `ae1aae6e47f391b18e5ee5b1bd82bc1426fa217ed4311cae3b02f8af28586f61`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # OPS-TST-PERF current-only baseline（2026-08-22）
>
> ## 结论
>
> `ARCH-CURRENT-ONLY-1` 已删除旧 release/shared/fresh、P2/P3/P4 shadow 与历史
> transition/seal 证明链。当前 `@type-pal/migrate` 只有 `unit` 与 `pal` 两个 Vitest project；
> 一次性基线分别为 **10.03s** 与 **46.91s**。旧 B/C 的实现对象已经不存在，且当前两段分开运行的
> 墙钟总和仅 **56.94s**，不值得重新引入隔离 runner、proof manifest、跨进程遥测和三轮长对照。
>
> 因此：
>
> - `OPS-TST-PERF-B` 取消，不重建 shared/fresh parallel runner。
> - `OPS-TST-PERF-C` 取消，不把已删除的 P2/P3/P4 consolidated proof 迁回 current-only。
> - 默认 `test`、`test:fast`、`test:pal`、`check` 保持不变。
> - 若未来 current-only 门禁重新出现可感知回归，再用当时的 current 测试清单另开窄卡；不得恢复
>   release epoch、transition、rewind、seal、oracle、prepared lease 或兼容路径。
>
> ## 环境与范围
>
> - HEAD：`8d2f07c3410c6af18f651cf64e96b2f5c5508939`
> - 分支：`codex/ops-tst-perf-current-baseline`
> - 主机：`Mac15,6`，19,327,352,832 bytes 内存，11 logical CPUs
> - Node：`v22.19.0`
> - pnpm：`10.29.2`
> - 测量纪律：每条执行路由只跑一次；没有重复长测，没有运行已删除的旧 release proof。
>
> ## 当前测试拓扑
>
> 一手配置：
>
> - `packages/migrate/package.json:6-16`：仅保留 `test`、`test:fast`、`test:pal`、`check`、
>   `check:fast` 等 current-only 命令；没有 `test:release` 或 parallel/proof 命令。
> - `packages/migrate/vitest.config.ts:3-29`：
>   - `unit`：排除 `*.pal.test.ts`，`forks + isolate`，`maxWorkers=2`。
>   - `pal`：只含 `*.pal.test.ts`，`forks + isolate`，文件串行，timeout 120s。
>
> 机械 `vitest list --json`：
>
> | project | files | tests | 重复 file/title |
> |---|---:|---:|---:|
> | unit | 37 | 330 | 0 |
> | pal | 3 | 10 | 0 |
> | 合计 | 40 | 340 | 0 |
>
> ## 一次性执行基线
>
> ### fast / unit
>
> ```sh
> /usr/bin/time -l pnpm --filter @type-pal/migrate test:fast
> ```
>
> - 37 files passed / 330 tests passed
> - Vitest duration：9.48s
> - real/user/sys：10.03s / 8.89s / 2.18s
> - maximum resident set size：331,497,472 bytes（约 316 MiB）
>
> ### PAL
>
> ```sh
> /usr/bin/time -l pnpm --filter @type-pal/migrate test:pal
> ```
>
> - 3 files passed / 10 tests passed
> - Vitest duration：46.01s
> - real/user/sys：46.91s / 42.69s / 5.28s
> - maximum resident set size：966,115,328 bytes（约 921 MiB）
>
> 以上是两条独立路由的一次性测量，不冒充 `pnpm test` 的端到端单次墙钟。即使假设二者完全重叠且
> 没有任何争用，理论墙钟收益上限也只是较短的 fast 路由约 **10.03s**；不足以抵偿新 runner 的
> 隔离、失败传播、报告守恒与长期维护成本。
>
> ## 保留的 current-only 证明
>
> `packages/migrate/src/pal-sprite-action-census.pal.test.ts:152-159` 对同一只读 source 执行两次
> `buildPalMigration` 并比较结果。这是当前单一生成核的 determinism 证明，不是旧 C 的三个 shadow
> producer，也没有证据表明需要删除或集中。`pal-current-publication.pal.test.ts:14-34` 则独立验证
> current publication 闭包，两者证明域不同。
>
> 后续只有在新的逐文件 profiling 证明该双建成为主要回归来源时，才允许另开 current-only 窄卡；
> source-backed determinism 不得被 pinned/self-digest 替代。

<!-- original-source-quote:end -->
