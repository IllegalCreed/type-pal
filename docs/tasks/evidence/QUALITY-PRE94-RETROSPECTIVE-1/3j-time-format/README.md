# CODE3j time-format 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3j有限pre-94切片(基点7057dddd9,已合并最新origin/main),只核time-format实现、三份直接合同测试与持久化/显示caller。核心发现一个可复现输入缺陷:parseHms对每段只查NaN,超长十进制段可得Infinity,总毫秒也成为Infinity;工具面板把该值交给setBest后,JSON.stringify把无限数静默序列化为null——用户可输入的工具边界,既有『有限caller输入』前提不能覆盖。

## 范围与证据

完整读取time-format.ts(36行)/三份直接测试/store.ts+store.test/overlay.ts/timer.ts/index.ts;tools-panel只读1-260与867-891(parseHms caller段),CLAUDE.md/phase1文档按相关边界读,清单SHA见[read-boundaries.json](read-boundaries.json)。四个公开函数(墙钟厘秒/整秒显示/H:MM:SS与M:SS解析/带符号差值)是工具层纯函数,不承载第一阶段战斗/存档机制;SDLPal无对应浏览器计时API。caller已核:overlay只送elapsedMs/split/PB/ETA,timer时间来自注入wall-clock,tools-panel:867-891把玩家文本交parseHms后写setSpeedrunBest,store读回值要求finite且非负。

## 发现

先加失败反例(308位9数字段+:59:59)原实现返回Infinity(1 failed/3 passed,唯一失败预期null实际Infinity);随后将段值与总毫秒都限为finite,小时仍无固定上界、只拒绝无法表示的结果,未扩大为任意时间上限。未修问题:formatClock/formatHms/formatDiff的非finite输入无生产caller证据、timer仍依赖调用方提供有限performance.now——保持pending,不凭纯函数猜测扩张。

## 结论

恢复后定向4 files/15 tests passed、相邻caller 6 files/43 tests passed、typecheck 0诊断,均0 failure/skip/stderr;本小批未运行coverage/official ratchet/protected fast/全仓check(按用户成本规则留到大模块收口)。time-format.ts与三份直接测试从结构性pending推进到『已逐文件读取、发现并修复一项输入边界、仍需整卡复核』;不把3j整卡或历史done直接升为accept。

## 整改与复核

未重跑;未触碰高风险边界,未修改SDLPal/schema/save/生成物/共享配置/公共游戏接口。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3661B / SHA-256 6f9bd4bbdb459187dec37c49082104d3ab8d8c32a441ab4b34ba9f1a8fd1a52e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3j time-format 当前复审切片

基点：`7057dddd9`（已合并最新 `origin/main`）；分支：`codex/code-quality-3y`。这是 CODE-QUALITY-3j 的有限 pre-94 复审切片，只核 `time-format` 实现、三份直接合同测试和持久化/显示 caller；3j 其余 display-scale、FPS、toast、map-names、countdown、checkpoints 仍未在本轮重审。3j 整卡保持 `partial`，本切片不新增 ledger closed。

## 逐文件读取与事实边界

完整读取清单、SHA、行数和 caller 的部分读取范围见 [`read-boundaries.json`](read-boundaries.json)。实现的四个公开函数分别负责墙钟厘秒、整秒显示、`H:MM:SS`/`M:SS` 解析和带符号差值；它们是工具层纯函数，不承载第一阶段战斗/存档机制，SDLPal 无对应浏览器计时 API，故 primary 以当前 caller、工具合同和 `CLAUDE.md` 的阶段边界为准。

直接 caller 已核：`overlay.ts` 只把运行时 `elapsedMs`、split、PB 和 ETA 送入格式化；`timer.ts` 的时间来自注入的 wall-clock；`index.ts` 只编排 timer/overlay；`tools-panel.ts:867-891` 将玩家文本交给 `parseHms` 后写入 `setSpeedrunBest`；`store.ts` 对持久化读回值要求 finite 且非负。没有 schema/save、迁移、资产或公共游戏接口变化。

## 发现与处理

发现一个可直接复现的输入/错误传播缺陷：`parseHms` 对每段只检查 `NaN`，超长十进制段可得到 `Infinity`，总毫秒也会成为 `Infinity`；工具面板随后把该值交给 `setBest`，`JSON.stringify` 会把无限数静默序列化为 `null`。这是用户可输入的工具边界，已有的“有限 caller 输入”前提不能覆盖该反例。

先加入失败反例 `${'9'.repeat(308)}:59:59`，原实现返回 `Infinity`；随后将段值和总毫秒都限制为 finite，恢复正常 15 例定向合同。没有扩大为任意时间上限或改变合法格式；小时仍无固定上界，只拒绝无法表示的结果。

未修问题：`formatClock`、`formatHms`、`formatDiff` 的非 finite 输入没有生产 caller 证据；`timer` 仍依赖调用方提供有限 `performance.now`；这些未知保持 pending，不凭纯函数猜测扩张行为。

## 验证

- 失败反例：`time-format.boundaries.test.ts` 原实现 `1 failed / 3 passed`，唯一失败为预期 `null`、实际 `Infinity`。
- 定向恢复：`time-format.test.ts`、`time-format.boundaries.test.ts`、`time-format.glm-phase1-leaves.test.ts`、`store.test.ts`，`4 files / 15 tests passed`，0 failure/skip/stderr。
- 相邻 caller：`overlay.test.ts`、`overlay.glm-phase1-leaves.test.ts`、`timer.test.ts`、`timer.boundaries.test.ts`、`tools-panel.test.ts`、`tools-panel.glm-phase1-leaves.test.ts`，`6 files / 43 tests passed`，0 failure/skip/stderr。
- `pnpm --filter @type-pal/game run typecheck`：通过，0 diagnostics。
- 本小批未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；按用户明确的成本规则，这些只在完整大模块收口、文档证据齐备且准备提交前集中运行。
- 未触碰高风险边界；没有修改 SDLPal、schema/save、生成物、共享配置或公共游戏接口。

## 当前结论与下一批

本切片把 `time-format.ts` 和三份直接测试从 pre-94 的结构性 pending 推进到“已逐文件读取、发现并修复一项输入边界、当前仍需整卡复核”的状态；不把 3j 整卡或任何历史 `done` 直接升为 `accept`。下一批可核 `3j` 的 `countdown.ts` 与其三份测试，或继续回到 all-cards 队列中的 `3i`；94–102 仍按用户优先级排在 pre-94 全部复审之后。
```
<!-- incremental-original-source:end -->
