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
import { writeFireAssets, writeRngAssets } from './resources/animation-assets.js'
import { buildManifest, collectAssetEntries } from './resources/asset-manifest.js'
import {
  writeBattleBackgroundAssets,
  writeItemIconAssets,
  writePaletteAssets,
  writePortraitAssets,
  writeSplashAssets,
} from './resources/bitmap-assets.js'
import { writeDataAssets } from './resources/data-assets.js'
import { writeMusicAssets } from './resources/music.js'
import { dumpSoundsMetadata } from './resources/parsers/sounds.js'
import { parseSpriteChunk } from './resources/sprite.js'
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

// 资源管线优化(2026-06-22):battle / magic sprite 同 tileset/npc 改 gzip RLE blob,后缀 `.rle`。
function battleSpriteBlobPath(kind: 'enemy' | 'player', id: number): string {
  return resolve(OUT, 'data', 'battle-sprite', kind, `${id}.rle`)
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

  writeRngAssets(RAW, OUT)

  writePortraitAssets(RAW, OUT)

  writeItemIconAssets(RAW, OUT)

  writeFireAssets(RAW, OUT)

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

  writeSplashAssets(RAW, OUT)

  console.log('[pal-extract] data tables written')

  writeWorldAssets(RAW, OUT, sss.scenes, sss.eventObjects, corrected?.eventMetadata)

  writePaletteAssets(RAW, OUT)

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

  writeBattleBackgroundAssets(RAW, OUT)

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
