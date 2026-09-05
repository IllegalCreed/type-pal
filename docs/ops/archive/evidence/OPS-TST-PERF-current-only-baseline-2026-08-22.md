# OPS-TST-PERF current-only baseline（2026-08-22）

## 结论

`ARCH-CURRENT-ONLY-1` 已删除旧 release/shared/fresh、P2/P3/P4 shadow 与历史
transition/seal 证明链。当前 `@type-pal/migrate` 只有 `unit` 与 `pal` 两个 Vitest project；
一次性基线分别为 **10.03s** 与 **46.91s**。旧 B/C 的实现对象已经不存在，且当前两段分开运行的
墙钟总和仅 **56.94s**，不值得重新引入隔离 runner、proof manifest、跨进程遥测和三轮长对照。

因此：

- `OPS-TST-PERF-B` 取消，不重建 shared/fresh parallel runner。
- `OPS-TST-PERF-C` 取消，不把已删除的 P2/P3/P4 consolidated proof 迁回 current-only。
- 默认 `test`、`test:fast`、`test:pal`、`check` 保持不变。
- 若未来 current-only 门禁重新出现可感知回归，再用当时的 current 测试清单另开窄卡；不得恢复
  release epoch、transition、rewind、seal、oracle、prepared lease 或兼容路径。

## 环境与范围

- HEAD：`8d2f07c3410c6af18f651cf64e96b2f5c5508939`
- 分支：`codex/ops-tst-perf-current-baseline`
- 主机：`Mac15,6`，19,327,352,832 bytes 内存，11 logical CPUs
- Node：`v22.19.0`
- pnpm：`10.29.2`
- 测量纪律：每条执行路由只跑一次；没有重复长测，没有运行已删除的旧 release proof。

## 当前测试拓扑

一手配置：

- `packages/migrate/package.json:6-16`：仅保留 `test`、`test:fast`、`test:pal`、`check`、
  `check:fast` 等 current-only 命令；没有 `test:release` 或 parallel/proof 命令。
- `packages/migrate/vitest.config.ts:3-29`：
  - `unit`：排除 `*.pal.test.ts`，`forks + isolate`，`maxWorkers=2`。
  - `pal`：只含 `*.pal.test.ts`，`forks + isolate`，文件串行，timeout 120s。

机械 `vitest list --json`：

| project | files | tests | 重复 file/title |
|---|---:|---:|---:|
| unit | 37 | 330 | 0 |
| pal | 3 | 10 | 0 |
| 合计 | 40 | 340 | 0 |

## 一次性执行基线

### fast / unit

```sh
/usr/bin/time -l pnpm --filter @type-pal/migrate test:fast
```

- 37 files passed / 330 tests passed
- Vitest duration：9.48s
- real/user/sys：10.03s / 8.89s / 2.18s
- maximum resident set size：331,497,472 bytes（约 316 MiB）

### PAL

```sh
/usr/bin/time -l pnpm --filter @type-pal/migrate test:pal
```

- 3 files passed / 10 tests passed
- Vitest duration：46.01s
- real/user/sys：46.91s / 42.69s / 5.28s
- maximum resident set size：966,115,328 bytes（约 921 MiB）

以上是两条独立路由的一次性测量，不冒充 `pnpm test` 的端到端单次墙钟。即使假设二者完全重叠且
没有任何争用，理论墙钟收益上限也只是较短的 fast 路由约 **10.03s**；不足以抵偿新 runner 的
隔离、失败传播、报告守恒与长期维护成本。

## 保留的 current-only 证明

`packages/migrate/src/pal-sprite-action-census.pal.test.ts:152-159` 对同一只读 source 执行两次
`buildPalMigration` 并比较结果。这是当前单一生成核的 determinism 证明，不是旧 C 的三个 shadow
producer，也没有证据表明需要删除或集中。`pal-current-publication.pal.test.ts:14-34` 则独立验证
current publication 闭包，两者证明域不同。

后续只有在新的逐文件 profiling 证明该双建成为主要回归来源时，才允许另开 current-only 窄卡；
source-backed determinism 不得被 pinned/self-digest 替代。
