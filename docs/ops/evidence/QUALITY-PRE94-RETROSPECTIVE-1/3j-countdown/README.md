# CODE3j countdown 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3j第二个有限pre-94切片(基点912a75b2d,0 behind),核countdown DOM小模块、两份直接合同测试与speedrun/index.ts真实调用;3j的display-scale/FPS/toast/map-names/time-format/checkpoints不因本片自动收口。

## 范围与证据

完整读取countdown.ts(29行)/countdown.test/countdown.glm-phase1-leaves/index.ts(116行)/index.test/index.glm-phase1-leaves六文件;tools-panel只读控制导入与计时器页段,toast.ts/toast.test作相邻DOM生命周期参照不计入countdown证据,清单SHA与2026-10-18的pause caller更正见[read-boundaries.json](read-boundaries.json)。showCountdown只在存在document时工作;字符串路径复用单一#tp-speedrun-countdown元素、仅文本变化时写入、null移除且重复null幂等;元素pointer-events:none不阻塞输入。真实caller是speedrun/index.ts:23-43:计时器未启用强制showCountdown(null),启用时只把getCountdownRemainingSec()正整数转文本;pause由F8 setupSpeedrunHotkeys触发,工具面板只管设置/重置/最佳/跳转。

## 发现

countdown.test覆盖挂出/文本更新/移除;GLM leaves覆盖同节点复用/pointer-events:none/移除后重建/重复null。本片当时未识别生命周期重复,且『同文字无重写』没有直接oracle——该结论由后继[README.md](../68-countdown-tests/README.md)复审纠正。未发现核心mock或非法输入;document.body由真实主循环调用时存在,SSR/无document已有no-op。

## 结论

定向4文件/17 tests passed,0 failure/skip/stderr;覆盖率、official ratchet、protected fast与全仓check按用户成本规则未在本小片运行。3j整卡保持partial;countdown文件当前仅有本片直接证据,不把历史done重升为本轮accept;不改生产代码。

## 整改与复核

未重跑;无第一阶段机制、schema/save、资产管线或公共接口边界。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2340B / SHA-256 2a5c7db4c73e3e4ad2f6dc5795cd9436b76d4e4eced00fae06f78a976a8b4b2a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3j countdown 当前复审切片

基点：`912a75b2d`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。这是 CODE-QUALITY-3j 的第二个有限 pre-94 切片，核 countdown DOM 小模块、两份直接合同测试和 `speedrun/index.ts` 的真实调用；3j 的 display-scale、FPS、toast、map-names、time-format、checkpoints 仍不因本片自动收口。

## 逐文件与 caller

完整读取清单、SHA、行数和边界见 [`read-boundaries.json`](read-boundaries.json)。`showCountdown` 只在存在 `document` 时工作；字符串路径复用单一 `#tp-speedrun-countdown` 元素、仅在文本变化时写入、`null` 移除并对重复 `null` 幂等。元素使用 `pointer-events:none`，不会阻塞游戏输入。

真实 caller 是 `speedrun/index.ts:23-43`：计时器未启用时强制 `showCountdown(null)`；启用时只把 `getCountdownRemainingSec()` 的正整数转换成文本，否则传 `null`。`toggleManualPause`/`SpeedrunTimer` 负责状态和倒计时生命周期，countdown 模块不拥有 timer、toast 或游戏状态。F8 的 `setupSpeedrunHotkeys` 分支调用 `toggleSpeedrunPause`；工具面板计时器页管理设置/重置/最佳成绩/节点跳转，并不触发 pause。`toast.ts` 只作为相邻的同类 DOM 生命周期参照，不被本片接受。

## 判别力与结论

既有 `countdown.test.ts` 覆盖挂出、文本更新和移除；GLM leaves 覆盖同一节点复用、`pointer-events:none`、移除后重建和重复 `null`。本片当时未识别生命周期重复，且“同文字无重写”没有直接 oracle；该结论由 [CODE68复审](../68-countdown-tests/README.md) 纠正。未发现核心 mock 或非法输入；`document.body` 由真实主循环调用时存在，SSR/无 document 已有 no-op。没有第一阶段机制、schema/save、资产管线或公共接口边界，不改生产代码。

定向 `countdown.test.ts`、`countdown.glm-phase1-leaves.test.ts`、`index.test.ts`、`index.glm-phase1-leaves.test.ts`：`4 files / 17 tests passed`，0 failure/skip/stderr。覆盖率、official ratchet、protected fast 和全仓 `pnpm check` 未在本小片运行；按用户规则留到完整大模块收口。3j 整卡保持 `partial`，countdown 文件当前仅有本片直接证据，不把历史 done 重新升为本轮 accept。
```
<!-- incremental-original-source:end -->
