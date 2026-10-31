# CODE3j display-scale / fps-overlay 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3j有限切片(基点b42eb9065,0 behind),核display-scale与fps-overlay生产实现、直接测试及tools-panel/main-loop/bootstrap真实caller;3j的toast/map-names/checkpoints与整卡统一门未收口。

## 范围与证据

完整读取display-scale.ts(51行)/fps-overlay.ts(110行)及各自主测与GLM leaves、tools-panel.glm-phase1-leaves(只计display/fps断言)、main-loop.ts(181行rAF caller);bootstrap.ts只读1080-1123(display-scale构造/注入)、tools-panel只读导入与display/FPS按钮段,清单SHA见[read-boundaries.json](read-boundaries.json)。createDisplayScaleController从localStorage读百分比,有限/正值进[10,1000]四舍五入,非法或非正值回落100%,每次set同步CSS与存储;fullscreen只委派canvas/document。fps-overlay模块状态由rAF main-loop.ts:176每帧喂performance时间戳;setFpsEnabled(false)清overlay与采样窗,localStorage仅'1'开启,首帧建单例DOM,500ms后按帧数重算并以50fps阈值着色。

## 发现

display-scale主测覆盖默认100%/clamp/持久化/损坏存储,GLM leaves补NaN setter/非整数round/居中CSS/fullscreen委派;fps主测覆盖120/25fps、50阈值、启停与脏帧丢弃,GLM leaves补未创建hide no-op/样式单例/非法存储;tools-panel leaves只核真实按钮委派。未发现直接输入、ownership、清理或重复合同缺口;此前display-scale的NaN窄修保留,未扩大为无caller证据的Infinity策略。

## 结论

定向5 files/40 tests passed,game typecheck通过无诊断;未修改生产或测试。本片不运行coverage/official ratchet/protected fast或全仓check;3j整卡保持partial,不把历史done重升为当前accept。

## 整改与复核

未重跑;无浏览器fullscreen权限/运行时视觉验收。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2110B / SHA-256 493476fb036765e1638dfe76c8aeeedd4960fe4e50beaa7340ee767d3f65869c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3j display-scale / fps-overlay 当前复审切片

基点：`b42eb9065`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。本片核 display-scale、fps-overlay 的生产实现与直接测试，以及 tools-panel/main-loop/bootstrap 的真实 caller；3j 的 toast、map-names、checkpoints 和整卡统一门仍未收口。

## 逐文件、caller 与生命周期

完整读取清单、SHA、行数和范围见 [`read-boundaries.json`](read-boundaries.json)。`createDisplayScaleController` 从 localStorage 读取百分比，有限/正值进入 `[10,1000]` 四舍五入，非法或非正值回落 100%，每次 set 同步 CSS 和存储；fullscreen 只委派到 canvas/document。真实生产 caller 是 `bootstrap.ts:1106-1123` 创建并注入 tools panel，tools-panel 的“全屏”按钮直接调用 `toggleFullscreen`。

`fps-overlay.ts` 的 module state 由 rAF `main-loop.ts:176` 每帧喂 `performance` 时间戳；`setFpsEnabled(false)` 清 overlay 和采样窗口，localStorage 只有 `'1'` 开启，首帧建单例 DOM，500ms 后按帧数重算并用 50fps 阈值着色。tools-panel 只负责开关委派，overlay 自己拥有样式/节点/采样状态；没有跨模块重复实现或未清理的 timer/listener。

## 测试判别力与结论

display-scale 主测试覆盖默认 100%、clamp、持久化和损坏存储；GLM leaves 补 NaN setter、非整数 round、居中 CSS 和 fullscreen 委派。fps 主测试覆盖 120/25fps、50 阈值、启停和脏帧丢弃；GLM leaves 补未创建 hide no-op、样式单例和非法存储。tools-panel leaves 只核真实按钮委派，不重复实现测试。未发现直接输入、ownership、清理或重复合同缺口；此前 display-scale 的 NaN 窄修已保留，未扩大为无 caller 证据的 Infinity 策略。

定向 5 files / 40 tests passed，`pnpm --filter @type-pal/game run typecheck` 通过且无诊断。没有修改生产或测试；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`，3j 整卡保持 partial，不把历史 done 重新升为当前 accept。
```
<!-- incremental-original-source:end -->
