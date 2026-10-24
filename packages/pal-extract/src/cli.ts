#!/usr/bin/env node
/**
 * pal-extract CLI —— 总装入口。
 * 调用:pnpm extract (从仓库根)
 *
 * 产出目录:data/extracted/(2026-06-22 资源管线优化后的现状)
 *   events/   scene-NNN.json, shared.json, objects.json, all.json(生产cursor默认的完整命令数组)
 *   data/
 *     tileset/{mapNum}.rle、sprite/{id}.rle、battle-sprite/{kind}/{id}.rle、
 *     magic/{effect,fire-NN}.rle、animation/rng-NN.rle
 *       (以上均为 gzip 的 RLE/YJ2-解压后 chunk blob,后缀 .rle 避开
 *        Content-Encoding 双解压;取代旧 per-tile/per-frame RGBA PNG)
 *     各数据表 json:items/spells/magic/enemies/enemy-teams/battle-fields/
 *     stores/enemy-pos/player-roles/level-up-exp 与 level-up-magic/battle-effect-index/
 *     object-{magics,poisons,players}/enemy-objects/dialog-icons-raw 等
 *     manifest:portraits/items-icons/rng-frames/fire-sprites/sounds-metadata/
 *     music-manifest/battle-bgs/battle-sprites
 *   images/
 *     portraits/{NN}.png(RGM)、items/{NNN}.png(BALL)、battle/bg/{NNN}.png、
 *     ui/frame-NN.png(chunk 9)、splash/(FBP 3/4)——仍为 PNG 的只有这些
 *   sounds/{i}.wav、music/(MIDI/OGG/mus.mkf)、lookup/{words,strings}.json、
 *   data/font/glyphs.json、asset-manifest.json
 *   (rng-frames.json 为 frameCount manifest,不含 PNG;RGM/BALL 亦 PNG 解码)
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { decodeRngFrames } from '@type-pal/shared'
import type { Symbols } from './events/annotate.js'
import { annotate, parseSymbols } from './events/annotate.js'
import { disasm } from './events/disasm.js'
import { recompile } from './events/recompile.js'
import { correctScripts, type ScriptCorrectionManifest } from './events/script-corrections.js'
import { collectScriptEntries } from './events/script-entries.js'
import { sliceByScene } from './events/slice.js'
import { glyphsToJson, parseBdf } from './font/bdf-to-json.js'
import { chunkCount, openMkf, readChunk } from './io/mkf.js'
import { parseMessages } from './io/msg.js'
import { readBinary } from './io/read.js'
import { parseSlf } from './io/slf.js'
import { parseSss } from './io/sss.js'
import { parseWordDat } from './io/word.js'
import { writeBinary, writeJson } from './io/write.js'
import { decompressYj2 } from './io/yj2.js'
import { buildLanguagePack } from './localization/build-language-pack.js'
import { englishRevisions } from './localization/english-revisions.js'
import { assertOwnedOutputRoot } from './output-boundary.js'
import { buildManifest, collectAssetEntries } from './resources/asset-manifest.js'
import { writeDataAssets } from './resources/data-assets.js'
import { writeMusicAssets } from './resources/music.js'
import { decodePalette } from './resources/palette.js'
import { decodeBallIcon } from './resources/parsers/ball.js'
import { decodeRgmPortrait } from './resources/parsers/rgm.js'
import { dumpSoundsMetadata } from './resources/parsers/sounds.js'
import { encodeIndexedPng, parseSpriteChunk } from './resources/sprite.js'
import {
  parseEnemyObjects,
  parseItems,
  parseObjectPlayers,
  parseSpells,
} from './resources/tables.js'
import { writeWorldAssets } from './resources/world-assets.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')
const RAW = resolve(REPO_ROOT, 'data/raw')
const DATA_ROOT = resolve(REPO_ROOT, 'data')
const OUT = resolve(DATA_ROOT, 'extracted')
const SYMBOLS_PATH = resolve(REPO_ROOT, 'data/symbols.json')

/** Keep the CLI entrypoint's ownership check directly testable without spawning a child. */
export function prepareOutputRoot(dataRoot: string = DATA_ROOT, outputRoot: string = OUT): void {
  assertOwnedOutputRoot(dataRoot, outputRoot)
}

/**
 * NPC/角色 sprite 资源管线优化(2026-06-22):每 sprite 存一个 gzip 的 RLE blob
 * (= gzip(YJ2 解压后的 MGO sprite chunk)),取代旧 per-frame RGBA PNG + sprite-{id}.json。
 * runtime loadCharacterSpriteBlob 用 DecompressionStream + parseSpriteChunk 解。
 * 后缀 `.rle` 同 tileset(避开 .gz 触发的 Content-Encoding 双解压)。
 */
function spriteBlobPath(spriteId: number): string {
  return resolve(OUT, 'data', 'sprite', `${spriteId}.rle`)
}

function imageBattleBgPath(bgId: number): string {
  return resolve(OUT, 'images', 'battle', 'bg', `${bgId.toString().padStart(3, '0')}.png`)
}

// 资源管线优化(2026-06-22):battle / magic sprite 同 tileset/npc 改 gzip RLE blob,后缀 `.rle`。
function battleSpriteBlobPath(kind: 'enemy' | 'player', id: number): string {
  return resolve(OUT, 'data', 'battle-sprite', kind, `${id}.rle`)
}

/** FIRE.MKF 每 chunk(法术特效)blob。 */
function magicFireBlobPath(chunkIdx: number): string {
  return resolve(OUT, 'data', 'magic', `fire-${chunkIdx.toString().padStart(2, '0')}.rle`)
}

/** Internal JSON destinations used by this entrypoint; writeJson owns directory creation. */
function dataSubdirPath(subdir: 'palette', name: string): string {
  return resolve(OUT, 'data', subdir, `${name}.json`)
}

function loadFile(name: string): Uint8Array {
  return readBinary(resolve(RAW, name))
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
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: pal-extract [--faithful] [--english-slf PATH]\nDefault: apply reviewed corrections to the supported Win archive.\n--faithful: decode without corrections for source audits (Chinese only).\n--english-slf: optional Win v3.3 language input; defaults to data/en/win_files/m_eng.slf when available.',
    )
    return
  }
  const faithful = process.argv.includes('--faithful')
  console.log('[pal-extract] start')

  // 清理 cli 旧产物:data/extracted 是 gitignore 的可重生成物。清掉再写,避免上次 extract 的
  // 陈旧文件残留(尤其已迁移成 gzip blob 的旧 PNG)被 asset-manifest 扫进 SW 预缓存白占空间。
  // ⚠️ 但**只清 cli 自己产出的**:`videos/` 由 `extract:videos`(scripts/extract-videos.ts,ffmpeg
  // avi→mp4)单独生成,pnpm extract 不重建它 —— 一并清掉会让开场视频 404,rsync --delete 还会删到线上。
  // 故保留 PRESERVE 列表里的非 cli 产物;其余全清。OUT 是固定常量,清前再 guard 一道。
  prepareOutputRoot()
  if (!OUT.endsWith(`${sep}data${sep}extracted`)) {
    throw new Error(`[pal-extract] refuse to clean unexpected OUT: ${OUT}`)
  }
  // ── 共享数据 ────────────────────────────────────────────────────
  const sssBuf = loadFile('SSS.MKF')
  let sss = parseSss(sssBuf)
  const sourceSha256 = createHash('sha256').update(sssBuf).digest('hex')
  const messageBytes = loadFile('M.MSG')
  let messages = parseMessages(messageBytes, sss.messageOffsets)
  const words = parseWordDat(loadFile('WORD.DAT'))
  const symbols: Symbols = existsSync(SYMBOLS_PATH)
    ? parseSymbols(JSON.parse(readFileSync(SYMBOLS_PATH, 'utf-8')))
    : {}

  console.log(
    `[pal-extract] scenes=${sss.scenes.length}, events=${sss.eventObjects.length}, bytecode=${sss.bytecode.byteLength}B`,
  )

  // ── 事件管线(全量) ─────────────────────────────────────────────
  console.log('[pal-extract] events …')

  // Parse shared OBJECT tables once; their hooks are roots even without a scene reference.
  const sssObjBuf = loadMkfChunk('SSS.MKF', 2)
  const items = parseItems(sssObjBuf, words)
  const spells = parseSpells(sssObjBuf, words)
  const enemyObjects = parseEnemyObjects(sssObjBuf, words)
  const objectPlayers = parseObjectPlayers(sssObjBuf)

  const sources = {
    scenes: sss.scenes,
    eventObjects: sss.eventObjects,
    items,
    spells,
    enemyObjects,
    objectPlayers,
  }
  const originalEntries = collectScriptEntries(sources)
  const rawCommands = disasm(sss.bytecode, messages, originalEntries.entryIps)

  // round-trip 自检
  const verify = recompile(rawCommands, messages)
  if (verify.byteLength !== sss.bytecode.byteLength || !equalBytes(verify, sss.bytecode)) {
    console.error('[pal-extract] ROUND-TRIP FAILED — events 不忠实')
    process.exit(2)
  }
  console.log('[pal-extract] events round-trip OK')

  const corrected = faithful ? undefined : correctScripts(sss, sourceSha256, messages)
  if (corrected) {
    sss = corrected.sss
    messages = corrected.messages
  }
  const correctionManifest: ScriptCorrectionManifest = corrected?.manifest ?? {
    source: { file: 'SSS.MKF', sha256: sourceSha256 },
    mode: 'faithful',
    version: null,
    rules: [],
  }
  const englishOption = process.argv.indexOf('--english-slf')
  const explicitEnglishPath = englishOption < 0 ? undefined : process.argv[englishOption + 1]
  if (englishOption >= 0 && (!explicitEnglishPath || explicitEnglishPath.startsWith('--')))
    throw new Error('--english-slf requires a file path')
  if (faithful && explicitEnglishPath) throw new Error('--faithful cannot use --english-slf')
  const englishPath = explicitEnglishPath
    ? resolve(explicitEnglishPath)
    : resolve(REPO_ROOT, 'data/en/win_files/m_eng.slf')
  if (explicitEnglishPath && !existsSync(englishPath))
    throw new Error(`English SLF does not exist: ${englishPath}`)
  const englishBytes = !faithful && existsSync(englishPath) ? readFileSync(englishPath) : undefined
  // Translation preflight precedes output cleanup. Scripts and words stay common to both languages.
  const englishPack = englishBytes
    ? buildLanguagePack(
        parseSlf(new TextDecoder('utf-8', { fatal: true }).decode(englishBytes)),
        disasm(sss.bytecode, messages),
        {
          slfSha256: createHash('sha256').update(englishBytes).digest('hex'),
          // This is the corrected instruction stream, not the raw SSS.MKF archive hash.
          scriptSha256: createHash('sha256').update(sss.bytecode).digest('hex'),
          messageSha256: createHash('sha256').update(messageBytes).digest('hex'),
        },
        englishRevisions,
      )
    : undefined
  // No existing output is removed until source identity, faithful round-trip and old values pass.
  mkdirSync(OUT, { recursive: true })
  const PRESERVE = new Set(['videos']) // 非 cli 步骤产物,勿删(见 extract:videos)
  for (const entry of readdirSync(OUT)) {
    if (PRESERVE.has(entry)) continue
    rmSync(resolve(OUT, entry), { recursive: true, force: true })
  }

  writeJson(resolve(OUT, 'script-corrections.json'), {
    ...correctionManifest,
    messages: {
      file: 'M.MSG',
      sha256: createHash('sha256').update(messageBytes).digest('hex'),
      corrections: corrected ? [{ messageIndex: 1503, before: '看错痢?', after: '看错了' }] : [],
    },
  })
  // Recompute roots and labels after correction, including appended blocks and changed object hooks.
  const { entryIps, globalScriptEntries } = collectScriptEntries({
    ...sources,
    scenes: sss.scenes,
    eventObjects: sss.eventObjects,
  })
  const commands = disasm(sss.bytecode, messages, entryIps)
  const annotated = annotate(commands, words, symbols)
  const sliced = sliceByScene(annotated, sss.scenes, sss.eventObjects, globalScriptEntries)

  sliced.scenes.forEach((sceneFile, i) => {
    const padded = i.toString().padStart(3, '0')
    writeJson(resolve(OUT, 'events', `scene-${padded}.json`), sceneFile)
  })
  writeJson(resolve(OUT, 'events', 'shared.json'), sliced.shared)
  writeJson(resolve(OUT, 'events', 'objects.json'), sliced.objects)

  // Production cursors default to this full array (script-catalog.ts::getCmds).
  // Keep global indices/labels; per-scene/shared files remain separate extraction outputs.
  writeJson(resolve(OUT, 'events', 'all.json'), {
    segments: [{ name: 'all', commands: annotated }],
  })

  console.log(
    `[pal-extract] events written: ${sliced.scenes.length} scenes + shared(含 ${globalScriptEntries.length} item/spell/enemyObj script entries)+ objects + all(${annotated.length} 全局命令)`,
  )

  writeDataAssets(RAW, OUT, sssObjBuf, words, { items, spells, enemyObjects, objectPlayers })

  // RNG/FIRE保留压缩blob与帧清单；RGM/BALL解码为索引PNG。
  // SAVE.MKF 不存在(WIN95+ 用 .RPG 存档),drop。

  // RNG.MKF: 12 chunks, 每 chunk 是 sub-MKF + RLE delta 动画帧(rngplay.c)
  // 资源管线优化(2026-06-22):从「逐帧 320×200 PNG(92MB)」改为「每 chunk 一个 gzip 的
  // 原始 RNG chunk(.rle,~MB)」。runtime decodeRngFrames(@type-pal/shared)解。manifest
  // 仍写(frameCount 供 player startFrame/endFrame),由 decodeRngFrames 计数(无 PNG 编码)。
  // 后缀 `.rle` 避开 .gz 触发的 Content-Encoding 双解压(同 tileset)。
  {
    const rngMkf = openMkf(loadFile('RNG.MKF'))
    const n = chunkCount(rngMkf)
    const manifest: Array<{
      chunkIndex: number
      frameCount: number
      frames: Array<{ index: number }>
    }> = []
    let totalRngFrames = 0
    for (let i = 0; i < n; i++) {
      const chunk = readChunk(rngMkf, i)
      let frames: ReturnType<typeof decodeRngFrames>
      try {
        frames = decodeRngFrames(chunk)
      } catch (err) {
        console.warn(`[pal-extract] RNG chunk ${i} decode fail, skip:`, err)
        continue
      }
      writeBinary(
        resolve(OUT, 'data', 'animation', `rng-${i.toString().padStart(2, '0')}.rle`),
        gzipSync(chunk),
      )
      manifest.push({
        chunkIndex: i,
        frameCount: frames.length,
        frames: frames.map((f) => ({ index: f.index })),
      })
      totalRngFrames += frames.length
    }
    writeJson(resolve(OUT, 'data', 'rng-frames.json'), { chunks: manifest })
    console.log(`[pal-extract] RNG.MKF blobs written (${n} chunks, ${totalRngFrames} frames total)`)
  }

  // RGM.MKF: 92 chunks, 每 chunk 是单帧 RLE bitmap 角色头像(sdlpal global.h fpRGM)。
  // M5.6 audit 第 2 真漏洞修(2026-05-27 T10d):decodeRle → encodeIndexedPng → PNG。
  // 输出 images/portraits/{NN}.png + data/portraits.json manifest。
  // 索引方式 = `PlayerRoles.rgwAvatar[roleId]`(sdlpal uigame.c:1132 真值)→ ts
  // PlayerStatus / DialogBox portrait blit 用。
  {
    const rgmMkf = openMkf(loadFile('RGM.MKF'))
    const n = chunkCount(rgmMkf)
    const manifest: Array<{ chunkIndex: number; width: number; height: number }> = []
    let written = 0
    for (let i = 0; i < n; i++) {
      const portrait = decodeRgmPortrait(i, readChunk(rgmMkf, i))
      if (!portrait) continue
      writeBinary(
        resolve(OUT, 'images', 'portraits', `${i.toString().padStart(2, '0')}.png`),
        portrait.pngBytes,
      )
      manifest.push({
        chunkIndex: portrait.chunkIndex,
        width: portrait.width,
        height: portrait.height,
      })
      written++
    }
    writeJson(resolve(OUT, 'data', 'portraits.json'), { count: n, portraits: manifest })
    console.log(
      `[pal-extract] RGM.MKF written: ${written} / ${n} portraits → images/portraits/{NN}.png`,
    )
  }

  // BALL.MKF: 252 chunks, 每 chunk 是单帧 RLE bitmap 物品图标(sdlpal global.h fpBALL)。
  // M5.6 audit 第 1 真漏洞修(2026-05-27):decodeRle → encodeIndexedPng → PNG。
  // 输出 images/items/{NNN}.png + data/items-icons.json manifest。
  // 索引方式 = `OBJECT.item.wBitmap`(sdlpal itemmenu.c:201 真值)→ ts InventoryMenu fullscreen 用。
  {
    const ballMkf = openMkf(loadFile('BALL.MKF'))
    const n = chunkCount(ballMkf)
    const manifest: Array<{ chunkIndex: number; width: number; height: number }> = []
    let written = 0
    for (let i = 0; i < n; i++) {
      const icon = decodeBallIcon(i, readChunk(ballMkf, i))
      if (!icon) continue
      writeBinary(
        resolve(OUT, 'images', 'items', `${i.toString().padStart(3, '0')}.png`),
        icon.pngBytes,
      )
      manifest.push({ chunkIndex: icon.chunkIndex, width: icon.width, height: icon.height })
      written++
    }
    writeJson(resolve(OUT, 'data', 'items-icons.json'), { count: n, icons: manifest })
    console.log(`[pal-extract] BALL.MKF written: ${written} / ${n} icons → images/items/{NNN}.png`)
  }

  // FIRE.MKF: 55 chunks, 每 chunk 是 YJ2 sprite group(fight.c PAL_MKFDecompressChunk)
  // 资源管线优化:每 chunk 存 gzip 的 YJ2-解压后 sprite chunk(去 per-frame PNG)。
  // runtime loadSpriteFramesBlob 解;fire-sprites.json manifest 仍写(frameCount 供 anim-timeline)。
  {
    const fireMkf = openMkf(loadFile('FIRE.MKF'))
    const n = chunkCount(fireMkf)
    let totalFireFrames = 0
    const fireManifest: Array<{
      chunkIndex: number
      frameCount: number
      frames: Array<{ index: number; width: number; height: number }>
    }> = []
    for (let i = 0; i < n; i++) {
      const buf = readChunk(fireMkf, i)
      let decompressed: Uint8Array
      try {
        decompressed = decompressYj2(buf)
      } catch {
        decompressed = buf
      }
      const frames = decompressed.byteLength < 2 ? [] : parseSpriteChunk(decompressed)
      if (frames.length > 0) writeBinary(magicFireBlobPath(i), gzipSync(decompressed))
      fireManifest.push({
        chunkIndex: i,
        frameCount: frames.length,
        frames: frames.map((f, idx) => ({ index: idx, width: f.width, height: f.height })),
      })
      totalFireFrames += frames.length
    }
    writeJson(resolve(OUT, 'data', 'fire-sprites.json'), { chunkCount: n, chunks: fireManifest })
    console.log(
      `[pal-extract] FIRE.MKF blobs written (${n} chunks, ${totalFireFrames} frames total)`,
    )
  }

  // SOUNDS.MKF 完整提取(2026-05-29 user 要求):每个非空 chunk 本身就是一个完整 RIFF/WAVE 文件
  // (WIN95 build,实测 505 chunk = 363 RIFF/WAVE + 142 空),sdlpal sound.c SDL_LoadWAV_RW 直接读。
  // → 整块写 sounds/{i}.wav;空 chunk 不写。仍保留 metadata.json(index→size/empty 索引)。
  console.log('[pal-extract] SOUNDS.MKF (full WAV dump) …')
  const soundsMkf = openMkf(loadFile('SOUNDS.MKF'))
  const soundsN = chunkCount(soundsMkf)
  const soundsBufs: Uint8Array[] = []
  let wavWritten = 0
  for (let i = 0; i < soundsN; i++) {
    const buf = readChunk(soundsMkf, i)
    soundsBufs.push(buf)
    if (buf.byteLength === 0) continue // 空 chunk(142 个)skip
    writeBinary(resolve(OUT, 'sounds', `${i}.wav`), buf)
    wavWritten++
  }
  writeJson(resolve(OUT, 'data', 'sounds-metadata.json'), dumpSoundsMetadata(soundsBufs))
  console.log(`[pal-extract] SOUNDS.MKF: ${wavWritten} WAV written + metadata (${soundsN} chunks)`)

  // 文件名归一化、原始音乐字节和manifest由音乐阶段统一写出；不负责输出清理。
  writeMusicAssets(RAW, OUT)

  // splash 素材:FBP.MKF chunk 3(BITMAPNUM_SPLASH_UP WIN95=0x03) +
  //             chunk 4(BITMAPNUM_SPLASH_DOWN WIN95=0x04)。
  // sdlpal main.c:42-43:  #define BITMAPNUM_SPLASH_UP (gConfig.fIsWIN95 ? 0x03 : 0x26)
  //                       #define BITMAPNUM_SPLASH_DOWN (gConfig.fIsWIN95 ? 0x04 : 0x27)
  // 读取方式:PAL_MKFReadChunk(raw) → Decompress(=YJ2 for WIN95) → 320×200 raw indexed。
  // 注:后面的battle bg循环也会把chunk 3/4写到images/battle/bg/003.png + 004.png;
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
        console.warn(
          `[pal-extract] splash FBP chunk ${id}: 解压后 ${pixels.byteLength} bytes ≠ 64000, skip`,
        )
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

  writeWorldAssets(RAW, OUT, sss.scenes, sss.eventObjects, corrected?.eventMetadata)

  // 调色板:PAT.MKF 全量 dump
  const patMkf = openMkf(loadFile('PAT.MKF'))
  const patChunkCount = chunkCount(patMkf)
  let palWritten = 0
  for (let i = 0; i < patChunkCount; i++) {
    const palBuf = readChunk(patMkf, i)
    if (palBuf.byteLength < 768) continue // 跳过非调色板 chunk
    // 传**整块**(不再 subarray(0,768))→ decodePalette 自动抽夜间半(1536B chunk,实测 #0/#5)。
    writeJson(dataSubdirPath('palette', String(i)), decodePalette(palBuf))
    palWritten++
  }
  console.log(`[pal-extract] palette written (${palWritten} chunks)`)

  // 角色 / NPC 精灵切片
  // M5.Sync.2 修:**dump 全 MGO.MKF 0..chunkCount-1**,不再 filter scene EO + player role 引用。
  //
  // M4 漏洞:旧策略 "filter first then dump"(只收 scene.eventObjects.spriteNum + playerRoles.spriteNum)
  //          → cutscene-only sprite(opcode 0x65 setPlayerSprite 切换的主角 pose group,如 sprite 627 = 李逍遥
  //          躺/起/抱胸/大侠 4 帧 pose)从未在 scene 静态字段出现,被完全漏掉 — 97 个 MGO chunk 缺失。
  // 修法:dump first,filter never。MGO.MKF 全 637 chunks 都尝试解;空 / YJ2 fail chunk 防御 skip。
  // Each accepted chunk is written as a gzip RLE blob; no per-frame PNG or sprite JSON.
  console.log('[pal-extract] character sprites: 全 MGO.MKF chunks (dump-all, no filter) …')

  const mgoMkf = openMkf(loadFile('MGO.MKF'))
  const mgoChunkCount = chunkCount(mgoMkf)
  const spriteIds = new Set<number>()
  const mgoChunks = new Map<number, Uint8Array>()
  for (let id = 0; id < mgoChunkCount; id++) {
    const raw = readChunk(mgoMkf, id)
    if (raw.byteLength === 0) continue // 空 chunk 静默 skip(MGO 内有合法空槽)
    // MGO.MKF chunk 是 YJ2 压缩 —— 防御性 try/catch 覆盖极少数格式异常 chunk。
    try {
      mgoChunks.set(id, decompressYj2(raw))
      spriteIds.add(id)
    } catch (err) {
      console.warn(`[pal-extract] sprite ${id} YJ2 fail, skip:`, err)
    }
  }
  console.log(`[pal-extract] sprite scan: ${spriteIds.size} / ${mgoChunkCount} MGO chunks 可解`)

  // NPC sprite 资源管线优化:每 sprite 存 gzip 的 YJ2-解压后 sprite chunk(去 per-frame PNG +
  // sprite-{id}.json)。runtime parseSpriteChunk 出帧、按首帧 floor(w/2)/h 派生锚点。
  let spriteFramesTotal = 0
  for (const id of spriteIds) {
    const chunk = mgoChunks.get(id)!
    writeBinary(spriteBlobPath(id), gzipSync(chunk))
    spriteFramesTotal += parseSpriteChunk(chunk).length
  }

  console.log(
    `[pal-extract] sprite blobs written: ${spriteIds.size} sprites, ${spriteFramesTotal} frames total`,
  )

  // ── 战斗 sprite(M3 T24,M5.Sync.2 改 dump-all) ──────────────────
  // 数据源真值(reference/sdlpal/battle.c:856 PAL_LoadBattleSprites):
  //   - 队员战斗 sprite:F.MKF chunk[spriteNumInBattle]
  //   - 敌方战斗 sprite:**ABC.MKF**(非 F.MKF)chunk[wEnemyID]
  //
  // M5.Sync.2 修:同 MGO 改 dump-all。F.MKF 19 chunks 之前只 dump 6 个 player role 引用 → 漏 13;
  //               ABC.MKF 154 chunks 之前 filter enemy.id>0 跳过 chunk 0 → 漏 1。dump first 同治。
  console.log('[pal-extract] battle sprites: 全 F.MKF + ABC.MKF chunks (dump-all) …')

  const fMkf = openMkf(loadFile('F.MKF'))
  const fChunkCount = chunkCount(fMkf)
  const abcMkf = openMkf(loadFile('ABC.MKF'))
  const abcChunkCount = chunkCount(abcMkf)
  const battleSpriteIds: Array<{ id: number; kind: 'enemy' | 'player' }> = []
  const battleChunks = new Map<string, Uint8Array>()

  const loadBattleMkf = (
    kind: 'player' | 'enemy',
    mkf: ReturnType<typeof openMkf>,
    total: number,
  ): void => {
    for (let id = 0; id < total; id++) {
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
      battleSpriteIds.push({ id, kind })
    }
  }
  loadBattleMkf('player', fMkf, fChunkCount)
  loadBattleMkf('enemy', abcMkf, abcChunkCount)

  // 战斗 sprite 资源管线优化:每 sprite 存 gzip 的(YJ2 解压后)sprite chunk,去 per-frame
  // PNG + battle-sprite-{kind}/{id}.json。runtime loadSpriteFramesBlob 解。battle-sprites.json
  // manifest(下方写)仍列出 {kind,id} 供 runtime 知道加载哪些。
  let battleFramesTotal = 0
  for (const { id, kind } of battleSpriteIds) {
    const chunk = battleChunks.get(`${kind}:${id}`)!
    writeBinary(battleSpriteBlobPath(kind, id), gzipSync(chunk))
    battleFramesTotal += parseSpriteChunk(chunk).length
  }

  console.log(
    `[pal-extract] battle sprite blobs written: ${battleSpriteIds.length} sprites, ${battleFramesTotal} frames total`,
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
      console.warn(`[pal-extract] FBP chunk ${i}: 解压后 ${pixels.byteLength} bytes ≠ 64000,skip`)
      continue
    }
    writeBinary(imageBattleBgPath(i), encodeIndexedPng(320, 200, pixels))
    bgIds.push(i)
  }
  // M3 T25:battle-bgs.json 直接列出所有有效 bg id —— loader 按列表加载,免 404。
  writeJson(resolve(OUT, 'data', 'battle-bgs.json'), { count: fbpChunkCount, ids: bgIds })
  console.log(`[pal-extract] battle backgrounds written: ${bgIds.length} / ${fbpChunkCount} chunks`)

  // ── 战斗精灵 manifest(M3 T25 loader 用) ─────────────────────────
  // 列出 battle sprite 的 (kind, id) — loader 按 manifest 加载,避免 404 / 列目录。
  const battleSpriteManifest = battleSpriteIds.map((s) => ({
    kind: s.kind,
    id: s.id,
  }))
  writeJson(resolve(OUT, 'data', 'battle-sprites.json'), { sprites: battleSpriteManifest })

  // ── lookup ──────────────────────────────────────────────────────
  writeJson(resolve(OUT, 'lookup', 'words.json'), words)
  writeJson(resolve(OUT, 'lookup', 'strings.json'), messages)
  writeJson(resolve(OUT, 'lookup', 'languages.json'), {
    languages: englishPack ? ['zh-CN', 'en'] : ['zh-CN'],
  })
  if (englishPack) writeJson(resolve(OUT, 'lookup', 'en.json'), englishPack)

  // M4 P4.T2: BDF → JSON glyph 表
  const BDF_PATH = resolve(RAW, 'unifont-cn.bdf')
  if (existsSync(BDF_PATH)) {
    console.log('[pal-extract] BDF → JSON font glyphs …')
    const bdfText = readFileSync(BDF_PATH, 'utf8')
    const glyphs = parseBdf(bdfText)
    writeJson(resolve(OUT, 'data', 'font', 'glyphs.json'), glyphsToJson(glyphs))
    console.log(`[pal-extract] font glyphs written: ${glyphs.length}`)
  } else {
    console.warn('[pal-extract] unifont-cn.bdf 缺,跳过 font')
  }

  // 全资源清单(Service Worker 离线预缓存用)。须在所有产出写完后扫盘,排除自身。
  const manifest = {
    ...buildManifest(collectAssetEntries(OUT)),
    scriptCorrections: correctionManifest,
  }
  writeJson(resolve(OUT, 'asset-manifest.json'), manifest)
  console.log(
    `[extract] asset-manifest.json: ${manifest.fileCount} files, ` +
      `${(manifest.totalBytes / 1024 / 1024).toFixed(0)}MB, version=${manifest.version}`,
  )

  console.log(`[pal-extract] done. output → ${OUT}`)
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
