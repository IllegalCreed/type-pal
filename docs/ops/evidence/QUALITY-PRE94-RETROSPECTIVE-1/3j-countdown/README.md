# CODE3j countdown 当前复审切片

基点：`912a75b2d`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。这是 CODE-QUALITY-3j 的第二个有限 pre-94 切片，核 countdown DOM 小模块、两份直接合同测试和 `speedrun/index.ts` 的真实调用；3j 的 display-scale、FPS、toast、map-names、time-format、checkpoints 仍不因本片自动收口。

## 逐文件与 caller

完整读取清单、SHA、行数和边界见 [`read-boundaries.json`](read-boundaries.json)。`showCountdown` 只在存在 `document` 时工作；字符串路径复用单一 `#tp-speedrun-countdown` 元素、仅在文本变化时写入、`null` 移除并对重复 `null` 幂等。元素使用 `pointer-events:none`，不会阻塞游戏输入。

真实 caller 是 `speedrun/index.ts:23-43`：计时器未启用时强制 `showCountdown(null)`；启用时只把 `getCountdownRemainingSec()` 的正整数转换成文本，否则传 `null`。`toggleManualPause`/`SpeedrunTimer` 负责状态和倒计时生命周期，countdown 模块不拥有 timer、toast 或游戏状态。工具面板只触发 pause，不直接管理 DOM。`toast.ts` 只作为相邻的同类 DOM 生命周期参照，不被本片接受。

## 判别力与结论

既有 `countdown.test.ts` 覆盖挂出、文本更新和移除；GLM leaves 覆盖同一节点复用、`pointer-events:none`、移除后重建和重复 `null`。本片当时未识别生命周期重复，且“同文字无重写”没有直接 oracle；该结论由 [CODE68复审](../68-countdown-tests/README.md) 纠正。未发现核心 mock 或非法输入；`document.body` 由真实主循环调用时存在，SSR/无 document 已有 no-op。没有第一阶段机制、schema/save、资产管线或公共接口边界，不改生产代码。

定向 `countdown.test.ts`、`countdown.glm-phase1-leaves.test.ts`、`index.test.ts`、`index.glm-phase1-leaves.test.ts`：`4 files / 17 tests passed`，0 failure/skip/stderr。覆盖率、official ratchet、protected fast 和全仓 `pnpm check` 未在本小片运行；按用户规则留到完整大模块收口。3j 整卡保持 `partial`，countdown 文件当前仅有本片直接证据，不把历史 done 重新升为本轮 accept。
