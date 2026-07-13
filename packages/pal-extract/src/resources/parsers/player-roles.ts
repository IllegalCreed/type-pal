/**
 * 角色组(DATA.MKF chunk 3 PLAYERROLES)解析。
 *
 * 对照 sdlpal `global.h::tagPLAYERROLES`(SoA 布局,sizeof = 900 B),
 * 由 `global.c LOAD_DATA(... fpDATA 3)` 加载为一整条 PLAYERROLES 记录。
 *
 * 注:本 parser 内部 openMkf + readChunk 取 chunk 3,所以 caller 直接传完整
 * DATA.MKF 字节。
 */
import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { openMkf, readChunk } from '../../io/mkf.js'
import type { Words } from '../../io/word.js'
import { PLAYER_ROLES_NUM } from './_utils.js'

// 注:rgwEquipment / rgwMagic 存 sdlpal OBJECT 全局 wObjectID(item 段 61..295,
// spell 段 296..397,0 = 空槽)。2026-05-29 id 体系统一为 **wObjectID**(items.json
// id=61.. / spells.json id=296.. 直接对应),所以这里**保持 raw wObjectID 不转**,
// 渲染层 items.find(id === w) / spells.find(id === w) 直接命中。0=空 sentinel 跟
// 任何有效 id(>=61)不冲突。

// ── DATA.MKF chunk 3: PLAYERROLES (global.h tagPLAYERROLES) ──────────────
// sdlpal `global.c LOAD_DATA(... fpDATA 3)` 把整个 PLAYERROLES 结构体作为单条
// 读入。布局是 **SoA(struct of arrays)**:每个 `PLAYERS = WORD[MAX_PLAYER_ROLES]`
// 6 个角色的同字段连续存放,再下个字段又一行;3 个 2D 字段(equipment / elemRes /
// magic)按 sdlpal 真值占 N × MAX_PLAYER_ROLES × 2 字节。
//
// 字段顺序(对照 reference/sdlpal/global.h tagPLAYERROLES 真值,2025 verified):
//   [PLAYERS × 11] rgwAvatar / rgwSpriteNumInBattle / rgwSpriteNum / rgwName /
//                  rgwAttackAll / rgwUnknown1 / rgwLevel / rgwMaxHP / rgwMaxMP /
//                  rgwHP / rgwMP
//   [WORD[6][6]]    rgwEquipment[MAX_PLAYER_EQUIPMENTS=6][MAX_PLAYER_ROLES=6]
//   [PLAYERS × 6]  rgwAttackStrength* / rgwMagicStrength* / rgwDefense* /
//                  rgwDexterity* / rgwFleeRate / rgwPoisonResistance
//   [WORD[5][6]]    rgwElementalResistance[NUM_MAGIC_ELEMENTAL=5][6]
//   [PLAYERS × 4]  rgwUnknown2 / rgwUnknown3 / rgwUnknown4 / rgwCoveredBy
//   [WORD[32][6]]   rgwMagic[MAX_PLAYER_MAGICS=32][6]
//   [PLAYERS × 4]  rgwWalkFrames / rgwCooperativeMagic / rgwUnknown5 / rgwUnknown6
//   [PLAYERS × 5]  rgwDeathSound* / rgwAttackSound* / rgwWeaponSound* /
//                  rgwCriticalSound* / rgwMagicSound*
//   [PLAYERS × 2]  rgwCoverSound / rgwDyingSound
//
// * = signed 语义(同 Enemy D28 + 5 个 sound;sdlpal 内部 SHORT cast)。
//
// 实测 sizeof(PLAYERROLES):
//   32 PLAYERS × (6 × 2)   = 384
//   + WORD[6][6]            = 72
//   + WORD[5][6]            = 60
//   + WORD[32][6]           = 384
//   = 900 字节(DATA.MKF chunk 3 size 实测 = 900 B,匹配)
//
// M2 实施过程发现 #5:`rgwSpriteNum[0] = 2`(leader,M2 切片硬编码,T9 删)。
// 实测 6 个 spriteNum = [2, 3, 7, 525, 5, 26]。
const PLAYER_FIELD_SIZE = PLAYER_ROLES_NUM * 2 // 一个 PLAYERS = 12 字节
const PERSONS_WORD_OFFSET = 36 // 人物名在 WORD.DAT 的段首(word.ts PERSONS_OFFSET):word[36..41] = 6 角色名
const PLAYER_EQUIPMENTS = 6 // MAX_PLAYER_EQUIPMENTS, palcommon.h
const PLAYER_MAGICS = 32 // MAX_PLAYER_MAGICS, palcommon.h
const ELEM_COUNT = 5 // NUM_MAGIC_ELEMENTAL, palcommon.h
const PLAYER_ROLES_BYTES =
  32 * PLAYER_FIELD_SIZE +
  PLAYER_EQUIPMENTS * PLAYER_FIELD_SIZE +
  ELEM_COUNT * PLAYER_FIELD_SIZE +
  PLAYER_MAGICS * PLAYER_FIELD_SIZE // = 900

/**
 * 从 DATA.MKF chunk 3 解析角色组(PLAYERROLES,M2 半解扩到 M3 战斗子集)。
 *
 * 对照 sdlpal `global.h::tagPLAYERROLES`(SoA 布局,sizeof = 900 B),
 * 由 sdlpal `global.c LOAD_DATA(... fpDATA 3)` 加载为一整条 PLAYERROLES 记录。
 *
 * **数据布局 SoA**(非 AoS):每个 PLAYERS 字段是 6 个 u16 一行(同字段连续),
 * 然后下一个字段又一行。`readPlayers(offset, signed)` 在固定 cursor 处提取一个
 * NUM_ROLES 长的数组。3 个 2D 矩阵(equipment / elemRes / magic)占
 * `N × MAX_PLAYER_ROLES × 2` 字节,本函数仅消费 elemRes(战斗用),其他跳过。
 *
 * **M3 dump 字段子集**(对照 PlayerRole interface):
 * - 战斗 stats / 显示 / 抗性 / 5 个 sound / walkFrames / attackAll
 * - **跳过**:equipment / magic learned / coveredBy / cooperativeMagic /
 *   6 个 sdlpal FIXME unknown / coverSound / dyingSound(留 M5)
 *
 * **leader spriteNum=2 实证**:M2 实施过程发现 #5,parser 实测 6 个 spriteNum =
 * `[2, 3, 7, 525, 5, 26]`(测试断言)。T9 删 cli.ts 里的 `PARTY_LEADER_SPRITE=2`
 * 硬编码后接此 dump。
 *
 * **signed 字段**:`attackStrength / magicStrength / defense / dexterity` 与
 * 5 个 sound 字段(`attackSound / weaponSound / criticalSound / magicSound /
 * deathSound`)按 SHORT 处理,与 Enemy D28 一致。
 *
 * @param dataMkfBytes DATA.MKF 整个 .MKF 字节(本函数内部 openMkf + readChunk 3)
 * @param words        可选;parseWordDat 解出的名称表,用于反向填 `_name`
 *                     (从 `words.persons[i]` 取角色名)
 */
export function parsePlayerRoles(dataMkfBytes: Uint8Array, words?: Words): PlayerRoles {
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, 3)
  if (raw.byteLength !== PLAYER_ROLES_BYTES) {
    throw new Error(
      `parsePlayerRoles: DATA.MKF chunk 3 size ${raw.byteLength} ≠ sizeof(PLAYERROLES)=${PLAYER_ROLES_BYTES} ` +
        `(检查 MAX_PLAYER_ROLES/MAX_PLAYER_EQUIPMENTS/MAX_PLAYER_MAGICS/NUM_MAGIC_ELEMENTAL 是否对)`,
    )
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)

  function readPlayers(offset: number, signed = false): number[] {
    const arr: number[] = []
    for (let i = 0; i < PLAYER_ROLES_NUM; i++) {
      arr.push(signed ? view.getInt16(offset + i * 2, true) : view.getUint16(offset + i * 2, true))
    }
    return arr
  }

  // **按 sdlpal `tagPLAYERROLES` 真字段顺序** cursor(M4 全字段 dump,2025 verified):
  let cursor = 0
  const avatar = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const spriteNumInBattle = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const spriteNum = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const name = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const attackAll = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const unknown1 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const level = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const maxHP = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const maxMP = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const hp = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const mp = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // rgwEquipment[MAX_PLAYER_EQUIPMENTS=6][MAX_PLAYER_ROLES=6](72 B)
  // 6 行 × 6 player。⚠ 行序真值(2026-07-02 对 role0 [196头巾,225披风,208布袍,166木剑,235草鞋,249护腕]
  // 逐位核验;= sdlpal 身体部位枚举):0 = 头,1 = 披风,2 = 身,3 = 武器,4 = 鞋,5 = 饰品。
  // (旧注释「0=武器…」是错的,勿据此解码 —— migrate/migrate-content.ts EQUIP_INDEX_TO_SLOT 为准。)
  const equipRows: number[][] = []
  for (let e = 0; e < PLAYER_EQUIPMENTS; e++) {
    equipRows.push(readPlayers(cursor))
    cursor += PLAYER_FIELD_SIZE
  }

  const attackStrength = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const magicStrength = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const defense = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const dexterity = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const fleeRate = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const poisonResistance = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // rgwElementalResistance[NUM_MAGIC_ELEMENTAL=5][MAX_PLAYER_ROLES=6]
  // 5 行,每行 6 player;元素顺序 wind/thunder/water/fire/earth
  const elemResRows: number[][] = []
  for (let e = 0; e < ELEM_COUNT; e++) {
    elemResRows.push(readPlayers(cursor))
    cursor += PLAYER_FIELD_SIZE
  }

  const unknown2 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const unknown3 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const unknown4 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const coveredBy = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // rgwMagic[MAX_PLAYER_MAGICS=32][MAX_PLAYER_ROLES=6](384 B)
  // 32 行 × 6 player(每个 player 已学 32 个法术槽位,0 = 空)
  const magicRows: number[][] = []
  for (let m = 0; m < PLAYER_MAGICS; m++) {
    magicRows.push(readPlayers(cursor))
    cursor += PLAYER_FIELD_SIZE
  }

  const walkFrames = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const cooperativeMagic = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const unknown5 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const unknown6 = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // 5 个 sound 字段(sdlpal 注释为 PLAYERS,但 fight.c/sound.c 按 SHORT 处理,-1 = 无声音)
  const deathSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const attackSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const weaponSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const criticalSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const magicSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE

  const coverSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const dyingSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE

  // sanity check:cursor 走法应正好等于 sizeof(PLAYERROLES)
  if (cursor !== PLAYER_ROLES_BYTES) {
    throw new Error(
      `parsePlayerRoles: cursor 走偏 — 实际 ${cursor},应等于 sizeof(PLAYERROLES)=${PLAYER_ROLES_BYTES}`,
    )
  }

  const roles: PlayerRole[] = []
  for (let i = 0; i < PLAYER_ROLES_NUM; i++) {
    const role: PlayerRole = {
      id: i,
      avatar: avatar[i]!,
      spriteNumInBattle: spriteNumInBattle[i]!,
      spriteNum: spriteNum[i]!,
      name: name[i]!,
      attackAll: attackAll[i]!,
      level: level[i]!,
      maxHP: maxHP[i]!,
      maxMP: maxMP[i]!,
      hp: hp[i]!,
      mp: mp[i]!,
      attackStrength: attackStrength[i]!,
      magicStrength: magicStrength[i]!,
      defense: defense[i]!,
      dexterity: dexterity[i]!,
      fleeRate: fleeRate[i]!,
      poisonResistance: poisonResistance[i]!,
      elemResistance: {
        wind: elemResRows[0]![i]!,
        thunder: elemResRows[1]![i]!,
        water: elemResRows[2]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[4]![i]!,
      },
      walkFrames: walkFrames[i]!,
      attackSound: attackSound[i]!,
      weaponSound: weaponSound[i]!,
      criticalSound: criticalSound[i]!,
      magicSound: magicSound[i]!,
      deathSound: deathSound[i]!,
      coverSound: coverSound[i]!,
      dyingSound: dyingSound[i]!,
      // 保持 sdlpal OBJECT 全局 wObjectID(item 61.. / spell 296.. / 0=空);
      // id 体系已统一 wObjectID,items/spells.json id 直接对应。
      equipment: equipRows.map((row) => row[i]!),
      magic: magicRows.map((row) => row[i]!),
      cooperativeMagic: cooperativeMagic[i]!,
      coveredBy: coveredBy[i]!,
      unknown1: unknown1[i]!,
      unknown2: unknown2[i]!,
      unknown3: unknown3[i]!,
      unknown4: unknown4[i]!,
      unknown5: unknown5[i]!,
      unknown6: unknown6[i]!,
    }
    // 角色显示名按 **rgwName[i]**(= name[i],名字 word 全局 id 36..41)查,**不能用 sequential
    // `words.persons[i]`**:原版 rgwName = [36,37,38,40,39,41] 把 role3/role4(巫后/阿奴)的名字指针
    // **故意对调**(40 在前 39 在后),sequential 取会把两人 _name 写反(2026-06-19 user 报"管阿奴叫巫后";
    // 真值 role3=巫后[梦蛇+召唤神]、role4=阿奴[御蜂术])。words.persons[k] = word(36+k),故 idx = name[i]-36。
    const personIdx = name[i]! - PERSONS_WORD_OFFSET
    const nm = words?.persons[personIdx]
    if (nm) role._name = nm
    roles.push(role)
  }
  return { roles }
}
