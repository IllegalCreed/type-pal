/** DATA/UI writer borrows parsed OBJECT views; CLI owns preflight, cleanup and stage order. */
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { openMkf, readChunk } from '../io/mkf.js'
import { readBinary } from '../io/read.js'
import type { Words } from '../io/word.js'
import { writeBinary, writeJson } from '../io/write.js'
import { parseEnemyPos } from './enemy-pos.js'
import { parseBattleEffectIndex, parseLevelUpExp, parseLevelUpMagic } from './parsers/data-misc.js'
import { framesToOut, parseSpriteChunk } from './sprite.js'
import type { parseEnemyObjects, parseItems, parseObjectPlayers, parseSpells } from './tables.js'
import {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
  parseBattleFields,
  parseEnemies,
  parseEnemyTeams,
  parseMagicTable,
  parseObjectMagics,
  parseObjectPoisons,
  parsePlayerRoles,
  parseStores,
} from './tables.js'

interface ObjectTables {
  items: ReturnType<typeof parseItems>
  spells: ReturnType<typeof parseSpells>
  enemyObjects: ReturnType<typeof parseEnemyObjects>
  objectPlayers: ReturnType<typeof parseObjectPlayers>
}

/** Write DATA tables and its UI/effect chunks after the caller's source/output preflight. */
export function writeDataAssets(
  rawRoot: string,
  outputRoot: string,
  sssObjBuf: Uint8Array,
  words: Words,
  objectTables: ObjectTables,
): void {
  const { items, spells, enemyObjects, objectPlayers } = objectTables
  const loadFile = (name: string): Uint8Array => readBinary(resolve(rawRoot, name))

  function imageUiPath(frameIdx: number): string {
    return resolve(outputRoot, 'images', 'ui', `frame-${frameIdx.toString().padStart(2, '0')}.png`)
  }

  function magicEffectBlobPath(): string {
    return resolve(outputRoot, 'data', 'magic', 'effect.rle')
  }

  function dataSubdirPath(subdir: 'ui-sprite', name: string): string {
    return resolve(outputRoot, 'data', subdir, `${name}.json`)
  }

  console.log('[pal-extract] data tables …')

  // DATA槽位：0商店、1敌人、2敌队、3角色、4法术、5战场。
  const dataMkf = openMkf(loadFile('DATA.MKF'))
  const storeBuf = readChunk(dataMkf, 0)
  const enemyBuf = readChunk(dataMkf, 1)
  const teamBuf = readChunk(dataMkf, 2)
  const magicBuf = readChunk(dataMkf, 4)
  const fieldBuf = readChunk(dataMkf, 5)

  writeJson(resolve(outputRoot, 'data', 'items.json'), items)
  // OBJECT里的法术引用与DATA的法术数值分开；magicNumber连接两表。
  writeJson(resolve(outputRoot, 'data', 'spells.json'), spells)
  // 模拟/投掷指令可把任意OBJECT视为magic union，不能只导出spells段。
  writeJson(resolve(outputRoot, 'data', 'object-magics.json'), parseObjectMagics(sssObjBuf))
  writeJson(resolve(outputRoot, 'data', 'object-poisons.json'), parseObjectPoisons(sssObjBuf))
  writeJson(resolve(outputRoot, 'data', 'object-players.json'), objectPlayers)
  writeJson(resolve(outputRoot, 'data', 'magic.json'), parseMagicTable(magicBuf))
  const enemies = parseEnemies(enemyBuf, sssObjBuf, words)
  writeJson(resolve(outputRoot, 'data', 'enemies.json'), enemies)
  writeJson(resolve(outputRoot, 'data', 'enemy-objects.json'), enemyObjects)
  const enemyObjectNames = buildEnemyObjectNameMap(sssObjBuf, words)
  // 敌队保留OBJECT绝对槽位及敌人数值ID，脚本变体不能按enemyId合并。
  const objectIndexToEnemyId = buildObjectIndexToEnemyIdMap(sssObjBuf)
  writeJson(
    resolve(outputRoot, 'data', 'enemy-teams.json'),
    parseEnemyTeams(teamBuf, enemyObjectNames, objectIndexToEnemyId),
  )
  writeJson(resolve(outputRoot, 'data', 'battle-fields.json'), parseBattleFields(fieldBuf))
  writeJson(resolve(outputRoot, 'data', 'stores.json'), parseStores(storeBuf))
  const enemyPosBuf = readChunk(dataMkf, 13)
  writeJson(resolve(outputRoot, 'data', 'enemy-pos.json'), parseEnemyPos(enemyPosBuf))
  const playerRoles = parsePlayerRoles(loadFile('DATA.MKF'), words)
  writeJson(resolve(outputRoot, 'data', 'player-roles.json'), playerRoles)

  const levelUpExpBuf = readChunk(dataMkf, 14)
  writeJson(resolve(outputRoot, 'data', 'level-up-exp.json'), parseLevelUpExp(levelUpExpBuf))

  // 每个LEVELUPMAGIC_ALL含5个角色的(WORD等级, WORD法术)。
  const levelUpMagicBuf = readChunk(dataMkf, 6)
  writeJson(
    resolve(outputRoot, 'data', 'level-up-magic.json'),
    parseLevelUpMagic(levelUpMagicBuf, 5),
  )

  const battleEffectBuf = readChunk(dataMkf, 11)
  writeJson(
    resolve(outputRoot, 'data', 'battle-effect-index.json'),
    parseBattleEffectIndex(battleEffectBuf),
  )

  // DATA chunk9是未压缩的UI sprite group，runtime按原始帧号索引。
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

  // gzip blob使用.rle后缀，避免托管层按.gz重复解压。
  const effectSpriteBuf = readChunk(dataMkf, 10)
  writeBinary(magicEffectBlobPath(), gzipSync(effectSpriteBuf))
  console.log(
    `[pal-extract] battle effect sprite blob (chunk 10): ${parseSpriteChunk(effectSpriteBuf).length} frames`,
  )

  // 原始dialog sprite借给runtime解码；source保留既有来源描述，size取实际字节数。
  const dialogIconsBuf = readChunk(dataMkf, 12)
  writeJson(resolve(outputRoot, 'data', 'dialog-icons-raw.json'), {
    source: 'DATA.MKF chunk 12 — bufDialogIcons (sdlpal text.c:891 PAL_MKFReadChunk size=282)',
    size: dialogIconsBuf.byteLength,
    base64: Buffer.from(dialogIconsBuf).toString('base64'),
  })
  console.log(
    `[pal-extract] dialog-icons (DATA.MKF chunk 12) written: ${dialogIconsBuf.byteLength} bytes`,
  )
}
