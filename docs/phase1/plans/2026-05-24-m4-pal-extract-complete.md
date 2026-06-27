# M4 · pal-extract 补全 + 资产分层 + 全 295 scene + 字体真渲染 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks tagged **Parallel with:** can be dispatched concurrently via `superpowers:dispatching-parallel-agents`.

**Goal:** M4 完成后,(1) `data/extracted/` 按 `battle/world/item/ui/splash/magic` 分层;(2) 14 个 MKF 全 chunk 覆盖;(3) 全 295 scene 资源 dump + dev panel 可跳任意 scene 真渲染;(4) Unifont 真字形渲染,所有 UI 文字可读。

**Architecture:** 沿 02 四层 + M1-M3.5 既有架构。**P1 路径重构** 锁目录契约;**P2 全 chunk** 走 D26/D28 渐进具名 + schema B(已知 typed / 未知 raw + TODO);**P3 全 295 scene** 扩 SceneAssets (eventCommands+labelMap) + setPalette typed handler + dev picker 扩 295 + sdlpal `--dump-map` 全 295 diff 自动化;**P4 字体** Unifont CN BDF → JSON 预处理 + present/font.ts 重写 + L2 baseline 全部重生。**M3.5 ⚠️ 残留 3 项** 顺手修(P3 T1/T2 + P4 T4)。

**Tech Stack:** TypeScript(`NodeNext` + `strict`)/ Vite / Vitest(L1)/ Playwright + pixelmatch(L2)/ pnpm workspace。数据规格 = `reference/sdlpal/` C 源码(`global.c::PAL_LoadDefaultGame` + 各 chunk parser)+ M1-M3.5 既有 parser。字体 = GNU Unifont CN 16×16 BDF(OFL,D11)。子进程调用 **统一用 `execFileSync`/`execFile`**(不用 `exec`/`execSync` 防注入)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

**Design 溯源:** `docs/plans/2026-05-24-m4-pal-extract-complete-design.md`(commit `e053812`)

---

## 全局不变量

- 不开 branch,直接 commit main(memory: solo)
- README / 公开文件 / commit message / 源码注释 **不写原游戏名**(版权)
- commit message **不带** Claude / Co-Author trailer(memory)
- 不要 amend 既有 commit(memory)
- L2 baseline PNG **不入 git**(版权,存 `packages/game/e2e/baselines/`,已 `.gitignore`)
- 不破坏既有测试基准:`pnpm -w check` 460+2 skip 至少不退;`pnpm -F @type-pal/game e2e` 30+1 skip 至少不退
- D26 raw skip 兜底:新具名 opcode 严格 disasm/recompile 对偶;未具名 opcode 仍 raw skip
- D29 sdlpal 是规格:新 chunk parser / 新渲染路径必须有 sdlpal 真值对照
- 所有子进程调用使用 `execFileSync` / `execFile`(`exec`/`execSync` 在 hook 拦截 shell injection 风险)

---

## 任务并行关系图

```
P1 资产分层重构
├─ T1 cli.ts writeJson/writeBinary path 改 [独立,先做]
├─ T2 game runtime loader/bootstrap URL 改 [Blocks by T1]
├─ T3 baseline 工具 + test 路径改 [Parallel with T2]
└─ T4 P1 全套 verify (pnpm extract + check + e2e) [Blocks by T1+T2+T3]

P2 全 chunk 覆盖
├─ T1 chunk inventory MD [独立,先做]
├─ T2 DATA.MKF 余下 chunks + enemies/items/spells 字段补漏 [Blocks by T1]
├─ T3 STUFF.MKF 全抽 + 字模 verify [Blocks by T1, Parallel with T2/T4/T5]
├─ T4 SAVE/RNG/RGM/BALL/FIRE/misc MKF + splash [Blocks by T1, Parallel with T2/T3/T5]
└─ T5 SOUNDS.MKF metadata [Blocks by T1, Parallel with T2/T3/T4]

P3 全 295 scene 资源 dump
├─ T1 SceneAssets 扩 eventCommands+labelMap + lazy load [独立]
├─ T2 setPalette opcode 真 handler [独立, Parallel with T1]
├─ T3 全 ~120 mapNum tileset dump (cli.ts) [独立, Parallel with T1/T2/T4/T5]
├─ T4 MGO 全量 union dump [独立, Parallel with T1/T2/T3/T5]
├─ T5 全 295 scene-N.json dump [独立, Parallel with T1-T4]
├─ T6 dev panel scene picker 5→295 [Blocks by T5]
├─ T7 sdlpal --dump-map 全 295 自动化 diff [Blocks by T3]
└─ T8 a9 contact→battle 端到端 spec unskip [Blocks by T1]

P4 字体真渲染
├─ T1 STUFF 字模 verify 决策 + Unifont BDF ship [Blocks by P2 T3]
├─ T2 BDF→JSON 预处理脚本 (pal-extract) [Blocks by T1]
├─ T3 present/font.ts 真 glyph blit 重写 [Blocks by T2]
├─ T4 L2 baseline 全部重生 + b* spec 切 sdlpal real baseline [Blocks by T3, Parallel with T5]
└─ T5 dev panel 字体测试入口 [Blocks by T3, Parallel with T4]
```

---

## File Structure(M4 末态)

```
type-pal/
├── data/extracted/
│   ├── data/
│   │   ├── enemies.json / items.json / spells.json / magic.json          # 顶层数据表
│   │   ├── enemy-teams.json / battle-fields.json / enemy-pos.json
│   │   ├── player-roles.json / battle-bgs.json / battle-sprites.json
│   │   ├── [P2 新] level-up-exp.json / level-up-magic.json / 等          # P2 新 chunk JSON
│   │   ├── tilemap/{mapNum}.json                                         # P1 改 + P3 by mapNum
│   │   ├── scene/{sceneId}.json                                          # P1 改;P3 全 295
│   │   ├── sprite/{spriteId}.json                                        # P1 改;P3 union 数千
│   │   ├── battle-sprite/{enemy|player}/{id}.json                        # P1 改
│   │   ├── palette/{paletteId}.json                                      # P1 改
│   │   └── font/glyphs.json                                              # P4 新
│   ├── events/ … (M1 不变)
│   ├── lookup/ … (M1 不变)
│   └── images/
│       ├── battle/
│       │   ├── bg/{NNN}.png
│       │   ├── enemy/{id}/frame-NN.png
│       │   └── player/{id}/frame-NN.png
│       ├── world/
│       │   ├── npc/{spriteId}/frame-NN.png
│       │   └── tileset/map-{mapNum}/tile-{XXXX}.png
│       ├── item/{itemId}.png             # P2 新
│       ├── ui/{dialog|menu|statusbar}/   # P2 新
│       ├── splash/                       # P2 新
│       └── magic/{effectId}/             # P2 新
├── data/raw/unifont-cn.bdf               # P4 新(build asset,license 入 git)
├── docs/
│   ├── M4_CHUNK_INVENTORY.md             # P2 T1 新
│   └── M4_KNOWN_DEVIATIONS.md            # P3 T7 新
├── packages/
│   ├── pal-extract/src/
│   │   ├── cli.ts                                # P1 / P2 / P3 / P4 改
│   │   ├── font/bdf-to-json.ts                   # P4 T2 新
│   │   ├── resources/parsers/
│   │   │   ├── data-misc.ts                      # P2 T2 新(DATA.MKF 余下 chunks)
│   │   │   ├── stuff.ts                          # P2 T3 新
│   │   │   ├── save.ts / rng.ts / rgm.ts / ball.ts / fire.ts  # P2 T4 新
│   │   │   ├── sounds.ts                         # P2 T5 新
│   │   │   ├── enemies.ts / items.ts / spells.ts # P2 T2 改(字段补漏)
│   │   │   └── scenes.ts                         # P3 T5 改(全 295 + mapNum)
│   │   ├── scripts/
│   │   │   ├── render-tilemap.ts                 # P1 T3 改(path)
│   │   │   ├── grep-sdlpal-chunks.ts             # P2 T1 新
│   │   │   └── sdlpal-dump-map-all.ts            # P3 T7 新
│   │   └── __tests__/
│   │       └── tilemap-baseline.test.ts          # P1 T3 改(path)
│   ├── game/
│   │   ├── package.json                          # P4 T2 deps(pixelmatch 已有,pngjs 加)
│   │   ├── e2e/
│   │   │   ├── baselines/                        # P4 T4 全重生(本机,gitignored)
│   │   │   ├── battle/b*.spec.ts                 # P4 T4 改(切 sdlpal real baseline)
│   │   │   └── scene/a9-encounter.spec.ts        # P3 T8 unskip
│   │   └── src/
│   │       ├── assets/loader.ts                  # P1 T2 + P3 T1 + T3 改
│   │       ├── shell/
│   │       │   ├── bootstrap.ts                  # P1 T2 + P4 T3 改
│   │       │   └── dev-panel.ts                  # P3 T6 + P4 T5 改
│   │       ├── core/
│   │       │   ├── event-system.ts               # P3 T2 改(setPalette)
│   │       │   └── scene-system.ts               # P3 T1 改(SceneAssets 扩)
│   │       ├── present/font.ts                   # P4 T3 重写
│   │       └── data/scene-jumps.json             # P3 T6 扩 295
│   └── shared/src/resources.ts                   # P3 T1 + T5 改
└── reference/sdlpal/patches/                      # P3 T7 复用 headless-map-dump (M3.5 已存)
```

---

# Phase 1:资产分层重构

**目标**:把现 `data/extracted/` 平铺结构(2530 PNG + 216 JSON)迁到 §File Structure 锁定的分层结构;`pnpm extract` + L1 + L2 验收 0 diff。

**前置**:M3.5 main commit fdce2ff,L1 460+2,L2 30+1。

**注意**:P1 **只搬路径**,不改 schema(tilemap 仍按 sceneId-keyed,P3 T3 才改 mapNum-keyed)。

---

## Task P1.T1: pal-extract cli.ts 全部 writeJson/writeBinary path 改新结构

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`(5 处 writeBinary + 多处 writeJson)

**Parallel with:** —(独立)
**Blocks:** P1.T2, P1.T3, P1.T4

- [ ] **Step 1: 在 cli.ts 头部加 path helper,统一目录创建**

打开 `packages/pal-extract/src/cli.ts`,在 `writeJson` / `writeBinary` 函数(L67-75)下面加:

```ts
function imageWorldNpcPath(spriteId: number, frameIdx: number): string {
  return resolve(OUT, 'images', 'world', 'npc', String(spriteId), `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

function imageWorldTilesetPath(mapNum: number, tileIdx: number): string {
  return resolve(OUT, 'images', 'world', 'tileset', `map-${mapNum}`, `tile-${tileIdx.toString().padStart(4, '0')}.png`)
}

function imageBattleBgPath(bgId: number): string {
  return resolve(OUT, 'images', 'battle', 'bg', `${bgId.toString().padStart(3, '0')}.png`)
}

function imageBattleSpritePath(kind: 'enemy' | 'player', id: number, frameIdx: number): string {
  return resolve(OUT, 'images', 'battle', kind, String(id), `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

function dataSubdirPath(subdir: 'tilemap' | 'scene' | 'sprite' | 'palette' | 'battle-sprite' | 'font', name: string): string {
  return resolve(OUT, 'data', subdir, `${name}.json`)
}
```

(`writeBinary` 已经 `mkdirSync(dirname(path), { recursive: true })`,所以多级子目录自动建。verify:`grep -n "mkdirSync" packages/pal-extract/src/cli.ts`,若 helper 没建目录,在 writeJson 也加 `mkdirSync(dirname(path), { recursive: true })`。)

- [ ] **Step 2: 改 tile 写入(L237-244 附近)**

旧:
```ts
const fname = `tile-scene-${sliceId}-${tile.index.toString().padStart(4, '0')}.png`
writeBinary(resolve(OUT, 'images', fname), tile.pngBytes)
tilesetFiles.push(fname)
```

新:
```ts
// P1: 按 mapNum 写到 world/tileset/map-{mapNum}/。tilesetFiles 存相对 images/ 根的路径,
// 消费方 `${BASE}/images/${name}` 即可拼出 URL。
writeBinary(imageWorldTilesetPath(scene.mapNum, tile.index), tile.pngBytes)
const relativeName = `world/tileset/map-${scene.mapNum}/tile-${tile.index.toString().padStart(4, '0')}.png`
tilesetFiles.push(relativeName)
```

并把下方 `mapResult.tilemap.tilesetImage = ...` 那行改为:
```ts
mapResult.tilemap.tilesetImage = `world/tileset/map-${scene.mapNum}/tile-*.png`
```

- [ ] **Step 3: 改 tilemap JSON 写入(L242)**

旧:
```ts
writeJson(resolve(OUT, 'data', `tilemap-${sliceId}.json`), { ... })
```

新(P1 仍按 sliceId 命名,P3 T3 才改 mapNum-keyed):
```ts
writeJson(dataSubdirPath('tilemap', String(sliceId)), { ... })
```

- [ ] **Step 4: 改 scene JSON 写入(L253)**

旧:
```ts
writeJson(resolve(OUT, 'data', `scene-${sliceId}.json`), sceneObjects)
```

新:
```ts
writeJson(dataSubdirPath('scene', String(sliceId)), sceneObjects)
```

- [ ] **Step 5: 改 palette JSON 写入(L268)**

旧:
```ts
writeJson(resolve(OUT, 'data', `palette-${i}.json`), decodePalette(palBuf.subarray(0, 768)))
```

新:
```ts
writeJson(dataSubdirPath('palette', String(i)), decodePalette(palBuf.subarray(0, 768)))
```

- [ ] **Step 6: 改 sprite JSON + frame PNG 写入(L324-334)**

旧:
```ts
writeJson(resolve(OUT, 'data', `sprite-${sprite.spriteId}.json`), spriteJson)
for (const f of sprite.frames) {
  writeBinary(
    resolve(OUT, 'images', `sprite-${sprite.spriteId}-frame-${f.index.toString().padStart(2, '0')}.png`),
    f.pngBytes,
  )
}
```

新:
```ts
writeJson(dataSubdirPath('sprite', String(sprite.spriteId)), spriteJson)
for (const f of sprite.frames) {
  writeBinary(imageWorldNpcPath(sprite.spriteId, f.index), f.pngBytes)
}
```

- [ ] **Step 7: 改 battle sprite JSON + frame PNG 写入(L402-415)**

旧:
```ts
writeJson(
  resolve(OUT, 'data', `battle-sprite-${sprite.kind}-${sprite.battleSpriteId}.json`),
  json,
)
for (const f of sprite.frames) {
  writeBinary(
    resolve(OUT, 'images', `battle-sprite-${sprite.kind}-${sprite.battleSpriteId}-frame-${f.index.toString().padStart(2, '0')}.png`),
    f.pngBytes,
  )
}
```

新:
```ts
writeJson(dataSubdirPath('battle-sprite', `${sprite.kind}/${sprite.battleSpriteId}`), json)
for (const f of sprite.frames) {
  writeBinary(imageBattleSpritePath(sprite.kind, sprite.battleSpriteId, f.index), f.pngBytes)
}
```

(`dataSubdirPath('battle-sprite', 'enemy/123')` 会变 `data/battle-sprite/enemy/123.json`,`mkdirSync` 自动建中间目录。)

- [ ] **Step 8: 改 battle bg PNG 写入(L449-452)**

旧:
```ts
writeBinary(
  resolve(OUT, 'images', `battle-bg-${i.toString().padStart(3, '0')}.png`),
  encodeIndexedPng(320, 200, pixels),
)
```

新:
```ts
writeBinary(imageBattleBgPath(i), encodeIndexedPng(320, 200, pixels))
```

- [ ] **Step 9: 跑 pnpm extract,verify 新结构生成**

```bash
cd /Users/zhangxu/illegal/type-pal
rm -rf data/extracted
pnpm extract
```

预期:无报错,生成新结构。verify:

```bash
ls data/extracted/data/tilemap/ | head -3
ls data/extracted/data/scene/ | head -3
ls data/extracted/data/sprite/ | head -5
ls data/extracted/data/battle-sprite/enemy/ | head -3
ls data/extracted/data/palette/ | head -3
ls data/extracted/images/world/tileset/ | head -3
ls data/extracted/images/world/npc/ | head -5
ls data/extracted/images/battle/bg/ | head -3
ls data/extracted/images/battle/enemy/ | head -3
ls data/extracted/images/battle/player/ | head -3
test ! -e data/extracted/data/tilemap-1.json && echo "OK: old path gone"
test ! -e data/extracted/images/battle-bg-000.png && echo "OK: old battle-bg gone"
```

- [ ] **Step 10: 跑 pal-extract 单元测试**

```bash
pnpm -F @type-pal/pal-extract check
```

预期:全过(可能 baseline test fail,T3 来修;若 fail 记报错信息备 T3 用)。

- [ ] **Step 11: Commit**

```bash
git add packages/pal-extract/src/cli.ts
git commit -m "feat(M4.P1.T1): pal-extract cli.ts 全部写入 path 迁新分层结构"
```

---

## Task P1.T2: game runtime loader.ts + bootstrap.ts URL 改新结构

**Files:**
- Modify: `packages/game/src/assets/loader.ts`(5+ URL 处)
- Modify: `packages/game/src/shell/bootstrap.ts`(2 URL 处)

**Parallel with:** P1.T3
**Blocks by:** P1.T1
**Blocks:** P1.T4

- [ ] **Step 1: 改 loader.ts loadAll 中的 JSON path**

打开 `packages/game/src/assets/loader.ts`,找到 `loadAll` 函数内的 `Promise.all`(L70 附近):

旧:
```ts
fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap-${sceneId}.json`),
fetchJson<Palette>(`${BASE}/data/palette-0.json`),
fetchJson<SceneObjects>(`${BASE}/data/scene-${sceneId}.json`),
fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
```

新:
```ts
fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap/${sceneId}.json`),
fetchJson<Palette>(`${BASE}/data/palette/0.json`),
fetchJson<SceneObjects>(`${BASE}/data/scene/${sceneId}.json`),
fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
```

- [ ] **Step 2: 改 tile image URL regex extractor(L100 附近)**

旧:
```ts
const tilePngs = await Promise.all(
  tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)),
)
const tileImages = new Map<number, IndexedImage>()
tileFiles.forEach((name, i) => {
  const m = /tile-scene-\d+-(\d+)\.png/.exec(name)
  if (m) tileImages.set(Number(m[1]), tilePngs[i]!)
})
```

新:
```ts
// P1: tilesetFiles[] 内是 `world/tileset/map-{mapNum}/tile-{XXXX}.png` 格式,
// `${BASE}/images/${name}` 仍能拼对(name 含子目录路径)。
const tilePngs = await Promise.all(
  tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)),
)
const tileImages = new Map<number, IndexedImage>()
tileFiles.forEach((name, i) => {
  const m = /tile-(\d+)\.png$/.exec(name)
  if (m) tileImages.set(Number(m[1]), tilePngs[i]!)
})
```

- [ ] **Step 3: 改 sprite JSON + PNG URL(L121, L130 附近)**

旧:
```ts
const meta = await fetchJson<{ ... }>(`${BASE}/data/sprite-${id}.json`)
const frames = await Promise.all(
  meta.frames.map((f) =>
    fetchPng(`${BASE}/images/sprite-${id}-frame-${f.index.toString().padStart(2, '0')}.png`),
  ),
)
```

新:
```ts
const meta = await fetchJson<{ ... }>(`${BASE}/data/sprite/${id}.json`)
const frames = await Promise.all(
  meta.frames.map((f) =>
    fetchPng(`${BASE}/images/world/npc/${id}/frame-${f.index.toString().padStart(2, '0')}.png`),
  ),
)
```

- [ ] **Step 4: 改 battle-sprite JSON + PNG URL(L173, L177 附近)**

旧:
```ts
const meta = await fetchJson<BattleSpriteMeta>(
  `${BASE}/data/battle-sprite-${entry.kind}-${entry.id}.json`,
)
const frames = await Promise.all(
  meta.frames.map((f) =>
    fetchPng(
      `${BASE}/images/battle-sprite-${entry.kind}-${entry.id}-frame-${f.index.toString().padStart(2, '0')}.png`,
    ),
  ),
)
```

新:
```ts
const meta = await fetchJson<BattleSpriteMeta>(
  `${BASE}/data/battle-sprite/${entry.kind}/${entry.id}.json`,
)
const frames = await Promise.all(
  meta.frames.map((f) =>
    fetchPng(
      `${BASE}/images/battle/${entry.kind}/${entry.id}/frame-${f.index.toString().padStart(2, '0')}.png`,
    ),
  ),
)
```

- [ ] **Step 5: 改 battle bg URL(L206 附近)**

旧:
```ts
const png = await fetchPng(`${BASE}/images/battle-bg-${id.toString().padStart(3, '0')}.png`)
```

新:
```ts
const png = await fetchPng(`${BASE}/images/battle/bg/${id.toString().padStart(3, '0')}.png`)
```

- [ ] **Step 6: 改 bootstrap.ts NPC sprite URL(L184 附近)**

打开 `packages/game/src/shell/bootstrap.ts`,搜 `images/sprite-`:

旧:
```ts
`${BASE}/images/sprite-${id}-frame-${f.index.toString().padStart(2, '0')}.png`,
```

新:
```ts
`${BASE}/images/world/npc/${id}/frame-${f.index.toString().padStart(2, '0')}.png`,
```

- [ ] **Step 7: verify bootstrap.ts 无遗漏 path**

L216 是 `await fetch(`${BASE}/images/${name}`)`,`name` 由 `tilemap.tilesetFiles[]` 提供已是新 path,**这里不改**。verify:

```bash
grep -n "images/" packages/game/src/shell/bootstrap.ts
```

期望只有 `${BASE}/images/${name}`(由 tilesetFiles 驱动)+ Step 6 改过的 sprite URL,无第三处手拼。

- [ ] **Step 8: dev server 手动 verify scene 1 加载**

```bash
pnpm -F @type-pal/game dev &
sleep 3
curl -s http://localhost:5173/extracted/data/tilemap/1.json | head -c 200
curl -sI http://localhost:5173/extracted/images/world/tileset/map-12/tile-0000.png | head -3
curl -sI http://localhost:5173/extracted/images/battle/bg/070.png | head -3
kill %1 2>/dev/null
```

(端口非 5173 看实际输出;预期 200 OK。)

- [ ] **Step 9: Commit**

```bash
git add packages/game/src/assets/loader.ts packages/game/src/shell/bootstrap.ts
git commit -m "feat(M4.P1.T2): game runtime loader/bootstrap URL 迁新分层结构"
```

---

## Task P1.T3: render-tilemap.ts baseline 工具 + tilemap baseline test 路径改

**Files:**
- Modify: `packages/pal-extract/scripts/render-tilemap.ts`
- Modify: `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`

**Parallel with:** P1.T2
**Blocks by:** P1.T1
**Blocks:** P1.T4

- [ ] **Step 1: grep render-tilemap.ts 依赖 path**

```bash
grep -n "tilemap-\|tile-scene-\|images/" packages/pal-extract/scripts/render-tilemap.ts
```

记录所有 hit。

- [ ] **Step 2: 改 render-tilemap.ts 内 path**

逻辑示例(实施按真实 hit 改):

```ts
// 旧
const tilemapPath = resolve(extractedDir, 'data', `tilemap-${sceneId}.json`)
const tilePath = resolve(extractedDir, 'images', `tile-scene-${sceneId}-${idx.toString().padStart(4, '0')}.png`)

// 新
const tilemapPath = resolve(extractedDir, 'data', 'tilemap', `${sceneId}.json`)
const scenePath = resolve(extractedDir, 'data', 'scene', `${sceneId}.json`)
const sceneJson = JSON.parse(readFileSync(scenePath, 'utf8'))
const mapNum = sceneJson.mapNum
const tilePath = resolve(extractedDir, 'images', 'world', 'tileset', `map-${mapNum}`, `tile-${idx.toString().padStart(4, '0')}.png`)
```

⚠️ scene.mapNum 字段 P3 T5 才加;P1 时 scene-N.json 可能没 mapNum。**P1 T3 临时方案**:沿用 tilesetFiles[] 数组(数组内已是新路径,直接消费即可)。读 tilemap-{sliceId}.json 拿 tilesetFiles[],每条 `world/tileset/map-N/tile-XXXX.png` 直接 prefix `images/` 用。

```ts
// 推荐 P1 时的稳健改法
const tilemapJson = JSON.parse(readFileSync(tilemapPath, 'utf8'))
for (const relPath of tilemapJson.tilesetFiles) {
  const pngPath = resolve(extractedDir, 'images', relPath)
  // load PNG
}
```

- [ ] **Step 3: 改 tilemap-baseline.test.ts 内 path**

```bash
grep -n "tilemap-\|tile-scene-\|images/" packages/pal-extract/src/__tests__/tilemap-baseline.test.ts
```

按同 pattern 改,优先用 tilesetFiles[] 数组而非手拼 path。

- [ ] **Step 4: 跑 baseline test verify**

```bash
pnpm -F @type-pal/pal-extract check
```

预期:tilemap-baseline.test.ts 全过(5/5 baseline 0 diff,沿 M3.5 last)。

- [ ] **Step 5: 跑 render-tilemap script 手动 verify**

```bash
cd packages/pal-extract
pnpm exec tsx scripts/render-tilemap.ts 1 --out /tmp/scene-1-test.png
file /tmp/scene-1-test.png
```

预期:输出 PNG 文件;肉眼用 `qlmanage -p /tmp/scene-1-test.png` 看一眼。

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/scripts/render-tilemap.ts packages/pal-extract/src/__tests__/tilemap-baseline.test.ts
git commit -m "feat(M4.P1.T3): render-tilemap script + baseline test path 迁新结构"
```

---

## Task P1.T4: P1 全套 verify(pnpm extract + L1 + L2)

**Files:** —(只跑命令 verify)

**Parallel with:** —
**Blocks by:** P1.T1, P1.T2, P1.T3
**Blocks:** P2.T1

- [ ] **Step 1: 重新跑 pnpm extract 干净状态**

```bash
cd /Users/zhangxu/illegal/type-pal
rm -rf data/extracted
pnpm extract 2>&1 | tee /tmp/extract-log.txt
```

预期:无报错;末尾 summary 显示 sprite / battle-sprite / battle-bg / palette 数量一致。

- [ ] **Step 2: verify 文件 count 与 M3.5 一致**

```bash
find data/extracted -name '*.png' | wc -l    # 期望 2530
find data/extracted -name '*.json' | wc -l   # 期望 ~216(允许 ±10)
```

不一致就 abort,查 cli.ts 是否漏改某 path。

- [ ] **Step 3: 跑全 L1 测试**

```bash
pnpm -w check 2>&1 | tail -30
```

预期:`460+ passed | 2 skipped`,不退。

- [ ] **Step 4: 跑全 L2 测试**

```bash
pnpm -F @type-pal/game e2e 2>&1 | tail -30
```

预期:`30+ passed | 1 skipped`,0 diff。

若 L2 某 spec 因 path 改而 baseline mismatch:
- baseline PNG 是 frozen 的,所以应该不受影响(L2 跑 dev server fetch 新路径,渲染结果应一致)
- 若仍 fail,debug:用 chrome devtools 看 dev server 是否 404 拿不到资源

- [ ] **Step 5: 无 commit(P1 完工默认状态,P2 T1 commit message 提"P1 完工")**

```bash
echo "P1 verify report:"
echo "  L1: $(pnpm -w check 2>&1 | grep -oE '[0-9]+ passed' | head -1)"
echo "  L2: $(pnpm -F @type-pal/game e2e 2>&1 | grep -oE '[0-9]+ passed' | head -1)"
```

---

# Phase 2:全 chunk 覆盖

**目标**:14 个 MKF 全 chunk 抽完,按 schema B(已知 typed + 未知 raw + TODO)。

**前置**:P1 完工。

---

## Task P2.T1: chunk inventory MD 生成

**Files:**
- Create: `packages/pal-extract/scripts/grep-sdlpal-chunks.ts`
- Create: `docs/M4_CHUNK_INVENTORY.md`

**Parallel with:** —(独立先做)
**Blocks:** P2.T2, P2.T3, P2.T4, P2.T5

- [ ] **Step 1: 写 grep 辅助脚本**

创建 `packages/pal-extract/scripts/grep-sdlpal-chunks.ts`:

```ts
#!/usr/bin/env tsx
/**
 * M4 P2 T1 辅助:扫 reference/sdlpal/ 下所有 .c .h,grep MKF chunk 引用,
 * 按 MKF 文件分组输出 markdown 草稿。
 *
 * 用法:pnpm tsx packages/pal-extract/scripts/grep-sdlpal-chunks.ts > /tmp/sdlpal-chunks.md
 *
 * 注意:用 execFileSync(不用 execSync)防 shell injection。
 */
import { execFileSync } from 'node:child_process'

const MKFS = [
  'DATA', 'SSS', 'MGO', 'MAP', 'GOP', 'F', 'ABC', 'FBP',
  'PAT', 'STUFF', 'SAVE', 'RNG', 'RGM', 'BALL', 'FIRE', 'SOUNDS',
]

const sdlpalDir = 'reference/sdlpal'

for (const mkf of MKFS) {
  console.log(`\n## ${mkf}.MKF\n`)
  try {
    // grep with extended regex via -E + alternation,避免 shell metachars
    const pattern = `${mkf}\\.MKF|${mkf}MKF|fp${mkf}|f${mkf}\\b`
    const hits = execFileSync(
      'grep',
      ['-rnE', '--include=*.c', '--include=*.h', pattern, sdlpalDir],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    )
    console.log('```')
    console.log(hits.trim() || '(no hits)')
    console.log('```')
  } catch {
    console.log('(grep no hits)')
  }
}
```

- [ ] **Step 2: 跑脚本生成 raw grep dump**

```bash
pnpm tsx packages/pal-extract/scripts/grep-sdlpal-chunks.ts > /tmp/sdlpal-chunks-raw.md
wc -l /tmp/sdlpal-chunks-raw.md
```

预期:几百到几千行 grep 输出。

- [ ] **Step 3: 人工整理 `docs/M4_CHUNK_INVENTORY.md`**

基于 raw dump + 通读 sdlpal `global.c::PAL_LoadDefaultGame` 全函数,**逐 MKF 列**:

```markdown
# M4 chunk inventory

> 14 个 MKF 全 chunk 覆盖率明细。M1-M3.5 已抽部分 ✅,M4 P2 待抽部分 🔲,留 M5/M6 部分 ⏸。

## DATA.MKF

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 1 | `global.c:PAL_LoadDefaultGame` chunk 1 | tagENEMY 数组(154 条) | ✅ M1+M3 D28 | typed `enemies.json` |
| 2 | `global.c` chunk 2 | tagENEMYTEAM 数组 | ✅ M3 | typed `enemy-teams.json` |
| 3 | `global.c` chunk 3 | PLAYERROLES | ✅ M3 | typed `player-roles.json` |
| 4 | `global.c` chunk 4 | tagMAGIC 数组 | ✅ M3 | typed `magic.json` |
| 5 | `global.c` chunk 5 | tagBATTLEFIELD 数组 | ✅ M3 | typed `battle-fields.json` |
| 6 | `global.c` chunk 6 | lprgLevelUpMagic | 🔲 P2.T2 | typed `level-up-magic.json` |
| 7 | `global.c` chunk 7 | (待 spelunking) | 🔲 P2.T2 | raw + TODO |
| ... | ... | ... | ... | ... |
| 11 | `global.c` chunk 11 | rgwBattleEffectIndex | 🔲 P2.T2 | typed `battle-effect-index.json` |
| 13 | D28 chunk 13 | ENEMYPOS table | ✅ M3.5 | typed `enemy-pos.json` |
| 14 | `global.c` chunk 14 | rgLevelUpExp | 🔲 P2.T2 | typed `level-up-exp.json` |
| 15 | `global.c` chunk 15 | (待 spelunking) | 🔲 P2.T2 | raw + TODO |

## SSS.MKF

| 1 | `script.c` 等 | 295 个 SCENE struct | ✅ M1 | typed `scene/N.json` |
| 2 | `global.c` | OBJECT[] 数组 | ✅ M1 | typed `items.json` `spells.json` |
| 4 | `script.c` | events 字节码 | ✅ M1 | typed `events/scene-NNN.json` |
| 3 / 5+ | ? | (raw dump 看看) | 🔲 P2.T4 | raw + TODO |

## STUFF.MKF
| ... | ... | ... | 🔲 P2.T3 | (字模 verify + 其他) |

## SAVE.MKF
| 0 | `io_save.c:PAL_LoadGame_All` | save game template | 🔲 P2.T4 | raw |

## RNG.MKF / RGM.MKF / BALL.MKF / FIRE.MKF
| ... | ... | ... | 🔲 P2.T4 | (按 sdlpal 真值具体填) |

## SOUNDS.MKF
| 0..505 | `sound.c` | 音效 chunk | 🔲 P2.T5 | metadata only (ogg 转 M6) |

## MGO.MKF / MAP.MKF / GOP.MKF / F.MKF / ABC.MKF / FBP.MKF / PAT.MKF
(M1-M3.5 已覆盖 切片或全量,见对应 milestone plan;P3 T3+T4 扩 MAP/GOP/MGO 到全量)
```

(实施者用 view `reference/sdlpal/global.c` 完整通读 `PAL_LoadDefaultGame`,把每 chunk 含义写实;raw grep dump 帮 cross-ref。)

- [ ] **Step 4: verify 覆盖率**

inventory MD 写完后,自检:14 MKF 全部出现;每 MKF 列出可见的全 chunk;每 chunk 有 ✅/🔲/⏸ 标记 + sdlpal 引用 + 抽法决策。

- [ ] **Step 5: Commit**

```bash
git add packages/pal-extract/scripts/grep-sdlpal-chunks.ts docs/M4_CHUNK_INVENTORY.md
git commit -m "docs(M4.P2.T1): chunk inventory MD(14 MKF 全覆盖率明细,P1 完工)"
```

---

## Task P2.T2: DATA.MKF 余下 chunks + enemies/items/spells 字段补漏

**Files:**
- Create: `packages/pal-extract/src/resources/parsers/data-misc.ts`
- Modify: `packages/pal-extract/src/resources/parsers/{enemies,items,spells}.ts`
- Modify: `packages/pal-extract/src/cli.ts`
- Modify: `packages/shared/src/resources.ts`
- Test: `packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts`

**Parallel with:** P2.T3, P2.T4, P2.T5
**Blocks by:** P2.T1

- [ ] **Step 1: 按 inventory 列出 DATA.MKF 余下 chunks 含义**

打开 `docs/M4_CHUNK_INVENTORY.md` DATA.MKF section,把 🔲 chunks 列出来:
- chunk 6: lprgLevelUpMagic(角色升级习得法术表)
- chunk 7-10/12/15: ?(实施前 grep `global.c::PAL_LoadDefaultGame` 真填)
- chunk 11: rgwBattleEffectIndex(战斗特效 index)
- chunk 14: rgLevelUpExp(每等级经验值)

- [ ] **Step 2: 写 failing test for parseLevelUpExp**

创建 `packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseLevelUpExp } from '../data-misc.js'

describe('parseLevelUpExp', () => {
  it('parses sdlpal rgLevelUpExp shape: 100 WORD entries', () => {
    // sdlpal global.h: WORD g_GameData.rgLevelUpExp[MAX_LEVELS+1]; MAX_LEVELS=99
    const buf = new Uint8Array(200)
    new DataView(buf.buffer).setUint16(2, 100, true)
    new DataView(buf.buffer).setUint16(4, 250, true)
    new DataView(buf.buffer).setUint16(6, 500, true)

    const result = parseLevelUpExp(buf)
    expect(result).toHaveLength(100)
    expect(result[1]).toBe(100)
    expect(result[2]).toBe(250)
    expect(result[3]).toBe(500)
  })
})
```

- [ ] **Step 3: 跑 test fail**

```bash
pnpm -F @type-pal/pal-extract test data-misc -v
```

预期:`parseLevelUpExp is not defined` 或 import 失败。

- [ ] **Step 4: 写 parseLevelUpExp 实现**

创建 `packages/pal-extract/src/resources/parsers/data-misc.ts`:

```ts
/**
 * DATA.MKF 余下 chunks 的 parser(M4 P2 T2)。
 * sdlpal 真值来源 reference/sdlpal/global.c::PAL_LoadDefaultGame。
 */

/** chunk 14:rgLevelUpExp —— per-level 经验阈值(WORD × 100)。 */
export function parseLevelUpExp(buf: Uint8Array): number[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const count = Math.min(100, Math.floor(buf.byteLength / 2))
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(view.getUint16(i * 2, true))
  }
  return out
}

/** chunk 6:lprgLevelUpMagic —— per-role per-level 习得法术。
 *  sdlpal global.h:LPLEVELUPMAGIC + struct { WORD wMagic; WORD wLevel; } × MAX_PLAYABLE_PLAYER_ROLES × N
 *  实施时 grep `g_GameData.lprgLevelUpMagic` 看 alloc 真大小。 */
export interface LevelUpMagicEntry { magic: number; level: number }

export function parseLevelUpMagic(buf: Uint8Array, roleCount: number): LevelUpMagicEntry[][] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const perRole: LevelUpMagicEntry[][] = []
  const entrySize = 4
  const entriesPerRole = roleCount > 0 ? Math.floor(buf.byteLength / (entrySize * roleCount)) : 0
  for (let r = 0; r < roleCount; r++) {
    const role: LevelUpMagicEntry[] = []
    for (let i = 0; i < entriesPerRole; i++) {
      const off = (r * entriesPerRole + i) * entrySize
      const magic = view.getUint16(off, true)
      const level = view.getUint16(off + 2, true)
      if (magic !== 0) role.push({ magic, level })
    }
    perRole.push(role)
  }
  return perRole
}

/** chunk 11:rgwBattleEffectIndex —— WORD 数组。 */
export function parseBattleEffectIndex(buf: Uint8Array): number[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const count = Math.floor(buf.byteLength / 2)
  return Array.from({ length: count }, (_, i) => view.getUint16(i * 2, true))
}

/** 未知含义 chunk 的 raw dump。 */
export interface RawChunkDump {
  chunkIndex: number
  size: number
  base64: string
  sdlpalHint: string
  todo: string
}

export function dumpRawChunk(
  chunkIndex: number,
  buf: Uint8Array,
  sdlpalHint: string,
  todo: string,
): RawChunkDump {
  return {
    chunkIndex,
    size: buf.byteLength,
    base64: Buffer.from(buf).toString('base64'),
    sdlpalHint,
    todo,
  }
}
```

- [ ] **Step 5: 跑 test pass**

```bash
pnpm -F @type-pal/pal-extract test data-misc -v
```

预期:1 pass。

- [ ] **Step 6: 加 parseLevelUpMagic + parseBattleEffectIndex 测试**

在 `data-misc.test.ts` 加:

```ts
import { parseLevelUpMagic, parseBattleEffectIndex } from '../data-misc.js'

describe('parseLevelUpMagic', () => {
  it('5 entries per role × 6 roles', () => {
    const buf = new Uint8Array(4 * 5 * 6)
    new DataView(buf.buffer).setUint16(0, 100, true)
    new DataView(buf.buffer).setUint16(2, 5, true)
    const result = parseLevelUpMagic(buf, 6)
    expect(result).toHaveLength(6)
    expect(result[0]![0]).toEqual({ magic: 100, level: 5 })
  })
})

describe('parseBattleEffectIndex', () => {
  it('parses WORD array', () => {
    const buf = new Uint8Array(20)
    new DataView(buf.buffer).setUint16(0, 42, true)
    new DataView(buf.buffer).setUint16(2, 43, true)
    expect(parseBattleEffectIndex(buf)).toEqual([42, 43, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})
```

跑 verify:`pnpm -F @type-pal/pal-extract test data-misc -v` 预期 3 pass。

- [ ] **Step 7: enemies/items/spells 字段补漏(沿 D28)**

grep `reference/sdlpal/global.h::tagENEMY`/`tagOBJECT_ITEM`/`tagOBJECT_MAGIC` 完整 struct,对比现 `parsers/{enemies,items,spells}.ts` schema,列出缺字段。

常见缺漏:
- Enemy: `magStrength` `dexterity` `poisonResistance` `elementalResistance[5]` `physicalResistance` `dualMove`
- Item: `wScriptOnUse` `wScriptOnEquip` `wScriptOnUnequip` `wFlags`
- Spell: `wEffect` `wType` `wCostMP` `wBaseDamage` `wElemental`

对每个补漏字段:

1. `packages/shared/src/resources.ts` 加字段(沿 D28 注释 SHORT/WORD 语义)
2. `packages/pal-extract/src/resources/parsers/{enemies,items,spells}.ts` 加字段读取(signed 用 `getInt16`,unsigned 用 `getUint16`)
3. 加单测覆盖

shared/src/resources.ts 加字段示例:

```ts
export interface Enemy {
  // ...既有...
  /** sdlpal tagENEMY.wMagStrength —— 法术强度(SHORT/signed,modifier 语义,D28)。 */
  magStrength: number
  /** sdlpal tagENEMY.wDexterity —— 速度(SHORT/signed)。 */
  dexterity: number
  /** sdlpal tagENEMY.wPoisonResistance —— 中毒抗性(SHORT)。 */
  poisonResistance: number
  /** sdlpal tagENEMY.wElemResistance[5] —— 五行抗性(SHORT × 5)。 */
  elementalResistance: [number, number, number, number, number]
  /** sdlpal tagENEMY.wPhysicalResistance —— 物理抗性(SHORT)。 */
  physicalResistance: number
  /** sdlpal tagENEMY.wDualMove —— 1 = 一回合两次行动。 */
  dualMove: number
}
```

enemies.ts parser 加(在既有字段后);**字段 offset 必须严格按 sdlpal `global.h::tagENEMY` struct 顺序**,实施前 view sdlpal struct 数 byte offset:

```ts
const magStrength = view.getInt16(offset, true); offset += 2
const dexterity = view.getInt16(offset, true); offset += 2
const poisonResistance = view.getInt16(offset, true); offset += 2
const elementalResistance: [number, number, number, number, number] = [
  view.getInt16(offset, true), view.getInt16(offset + 2, true),
  view.getInt16(offset + 4, true), view.getInt16(offset + 6, true),
  view.getInt16(offset + 8, true),
]
offset += 10
const physicalResistance = view.getInt16(offset, true); offset += 2
const dualMove = view.getInt16(offset, true); offset += 2

return {
  // ...既有...
  magStrength, dexterity, poisonResistance,
  elementalResistance, physicalResistance, dualMove,
}
```

- [ ] **Step 8: cli.ts 加新 chunk dump stage**

打开 `packages/pal-extract/src/cli.ts`,在 DATA.MKF chunk dump 段(L160 附近)加:

```ts
// M4 P2 T2:DATA.MKF 余下 chunks
import {
  parseLevelUpExp, parseLevelUpMagic, parseBattleEffectIndex, dumpRawChunk,
} from './resources/parsers/data-misc.js'

// ...既有 chunk 1/2/3/4/5/13 dump 之后...

const levelUpExpBuf = readChunk(dataMkf, 14)
writeJson(resolve(OUT, 'data', 'level-up-exp.json'), parseLevelUpExp(levelUpExpBuf))

const levelUpMagicBuf = readChunk(dataMkf, 6)
writeJson(resolve(OUT, 'data', 'level-up-magic.json'),
  parseLevelUpMagic(levelUpMagicBuf, playerRoles.roles.length))

const battleEffectBuf = readChunk(dataMkf, 11)
writeJson(resolve(OUT, 'data', 'battle-effect-index.json'),
  parseBattleEffectIndex(battleEffectBuf))

// 余下 chunks raw dump
const dataMiscRaw: Record<number, unknown> = {}
for (const idx of [7, 8, 9, 10, 12, 15]) {
  const chunkBuf = readChunk(dataMkf, idx)
  if (chunkBuf.byteLength === 0) continue
  dataMiscRaw[idx] = dumpRawChunk(idx, chunkBuf,
    `DATA.MKF chunk ${idx} -- 未 typed, see M4_CHUNK_INVENTORY.md`,
    'TODO M5/M6: 真用时按 sdlpal struct 扩 typed schema')
}
writeJson(resolve(OUT, 'data', 'data-misc-raw.json'), dataMiscRaw)
```

- [ ] **Step 9: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract
ls data/extracted/data/level-up-exp.json data/extracted/data/level-up-magic.json data/extracted/data/battle-effect-index.json data/extracted/data/data-misc-raw.json
cat data/extracted/data/level-up-exp.json | head -c 100
```

预期:4 个新 JSON 存在,内容合理。

- [ ] **Step 10: 跑全 L1**

```bash
pnpm -w check 2>&1 | tail -10
```

预期:既有 460+2 + 新测 ~3 = 463+ passed。

- [ ] **Step 11: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/data-misc.ts \
  packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts \
  packages/pal-extract/src/resources/parsers/enemies.ts \
  packages/pal-extract/src/resources/parsers/items.ts \
  packages/pal-extract/src/resources/parsers/spells.ts \
  packages/pal-extract/src/cli.ts \
  packages/shared/src/resources.ts
git commit -m "feat(M4.P2.T2): DATA.MKF 余下 chunks 抽 + enemies/items/spells 字段补漏(D28)"
```

---

## Task P2.T3: STUFF.MKF 全 chunk 抽 + 字模 verify

**Files:**
- Create: `packages/pal-extract/src/resources/parsers/stuff.ts`
- Create: `packages/pal-extract/src/resources/parsers/__tests__/stuff.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Parallel with:** P2.T2, P2.T4, P2.T5
**Blocks by:** P2.T1
**Blocks:** P4.T1

- [ ] **Step 1: grep sdlpal 看 STUFF.MKF 引用**

```bash
grep -rn -E "STUFF\.MKF|fpSTUFF|fSTUFF" reference/sdlpal --include='*.c' --include='*.h'
```

记录 hit:可能 `text.c` / `font.c` / `script.c` / 等。

- [ ] **Step 2: 临时探勘 dump 看 chunk count + size**

写一次性 inline ts(可丢):

```bash
pnpm tsx -e "
import { openMkf, chunkCount, readChunk } from './packages/pal-extract/src/io/mkf.js'
import { readFileSync } from 'node:fs'
const mkf = openMkf(readFileSync('data/raw/STUFF.MKF'))
const n = chunkCount(mkf)
console.log('STUFF.MKF chunks:', n)
for (let i = 0; i < n; i++) {
  const buf = readChunk(mkf, i)
  console.log('  chunk', i, 'size', buf.byteLength)
}
"
```

记录 chunk count + 各 size。

- [ ] **Step 3: 决策 STUFF chunk 抽法**

根据 Step 1+2 结果逐 chunk:
- 字模 pattern(size = N × 32):typed `parseStuffFontGlyphs`,输出 `data/stuff-font-chunk{N}.json`
- 文本/对话/词表:typed,输出 `data/stuff-text-chunk{N}.json`
- 其余:raw dump + TODO

**字模 verify**(给 P4 决策):
- 有 size = N × 32 chunk → 高概率字模 → P4 T1 决"用原版字模 + Unifont 兜底"或纯 Unifont
- 全 chunk 无明显字模 pattern → confirm D11 假设 → P4 T1 走纯 Unifont

- [ ] **Step 4: 写 parseStuffChunk**

创建 `packages/pal-extract/src/resources/parsers/stuff.ts`:

```ts
/**
 * STUFF.MKF parser(M4 P2 T3)。
 * sdlpal 引用见 grep 输出 + reference/sdlpal/text.c / font.c。
 * P4 T1 字模决策的实证依据。
 */
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

/** chunk 可能是字模:每 32 bytes = 1 个 16×16 glyph(2 byte × 16 row)。 */
export function parseStuffFontGlyphs(buf: Uint8Array): Uint8Array[] {
  const GLYPH_SIZE = 32
  const count = Math.floor(buf.byteLength / GLYPH_SIZE)
  return Array.from({ length: count }, (_, i) =>
    buf.subarray(i * GLYPH_SIZE, (i + 1) * GLYPH_SIZE),
  )
}

export interface StuffChunkInfo {
  chunkIndex: number
  size: number
  guessType: 'font' | 'text' | 'unknown'
  glyphCount?: number
  raw?: RawChunkDump
}

export function analyzeStuffChunk(idx: number, buf: Uint8Array): StuffChunkInfo {
  // 字模启发式:size % 32 === 0 且 size ≥ 32 × 100
  if (buf.byteLength % 32 === 0 && buf.byteLength >= 32 * 100) {
    return {
      chunkIndex: idx,
      size: buf.byteLength,
      guessType: 'font',
      glyphCount: buf.byteLength / 32,
    }
  }
  return {
    chunkIndex: idx,
    size: buf.byteLength,
    guessType: 'unknown',
    raw: dumpRawChunk(idx, buf,
      `STUFF.MKF chunk ${idx} -- 未识别为 font, raw dump`,
      'TODO M5/M6: 真用时按 sdlpal text.c/font.c 扩'),
  }
}
```

- [ ] **Step 5: 写 test**

创建 `packages/pal-extract/src/resources/parsers/__tests__/stuff.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { analyzeStuffChunk, parseStuffFontGlyphs } from '../stuff.js'

describe('parseStuffFontGlyphs', () => {
  it('splits buf into 32-byte glyphs', () => {
    const buf = new Uint8Array(64)
    buf[0] = 0xAA
    buf[32] = 0xBB
    const glyphs = parseStuffFontGlyphs(buf)
    expect(glyphs).toHaveLength(2)
    expect(glyphs[0]![0]).toBe(0xAA)
    expect(glyphs[1]![0]).toBe(0xBB)
  })
})

describe('analyzeStuffChunk', () => {
  it('detects font when size % 32 === 0 and ≥ 3200', () => {
    const info = analyzeStuffChunk(0, new Uint8Array(32 * 100))
    expect(info.guessType).toBe('font')
    expect(info.glyphCount).toBe(100)
  })

  it('falls back to unknown + raw', () => {
    const info = analyzeStuffChunk(1, new Uint8Array(123))
    expect(info.guessType).toBe('unknown')
    expect(info.raw).toBeDefined()
  })
})
```

跑 verify:`pnpm -F @type-pal/pal-extract test stuff -v` 预期 3 pass。

- [ ] **Step 6: cli.ts 加 STUFF dump stage**

```ts
// M4 P2 T3:STUFF.MKF 全 chunk 抽
import { analyzeStuffChunk, parseStuffFontGlyphs, type StuffChunkInfo } from './resources/parsers/stuff.js'

console.log('[pal-extract] STUFF.MKF dump …')
const stuffMkf = openMkf(loadFile('STUFF.MKF'))
const stuffN = chunkCount(stuffMkf)
const stuffSummary: StuffChunkInfo[] = []
for (let i = 0; i < stuffN; i++) {
  const buf = readChunk(stuffMkf, i)
  const info = analyzeStuffChunk(i, buf)
  stuffSummary.push(info)
  if (info.guessType === 'font' && info.glyphCount) {
    const glyphs = parseStuffFontGlyphs(buf)
    writeJson(resolve(OUT, 'data', `stuff-font-chunk${i}.json`), {
      chunkIndex: i,
      glyphCount: glyphs.length,
      glyphs: glyphs.map((g) => Buffer.from(g).toString('base64')),
    })
  }
}
writeJson(resolve(OUT, 'data', 'stuff-summary.json'), stuffSummary)
console.log(`[pal-extract] STUFF.MKF written (${stuffN} chunks)`)
```

- [ ] **Step 7: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep STUFF
ls data/extracted/data/stuff*.json
cat data/extracted/data/stuff-summary.json | head -50
```

预期:`stuff-summary.json` 列出全 chunks;若有 font chunk → `stuff-font-chunk{N}.json`。

- [ ] **Step 8: 把 STUFF 字模 verify 结果记入 M4_CHUNK_INVENTORY.md**

在 STUFF.MKF section 把每 chunk 的 guessType 真实结果填进去。若有 font chunk → 标 ✅ + "P4 T1 决策依据"。

- [ ] **Step 9: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/stuff.ts \
  packages/pal-extract/src/resources/parsers/__tests__/stuff.test.ts \
  packages/pal-extract/src/cli.ts \
  docs/M4_CHUNK_INVENTORY.md
git commit -m "feat(M4.P2.T3): STUFF.MKF 全 chunk dump + 字模 verify(P4 T1 决策依据)"
```

---

## Task P2.T4: SAVE / RNG / RGM / BALL / FIRE / misc MKF + splash 素材

**Files:**
- Create: `packages/pal-extract/src/resources/parsers/{save,rng,rgm,ball,fire}.ts`
- Create: `packages/pal-extract/src/resources/parsers/__tests__/misc-mkf.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Parallel with:** P2.T2, P2.T3, P2.T5
**Blocks by:** P2.T1

- [ ] **Step 1: 按 inventory 列每 MKF chunk 抽法**

每 MKF 走相同模板:grep `reference/sdlpal/` 看用途 → 临时脚本看 chunk size → 决策 typed/raw → 写 parser + test → cli.ts dump stage。

- [ ] **Step 2: SAVE.MKF — 写 failing test**

创建 `packages/pal-extract/src/resources/parsers/__tests__/misc-mkf.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dumpSaveTemplate } from '../save.js'

describe('dumpSaveTemplate', () => {
  it('returns raw dump with chunkIndex + size + base64', () => {
    const buf = new Uint8Array([1, 2, 3, 4])
    const result = dumpSaveTemplate(0, buf)
    expect(result.chunkIndex).toBe(0)
    expect(result.size).toBe(4)
    expect(result.base64).toBeTruthy()
    expect(result.sdlpalHint).toContain('SAVE.MKF')
  })
})
```

- [ ] **Step 3: SAVE.MKF — 写实现**

创建 `packages/pal-extract/src/resources/parsers/save.ts`:

```ts
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

export function dumpSaveTemplate(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(chunkIdx, buf,
    `SAVE.MKF chunk ${chunkIdx} -- save game struct template, see sdlpal io_save.c`,
    'TODO M5: 存档系统真做时按 SAVEGAME struct 扩 typed')
}
```

跑 test pass:`pnpm -F @type-pal/pal-extract test misc-mkf -v` 预期 1 pass。

- [ ] **Step 4: RNG.MKF — 写 raw dump parser**

创建 `packages/pal-extract/src/resources/parsers/rng.ts`:

```ts
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'

export function dumpRngAnim(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(chunkIdx, buf,
    `RNG.MKF chunk ${chunkIdx} -- RLE-compressed animation, see sdlpal rngplay.c`,
    'TODO M5/M6: 战斗特效 / 转场真做时按 RNG frame 格式扩 typed')
}
```

在 misc-mkf.test.ts 加 test:

```ts
import { dumpRngAnim } from '../rng.js'

it('dumpRngAnim returns raw with RNG hint', () => {
  const r = dumpRngAnim(5, new Uint8Array([0xFF]))
  expect(r.chunkIndex).toBe(5)
  expect(r.sdlpalHint).toContain('RNG.MKF')
})
```

跑 test pass。

- [ ] **Step 5: RGM.MKF / BALL.MKF / FIRE.MKF — 同 pattern**

按 Step 4 模板各建一个 parser:

`rgm.ts`:
```ts
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'
export function dumpRgmChunk(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(chunkIdx, buf,
    `RGM.MKF chunk ${chunkIdx} -- BGM metadata, see sdlpal`,
    'TODO M6: BGM 真用时扩 typed')
}
```

`ball.ts`:
```ts
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'
export function dumpBallChunk(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(chunkIdx, buf,
    `BALL.MKF chunk ${chunkIdx} -- magic ball UI sprite, see sdlpal PAL_DrawBall`,
    'TODO M5: 法术 UI 真用时扩 typed sprite')
}
```

`fire.ts`:
```ts
import { dumpRawChunk, type RawChunkDump } from './data-misc.js'
export function dumpFireChunk(chunkIdx: number, buf: Uint8Array): RawChunkDump {
  return dumpRawChunk(chunkIdx, buf,
    `FIRE.MKF chunk ${chunkIdx} -- battle fire effect, see sdlpal`,
    'TODO M5: 战斗特效真用时扩 typed sprite')
}
```

每个加 1 test verify dump 形状(同 Step 4 pattern)。

- [ ] **Step 6: splash 素材 dump 决策**

grep `reference/sdlpal/intro.c` + `ending.c` 找标题/片头/片尾资源。常见源:
- BALL.MKF chunk N(若 320×200 图)
- 独立 .RGM .RGA 文件(若 raw 区有)

实施时 verify chunk size = 320×200 才走 image path:

```ts
// cli.ts P2 T4 BALL splash dump 示例
const ballMkf = openMkf(loadFile('BALL.MKF'))
const ballN = chunkCount(ballMkf)
for (let i = 0; i < ballN; i++) {
  const buf = readChunk(ballMkf, i)
  if (buf.byteLength === 0) continue
  let decoded: Uint8Array
  try { decoded = decompressYj2(buf) } catch { decoded = buf }
  if (decoded.byteLength === 320 * 200) {
    writeBinary(
      resolve(OUT, 'images', 'splash', `ball-${i.toString().padStart(2, '0')}.png`),
      encodeIndexedPng(320, 200, decoded),
    )
  } else {
    // raw dump
  }
}
```

- [ ] **Step 7: cli.ts 加 5 个 MKF dump stage**

```ts
// M4 P2 T4: SAVE/RNG/RGM/BALL/FIRE 全 chunk dump
import { dumpSaveTemplate } from './resources/parsers/save.js'
import { dumpRngAnim } from './resources/parsers/rng.js'
import { dumpRgmChunk } from './resources/parsers/rgm.js'
import { dumpBallChunk } from './resources/parsers/ball.js'
import { dumpFireChunk } from './resources/parsers/fire.js'

const miscMkfs: Array<{ name: string; parser: (i: number, b: Uint8Array) => unknown; jsonKey: string }> = [
  { name: 'SAVE.MKF', parser: dumpSaveTemplate, jsonKey: 'save' },
  { name: 'RNG.MKF',  parser: dumpRngAnim,      jsonKey: 'rng' },
  { name: 'RGM.MKF',  parser: dumpRgmChunk,     jsonKey: 'rgm' },
  { name: 'BALL.MKF', parser: dumpBallChunk,    jsonKey: 'ball' },
  { name: 'FIRE.MKF', parser: dumpFireChunk,    jsonKey: 'fire' },
]
for (const { name, parser, jsonKey } of miscMkfs) {
  const mkf = openMkf(loadFile(name))
  const n = chunkCount(mkf)
  const summary: unknown[] = []
  for (let i = 0; i < n; i++) {
    summary.push(parser(i, readChunk(mkf, i)))
  }
  writeJson(resolve(OUT, 'data', `${jsonKey}-raw.json`), summary)
  console.log(`[pal-extract] ${name} written (${n} chunks)`)
}
```

(splash dump 单独段,见 Step 6 — 实施时若 BALL.MKF chunk 真有 320×200 image,把 splash dump 段加在 BALL parser 调用之前/之后。)

- [ ] **Step 8: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep -E "(SAVE|RNG|RGM|BALL|FIRE)\.MKF"
ls data/extracted/data/save-raw.json data/extracted/data/rng-raw.json data/extracted/data/rgm-raw.json data/extracted/data/ball-raw.json data/extracted/data/fire-raw.json
ls data/extracted/images/splash/ 2>/dev/null || echo "(splash empty — no MKF had splash content)"
```

- [ ] **Step 9: 跑全 L1**

```bash
pnpm -w check 2>&1 | tail -10
```

预期:既有 + misc-mkf.test.ts ~5 = ~468+ passed。

- [ ] **Step 10: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/save.ts \
  packages/pal-extract/src/resources/parsers/rng.ts \
  packages/pal-extract/src/resources/parsers/rgm.ts \
  packages/pal-extract/src/resources/parsers/ball.ts \
  packages/pal-extract/src/resources/parsers/fire.ts \
  packages/pal-extract/src/resources/parsers/__tests__/misc-mkf.test.ts \
  packages/pal-extract/src/cli.ts
git commit -m "feat(M4.P2.T4): SAVE/RNG/RGM/BALL/FIRE MKF 全 chunk raw dump + splash 素材"
```

---

## Task P2.T5: SOUNDS.MKF metadata 抽

**Files:**
- Create: `packages/pal-extract/src/resources/parsers/sounds.ts`
- Create: `packages/pal-extract/src/resources/parsers/__tests__/sounds.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Parallel with:** P2.T2, P2.T3, P2.T4
**Blocks by:** P2.T1

- [ ] **Step 1: 写 failing test**

```ts
import { describe, expect, it } from 'vitest'
import { dumpSoundsMetadata } from '../sounds.js'

describe('dumpSoundsMetadata', () => {
  it('returns count + per-chunk size array', () => {
    const result = dumpSoundsMetadata([
      new Uint8Array(100),
      new Uint8Array(200),
      new Uint8Array(0),
    ])
    expect(result.chunkCount).toBe(3)
    expect(result.chunks[0]).toEqual({ index: 0, size: 100, isEmpty: false })
    expect(result.chunks[2]).toEqual({ index: 2, size: 0, isEmpty: true })
  })
})
```

- [ ] **Step 2: 写实现**

创建 `packages/pal-extract/src/resources/parsers/sounds.ts`:

```ts
/**
 * SOUNDS.MKF metadata 抽(M4 P2 T5)。
 * 含 505 个音效 chunk,M4 只抽 metadata,ogg 转换留 M6。
 */
export interface SoundsChunkInfo {
  index: number
  size: number
  isEmpty: boolean
}
export interface SoundsMetadata {
  chunkCount: number
  chunks: SoundsChunkInfo[]
}

export function dumpSoundsMetadata(chunkBufs: Uint8Array[]): SoundsMetadata {
  return {
    chunkCount: chunkBufs.length,
    chunks: chunkBufs.map((buf, i) => ({
      index: i,
      size: buf.byteLength,
      isEmpty: buf.byteLength === 0,
    })),
  }
}
```

- [ ] **Step 3: 跑 test pass**

```bash
pnpm -F @type-pal/pal-extract test sounds -v
```

预期 1 pass。

- [ ] **Step 4: cli.ts 加 SOUNDS metadata dump stage**

```ts
// M4 P2 T5: SOUNDS.MKF metadata
import { dumpSoundsMetadata } from './resources/parsers/sounds.js'

console.log('[pal-extract] SOUNDS.MKF metadata …')
const soundsMkf = openMkf(loadFile('SOUNDS.MKF'))
const soundsN = chunkCount(soundsMkf)
const soundsBufs: Uint8Array[] = []
for (let i = 0; i < soundsN; i++) soundsBufs.push(readChunk(soundsMkf, i))
writeJson(resolve(OUT, 'data', 'sounds-metadata.json'), dumpSoundsMetadata(soundsBufs))
console.log(`[pal-extract] SOUNDS.MKF metadata written (${soundsN} chunks)`)
```

- [ ] **Step 5: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep SOUNDS
cat data/extracted/data/sounds-metadata.json | head -50
```

预期:JSON 列 chunkCount 505 + 每 chunk size。

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/sounds.ts \
  packages/pal-extract/src/resources/parsers/__tests__/sounds.test.ts \
  packages/pal-extract/src/cli.ts
git commit -m "feat(M4.P2.T5): SOUNDS.MKF metadata dump(ogg 转换留 M6)"
```

---

# Phase 3:全 295 scene 资源 dump

**目标**:全 295 scene tileset + sprite + scene-N.json + game runtime scene picker 扩 295 + sdlpal `--dump-map` 全 295 diff 自动化 + 修 M3.5 ⚠️ a9 / palette 跨 scene。

**前置**:P1 完工(P3 task 不强依赖 P2 完工)。

---

## Task P3.T1: SceneAssets 扩 eventCommands+labelMap + lazy load(修 M3.5 ⚠️ #8)

**Files:**
- Modify: `packages/shared/src/resources.ts`(SceneAssets schema 扩)
- Modify: `packages/game/src/assets/loader.ts`(SceneFetcher 内 fetch events)
- Modify: `packages/game/src/core/scene-system.ts`
- Test: `packages/game/src/core/scene-system.test.ts`

**Parallel with:** P3.T2, P3.T3, P3.T4, P3.T5
**Blocks:** P3.T8

- [ ] **Step 1: 看现 SceneAssets schema + SceneFetcher signature**

```bash
grep -n "SceneAssets\|SceneFetcher" packages/shared/src/resources.ts packages/game/src/assets/loader.ts | head -20
```

记录现 schema 形状。

- [ ] **Step 2: 写 failing test**

打开 `packages/game/src/core/scene-system.test.ts`,加 case:

```ts
import type { SceneAssets, SceneFetcher } from '../assets/loader.js'

describe('loadScene + lazy events', () => {
  it('SceneAssets contains eventCommands + labelMap after load', async () => {
    const mockFetcher: SceneFetcher = async (sceneId) => {
      return {
        sceneId,
        tilemap: { width: 1, height: 1, layers: [], tilesetFiles: [] } as any,
        palette: [] as any,
        eventObjects: [],
        npcSprites: new Map(),
        eventCommands: [{ op: 'showDialog', operands: [1, 0] } as any],
        labelMap: new Map<number, number>([[100, 0]]),
      }
    }
    const result = await mockFetcher(42)
    expect(result.eventCommands).toBeDefined()
    expect(result.eventCommands).toHaveLength(1)
    expect(result.labelMap.get(100)).toBe(0)
  })
})
```

跑 fail:`pnpm -F @type-pal/game test scene-system -v` 期望 FAIL(`eventCommands` 不在 SceneAssets)。

- [ ] **Step 3: shared/src/resources.ts 加 SceneAssets 字段**

```ts
import type { EventFile } from './events.js'  // 若 EventFile 已在 shared

export interface SceneAssets {
  sceneId: number
  tilemap: Tilemap
  palette: Palette
  eventObjects: SceneEventObject[]
  npcSprites: Map<number, SpriteAsset>
  /** P3 T1:lazy load 后该 scene events */
  eventCommands: EventFile['commands']
  /** P3 T1:label id → command index */
  labelMap: Map<number, number>
}
```

(若 SceneAssets 现在 loader.ts 而非 shared,移到 shared。)

- [ ] **Step 4: loader.ts SceneFetcher 实现内加 events fetch + labelMap build**

找到 `createSceneFetcher`(或类似 factory)。在 Promise.all 里加 events fetch:

```ts
const padded = sceneId.toString().padStart(3, '0')
const [tilemapJson, paletteJson, sceneJson, eventsJson] = await Promise.all([
  fetchJson<Tilemap>(`${BASE}/data/tilemap/${sceneId}.json`),
  fetchJson<Palette>(`${BASE}/data/palette/0.json`),
  fetchJson<SceneObjects>(`${BASE}/data/scene/${sceneId}.json`),
  fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
])

// build labelMap
const labelMap = new Map<number, number>()
eventsJson.commands.forEach((cmd, idx) => {
  if (cmd.op === 'label' && typeof cmd.operands?.[0] === 'number') {
    labelMap.set(cmd.operands[0] as number, idx)
  }
})

return {
  sceneId,
  tilemap: tilemapJson,
  palette: paletteJson,
  eventObjects: sceneJson.eventObjects,
  npcSprites: /* 既有 */,
  eventCommands: eventsJson.commands,
  labelMap,
}
```

- [ ] **Step 5: scene-system 接 SceneAssets.eventCommands + labelMap**

找 `loadScene(sceneId)` 实现内现 events 注入逻辑。改:

```ts
// scene-system.ts loadScene 内
const newAssets = await sceneFetcher(sceneId)
gs.scene = sceneId
gs.events = newAssets.eventCommands     // P3 T1 新
gs.labelMap = newAssets.labelMap        // P3 T1 新
// ...其余既有...
```

(具体 hook 位置看现 scene-system 真实结构;若 EventSystem 维护 events state 而非 GameState,改 EventSystem.bindScene(assets)。)

- [ ] **Step 6: 跑 test pass**

```bash
pnpm -F @type-pal/game test scene-system -v
```

预期 PASS。

- [ ] **Step 7: 跑全 L1 verify 不破其他测**

```bash
pnpm -w check 2>&1 | tail -10
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/resources.ts \
  packages/game/src/assets/loader.ts \
  packages/game/src/core/scene-system.ts \
  packages/game/src/core/scene-system.test.ts
git commit -m "feat(M4.P3.T1): SceneAssets 扩 eventCommands+labelMap lazy load(修 M3.5 ⚠️ a9 #8)"
```

---

## Task P3.T2: setPalette opcode 真 handler(修 M3.5 ⚠️ palette 跨 scene)

**Files:**
- Modify: `packages/pal-extract/src/events/{opcodes,disasm,recompile}.ts`(具名 setPalette)
- Modify: `packages/game/src/core/event-system.ts`(handler)
- Modify: `packages/game/src/assets/loader.ts`(fetchPalette helper)
- Test: `packages/game/src/core/event-system.test.ts`

**Parallel with:** P3.T1, P3.T3, P3.T4, P3.T5

- [ ] **Step 1: grep sdlpal setPalette opcode 真值**

```bash
grep -rn -E "PAL_SetPalette|case 0x" reference/sdlpal/script.c | head -30
```

找 opcode num + operand 语义(通常 operand[0] = paletteIndex,operand[1] = useNight)。

- [ ] **Step 2: 写 failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createEventSystem } from './event-system.js'

describe('setPalette opcode', () => {
  it('switches current palette and triggers re-render', async () => {
    const setPaletteCmd = { op: 'setPalette', operands: [3, 0] } as any
    const fetchPalette = vi.fn().mockResolvedValue([[0, 0, 0], [255, 255, 255]] as any)
    const gs: any = { palette: [] as any[], scene: 1 }
    const es = createEventSystem(gs, { fetchPalette })
    await es.runCommand(setPaletteCmd)
    expect(fetchPalette).toHaveBeenCalledWith(3)
    expect(gs.palette).toHaveLength(2)
  })
})
```

(签名按 现 event-system 真实 API 调整;若现是 `runStep(ip)` 等不同 API,改 test 适配。)

跑 fail。

- [ ] **Step 3: opcodes.ts 加 setPalette 具名**

```ts
// 按 Step 1 grep 出的 opcode num(假设 0x10A)
[0x10A, {
  name: 'setPalette',
  operands: ['paletteIndex', 'useNight'],
  description: 'sdlpal PAL_SetPalette(paletteIndex, useNight)',
}],
```

- [ ] **Step 4: disasm.ts + recompile.ts emit/parse setPalette**

```ts
// disasm.ts
case 'setPalette':
  return { op: 'setPalette', operands: [args[0], args[1]] }

// recompile.ts
case 'setPalette':
  emitOpcode(0x10A, [cmd.operands[0], cmd.operands[1], 0, 0])
  break
```

- [ ] **Step 5: events round-trip verify**

```bash
pnpm -F @type-pal/pal-extract test round-trip -v
```

预期:全 43503 instruction byte-level round-trip 仍通过。

- [ ] **Step 6: game runtime event-system.ts 加 setPalette handler**

```ts
async function handleSetPalette(cmd: SetPaletteCmd, ctx: HandlerCtx) {
  const newPalette = await ctx.fetchPalette(cmd.operands[0])
  ctx.gs.palette = newPalette
  ctx.markPaletteDirty?.()
}

// register
case 'setPalette': return handleSetPalette(cmd, ctx)
```

loader.ts 加:

```ts
export async function fetchPalette(id: number): Promise<Palette> {
  return fetchJson<Palette>(`${BASE}/data/palette/${id}.json`)
}
```

- [ ] **Step 7: 跑 test pass**

```bash
pnpm -F @type-pal/game test event-system -v
```

- [ ] **Step 8: Commit**

```bash
git add packages/pal-extract/src/events/opcodes.ts \
  packages/pal-extract/src/events/disasm.ts \
  packages/pal-extract/src/events/recompile.ts \
  packages/game/src/core/event-system.ts \
  packages/game/src/core/event-system.test.ts \
  packages/game/src/assets/loader.ts
git commit -m "feat(M4.P3.T2): setPalette opcode 真 handler(修 M3.5 ⚠️ palette 跨 scene)"
```

---

## Task P3.T3: 全 ~120 mapNum tileset dump

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`
- Modify: `packages/game/src/assets/loader.ts`(可能要 scene→mapNum→tilemap 链)

**Parallel with:** P3.T1, P3.T2, P3.T4, P3.T5
**Blocks:** P3.T7

- [ ] **Step 1: grep 现 SLICE_SCENE_IDS + tileset dump 流程**

```bash
grep -n "SLICE_SCENE_IDS\|slicedScenes\|parseMap" packages/pal-extract/src/cli.ts
```

(现 `SLICE_SCENE_IDS = [1, 14, 15, 16, 17]`,for 每 sliceId 解 scene → mapNum → parseMap → dump tile。)

- [ ] **Step 2: 改 dedup by mapNum**

```ts
// M4 P3 T3:全 295 scene → unique mapNum 集合
const allSceneCount = sss.scenes.length
const uniqueMapNums = new Set<number>()
for (let sliceId = 1; sliceId < allSceneCount; sliceId++) {
  const scene = sss.scenes[sliceId]
  if (!scene) continue
  if (scene.mapNum >= mapChunkCount) {
    console.warn(`[pal-extract] scene ${sliceId} mapNum=${scene.mapNum} >= MAP chunks ${mapChunkCount}, skip`)
    continue
  }
  uniqueMapNums.add(scene.mapNum)
}
console.log(`[pal-extract] full scope: ${allSceneCount} scenes, ${uniqueMapNums.size} unique mapNums`)

for (const mapNum of uniqueMapNums) {
  const mapBytes = decompressYj2(readChunk(mapMkf, mapNum))
  const gopBytes = readChunk(gopMkf, mapNum)
  const mapResult = parseMap(mapBytes, gopBytes)

  const tilesetFiles: string[] = []
  for (const tile of mapResult.tiles) {
    writeBinary(imageWorldTilesetPath(mapNum, tile.index), tile.pngBytes)
    tilesetFiles.push(`world/tileset/map-${mapNum}/tile-${tile.index.toString().padStart(4, '0')}.png`)
  }
  // P3 T3: tilemap JSON 按 mapNum-keyed
  writeJson(dataSubdirPath('tilemap', String(mapNum)), {
    ...mapResult.tilemap,
    tilesetFiles,
    tilesetImage: `world/tileset/map-${mapNum}/tile-*.png`,
  })
}
console.log(`[pal-extract] tilesets written: ${uniqueMapNums.size} unique mapNums`)
```

- [ ] **Step 3: 删 SLICE_SCENE_IDS tileset 旧循环**

per-scene 数据(scene-N.json + sprite union)放 P3 T5/T4 仍按 sceneId 循环;tileset dump 段改为按 mapNum loop。

- [ ] **Step 4: loader.ts 改 scene→mapNum→tilemap 链**

```ts
// loader.ts loadAll 内
const sceneJson = await fetchJson<SceneObjects & { mapNum: number }>(`${BASE}/data/scene/${sceneId}.json`)
const tilemapJson = await fetchJson<Tilemap>(`${BASE}/data/tilemap/${sceneJson.mapNum}.json`)
```

(SceneObjects 扩 mapNum 字段在 P3 T5,T3 实施时若 P3 T5 还没做 → P3 T5 必须先做或一起做。**实施建议**:T3 + T5 合并实施或调换顺序。)

- [ ] **Step 5: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep -E "(tilesets|scope)"
ls data/extracted/data/tilemap/ | wc -l
ls data/extracted/images/world/tileset/ | head -5
```

预期:tilemap JSON ~120 个;tileset 目录 map-N 子目录 ~120 个。

- [ ] **Step 6: 跑 baseline test + 全 L1**

```bash
pnpm -w check 2>&1 | tail -10
```

预期:tilemap-baseline.test.ts 5 个原切片仍 0 diff(baseline test 改用 scene.mapNum 找 tile)。

baseline test 可能要小改(从 `tilemap-{sceneId}.json` → `tilemap/{mapNum}.json`)。

- [ ] **Step 7: 跑 L2 verify**

```bash
pnpm -F @type-pal/game e2e 2>&1 | tail -10
```

预期:30+1 仍 0 diff。

- [ ] **Step 8: Commit**

```bash
git add packages/pal-extract/src/cli.ts \
  packages/game/src/assets/loader.ts \
  packages/pal-extract/src/__tests__/tilemap-baseline.test.ts
git commit -m "feat(M4.P3.T3): 全 ~120 mapNum tileset dump + tilemap 按 mapNum keyed"
```

---

## Task P3.T4: MGO 全量 union dump

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`

**Parallel with:** P3.T1, P3.T2, P3.T3, P3.T5

- [ ] **Step 1: 改 spriteIds union scope 从切片 → 全 295**

旧 cli.ts(M3.5 T4):
```ts
const spriteIds = new Set<number>([partyLeader.spriteNum])
for (const sliced of slicedScenes) {
  for (const eo of sliced.sceneObjects.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
}
```

新:
```ts
// M4 P3 T4: 全 295 scene EO sprite union
const spriteIds = new Set<number>()
for (const role of playerRoles.roles) {
  if (role.spriteNum > 0) spriteIds.add(role.spriteNum)
}
for (let sliceId = 1; sliceId < sss.scenes.length; sliceId++) {
  const scene = sss.scenes[sliceId]
  if (!scene) continue
  const sceneObjs = dumpScene(sliceId, sss.scenes, sss.eventObjects)
  for (const eo of sceneObjs.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
}
console.log(`[pal-extract] sprite union: ${spriteIds.size} unique spriteIds`)
```

(若 dumpScene 重复调用慢,hoist 成 sceneObjsBySliceId Map 给 T5 复用。)

- [ ] **Step 2: 删 SLICE_SCENE_IDS spriteIds 收窄**

旧 SLICE_SCENE_IDS 引用只剩 P3 T5 scene-N.json 循环,T4 不再用。

- [ ] **Step 3: extractCharacterSprites 跑全 union**

逻辑不变,spriteIds 大了:

```ts
for (const id of spriteIds) {
  if (id >= mgoChunkCount) {
    console.warn(`sprite ${id} >= MGO chunks, skip`)
    spriteIds.delete(id)
    continue
  }
  // YJ2 decompress + extractSprite 同 M3.5
}
```

性能:数千 chunk YJ2 decompress 估 ~1-2 分钟。若慢可 `Promise.all` 分批,M4 简版串行接受。

- [ ] **Step 4: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep "sprite union"
find data/extracted/images/world/npc -mindepth 1 -maxdepth 1 -type d | wc -l
find data/extracted/data/sprite -name '*.json' | wc -l
```

预期:NPC 目录数千,sprite-N.json 数千。

- [ ] **Step 5: 跑全 L1**

```bash
pnpm -w check 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/src/cli.ts
git commit -m "feat(M4.P3.T4): MGO 全量 union sprite dump(全 295 scene EO+roles)"
```

---

## Task P3.T5: 全 295 scene-N.json dump

**Files:**
- Modify: `packages/pal-extract/src/resources/parsers/scenes.ts`
- Modify: `packages/pal-extract/src/cli.ts`
- Modify: `packages/shared/src/resources.ts`
- Test: `packages/pal-extract/src/resources/parsers/__tests__/scenes.test.ts`

**Parallel with:** P3.T1-T4
**Blocks:** P3.T6

- [ ] **Step 1: 写 failing test for SceneObjects.mapNum**

加 case 到 scenes.test.ts:

```ts
it('scene-N.json contains mapNum from SCENE struct', () => {
  const mockScenes = [null, { mapNum: 12, eventObjectIndex: 0, eventObjectCount: 2 }]
  const mockEvents = [{ spriteNum: 13 }, { spriteNum: 14 }]
  const result = dumpScene(1, mockScenes as any, mockEvents as any)
  expect(result.mapNum).toBe(12)
  expect(result.eventObjects).toHaveLength(2)
})
```

跑 fail。

- [ ] **Step 2: shared resources.ts 加 mapNum**

```ts
export interface SceneObjects {
  sceneId: number
  mapNum: number          // P3 T5 新
  eventObjects: SceneEventObject[]
  // ...既有...
}
```

- [ ] **Step 3: scenes.ts dumpScene 加 mapNum**

```ts
export function dumpScene(sceneId, scenes, eventObjects): SceneObjects {
  const scene = scenes[sceneId]
  // ...既有逻辑...
  return {
    sceneId,
    mapNum: scene.mapNum,   // P3 T5 新
    eventObjects: filteredEOs,
  }
}
```

- [ ] **Step 4: cli.ts 改 SLICE → 全 295 scene-N.json dump**

```ts
// M4 P3 T5: 全 295 scene-N.json
let sceneWritten = 0
for (let sliceId = 1; sliceId < sss.scenes.length; sliceId++) {
  const scene = sss.scenes[sliceId]
  if (!scene) continue
  const sceneObjs = dumpScene(sliceId, sss.scenes, sss.eventObjects)
  writeJson(dataSubdirPath('scene', String(sliceId)), sceneObjs)
  sceneWritten++
}
console.log(`[pal-extract] scenes written: ${sceneWritten}`)
```

- [ ] **Step 5: 跑 test pass**

```bash
pnpm -F @type-pal/pal-extract test scenes -v
```

- [ ] **Step 6: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep "scenes written"
ls data/extracted/data/scene/ | wc -l   # 期望 ~295
cat data/extracted/data/scene/14.json | head -20
```

- [ ] **Step 7: 跑 L2 verify scene 1 等仍正常**

```bash
pnpm -F @type-pal/game e2e a4 a5 a7 2>&1 | tail -10
```

预期:既有 scene 切换 spec 0 diff。

- [ ] **Step 8: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/scenes.ts \
  packages/pal-extract/src/resources/parsers/__tests__/scenes.test.ts \
  packages/pal-extract/src/cli.ts \
  packages/shared/src/resources.ts
git commit -m "feat(M4.P3.T5): 全 295 scene-N.json dump + SceneObjects 加 mapNum"
```

---

## Task P3.T6: dev panel scene picker 5 → 295 entries

**Files:**
- Modify: `packages/game/src/data/scene-jumps.json`
- Modify: `packages/game/src/shell/dev-panel.ts`

**Parallel with:** P3.T7, P3.T8
**Blocks by:** P3.T5

- [ ] **Step 1: 用 pal-extract scene-N.json 真值生成 scene-jumps.json**

写一次性脚本 inline:

```bash
pnpm tsx -e "
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const dir = 'data/extracted/data/scene'
const files = readdirSync(dir).filter(f => f.endsWith('.json'))
const entries = files.map(f => {
  const sceneId = parseInt(f.replace('.json', ''))
  const data = JSON.parse(readFileSync(resolve(dir, f), 'utf8'))
  return {
    sceneId,
    label: \`scene-\${sceneId} (map-\${data.mapNum})\`,
    mapNum: data.mapNum,
    party: { x: 64, y: 64 },
  }
}).sort((a, b) => a.sceneId - b.sceneId)
writeFileSync('packages/game/src/data/scene-jumps.json', JSON.stringify(entries, null, 2))
console.log('wrote', entries.length, 'entries')
"
```

预期 wrote 295 entries。

- [ ] **Step 2: dev-panel.ts scene picker UI 扩**

现 dev-panel(M3.5 T17)是固定 5 entry list。改为 input + filter:

```ts
// dev-panel.ts scene picker 段
const sceneInput = document.createElement('input')
sceneInput.type = 'text'
sceneInput.placeholder = 'scene id / mapNum (1-295)'
sceneInput.style.width = '200px'

const sceneList = document.createElement('div')
sceneList.style.maxHeight = '200px'
sceneList.style.overflowY = 'auto'

function renderSceneList(filter: string) {
  sceneList.innerHTML = ''
  const filtered = sceneJumps.filter((e) =>
    String(e.sceneId).includes(filter)
    || e.label.includes(filter)
    || String(e.mapNum).includes(filter),
  ).slice(0, 30)
  for (const entry of filtered) {
    const btn = document.createElement('button')
    btn.textContent = entry.label
    btn.onclick = () => applySceneJump(entry)
    sceneList.appendChild(btn)
  }
}

sceneInput.addEventListener('input', () => renderSceneList(sceneInput.value))
renderSceneList('')
```

- [ ] **Step 3: dev server 手动 verify**

```bash
pnpm -F @type-pal/game dev &
sleep 3
# 浏览器按 B 开 dev panel,verify scene picker input + filter + 跳 scene 295
# kill %1 2>/dev/null
```

- [ ] **Step 4: 跑 L2 verify**

```bash
pnpm -F @type-pal/game e2e c6 2>&1 | tail -10
```

预期 PASS;若 c6 baseline 依赖固定 5 entry → 重生 baseline。

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/data/scene-jumps.json \
  packages/game/src/shell/dev-panel.ts
git commit -m "feat(M4.P3.T6): dev panel scene picker 扩 5 → 295 entries(input + filter)"
```

---

## Task P3.T7: sdlpal --dump-map 全 295 自动化 diff

**Files:**
- Create: `packages/pal-extract/scripts/sdlpal-dump-map-all.ts`
- Create: `docs/M4_KNOWN_DEVIATIONS.md`

**Parallel with:** P3.T6, P3.T8
**Blocks by:** P3.T3

- [ ] **Step 1: 写 driver 脚本(用 execFileSync 防 shell injection)**

创建 `packages/pal-extract/scripts/sdlpal-dump-map-all.ts`:

```ts
#!/usr/bin/env tsx
/**
 * M4 P3 T7:全 295 scene sdlpal --dump-map 与 render-tilemap.ts 对照 pixel diff。
 *
 * 流程:
 *  1. 读 data/extracted/data/scene/*.json 取全 sceneId + mapNum 列表
 *  2. 每 sceneId:
 *     a. sdlpal-classic --dump-map {mapNum} --out build/sdlpal-baseline/maps/{mapNum}.png
 *     b. tsx scripts/render-tilemap.ts {sceneId} --out build/m4-maps/{sceneId}.png
 *     c. pixelmatch 两图 → pass / fail
 *  3. 失败 sceneId 进 docs/M4_KNOWN_DEVIATIONS.md
 *
 * 注意:execFileSync(不用 execSync)防 shell injection。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const SDLPAL = 'build/sdlpal-classic/sdlpal-classic'
const BASELINE_DIR = 'build/sdlpal-baseline/maps'
const OUR_DIR = 'build/m4-maps'
const DIFF_DIR = 'build/m4-maps-diff'

for (const d of [BASELINE_DIR, OUR_DIR, DIFF_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

const sceneDir = 'data/extracted/data/scene'
const sceneFiles = readdirSync(sceneDir).filter((f) => f.endsWith('.json'))

interface Report {
  sceneId: number
  mapNum: number
  status: 'pass' | 'fail' | 'sdlpal-fail' | 'render-fail'
  diff?: number
  err?: string
}

const reports: Report[] = []
const baselineCache = new Set<number>()

for (const f of sceneFiles) {
  const sceneId = parseInt(f.replace('.json', ''))
  const sceneJson = JSON.parse(readFileSync(resolve(sceneDir, f), 'utf8'))
  const mapNum: number = sceneJson.mapNum
  const baselinePath = resolve(BASELINE_DIR, `${mapNum}.png`)
  const ourPath = resolve(OUR_DIR, `${sceneId}.png`)

  // 1. sdlpal baseline (dedupe by mapNum)
  try {
    if (!baselineCache.has(mapNum)) {
      execFileSync(SDLPAL, ['--dump-map', String(mapNum), '--out', baselinePath], {
        stdio: 'pipe', timeout: 30000,
      })
      baselineCache.add(mapNum)
    }
  } catch (err: any) {
    reports.push({ sceneId, mapNum, status: 'sdlpal-fail', err: String(err.message ?? err) })
    continue
  }

  // 2. our render
  try {
    execFileSync('pnpm', ['tsx', 'packages/pal-extract/scripts/render-tilemap.ts',
      String(sceneId), '--out', ourPath], { stdio: 'pipe', timeout: 30000 })
  } catch (err: any) {
    reports.push({ sceneId, mapNum, status: 'render-fail', err: String(err.message ?? err) })
    continue
  }

  // 3. diff
  try {
    const baseline = PNG.sync.read(readFileSync(baselinePath))
    const ours = PNG.sync.read(readFileSync(ourPath))
    if (baseline.width !== ours.width || baseline.height !== ours.height) {
      reports.push({
        sceneId, mapNum, status: 'fail',
        err: `dim mismatch ${baseline.width}x${baseline.height} vs ${ours.width}x${ours.height}`,
      })
      continue
    }
    const diff = new PNG({ width: baseline.width, height: baseline.height })
    const numDiff = pixelmatch(baseline.data, ours.data, diff.data, baseline.width, baseline.height, {
      threshold: 0.1,
    })
    if (numDiff > 100) {
      writeFileSync(resolve(DIFF_DIR, `${sceneId}.png`), PNG.sync.write(diff))
      reports.push({ sceneId, mapNum, status: 'fail', diff: numDiff })
    } else {
      reports.push({ sceneId, mapNum, status: 'pass', diff: numDiff })
    }
  } catch (err: any) {
    reports.push({ sceneId, mapNum, status: 'render-fail', err: String(err.message ?? err) })
  }
}

const pass = reports.filter((r) => r.status === 'pass').length
const fail = reports.filter((r) => r.status === 'fail').length
const sdlpalFail = reports.filter((r) => r.status === 'sdlpal-fail').length
const renderFail = reports.filter((r) => r.status === 'render-fail').length

console.log(`[M4 P3 T7] total ${reports.length} | pass ${pass} | fail ${fail} | sdlpal-fail ${sdlpalFail} | render-fail ${renderFail}`)

writeFileSync('build/m4-map-diff-report.json', JSON.stringify(reports, null, 2))

const failReports = reports.filter((r) => r.status !== 'pass')
const mdLines = [
  '# M4 known deviations',
  '',
  `> M4 P3 T7 全 295 scene sdlpal --dump-map vs render-tilemap 自动化 diff 结果。`,
  '',
  `**Summary**: total ${reports.length} | pass ${pass} | fail ${fail} | sdlpal-fail ${sdlpalFail} | render-fail ${renderFail}`,
  '',
  '## 失败 scene 清单',
  '',
  '| sceneId | mapNum | status | diff | err |',
  '|---|---|---|---|---|',
  ...failReports.map((r) =>
    `| ${r.sceneId} | ${r.mapNum} | ${r.status} | ${r.diff ?? '-'} | ${r.err ?? '-'} |`),
  '',
  '## 处理建议',
  '- `fail`(像素 diff > 100):tilemap 渲染 bug,留 M5/M7 排查',
  '- `sdlpal-fail`:sdlpal --dump-map 该 mapNum 崩;可能 mapNum 数据异常,record skip',
  '- `render-fail`:render-tilemap.ts 崩;查 scene-N.json 数据是否完整',
]
writeFileSync('docs/M4_KNOWN_DEVIATIONS.md', mdLines.join('\n'))
console.log(`[M4 P3 T7] failures: see docs/M4_KNOWN_DEVIATIONS.md`)
```

- [ ] **Step 2: 装 pixelmatch + pngjs(若未装)**

```bash
pnpm -F @type-pal/pal-extract add -D pixelmatch pngjs @types/pngjs @types/pixelmatch
```

- [ ] **Step 3: 跑全 295 自动化(~十几分钟)**

```bash
cd /Users/zhangxu/illegal/type-pal
pnpm tsx packages/pal-extract/scripts/sdlpal-dump-map-all.ts
```

预期:跑完输出 summary;`docs/M4_KNOWN_DEVIATIONS.md` 生成;`build/m4-maps/` 有 295 PNG。

- [ ] **Step 4: 检查 pass 率**

```bash
cat build/m4-map-diff-report.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
from collections import Counter
c = Counter(r['status'] for r in data)
total = len(data)
for k, v in c.items():
    print(f'  {k}: {v} ({100*v/total:.1f}%)')
"
```

期望 pass ≥ 90%。若 < 90% → debug 主因(如某类 tile 渲染 bug)。

- [ ] **Step 5: Commit script + report MD**

verify `.gitignore` 含 `build/m4-maps*`(若未含,加上):

```bash
echo "build/m4-maps*" >> .gitignore
git add packages/pal-extract/scripts/sdlpal-dump-map-all.ts \
  docs/M4_KNOWN_DEVIATIONS.md \
  packages/pal-extract/package.json \
  .gitignore
git commit -m "feat(M4.P3.T7): sdlpal --dump-map 全 295 自动化 diff + KNOWN_DEVIATIONS"
```

---

## Task P3.T8: a9 contact→battle 端到端 spec unskip + pass

**Files:**
- Modify: `packages/game/e2e/scene/a9-encounter.spec.ts`

**Parallel with:** P3.T6, P3.T7
**Blocks by:** P3.T1

- [ ] **Step 1: 看现 a9 spec 跟 skip 原因**

```bash
cat packages/game/e2e/scene/a9-encounter.spec.ts
```

记录 skip 原因(M3.5 ⚠️ #8:scene events lazy load 缺 → loadScene 后 mode 不切)。

- [ ] **Step 2: 去 test.skip → test**

把文件内 `test.skip(...)` 改为 `test(...)`,保留原 spec 逻辑。

- [ ] **Step 3: 跑 spec verify pass**

```bash
pnpm -F @type-pal/game e2e a9 2>&1 | tail -20
```

预期 PASS(P3 T1 SceneAssets.eventCommands lazy load 后该 spec 应天然过)。

- [ ] **Step 4: 若 fail → debug**

可能原因:
- P3 T1 注入路径未完全打通到 EventSystem
- contact monster runScript 时 labelMap lookup 失败

调试:

```bash
# 在 spec 内加 console log
# page.evaluate(() => console.log('events len:', window.gs?.events?.length, 'labelMap size:', window.gs?.labelMap?.size))
```

修 → 跑 → PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/game/e2e/scene/a9-encounter.spec.ts
git commit -m "feat(M4.P3.T8): a9 contact→battle 端到端 spec unskip + pass(M3.5 ⚠️ #8 修)"
```

---

# Phase 4:字体真渲染

**目标**:Unifont CN 真字形 + L2 baseline 全部重生 + b* spec 切 sdlpal real baseline。

**前置**:P2 完工(T1 STUFF 字模 verify 给 P4 T1 用)。

---

## Task P4.T1: STUFF 字模 verify 决策 + Unifont BDF ship

**Files:**
- Create: `data/raw/unifont-cn.bdf`(build asset)
- Modify: `data/raw/README.md`(若需说明)

**Parallel with:** —
**Blocks by:** P2.T3
**Blocks:** P4.T2

- [ ] **Step 1: 看 P2 T3 STUFF 字模结果**

```bash
cat data/extracted/data/stuff-summary.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    if c.get('guessType') == 'font':
        print(f'  chunk {c[\"chunkIndex\"]}: {c[\"glyphCount\"]} glyphs ({c[\"size\"]} bytes)')
"
ls data/extracted/data/stuff-font-chunk*.json 2>/dev/null
```

- [ ] **Step 2: 决策**

- 若有 font chunk 且 glyph count cover GBK(~6700+) → 设计仍推 **B = 仍用 Unifont**(D11 已定 + sdlpal 同源 + license 干净)
- 若无 font chunk → confirm D11 假设 → 纯 Unifont

实施过程在 plan 末「实施过程发现」段记录 STUFF 真实是否有字模 + 决策依据。

- [ ] **Step 3: 下载 Unifont CN 16×16 BDF**

```bash
mkdir -p data/raw
curl -L "https://unifoundry.com/pub/unifont/unifont-15.1.05/font-builds/unifont_jp-15.1.05.bdf.gz" -o /tmp/unifont.bdf.gz
gunzip /tmp/unifont.bdf.gz
mv /tmp/unifont.bdf data/raw/unifont-cn.bdf
ls -lh data/raw/unifont-cn.bdf
```

(URL 实施时按 unifoundry 最新版调整。`unifont_jp` cover GBK 完整;若有更准的 CN 变体优先。)

- [ ] **Step 4: 决策入 git or 不入**

GNU Unifont OFL license **可入 git**(虽 ~16MB)。两选:
- A:入 git,确保 dev/agent 一致(推荐)
- B:不入 git,在 `data/raw/README.md` 加下载指引

实施时选一,commit message 记。

- [ ] **Step 5: Commit**

若选 A:
```bash
git add data/raw/unifont-cn.bdf
git commit -m "feat(M4.P4.T1): Unifont CN BDF ship 作 build asset(D11 / OFL 入 git)"
```

若选 B:
```bash
# 编辑 data/raw/README.md 加下载段
git add data/raw/README.md
git commit -m "docs(M4.P4.T1): Unifont CN BDF 下载指引(本机存,不入 git)"
```

---

## Task P4.T2: BDF → JSON 预处理脚本(pal-extract 内)

**Files:**
- Create: `packages/pal-extract/src/font/bdf-to-json.ts`
- Create: `packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Parallel with:** —
**Blocks by:** P4.T1
**Blocks:** P4.T3

- [ ] **Step 1: 写 failing test**

创建 `packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseBdf } from '../bdf-to-json.js'

describe('parseBdf', () => {
  it('extracts 16x16 glyph from BDF fragment', () => {
    const bdf = `STARTFONT 2.1
SIZE 16 75 75
STARTCHAR U+4E2D
ENCODING 20013
SWIDTH 500 0
DWIDTH 16 0
BBX 16 16 0 -2
BITMAP
0000
0000
0FF0
0FF0
0FF0
0FF0
FFFE
8FF2
8FF2
8FF2
FFFE
0FF0
0FF0
0FF0
0FF0
0000
ENDCHAR
ENDFONT`
    const glyphs = parseBdf(bdf)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]!.codepoint).toBe(20013)
    expect(glyphs[0]!.width).toBe(16)
    expect(glyphs[0]!.height).toBe(16)
    expect(glyphs[0]!.bitmap).toHaveLength(32)
    expect(glyphs[0]!.bitmap[0]).toBe(0x00)
    expect(glyphs[0]!.bitmap[4]).toBe(0x0F)
    expect(glyphs[0]!.bitmap[5]).toBe(0xF0)
  })

  it('parses ASCII 8-wide glyph', () => {
    const bdf = `STARTFONT 2.1
STARTCHAR U+0041
ENCODING 65
DWIDTH 8 0
BBX 8 16 0 -2
BITMAP
00
00
00
18
24
42
42
7E
42
42
42
42
00
00
00
00
ENDCHAR
ENDFONT`
    const glyphs = parseBdf(bdf)
    expect(glyphs[0]!.codepoint).toBe(65)
    expect(glyphs[0]!.width).toBe(8)
    expect(glyphs[0]!.bitmap).toHaveLength(16)
  })
})
```

跑 fail:`pnpm -F @type-pal/pal-extract test bdf-to-json -v`。

- [ ] **Step 2: 写 parseBdf 实现**

创建 `packages/pal-extract/src/font/bdf-to-json.ts`:

```ts
/**
 * BDF → JSON glyph 表预处理(M4 P4 T2)。
 * 输入:GNU Unifont CN BDF
 * 输出:Map<codepoint, BdfGlyph>(P4 T3 game runtime 加载)
 */

export interface BdfGlyph {
  codepoint: number
  width: number   // 8 (ASCII) or 16 (CJK)
  height: number  // 16
  bitmap: Uint8Array
}

export function parseBdf(text: string): BdfGlyph[] {
  const glyphs: BdfGlyph[] = []
  const lines = text.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!.trim()
    if (line.startsWith('STARTCHAR')) {
      let codepoint = -1
      let width = 16
      let height = 16
      let bitmapStart = -1

      while (i < lines.length) {
        const l = lines[i]!.trim()
        if (l.startsWith('ENCODING')) codepoint = parseInt(l.split(/\s+/)[1]!)
        else if (l.startsWith('DWIDTH')) width = parseInt(l.split(/\s+/)[1]!)
        else if (l.startsWith('BBX')) {
          const parts = l.split(/\s+/)
          width = parseInt(parts[1]!)
          height = parseInt(parts[2]!)
        }
        else if (l === 'BITMAP') {
          bitmapStart = i + 1
          break
        }
        i++
      }

      const bytesPerRow = Math.ceil(width / 8)
      const bitmap = new Uint8Array(bytesPerRow * height)
      let rowIdx = 0
      i = bitmapStart
      while (i < lines.length && rowIdx < height) {
        const row = lines[i]!.trim()
        if (row === 'ENDCHAR') break
        for (let b = 0; b < bytesPerRow; b++) {
          const hex = row.substr(b * 2, 2)
          bitmap[rowIdx * bytesPerRow + b] = parseInt(hex, 16) || 0
        }
        rowIdx++
        i++
      }
      while (i < lines.length && lines[i]!.trim() !== 'ENDCHAR') i++

      if (codepoint > 0) {
        glyphs.push({ codepoint, width, height, bitmap })
      }
    }
    i++
  }
  return glyphs
}

export interface GlyphsJson {
  count: number
  glyphs: { codepoint: number; width: number; height: number; bitmapBase64: string }[]
}

export function glyphsToJson(glyphs: BdfGlyph[]): GlyphsJson {
  return {
    count: glyphs.length,
    glyphs: glyphs.map((g) => ({
      codepoint: g.codepoint,
      width: g.width,
      height: g.height,
      bitmapBase64: Buffer.from(g.bitmap).toString('base64'),
    })),
  }
}
```

- [ ] **Step 3: 跑 test pass**

```bash
pnpm -F @type-pal/pal-extract test bdf-to-json -v
```

预期 2 pass。

- [ ] **Step 4: cli.ts 加 font stage**

```ts
// M4 P4 T2: BDF → JSON glyph 表
import { existsSync, readFileSync } from 'node:fs'
import { parseBdf, glyphsToJson } from './font/bdf-to-json.js'

const BDF_PATH = resolve(RAW, 'unifont-cn.bdf')
if (existsSync(BDF_PATH)) {
  console.log('[pal-extract] BDF → JSON font glyphs …')
  const bdfText = readFileSync(BDF_PATH, 'utf8')
  const glyphs = parseBdf(bdfText)
  writeJson(resolve(OUT, 'data', 'font', 'glyphs.json'), glyphsToJson(glyphs))
  console.log(`[pal-extract] font glyphs written: ${glyphs.length}`)
} else {
  console.warn('[pal-extract] unifont-cn.bdf 缺,跳过 font (P4 T1 决策)')
}
```

(若 P4 T1 选 B 不入 git,这里 ship 缺时 warn 不抛错。)

- [ ] **Step 5: 跑 pnpm extract verify**

```bash
rm -rf data/extracted
pnpm extract 2>&1 | grep font
ls -lh data/extracted/data/font/glyphs.json
```

预期:几十 MB JSON。

**Size 优化**(若 > 50MB 影响 dev server):写一次性脚本扫 `data/extracted/lookup/strings.json` + `events/*.json` 收集字符集 union,glyphsToJson 只输出 used subset:

```ts
// cli.ts 加 used-codepoint scan (option,if size 太大)
const usedCp = new Set<number>()
// scan strings.json + events 收集 codepoint
// glyphs.filter(g => usedCp.has(g.codepoint))
```

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/src/font/bdf-to-json.ts \
  packages/pal-extract/src/font/__tests__/bdf-to-json.test.ts \
  packages/pal-extract/src/cli.ts
git commit -m "feat(M4.P4.T2): BDF → JSON 预处理(Unifont CN glyph 表)"
```

---

## Task P4.T3: present/font.ts 真 glyph blit 重写

**Files:**
- Modify: `packages/game/src/present/font.ts`
- Modify: `packages/game/src/shell/bootstrap.ts`
- Modify: `packages/game/src/assets/loader.ts`(fetchGlyphs helper)
- Test: `packages/game/src/present/font.test.ts`

**Parallel with:** —
**Blocks by:** P4.T2
**Blocks:** P4.T4, P4.T5

- [ ] **Step 1: 看现 font.ts 8×16 占位 impl**

```bash
cat packages/game/src/present/font.ts
```

记录现 API(`renderText(buf, x, y, text, fgColor)` 之类)。

- [ ] **Step 2: 写 failing test**

创建 / 改 `packages/game/src/present/font.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderText, measureText, type Glyph, type GlyphTable } from './font.js'

const mockGlyphs: GlyphTable = {
  has: (cp: number) => cp === 65 || cp === 20013,
  get: (cp: number): Glyph | undefined => {
    if (cp === 65) {
      const b = new Uint8Array(16)
      b[0] = 0xFF
      return { width: 8, height: 16, bitmap: b }
    }
    if (cp === 20013) {
      const b = new Uint8Array(32)
      b[0] = 0xFF; b[1] = 0xFF
      return { width: 16, height: 16, bitmap: b }
    }
    return undefined
  },
}

describe('renderText', () => {
  it('blits ASCII A top row to indexed buffer', () => {
    const buf = new Uint8Array(320 * 200)
    renderText(buf, 320, 0, 0, 'A', 0xFF, mockGlyphs)
    for (let i = 0; i < 8; i++) {
      expect(buf[i]).toBe(0xFF)
    }
  })

  it('CJK 中 uses 16-wide glyph', () => {
    const buf = new Uint8Array(320 * 200)
    renderText(buf, 320, 0, 0, '中', 0xFF, mockGlyphs)
    for (let i = 0; i < 16; i++) {
      expect(buf[i]).toBe(0xFF)
    }
  })
})

describe('measureText', () => {
  it('returns 8 for A, 16 for 中, 24 for A中', () => {
    expect(measureText('A', mockGlyphs)).toBe(8)
    expect(measureText('中', mockGlyphs)).toBe(16)
    expect(measureText('A中', mockGlyphs)).toBe(24)
  })
})
```

跑 fail:`pnpm -F @type-pal/game test font -v`。

- [ ] **Step 3: 写 font.ts 实现**

打开 `packages/game/src/present/font.ts`,**全删** 8×16 色块代码,改:

```ts
/**
 * 字符渲染(M4 P4 T3)。
 * 真 glyph blit:UTF-8 codepoint → GlyphTable → 16×16 indexed bitmap → blit。
 */

export interface Glyph {
  width: number
  height: number
  bitmap: Uint8Array
}

export interface GlyphTable {
  has(codepoint: number): boolean
  get(codepoint: number): Glyph | undefined
}

export async function loadGlyphs(baseUrl = '/extracted'): Promise<GlyphTable> {
  const res = await fetch(`${baseUrl}/data/font/glyphs.json`)
  if (!res.ok) throw new Error(`font: fetch glyphs.json failed (${res.status})`)
  const data = await res.json() as {
    glyphs: { codepoint: number; width: number; height: number; bitmapBase64: string }[]
  }
  const map = new Map<number, Glyph>()
  for (const g of data.glyphs) {
    map.set(g.codepoint, {
      width: g.width,
      height: g.height,
      bitmap: Uint8Array.from(atob(g.bitmapBase64), (c) => c.charCodeAt(0)),
    })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

function blitGlyph(buf: Uint8Array, bufW: number, x: number, y: number, glyph: Glyph, fgColor: number): void {
  const bytesPerRow = Math.ceil(glyph.width / 8)
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byteIdx = row * bytesPerRow + Math.floor(col / 8)
      const bit = (glyph.bitmap[byteIdx]! >> (7 - (col % 8))) & 1
      if (bit) {
        const px = x + col
        const py = y + row
        if (px >= 0 && px < bufW && py >= 0) {
          buf[py * bufW + px] = fgColor
        }
      }
    }
  }
}

const TOFU_BITMAP = (() => {
  const b = new Uint8Array(32)
  b[0] = 0xFF; b[1] = 0xFE
  b[30] = 0xFF; b[31] = 0xFE
  for (let r = 1; r < 15; r++) {
    b[r * 2] = 0x80
    b[r * 2 + 1] = 0x01
  }
  return b
})()

export function renderText(
  buf: Uint8Array,
  bufW: number,
  x: number,
  y: number,
  text: string,
  fgColor: number,
  glyphs: GlyphTable,
): number {
  let cursorX = x
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const g = glyphs.get(cp)
    if (g) {
      blitGlyph(buf, bufW, cursorX, y, g, fgColor)
      cursorX += g.width
    } else {
      blitGlyph(buf, bufW, cursorX, y,
        { width: 16, height: 16, bitmap: TOFU_BITMAP }, fgColor)
      cursorX += 16
    }
  }
  return cursorX - x
}

export function measureText(text: string, glyphs: GlyphTable): number {
  let w = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const g = glyphs.get(cp)
    w += g?.width ?? 16
  }
  return w
}
```

- [ ] **Step 4: bootstrap.ts 启动时加载 glyph table**

```ts
import { loadGlyphs } from '../present/font.js'

// 在 loadAll 之后
const glyphs = await loadGlyphs()
presentCtx.glyphs = glyphs
```

`PresentContext` 类型加 `glyphs: GlyphTable`。

- [ ] **Step 5: present 内所有 renderText 调用点加 glyphs 参数**

```bash
grep -rn "renderText\|drawText" packages/game/src/present/
```

每处 renderText 调用加 glyphs:

```ts
// 旧
renderText(buf, x, y, 'HP', fgColor)
// 新
renderText(buf, bufW, x, y, 'HP', fgColor, ctx.glyphs)
```

逐处改(预计 5-15 处)。

- [ ] **Step 6: 跑 font test pass**

```bash
pnpm -F @type-pal/game test font -v
```

预期 PASS。

- [ ] **Step 7: 跑全 L1**

```bash
pnpm -w check 2>&1 | tail -10
```

- [ ] **Step 8: Commit**

```bash
git add packages/game/src/present/font.ts \
  packages/game/src/present/font.test.ts \
  packages/game/src/shell/bootstrap.ts
git commit -m "feat(M4.P4.T3): present/font.ts 真 glyph blit 重写(Unifont CN 16x16)"
```

---

## Task P4.T4: L2 baseline 全部重生 + b* spec 切 sdlpal real baseline

**Files:**
- 全部 baseline PNG regen(`packages/game/e2e/baselines/`,本机,不入 git)
- Modify: `packages/game/e2e/battle/b*.spec.ts`

**Parallel with:** P4.T5
**Blocks by:** P4.T3

- [ ] **Step 1: 删除现 L2 baselines + 重生**

```bash
rm -rf packages/game/e2e/baselines/
pnpm -F @type-pal/game e2e --update-snapshots 2>&1 | tail -20
```

预期:全 30+1 spec 跑,产生新 baseline PNG。

- [ ] **Step 2: 再跑 e2e verify 真过**

```bash
pnpm -F @type-pal/game e2e 2>&1 | tail -10
```

预期:31 passed(P3 T8 unskip 后)。

- [ ] **Step 3: 切 b* spec 自 self-snapshot 到 sdlpal real baseline**

打开 `packages/game/e2e/battle/b1-bg-render.spec.ts`(及 b2-b7):

```ts
// 旧(self-snapshot)
await expect(canvas).toHaveScreenshot('b1-bg.png', { threshold: 0.1 })

// 新(sdlpal real baseline)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const sdlpalBaseline = PNG.sync.read(readFileSync(
  resolve(__dirname, '../../../../build/sdlpal-baseline/battles/zh1.png'),
))
const oursBuf = await canvas.screenshot()
const ours = PNG.sync.read(oursBuf)
expect(ours.width).toBe(sdlpalBaseline.width)
expect(ours.height).toBe(sdlpalBaseline.height)
const diff = new PNG({ width: ours.width, height: ours.height })
const num = pixelmatch(ours.data, sdlpalBaseline.data, diff.data, ours.width, ours.height, { threshold: 0.1 })
const pct = num / (ours.width * ours.height)
expect(pct).toBeLessThan(0.05)
```

(b1-b7 各对应 battle fixture,zh1/zh2/zh3 等。verify `build/sdlpal-baseline/battles/` 下 baseline PNG 存在 — M3.5 时已生成 zh1.png / zh2.png。)

- [ ] **Step 4: 跑 b* spec verify**

```bash
pnpm -F @type-pal/game e2e b 2>&1 | tail -10
```

预期 PASS(diff < 5%)。

- [ ] **Step 5: 若 diff > 5% → debug 或调 threshold**

可能:
- 菜单 overlay 差异(sdlpal 不画 UI,我方画)
- 字体细微差异
- palette 顺序差异
- 进 KNOWN_DEVIATIONS 或调 threshold(留 M5)

- [ ] **Step 6: Commit**

```bash
git add packages/game/e2e/battle/
git commit -m "feat(M4.P4.T4): L2 baseline 全部重生(Unifont)+ b* spec 切 sdlpal real baseline(M3.5 ⚠️ 接合)"
```

---

## Task P4.T5: dev panel 字体测试入口

**Files:**
- Modify: `packages/game/src/shell/dev-panel.ts`

**Parallel with:** P4.T4
**Blocks by:** P4.T3

- [ ] **Step 1: 在 dev panel 加 "Font Test" button**

```ts
// dev-panel.ts
const fontTestBtn = document.createElement('button')
fontTestBtn.textContent = 'Font Test'
fontTestBtn.onclick = () => {
  const sheet = [
    '0123456789',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '主菜单 物品 法术 装备 状态',
    '攻击 防御 法术 道具 逃跑',
    '生命 法力 等级 经验 金币',
  ]
  let y = 0
  for (const line of sheet) {
    renderText(fb, FB_W, 0, y, line, fgColor, ctx.glyphs)
    y += 20
  }
  refresh()
}
panel.appendChild(fontTestBtn)
```

(具体 hook 看现 dev-panel 真结构;若 dev-panel 不持 fb 引用,改为打开新 dev-only mode 渲染 sheet。)

- [ ] **Step 2: 手动 verify**

```bash
pnpm -F @type-pal/game dev &
sleep 3
# 浏览器开 dev panel,点 "Font Test",肉眼 verify 各字符真字形显示,无 ▢ tofu
# kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/shell/dev-panel.ts
git commit -m "feat(M4.P4.T5): dev panel 字体测试 sheet 入口"
```

---

# 收尾

## Task M4.收尾: README + 03 同步 + 实施过程发现归档

**Files:**
- Modify: `README.md`
- Modify: `docs/03-development-plan.md`(M4 section)
- Modify: `docs/plans/2026-05-24-m4-pal-extract-complete.md`(本文件,加实施过程发现)

- [ ] **Step 1: README.md M4 section 加完工**

```markdown
## M4 · pal-extract 补全 + 资产分层 + 字体真渲染 ✅(2026-05-DD 完工)

- pal-extract 14 个 MKF 全 chunk 覆盖(P2,见 `docs/M4_CHUNK_INVENTORY.md`)
- `data/extracted/` 资产按 battle/world/item/ui/splash/magic/font 分层(P1)
- 全 295 scene tilemap + sprite union dump + dev panel scene picker 295 可跳(P3)
- Unifont CN 真字形渲染,UI 文字可读(P4)
- sdlpal `--dump-map` 全 295 scene 自动化 diff(P3 T7,KNOWN_DEVIATIONS 见 docs/)
- M3.5 ⚠️ 残留修:a9 端到端 unskip / palette 跨 scene / b* 切 sdlpal real baseline
```

- [ ] **Step 2: docs/03-development-plan.md M4 section 改完工状态**

按 M3.5 同款格式改 M4 section,加完工日期 + plan 链接。

- [ ] **Step 3: 在本 plan 末「实施过程发现」段填充**

每 task 实施时遇到的 deviation / sdlpal 真值 / 改方案 / 等都按 M3.5 plan 末格式记录。

- [ ] **Step 4: Commit**

```bash
git add README.md docs/03-development-plan.md docs/plans/2026-05-24-m4-pal-extract-complete.md
git commit -m "docs(M4): 完工同步 README + 03 + 实施过程发现归档"
```

---

## 实施过程发现 / 与本计划的偏离(完工时整理)

本计划在 brainstorming + writing-plans 阶段基于 design doc + sdlpal grep 推断;实施时遇到的真实差异记录如下供 M5 / M6 / M7 参考。**全部 commit 在 main 分支可追溯**。

### 1. STUFF.MKF + SAVE.MKF 根本不存在(WIN95+ 版无字模 MKF;存档用 .RPG)

design plan 假设抽 STUFF + SAVE,P2.T1 chunk inventory verify 真值:**两文件都不在 data/raw/**。后果:P2.T3 重定向 STUFF → DATA chunk 9/10 sprite 抽到 images/ui+magic;P2.T4 drop SAVE;P4.T1 confirm D11 假设(纯 Unifont,无需字模 verify)。

### 2. DATA chunk 9 SPRITEUI + chunk 10 effect sprite 实际是 sprite 数据,不是 typed data

P2.T1 inventory 标"待 spelunking",P2.T3 grep sdlpal 真值发现两 chunk 是 sprite 组(72 + 86 frame)。抽到 P1 锁定的 `images/ui/` + `images/magic/` 子目录(原 P2 plan 假设是 typed data dump)。

### 3. enemies/items/spells 字段补漏:M3 D28 早已完整(P2.T2 没需要补漏)

design plan 假设要补 D28 字段(magStrength / dexterity / poisonResistance 等)。P2.T2 实施时发现 M3 D28 commit 已经把这些字段全 typed 完整。后果:P2.T2 实际只增加 DATA chunks 6/11/14 typed parser。

### 4. SceneObjects.mapNum 字段早已存在(P3.T5 没需要加)

design plan 假设要加 mapNum 字段。P3.T5 实施时 grep 现有 SceneObjects schema → mapNum 早已在 shared/resources.ts(M3.5 时加)。后果:T5 只剩 cli.ts 改 SLICE → 全 295 循环。

### 5. T6 selectSceneJump helper 误改 + scene-15-mob entry 被覆盖

T6 把 scene-jumps.json 全量 replace 为 295 generic entries,删了 M3.5 时的 5 个具名 entry(含 scene-15-mob)。同时 T6 改的 e2e helper `selectSceneJump` selector 用数字前缀提取 filter,对 jumpId="scene-15-mob" 提取 filter="15" 错点 "scene-15 (map-7)" 而非 "scene-15-mob (map-7, 草妖通道)"。后果:T8 a9 spec fail。修法:T8 重新加 scene-15-mob entry + 改 selectSceneJump 优先精确匹配 jumpId 前缀。

### 6. lazy events 加载 3rd 并发 fetch 500ms 不够

P3.T1 加 events fetch 第 3 个并发 → dev server 加载稍慢。T8 e2e helper wait 500ms 偶尔 fail → 改 2000ms 稳。

### 7. RGM.MKF / BALL.MKF 不是 BGM/单一 UI 元素,是 character face / item bitmap raw chunks

设计 plan 假设 RGM = BGM metadata, BALL = magic ball UI sprite。P2.T4 grep sdlpal 真值:**RGM = 角色头像 bitmap**(92 个单帧 RLE),**BALL = 物品 icon bitmap**(252 个单帧 RLE)。M4 简版:都 raw dump,M5 解 RLE 真做 icon / face display。

### 8. P3.T3 unique mapNum 比 design 预估多(222 vs 120)

design plan 预估 295 scene 共用 ~120 unique mapNum。实测:**222 unique mapNum**(295 scene 仍然 dedup 但比例没那么高)。影响:`images/world/tileset/` 222 个 map-N 子目录,tileset PNG 量更大。

### 9. P3.T7 全 295 sdlpal --dump-map 99.7% pass(只 1 fail)

design plan 预估 ≥ 90% pass。实测:**293/294 pass (99.7%)**,仅 scene 294 / mapNum=0 fail(sdlpal `PAL_LoadMap(0)` 返 NULL,scene 294 是 stub)。KNOWN_DEVIATIONS 单条记录,无 tilemap 渲染 bug。

### 10. Unifont 接入后 b* baseline vs sdlpal real diff 显著降

M3.5 末 self-snapshot baseline,b 组 diff 不准。P4.T4 切到 sdlpal real baseline + Unifont 与 sdlpal 内嵌字体一致 → **b1-b3 = 1.13% / b4 = 3.72%**。比 M3.5 末 4.6/7% 大幅下降。

### 11. MGO union spriteId 540 vs M3.5 切片 26

M3.5 时切片 5 scene 共 26 sprite。P3.T4 全 295 scene union → 540 unique spriteId, 3480 frames。pnpm extract 时间从 ~3s → 34s(可接受)。

### 12. Subagent-Driven workflow 并行执行加速明显

23 task 大部分 mechanical,sonnet model 足够。Wave 内能并行的 dispatched 同 message → wall time 显著缩短(实测 P3 8 task 在几小时内全完)。各 wave 之间靠 file dep graph 排序,~12 wave 完成。

### M4 完成定义实际状态

- ✅ P1 资产分层重构:`data/extracted/` 全部按 battle/world/item/ui/splash/magic/font 分层
- ✅ P2 全 chunk 覆盖:14 MKF inventory(STUFF/SAVE 不存在 confirm)+ DATA chunks 6/9/10/11/14 typed/sprite + RNG/RGM/BALL/FIRE/SOUNDS dump + splash 2 PNG
- ✅ P3 全 295 scene 资源:222 unique mapNum tileset / 540 sprite union / 全 294 scene-N.json / sdlpal --dump-map 99.7% pass / dev panel 294 scene picker / a9 端到端 unskip + pass
- ✅ P4 字体真渲染:Unifont 9MB ship / glyphs.json 57083 / present/font.ts 17 调用点真 blit / L2 baseline 全重生 / b* sdlpal real baseline diff 1-4%
- ⚠️ M3.5 残留 ⚠️ fixture-end SIGABRT(留 M5)
- ⚠️ M3.5 残留 ⚠️ 4-5 player PLAYER_POSITIONS(留 M5)
- ⚠️ DATA chunks 12/15 仍 raw + TODO(M5 真用时扩 typed)
- ⚠️ RNG/RGM/BALL raw dump,未解 RLE → 真 icon/face(留 M5/M6)
- ⚠️ SOUNDS metadata only,ogg 转换留 M6

### 13. M4 完工后 dev panel manual 测试暴露 M2 era 简化遗留(留 M5)

M4 P3.T6 dev panel scene picker 扩 294 后,用户首次 manual 走全 scene 暴露两个 M2 era 简化 bug(M2 时只在 scene 1 客栈小范围走过,corner case 未触发):

#### 13a. `isWalkable` 永远返 true → **穿墙**

`packages/game/src/core/scene-system.ts:80` M2 简化"全部可走",未解 tile attribute 阻挡位。
- sdlpal 真值:`scene.c:512 PAL_CheckObstacle` + `map.c` 通过 tile u32 高位 attribute 位判断 blocked
- `TileCell.lower / .upper` 类型注释已说"u16 = tile bitmap 索引 + 属性位",但 M2 没拆出 attribute 位
- M5 真做:patch `isWalkable` 拆 attribute 位 + 对照 sdlpal 真值;加 L1 单元测 + L2 spec "穿墙不通过"

#### 13b. layer 1 永远盖 sprite + 无 Y-sort → **遮挡反**

`packages/game/src/present/present.ts:48-61` 现:`drawTilemap layer 0 → NPCs(无 sort)→ party → drawTilemap layer 1(全集)`。
- sdlpal 真值:`scene.c:181 PAL_SceneDrawSprites` Y-sort 所有 sprite 后逐个画,每 sprite 算 `PAL_CalcCoverTiles`,选择性 cover-tile redraw 才形成正确遮挡
- 我方现状:party 永远 last 画(永盖 NPC);layer 1 整层永远在最上(永盖 sprite)
- M5 真做:port `PAL_SceneDrawSprites` Y-sort + `PAL_CalcCoverTiles` selective cover-tile;present.ts 渲染流水大改

---

## 完成 = 准备 M5 / M6 / M7

M4 完工后:
- **M5 系统补全**:菜单系统全套 + 完整战斗(技能特效动画 / 五行 / 觉醒)+ 存档读档 + 真剧情链
  + **M5 新增**(M4 manual 暴露):scene-system collision(isWalkable 真解 tile attribute)+ present scene 渲染(Y-sort sprite + CalcCoverTiles 选择性遮挡)
  - **M5 可用 M4 产物**:全 chunk 数据 / 全 scene 资源 / 字体真渲染 / SceneAssets eventCommands+labelMap lazy load infra
- **M6 体验补全**:BGM + 音效 + AVI 过场 + 调色板循环
  - **M6 可用 M4 产物**:SOUNDS metadata / RNG raw / RGM raw / splash 素材
- **M7 通关验证**:Layer 3 完整流程 E2E + sdlpal 全 295 scene baseline 已存(P3 T7)
