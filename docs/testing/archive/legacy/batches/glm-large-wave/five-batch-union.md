# TEST-GLM-LARGE-WAVE-4 · 五批并集去重清单与局部 coverage 对照配置

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-LARGE-WAVE-4 五批并集去重清单与局部 coverage 对照配置（交 Codex 独立验收与统一覆盖率门；GLM 未运行官方 ratchet/strict-fast 正式收益以 main 并集计；R2 更正：新增源计 17、existing-proof 计 43——r1 回执「20/40」是按组重复计数口径错误）。

## Scope

- 并集总览：冻结 60 生产源（targets.json）与本轮之前 Kimi/三条 GLM 队列零交集（verify-targets 只读校验通过）；新增 17 源（A 12+B 1+C 2+D 2）每源一个同目录同扩展名 .glm-large-wave.test.ts(x)；existing-proof 43 源；隔离宿主/工具（非测试）：browser-host A/B/C 三条+needle-judge R2+selftest。

## Execution and assertions

- A 批 12 源新增（A01 command-form-control/world、A02 dialogue/actor、A03 DataMode/SharedScriptTab、A04 SceneScriptWorkspace/AmbienceTab、A05 StampLibraryTab/SpriteUploadWizard、A06 EnemyAnimPreview/FireEffectPreview）；B 批 B04 hook 新增（B01-B03/B05/B06 11 源 existing-proof）；C 批 C04 两源新增（其余 10 existing-proof）；D 批 D02/D06 两源新增（其余 10）；E 批 12 源全 existing-proof。

## Results

- 可复建 coverage 对照（不改官方配置/基线）：新增文件全集 git diff --name-only；三包定向 vitest run --no-file-parallelism（命令块在 quote）。

## Evidence

- [targets.json](targets.json)冻结 60 源；本回执逐源 disposition 和局部对照命令说明 17 新增/43 existing-proof，官方并集收益留给原集成门，当前未复跑。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 五批并集清单 r2 | 原文时点 | 60 冻结源与既往零交集；17 新增/43 existing-proof（更正 r1 按组双计 20/40） | 交 Codex 验收与统一覆盖率门 | r1 口径错误 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 TEST-GLM-LARGE-WAVE-4 五批并集去重清单与局部 coverage 对照配置（交 Codex 独立验收与统一覆盖率门；GLM 未运行官方 ratchet/strict-fast 正式收益以 main 并集计；R2 更正：新增源计 17、existing-proof 计 43——r1 回执「20/40」是按组重复计数口径错误）。 本节仅描述固定原源及其候选时点。

## 原始结论

五批并集 60 冻结源与既往零交集；17 新增/43 existing-proof（r1 的 20/40 系按组双计 R2 已更正）。以上是原卡时点陈述，本页未复跑。

## 当时证据

- [targets.json](targets.json)冻结 60 源；本回执逐源 disposition 和局部对照命令说明 17 新增/43 existing-proof，官方并集收益留给原集成门，当前未复跑。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。五批并集 60 冻结源与既往零交集；17 新增/43 existing-proof（r1 的 20/40 系按组双计 R2 已更正）是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-GLM-LARGE-WAVE-4 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `0e761a58ad009e1b1840c755d2df93327b629d8f2d0ddd8189b280319551b511`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # TEST-GLM-LARGE-WAVE-4 · 五批并集去重清单与局部 coverage 对照配置
>
> > 交 Codex 用于独立验收与统一覆盖率门。GLM 未运行官方 ratchet/strict-fast；
> > 正式收益以 main 并集计，本清单是去重索引，不是覆盖率主张。
> > R2（返工）更正：新增测试的**源**计 17 个（17 个同扩展名 `.glm-large-wave.test.ts(x)` 文件
> > 一一对应），existing-proof 计 43 个；r1 回执中的「20/40」是按组重复计数的口径错误。
>
> ## 并集总览
>
> - 冻结 60 个生产源（[targets.json](targets.json)），与本轮之前 Kimi/三条 GLM 队列零交集（verify-targets.mjs 只读校验通过）。
> - **新增测试：17 个源**（A 批 12 + B 批 1 + C 批 2 + D 批 2），每个源一个同目录同扩展名
>   `.glm-large-wave.test.ts(x)`，与冻结清单的 newTestRule 一致。
> - **existing-proof：43 个源**，经旧测精确断言去重后判定已证（逐组依据见各批回执）。
> - 隔离宿主/工具（非测试）：`browser-host/`（A/B/C 三条功能视觉）、`needle-judge.mjs`
>   （R2 严格判据）与 `needle-judge.selftest.mjs`（可复跑反例套件）。
>
> ## A 批（编辑器命令表单与作者工作区）
>
> - A01
>   - editor/src/ui/command-form-control.tsx → 新增测试（command-form-control.glm-large-wave.test.tsx）
>   - editor/src/ui/command-form-world.tsx → 新增测试（command-form-world.glm-large-wave.test.tsx）
> - A02
>   - editor/src/ui/command-form-dialogue.tsx → 新增测试（command-form-dialogue.glm-large-wave.test.tsx）
>   - editor/src/ui/command-form-actor.tsx → 新增测试（command-form-actor.glm-large-wave.test.tsx）
> - A03
>   - editor/src/ui/DataMode.tsx → 新增测试（DataMode.glm-large-wave.test.tsx）
>   - editor/src/ui/SharedScriptTab.tsx → 新增测试（SharedScriptTab.glm-large-wave.test.tsx）
> - A04
>   - editor/src/ui/SceneScriptWorkspace.tsx → 新增测试（SceneScriptWorkspace.glm-large-wave.test.tsx）
>   - editor/src/ui/AmbienceTab.tsx → 新增测试（AmbienceTab.glm-large-wave.test.tsx）
> - A05
>   - editor/src/ui/StampLibraryTab.tsx → 新增测试（StampLibraryTab.glm-large-wave.test.tsx）
>   - editor/src/ui/SpriteUploadWizard.tsx → 新增测试（SpriteUploadWizard.glm-large-wave.test.tsx）
> - A06
>   - editor/src/ui/EnemyAnimPreview.tsx → 新增测试（EnemyAnimPreview.glm-large-wave.test.tsx）
>   - editor/src/ui/FireEffectPreview.tsx → 新增测试（FireEffectPreview.glm-large-wave.test.tsx）
>
> ## B 批（编辑器会话、索引与派生状态）
>
> - B01
>   - editor/src/core/script-editor.ts → existing-proof
>   - editor/src/ui/ScriptTree.tsx → existing-proof
> - B02
>   - editor/src/core/project-reference.ts → existing-proof
>   - editor/src/core/project-reference-adapters.ts → existing-proof
> - B03
>   - editor/src/core/edit-session.ts → existing-proof
>   - editor/src/core/editor-derived-store.ts → existing-proof
> - B04
>   - editor/src/ui/use-editor-project-session.ts → 新增测试（use-editor-project-session.glm-large-wave.test.ts）
>   - editor/src/core/project-io.ts → existing-proof
> - B05
>   - editor/src/core/author-save-journal.ts → existing-proof
>   - editor/src/core/project-diagnostics.ts → existing-proof
> - B06
>   - editor/src/core/playback.ts → existing-proof
>   - editor/src/core/tileset-references.ts → existing-proof
>
> ## C 批（Reforge 脚本与演出助手）
>
> - C01
>   - reforge/src/script-runner.ts → existing-proof
>   - reforge/src/script-runner-core.ts → existing-proof
> - C02
>   - reforge/src/script-host-adapter.ts → existing-proof
>   - reforge/src/script-world.ts → existing-proof
> - C03
>   - reforge/src/script-project-core.ts → existing-proof
>   - reforge/src/runtime-script-project.ts → existing-proof
> - C04
>   - reforge/src/script-chunk-store.ts → 新增测试（script-chunk-store.glm-large-wave.test.ts）
>   - reforge/src/dialog/dialog-box.ts → 新增测试（dialog-box.glm-large-wave.test.ts）
> - C05
>   - reforge/src/dither-transition.ts → existing-proof
>   - reforge/src/frame-animation-player.ts → existing-proof
> - C06
>   - reforge/src/entity-action-player.ts → existing-proof
>   - reforge/src/world-motion-runtime.ts → existing-proof
>
> ## D 批（迁移纯映射与诊断）
>
> - D01
>   - migrate/src/translate-events.ts → existing-proof
>   - migrate/src/translate-enemy-hook-flow.ts → existing-proof
> - D02
>   - migrate/src/pal-sprite-action-census.ts → existing-proof
>   - migrate/src/sound-reference-audit.ts → 新增测试（sound-reference-audit.glm-large-wave.test.ts）
> - D03
>   - migrate/src/script-library-audit.ts → existing-proof
>   - migrate/src/script-graph.ts → existing-proof
> - D04
>   - migrate/src/migration-merge.ts → existing-proof
>   - migrate/src/migration-plan.ts → existing-proof
> - D05
>   - migrate/src/pal-authored-overlays.ts → existing-proof
>   - migrate/src/scene-entry-normalize.ts → existing-proof
> - D06
>   - migrate/src/migration-transaction.ts → existing-proof
>   - migrate/src/pal-migration-io.ts → 新增测试（pal-migration-io.glm-large-wave.test.ts）
>
> ## E 批（当前内容校验与项目读取）
>
> - E01
>   - content/src/validate.ts → existing-proof
>   - content/src/validate-refs.ts → existing-proof
> - E02
>   - content/src/author-script-core.ts → existing-proof
>   - content/src/script.ts → existing-proof
> - E03
>   - content/src/item.ts → existing-proof
>   - content/src/asset.ts → existing-proof
> - E04
>   - content/src/actor-condition.ts → existing-proof
>   - content/src/validate-runtime.ts → existing-proof
> - E05
>   - reforge/src/project-loader.ts → existing-proof
>   - reforge/src/save/current-codec.ts → existing-proof
> - E06
>   - reforge/src/file-source.ts → existing-proof
>   - reforge/src/fsa-source.ts → existing-proof
>
> 合计：17 个源新增测试，43 个源 existing-proof。
> ## 可复建的局部 coverage 对照配置
>
> 供 Codex 在 main 并集上复建「新增文件定向 + 相邻」对照。不改动任何官方配置/基线：
>
> ```bash
> # 1) 新增测试文件全集（隔离分支上的 17 个文件；并集后按 main 实际存在者为准）
> NEW_TESTS=$(git diff --name-only <merge-base>..HEAD -- 'packages/*/src/**.glm-large-wave.test.*')
>
> # 2) 相关包定向运行（不并行、不做官方门）
> pnpm --filter @type-pal/editor   exec vitest run --no-file-parallelism $EDITOR_FILES
> pnpm --filter @type-pal/reforge  exec vitest run --no-file-parallelism $REFORGE_FILES
> pnpm --filter @type-pal/migrate  exec vitest run --no-file-parallelism $MIGRATE_FILES
> pnpm --filter @type-pal/content  exec vitest run --no-file-parallelism $CONTENT_FILES
>
> # 3) 局部 coverage 对照（仅新增测试文件作为入口；不写官方基线）
> pnpm --filter @type-pal/editor  exec vitest run --coverage --no-file-parallelism \
>   src/ui/command-form-*.glm-large-wave.test.* src/ui/DataMode.glm-large-wave.test.tsx \
>   src/ui/SharedScriptTab.glm-large-wave.test.tsx src/ui/SceneScriptWorkspace.glm-large-wave.test.tsx \
>   src/ui/AmbienceTab.glm-large-wave.test.tsx src/ui/StampLibraryTab.glm-large-wave.test.tsx \
>   src/ui/SpriteUploadWizard.glm-large-wave.test.tsx src/ui/EnemyAnimPreview.glm-large-wave.test.tsx \
>   src/ui/FireEffectPreview.glm-large-wave.test.tsx src/ui/use-editor-project-session.glm-large-wave.test.ts
> pnpm --filter @type-pal/reforge exec vitest run --coverage --no-file-parallelism \
>   src/script-chunk-store.glm-large-wave.test.ts src/dialog/dialog-box.glm-large-wave.test.ts
> pnpm --filter @type-pal/migrate exec vitest run --coverage --no-file-parallelism \
>   src/sound-reference-audit.glm-large-wave.test.ts src/pal-migration-io.glm-large-wave.test.ts
> ```
>
> - 判读口径：只比较 60 个冻结源在「并集前/后」的语句/分支未命中臂变化，不与官方 fast 基线
>   （10,380 项/730 文件/77.42%）相加或互换；各批回执中的旧测去重结论是可达性依据。
> - 基线锚：生产冻结 `9c35748a`、fast 基线 SHA256 `a682d4e1…`（见 targets.json）。
>
<!-- original-source-quote:end -->
