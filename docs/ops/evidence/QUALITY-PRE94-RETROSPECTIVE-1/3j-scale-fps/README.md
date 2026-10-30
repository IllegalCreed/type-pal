# CODE3j display-scale / fps-overlay 当前复审切片

基点：`b42eb9065`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。本片核 display-scale、fps-overlay 的生产实现与直接测试，以及 tools-panel/main-loop/bootstrap 的真实 caller；3j 的 toast、map-names、checkpoints 和整卡统一门仍未收口。

## 逐文件、caller 与生命周期

完整读取清单、SHA、行数和范围见 [`read-boundaries.json`](read-boundaries.json)。`createDisplayScaleController` 从 localStorage 读取百分比，有限/正值进入 `[10,1000]` 四舍五入，非法或非正值回落 100%，每次 set 同步 CSS 和存储；fullscreen 只委派到 canvas/document。真实生产 caller 是 `bootstrap.ts:1106-1123` 创建并注入 tools panel，tools-panel 的“全屏”按钮直接调用 `toggleFullscreen`。

`fps-overlay.ts` 的 module state 由 rAF `main-loop.ts:176` 每帧喂 `performance` 时间戳；`setFpsEnabled(false)` 清 overlay 和采样窗口，localStorage 只有 `'1'` 开启，首帧建单例 DOM，500ms 后按帧数重算并用 50fps 阈值着色。tools-panel 只负责开关委派，overlay 自己拥有样式/节点/采样状态；没有跨模块重复实现或未清理的 timer/listener。

## 测试判别力与结论

display-scale 主测试覆盖默认 100%、clamp、持久化和损坏存储；GLM leaves 补 NaN setter、非整数 round、居中 CSS 和 fullscreen 委派。fps 主测试覆盖 120/25fps、50 阈值、启停和脏帧丢弃；GLM leaves 补未创建 hide no-op、样式单例和非法存储。tools-panel leaves 只核真实按钮委派，不重复实现测试。未发现直接输入、ownership、清理或重复合同缺口；此前 display-scale 的 NaN 窄修已保留，未扩大为无 caller 证据的 Infinity 策略。

定向 5 files / 40 tests passed，`pnpm --filter @type-pal/game run typecheck` 通过且无诊断。没有修改生产或测试；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`，3j 整卡保持 partial，不把历史 done 重新升为当前 accept。
