# CODE-QUALITY-77 — game RNG player contract

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: e2e-deferred（DOS/RNG 演出集中验证；本批核时序/像素端口合同）

## 目标

逐文件核验 RNG.MKF 播放器及其主/边界测试，确认资源 manifest/frame window、缓存并发、失败重试、帧 blit、淡入、skip、shake ownership 与 SDLPal `PAL_RNGPlay` 一致。

## 范围

- `packages/game/src/shell/rng-player.ts`
- `packages/game/src/shell/rng-player.test.ts`
- `packages/game/src/shell/rng-player.glm-next-wave.test.ts`
- 只读相邻 caller/oracle：`rng-player.io-lifecycle.test.ts`、`rng-window.grok-r1.test.ts`、`trademark-fallback.ts`、`bootstrap.ts` RNG handlers、`event-system.ts` opcode 0x37、SDLPal `rngplay.c/main.c/video.c`。
- 不修改 RNG 资源、manifest、schema/save、公共接口或剧情 E2E 画面。

## 前提真值门

- 一句话工程前提：`playRng` 应按 SDLPal `PAL_RNGPlay` 的起止帧、帧间隔、首帧淡入、逐帧屏幕更新和 shake 计数消费 RNG 数据；失败输入 fail-soft 且不污染后续播放。
- 真值来源：`reference/sdlpal/rngplay.c:372-448`、`reference/sdlpal/main.c:197-203`、`reference/sdlpal/video.c:571-616`、`packages/game/src/shell/rng-player.ts:1-267`。
- 当前 `before` -> 目标 `after`：现有 RNG 播放器 -> 逐段核验并保留已核实行为；本卡无实现改动。
- 最强替代解释 / 推翻观察：若真实资源 loader/handler 显示 frame window、缓存失败或 shake 计数与测试模型不同，则需另开资源管线/演出卡；当前 caller 与 primary source 未显示直接缺陷。
- 是否主动偏离已核真值：N/A（纯治理核验，无行为改动）。

## 上下文锚点

- `CLAUDE.md` 忠实还原规则；`docs/phase1/engineering-notes.md` 资源与演出时序条目。
- `rng-player.ts:91-145` chunk in-flight cache、`:183-267` play lifecycle；`bootstrap.ts:1011-1046,1262-1290,1414-1470` 真实 handlers；`event-system.ts:852-880,2208-2225` opcode ownership。
- primary 对照：C 先 `PAL_RNGReadFrame`/blit，再 `VIDEO_UpdateScreen`, fade-in, delay；`video.c` shake 对视频帧消费 `g_wShakeTime`。
- 不得重新引入：同 chunk 并发 stampede、失败 Promise 永久缓存、窗口外帧请求、shake 计数泄漏、dev skip 默认污染正式 PAL 行为。

## 验证

- 完整读取实现 267 行、主测试 326 行、GLM 边界测试 124 行、相邻 IO/window/trademark/bootstrap/event callers 与 SDLPal primary source。
- 定向 33 tests 全绿，覆盖合法全帧、窗口请求集合、manifest/单帧失败、失败缓存驱逐、并发去重、skip、initial fade、shake、跨 caller 时序与 trademark handler。
- 无实现改动；未以包级绿单独关闭文件，三个范围文件均有直接 caller/oracle 与 primary 证据。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、caller、primary source 与测试合同直接读取）。
- Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`。
- build 准入: Codex build allowed（只读治理与账本更新；实现白名单为空）。
- Codex 独立验收: accept（定向、相邻、全仓质量门与 ledger 通过）。
- 用户产品裁决: N/A（无行为改动；视觉演出集中到 E2E）。
- done 准入: Codex done allowed。

## 交接

- 2026-10-13 Codex：完成逐文件核验；无实现改动。定向 RNG/trademark 33 tests、game 全包 3528、全仓 `pnpm check`、coverage ratchet/protected fast、lint-zero、docs/content review、ledger 通过；未发现直接缺陷。账本收口为 `3267 / 337 closed / 8 review / 2922 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-77 game RNG player contract
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-77-game-rng-player-contract.md
当前状态：done，已归档；无实现改动。下一批请从新的 pending 文件开始，不要把剧情 E2E 或 CODE-QUALITY-57 review 当作已关闭。
```
