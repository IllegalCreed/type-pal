#!/usr/bin/env node
/**
 * pal-extract CLI —— 总装入口。
 * 调用:pnpm extract (从仓库根)
 *
 * 产出目录:data/extracted/
 *   events/   scene-NNN.json, shared.json, objects.json
 *   data/     items.json, spells.json, magic.json, enemies.json, tilemap-N.json, palette-N.json
 *   images/   tile-scene-N-NNNN.png
 *   lookup/   words.json, strings.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Symbols } from './events/annotate.js'
import { annotate } from './events/annotate.js'
import { disasm } from './events/disasm.js'
import { recompile } from './events/recompile.js'
import { sliceByScene } from './events/slice.js'
import { chunkCount, openMkf, readChunk } from './io/mkf.js'
import { parseMessages } from './io/msg.js'
import { parseSss } from './io/sss.js'
import { parseWordDat } from './io/word.js'
import { decompressYj2 } from './io/yj2.js'
import { extractBattleSprites } from './resources/battle-sprite.js'
import { parseMap } from './resources/map.js'
import { decodePalette } from './resources/palette.js'
import { dumpScene } from './resources/scene.js'
import { encodeIndexedPng, extractCharacterSprites } from './resources/sprite.js'
import {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
  parseBattleFields,
  parseEnemies,
  parseEnemyTeams,
  parseItems,
  parseMagicTable,
  parsePlayerRoles,
  parseSpells,
} from './resources/tables.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')
const RAW = resolve(REPO_ROOT, 'data/raw')
const OUT = resolve(REPO_ROOT, 'data/extracted')
const SYMBOLS_PATH = resolve(REPO_ROOT, 'data/symbols.json')

/**
 * 切片场景 ID 列表(0-indexed,对应 sss.scenes[N]; sdlpal 1-based wNumScene = N+1)。
 * - 1  = 客栈 (mapNum 12) —— M2 / M3 起始切片
 * - 14 = 仙靈島碼頭 (mapNum 3) —— scene-14.onEnter `L_5117` + 張四哥 NPC「我在這裏看船」
 * - 17 = 仙靈島入口 / 破陣場 (mapNum 6) —— 觀音像 + 破天錘
 *
 * 选定依据:scenes dump 头 20 个 + 对照 reference/walkthrough/flow.md 第一章。
 * dev panel(M3.5 D34)用 sceneId 直接跳。
 */
const SLICE_SCENE_IDS = [1, 14, 17] as const

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function writeBinary(path: string, data: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}

function loadFile(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(RAW, name)))
}

function loadMkfChunk(file: string, chunkIndex: number, decompress = false): Uint8Array {
  const mkf = openMkf(loadFile(file))
  const chunk = readChunk(mkf, chunkIndex)
  return decompress ? decompressYj2(chunk) : chunk
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function main(): Promise<void> {
  console.log('[pal-extract] start')

  // ── 共享数据 ────────────────────────────────────────────────────
  const sssBuf = loadFile('SSS.MKF')
  const sss = parseSss(sssBuf)
  const messages = parseMessages(loadFile('M.MSG'), sss.messageOffsets)
  const words = parseWordDat(loadFile('WORD.DAT'))
  const symbols: Symbols = existsSync(SYMBOLS_PATH)
    ? (JSON.parse(readFileSync(SYMBOLS_PATH, 'utf-8')) as Symbols)
    : {}

  console.log(
    `[pal-extract] scenes=${sss.scenes.length}, events=${sss.eventObjects.length}, bytecode=${sss.bytecode.byteLength}B`,
  )

  // ── 事件管线(全量) ─────────────────────────────────────────────
  console.log('[pal-extract] events …')

  // 收集所有入口 ip(可能未被任何跳转指向,但运行时要从此进入,需打 label)
  const entryIps: number[] = []
  for (const sc of sss.scenes) {
    if (sc.scriptOnEnter > 0) entryIps.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entryIps.push(sc.scriptOnTeleport)
  }
  for (const eo of sss.eventObjects) {
    if (eo.triggerScript > 0) entryIps.push(eo.triggerScript)
    if (eo.autoScript > 0) entryIps.push(eo.autoScript)
  }

  const rawCommands = disasm(sss.bytecode, messages, entryIps)

  // round-trip 自检
  const verify = recompile(rawCommands, messages)
  if (verify.byteLength !== sss.bytecode.byteLength || !equalBytes(verify, sss.bytecode)) {
    console.error('[pal-extract] ROUND-TRIP FAILED — events 不忠实')
    process.exit(2)
  }
  console.log('[pal-extract] events round-trip OK')

  const annotated = annotate(rawCommands, words, symbols)
  const sliced = sliceByScene(annotated, sss.scenes, sss.eventObjects)

  sliced.scenes.forEach((sceneFile, i) => {
    const padded = i.toString().padStart(3, '0')
    writeJson(resolve(OUT, 'events', `scene-${padded}.json`), sceneFile)
  })
  writeJson(resolve(OUT, 'events', 'shared.json'), sliced.shared)
  writeJson(resolve(OUT, 'events', 'objects.json'), sliced.objects)

  console.log(
    `[pal-extract] events written: ${sliced.scenes.length} scenes + shared + objects`,
  )

  // ── 数据表(全量) ────────────────────────────────────────────────
  console.log('[pal-extract] data tables …')

  // SSS.MKF chunk 2 = OBJECT 数组原始字节(供 parseItems / parseSpells / parseEnemies)
  const sssObjBuf = loadMkfChunk('SSS.MKF', 2)

  // DATA.MKF chunk 1 = ENEMY 敌人基础数据;chunk 2 = ENEMYTEAM 敌队;
  // chunk 4 = MAGIC 法术细节;chunk 5 = BATTLEFIELD 战场背景 + 元素 buff
  // (对照 sdlpal global.c::PAL_LoadDefaultGame 的 LOAD_DATA 调用)
  const dataMkf = openMkf(loadFile('DATA.MKF'))
  const enemyBuf = readChunk(dataMkf, 1)
  const teamBuf = readChunk(dataMkf, 2)
  const magicBuf = readChunk(dataMkf, 4)
  const fieldBuf = readChunk(dataMkf, 5)

  writeJson(resolve(OUT, 'data', 'items.json'), parseItems(sssObjBuf, words))
  // M3 T6:Spell wrapper(SSS chunk 2) + Magic 详细 stats(DATA chunk 4)分两个文件 dump。
  // Spell.magicNumber 指向 magic[] 索引;运行时按需 join。
  writeJson(resolve(OUT, 'data', 'spells.json'), parseSpells(sssObjBuf, words))
  writeJson(resolve(OUT, 'data', 'magic.json'), parseMagicTable(magicBuf))
  const enemies = parseEnemies(enemyBuf, sssObjBuf, words)
  writeJson(resolve(OUT, 'data', 'enemies.json'), enemies)
  // M3 T7:EnemyTeam(DATA chunk 2) + BattleField(DATA chunk 5)dev panel 选 fixture 用。
  // EnemyTeam._names 反查 — 用 OBJECT_ENEMY 段 + words 建 map。
  const enemyObjectNames = buildEnemyObjectNameMap(sssObjBuf, words)
  // M3.30 Bug 1 修复:enemy-teams.json 槽位之前 dump 为 OBJECT 数组绝对 index(398-550),
  // 与 enemies.json id 范围(0-153)不匹配,运行时 `find(e => e.id === slot)` 全 miss → enemy
  // 不显示。修法:dump 时翻译 OBJECT index → enemies.json id(= OBJECT_ENEMY.wEnemyID),
  // enemy-teams.json 槽位变 enemies.json id,运行时直接消费。
  const objectIndexToEnemyId = buildObjectIndexToEnemyIdMap(sssObjBuf)
  writeJson(
    resolve(OUT, 'data', 'enemy-teams.json'),
    parseEnemyTeams(teamBuf, enemyObjectNames, objectIndexToEnemyId),
  )
  writeJson(resolve(OUT, 'data', 'battle-fields.json'), parseBattleFields(fieldBuf))
  // M3 T8:PlayerRoles(DATA.MKF chunk 3)— M2 半解扩到 M3 战斗子集 dump。
  // T9:cli.ts 不再硬编码 leader sprite,改读 playerRoles.roles[0].spriteNum 真值用于切片。
  const playerRoles = parsePlayerRoles(loadFile('DATA.MKF'), words)
  writeJson(resolve(OUT, 'data', 'player-roles.json'), playerRoles)

  console.log('[pal-extract] data tables written')

  // ── 资源(切片:多场景) ──────────────────────────────────────────
  // M3.5 T4:从单一 SLICE_SCENE_ID 扩到 SLICE_SCENE_IDS 数组,每个 sceneId 各产出
  // tilemap-N.json + tile-scene-N-*.png + scene-N.json。dev panel 跳 scene 用。
  console.log(`[pal-extract] resources for scenes ${SLICE_SCENE_IDS.join(',')} …`)

  const mapMkf = openMkf(loadFile('MAP.MKF'))
  const mapChunkCount = chunkCount(mapMkf)
  const gopMkf = openMkf(loadFile('GOP.MKF'))

  // 收集所有切片场景对应的 scene 对象 + (sceneId → sceneObjects) — 给后面 sprite 提取用。
  const slicedScenes: Array<{
    sceneId: number
    scene: import('./io/sss.js').Scene
    sceneObjects: ReturnType<typeof dumpScene>
  }> = []

  for (const sliceId of SLICE_SCENE_IDS) {
    const scene = sss.scenes[sliceId]
    if (!scene) {
      console.error(`[pal-extract] scene ${sliceId} not found`)
      process.exit(2)
    }
    console.log(`[pal-extract] scene ${sliceId}: mapNum=${scene.mapNum}`)

    if (scene.mapNum >= mapChunkCount) {
      console.error(
        `[pal-extract] scene ${sliceId} mapNum=${scene.mapNum} >= MAP.MKF chunk count ${mapChunkCount}; ` +
          `请调整 SLICE_SCENE_IDS`,
      )
      process.exit(2)
    }

    // MAP.MKF chunk N:YJ2 压缩;GOP.MKF chunk N:raw sprite chunk
    const mapBytes = decompressYj2(readChunk(mapMkf, scene.mapNum))
    const gopBytes = readChunk(gopMkf, scene.mapNum)
    const mapResult = parseMap(mapBytes, gopBytes)

    // 每个 tile 写为独立 PNG
    const tilesetFiles: string[] = []
    for (const tile of mapResult.tiles) {
      const fname = `tile-scene-${sliceId}-${tile.index.toString().padStart(4, '0')}.png`
      writeBinary(resolve(OUT, 'images', fname), tile.pngBytes)
      tilesetFiles.push(fname)
    }
    mapResult.tilemap.tilesetImage = `tile-scene-${sliceId}-*.png`
    writeJson(resolve(OUT, 'data', `tilemap-${sliceId}.json`), {
      ...mapResult.tilemap,
      tilesetFiles,
    })

    console.log(
      `[pal-extract] scene ${sliceId} tilemap written (${mapResult.tiles.length} tiles)`,
    )

    // 场景对象切片:从切片场景 dump NPC/触发点列表(供运行时用)
    const sceneObjects = dumpScene(sliceId, sss.scenes, sss.eventObjects)
    writeJson(resolve(OUT, 'data', `scene-${sliceId}.json`), sceneObjects)
    console.log(
      `[pal-extract] scene-${sliceId}.json written (${sceneObjects.eventObjects.length} event objects)`,
    )

    slicedScenes.push({ sceneId: sliceId, scene, sceneObjects })
  }

  // 调色板:PAT.MKF 全量 dump
  const patMkf = openMkf(loadFile('PAT.MKF'))
  const patChunkCount = chunkCount(patMkf)
  let palWritten = 0
  for (let i = 0; i < patChunkCount; i++) {
    const palBuf = readChunk(patMkf, i)
    if (palBuf.byteLength < 768) continue // 跳过非调色板 chunk
    writeJson(
      resolve(OUT, 'data', `palette-${i}.json`),
      decodePalette(palBuf.subarray(0, 768)),
    )
    palWritten++
  }
  console.log(`[pal-extract] palette written (${palWritten} chunks)`)

  // 角色 / NPC 精灵切片(M2 新增 — D27, M3 T9 改读真值;M3.5 T4 改 union 多 scene)
  console.log(
    `[pal-extract] character sprites for scenes ${SLICE_SCENE_IDS.join(',')} …`,
  )

  // 队长精灵号 —— 从上面 parsePlayerRoles 得到的真值取(roles[0].spriteNum,实测 = 2)。
  // 6 个角色精灵号 = [2, 3, 7, 525, 5, 26]。M2 切片只装载队长一个 sprite,
  // 多人队伍 / 角色切换的扩展留 M5。
  const partyLeader = playerRoles.roles[0]
  if (!partyLeader) throw new Error('cli: parsePlayerRoles 返回空 roles')
  const spriteIds = new Set<number>([partyLeader.spriteNum])
  for (const sliced of slicedScenes) {
    for (const eo of sliced.sceneObjects.eventObjects) {
      if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
    }
  }

  const mgoMkf = openMkf(loadFile('MGO.MKF'))
  const mgoChunkCount = chunkCount(mgoMkf)
  const mgoChunks = new Map<number, Uint8Array>()
  for (const id of spriteIds) {
    if (id >= mgoChunkCount) {
      console.warn(`[pal-extract] sprite ${id} >= MGO chunk count ${mgoChunkCount}, skip`)
      spriteIds.delete(id)
      continue
    }
    const raw = readChunk(mgoMkf, id)
    if (raw.byteLength === 0) {
      console.warn(`[pal-extract] sprite ${id}: MGO.MKF chunk 为空,skip`)
      spriteIds.delete(id)
      continue
    }
    // MGO.MKF chunk 是 YJ2 压缩 —— 实测全部非空 chunk 首 4 字节均为
    // 有效 u32 LE 解压长度,无一例外,故直接走 YJ2,无 raw→fallback 路径。
    mgoChunks.set(id, decompressYj2(raw))
  }

  const sprites = extractCharacterSprites([...spriteIds], mgoChunks)

  for (const sprite of sprites) {
    const spriteJson = {
      spriteId: sprite.spriteId,
      frames: sprite.frames.map((f) => ({
        index: f.index,
        width: f.width,
        height: f.height,
      })),
    }
    writeJson(resolve(OUT, 'data', `sprite-${sprite.spriteId}.json`), spriteJson)
    for (const f of sprite.frames) {
      writeBinary(
        resolve(
          OUT,
          'images',
          `sprite-${sprite.spriteId}-frame-${f.index.toString().padStart(2, '0')}.png`,
        ),
        f.pngBytes,
      )
    }
  }

  console.log(
    `[pal-extract] sprites written: ${sprites.length} sprites, ` +
      `${sprites.reduce((sum, s) => sum + s.frames.length, 0)} frames total`,
  )

  // ── 战斗 sprite(M3 T24) ────────────────────────────────────────
  // 数据源真值(reference/sdlpal/battle.c:856 PAL_LoadBattleSprites):
  //   - 队员战斗 sprite:F.MKF chunk[spriteNumInBattle]
  //   - 敌方战斗 sprite:**ABC.MKF**(非 F.MKF)chunk[wEnemyID]
  //     反查 enemies.json:`enemy.id == wEnemyID`(parsers/enemies.ts 注释证实)
  // M3 简化:敌方全提(154 条),M3.5 / M5 再按 fixture 收窄。
  console.log('[pal-extract] battle sprites from F.MKF (player) + ABC.MKF (enemy) …')

  const battleSpriteIds: Array<{ id: number; kind: 'enemy' | 'player' }> = []
  for (const role of playerRoles.roles) {
    // M3.30 Bug 2 修复:之前过滤 `> 0` 把李逍遥(spriteNumInBattle=0)跳过 → dev panel
    // 选战斗时队长 sprite 不显示。sdlpal `battle.c:856` 对 spriteNumInBattle=0 不 filter
    // (F.MKF chunk 0 是有效的李逍遥战斗 sprite,sdlpal extractor 同样会 dump)。改 `>= 0`。
    if (role.spriteNumInBattle >= 0) {
      battleSpriteIds.push({ id: role.spriteNumInBattle, kind: 'player' })
    }
  }
  // 敌方:enemies.json 的 id == wEnemyID;id=0 是 sdlpal 的空 placeholder 跳过
  for (const enemy of enemies) {
    if (enemy.id > 0) {
      battleSpriteIds.push({ id: enemy.id, kind: 'enemy' })
    }
  }

  const fMkf = openMkf(loadFile('F.MKF'))
  const fChunkCount = chunkCount(fMkf)
  const abcMkf = openMkf(loadFile('ABC.MKF'))
  const abcChunkCount = chunkCount(abcMkf)
  const battleChunks = new Map<string, Uint8Array>()
  for (const { id, kind } of battleSpriteIds) {
    const mkf = kind === 'player' ? fMkf : abcMkf
    const total = kind === 'player' ? fChunkCount : abcChunkCount
    const src = kind === 'player' ? 'F.MKF' : 'ABC.MKF'
    if (id >= total) {
      console.warn(
        `[pal-extract] battle sprite ${id} (${kind}) >= ${src} chunk count ${total}, skip`,
      )
      continue
    }
    const raw = readChunk(mkf, id)
    if (raw.byteLength === 0) continue // 空 chunk:对应 sdlpal `if (l <= 0) continue;`
    // F.MKF / ABC.MKF chunk 通过 sdlpal `PAL_MKFDecompressChunk` 加载 → YJ2 压缩。
    // 部分 chunk 可能 raw(未压缩)— try YJ2,失败回 raw(同 M2 sprite 防御模式)。
    let decompressed: Uint8Array
    try {
      decompressed = decompressYj2(raw)
    } catch {
      decompressed = raw
    }
    battleChunks.set(`${kind}:${id}`, decompressed)
  }

  const battleSprites = extractBattleSprites(battleSpriteIds, battleChunks)

  for (const sprite of battleSprites) {
    const json = {
      battleSpriteId: sprite.battleSpriteId,
      kind: sprite.kind,
      frames: sprite.frames.map((f) => ({ index: f.index, width: f.width, height: f.height })),
    }
    writeJson(
      resolve(OUT, 'data', `battle-sprite-${sprite.kind}-${sprite.battleSpriteId}.json`),
      json,
    )
    for (const f of sprite.frames) {
      writeBinary(
        resolve(
          OUT,
          'images',
          `battle-sprite-${sprite.kind}-${sprite.battleSpriteId}-frame-${f.index.toString().padStart(2, '0')}.png`,
        ),
        f.pngBytes,
      )
    }
  }

  console.log(
    `[pal-extract] battle sprites written: ${battleSprites.length} sprites, ` +
      `${battleSprites.reduce((sum, s) => sum + s.frames.length, 0)} frames total`,
  )

  // ── 战斗背景(M3 T25) ──────────────────────────────────────────
  // FBP.MKF chunk[wNumBattleField] —— sdlpal `battle.c:982`
  // `PAL_MKFDecompressChunk(buf, 320*200, wNumBattleField, fpFBP)`。
  // 每 chunk YJ2 压缩,解后恰好 64000 字节 = 320×200 raw 8-bit indexed。
  // M3 全量 dump 与 battle-fields.json 对齐(58 条);多出来的 chunk(实测 78)
  // 也一并 dump,运行时按 BattleField.id 查表。
  console.log('[pal-extract] battle backgrounds from FBP.MKF …')
  const fbpMkf = openMkf(loadFile('FBP.MKF'))
  const fbpChunkCount = chunkCount(fbpMkf)
  const bgIds: number[] = []
  for (let i = 0; i < fbpChunkCount; i++) {
    const raw = readChunk(fbpMkf, i)
    if (raw.byteLength === 0) continue // 空 chunk 跳过
    let pixels: Uint8Array
    try {
      pixels = decompressYj2(raw)
    } catch (err) {
      console.warn(`[pal-extract] FBP chunk ${i} YJ2 fail, skip:`, err)
      continue
    }
    if (pixels.byteLength !== 320 * 200) {
      console.warn(
        `[pal-extract] FBP chunk ${i}: 解压后 ${pixels.byteLength} bytes ≠ 64000,skip`,
      )
      continue
    }
    writeBinary(
      resolve(OUT, 'images', `battle-bg-${i.toString().padStart(3, '0')}.png`),
      encodeIndexedPng(320, 200, pixels),
    )
    bgIds.push(i)
  }
  // M3 T25:battle-bgs.json 直接列出所有有效 bg id —— loader 按列表加载,免 404。
  writeJson(
    resolve(OUT, 'data', 'battle-bgs.json'),
    { count: fbpChunkCount, ids: bgIds },
  )
  console.log(
    `[pal-extract] battle backgrounds written: ${bgIds.length} / ${fbpChunkCount} chunks`,
  )

  // ── 战斗精灵 manifest(M3 T25 loader 用) ─────────────────────────
  // 列出 battle sprite 的 (kind, id) — loader 按 manifest 加载,避免 404 / 列目录。
  const battleSpriteManifest = battleSprites.map((s) => ({
    kind: s.kind,
    id: s.battleSpriteId,
  }))
  writeJson(
    resolve(OUT, 'data', 'battle-sprites.json'),
    { sprites: battleSpriteManifest },
  )

  // ── lookup ──────────────────────────────────────────────────────
  writeJson(resolve(OUT, 'lookup', 'words.json'), words)
  writeJson(resolve(OUT, 'lookup', 'strings.json'), messages)

  console.log(`[pal-extract] done. output → ${OUT}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
