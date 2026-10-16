# OPS-TST-PERF current-only baseline（2026-08-22）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把历史材料接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 证据身份

- `id`：原始证据记录的稳定 ID（保留于 quote）。
- `schemaVersion`：原始记录版本（保留于 quote）。
- `status`：historical receipt；不改写为当前 verified。
- candidate/source SHA：见本页 source/after SHA 和原始 quote。

## 来源与输入

- caller/source refs（file:line）：由原始证据记录保全；本页 source `docs/ops/archive/evidence/OPS-TST-PERF-current-only-baseline-2026-08-22.md`。
- 合法输入与版本：固定历史 source revision、原始数据/命令和记录环境。
- 执行时间和环境：以原始 receipt 为准；本次迁移不重跑。

## 断言与业务 oracle

- 业务 oracle：原始 receipt 的 caller、输入、断言和结果关系可追溯。
- 原子断言：quote 中每条机器/人工断言保持原样。
- 排重对象：当前 task card、同批 evidence 和 successor receipt。

## 结果

- 逐步结果、退出码、产物：保留原始记录；不把历史回执升格为当前通过。
- 失败：原始失败、rework、未执行和 unknown 信号继续保留。

## 限制与复核

- 未执行/未覆盖：- 正文信号 71:隔离、失败传播、报告守恒与长期维护成本。
- 不得外推的结论：不得外推 runtime、E2E、视觉、coverage 或当前产品完成。
- 复核条件：当前 consumer、source/oracle、task card 和独立验收重新齐全后才可重开。

## 历史范围

- phase2/lore archive；日期：2026-08-22；固定来源 `1cfb47719fd36122d73b3d1ac7642cec192ccc15`；source SHA `ae1aae6e47f391b18e5ee5b1bd82bc1426fa217ed4311cae3b02f8af28586f61。

## 原始结论

- OPS-TST-PERF current-only baseline（2026-08-22）：这是 evidence-receipt，当前文档状态为 historical。全文 82 行、8 个标题；摘要/首段为「`ARCH-CURRENT-ONLY-1` 已删除旧 release/shared/fresh、P2/P3/P4 shadow 与历史」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 原始标题/章节/HTML artifact 在 quote 或 artifact envelope 中保全。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：
- 正文信号 71:隔离、失败传播、报告守恒与长期维护成本。

## 继任文档

- C；u；r；r；e；n；t； ；e；v；i；d；e；n；c；e； ；r；e；c；e；i；p；t；,； ；t；a；s；k； ；c；a；r；d； ；a；n；d； ；v；e；r；i；f；i；e；d； ；c；o；n；s；u；m；e；r； ；r；e；s；u；l；t； ；w；h；e；n； ；r；e；-；r；u；n；.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `ae1aae6e47f391b18e5ee5b1bd82bc1426fa217ed4311cae3b02f8af28586f61`；下方 quote 可逆回原始 UTF-8 字节。
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
