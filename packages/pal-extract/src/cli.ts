#!/usr/bin/env node
/**
 * CLI总装：源校验和翻译预检先于输出清理，资源阶段按固定顺序执行。
 * 路径、输出所有权和失败退出由此处负责；具体格式解析/资源写出由各模块负责。
 * 仅清理CLI产物，保留单独生成的videos；最终manifest在所有写出完成后扫盘。
 * 调用：仓库根目录 pnpm extract。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Symbols } from './events/annotate.js'
import { annotate, parseSymbols } from './events/annotate.js'
import { disasm } from './events/disasm.js'
import { recompile } from './events/recompile.js'
import { correctScripts, type ScriptCorrectionManifest } from './events/script-corrections.js'
import { collectScriptEntries } from './events/script-entries.js'
import { sliceByScene } from './events/slice.js'
import { openMkf, readChunk } from './io/mkf.js'
import { parseMessages } from './io/msg.js'
import { readBinary } from './io/read.js'
import { parseSlf } from './io/slf.js'
import { parseSss } from './io/sss.js'
import { parseWordDat } from './io/word.js'
import { writeJson } from './io/write.js'
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
import { writeLookupAssets } from './resources/lookup-assets.js'
import { writeMusicAssets } from './resources/music.js'
import { writeSoundAssets } from './resources/sound-assets.js'
import {
  writeBattleSpriteAssets,
  writeBattleSpriteManifest,
  writeCharacterSpriteAssets,
} from './resources/sprite-assets.js'
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

function loadFile(name: string): Uint8Array {
  return readBinary(resolve(RAW, name))
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

  // 输出必须由本CLI独占。先检查所有权；实际清理仍须等源/翻译预检成功。
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
  const sssObjBuf = readChunk(openMkf(loadFile('SSS.MKF')), 2)
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
  // Supplemental objects keep explicit scene ownership without entering native SSS ranges.
  // Their hooks need global labels as well as the owning scene's reachable-script slice.
  const sceneExtraRoots: Record<number, number[]> = {}
  for (const entry of corrected?.supplementalObjects ?? [])
    for (const label of [entry.object.triggerLabel, entry.object.autoLabel])
      if (label) {
        const ip = Number(label.slice(2))
        entryIps.push(ip)
        const roots = sceneExtraRoots[entry.sceneId] ?? []
        roots.push(ip)
        sceneExtraRoots[entry.sceneId] = roots
      }
  const commands = disasm(sss.bytecode, messages, entryIps)
  const annotated = annotate(commands, words, symbols)
  const sliced = sliceByScene(
    annotated,
    sss.scenes,
    sss.eventObjects,
    globalScriptEntries,
    sceneExtraRoots,
  )

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

  writeSoundAssets(RAW, OUT)

  // 文件名归一化、原始音乐字节和manifest由音乐阶段统一写出；不负责输出清理。
  writeMusicAssets(RAW, OUT)

  writeSplashAssets(RAW, OUT)

  console.log('[pal-extract] data tables written')

  writeWorldAssets(
    RAW,
    OUT,
    sss.scenes,
    sss.eventObjects,
    corrected?.eventMetadata,
    corrected?.supplementalObjects,
  )

  writePaletteAssets(RAW, OUT)

  writeCharacterSpriteAssets(RAW, OUT)

  const battleSpriteIds = writeBattleSpriteAssets(RAW, OUT)

  writeBattleBackgroundAssets(RAW, OUT)

  writeBattleSpriteManifest(OUT, battleSpriteIds)

  writeLookupAssets(RAW, OUT, words, messages, englishPack)

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
