# C 包四行账 — editor core

作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。

| ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
|---|---|---|---|---|---|---|
| C01 | `collectItemReferences` + `collectCanonicalItemTaggedReferences` | `buildBlankProject` → loader → `assertProjectSaveValid`；onEnter `loop` + `hasItem(target-herb)`，sibling 物品并存 | `敌人战后分支递归扫描物品条件与两臂物品写入`（branch）；`canonical 连续流程条件参与删除守卫…`（状态机 branch） | 新增 `保存门后 loop hasItem 读引用完整，sibling 物品不入表` | 仅 target-herb read/`…body[0].cond`；sibling 不入表；输入不变 | `c01-loop-has-item`：`branch \|\| loop` → 只认 `branch` |
| C02 | `collectBattleDataReferences(state, 'skill')` | `battleTrialProjectFiles` 后 trial-sword 追加 `grantSkill(trial-spark)`，再 loader / 保存门 | `collects every typed skill owner without guessing ordinary string fields`（items=[]，无 grantSkill） | 新增 `保存门后 trial-sword grantSkill 指向 trial-spark，trial-herb 无授予边` | 仅 `items[1](trial-sword).equip.effects[1].skillId`；herb 无授予边 | `c02-grant-skill`：`kind !== 'grantSkill'` → 恒跳过 |
| C03 | `editorAssetCatalogTitle` / `collectEditorAssetDiagnostics` | 旧测手工 catalog + origin | `目录标题对空白标签使用唯一 AssetKind 中文 owner，且不接收 AssetId 回退`；`保留机器 code/where，并用结构化资源字段生成不重复的中文标题` | existing-proof：标题/origin 已证。空白项目 unused-asset 会破 empty-closure，不建新文件 | — | 本包不占用负控名额 |
| C04 | `stampVisualOwner` / `stampCollisionOwner` | 地图组已证合法放置图 | `stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined`；`inheritStampPlacementIndex 在普通 paint 后公开 owner 不变…` | existing-proof：公开 owner 已由地图组证明，无独立增益 | — | 本包不占用负控名额 |

## 命令

- 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/core/item-references.cursor-boundaries.test.ts src/core/battle-data-references.cursor-boundaries.test.ts` → 2 files / 2 tests，exit 0
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs c01` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-07Ys6o`，`ok`，hash 未变
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs c02` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-hEePU7`，`ok`，hash 未变
- typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec tsc --noEmit -p tsconfig.json` → exit 0
- Biome：`pnpm exec biome check packages/editor/src/core/__tests__/cursor-pure-fixtures.ts packages/editor/src/core/item-references.cursor-boundaries.test.ts packages/editor/src/core/battle-data-references.cursor-boundaries.test.ts docs/testing/cursor-pure-wave/tools/module-mutants.mjs` → 0 error/warning/info
