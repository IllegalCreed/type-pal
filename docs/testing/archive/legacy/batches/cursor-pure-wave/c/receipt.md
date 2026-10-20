# C 包四行账 — editor core

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-CURSOR-PURE-WAVE-1 C 包（editor core）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致）。

## Scope

- C01 collectItemReferences+collectCanonicalItemTaggedReferences **新增**（buildBlankProject→loader→assertProjectSaveValid；onEnter loop+hasItem(target-herb) sibling 物品并存：保存门后 loop hasItem 读引用完整 sibling 不入表；仅 target-herb read/…body[0].cond；反控 c01-loop-has-item branch||loop→只认 branch）；C02 collectBattleDataReferences(state,'skill') **新增**（battleTrialProjectFiles 后 trial-sword 追加 grantSkill(trial-spark) 再 loader/保存门：trial-sword grantSkill 指向 trial-spark trial-herb 无授予边；仅 items[1].equip.effects[1].skillId；反控 c02-grant-skill kind!==→恒跳过）；C03 editorAssetCatalogTitle/collectEditorAssetDiagnostics existing-proof（标题/origin 已证；空白项目 unused-asset 会破 empty-closure 不建新文件）；C04 stampVisualOwner/stampCollisionOwner existing-proof（公开 owner 已由地图组证明）。

## Execution and assertions

- 合法输入与调用：C01 blank 工程经 loader/保存门后读取 loop 中 hasItem 引用；C02 battleTrial 工程的 trial-sword grantSkill(trial-spark) 经 loader/保存门后收集授予边。业务对照为目标引用与精确路径、sibling 无伪边；C03/C04 existing-proof。
- 原命令回执：- 命令 / 定向 editor 两文件 2/2 exit0 / 反控 c01/c02 单针独立跑各 ok hash 未变 / typecheck exit0+Biome（fixtures+两测试+mutants 工具）0/0/0 / —。这些是原时点执行结果，不作为合法输入或 caller。

## Results

- C 包四行账按 Codex 首轮接收 R1-R3 改写后交付：定向 editor 两文件 2/2、反控 c01/c02 针独立跑各恰一红、typecheck exit0、改动文件 Biome 0/0/0；C03/C04 记 existing-proof。

## Evidence

- 证据路径：本回执正文（quote 保全）；c-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| C 包四行账 r1 | 原文时点 | 四行账（C01/C02 新轴+C03/C04 existing-proof）交付 | 按 Codex 首轮接收 R1-R3 改写后交复核 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 TEST-CURSOR-PURE-WAVE-1 C 包（editor core）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致）。 本节仅描述固定原源及其候选时点。

## 原始结论

C 包四行账：C01 loop hasItem sibling 不入表、C02 grantSkill 授予边；C03/C04 existing-proof；c01/c02 单针独立跑。以上是原卡时点陈述，本页未复跑。

## 当时证据

- 证据路径：本回执正文（quote 保全）；c-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。C 包四行账：C01 loop hasItem sibling 不入表、C02 grantSkill 授予边；C03/C04 existing-proof；c01/c02 单针独立跑是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-CURSOR-PURE-WAVE-1 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `08b655d3d4ef463478148f1c0be2e052f1aa477df4e7db4b23cdfb2cf2e8184f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # C 包四行账 — editor core
>
> 作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。
>
> | ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
> |---|---|---|---|---|---|---|
> | C01 | `collectItemReferences` + `collectCanonicalItemTaggedReferences` | `buildBlankProject` → loader → `assertProjectSaveValid`；onEnter `loop` + `hasItem(target-herb)`，sibling 物品并存 | `敌人战后分支递归扫描物品条件与两臂物品写入`（branch）；`canonical 连续流程条件参与删除守卫…`（状态机 branch） | 新增 `保存门后 loop hasItem 读引用完整，sibling 物品不入表` | 仅 target-herb read/`…body[0].cond`；sibling 不入表；输入不变 | `c01-loop-has-item`：`branch \|\| loop` → 只认 `branch` |
> | C02 | `collectBattleDataReferences(state, 'skill')` | `battleTrialProjectFiles` 后 trial-sword 追加 `grantSkill(trial-spark)`，再 loader / 保存门 | `collects every typed skill owner without guessing ordinary string fields`（items=[]，无 grantSkill） | 新增 `保存门后 trial-sword grantSkill 指向 trial-spark，trial-herb 无授予边` | 仅 `items[1](trial-sword).equip.effects[1].skillId`；herb 无授予边 | `c02-grant-skill`：`kind !== 'grantSkill'` → 恒跳过 |
> | C03 | `editorAssetCatalogTitle` / `collectEditorAssetDiagnostics` | 旧测手工 catalog + origin | `目录标题对空白标签使用唯一 AssetKind 中文 owner，且不接收 AssetId 回退`；`保留机器 code/where，并用结构化资源字段生成不重复的中文标题` | existing-proof：标题/origin 已证。空白项目 unused-asset 会破 empty-closure，不建新文件 | — | 本包不占用负控名额 |
> | C04 | `stampVisualOwner` / `stampCollisionOwner` | 地图组已证合法放置图 | `stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined`；`inheritStampPlacementIndex 在普通 paint 后公开 owner 不变…` | existing-proof：公开 owner 已由地图组证明，无独立增益 | — | 本包不占用负控名额 |
>
> ## 命令
>
> - 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/core/item-references.cursor-boundaries.test.ts src/core/battle-data-references.cursor-boundaries.test.ts` → 2 files / 2 tests，exit 0
> - 反控：`env -u NODE_COMPILE_CACHE node docs/testing/archive/legacy/batches/cursor-pure-wave/tools/module-mutants.mjs c01` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-07Ys6o`，`ok`，hash 未变
> - 反控：`env -u NODE_COMPILE_CACHE node docs/testing/archive/legacy/batches/cursor-pure-wave/tools/module-mutants.mjs c02` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-hEePU7`，`ok`，hash 未变
> - typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec tsc --noEmit -p tsconfig.json` → exit 0
> - Biome：`pnpm exec biome check packages/editor/src/core/__tests__/cursor-pure-fixtures.ts packages/editor/src/core/item-references.cursor-boundaries.test.ts packages/editor/src/core/battle-data-references.cursor-boundaries.test.ts docs/testing/archive/legacy/batches/cursor-pure-wave/tools/module-mutants.mjs` → 0 error/warning/info
>
<!-- original-source-quote:end -->
