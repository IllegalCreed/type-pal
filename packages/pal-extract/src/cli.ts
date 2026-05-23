#!/usr/bin/env node
/**
 * pal-extract CLI —— 总装入口。
 * 调用:pnpm extract (从仓库根)
 *
 * 产出目录:data/extracted/
 *   events/   scene-NNN.json, shared.json, objects.json
 *   data/     items.json, spells.json, enemies.json, tilemap-N.json, palette-N.json
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
import { parseEnemies, parseItems, parseSpells } from './resources/tables.js'

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
  const rawCommands = disasm(sss.bytecode, messages)

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

  // DATA.MKF chunk 4 = MAGIC 法术细节;chunk 1 = ENEMY 敌人基础数据
  const dataMkf = openMkf(loadFile('DATA.MKF'))
  const magicBuf = readChunk(dataMkf, 4)
  const enemyBuf = readChunk(dataMkf, 1)

  writeJson(resolve(OUT, 'data', 'items.json'), parseItems(sssObjBuf, words))
  writeJson(resolve(OUT, 'data', 'spells.json'), parseSpells(sssObjBuf, magicBuf, words))
  writeJson(resolve(OUT, 'data', 'enemies.json'), parseEnemies(sssObjBuf, enemyBuf, words))

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

  // 精灵切片:M1 暂不实现(缺少 sprite-membership-by-scene 逻辑)
  console.log(
    `[pal-extract] TODO: per-scene sprite slicing — skipped in M1`,
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
