# TEST-GLM-EDITOR-ASSET-LIFECYCLE-1 — asset lifecycle and sprite action contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / asset lifecycle
Branch: `codex/glm-editor-asset-lifecycle-r1`
Visual Verification Timing: dev-functional

## 目标

补齐 Editor 资源生命周期与精灵动作作者流程中尚未被旧测证明的真实合同，重点覆盖选择、替换、删除、撤销和资源回收；不以覆盖率或新增例数作为本卡指标。

## 独占范围

只允许新增 `packages/editor/src/ui/` 本卡测试、合法 fixture 和证据：

- `MediaAssetLifecycle.tsx`：object URL 创建/替换/卸载回收、stale asset、失败后恢复；
- `AssetInspectorTabs.tsx` / `ImageAssetPicker.tsx`：资源选择回落、缺失资源提示、取消与确认后的 session/oracle；
- `SpriteActionEditor.tsx` / `SpriteActionEditorDialog.tsx` / `BattleSpriteUploader.tsx`：动作列表增删改、非法帧/重复 id 拒绝、上传取消和 undo；
- 只做最小功能性 UI 证据，不走剧情 E2E。

先对照现有 AssetInspectorTabs、MediaAssetLifecycle、ImageAssetPicker、SpriteActionEditor、SpriteActionEditorDialog、BattleSpriteUploader 测试以及已归档 Editor authoring 卡排重。

## 硬约束与交付

- 每条合同必须有真实组件 caller、合法 typed project/asset 输入、session/serialization/DOM 业务 oracle 和唯一 fullName。
- 所有 React 更新在 act 内；afterEach 清理 object URL、listeners、session、临时文件并 unmount。
- 禁止修改产品、旧测、配置、baseline、真实项目数据；禁止强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash 和清理证明。
- 交付排重账、identity、必要截图 hash、定向/相邻/typecheck/lint/docs/diff 结果；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-editor-asset-lifecycle-r1`
- build 准入: Codex build allowed
- Codex 独立验收: pending
- done 准入: blocked

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-ASSET-LIFECYCLE-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor authoring 卡。
在 codex/glm-editor-asset-lifecycle-r1 隔离工作树中，对 MediaAssetLifecycle、AssetInspectorTabs、ImageAssetPicker、SpriteActionEditor、SpriteActionEditorDialog、BattleSpriteUploader 的旧 fullName、caller、合法输入和业务 oracle 排重，再实现未证明的资源生命周期合同。
只写本卡白名单的新测试、合法 fixture 和证据；不得改产品、旧测、配置、baseline、真实项目数据或其它卡目录。
所有 React 更新在 act 内，严格清理 object URL/listener/session；禁止强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。
反控必须原始绿→指定业务红→恢复绿并保存 raw/JSON/exit/执行集/三态 hash/清理证明。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
覆盖率与测试数量不是本卡完成条件；不得标 done，等待 Codex 独立验收。
```
