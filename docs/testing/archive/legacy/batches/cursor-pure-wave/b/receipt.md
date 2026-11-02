# B 包四行账 — reforge

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-CURSOR-PURE-WAVE-1 B 包（reforge）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致；R3 已按首轮接收改写）。

## Scope

- B01 buildDitherPalettePlan/DitherTransitionController 与 B02 waveOffsets/wavePhase/shakeOffsetY 均 existing-proof（相位/网格/控制器/cancel 与确定性表/过期零偏已证不以截图代状态）；B03 projectMapTilesInView **新增**（buildBlankProjectMap+正式图层涂色隐藏 floor：隐藏层不进入 tilesInView 同格可见层完整保留 layerId/tileset/height；仅 objects tile=2 height=3 floor tile 仍 1 但不入 draws 输入不变；反控 b03-hidden-layer-view if(hiddenLayerIds.has)→if(false)）；B04 ScriptChunkStore.resolve **新增**（deriveScriptChunk 得 shared/c01+normalizeScriptLibrary 写真实 bytes+checkScriptLibrary 先过：二次 resolve 命中缓存 reads 仍 1 body/ref 完整 unused sibling 未读 lease 收尾 0；反控 b04-chunk-cache-hit if(hit)→if(false)）。

## Execution and assertions

- 合法输入与调用：B03 blank 地图正式图层数据仅隐藏 floor，projectMapTilesInView 仍保留同格可见层；B04 deriveScriptChunk/normalizeScriptLibrary 生成并通过 checkScriptLibrary 的真实 bytes 交 ScriptChunkStore.resolve。业务对照为可见层保真、二次读取仍 1、旁分片零读和 lease 收尾 0。
- 原命令回执：- 命令（R1-R3 后） / 定向 reforge 两文件 2/2 exit0 / 反控与 A 同一次六针 / typecheck exit0+Biome 0/0/0 / —。这些是原时点执行结果，不作为合法输入或 caller。

## Results

- B 包四行账按 Codex 首轮接收 R1-R3 改写后交付：定向 reforge 两文件 2/2、反控 b03/b04 针各恰一红、typecheck exit0、改动文件 Biome 0/0/0；B01/B02 记 existing-proof 不重复交付。

## Evidence

- 证据路径：本回执正文（quote 保全）；b-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| B 包四行账 r1 | 原文时点 | 四行账（B03/B04 新轴+B01/B02 existing-proof）交付 | 按 Codex 首轮接收 R1-R3 改写后交复核 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 TEST-CURSOR-PURE-WAVE-1 B 包（reforge）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致；R3 已按首轮接收改写）。 本节仅描述固定原源及其候选时点。

## 原始结论

B 包四行账：B01/B02 existing-proof；B03 隐藏层不入 tilesInView+同格可见层保真、B04 二次 resolve 缓存 reads 仍 1 旁分片零读；b03/b04 针。以上是原卡时点陈述，本页未复跑。

## 当时证据

- 证据路径：本回执正文（quote 保全）；b-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。B 包四行账：B01/B02 existing-proof；B03 隐藏层不入 tilesInView+同格可见层保真、B04 二次 resolve 缓存 reads 仍 1 旁分片零读；b03/b04 针是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-CURSOR-PURE-WAVE-1 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `80eb106f2378125237ed17167426bc6cbbac14313fad16192e6876572c37ef03`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # B 包四行账 — reforge
>
> 作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。R3 已按首轮接收改写。
>
> | ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
> |---|---|---|---|---|---|---|
> | B01 | `buildDitherPalettePlan` / `DitherTransitionController` | 旧测已用小缓冲与显式 previous frame | `旧文字的亮度轮廓进入新场景色系…`；`4× 点阵网格按逻辑像素整块使用同一级别`；`独立站点走命令内 snapshot；cancel 清状态并以 AbortError 收敛 Promise` | existing-proof：相位/网格/控制器/cancel 已证；无独立增益不建新文件 | — | 本包不占用负控名额 |
> | B02 | `waveOffsets` / `wavePhase` / `shakeOffsetY` | 旧测 amp/相位/时间表 | `waveOffsets 偏移表(scene.c:404-417 递推 oracle,amp=128)`；`wavePhase:40ms 一拍,32 相位循环…`；`shakeOffsetY:活跃期 40ms 拍奇偶交替 ±level,过期/空 = 0` | existing-proof：确定性表与过期零偏已证；不以截图代状态 | — | 本包不占用负控名额 |
> | B03 | `projectMapTilesInView` | `buildBlankProjectMap` + 正式图层/涂色；隐藏 `floor` | `图层稳定 id 支持增、移、改、删`；`碰撞写入不触碰视觉层`（不测 hiddenLayerIds） | 新增 `隐藏层不进入 tilesInView，同格可见层完整保留 layerId/tileset/height` | 仅 objects tile=2 height=3；floor tile 仍 1 但不入 draws；输入不变 | `b03-hidden-layer-view`：`if (hiddenLayerIds.has(layer.id))` → `if (false)` |
> | B04 | `ScriptChunkStore.resolve` | `deriveScriptChunk` 得 `shared/c01`；`normalizeScriptLibrary` 写真实 bytes；`checkScriptLibrary` 先过 | `同一 chunk 并发加载只登记一次缓存字节，lease 分别释放`（并发 lease，非二次命中 reads=1） | 新增 `二次 resolve 命中缓存：reads 仍为 1，body/ref 完整且 unused sibling chunk 未读` | 二次 reads 仍 1；`stats.bytes` = 派生分片真实 bytes；旁分片未读；lease 收尾 0 | `b04-chunk-cache-hit`：`if (hit)` → `if (false)` |
>
> ## 命令（R1–R3 后）
>
> - 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/project-map.cursor-boundaries.test.ts src/script-chunk-store.cursor-boundaries.test.ts` → 2 files / 2 tests，exit 0
> - 反控：与 A 同一次六针跑，证据 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-PmDfNF`
> - typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec tsc --noEmit -p tsconfig.json` → exit 0
> - Biome：改动文件 0 error/warning/info
>
<!-- original-source-quote:end -->
