import { validateActors, validateItems, validateSprites } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import {
  item,
  raw,
  role,
  type SourceInstruction,
  unchanged,
} from './__tests__/pure-migration-fixtures.js'
import {
  buildLabelIndex,
  mapActor,
  mapEquipableBy,
  mapItemsTable,
  mapLevelUp,
  mapRoleSpritesByNumber,
  mapSprites,
  walkDesc,
} from './migrate-content.js'

describe('self-contained migration records', () => {
  it('description markers skip without skipping text; blocked suffix preserves only the preceding lines', () => {
    const commands: SourceInstruction[] = [
      raw(167, [], 'L_10'),
      { label: 'L_11' },
      { op: 'showDialog', text: '' },
      { op: 'showDialog', text: ' first ' },
      raw(99),
      { op: 'showDialog', text: 'not consumed' },
      { op: 'end' },
    ]
    const result = unchanged(commands, (c) => walkDesc(c, buildLabelIndex(c), 10))
    expect(result).toEqual({ lines: [' first '], blockedAt: { op: 'raw', opcode: 99 } })
  })

  it('description distinguishes zero/missing entry, explicit end and exhausted final text', () => {
    const commands = [
      { op: 'showDialog', label: 'L_10', text: 'hello' },
      { op: 'end' },
      { op: 'showDialog', label: 'L_20', text: 'tail' },
    ]
    unchanged(commands, (c) => {
      const labels = buildLabelIndex(c)
      expect(walkDesc(c, labels, 0)).toEqual({ lines: [] })
      expect(walkDesc(c, labels, 99)).toEqual({ lines: [] })
      expect(walkDesc(c, labels, 10)).toEqual({ lines: ['hello'] })
      expect(walkDesc(c, labels, 20)).toEqual({ lines: ['tail'] })
    })
  })

  it('actor copies experience/equipment/magic; absence and resolver omissions do not synthesize resources', () => {
    const source = role({
      avatar: 0,
      id: 5,
      equipment: [21, 0, 22, 23, 0, 24, 999],
      magic: [0, 17, 0, 18],
      cooperativeMagic: 19,
      coveredBy: 3,
      attackSound: 6,
      criticalSound: 7,
    })
    const input = { source, exp: [0, 5, 12] }
    const sounds: number[] = []
    const result = unchanged(input, (v) =>
      mapActor(v.source, v.exp, (n) => {
        sounds.push(n)
        return n === 6 ? 'sound.test.6' : undefined
      }),
    )
    expect(result).toEqual({
      id: 'gai-luojiao',
      name: 'name.gai-luojiao',
      spriteId: 'gai-luojiao',
      battler: {
        baseStats: {
          level: 1,
          hp: 40,
          maxHP: 50,
          mp: 10,
          maxMP: 20,
          attack: 11,
          defense: 13,
          magicAttack: 12,
          speed: 14,
          luck: 15,
        },
        initialEquipment: { head: '21', body: '22', weapon: '23', accessory: '24' },
        initialMagic: ['17', '18'],
        cooperativeMagicSkillId: '19',
        coveredBy: 'wu-hou',
        leveling: { expTable: [0, 5, 12] },
        battleSprite: 'player-fighter-0',
        sounds: { attack: 'sound.test.6' },
      },
    })
    expect(sounds).toEqual([6, 7])
    expect(() => validateActors([result])).not.toThrow()
    result.battler!.leveling!.expTable.push(99)
    result.battler!.initialMagic!.push('50')
    expect(input).toEqual({ source, exp: [0, 5, 12] })
    expect(source.magic).toEqual([0, 17, 0, 18])
  })

  it('actor zero optional values remain absent; portrait/face and positive default sound remain explicit', () => {
    const result = unchanged(role({ deathSound: 2, cooperativeMagic: 0 }), (r) => mapActor(r, []))
    expect(result.portraits).toEqual({ default: 'portrait.pal.001' })
    expect(result.face).toBe('face.pal.li-xiaoyao')
    expect(result.battler?.sounds).toEqual({ death: 'sound.pal.002' })
    expect(result.battler).not.toHaveProperty('cooperativeMagicSkillId')
  })

  it('unknown role IDs fail at every public role-mapping boundary', () => {
    const input = [role({ id: 6 })]
    const before = structuredClone(input)
    expect(() => mapActor(input[0]!, [])).toThrow('mapActor: 未知 roleId 6')
    expect(() => mapSprites(input)).toThrow('mapSprites: 未知 roleId 6')
    expect(() => mapRoleSpritesByNumber(input, [])).toThrow('mapRoleSpritesByNumber: 未知 roleId 6')
    expect(input).toEqual(before)
  })

  it('role sprite mapping validates explicit identities and never infers them from a matching asset', () => {
    const roles = [
      role({ walkFrames: 0 }),
      role({ id: 3, _name: '巫后', spriteNum: 4, walkFrames: 4 }),
    ]
    const sprites = unchanged(roles, mapSprites)
    expect(sprites).toEqual([
      {
        id: 'li-xiaoyao',
        asset: 'sprite.pal.002',
        label: '测试角色(大世界)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'wu-hou',
        asset: 'sprite.pal.004',
        label: '巫后(大世界)',
        layout: { kind: 'directional', framesPerDir: 4 },
      },
    ])
    expect(() => validateSprites(sprites)).not.toThrow()
    expect([
      ...unchanged({ roles, sprites }, (v) => mapRoleSpritesByNumber(v.roles, v.sprites)),
    ]).toEqual([
      [2, sprites[0]],
      [4, sprites[1]],
    ])
    expect(() => mapRoleSpritesByNumber(roles, sprites.slice(1))).toThrow(
      '角色 li-xiaoyao 缺少语义 SpriteDef',
    )
    expect(() =>
      mapRoleSpritesByNumber(roles, [{ ...sprites[0]!, asset: 'sprite.pal.999' }, sprites[1]!]),
    ).toThrow('实际 sprite.pal.999')
    const sharedRoles = [roles[0]!, role({ id: 3, spriteNum: 2 })]
    expect(() => mapRoleSpritesByNumber(sharedRoles, mapSprites(sharedRoles))).toThrow(
      '旧精灵号 2 同时对应 li-xiaoyao 与 wu-hou',
    )
  })

  it('level-up ragged cells preserve role columns and empty/unknown columns do not become actors', () => {
    const rows = [
      [
        { level: 0, magic: 5 },
        { level: 1, magic: 0 },
        { level: 2, magic: 8 },
        { level: 3, magic: 9 },
        { level: 0, magic: 0 },
        { level: 0, magic: 0 },
        { level: 1, magic: 50 },
      ],
      [{ level: 4, magic: 10 }],
    ]
    expect(unchanged(rows, mapLevelUp)).toEqual({
      'li-xiaoyao': [{ level: 4, skillId: '10' }],
      'lin-yueru': [{ level: 2, skillId: '8' }],
      'wu-hou': [{ level: 3, skillId: '9' }],
    })
    expect(mapLevelUp([])).toEqual({})
    expect(mapEquipableBy([true, false, false, true, true, false, true])).toEqual([
      'li-xiaoyao',
      'wu-hou',
      'anu',
    ])
  })

  it('item records preserve zero icon omission, odd-price flooring, false sellability and descriptor identity', () => {
    const sources = [item(), item({ id: 21, bitmap: 3, price: 0, scriptDesc: 11 })]
    const calls: number[] = []
    const result = unchanged(sources, (v) =>
      mapItemsTable(v, (ip) => {
        calls.push(ip)
        return [`desc:${ip}`]
      }),
    )
    expect(calls).toEqual([10, 11])
    expect(result).toEqual([
      { id: '20', name: '测试物品', desc: ['desc:10'], buyPrice: 9, sellPrice: 4, sellable: false },
      {
        id: '21',
        name: '测试物品',
        desc: ['desc:11'],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        icon: 'item-icon.pal.003',
      },
    ])
    expect(() => validateItems(result)).not.toThrow()
  })
})
