# TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 — runtime audio lifecycle contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / audio lifecycle
Branch: `codex/glm-reforge-audio-lifecycle-r1`
Visual Verification Timing: dev-functional

## 目标与范围

核验 Reforge runtime 音频生命周期的公开合同；不与 Editor audio-ownership 卡重叠，也不以覆盖率/例数作为指标。范围限定于 `packages/reforge/src/audio/bgm.ts`、`audio/midi-preview.ts`、`audio/sfx.ts` 及其公开 runtime caller：播放接管、停止/替换、load/play 失败、AbortSignal、dispose、重复调用和资源清理。

先对照现有 audio/bgm、midi-preview、sfx、spessa runtime 测试和已归档 Reforge 卡排重；private audio state 只通过公开 observer/host oracle 验证。

## 硬约束与交付

只写本卡测试、合法 typed fixture 和证据；不得改产品、旧测、配置、baseline、真实 PAL 数据、私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。每条合同记录 source/caller/input/oracle/fullName；反控提供三态绿红绿、四态 hash、执行集、raw/JSON、clean-tree 和 mkdtemp 清理证明。交付 identity/family ledger、定向/相邻/typecheck/lint/docs/diff；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及已归档 Reforge 卡；只在 codex/glm-reforge-audio-lifecycle-r1 工作。先对 audio/bgm.ts、audio/midi-preview.ts、audio/sfx.ts 的旧 fullName、公开 caller、合法输入和业务 oracle 排重，再补播放接管、停止/替换、失败、取消、dispose 和重复调用合同。不得改产品、旧测、配置、baseline、真实数据、私有 state、强转、skip、ignore、扩大 timeout 或业务核心 mock。反控须三态绿红绿、四态 hash、执行集和清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
