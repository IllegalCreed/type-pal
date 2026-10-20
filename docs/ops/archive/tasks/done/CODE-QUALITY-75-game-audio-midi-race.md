# CODE-QUALITY-75 — game audio MIDI async track race

Status: done
Phase: phase1 game
Capability: Q3 game/shell
Coding Owner: Unassigned
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: TBD
Branch: `codex/code-quality-3y`

> 高风险音频行为边界：先完成一手证据与可证伪反控，不得直接修改实现。

## 目标

确认 `createSpessaSynthBackend` 在多个 MIDI fetch 并发、stop 或 autoplay resume 期间是否始终只允许最新曲目发声；若确认 stale response 可抢播，另行写失败反例、修复并跑相邻回归。

## 范围

- 范围内：`packages/game/src/shell/audio-midi.ts`、`packages/game/src/shell/audio-midi.boundaries.test.ts`、其 `audio.ts` MusicBackend caller、bootstrap/dev-panel 曲目切换 caller、SDLPal MIDI primary source。
- 范围外：soundfont 格式、资源生成、公共 AudioManager API、产品音量/混响取舍。
- 明确不做：不改变公共 API、曲目选择、音量或混响语义；仅补异步响应 ownership。

## 前提真值门

### 一句话行为 / 工程前提

异步加载的 MIDI 曲目不能在用户已选择更新曲目或停止后，以旧响应重新装载并发声。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SDLPal `TSF_Play` 先关闭当前消息、再同步加载新曲；相同曲号直接返回 | `reference/sdlpal/midi_tsf.c:137-168` |
| 第一阶段 | shell 通过 `MusicBackend.play/stop` 路由 BGM，track 变化时切换 | `packages/game/src/shell/audio.ts:21-27,302-319` |
| 当前二阶段 | 原实现 `doPlay` fetch 后无 generation/abort check；`play` 可在 ready 后连续启动多个 async `doPlay` | 历史实现 `packages/game/src/shell/audio-midi.ts:67-89,155-178` |
| 本任务目标 | generation 守住最新曲目/stop ownership，旧响应不再 load/play | 当前 `packages/game/src/shell/audio-midi.ts:61-95,161-187` 与边界反控 |

### 反证与替代解释

- 最强替代解释：SpessaSynth 的 `loadNewSongList` 可能内部原子丢弃旧请求，或 caller 在资源 ready 后不会快速切歌。
- 什么观察会推翻当前前提：mock fetch 逆序完成但序列最终仍只调用最新 `loadNewSongList/play`；或真实 Sequencer 明确提供 latest-wins 保障。
- 已排查替代根因：
  - runtime 语义 / 命令分类：`audio.ts` 只在 track 变化时调用 backend；未发现重复调用误分类。
  - 原版 / 第一阶段理解：SDLPal 同步 `TSF_Play` 先 close 再 load，支持 latest-wins 约束。
  - extractor / 地图 / 数据解码：不涉及。
  - audit / test model：现有 `audio.test.ts` 只 mock `MusicBackend`，未覆盖 MIDI fetch 逆序；`audio.glm-phase1-leaves.test.ts` 仅覆盖无 Web Audio no-op 与 volume 端口。

### 用户可见偏离

- 是否主动偏离已核真值：no（目标是保留最新曲目语义）。
- `before -> after`：可能旧 MIDI 响应抢播 -> 只允许当前曲目响应发声。
- 代表场景：dev-panel 连续点两首音乐，先发出的慢请求晚于后发出的快请求完成。
- 用户裁决：N/A，若修复仅恢复 primary source 语义；若需改变切歌/预加载 UX，暂停请用户裁决。

## 上下文锚点

- `CLAUDE.md` 忠实还原规则；`docs/phase1/engineering-notes.md` 音频资源生命周期；`audio-midi.ts:51-178`。
- `bootstrap.ts:457-502,1771-1800`、`dev-panel.ts:1876-1905` 是真实曲目 caller；`reference/sdlpal/midi_tsf.c:137-168` 是 primary source。
- 不得重新引入：旧曲目在 stop/切歌后复活、未处理的 fetch rejection、AudioContext autoplay 解锁重启风暴。

## 验收条件

- 功能：`playGeneration` 在 play/stop 时递增，fetch、arrayBuffer、resume 后逐段检查 latest-wins；不改公共 API。
- 测试：逆序响应旧实现先红（`[2,1]`），修复后只播放 `[2]`；stop 在途响应不播放；定向 29 tests、game 3528 tests 全绿，真实 `createSpessaSynthBackend` 入口与 fake Sequencer `loadNewSongList/play` oracle。
- 文档：本卡与 ledger/board 记录直接证据、未修风险和质量门。
- 视觉/手工：dev-functional 最小连续切歌复现；若工具/资源不可用，明确 blocked，不以源码推断替代。

## 当前模式推进记录

- Codex 范围/前提核验: verified（逆序 fetch 反控复现旧曲目抢播；primary source 与 caller 语义支持 latest-wins）。
- 范围、设计和验收条件: agree（先测试后决定是否修复）。
- 高风险用户产品裁决: N/A（暂不改变用户行为）。
- build 准入结论: Codex build allowed；实现已完成并通过独立验收。

## Review: 审查与返工

- Reviewer: Codex
- 审查结论: accept；generation checks 覆盖 resume/fetch/arrayBuffer/stop，未改变公共 API或用户曲目选择。
- 必须返工项: 无。
- Accept / rework: accept

## 交接日志

- 2026-10-13 Codex：保留逆序 fetch/stop 失败反控，加入 `playGeneration` latest-wins 守卫；定向 29、game 全包 3528、全仓 `pnpm check`、coverage ratchet、origin/main protected fast、lint-zero、docs/content review、ledger 全部通过。覆盖率 ratchet 只升不降更新 8 项/2 范围项；lint 3995 files，0/0/0。Evidence: `audio-midi.ts:61-95,161-187`; `audio-midi.boundaries.test.ts`; `reference/sdlpal/midi_tsf.c:137-168`. Next: 无，等待集成。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-75 game audio MIDI async track race
任务卡：docs/ops/tasks/CODE-QUALITY-75-game-audio-midi-race.md
当前状态：done，已归档；实现与测试已完成，勿重复改写。
先读：AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md、docs/phase1/engineering-notes.md、本卡、packages/game/src/shell/audio-midi.ts、audio.ts、bootstrap.ts、dev-panel.ts、reference/sdlpal/midi_tsf.c。
请你做：若继续音频治理，选择新的不重叠 pending 文件；不要回退本卡 generation 取消修复。
输出要求：本卡仅作历史证据；下一批另开任务卡。
```

## 2026-10-16统一3y复审追加（不重写历史验收）

本卡done与以上计数仅表示当时结果；当前main MIDI已被完整发布实现替代，原“当前二阶段”行实际指第一阶段历史实现，不能用作二阶段设计依据。统一候选旧测试1绿1红，FakeSequencer缺新异步事件协议；已核主线12例包含更强的两条同合同，保留产品/主线测试原字节并删除旧boundaries测试文件。定向12、相邻44、game typecheck与隔离stop代际失效反控12绿→11绿1指定业务红→恢复12绿通过。当前ledger仍review，不以本片恢复closed或宣称完整质量门通过；功能视觉和整体产品验收仍待续。

当次完整读取、primary/caller范围、退役原件/身份映射、失败与恢复、环境准备失败及下一片见[Y01证据](../../../evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/README.md)，归属[统一治理卡](../../../tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md)。无下一位Agent提示词，Codex在唯一3y分支继续复审。

## 2026-10-21 shell生命周期五卡收口

原产品及已明确迁移的当前12例主测接受；旧boundaries保持退役，映射/单红原件复用。现版真实Chrome/UI按钮1→2、快速1→2、停止/重播与实际Sequencer文件名/循环/暂停/AudioContext匹配，截图已看、零控制台诊断；不主张听感或强制逆序网络实跑。初始化ready拒绝与运行错误回调的旧注释已纠正。

[当前逐文件A–H、迁移、完整原件及集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json)。只接受原卡及明确迁移范围，广域caller/听感/剧情E2E不附带接受；Git发布另以实际交接为准。
