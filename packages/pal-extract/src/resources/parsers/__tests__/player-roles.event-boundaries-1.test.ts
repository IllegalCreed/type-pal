/**
 * TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 · parsePlayerRoles 名称缺省与元素键映射
 * （resources/parsers/player-roles.ts）。
 *
 * 排重 basis（旧 fullName 不重复）：
 * - player-roles.boundaries.test（FOUNDATION C2）：SoA 主轴、size 门、全零表、
 *   rgwName 反查 _name（**全部指针在表内**：[36..41] 全命中，role5→'' 未断言）。
 * - tables.test（M3 T8，真实 DATA.MKF）：真实值、signed 解码、no-words 全 undefined。
 * 本文件只补两条既有测试**无判别力**的边界（一手测量 fast v8 branch：player-roles.ts
 * 仅 L211 cursor 门与 L269-271 名称反查邻位未钉）：
 * - PR-NAME-BOUNDARY-1：rgwName 行混布「表内命中 + 0 哨兵 + 越表尾」+ 3/4 对调 ——
 *   缺省 role 不写 _name 键（fail-soft），命中/对调不受污染，其余字段照常。
 * - PR-ELEM-ORDER-1：elemResistance 手写键字面量 5 键中 wind/thunder/fire 已被 C2
 *   判别，water/earth 两键无判别（C2 未写、真实数据未断言值）→ 行×列补全钉死。
 */
import { describe, expect, test } from 'vitest'
import {
  mkMkf,
  mkTable,
  mkWords,
  PLAYER_ROLE_ROWS,
  playerRoleCell,
} from '../../../__tests__/glm-foundation-fixtures.js'
import { parsePlayerRoles } from '../player-roles.js'

const mkRolesChunk = (cells: ReadonlyArray<[number, number]>) => mkTable(900, cells)
const mkDataMkf = (rolesChunk: Uint8Array) =>
  mkMkf([Uint8Array.of(1), Uint8Array.of(2), Uint8Array.of(3), rolesChunk])

describe('TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 · parsePlayerRoles 名称缺省与元素键映射', () => {
  test('rgwName 指针越 persons 表或 0 哨兵 → 该 role 安全缺省 _name，表内命中与 3/4 对调不受污染', () => {
    // rgwName 行（row 3）：[36, 0, 38, 40, 39, 41] —— role1=0 哨兵、role3/4 对调真值
    //（player-roles.ts:265-268：role3=巫后 40 / role4=阿奴 39）。
    // persons 表只给 5 词 → role5 指针 41 → idx 5 越表尾。
    const cells = [
      playerRoleCell(PLAYER_ROLE_ROWS.name, 0, 36),
      playerRoleCell(PLAYER_ROLE_ROWS.name, 1, 0),
      playerRoleCell(PLAYER_ROLE_ROWS.name, 2, 38),
      playerRoleCell(PLAYER_ROLE_ROWS.name, 3, 40),
      playerRoleCell(PLAYER_ROLE_ROWS.name, 4, 39),
      playerRoleCell(PLAYER_ROLE_ROWS.name, 5, 41),
      playerRoleCell(PLAYER_ROLE_ROWS.level, 1, 33),
    ]
    const words = mkWords({ persons: ['李逍遥', '赵灵儿', '林月如', '阿奴', '巫后'] })
    const { roles } = parsePlayerRoles(mkDataMkf(mkRolesChunk(cells)), words)
    expect(roles.map((r) => r._name)).toEqual([
      '李逍遥',
      undefined,
      '林月如',
      '巫后',
      '阿奴',
      undefined,
    ])
    // 缺省是「键不存在」，不是「键在值为 undefined」
    expect('_name' in roles[1]!).toBe(false)
    expect('_name' in roles[5]!).toBe(false)
    expect('_name' in roles[0]!).toBe(true)
    // 缺省不污染游标走行：role1 其余字段照常 dump
    expect(roles[1]!.level).toBe(33)
    expect(roles).toHaveLength(6)
  })

  test('elemResistance water 与 earth 两键行列映射判别补全（手写字面量 5 键钉死）', () => {
    // elemResRows 行序 23..27 = wind/thunder/water/fire/earth（sdlpal NUM_MAGIC_ELEMENTAL）。
    // C2 只判别了 wind(r0)/thunder(r1)/fire(r2)；本合同补 water(row25)/earth(row27)
    // 的行×列双判别，防手写键字面量 water↔earth 互换不可检。
    const cells = [
      playerRoleCell(PLAYER_ROLE_ROWS.elemWater, 0, 30),
      playerRoleCell(PLAYER_ROLE_ROWS.elemEarth, 0, 50),
      playerRoleCell(PLAYER_ROLE_ROWS.elemWater, 3, 31),
      playerRoleCell(PLAYER_ROLE_ROWS.elemEarth, 3, 51),
    ]
    const { roles } = parsePlayerRoles(mkDataMkf(mkRolesChunk(cells)))
    expect(roles[0]!.elemResistance).toEqual({
      wind: 0,
      thunder: 0,
      water: 30,
      fire: 0,
      earth: 50,
    })
    expect(roles[3]!.elemResistance).toEqual({
      wind: 0,
      thunder: 0,
      water: 31,
      fire: 0,
      earth: 51,
    })
  })
})
