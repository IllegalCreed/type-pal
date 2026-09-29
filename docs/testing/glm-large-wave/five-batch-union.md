# TEST-GLM-LARGE-WAVE-4 · 五批并集去重清单与局部 coverage 对照配置

> 交 Codex 用于独立验收与统一覆盖率门。GLM 未运行官方 ratchet/strict-fast；
> 正式收益以 main 并集计，本清单是去重索引，不是覆盖率主张。

## 并集总览

- 冻结 60 个生产源（[targets.json](targets.json)），与本轮之前 Kimi/三条 GLM 队列零交集（verify-targets.mjs 只读校验通过）。
- **新增测试**：20 个源文件获得同目录 `.glm-large-wave.test.ts(x)`（A 批 12 + B 批 1 + C 批 2 + D 批 2 + 见下表；
  每对源文件共享一个按组合并的测试文件时，两源各登记一次，实际新测试文件 17 个）。
- **existing-proof**：40 个源文件经旧测精确断言去重后判定已证（逐组依据见各批回执）。
- 隔离宿主/工具（非测试）：`browser-host/`（A/B/C 三条功能视觉）、`needle-judge.mjs`（五批共用反控判据）。

## A 批（编辑器命令表单与作者工作区）

- A01（两源均新增）
  - editor/src/ui/command-form-control.tsx → 新增测试（command-form-control.glm-large-wave.test.tsx）
  - editor/src/ui/command-form-world.tsx → 新增测试（command-form-world.glm-large-wave.test.ts）
- A02（两源均新增）
  - editor/src/ui/command-form-dialogue.tsx → 新增测试（command-form-dialogue.glm-large-wave.test.tsx）
  - editor/src/ui/command-form-actor.tsx → 新增测试（command-form-actor.glm-large-wave.test.tsx）
- A03（两源均新增）
  - editor/src/ui/DataMode.tsx → 新增测试（DataMode.glm-large-wave.test.tsx）
  - editor/src/ui/SharedScriptTab.tsx → 新增测试（SharedScriptTab.glm-large-wave.test.tsx）
- A04（两源均新增）
  - editor/src/ui/SceneScriptWorkspace.tsx → 新增测试（SceneScriptWorkspace.glm-large-wave.test.tsx）
  - editor/src/ui/AmbienceTab.tsx → 新增测试（AmbienceTab.glm-large-wave.test.tsx）
- A05（两源均新增）
  - editor/src/ui/StampLibraryTab.tsx → 新增测试（StampLibraryTab.glm-large-wave.test.tsx）
  - editor/src/ui/SpriteUploadWizard.tsx → 新增测试（SpriteUploadWizard.glm-large-wave.test.tsx）
- A06（两源均新增）
  - editor/src/ui/EnemyAnimPreview.tsx → 新增测试（EnemyAnimPreview.glm-large-wave.test.tsx）
  - editor/src/ui/FireEffectPreview.tsx → 新增测试（FireEffectPreview.glm-large-wave.test.tsx）

## B 批（编辑器会话、索引与派生状态）

- B01（existing-proof / existing-proof）
  - editor/src/core/script-editor.ts → existing-proof
  - editor/src/ui/ScriptTree.tsx → existing-proof
- B02（existing-proof / existing-proof）
  - editor/src/core/project-reference.ts → existing-proof
  - editor/src/core/project-reference-adapters.ts → existing-proof
- B03（existing-proof / existing-proof）
  - editor/src/core/edit-session.ts → existing-proof
  - editor/src/core/editor-derived-store.ts → existing-proof
- B04（新增测试 / existing-proof）
  - editor/src/ui/use-editor-project-session.ts → 新增测试（use-editor-project-session.glm-large-wave.test.tsx）
  - editor/src/core/project-io.ts → existing-proof
- B05（existing-proof / existing-proof）
  - editor/src/core/author-save-journal.ts → existing-proof
  - editor/src/core/project-diagnostics.ts → existing-proof
- B06（existing-proof / existing-proof）
  - editor/src/core/playback.ts → existing-proof
  - editor/src/core/tileset-references.ts → existing-proof

## C 批（Reforge 脚本与演出助手）

- C01（existing-proof / existing-proof）
  - reforge/src/script-runner.ts → existing-proof
  - reforge/src/script-runner-core.ts → existing-proof
- C02（existing-proof / existing-proof）
  - reforge/src/script-host-adapter.ts → existing-proof
  - reforge/src/script-world.ts → existing-proof
- C03（existing-proof / existing-proof）
  - reforge/src/script-project-core.ts → existing-proof
  - reforge/src/runtime-script-project.ts → existing-proof
- C04（两源均新增）
  - reforge/src/script-chunk-store.ts → 新增测试（script-chunk-store.glm-large-wave.test.ts）
  - reforge/src/dialog/dialog-box.ts → 新增测试（dialog-box.glm-large-wave.test.ts）
- C05（existing-proof / existing-proof）
  - reforge/src/dither-transition.ts → existing-proof
  - reforge/src/frame-animation-player.ts → existing-proof
- C06（existing-proof / existing-proof）
  - reforge/src/entity-action-player.ts → existing-proof
  - reforge/src/world-motion-runtime.ts → existing-proof

## D 批（迁移纯映射与诊断）

- D01（existing-proof / existing-proof）
  - migrate/src/translate-events.ts → existing-proof
  - migrate/src/translate-enemy-hook-flow.ts → existing-proof
- D02（existing-proof / 新增测试）
  - migrate/src/pal-sprite-action-census.ts → existing-proof
  - migrate/src/sound-reference-audit.ts → 新增测试（sound-reference-audit.glm-large-wave.test.ts）
- D03（existing-proof / existing-proof）
  - migrate/src/script-library-audit.ts → existing-proof
  - migrate/src/script-graph.ts → existing-proof
- D04（existing-proof / existing-proof）
  - migrate/src/migration-merge.ts → existing-proof
  - migrate/src/migration-plan.ts → existing-proof
- D05（existing-proof / existing-proof）
  - migrate/src/pal-authored-overlays.ts → existing-proof
  - migrate/src/scene-entry-normalize.ts → existing-proof
- D06（existing-proof / 新增测试）
  - migrate/src/migration-transaction.ts → existing-proof
  - migrate/src/pal-migration-io.ts → 新增测试（pal-migration-io.glm-large-wave.test.ts）

## E 批（当前内容校验与项目读取）

- E01（existing-proof / existing-proof）
  - content/src/validate.ts → existing-proof
  - content/src/validate-refs.ts → existing-proof
- E02（existing-proof / existing-proof）
  - content/src/author-script-core.ts → existing-proof
  - content/src/script.ts → existing-proof
- E03（existing-proof / existing-proof）
  - content/src/item.ts → existing-proof
  - content/src/asset.ts → existing-proof
- E04（existing-proof / existing-proof）
  - content/src/actor-condition.ts → existing-proof
  - content/src/validate-runtime.ts → existing-proof
- E05（existing-proof / existing-proof）
  - reforge/src/project-loader.ts → existing-proof
  - reforge/src/save/current-codec.ts → existing-proof
- E06（existing-proof / existing-proof）
  - reforge/src/file-source.ts → existing-proof
  - reforge/src/fsa-source.ts → existing-proof

## 可复建的局部 coverage 对照配置

供 Codex 在 main 并集上复建「新增文件定向 + 相邻」对照。不改动任何官方配置/基线：

```bash
# 1) 新增测试文件全集（隔离分支上的 17 个文件；并集后按 main 实际存在者为准）
NEW_TESTS=$(git diff --name-only <merge-base>..HEAD -- 'packages/*/src/**.glm-large-wave.test.*')

# 2) 相关包定向运行（不并行、不做官方门）
pnpm --filter @type-pal/editor   exec vitest run --no-file-parallelism $EDITOR_FILES
pnpm --filter @type-pal/reforge  exec vitest run --no-file-parallelism $REFORGE_FILES
pnpm --filter @type-pal/migrate  exec vitest run --no-file-parallelism $MIGRATE_FILES
pnpm --filter @type-pal/content  exec vitest run --no-file-parallelism $CONTENT_FILES

# 3) 局部 coverage 对照（仅新增测试文件作为入口；不写官方基线）
pnpm --filter @type-pal/editor  exec vitest run --coverage --no-file-parallelism \
  src/ui/command-form-*.glm-large-wave.test.* src/ui/DataMode.glm-large-wave.test.tsx \
  src/ui/SharedScriptTab.glm-large-wave.test.tsx src/ui/SceneScriptWorkspace.glm-large-wave.test.tsx \
  src/ui/AmbienceTab.glm-large-wave.test.tsx src/ui/StampLibraryTab.glm-large-wave.test.tsx \
  src/ui/SpriteUploadWizard.glm-large-wave.test.tsx src/ui/EnemyAnimPreview.glm-large-wave.test.tsx \
  src/ui/FireEffectPreview.glm-large-wave.test.tsx src/ui/use-editor-project-session.glm-large-wave.test.tsx
pnpm --filter @type-pal/reforge exec vitest run --coverage --no-file-parallelism \
  src/script-chunk-store.glm-large-wave.test.ts src/dialog/dialog-box.glm-large-wave.test.ts
pnpm --filter @type-pal/migrate exec vitest run --coverage --no-file-parallelism \
  src/sound-reference-audit.glm-large-wave.test.ts src/pal-migration-io.glm-large-wave.test.ts
```

- 判读口径：只比较 60 个冻结源在「并集前/后」的语句/分支未命中臂变化，不与官方 fast 基线
  （10,380 项/730 文件/77.42%）相加或互换；各批回执中的旧测去重结论是可达性依据。
- 基线锚：生产冻结 `9c35748a`、fast 基线 SHA256 `a682d4e1…`（见 targets.json）。
