# TEST-CURSOR-MAP-LOGIC-2 — 地图与组合块纯逻辑六组回执

2026-09-27。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-map-logic-r2`、分支 `codex/cursor-map-logic-r2` 上连续补 M1–M6，并按 CM1–CM4 返工。生产冻结 `a95618fc2a9586c77ff42ff253f72fcfba1fa09a`。没有合 main，没有标 done，没有跑官方覆盖率 / ratchet / 严格全仓门。

本批只补六模块公开入口的剩余合同。成功计划用真实 patch / Command 应用后核业务；失败计划钉空 `{visual:[],collision:[]}`。每次调用前独立 `structuredClone`，调用后立即比同一原对象。公开 owner 只走公开查询。相对冻结 `a95618fc` 无产品 diff。作者自验不能替代 Codex 独立验收。

本文件位于专属目录 `docs/testing/cursor-map-logic-r2/`。仓内 `m*-mutant.json` / `evidence.json` 是紧凑摘要。复跑默认只写唯一 `/tmp` 目录。残项 title / 数量来自当次 `vitest --reporter=json`。公开可调用但本批未测的路径不得写成「真不可达」。

EditorState 走 `buildBlankProject` → 正式 loader → `toEditorState`，只核 `validateCurrentManifestStartup`；这是命令/地图层单测，不是作者保存闭包验证。

## 六行总账

| 组 | 模块 | 新测试文件 | 新增项(真实title) | 已有证明(file+title) | 本批未覆盖（公开可调用） | 真不可达 | 代表反控 |
|---|---|---|---|---|---|---|---|
| M1 | stamp-draft | `packages/editor/src/core/stamp-draft.background.test.ts` | `setStampDraftVisual 越界/缺层拒绝；合法高度经 canonicalize 过 validator`；`setStampDraftCollision 越界/负值拒绝；0 值可 canonicalize`；`moveStampDraftSelection：空点同引用；占用目标拒绝；两点重叠平移保双方值`；`resizeStampDraft 同尺寸返回原对象；扩画布保留 heights`；`stampDraftBounds 默认 padding=2；padding=0 精确贴边`；`nextStampLayerSlotId：base 已占用则给 base-2` | `stamp-draft.boundaries.test.ts` · `空 ID/空名/重复 ID/缺层精确拒绝`；同文件 canonicalize Map 缺 tile | collision 通道移动；改锚/改层序其余入口 | 无证明为真不可达 | [m1-mutant.json](m1-mutant.json) |
| M2 | map-selection | `packages/editor/src/core/map-selection.background.test.ts` | `clip-map 精确保留现存 placementId，并丢掉已删层 hidden/locked`；`toggle-hidden/locked 再拨回恢复精确层 id 列表`；`summarizeMapSelection 统计空槽与现存 layerIds，不把悬空层计入`；`selectAllMapContent 给出精确 visualSlots/gridPoints，不是只比长度`；`change-selection 在组内编辑后清掉 stampGroupEditContext` | `map-selection.test.ts` · `placement 复数选区增减与集合切换去重`；同文件 replace/add/subtract | `selectionForGridPoints` 跨层展开；crop/hit 其余组合 | 无证明为真不可达 | [m2-mutant.json](m2-mutant.json) |
| M3 | map-transform | `packages/editor/src/core/map-transform.background.test.ts` | `planMapMove 越界：空 patch、issues 含 out-of-bounds，map/selection 输入不变`；`planMapMove reject 占用普通格：空 patch；overwrite 后真实应用搬走源并写目标`；`planMapDelete 对 stamp-placements：stamp-selection-unsupported，空 patch，组员瓦片不变`；`captureMapClipboard 对 none 与 stamp-placements 都返回 undefined`；`planMapMove include-collision 成功应用：目标碰撞写入，旁对象 (4,3) 瓦片 9 不动`；`planMapPaste 视觉在界、碰撞越界：双通道空 patch，clipboard/map 保真` | `map-transform.boundaries.test.ts` · 占用目标 reject 完整 map/clipboard 快照 | 多层 mapping 粘贴；delete cells 成功路径 | 无证明为真不可达 | [m3-mutant.json](m3-mutant.json) |
| M4 | stamp-group-transform | `packages/editor/src/core/stamp-group-transform.background.test.ts` | `planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 组员与 id 不变`（新轴=失败空 patch）；`planStampGroupMove 两个 id：精确成员/高度/碰撞与未选普通哨兵完整保真`；`planStampGroupDelete 只删列出的 id，另一组员格与通道仍在`（新轴=另一组保真）；`planStampGroupDelete 空列表/缺 id 抛公开错误，map 身份不变` | `stamp-group-transform.test.ts:111` 单组 move 全通道；`:152` copy/repeat/cut 新 id；`:200` 单组 delete 全通道。本批删除与 `:152` 重复的单组 copy | cut 粘贴；多组 paste overwrite | 无证明为真不可达 | [m4-mutant.json](m4-mutant.json) |
| M5 | stamp-placement | `packages/editor/src/core/stamp-placement.background.test.ts` | `合法 draft→canonicalize 后 planStampPlacement 给出完整三通道 patch 并应用`；`PlaceStampCommand 应用后公开查询 owner，旁格仍无归属`；`stampPlacementActualHeight 拒绝负数；planner 坏基准直接抛同一错误`；`nextStampPlacementId 标点 preferred 走 NFKC stem，撞号则 -2` | `stamp-placement.boundaries.test.ts` · 已占 id / 未知 mapping / 锁定层 | 多层 mapping 放置；overwrite 成功路径 | 无证明为真不可达。负基准走 throw 而非 `patch-invalid` | [m5-mutant.json](m5-mutant.json) |
| M6 | stamp-ownership | `packages/editor/src/core/stamp-ownership.background.test.ts` | `stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined`；`inheritStampPlacementIndex 在普通 paint 后公开 owner 不变，并与直接扫描一致`；`seedStampPlacementIndexDelta 缺 upsert id 抛出该 id；不读私有缓存`；`planStampGroupMove 应用后公开查询：旧成员空，目标 tree-a，tree-b 组员仍在` | `stamp-ownership.test.ts` · 大规模 cache 与 delta seed | collision-only 增量；cache 压缩路径 | 无证明为真不可达 | [m6-mutant.json](m6-mutant.json) |

无阻断组。批末 **6** 个代表反控。仓内汇总：[evidence.json](evidence.json)（`count=6`、`allOk=true`、`allHit=true`、全部 `redExit=1`、`hashUnchanged=true`，自测 17 项）。原始 JSON 只在 runner 打印的 `/tmp` 目录。

## 代表反控

`judgeGreen` / `judgeRed` 钉全范围执行数与目标；`isErrorHeader` 对行做 `trimStart`，拒绝空格/tab 缩进后的 `TypeError`/`Error`。`--self-test` 含 `assertion-then-indented-typeerror` 与 `assertion-then-tab-error`。`mergeConfig` + `enforce: 'pre'`、`MUTANT_HIT:<id>`、唯一针、绝对 file+fullName、红侧恰 exit 1、源 hash 前后相同。`env -u NODE_COMPILE_CACHE`。

| id | 针 | 红侧断言 |
|---|---|---|
| `m1-draft-move-oob` | OOB throw → `void 0` | toThrow 文案变成占用成员 |
| `m2-clip-hidden-layer` | hidden 过滤去掉 | `['gone']` 不等于 `[]` |
| `m3-move-empty-patch` | 失败空 patch → 原 `patch` | 非空 patch 深等失败 |
| `m4-group-empty-patch` | 组失败空 patch → 原 `patch` | 同上 |
| `m5-actual-height` | `base+relative` → 只回 `base` | 完整 patch height 3 失败 |
| `m6-visual-owner` | `stampVisualOwner` 查表 → `undefined` | 期望 `'tree-a'`。此针证明公开查询，不证明 inherit 缓存必须红 |

## 验证

作者自验，不能替代 Codex 独立接收。Status 保持 rework。产品相对 `a95618fc` 空 diff。

- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动 Biome：7 个 TS + runner 0 error。
- `git diff --check` 干净。
- `node scripts/docs/check.mjs`：见提交前复跑。
- 负控 `--self-test` 17 项通过；六针 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-map-logic-r2-mutants-3MeMEO`：`count=6`、`allOk=true`、`allHit=true`。
- 定向+相邻 `/tmp/cursor-map-logic-r2-directed-1790448950.json`：17 files / **104** tests。背景 **6 files / 29 tests**（M4 由 5 减到 4）；相邻 11/75。
- 全 editor `/tmp/cursor-map-logic-r2-editor-1790448958.json`：**359 files / 3048 tests** `success=true`。PAL 资产仍用 gitignored 符号链接，不入 Git。
- 未跑官方 coverage / ratchet / 受保护 strict / 全仓 check。未开浏览器，6010 未动。

任务卡：[TEST-CURSOR-MAP-LOGIC-2](../../ops/tasks/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md)。
