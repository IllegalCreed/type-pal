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
import { parseMap } from './resources/map.js'
import { decodePalette } from './resources/palette.js'
import { dumpScene } from './resources/scene.js'
import { extractCharacterSprites } from './resources/sprite.js'
import {
  buildEnemyObjectNameMap,
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

/** 切片场景 —— 跳过常见空场景 0,从场景 1 开始。可手动调整。*/
const SLICE_SCENE_ID = 1

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
  writeJson(resolve(OUT, 'data', 'enemies.json'), parseEnemies(enemyBuf, sssObjBuf, words))
  // M3 T7:EnemyTeam(DATA chunk 2) + BattleField(DATA chunk 5)dev panel 选 fixture 用。
  // EnemyTeam._names 反查 — 用 OBJECT_ENEMY 段 + words 建 map。
  const enemyObjectNames = buildEnemyObjectNameMap(sssObjBuf, words)
  writeJson(
    resolve(OUT, 'data', 'enemy-teams.json'),
    parseEnemyTeams(teamBuf, enemyObjectNames),
  )
  writeJson(resolve(OUT, 'data', 'battle-fields.json'), parseBattleFields(fieldBuf))
  // M3 T8:PlayerRoles(DATA.MKF chunk 3)— M2 半解扩到 M3 战斗子集 dump。
  // T9:cli.ts 不再硬编码 leader sprite,改读 playerRoles.roles[0].spriteNum 真值用于切片。
  const playerRoles = parsePlayerRoles(loadFile('DATA.MKF'), words)
  writeJson(resolve(OUT, 'data', 'player-roles.json'), playerRoles)

  console.log('[pal-extract] data tables written')

  // ── 资源(切片:仅开局场景) ──────────────────────────────────────
  console.log(`[pal-extract] resources for scene ${SLICE_SCENE_ID} …`)
  const scene = sss.scenes[SLICE_SCENE_ID]
  if (!scene) {
    console.error(`[pal-extract] scene ${SLICE_SCENE_ID} not found`)
    process.exit(2)
  }
  console.log(`[pal-extract] scene ${SLICE_SCENE_ID}: mapNum=${scene.mapNum}`)

  // 检查 mapNum 合法性
  const mapMkf = openMkf(loadFile('MAP.MKF'))
  const mapChunkCount = chunkCount(mapMkf)
  if (scene.mapNum >= mapChunkCount) {
    console.error(
      `[pal-extract] scene ${SLICE_SCENE_ID} mapNum=${scene.mapNum} >= MAP.MKF chunk count ${mapChunkCount}; ` +
        `请调整 SLICE_SCENE_ID`,
    )
    process.exit(2)
  }

  // MAP.MKF chunk N:YJ2 压缩;GOP.MKF chunk N:raw sprite chunk
  const mapBytes = decompressYj2(readChunk(mapMkf, scene.mapNum))
  const gopMkf = openMkf(loadFile('GOP.MKF'))
  const gopBytes = readChunk(gopMkf, scene.mapNum)
  const mapResult = parseMap(mapBytes, gopBytes)

  // 每个 tile 写为独立 PNG
  const tilesetFiles: string[] = []
  for (const tile of mapResult.tiles) {
    const fname = `tile-scene-${SLICE_SCENE_ID}-${tile.index.toString().padStart(4, '0')}.png`
    writeBinary(resolve(OUT, 'images', fname), tile.pngBytes)
    tilesetFiles.push(fname)
  }
  mapResult.tilemap.tilesetImage = `tile-scene-${SLICE_SCENE_ID}-*.png`
  writeJson(resolve(OUT, 'data', `tilemap-${SLICE_SCENE_ID}.json`), {
    ...mapResult.tilemap,
    tilesetFiles,
  })

  console.log(
    `[pal-extract] tilemap written (${mapResult.tiles.length} tiles)`,
  )

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

  // 场景对象切片:从切片场景 dump NPC/触发点列表(供运行时用)
  const sceneObjects = dumpScene(SLICE_SCENE_ID, sss.scenes, sss.eventObjects)
  writeJson(resolve(OUT, 'data', `scene-${SLICE_SCENE_ID}.json`), sceneObjects)
  console.log(
    `[pal-extract] scene-${SLICE_SCENE_ID}.json written (${sceneObjects.eventObjects.length} event objects)`,
  )

  // 角色 / NPC 精灵切片(M2 新增 — D27, M3 T9 改读真值)
  console.log(`[pal-extract] character sprites for scene ${SLICE_SCENE_ID} …`)

  // 队长精灵号 —— 从上面 parsePlayerRoles 得到的真值取(roles[0].spriteNum,实测 = 2)。
  // 6 个角色精灵号 = [2, 3, 7, 525, 5, 26]。M2 切片只装载队长一个 sprite,
  // 多人队伍 / 角色切换的扩展留 M5。
  const partyLeader = playerRoles.roles[0]
  if (!partyLeader) throw new Error('cli: parsePlayerRoles 返回空 roles')
  const spriteIds = new Set<number>([partyLeader.spriteNum])
  for (const eo of sceneObjects.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
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

  // ── lookup ──────────────────────────────────────────────────────
  writeJson(resolve(OUT, 'lookup', 'words.json'), words)
  writeJson(resolve(OUT, 'lookup', 'strings.json'), messages)

  console.log(`[pal-extract] done. output → ${OUT}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
