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
