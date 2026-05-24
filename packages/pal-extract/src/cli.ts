#!/usr/bin/env node
/**
 * pal-extract CLI —— 总装入口。
 * 调用:pnpm extract (从仓库根)
 *
 * 产出目录:data/extracted/
 *   events/   scene-NNN.json, shared.json, objects.json
 *   images/
 *     world/tileset/map-{mapNum}/tile-{XXXX}.png  (per-mapNum tile PNG)
 *     world/npc/{spriteId}/frame-{NN}.png          (NPC / character sprites)
 *     battle/bg/{NNN}.png                           (battle backgrounds)
 *     battle/{enemy,player}/{id}/frame-{NN}.png    (battle sprites)
 *     ui/frame-{NN}.png                            (DATA.MKF chunk 9 SPRITEUI frames)
 *     magic/frame-{NN}.png                         (DATA.MKF chunk 10 battle effect frames)
 *     magic/fire-{NN}/frame-{NN}.png               (FIRE.MKF per-chunk sprite group frames)
 *     splash/splash-up-win95.png                   (FBP.MKF chunk 3 title screen upper)
 *     splash/splash-down-win95.png                 (FBP.MKF chunk 4 title screen lower)
 *   data/
 *     {tilemap,scene,sprite,palette,battle-sprite}/...json  (子目录结构)
 *     enemies.json, items.json, spells.json, magic.json,
 *     enemy-teams.json, battle-fields.json, enemy-pos.json,
 *     player-roles.json, battle-bgs.json, battle-sprites.json  (平铺数据表)
 *     rng-raw.json, rgm-raw.json, ball-raw.json    (raw dump, M4 P2 T4)
 *     fire-sprites.json                            (FIRE.MKF sprite manifest, M4 P2 T4)
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
import { parseEnemyPos } from './resources/enemy-pos.js'
import { parseMap } from './resources/map.js'
import { decodePalette } from './resources/palette.js'
import { dumpScene } from './resources/scene.js'
import { encodeIndexedPng, extractCharacterSprites, framesToOut, parseSpriteChunk } from './resources/sprite.js'
import {
  parseBattleEffectIndex,
  parseLevelUpExp,
  parseLevelUpMagic,
  type RawChunkDump,
} from './resources/parsers/data-misc.js'
import { dumpRngAnim } from './resources/parsers/rng.js'
import { dumpRgmChunk } from './resources/parsers/rgm.js'
import { dumpBallChunk } from './resources/parsers/ball.js'
import { parseFirSprite } from './resources/parsers/fire.js'
import { dumpSoundsMetadata } from './resources/parsers/sounds.js'
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


function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function writeBinary(path: string, data: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}

function imageWorldNpcPath(spriteId: number, frameIdx: number): string {
  return resolve(OUT, 'images', 'world', 'npc', String(spriteId), `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

function imageWorldTilesetRelPath(mapNum: number, tileIdx: number): string {
  return `world/tileset/map-${mapNum}/tile-${tileIdx.toString().padStart(4, '0')}.png`
}

function imageWorldTilesetPath(mapNum: number, tileIdx: number): string {
  return resolve(OUT, 'images', imageWorldTilesetRelPath(mapNum, tileIdx))
}

function imageBattleBgPath(bgId: number): string {
  return resolve(OUT, 'images', 'battle', 'bg', `${bgId.toString().padStart(3, '0')}.png`)
}

function imageUiPath(frameIdx: number): string {
  return resolve(OUT, 'images', 'ui', `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

function imageMagicPath(frameIdx: number): string {
  return resolve(OUT, 'images', 'magic', `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

function imageBattleSpritePath(kind: 'enemy' | 'player', id: number, frameIdx: number): string {
  return resolve(OUT, 'images', 'battle', kind, String(id), `frame-${frameIdx.toString().padStart(2, '0')}.png`)
}

/**
 * Build path to `data/{subdir}/{name}.json`. The `name` parameter MAY contain
 * `/` to nest one more level — e.g. `dataSubdirPath('battle-sprite', 'enemy/5')`
 * resolves to `data/battle-sprite/enemy/5.json`. `mkdirSync({ recursive: true })`
 * inside `writeJson` handles the nested mkdir.
 *
 * `'font'` subdir is forward-compat for P4 T2(BDF→JSON glyph 表),目前未使用。
 */
function dataSubdirPath(subdir: 'tilemap' | 'scene' | 'sprite' | 'palette' | 'battle-sprite' | 'font' | 'ui-sprite' | 'magic-sprite', name: string): string {
  return resolve(OUT, 'data', subdir, `${name}.json`)
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
  // M3.5:ENEMYPOS(DATA.MKF chunk 13)= 5×5 PALPOS table。game runtime
  // draw-battle-sprites.ts 按 state.enemies.length 选 layouts[count-1] 行,
  // 替代 M3 simple version 的 hardcoded ENEMY_POSITIONS。
  const enemyPosBuf = readChunk(dataMkf, 13)
  writeJson(resolve(OUT, 'data', 'enemy-pos.json'), parseEnemyPos(enemyPosBuf))
  // M3 T8:PlayerRoles(DATA.MKF chunk 3)— M2 半解扩到 M3 战斗子集 dump。
  // T9:cli.ts 不再硬编码 leader sprite,改读 playerRoles.roles[0].spriteNum 真值用于切片。
  const playerRoles = parsePlayerRoles(loadFile('DATA.MKF'), words)
  writeJson(resolve(OUT, 'data', 'player-roles.json'), playerRoles)

  // M4 P2 T2: DATA.MKF 余下 chunks ─────────────────────────────────────────
  // chunk 14: rgLevelUpExp[100] = 升级经验阈值(WORD × 100 = 200 字节)
  const levelUpExpBuf = readChunk(dataMkf, 14)
  writeJson(resolve(OUT, 'data', 'level-up-exp.json'), parseLevelUpExp(levelUpExpBuf))

  // chunk 6: lprgLevelUpMagic = LEVELUPMAGIC_ALL × N
  //   LEVELUPMAGIC_ALL = { LEVELUPMAGIC m[5] }, LEVELUPMAGIC = { WORD wLevel; WORD wMagic }
  //   MAX_PLAYABLE_PLAYER_ROLES = 5
  const levelUpMagicBuf = readChunk(dataMkf, 6)
  writeJson(
    resolve(OUT, 'data', 'level-up-magic.json'),
    parseLevelUpMagic(levelUpMagicBuf, 5),
  )

  // chunk 11: rgwBattleEffectIndex[10][2] = WORD × 20 = 40 字节
  const battleEffectBuf = readChunk(dataMkf, 11)
  writeJson(resolve(OUT, 'data', 'battle-effect-index.json'), parseBattleEffectIndex(battleEffectBuf))

  // M4 P2 T3: DATA.MKF chunk 9 (SPRITEUI) → images/ui/frame-NN.png
  // sdlpal ui.h: CHUNKNUM_SPRITEUI = 9; PAL_MKFReadChunk(raw, no YJ2)
  // gpSpriteUI 是单个 sprite group chunk,帧按 SPRITENUM_* 常量直接索引。
  // 最高已知 SPRITENUM = SPRITENUM_ITEMBOX = 70;实测 imagecount = 72。
  const uiSpriteBuf = readChunk(dataMkf, 9)
  const uiFrames = parseSpriteChunk(uiSpriteBuf)
  const uiFrameOut = framesToOut(uiFrames)
  for (const f of uiFrameOut) {
    writeBinary(imageUiPath(f.index), f.pngBytes)
  }
  writeJson(dataSubdirPath('ui-sprite', 'spriteui'), {
    chunkIndex: 9,
    sdlpalName: 'SPRITEUI',
    frameCount: uiFrameOut.length,
    frames: uiFrameOut.map((f) => ({ index: f.index, width: f.width, height: f.height })),
  })
  console.log(`[pal-extract] SPRITEUI (chunk 9) written: ${uiFrameOut.length} frames`)

  // M4 P2 T3: DATA.MKF chunk 10 (battle effect sprite) → images/magic/frame-NN.png
  // sdlpal battle.c:1787: PAL_MKFReadChunk(g_Battle.lpEffectSprite, i, 10, fpDATA)
  // fight.c: PAL_SpriteGetFrame(g_Battle.lpEffectSprite, index) — 单 sprite group,帧顺序使用。
  // 实测 imagecount = 86。
  const effectSpriteBuf = readChunk(dataMkf, 10)
  const effectFrames = parseSpriteChunk(effectSpriteBuf)
  const effectFrameOut = framesToOut(effectFrames)
  for (const f of effectFrameOut) {
    writeBinary(imageMagicPath(f.index), f.pngBytes)
  }
  writeJson(dataSubdirPath('magic-sprite', 'effect'), {
    chunkIndex: 10,
    sdlpalName: 'lpEffectSprite',
    frameCount: effectFrameOut.length,
    frames: effectFrameOut.map((f) => ({ index: f.index, width: f.width, height: f.height })),
  })
  console.log(`[pal-extract] battle effect sprite (chunk 10) written: ${effectFrameOut.length} frames`)

  // chunk 7/8 空(0 字节);chunk 12 = 对话框图标 sprite(282B,P2.T4+ 处理)
  // DATA.MKF count=15(有效 chunk 0-14),chunk 15 超出范围不抽

  // M4 P2 T4: RNG / RGM / BALL raw dump + FIRE sprite 抽出 ──────────────────
  // SAVE.MKF 不存在(WIN95+ 用 .RPG 存档),drop。

  // RNG.MKF: 12 chunks, 每 chunk 是 sub-MKF + RLE delta 动画帧(rngplay.c)
  {
    const rngMkf = openMkf(loadFile('RNG.MKF'))
    const n = chunkCount(rngMkf)
    const summary: RawChunkDump[] = []
    for (let i = 0; i < n; i++) summary.push(dumpRngAnim(i, readChunk(rngMkf, i)))
    writeJson(resolve(OUT, 'data', 'rng-raw.json'), summary)
    console.log(`[pal-extract] RNG.MKF written (${n} chunks)`)
  }

  // RGM.MKF: 92 chunks, 每 chunk 是单帧 RLE bitmap 角色头像(global.h fpRGM)
  {
    const rgmMkf = openMkf(loadFile('RGM.MKF'))
    const n = chunkCount(rgmMkf)
    const summary: RawChunkDump[] = []
    for (let i = 0; i < n; i++) summary.push(dumpRgmChunk(i, readChunk(rgmMkf, i)))
    writeJson(resolve(OUT, 'data', 'rgm-raw.json'), summary)
    console.log(`[pal-extract] RGM.MKF written (${n} chunks)`)
  }

  // BALL.MKF: 252 chunks, 每 chunk 是单帧 RLE bitmap 物品图标(global.h fpBALL)
  {
    const ballMkf = openMkf(loadFile('BALL.MKF'))
    const n = chunkCount(ballMkf)
    const summary: RawChunkDump[] = []
    for (let i = 0; i < n; i++) summary.push(dumpBallChunk(i, readChunk(ballMkf, i)))
    writeJson(resolve(OUT, 'data', 'ball-raw.json'), summary)
    console.log(`[pal-extract] BALL.MKF written (${n} chunks)`)
  }

  // FIRE.MKF: 55 chunks, 每 chunk 是 YJ2 sprite group(fight.c PAL_MKFDecompressChunk)
  // 产出:images/magic/fire-{NN}/frame-{NN}.png + data/fire-sprites.json
  {
    const fireMkf = openMkf(loadFile('FIRE.MKF'))
    const n = chunkCount(fireMkf)
    let totalFireFrames = 0
    const fireManifest: Array<{ chunkIndex: number; frameCount: number; frames: Array<{ index: number; width: number; height: number }> }> = []
    for (let i = 0; i < n; i++) {
      const buf = readChunk(fireMkf, i)
      const result = parseFirSprite(i, buf)
      const chunkDir = `fire-${i.toString().padStart(2, '0')}`
      for (const f of result.frames) {
        writeBinary(
          resolve(OUT, 'images', 'magic', chunkDir, `frame-${f.index.toString().padStart(2, '0')}.png`),
          f.pngBytes,
        )
      }
      fireManifest.push({
        chunkIndex: i,
        frameCount: result.frameCount,
        frames: result.frames.map((f) => ({ index: f.index, width: f.width, height: f.height })),
      })
      totalFireFrames += result.frameCount
    }
    writeJson(resolve(OUT, 'data', 'fire-sprites.json'), { chunkCount: n, chunks: fireManifest })
    console.log(`[pal-extract] FIRE.MKF written (${n} chunks, ${totalFireFrames} frames total)`)
  }

  // M4 P2 T5: SOUNDS.MKF metadata
  console.log('[pal-extract] SOUNDS.MKF metadata …')
  const soundsMkf = openMkf(loadFile('SOUNDS.MKF'))
  const soundsN = chunkCount(soundsMkf)
  const soundsBufs: Uint8Array[] = []
  for (let i = 0; i < soundsN; i++) soundsBufs.push(readChunk(soundsMkf, i))
  writeJson(resolve(OUT, 'data', 'sounds-metadata.json'), dumpSoundsMetadata(soundsBufs))
  console.log(`[pal-extract] SOUNDS.MKF metadata written (${soundsN} chunks)`)

  // splash 素材:FBP.MKF chunk 3(BITMAPNUM_SPLASH_UP WIN95=0x03) +
  //             chunk 4(BITMAPNUM_SPLASH_DOWN WIN95=0x04)。
  // sdlpal main.c:42-43:  #define BITMAPNUM_SPLASH_UP (gConfig.fIsWIN95 ? 0x03 : 0x26)
  //                       #define BITMAPNUM_SPLASH_DOWN (gConfig.fIsWIN95 ? 0x04 : 0x27)
  // 读取方式:PAL_MKFReadChunk(raw) → Decompress(=YJ2 for WIN95) → 320×200 raw indexed。
  // 注:battle bg 循环已把 chunk 3/4 写到 images/battle/bg/003.png + 004.png;
  //     这里单独写到 images/splash/ 便于 M5/M6 直接消费标题画面。
  {
    const splashFbpMkf = openMkf(loadFile('FBP.MKF'))
    const splashIds = [
      { id: 0x03, name: 'splash-up-win95' },
      { id: 0x04, name: 'splash-down-win95' },
    ] as const
    for (const { id, name } of splashIds) {
      const raw = readChunk(splashFbpMkf, id)
      if (raw.byteLength === 0) continue
      let pixels: Uint8Array
      try {
        pixels = decompressYj2(raw)
      } catch {
        continue
      }
      if (pixels.byteLength !== 320 * 200) {
        console.warn(`[pal-extract] splash FBP chunk ${id}: 解压后 ${pixels.byteLength} bytes ≠ 64000, skip`)
        continue
      }
      writeBinary(
        resolve(OUT, 'images', 'splash', `${name}.png`),
        encodeIndexedPng(320, 200, pixels),
      )
    }
    console.log('[pal-extract] splash written → images/splash/')
  }

  console.log('[pal-extract] data tables written')

  // ── 资源(tileset + tilemap:全 295 scene,按 mapNum dedup) ─────────────────────
  // M4 P3.T3:全 295 scene → unique mapNum 集合,每个 mapNum dump 一次 tileset + tilemap。
  // tilemap JSON 按 mapNum keyed(tilemap-{mapNum}.json),loader 通过 scene→mapNum→tilemap 链查找。

  const mapMkf = openMkf(loadFile('MAP.MKF'))
  const mapChunkCount = chunkCount(mapMkf)
  const gopMkf = openMkf(loadFile('GOP.MKF'))

  {
    const allSceneCount = sss.scenes.length
    const uniqueMapNums = new Set<number>()
    for (let sliceId = 1; sliceId < allSceneCount; sliceId++) {
      const scene = sss.scenes[sliceId]
      if (!scene) continue
      if (scene.mapNum >= mapChunkCount) {
        console.warn(
          `[pal-extract] scene ${sliceId} mapNum=${scene.mapNum} >= MAP chunks ${mapChunkCount}, skip`,
        )
        continue
      }
      uniqueMapNums.add(scene.mapNum)
    }
    console.log(
      `[pal-extract] full scope: ${allSceneCount} scenes, ${uniqueMapNums.size} unique mapNums`,
    )

    let tilesetsWritten = 0
    for (const mapNum of uniqueMapNums) {
      const rawMapChunk = readChunk(mapMkf, mapNum)
      if (rawMapChunk.byteLength === 0) {
        console.warn(`[pal-extract] mapNum=${mapNum}: MAP.MKF chunk 为空,skip`)
        continue
      }
      let mapBytes: Uint8Array
      try {
        mapBytes = decompressYj2(rawMapChunk)
      } catch (err) {
        console.warn(`[pal-extract] mapNum=${mapNum}: YJ2 解压失败,skip —— ${err}`)
        continue
      }
      const gopBytes = readChunk(gopMkf, mapNum)
      const mapResult = parseMap(mapBytes, gopBytes)

      const tilesetFiles: string[] = []
      for (const tile of mapResult.tiles) {
        writeBinary(imageWorldTilesetPath(mapNum, tile.index), tile.pngBytes)
        tilesetFiles.push(imageWorldTilesetRelPath(mapNum, tile.index))
      }
      writeJson(dataSubdirPath('tilemap', String(mapNum)), {
        ...mapResult.tilemap,
        tilesetFiles,
        tilesetImage: `world/tileset/map-${mapNum}/tile-*.png`,
      })
      tilesetsWritten++
    }
    console.log(`[pal-extract] tilesets written: ${tilesetsWritten} / ${uniqueMapNums.size} unique mapNums`)
  }

  // M4 P3.T4+T5: 全 295 scene dumpScene 结果 hoisted — T5 写 JSON,T4 复用 sceneObjs 做 sprite union。
  const sceneObjsBySliceId = new Map<number, ReturnType<typeof dumpScene>>()
  {
    let sceneWritten = 0
    for (let allSceneId = 1; allSceneId < sss.scenes.length; allSceneId++) {
      const s = sss.scenes[allSceneId]
      if (!s) continue
      const sceneObjs = dumpScene(allSceneId, sss.scenes, sss.eventObjects)
      sceneObjsBySliceId.set(allSceneId, sceneObjs)
      writeJson(dataSubdirPath('scene', String(allSceneId)), sceneObjs)
      sceneWritten++
    }
    console.log(`[pal-extract] scenes written: ${sceneWritten}`)
  }

  // 调色板:PAT.MKF 全量 dump
  const patMkf = openMkf(loadFile('PAT.MKF'))
  const patChunkCount = chunkCount(patMkf)
  let palWritten = 0
  for (let i = 0; i < patChunkCount; i++) {
    const palBuf = readChunk(patMkf, i)
    if (palBuf.byteLength < 768) continue // 跳过非调色板 chunk
    writeJson(
      dataSubdirPath('palette', String(i)),
      decodePalette(palBuf.subarray(0, 768)),
    )
    palWritten++
  }
  console.log(`[pal-extract] palette written (${palWritten} chunks)`)

  // 角色 / NPC 精灵切片(M2 新增 — D27, M3 T9 改读真值;M4 P3.T4 扩到全 295 scene EO + 6 roles)
  console.log('[pal-extract] character sprites: 全 295 scene EO union + 6 player roles …')

  // M4 P3.T4: 全 295 scene EO sprite union + 6 player roles
  const spriteIds = new Set<number>()
  for (const role of playerRoles.roles) {
    if (role.spriteNum > 0) spriteIds.add(role.spriteNum)
  }
  for (const [, sceneObjs] of sceneObjsBySliceId) {
    for (const eo of sceneObjs.eventObjects) {
      if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
    }
  }
  console.log(`[pal-extract] sprite union: ${spriteIds.size} unique spriteIds (全 295 scene)`)

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
    // MGO.MKF chunk 是 YJ2 压缩 —— 全 295 scene union 中绝大部分 chunk 均有效;
    // 防御性 try/catch 覆盖极少数格式异常 chunk。
    try {
      mgoChunks.set(id, decompressYj2(raw))
    }
    catch (err) {
      console.warn(`[pal-extract] sprite ${id} YJ2 fail, skip:`, err)
      spriteIds.delete(id)
    }
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
    writeJson(dataSubdirPath('sprite', String(sprite.spriteId)), spriteJson)
    for (const f of sprite.frames) {
      writeBinary(imageWorldNpcPath(sprite.spriteId, f.index), f.pngBytes)
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
    writeJson(dataSubdirPath('battle-sprite', `${sprite.kind}/${sprite.battleSpriteId}`), json)
    for (const f of sprite.frames) {
      writeBinary(imageBattleSpritePath(sprite.kind, sprite.battleSpriteId, f.index), f.pngBytes)
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
    writeBinary(imageBattleBgPath(i), encodeIndexedPng(320, 200, pixels))
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
