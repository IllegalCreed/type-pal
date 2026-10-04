# TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 — audio preview ownership contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / audio preview ownership
Branch: `codex/glm-editor-audio-ownership-r1`
Visual Verification Timing: dev-functional

## 目标与范围

补齐 Editor 音频试听 ownership、停止、切换和资源清理的真实合同；不以覆盖率或例数作为本卡指标。只允许新增 `packages/editor/src/ui/` 测试、合法 fixture 和证据，重点范围为 `AudioAssetWorkbench.tsx`、`MusicTab.tsx`、`SoundTab.tsx`、`ProjectAudioPreviewButton.tsx` 的公开交互与 owner/session 生命周期。先对照既有 AudioAssetWorkbench、MusicTab、SoundTab、ProjectAudioPreviewButton 测试和已归档 Editor 卡排重。

## 硬约束与交付

真实 React caller、合法 typed asset/session 输入、业务 DOM/owner/session oracle；所有更新在 act 内，afterEach 清理 audio owner、object URL、listeners、session 并 unmount。禁止产品/旧测/配置/baseline/真实项目数据、强转、skip、ignore、扩大 timeout、私有 debug state、业务核心 mock。反控必须三态绿红绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；交付排重账、必要截图 hash、定向/相邻/typecheck/lint/docs/diff，覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor 卡；只在 codex/glm-editor-audio-ownership-r1 工作。先对 AudioAssetWorkbench、MusicTab、SoundTab、ProjectAudioPreviewButton 的旧 fullName/caller/input/oracle 排重，再补 owner 接管、重复试听、停止、切换、失败和清理合同。所有 React 更新在 act 内，严格清理 audio owner/object URL/listener/session；禁止产品/旧测/配置/baseline/真实数据、强转、skip、ignore、扩大 timeout、私有 debug state、业务核心 mock。反控须三态绿红绿并保存完整证据。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
