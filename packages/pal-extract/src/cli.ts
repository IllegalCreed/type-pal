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
 *     rng-frames.json, rgm-raw.json, ball-raw.json (rng: decoded PNG; rgm/ball: raw dump, T18.5+ 真做)
 *     fire-sprites.json                            (FIRE.MKF sprite manifest, M4 P2 T4)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Symbols } from './events/annotate.js'
import { glyphsToJson, parseBdf } from './font/bdf-to-json.js'
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
import { dumpAllEventObjects, dumpScene } from './resources/scene.js'
import { encodeIndexedPng, extractCharacterSprites, framesToOut, parseSpriteChunk } from './resources/sprite.js'
import {
  parseBattleEffectIndex,
  parseLevelUpExp,
  parseLevelUpMagic,
  type RawChunkDump,
} from './resources/parsers/data-misc.js'
import { decodeRngAnim } from './resources/parsers/rng-frames.js'
import { decodeRgmPortrait } from './resources/parsers/rgm.js'
import { decodeBallIcon } from './resources/parsers/ball.js'
import { parseFirSprite } from './resources/parsers/fire.js'
import { dumpSoundsMetadata } from './resources/parsers/sounds.js'
import {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
  parseBattleFields,
  parseEnemies,
  parseEnemyObjects,
  parseEnemyTeams,
  parseItems,
  parseMagicTable,
  parsePlayerRoles,
  parseSpells,
  parseStores,
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

  // 收集所有入口 ip(可能未被任何跳转指向,但运行时要从此进入,需打 label)。
  // M5.6 audit 第 3 漏洞修:items/spells/enemyObjects 的 scriptOn* 也加进来,
  // 否则 disasm 不会给这些命令打 L_ 标签,runtime 无法按 label 查 ip。
  // (parse items/spells/enemyObjects 见下面 globalScriptEntries 收集段。)
  const sssObjBuf = loadMkfChunk('SSS.MKF', 2)
  const items = parseItems(sssObjBuf, words)
  const spells = parseSpells(sssObjBuf, words)
  const enemyObjects = parseEnemyObjects(sssObjBuf, words)

  const globalScriptEntries: number[] = []
  for (const it of items) {
    if (it.scriptOnUse > 0) globalScriptEntries.push(it.scriptOnUse)
    if (it.scriptOnEquip > 0) globalScriptEntries.push(it.scriptOnEquip)
    if (it.scriptOnThrow > 0) globalScriptEntries.push(it.scriptOnThrow)
    if (it.scriptDesc > 0) globalScriptEntries.push(it.scriptDesc)
  }
  for (const sp of spells) {
    if (sp.scriptOnUse > 0) globalScriptEntries.push(sp.scriptOnUse)
    if (sp.scriptOnSuccess > 0) globalScriptEntries.push(sp.scriptOnSuccess)
    if (sp.scriptDesc > 0) globalScriptEntries.push(sp.scriptDesc)
  }
  for (const eo of enemyObjects) {
    if (eo.scriptOnTurnStart > 0) globalScriptEntries.push(eo.scriptOnTurnStart)
    if (eo.scriptOnBattleEnd > 0) globalScriptEntries.push(eo.scriptOnBattleEnd)
    if (eo.scriptOnReady > 0) globalScriptEntries.push(eo.scriptOnReady)
  }

  const entryIps: number[] = []
  for (const sc of sss.scenes) {
    if (sc.scriptOnEnter > 0) entryIps.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entryIps.push(sc.scriptOnTeleport)
  }
  for (const eo of sss.eventObjects) {
    if (eo.triggerScript > 0) entryIps.push(eo.triggerScript)
    if (eo.autoScript > 0) entryIps.push(eo.autoScript)
  }
  // M5.6 audit 第 3 漏洞修:把 items/spells/enemyObjects scripts 加进 disasm entryIps,
  // 给它们的入口指令打 L_<ip> 标签,runtime 才能查表。
  entryIps.push(...globalScriptEntries)

  const rawCommands = disasm(sss.bytecode, messages, entryIps)

  // round-trip 自检
  const verify = recompile(rawCommands, messages)
  if (verify.byteLength !== sss.bytecode.byteLength || !equalBytes(verify, sss.bytecode)) {
    console.error('[pal-extract] ROUND-TRIP FAILED — events 不忠实')
    process.exit(2)
  }
  console.log('[pal-extract] events round-trip OK')

  const annotated = annotate(rawCommands, words, symbols)
  const sliced = sliceByScene(annotated, sss.scenes, sss.eventObjects, globalScriptEntries)

  sliced.scenes.forEach((sceneFile, i) => {
    const padded = i.toString().padStart(3, '0')
    writeJson(resolve(OUT, 'events', `scene-${padded}.json`), sceneFile)
  })
  writeJson(resolve(OUT, 'events', 'shared.json'), sliced.shared)
  writeJson(resolve(OUT, 'events', 'objects.json'), sliced.objects)

  // 全局脚本数组(对应 sdlpal 单一 lprgScriptEntry)。annotated 是未切片的全量命令,索引 = 全局
  // script entry。runtime 把它当**兜底来源**:trigger/autoScript/call 的 label 在 per-scene /
  // shared 切片找不到时(跨 scene 设的脚本指针,eg. scene-3 `0x25 [20,560]` 把 scene-1 李大娘
  // trigger 设到 L_560 —— L_560 只切到 scene-3),回退全局数组解析。label = `L_<全局 entry>`,
  // 全局 labelMap 在 runtime 由索引直接建(L_<i> → i),故这里只 dump commands。
  writeJson(resolve(OUT, 'events', 'all.json'), { segments: [{ name: 'all', commands: annotated }] })

  console.log(
    `[pal-extract] events written: ${sliced.scenes.length} scenes + shared(含 ${globalScriptEntries.length} item/spell/enemyObj script entries)+ objects + all(${annotated.length} 全局命令)`,
  )

  // ── 数据表(全量) ────────────────────────────────────────────────
  console.log('[pal-extract] data tables …')

  // DATA.MKF chunk 1 = ENEMY 敌人基础数据;chunk 2 = ENEMYTEAM 敌队;
  // chunk 4 = MAGIC 法术细节;chunk 5 = BATTLEFIELD 战场背景 + 元素 buff
  // (对照 sdlpal global.c::PAL_LoadDefaultGame 的 LOAD_DATA 调用)
  const dataMkf = openMkf(loadFile('DATA.MKF'))
  const storeBuf = readChunk(dataMkf, 0)
  const enemyBuf = readChunk(dataMkf, 1)
  const teamBuf = readChunk(dataMkf, 2)
  const magicBuf = readChunk(dataMkf, 4)
  const fieldBuf = readChunk(dataMkf, 5)

  writeJson(resolve(OUT, 'data', 'items.json'), items)
  // M3 T6:Spell wrapper(SSS chunk 2) + Magic 详细 stats(DATA chunk 4)分两个文件 dump。
  // Spell.magicNumber 指向 magic[] 索引;运行时按需 join。
  writeJson(resolve(OUT, 'data', 'spells.json'), spells)
  writeJson(resolve(OUT, 'data', 'magic.json'), parseMagicTable(magicBuf))
  const enemies = parseEnemies(enemyBuf, sssObjBuf, words)
  writeJson(resolve(OUT, 'data', 'enemies.json'), enemies)
  // M5.B-w2.a:OBJECT_ENEMY 段 5 字段全 dump(scriptOnReady/scriptOnTurnStart/
  // scriptOnBattleEnd 等 AI hook),enemy-objects.json index = OBJECT 表绝对 index。
  writeJson(resolve(OUT, 'data', 'enemy-objects.json'), enemyObjects)
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
  // DATA.MKF chunk 0 = STORE 商店表(global.c:292)。买菜单 opcode 0x0026 按 operand[0] 取。
  writeJson(resolve(OUT, 'data', 'stores.json'), parseStores(storeBuf))
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

  // M5 Sync.2: DATA.MKF chunk 12 (282B) = bufDialogIcons (sdlpal text.c:891)
  // sprite group: 多帧 icon (key continue / cursor / 等),index 由 g_TextLib.bIcon 选。
  // 运行时 game 包用 parseSpriteChunk + decodeRle 解(packages/game/src/assets/rle-decode.ts)。
  // 不导 PNG — 帧很小 (~16×16),运行时解一次 cache 比磁盘 IO 还快。
  const dialogIconsBuf = readChunk(dataMkf, 12)
  writeJson(resolve(OUT, 'data', 'dialog-icons-raw.json'), {
    source: 'DATA.MKF chunk 12 — bufDialogIcons (sdlpal text.c:891 PAL_MKFReadChunk size=282)',
    size: dialogIconsBuf.byteLength,
    base64: Buffer.from(dialogIconsBuf).toString('base64'),
  })
  console.log(`[pal-extract] dialog-icons (DATA.MKF chunk 12) written: ${dialogIconsBuf.byteLength} bytes`)

  // chunk 7/8 空(0 字节);DATA.MKF count=15(有效 chunk 0-14),chunk 15 超出范围不抽

  // M4 P2 T4: RNG / RGM / BALL raw dump + FIRE sprite 抽出 ──────────────────
  // SAVE.MKF 不存在(WIN95+ 用 .RPG 存档),drop。

  // RNG.MKF: 12 chunks, 每 chunk 是 sub-MKF + RLE delta 动画帧(rngplay.c)
  // M5.6 T18 Step 2:从 raw dump 升级到 RLE delta decode → 320×200 frame PNG。
  // sdlpal `PAL_RNGReadFrame`(sub-MKF + 4-byte offsets)+ `PAL_RNGBlitToSurface`
  //(opcode 0x00-0x13 真值,见 rng-frames.ts)真做 port。
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
      let result: ReturnType<typeof decodeRngAnim>
      try {
        result = decodeRngAnim(i, chunk)
      }
      catch (err) {
        console.warn(`[pal-extract] RNG chunk ${i} decode fail, skip:`, err)
        continue
      }
      for (const f of result.frames) {
        writeBinary(
          resolve(OUT, 'images', 'animation', `rng-${i.toString().padStart(2, '0')}`,
            `frame-${f.index.toString().padStart(3, '0')}.png`),
          f.pngBytes,
        )
      }
      manifest.push({
        chunkIndex: i,
        frameCount: result.frameCount,
        frames: result.frames.map((f) => ({ index: f.index })),
      })
      totalRngFrames += result.frameCount
    }
    writeJson(resolve(OUT, 'data', 'rng-frames.json'), { chunks: manifest })
    console.log(`[pal-extract] RNG.MKF written (${n} chunks, ${totalRngFrames} frames total)`)
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
      manifest.push({ chunkIndex: portrait.chunkIndex, width: portrait.width, height: portrait.height })
      written++
    }
    writeJson(resolve(OUT, 'data', 'portraits.json'), { count: n, portraits: manifest })
    console.log(`[pal-extract] RGM.MKF written: ${written} / ${n} portraits → images/portraits/{NN}.png`)
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
    const sceneRefCount = uniqueMapNums.size
    // 2026-05-29 user 要求"全部资源提取":未被任何 scene 引用但 chunk 非空的 map(实测 #104/#164)
    // 也提取(sdlpal 运行时不加载它们,但保留供资源浏览 / 未来使用)。空 chunk(0/168/171)仍 skip。
    for (let m = 0; m < mapChunkCount; m++) {
      if (uniqueMapNums.has(m)) continue
      if (readChunk(mapMkf, m).byteLength > 0) uniqueMapNums.add(m)
    }
    console.log(
      `[pal-extract] full scope: ${allSceneCount} scenes, ${sceneRefCount} scene-ref mapNums + ${uniqueMapNums.size - sceneRefCount} unreferenced non-empty = ${uniqueMapNums.size} total`,
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

  // 忠实 sdlpal lprgEventObject:全局 event object 表(全部 + 各 scene 区间),运行时一次性加载。
  {
    const allEvtObjs = dumpAllEventObjects(sss.scenes, sss.eventObjects)
    writeJson(resolve(OUT, 'data', 'event-objects.json'), allEvtObjs)
    console.log(
      `[pal-extract] event-objects.json written: ${allEvtObjs.eventObjects.length} objects, `
      + `${Object.keys(allEvtObjs.sceneRanges).length} scene ranges`,
    )
  }

  // 调色板:PAT.MKF 全量 dump
  const patMkf = openMkf(loadFile('PAT.MKF'))
  const patChunkCount = chunkCount(patMkf)
  let palWritten = 0
  for (let i = 0; i < patChunkCount; i++) {
    const palBuf = readChunk(patMkf, i)
    if (palBuf.byteLength < 768) continue // 跳过非调色板 chunk
    // 传**整块**(不再 subarray(0,768))→ decodePalette 自动抽夜间半(1536B chunk,实测 #0/#5)。
    writeJson(
      dataSubdirPath('palette', String(i)),
      decodePalette(palBuf),
    )
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
  // 体积代价:540 → ~637 个 sprite JSON + per-frame PNG,可接受(单 sprite 几 KB)。
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
    }
    catch (err) {
      console.warn(`[pal-extract] sprite ${id} YJ2 fail, skip:`, err)
    }
  }
  console.log(`[pal-extract] sprite scan: ${spriteIds.size} / ${mgoChunkCount} MGO chunks 可解`)

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

  const loadBattleMkf = (kind: 'player' | 'enemy', mkf: ReturnType<typeof openMkf>, total: number): void => {
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

  // M4 P4.T2: BDF → JSON glyph 表
  const BDF_PATH = resolve(RAW, 'unifont-cn.bdf')
  if (existsSync(BDF_PATH)) {
    console.log('[pal-extract] BDF → JSON font glyphs …')
    const bdfText = readFileSync(BDF_PATH, 'utf8')
    const glyphs = parseBdf(bdfText)
    writeJson(resolve(OUT, 'data', 'font', 'glyphs.json'), glyphsToJson(glyphs))
    console.log(`[pal-extract] font glyphs written: ${glyphs.length}`)
  }
  else {
    console.warn('[pal-extract] unifont-cn.bdf 缺,跳过 font')
  }

  console.log(`[pal-extract] done. output → ${OUT}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
