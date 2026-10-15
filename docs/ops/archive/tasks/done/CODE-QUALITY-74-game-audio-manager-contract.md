# CODE-QUALITY-74 — game audio manager contract

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: N/A（音频路由与资源生命周期；听觉 E2E 延后）

## 目标

逐文件核验 shell 音频管理器及其主/边界测试，确认 SFX/BGM 路由、队列 ownership、去重、开关和 OGG 资源释放保持 SDLPal/第一阶段约束。

## 范围

- `packages/game/src/shell/audio.ts`
- `packages/game/src/shell/audio.test.ts`
- `packages/game/src/shell/audio.glm-phase1-leaves.test.ts`
- 相邻 caller：`packages/game/src/shell/bootstrap.ts`、`bootstrap-audio.test.ts`、`shell-bootstrap.glm-shell.test.ts`（只读证据，不改）
- `packages/game/src/shell/audio-midi.ts` 发现异步曲目切换风险，留 CODE-QUALITY-75 独立 review，不在本卡关闭

## 前提真值门

- 一句话工程前提：AudioManager 只消费 GameState 音频意图，保持 SDLPal 的曲目/音效选择与取消、资源 ownership，不主动改变用户可见音频行为。
- 真值来源：`reference/sdlpal/midi_tsf.c:45-168`、`reference/sdlpal/sound.c:769-772,930`、`packages/game/src/shell/audio.ts:1-319`、`packages/game/src/shell/bootstrap.ts:177-201,457-502`。
- 当前 `before` -> 目标 `after`：现有音频路由与生命周期 -> 逐段核验并保留已核实行为；本卡无实现改动。
- 最强替代解释 / 推翻观察：若真实 caller 在同一帧重复消费、AudioContext 取消或 OGG 旧元素仍持有媒体资源，则需另开行为卡；当前测试与 caller 证据未显示 `audio.ts` 内直接缺陷。
- 是否主动偏离已核真值：N/A（纯治理核验，无行为改动）。

## 上下文锚点

- `CLAUDE.md` 忠实还原规则；`docs/phase1/engineering-notes.md` 音频/资源生命周期条目；`docs/phase1/game-mechanics.md`（无数值机制改动）。
- `audio.ts:74-106` 曲目选择、`164-194` OGG 释放、`200-319` manager 状态与开关；`bootstrap.ts:177-201,457-502` 真实 caller。
- 已知坑：`AudioContext`/decode 在 Node 测试环境不可用；听觉演出集中到 E2E，不用 no-op 测试冒充播放验证。MIDI backend race 另卡处理。
- 不得重新引入：core/event-system 直接碰 Web Audio、丢失 pendingSounds ownership、同号 SFX 重叠、旧 HTMLAudioElement 媒体资源悬挂。

## 验证

- 完整读取 `audio.ts`、两份测试、bootstrap caller 与 SDLPal MIDI/sound 证据；定向 `audio.test.ts`、`audio.glm-phase1-leaves.test.ts`、`bootstrap-audio.test.ts`、`shell-bootstrap.glm-shell.test.ts`：27 tests 全绿。
- 测试合同：URL/track 映射、合法 SFX/BGM 输入、队列就地清空、真实 MusicBackend caller oracle、去重/结束复位、OGG release/volume、无 Web Audio no-op；边界测试与主合同排重，未以数量或 coverage 单独关闭。
- 无视觉/听觉开发期验证；听觉 E2E 延后登记，不改变本卡结论。

## 当前模式推进记录

- Codex 范围/前提核验: verified（直接读取实现、caller、primary source 与测试）。
- Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`。
- build 准入: Codex build allowed（只读治理与文档账本更新；实现白名单为空）。
- Codex 独立验收: accept（定向、相邻、全仓质量门与 ledger 均通过）。
- 用户产品裁决: N/A（无行为改动）。
- done 准入: Codex done allowed。

## 交接

- 2026-10-13 Codex：完成逐文件核验；无实现改动。定向 27 tests 全绿；相邻 game、全仓 check、coverage ratchet、protected fast、lint-zero、docs/content review、ledger 通过。账本更新为 `3266 / 329 closed / 9 review / 2928 pending`（另含 CODE-QUALITY-75 的 audio-midi review）。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-74 game audio manager contract
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-74-game-audio-manager-contract.md
当前状态：done，已归档；无实现改动。若继续音频治理，请接 CODE-QUALITY-75，先核验 audio-midi 异步曲目切换风险。
```
