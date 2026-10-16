# C 包四行账 — editor core

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab；本轮 R72。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- C 包四行账 — editor core：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `08b655d3d4ef463478148f1c0be2e052f1aa477df4e7db4b23cdfb2cf2e8184f`；下方 quote 可逆回原始 UTF-8 字节。
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
