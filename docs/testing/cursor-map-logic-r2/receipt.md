# TEST-CURSOR-MAP-LOGIC-2 — 地图与组合块纯逻辑六组回执

2026-09-27。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-map-logic-r2`、分支 `codex/cursor-map-logic-r2` 上连续补 M1–M6。生产冻结 `a95618fc2a9586c77ff42ff253f72fcfba1fa09a`；准入/开工祖先 `7de01ea6`（当时 `origin/main`）。没有合 main，没有标 done，没有跑官方覆盖率 / ratchet / 严格全仓门。

本批只补六模块公开入口的剩余合同：合法 `buildBlankProjectMap` / 实际 paint / 组合公开函数，适用 `validateProjectMap` / `validateStampTemplates` 先过。成功计划用 `prepareProjectMapPatch`+`applyPreparedProjectMapPatch` 或正式 Command 应用后核业务；失败计划钉空 `{visual:[],collision:[]}` 与输入保真。公开 owner 只走 `stampVisualOwner` / `stampCollisionOwner` / `directStampPlacementOwners`，不反射 WeakMap。相对冻结 `a95618fc` 无产品 diff。作者自验不能替代 Codex 独立验收。

本文件位于专属目录 `docs/testing/cursor-map-logic-r2/`。仓内 `m*-mutant.json` / `evidence.json` 是紧凑摘要，不是原始 green/red JSON 或日志。复跑默认只写唯一 `/tmp` 目录并打印路径，不回写已跟踪摘要；需要更新摘要时从该临时目录显式复制。

残项 title / 数量来自当次 `vitest --reporter=json`（见下方验证段）。公开可调用但本批未测的路径不得写成「真不可达」。

为通过文档导航门，在 `docs/testing/README.md` 增加本目录一条链接；不改 coverage 基线、排除、超时或其它贡献者测试。

## 六行总账

| 组 | 模块 | 新测试文件 | 新增项(真实title) | 已有证明(file+title) | 本批未覆盖（公开可调用） | 真不可达 | 代表反控 |
|---|---|---|---|---|---|---|---|
| M1 | stamp-draft | `packages/editor/src/core/stamp-draft.background.test.ts` | `setStampDraftVisual 越界/缺层拒绝；合法高度经 canonicalize 过 validator`；`setStampDraftCollision 越界/负值拒绝；0 值可 canonicalize`；`moveStampDraftSelection：空点同引用；占用目标拒绝；两点对调保双方值`；`resizeStampDraft 同尺寸返回原对象；扩画布保留 heights`；`stampDraftBounds 默认 padding=2；padding=0 精确贴边`；`nextStampLayerSlotId：base 已占用则给 base-2` | `packages/editor/src/core/stamp-draft.boundaries.test.ts` · `空 ID/空名/重复 ID/缺层精确拒绝`；同文件 `canonicalize：Map 式 availableTiles 缺 tile 精确拒绝；合法 draft 通过真 validator` | collision 通道移动；改锚/改层序其余入口；非法高度矩阵的其它守卫 | 无证明为真不可达 | [m1-mutant.json](m1-mutant.json) |
| M2 | map-selection | `packages/editor/src/core/map-selection.background.test.ts` | `clip-map 精确保留现存 placementId，并丢掉已删层 hidden/locked`；`toggle-hidden/locked 再拨回恢复精确层 id 列表`；`summarizeMapSelection 统计空槽与现存 layerIds，不把悬空层计入`；`selectAllMapContent 给出精确 visualSlots/gridPoints，不是只比长度`；`change-selection 在组内编辑后清掉 stampGroupEditContext` | `packages/editor/src/core/map-selection.test.ts` · `placement 复数选区增减与集合切换去重，且与 cells domain 永不混合`；同文件 `replace/add/subtract 分通道去重，减空归 none，且不修改输入` | `selectionForGridPoints` 跨层展开；crop/hit 其余组合；`set-hit-scope` 保留选区 | 无证明为真不可达 | [m2-mutant.json](m2-mutant.json) |
| M3 | map-transform | `packages/editor/src/core/map-transform.background.test.ts` | `planMapMove 越界：空 patch、issues 含 out-of-bounds，map/selection 输入不变`；`planMapMove reject 占用普通格：空 patch；overwrite 后真实应用搬走源并写目标`；`planMapDelete 对 stamp-placements：stamp-selection-unsupported，空 patch，组员瓦片不变`；`captureMapClipboard 对 none 与 stamp-placements 都返回 undefined`；`planMapMove include-collision 成功应用：目标碰撞写入，旁对象 (4,3) 瓦片 9 不动`；`planMapPaste 视觉在界、碰撞越界：双通道空 patch，clipboard/map 保真` | `packages/editor/src/core/map-transform.boundaries.test.ts` · `占用目标 reject：conflicts 精确、canApply=false、patch 双通道全空、完整实际 map/clipboard 不变`；同文件 `混合目标（真实 capture、一有效一无效）：layer-missing 整笔失败，双 patch 全空、完整 issues` | 多层 mapping 粘贴；delete cells 成功路径的更多层组合 | 无证明为真不可达 | [m3-mutant.json](m3-mutant.json) |
| M4 | stamp-group-transform | `packages/editor/src/core/stamp-group-transform.background.test.ts` | `planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 哨兵与 id 不变`；`planStampGroupMove 两个 id：应用后双方 id 稳定，成员一起走，未选普通哨兵不写`；`planStampGroupDelete 只删列出的 id，另一组员格仍在`；`planStampGroupDelete 空列表/缺 id 抛公开错误，map 身份不变`；`planStampGroupPaste copy 应用：源仍属 tree-a，目标由新 id 占用` | `packages/editor/src/core/stamp-group-transform.boundaries.test.ts` · `空列表 / 缺失组 → undefined；重复 id 去重仍捕获一份`；同文件 `真实组捕获：identity 传递、来源字段与视觉/碰撞成员保真、map 实参不变` | cut 粘贴；多组 paste 冲突 overwrite 其余组合 | 无证明为真不可达 | [m4-mutant.json](m4-mutant.json) |
| M5 | stamp-placement | `packages/editor/src/core/stamp-placement.background.test.ts` | `合法 draft→canonicalize 后 planStampPlacement 给出精确三通道 patch`；`PlaceStampCommand 应用后公开查询 owner，旁格仍无归属`；`stampPlacementActualHeight 拒绝负数；planner 坏基准直接抛同一错误`；`nextStampPlacementId 标点 preferred 走 NFKC stem，撞号则 -2` | `packages/editor/src/core/stamp-placement.boundaries.test.ts` · `已占 placementId / 未知 mapping / 重复 mapping / 锁定层：完整 issues、canApply=false、map 不变` | 多层 mapping 放置；overwrite 冲突政策成功路径 | 无证明为真不可达。负基准走 throw 而非 `patch-invalid`，与现行 `stampPlacementActualHeight` 合同一致 | [m5-mutant.json](m5-mutant.json) |
| M6 | stamp-ownership | `packages/editor/src/core/stamp-ownership.background.test.ts` | `stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined`；`inheritStampPlacementIndex 在普通 paint 后公开 owner 不变，并与直接扫描一致`；`seedStampPlacementIndexDelta 缺 upsert id 抛出该 id；不读私有缓存`；`planStampGroupMove 应用后公开查询：旧成员空，目标 tree-a，tree-b 哨兵仍在` | `packages/editor/src/core/stamp-ownership.test.ts` · `3000 groups × 20 members build exact owners once and cached lookup does not rescan authoring`；同文件 `delta seed removes and upserts only affected ownership while ordinary map edits share the index` | 大规模 cache 压缩路径（已有性能套件）；collision-only 成员增量 | 无证明为真不可达 | [m6-mutant.json](m6-mutant.json) |

无阻断组。批末 **6** 个代表反控。仓内紧凑汇总：[evidence.json](evidence.json)（`count=6`、`allOk=true`、`allHit=true`、全部 `redExit=1`、`hashUnchanged=true`）。原始 green/red JSON 与日志只在 runner 打印的 `/tmp` 目录。

## 代表反控

`judgeGreen` / `judgeRed` 钉全范围执行数与目标、拒套件/全局 `file.message`、拒额外失败、逐 message 拒混错与 `timed out`；保留 Vitest 堆栈里的 `runWithTimeout` 函数名。`--self-test` 调用同一组 judge：原拒绝 + 合法绿/红对照 + 混错/`timed out`/额外失败/套件错误拒绝 + `runWithTimeout` 堆栈对照。`mergeConfig` + `enforce: 'pre'`、`MUTANT_HIT:<id>`、唯一针、绝对 file+fullName、红侧恰 exit 1、源 hash 前后相同。Vite 配置落在 `packages/editor/.mutant-<id>-` 后删除。`env -u NODE_COMPILE_CACHE`。

默认输出：唯一 `/tmp/cursor-map-logic-r2-mutants-*`（stderr 打印 `mutant output:`）。不在复跑中改仓内已跟踪 JSON。

| id | 针 | 红侧断言 |
|---|---|---|
| `m1-draft-move-oob` | `throw new Error('移动目标超出组合边界。')` → `void 0` | expected function to throw … `'移动目标超出组合边界。'` but got 占用成员文案 |
| `m2-clip-hidden-layer` | hidden 过滤 → 原列表原样留下 | expected `['gone']` to deeply equal `[]` |
| `m3-move-empty-patch` | 失败空 patch 三元 → 原 `patch` | expected 非空 visual/collision 与 `{ visual: [], collision: [] }` 深等失败 |
| `m4-group-empty-patch` | 组计划失败空 patch 三元 → 原 `patch` | 同上，组移动撞未选中组 |
| `m5-actual-height` | `return baseHeight + relativeHeight` → `return baseHeight` | expected height `{ value: 3 }` |
| `m6-inherit-index` | `stampVisualOwner` 查表 → `return undefined` | expected undefined to be `'tree-a'` |

## 验证

作者自验，不能替代 Codex 独立接收。Status 保持 build。产品相对 `a95618fc` 空 diff。本段计数以本轮新鲜 JSON 为准。

- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动 Biome：7 个 TS + runner `biome check` 0 error。
- `git diff --check` 干净。
- `node scripts/docs/check.mjs`：见提交前复跑（本目录 receipt 写入后应 PASS）。
- 负控 `--self-test` 通过；六针新鲜目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-map-logic-r2-mutants-tH7Xef`：`count=6`、`allOk=true`、`allHit=true`、`allRedExit1=true`、`allHashUnchanged=true`。仓内已跟踪 JSON 由该目录显式复制一次。
- 定向+相邻 JSON `/tmp/cursor-map-logic-r2-directed-1790446847.json`：17 files / **105** tests exit 0。其中背景 **6 files / 30 tests**；相邻 11 files / 75 tests（六模块旧 `.test.ts` / `.boundaries.test.ts`）。
- 全 editor JSON `/tmp/cursor-map-logic-r2-editor-1790447067.json`：**359 files / 3049 tests** `success=true`（`vitest run --passWithNoTests --maxWorkers=2`）。本 worktree 本地依赖 + gitignored 环境内 PAL `projects/pal/assets/{runtime,migrated}` 符号链接，指向既有主仓资产，不入 Git，不改用户工程，不动 6010。首次无链接时 `world-sprite-behavior.pal.test.ts` 两例 ENOENT，链接后同口径转绿。
- 未跑官方 coverage / ratchet / 受保护 strict / 全仓 check。未开浏览器，6010 未动。

## 可复制命令

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-map-logic-r2
git fetch origin
git rev-parse origin/main HEAD
# 生产冻结 a95618fc2a9586c77ff42ff253f72fcfba1fa09a
# 准入 7de01ea6

env -u NODE_COMPILE_CACHE node docs/testing/cursor-map-logic-r2/module-mutants.mjs --self-test

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
  src/core/stamp-draft.background.test.ts \
  src/core/map-selection.background.test.ts \
  src/core/map-transform.background.test.ts \
  src/core/stamp-group-transform.background.test.ts \
  src/core/stamp-placement.background.test.ts \
  src/core/stamp-ownership.background.test.ts \
  src/core/stamp-draft.test.ts \
  src/core/stamp-draft.boundaries.test.ts \
  src/core/map-selection.test.ts \
  src/core/map-selection.boundaries.test.ts \
  src/core/map-transform.test.ts \
  src/core/map-transform.boundaries.test.ts \
  src/core/stamp-group-transform.test.ts \
  src/core/stamp-group-transform.boundaries.test.ts \
  src/core/stamp-placement.test.ts \
  src/core/stamp-placement.boundaries.test.ts \
  src/core/stamp-ownership.test.ts

env -u NODE_COMPILE_CACHE node docs/testing/cursor-map-logic-r2/module-mutants.mjs
# 摘要写到打印的 /tmp 目录；不回写本目录已跟踪 JSON
# 或单组：node docs/testing/cursor-map-logic-r2/module-mutants.mjs m1

node scripts/docs/check.mjs

git diff --check a95618fc
git diff --stat a95618fc -- packages/editor/src/core/stamp-draft.ts \
  packages/editor/src/core/map-selection.ts \
  packages/editor/src/core/map-transform.ts \
  packages/editor/src/core/stamp-group-transform.ts \
  packages/editor/src/core/stamp-placement.ts \
  packages/editor/src/core/stamp-ownership.ts
```

任务卡：[TEST-CURSOR-MAP-LOGIC-2](../../ops/tasks/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md)。Cursor 自验不是独立证明。Codex 负责隔离接收、全仓 check、官方 ratchet 与受保护严格 fast。
