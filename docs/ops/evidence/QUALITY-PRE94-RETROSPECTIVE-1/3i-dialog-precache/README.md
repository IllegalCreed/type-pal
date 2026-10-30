# CODE3i 对话资源 / 预缓存 / 音量 / 商标复审切片

2026-10-23 当前补八维及测试质量：[UI／客户端／商标窗口](quality-closeout/README.md)。复用本页与72已有有效证据，补生命周期隔离、真实消息/渲染oracle和三份有效反控；源码仅注释与私有同合同formatter合并。本窗集中门已零项目诊断通过，原五源范围接受、固定83为64accept/19partial；平台提示清零与PR发布待真实远端核。下文是历史时点，不覆盖当前回执。

基点：`f2ebb196f`；分支：`codex/code-quality-3y`，复核前已 `git fetch origin --prune`，相对 `origin/main` 为 `0 behind / 190 ahead`。本切片继续只处理 94 之前的 CODE-QUALITY-3i；94–102 与 103+ 未触碰。整卡仍 `partial`，不把本切片当作整项 `accept`。

## 逐文件范围与真实边界

完整读取五个白名单实现：`dialog-assets.ts`、`precache-client.ts`、`precache-ui.ts`、`audio-volume.ts`、`trademark-fallback.ts`；并完整读取直接测试、`bootstrap-resources.ts` 及其资源屏障测试、`bootstrap-audio.test.ts`。调用链按实际使用读取：`main.ts` 的 SW/可玩门，`bootstrap.ts` 的资源装配、`PresentContext`/`BattleAssets` 注入、三路音量 controller、RNG/商标 fallback 与 `onPresent` 的 pause/resume；`present.ts` 的 dialog asset 消费、`tools-panel.ts` 的音量控制，以及 `public/sw.js` 的进度消息生产。文件清单、SHA、行数与只读区间见 [`read-boundaries.json`](read-boundaries.json)。

primary source 为 `reference/sdlpal/main.c:197-203` 的 DOS 商标顺序，资源真值为 `dialog-assets.ts` 使用的 extracted portraits/icon manifest 与 shared RLE/PNG 解码器，预缓存协议真值为 `packages/game/public/sw.js:112-151`。没有触碰 schema/save、生成资源、公共接口或用户可见形态。

## 发现、修复与保留

发现 `precache-ui.ts` 的公共进度入口没有拒绝 `NaN`：`setNecessaryProgress(NaN)` 会把单调状态写成 `NaN`，`setFullProgress(NaN, …)` 会把文案写成 `NaN/…MB`，之后合法进度也无法恢复。先加入宿主反例确认旧实现失败，再在 UI 边界统一拒绝非有限/负字节、对超过总量的字节做上限归一，并对合法的零总量保留 `0/0MB` 语义；正常进度、阶段转移、widget 生命周期不变。新增反例覆盖“非法输入后仍可继续更新”，没有新增弱覆盖测试。

`dialog-assets.ts` 的 portrait/icon 失败隔离、真实 PNG 尺寸/opaque、shared RLE 入口和空 map 降级与 caller 一致；没有证据要求改资源格式或伪造 manifest 帧。`precache-client.ts` 的 onPlayable 后启动、ready race 的 start 缓冲、pause/resume 消息与 SW 端协议一致；多次 bootstrap/HMR 下模块级 worker 状态的生命周期没有生产 caller 证据，本切片保留为 review 候选，不改协议。`audio-volume.ts` 的 NaN→0 修复和三路独立音量/共享 mute 与 bootstrap/tools-panel caller 一致。`trademark-fallback.ts` 仍按 chunk 6、25fps、1000ms 延迟、600ms 淡出，skipKeys 只显式注入，符合 primary source 与 `playRng` 合同；未扩展演出行为。

## 验证

先行失败：`precache-ui-host.grok-r1.test.ts` 22 例中 2 个新反例失败（旧实现分别产生 `加载必要资源 NaN%` 与 `已缓存 NaN/0MB`）。修复后定向 12 文件 / 79 tests passed，`pnpm --filter @type-pal/game typecheck` passed。测试覆盖真实 DOM、canvas/RLE/PNG、SW message/ready 端口、资源屏障 rejection/settle、三路音量 sink/storage、RNG framebuffer/timing，并检查测试隔离、真实 caller/oracle、排重和有效反控。

按用户成本约束，本小批未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；这些门留到一个完整大模块收口前集中执行。后续仍需继续 3j 以外的 pre-94 队列；本批不改变 94–102 优先级，不把包级绿灯当作全仓完成。


## 2026-10-18 当前counter

原NaN窄修与当轮测试保持；当前[72反例](../72-boot-loading/README.md)证真实boot/UI组合的失败文案被迟到进度覆盖，precache-ui整文件旧已验证精确撤回rework。生产未修，按[高风险卡](../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)继续；本页旧“阶段/失败生命周期保持”不得扩张成当前失败终态accept。

## 2026-10-18 用户批准后的窄修

[批准修复证据](../72-boot-loading/approved-fix/README.md)替代上述“未修/冻结”的当前状态：三个生产文件按批准修复失败进度与计数ownership，四条先红后绿、相邻58绿/原红精确重放1绿、game typecheck及实际PROD失败/正常进场与看图完成。boot-loading.ts新增闭合，main/UI仍review，UI主测试新增review；289closed/47review/2976pending。旧counter和原NaN/测试历史原件保留，不把整卡升格accept。全仓check/ratchet/protected未运行，47–52旧门信用已撤回；下一步同片UI测试合同/隔离，再续73。
