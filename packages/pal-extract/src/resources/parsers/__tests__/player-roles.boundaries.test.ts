/**
 * TEST-FOUNDATION-COVERAGE-1 C2：DATA.MKF chunk 3 PLAYERROLES 解析边界
 * （player-roles.ts:53-260,SoA 75 行×12B=900B）。
 * 必须构造完整 DATA.MKF（chunk3 = 900B）；SoA 轴向：行=字段、列=6 角色，
 * 装备/仙术/抗性数组的轴不能颠倒。角色名走 words.persons 反查。
 */
import { describe, expect, test } from 'vitest'
import { parsePlayerRoles } from '../player-roles.js'
import { PLAYER_ROLE_ROWS, mkMkf, mkTable, mkWords, playerRoleCell } from './glm-foundation-fixtures.js'

const mkRolesChunk = (cells: Array<[number, number]>) => mkTable(900, cells)
const mkDataMkf = (rolesChunk: Uint8Array) =>
  mkMkf([Uint8Array.of(1), Uint8Array.of(2), Uint8Array.of(3), rolesChunk])

describe('parsePlayerRoles · SoA 布局合同', () => {
  test('行=字段 列=角色：标量/signed/五行抗/装备轴向/仙术槽/走帧/声音', () => {
    const cells = [
      playerRoleCell(PLAYER_ROLE_ROWS.spriteNum, 0, 2),
      playerRoleCell(PLAYER_ROLE_ROWS.spriteNum, 1, 3),
      playerRoleCell(PLAYER_ROLE_ROWS.level, 2, 33),
      playerRoleCell(PLAYER_ROLE_ROWS.maxHP, 0, 777),
      playerRoleCell(PLAYER_ROLE_ROWS.maxMP, 1, 88),
      playerRoleCell(PLAYER_ROLE_ROWS.hp, 0, 111),
      playerRoleCell(PLAYER_ROLE_ROWS.mp, 1, 22),
      playerRoleCell(PLAYER_ROLE_ROWS.attackStrength, 0, 0xffff), // SHORT → -1
      playerRoleCell(PLAYER_ROLE_ROWS.fleeRate, 3, 15),
      playerRoleCell(PLAYER_ROLE_ROWS.elemWind, 0, 4),
      playerRoleCell(PLAYER_ROLE_ROWS.elemThunder, 1, 8),
      playerRoleCell(PLAYER_ROLE_ROWS.elemFire, 2, 12),
      playerRoleCell(PLAYER_ROLE_ROWS.equipHead, 0, 196), // 装备行0=头,列0=角色0
      playerRoleCell(PLAYER_ROLE_ROWS.equipHead, 1, 210), // 同行不同角色 → 不同装备
      playerRoleCell(PLAYER_ROLE_ROWS.magicSlot0, 0, 296), // 仙术槽0=角色0 学 spell 296
      playerRoleCell(PLAYER_ROLE_ROWS.magicSlot0, 1, 305),
      playerRoleCell(PLAYER_ROLE_ROWS.walkFrames, 0, 6),
      playerRoleCell(PLAYER_ROLE_ROWS.attackSound, 2, 0xffff), // -1 = 无声音
    ]
    const { roles } = parsePlayerRoles(mkDataMkf(mkRolesChunk(cells)))
    expect(roles).toHaveLength(6)
    const [r0, r1, r2, r3] = roles
    expect(r0!.spriteNum).toBe(2)
    expect(r1!.spriteNum).toBe(3)
    expect(r2!.level).toBe(33)
    expect(r0!.maxHP).toBe(777)
    expect(r1!.maxMP).toBe(88)
    expect(r0!.hp).toBe(111)
    expect(r1!.mp).toBe(22)
    expect(r0!.attackStrength).toBe(-1)
    expect(r3!.fleeRate).toBe(15)
    expect(r0!.elemResistance.wind).toBe(4)
    expect(r1!.elemResistance.thunder).toBe(8)
    expect(r2!.elemResistance.fire).toBe(12)
    expect(r0!.elemResistance.water).toBe(0) // 未写单元格保持零
    expect(r0!.equipment?.slice(0, 1)).toEqual([196])
    expect(r1!.equipment?.slice(0, 1)).toEqual([210])
    expect(r0!.magic?.slice(0, 1)).toEqual([296])
    expect(r1!.magic?.slice(0, 1)).toEqual([305])
    expect(r0!.walkFrames).toBe(6)
    expect(r2!.attackSound).toBe(-1)
  })
  test('chunk 3 尺寸门：898B 拒绝（sizeof=900）', () => {
    expect(() => parsePlayerRoles(mkDataMkf(mkTable(898, [])))).toThrow(
      /chunk 3 size 898 ≠ sizeof\(PLAYERROLES\)=900/,
    )
  })
  test('零值全表合法（全零 900B → 全部角色字段为 0/无 -1 语义）', () => {
    const { roles } = parsePlayerRoles(mkDataMkf(mkRolesChunk([])))
    expect(roles.every((r) => r.maxHP === 0 && r.attackStrength === 0)).toBe(true)
  })
  test('rgwName 指针反查 _name：按 name 值指向 word36+k，role3/4 故意对调不写反', () => {
    // 原版 rgwName = [36,37,38,40,39,41]（player-roles.ts:263 注释真值：role3=巫后/role4=阿奴 对调）
    const cells = [0, 1, 2, 3, 4, 5].map((p) => playerRoleCell(PLAYER_ROLE_ROWS.name, p, [36, 37, 38, 40, 39, 41][p]!))
    const words = mkWords({ persons: ['李逍遥', '赵灵儿', '林月如', '阿奴', '巫后', ''] })
    const { roles } = parsePlayerRoles(mkDataMkf(mkRolesChunk(cells)), words)
    expect(roles[0]!._name).toBe('李逍遥')
    expect(roles[2]!._name).toBe('林月如')
    expect(roles[3]!._name).toBe('巫后') // name=40 → persons[4]
    expect(roles[4]!._name).toBe('阿奴') // name=39 → persons[3]
  })
})
