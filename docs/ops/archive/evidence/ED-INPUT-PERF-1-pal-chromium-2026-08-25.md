# ED-INPUT-PERF-1 PAL Chromium 性能与功能证据

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: evidence-receipt-v1 / 1.0.0

本页是 ED-INPUT-PERF-1 PAL Chromium 输入性能与功能证据的回执。测量方法、逐字段原始样本与功能验证在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前性能或 coverage 信用。

## 证据身份

- ED-INPUT-PERF-1 输入性能与功能证据，最终统一采样 `2026-08-25T12:56:10.133Z`；本地 Vite production implementation + Google Chrome headless（1440×1000）+ Codex in-app Chromium（1280×720，DPR 2）。

## 来源与输入

- 工程 `projects/pal`（294 scenes、5077 entities、701 entries、234 items、1934 assets）；每字段 2 次 warmup + 20 次真实 DOM `input -> requestAnimationFrame -> focusout -> requestAnimationFrame -> derived snapshot current`；`PerformanceObserver` 统计 ≥50ms Long Task；覆盖项目显示名、角色当前体力、物品说明、毒名称、共享脚本说明五类字段。

## 断言与业务 oracle

- 判据：input p95 ≤16ms、commit max <50ms、派生诊断 p95 <1s、urgent 区间无 Long Task。

## 结果

- 五类字段全部满足（input p95 6.8–8.2ms、commit p95 8.5–15.7ms、worker p95 392.1–432.1ms、Long Task 0/0）；基线角色「当前体力」四次 warm commit 1050–1134ms，分段 trace 已解释约 914ms 来自同步 diagnostics/projection；完整 20 次原始样本逐字段保留在 quote。

## 限制与复核

- historical。功能验证时点结论：blur 只生成一条可撤销历史、撤销恢复原文；1280 与 1024×576 真实 device metrics 下均无全局横向溢出；reload 后派生状态先「检查中」约 0.4s 转当前、PAL 既有 186 诊断保留未伪装 0 项；浏览器会话最终 reload，未保存样本、临时共享脚本或字段修改未写入工程；临时 CDP harness 已删除不进仓库。当前性能以现行基准为准。目录导航见[历史证据回执](../README.md)。

## 原文保全

固定源 revision `1cfb47719fd36122d73b3d1ac7642cec192ccc15`，source SHA `c6c8b7e556a30c358e1b5cbeead7adc30c69738a2ff051b65a52ba59ee9ca3d1`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # ED-INPUT-PERF-1 PAL Chromium 性能与功能证据
>
> 日期：2026-08-25
> 环境：本地 Vite production implementation、Google Chrome headless（1440×1000）与 Codex in-app Chromium
> （1280×720，DPR 2）
> 工程：`projects/pal` 当前 canonical 工程；294 scenes、5077 entities、701 entries、234 items、1934 assets。
>
> ## 方法
>
> - 每个字段先做 2 次 warmup，再连续做 20 次真实 DOM `input -> requestAnimationFrame -> focusout ->
>   requestAnimationFrame -> derived snapshot current`。
> - `inputMs` 与 `commitMs` 是主线程到下一帧；`workerMs` 是提交后最新 revision 的派生诊断变为 current 所需时间。
> - `PerformanceObserver({ type: 'longtask' })` 分别统计 input / commit 区间内的 ≥50ms Long Task。
> - 字段覆盖项目显示名、角色当前体力、物品说明、毒名称、共享脚本说明；共享脚本在独立未保存浏览器会话中创建。
> - 原始临时 CDP harness 已在取证后删除，不进入仓库或产品代码。
>
> ## 基线与最终结果
>
> 基线角色“当前体力”四次 warm commit 为 1050–1134ms；分段 trace 中同步 diagnostics / projection 已解释约
> 914ms。最终统一采样时间为 `2026-08-25T12:56:10.133Z`：
>
> | 字段 | input p95 / max | commit p95 / max | worker p95 / max | input / commit Long Task |
> |---|---:|---:|---:|---:|
> | 项目显示名 | 8.1 / 8.4ms | 8.5 / 8.6ms | 392.1 / 420.2ms | 0 / 0 |
> | 角色当前体力 | 7.4 / 7.6ms | 15.7 / 18.2ms | 408.4 / 445.4ms | 0 / 0 |
> | 物品说明 | 7.4 / 8.3ms | 14.4 / 14.6ms | 432.0 / 505.9ms | 0 / 0 |
> | 毒名称 | 8.2 / 8.2ms | 11.5 / 11.5ms | 415.0 / 432.1ms | 0 / 0 |
> | 共享脚本说明 | 6.8 / 8.1ms | 14.3 / 15.2ms | 413.2 / 437.5ms | 0 / 0 |
>
> 五类字段均满足 input p95 ≤16ms、commit max <50ms、派生诊断 p95 <1s，且 urgent 区间无 Long Task。
>
> ## 原始样本（毫秒，顺序与 20 次编辑一致）
>
> ### 项目显示名
>
> ```text
> input  = [4, 8.1, 1, 4.2, 7.8, 2.1, 7.7, 5.6, 4.4, 8.4, 0.8, 0.9, 1, 2.6, 3, 5.6, 1.5, 5.7, 4.6, 2.9]
> commit = [8.1, 8.1, 8.5, 7.4, 7.7, 7.5, 7.7, 7.7, 8.1, 8.1, 8.6, 8.2, 6.4, 7.7, 8.5, 6.8, 7.7, 7.9, 7.7, 7.7]
> worker = [360.8, 392.1, 380.9, 361.2, 355.7, 359.7, 378.6, 420.2, 389.2, 376.8, 392.1, 382.7, 382.3, 390.6, 387.3, 365.7, 356.4, 390.8, 374.6, 356.4]
> ```
>
> ### 角色当前体力
>
> ```text
> input  = [4.6, 3.6, 6, 1.9, 7.1, 4.2, 5.6, 0.8, 7, 6.6, 6.2, 3.4, 7.4, 2.1, 2.1, 5, 7.6, 7.4, 2.2, 3.3]
> commit = [12.5, 15.7, 15.4, 14.4, 14.8, 14.3, 15.2, 14.5, 14.3, 14.1, 14.5, 14.9, 15.4, 15.3, 14.3, 15.2, 13.7, 14.1, 18.2, 13.8]
> worker = [403.5, 445.4, 393, 371.6, 370.7, 375.6, 386.6, 373.2, 356.5, 398.6, 376.7, 372.7, 408.4, 365.5, 374.3, 386.2, 357.3, 377, 368.1, 378.5]
> ```
>
> ### 物品说明
>
> ```text
> input  = [6.2, 3.9, 1.1, 3.8, 6.1, 1.1, 6, 3.8, 7.4, 4.2, 0.9, 0.8, 0.9, 0.9, 6.8, 1.3, 3.4, 1.3, 8.3, 3.5]
> commit = [12.5, 12.3, 14.4, 12.7, 12.7, 13.3, 13.5, 12, 14.6, 13.7, 12.1, 11.8, 12.7, 12.8, 12.3, 13.2, 12.6, 12.3, 12, 12.2]
> worker = [361.5, 391.3, 403.6, 372.3, 374.6, 389.2, 432, 505.9, 415.9, 378.6, 389.5, 414.1, 368.2, 377.1, 383.2, 382.3, 371.3, 388.3, 409.6, 360]
> ```
>
> ### 毒名称
>
> ```text
> input  = [6, 5.7, 4.2, 8.2, 1.3, 7.7, 4.9, 8.2, 0.8, 7.7, 5.9, 5, 0.8, 1, 7.6, 0.9, 1.1, 1.1, 2.4, 0.7]
> commit = [11.1, 11.1, 11.3, 11, 11.3, 11.5, 11.5, 11.5, 10.7, 11.4, 10.8, 10.6, 10.9, 10.7, 11.4, 11.4, 10.8, 11, 10.7, 10.6]
> worker = [361.1, 387.5, 432.1, 362.1, 415, 408.9, 364.1, 379.4, 358.1, 385.7, 353.3, 390.1, 357, 366.8, 384.7, 363.7, 381.5, 364.3, 383.7, 386.9]
> ```
>
> ### 共享脚本说明
>
> ```text
> input  = [5.3, 6.3, 1, 0.7, 3.5, 8.1, 1.1, 4.2, 6.1, 6.8, 6.7, 2.6, 4.2, 3.6, 1.1, 3.9, 4.4, 0.7, 3, 5.4]
> commit = [13, 13.1, 12.7, 12.9, 13.3, 13.7, 14.2, 14.1, 13.8, 14.3, 14.2, 13.6, 13.5, 15.2, 14.2, 13.6, 13.8, 13.4, 13.9, 13.6]
> worker = [386.1, 364.8, 359.4, 362.1, 374.4, 376.9, 405.4, 394.6, 413.2, 437.5, 384.5, 388.5, 390.5, 397.1, 409.1, 383, 405, 390.5, 383.3, 385.8]
> ```
>
> ## 功能与布局验证
>
> - In-app Chromium 1280×720 / DPR 2：物品说明输入后 blur 只生成一条可撤销历史；点击撤销恢复原文；焦点可离开字段。
> - 默认视口 `body.scrollWidth === body.clientWidth === 1280`；页面无全局横向溢出。物品工作区持有自己的纵向滚动
>   （`clientHeight 504 < scrollHeight 1988`），Inspector 不抢滚动 owner。
> - 125% 等效窄视口用真实 Chromium `1024×576` device metrics 验证：
>   `body.scrollWidth === body.clientWidth === 1024`；工作区为 `540×340`、纵向内容 `2219px`；Inspector
>   `290×509`；字段宽 422px，均保持可达且无全局横向滚动。
> - 派生状态在 reload 后先显示“检查中”，约 0.4s 后进入当前结果；PAL 当前 186 个既有诊断被保留，未伪装成“0 项”。
> - 浏览器会话最终 reload；未保存性能样本、临时共享脚本或字段修改均未写入工程。

<!-- original-source-quote:end -->
