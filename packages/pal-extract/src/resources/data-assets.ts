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

  writeJson(resolve(outputRoot, 'data', 'items.json'), items)
  // M3 T6:Spell wrapper(SSS chunk 2) + Magic 详细 stats(DATA chunk 4)分两个文件 dump。
  // Spell.magicNumber 指向 magic[] 索引;运行时按需 join。
  writeJson(resolve(outputRoot, 'data', 'spells.json'), spells)
  // E 类 0x42 SimulateMagic / 0x66 throw weapon:把任意 object id 当 magic 解读
  // (rgObject[id].magic),投掷物 op0 可低至 24(item 段之下,不在 spells.json [296..397])。
  // dump 完整 OBJECT 数组的 magic-union 视图供运行时解析任意 op0(parseObjectMagics)。
  writeJson(resolve(outputRoot, 'data', 'object-magics.json'), parseObjectMagics(sssObjBuf))
  // 0x28 apply poison:poison object 的 wEnemyScript(敌人中毒每回合脚本)。
  writeJson(resolve(outputRoot, 'data', 'object-poisons.json'), parseObjectPoisons(sssObjBuf))
  // OBJECT_PLAYER 死亡 / 濒死脚本:队友死亡或濒死时触发角色脚本。
  writeJson(resolve(outputRoot, 'data', 'object-players.json'), objectPlayers)
  writeJson(resolve(outputRoot, 'data', 'magic.json'), parseMagicTable(magicBuf))
  const enemies = parseEnemies(enemyBuf, sssObjBuf, words)
  writeJson(resolve(outputRoot, 'data', 'enemies.json'), enemies)
  // M5.B-w2.a:OBJECT_ENEMY 段 5 字段全 dump(scriptOnReady/scriptOnTurnStart/
  // scriptOnBattleEnd 等 AI hook),enemy-objects.json index = OBJECT 表绝对 index。
  writeJson(resolve(outputRoot, 'data', 'enemy-objects.json'), enemyObjects)
  // M3 T7:EnemyTeam(DATA chunk 2) + BattleField(DATA chunk 5)dev panel 选 fixture 用。
  // EnemyTeam._names 反查 — 用 OBJECT_ENEMY 段 + words 建 map。
  const enemyObjectNames = buildEnemyObjectNameMap(sssObjBuf, words)
  // M3.30 Bug 1 修复:enemy-teams.json 槽位之前 dump 为 OBJECT 数组绝对 index(398-550),
  // 与 enemies.json id 范围(0-153)不匹配,运行时 `find(e => e.id === slot)` 全 miss → enemy
  // 不显示。dump 时翻译 OBJECT index → enemies.json id(= OBJECT_ENEMY.wEnemyID),
  // 同时保留 enemyObjectIndexes,供运行时区分同 enemyId 的多个脚本变体。
  const objectIndexToEnemyId = buildObjectIndexToEnemyIdMap(sssObjBuf)
  writeJson(
    resolve(outputRoot, 'data', 'enemy-teams.json'),
    parseEnemyTeams(teamBuf, enemyObjectNames, objectIndexToEnemyId),
  )
  writeJson(resolve(outputRoot, 'data', 'battle-fields.json'), parseBattleFields(fieldBuf))
  // DATA.MKF chunk 0 = STORE 商店表(global.c:292)。买菜单 opcode 0x0026 按 operand[0] 取。
  writeJson(resolve(outputRoot, 'data', 'stores.json'), parseStores(storeBuf))
  // M3.5:ENEMYPOS(DATA.MKF chunk 13)= 5×5 PALPOS table。game runtime
  // draw-battle-sprites.ts 按 state.enemies.length 选 layouts[count-1] 行,
  // 替代 M3 simple version 的 hardcoded ENEMY_POSITIONS。
  const enemyPosBuf = readChunk(dataMkf, 13)
  writeJson(resolve(outputRoot, 'data', 'enemy-pos.json'), parseEnemyPos(enemyPosBuf))
  // M3 T8:PlayerRoles(DATA.MKF chunk 3)— M2 半解扩到 M3 战斗子集 dump。
  const playerRoles = parsePlayerRoles(loadFile('DATA.MKF'), words)
  writeJson(resolve(outputRoot, 'data', 'player-roles.json'), playerRoles)

  // M4 P2 T2: DATA.MKF 余下 chunks ─────────────────────────────────────────
  // chunk 14: rgLevelUpExp[100] = 升级经验阈值(WORD × 100 = 200 字节)
  const levelUpExpBuf = readChunk(dataMkf, 14)
  writeJson(resolve(outputRoot, 'data', 'level-up-exp.json'), parseLevelUpExp(levelUpExpBuf))

  // chunk 6: lprgLevelUpMagic = LEVELUPMAGIC_ALL × N
  //   LEVELUPMAGIC_ALL = { LEVELUPMAGIC m[5] }, LEVELUPMAGIC = { WORD wLevel; WORD wMagic }
  //   MAX_PLAYABLE_PLAYER_ROLES = 5
  const levelUpMagicBuf = readChunk(dataMkf, 6)
  writeJson(
    resolve(outputRoot, 'data', 'level-up-magic.json'),
    parseLevelUpMagic(levelUpMagicBuf, 5),
  )

  // chunk 11: rgwBattleEffectIndex[10][2] = WORD × 20 = 40 字节
  const battleEffectBuf = readChunk(dataMkf, 11)
  writeJson(
    resolve(outputRoot, 'data', 'battle-effect-index.json'),
    parseBattleEffectIndex(battleEffectBuf),
  )

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

  // DATA.MKF chunk 10 (battle effect sprite) — 资源管线优化:存 gzip RLE blob(去 per-frame
  // PNG + magic-sprite/effect.json)。sdlpal battle.c:1787 单 sprite group,runtime parseSpriteChunk。
  const effectSpriteBuf = readChunk(dataMkf, 10)
  writeBinary(magicEffectBlobPath(), gzipSync(effectSpriteBuf))
  console.log(
    `[pal-extract] battle effect sprite blob (chunk 10): ${parseSpriteChunk(effectSpriteBuf).length} frames`,
  )

  // M5 Sync.2: DATA.MKF chunk 12 (282B) = bufDialogIcons (sdlpal text.c:891)
  // sprite group: 多帧 icon (key continue / cursor / 等),index 由 g_TextLib.bIcon 选。
  // 运行时 game 包用 parseSpriteChunk + decodeRle 解(packages/game/src/assets/rle-decode.ts)。
  // 不导 PNG — 帧很小 (~16×16),运行时解一次 cache 比磁盘 IO 还快。
  const dialogIconsBuf = readChunk(dataMkf, 12)
  writeJson(resolve(outputRoot, 'data', 'dialog-icons-raw.json'), {
    source: 'DATA.MKF chunk 12 — bufDialogIcons (sdlpal text.c:891 PAL_MKFReadChunk size=282)',
    size: dialogIconsBuf.byteLength,
    base64: Buffer.from(dialogIconsBuf).toString('base64'),
  })
  console.log(
    `[pal-extract] dialog-icons (DATA.MKF chunk 12) written: ${dialogIconsBuf.byteLength} bytes`,
  )

  // chunk 7/8 空(0 字节);DATA.MKF count=15(有效 chunk 0-14),chunk 15 超出范围不抽
}
