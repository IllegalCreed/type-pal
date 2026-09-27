# B 包四行账 — reforge

作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。

| ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
|---|---|---|---|---|---|---|
| B01 | `buildDitherPalettePlan` / `DitherTransitionController` | 旧测已用小缓冲与显式 previous frame | `旧文字的亮度轮廓进入新场景色系…`；`4× 点阵网格按逻辑像素整块使用同一级别`；`独立站点走命令内 snapshot；cancel 清状态并以 AbortError 收敛 Promise` | existing-proof：相位/网格/控制器/cancel 已证；无独立增益不建新文件 | — | 本包不占用负控名额 |
| B02 | `waveOffsets` / `wavePhase` / `shakeOffsetY` | 旧测 amp/相位/时间表 | `waveOffsets 偏移表(scene.c:404-417 递推 oracle,amp=128)`；`wavePhase:40ms 一拍,32 相位循环…`；`shakeOffsetY:活跃期 40ms 拍奇偶交替 ±level,过期/空 = 0` | existing-proof：确定性表与过期零偏已证；不以截图代状态 | — | 本包不占用负控名额 |
| B03 | `projectMapTilesInView` | `buildBlankProjectMap` + 正式图层/涂色；隐藏 `floor` | `图层稳定 id 支持增、移、改、删`；`碰撞写入不触碰视觉层`（不测 hiddenLayerIds） | 新增 `隐藏层不进入 tilesInView，同格可见层完整保留 layerId/tileset/height` | 仅 objects tile=2 height=3；floor tile 仍 1 但不入 draws；输入不变 | `b03-hidden-layer-view`：`if (hiddenLayerIds.has(layer.id))` → `if (false)` |
| B04 | `ScriptChunkStore.resolve` | 内存 FileSource；`shared/c00` 真实 body，`c01` unused sibling | `同一 chunk 并发加载只登记一次缓存字节，lease 分别释放`（并发 lease，非二次命中 reads=1） | 新增 `二次 resolve 命中缓存：reads 仍为 1，body/ref 完整且 unused sibling chunk 未读` | 二次 reads 仍 1；stats.chunks=1；c01 未读 | `b04-chunk-cache-hit`：`if (hit)` → `if (false)` |

## 命令

- 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/project-map.cursor-boundaries.test.ts src/script-chunk-store.cursor-boundaries.test.ts` → 2 files / 2 tests，exit 0
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs b03` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-EJgROl`，`ok`，hash 未变
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs b04` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-fqabkd`，`ok`，hash 未变
- typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec tsc --noEmit -p tsconfig.json` → exit 0
- Biome：`pnpm exec biome check packages/reforge/src/cursor-pure-fixtures.ts packages/reforge/src/project-map.cursor-boundaries.test.ts packages/reforge/src/script-chunk-store.cursor-boundaries.test.ts docs/testing/cursor-pure-wave/tools/module-mutants.mjs` → 0 error/warning/info
