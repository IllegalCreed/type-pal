/**
 * SAVE-PREFLIGHT-1 结构 guard 正负边界矩阵（GM-SP1）。
 * 字段清单以 save/types.ts CurrentSavePayload + content/character.ts
 * WorldState/CharacterInstance 现行类型为真源；可选子树缺席合法、存在时按形状检查；
 * 数值叶只验有限数，不加上限/取整/非负；坐标允许有限分数。
 */

import { buildWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  assertCurrentSaveStructure,
  CurrentSaveStructureError,
  SAVE_STRUCTURE_TOAST_TEXT,
} from './current-structure.js'
import type { CurrentSavePayload } from './types.js'

const actor = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}

const validPayload = (): CurrentSavePayload => ({
  version: 8,
  projectId: 'proj',
  contentVersion: 20,
  world: buildWorld({ party: ['hero'], money: 100, inventory: [] }, { hero: actor }),
  position: { sceneId: 's001', pos: { col: 1.5, row: -2.25, height: 0 }, facing: 'down' },
})

const rejects = (mutate: (p: CurrentSavePayload) => void, pattern: RegExp) => () => {
  const payload = validPayload()
  mutate(payload)
  expect(() => assertCurrentSaveStructure(payload)).toThrow(pattern)
}

describe('current-structure · 合法载荷（正边界）', () => {
  test('现行保存器产物通过；分数坐标/负坐标原样放行', () => {
    expect(() => assertCurrentSaveStructure(validPayload())).not.toThrow()
  })

  test('全部可选子树缺席合法（reserve/skillUseCounts/ambience/collectValue/resources/audio/hostileAwareness/script/entityLifecycles + 实例级可选项）', () => {
    const payload = validPayload()
    delete payload.world.reserve
    // buildWorld 产物可能不含这些键；显式确保缺席
    const world = payload.world as unknown as Record<string, unknown>
    for (const key of [
      'reserve',
      'skillUseCounts',
      'ambience',
      'collectValue',
      'resources',
      'audio',
      'hostileAwareness',
      'script',
      'entityLifecycles',
    ])
      delete world[key]
    for (const optionalKey of [
      'hiddenExp',
      'poisons',
      'extraStatuses',
      'extraPoisonRes',
      'appearance',
    ])
      delete (payload.world.party[0] as unknown as Record<string, unknown>)[optionalKey]
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('合法边界值：HP=0、空 equipment/tags/inventory、空 learnedSkills Record、显式静音 audio.currentMusic=null、空 reserve/skillUseCounts/entityLifecycles 容器', () => {
    const payload = validPayload()
    payload.world.party[0]!.hp = 0
    payload.world.party[0]!.equipment = {}
    payload.world.party[0]!.tags = []
    payload.world.inventory = []
    payload.world.learnedSkills = {}
    payload.world.audio = { currentMusic: null }
    payload.world.reserve = []
    payload.world.skillUseCounts = {}
    payload.world.entityLifecycles = {}
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('hiddenExp 合法七个属性键 + appearance 三可选字段（portrait 为字符串 AssetId）', () => {
    const payload = validPayload()
    payload.world.party[0]!.hiddenExp = {
      maxHP: { exp: 1.5, level: 2 },
      luck: { exp: 0, level: 0 },
    }
    payload.world.party[0]!.appearance = { portrait: 'portrait.hero' }
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('R3：稀疏数组空洞逐下标拒绝（inventory/tags/extraStatuses/poisons），不被 forEach 跳过', () => {
    const sparseInventory = validPayload()
    sparseInventory.world.inventory = new Array(1) as unknown as { itemId: string; count: number }[]
    expect(() => assertCurrentSaveStructure(sparseInventory)).toThrow(/inventory\[0\]/)

    const sparseTags = validPayload()
    sparseTags.world.party[0]!.tags = new Array(1) as unknown as string[]
    expect(() => assertCurrentSaveStructure(sparseTags)).toThrow(/tags\[0\]/)

    const sparseStatuses = validPayload()
    sparseStatuses.world.party[0]!.extraStatuses = new Array(1) as unknown as {
      status: 'protect'
      turns: number
    }[]
    expect(() => assertCurrentSaveStructure(sparseStatuses)).toThrow(/extraStatuses\[0\]/)

    const sparsePoisons = validPayload()
    sparsePoisons.world.party[0]!.poisons = new Array(1) as unknown as {
      poisonId: number
      tickIndex: number
    }[]
    expect(() => assertCurrentSaveStructure(sparsePoisons)).toThrow(/poisons\[0\]/)
  })

  test('R3：CarriedStatus.status 复用 content 枚举真源——合法 id 通过、未知 id 拒绝', () => {
    const payload = validPayload()
    payload.world.party[0]!.extraStatuses = [{ status: 'protect', turns: 3 }]
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()

    const bogus = validPayload()
    bogus.world.party[0]!.extraStatuses = [{ status: 'not-a-status' as 'protect', turns: 3 }]
    expect(() => assertCurrentSaveStructure(bogus)).toThrow(/可携带状态枚举/)
  })

  test('R3：appearance.portrait=null 不在合同内（AssetId | undefined），拒绝', () => {
    const payload = validPayload()
    payload.world.party[0]!.appearance = { portrait: null as unknown as string }
    expect(() => assertCurrentSaveStructure(payload)).toThrow(/portrait/)
  })

  test('R4：错误携带完整路径 message 与固定短中文 shortMessage（像素宽度回归见 chain 测试）', () => {
    const payload = validPayload()
    payload.world.party[0]!.hiddenExp = { luck: { exp: Number.NaN, level: 1 } }
    try {
      assertCurrentSaveStructure(payload)
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(CurrentSaveStructureError)
      const structureError = error as CurrentSaveStructureError
      expect(structureError.message).toMatch(/载荷\.world\.party\[0\]\.hiddenExp\["luck"\]\.exp/)
      // R4 返工：动态字段文案按字形实测 232/248px 超出 200px 可用宽，改为固定短文案；
      // 完整路径只在 message（console.warn/测试），不进画布。
      expect(structureError.shortMessage).toBe(SAVE_STRUCTURE_TOAST_TEXT)
      expect(structureError.shortMessage).not.toContain('hiddenExp')
    }
  })

  test('guard 通过后输入与原对象无别名关系（不修改输入）', () => {
    const payload = validPayload()
    const before = JSON.stringify(payload)
    assertCurrentSaveStructure(payload)
    expect(JSON.stringify(payload)).toBe(before)
  })
})

describe('current-structure · Envelope / world / position（负边界）', () => {
  test('null / 数组 / 缺 world / 缺 position 拒绝', () => {
    expect(() => assertCurrentSaveStructure(null)).toThrow(/载荷/)
    expect(() => assertCurrentSaveStructure([validPayload()])).toThrow(/载荷/)
    expect(() => assertCurrentSaveStructure({ ...validPayload(), world: undefined })).toThrow(
      /载荷\.world/,
    )
    expect(() => assertCurrentSaveStructure({ ...validPayload(), position: undefined })).toThrow(
      /载荷\.position/,
    )
  })

  test('version 非 8 / projectId 非字符串 / contentVersion 非数字拒绝', () => {
    expect(() => assertCurrentSaveStructure({ ...validPayload(), version: 7 })).toThrow(/version/)
    expect(() => assertCurrentSaveStructure({ ...validPayload(), projectId: '' })).toThrow(
      /projectId/,
    )
    expect(() => assertCurrentSaveStructure({ ...validPayload(), contentVersion: '20' })).toThrow(
      /contentVersion/,
    )
  })

  test.each([
    [
      'money=字符串',
      (p: CurrentSavePayload) => {
        ;(p.world as unknown as Record<string, unknown>).money = 'not-money'
      },
      /world\.money/,
    ],
    [
      'money=NaN',
      (p: CurrentSavePayload) => {
        p.world.money = Number.NaN
      },
      /world\.money/,
    ],
    [
      'money=Infinity',
      (p: CurrentSavePayload) => {
        p.world.money = Number.POSITIVE_INFINITY
      },
      /world\.money/,
    ],
    [
      'party=null',
      (p: CurrentSavePayload) => {
        ;(p.world as unknown as Record<string, unknown>).party = null
      },
      /world\.party/,
    ],
    [
      'party=对象',
      (p: CurrentSavePayload) => {
        ;(p.world as unknown as Record<string, unknown>).party = {}
      },
      /world\.party/,
    ],
    [
      'learnedSkills 值非数组',
      (p: CurrentSavePayload) => {
        p.world.learnedSkills = { hero: 'fire' as unknown as string[] }
      },
      /learnedSkills/,
    ],
    [
      'inventory 元素缺 itemId',
      (p: CurrentSavePayload) => {
        p.world.inventory = [{ count: 1 } as unknown as { itemId: string; count: number }]
      },
      /inventory\[0\]\.itemId/,
    ],
    [
      'inventory count=NaN',
      (p: CurrentSavePayload) => {
        p.world.inventory = [{ itemId: 'herb', count: Number.NaN }]
      },
      /inventory\[0\]\.count/,
    ],
  ])('world 坏形状 %s 带路径拒绝', (_name, mutate, pattern) => rejects(mutate, pattern)())

  test.each([
    [
      'sceneId 空串',
      (p: CurrentSavePayload) => {
        p.position.sceneId = ''
      },
      /sceneId/,
    ],
    [
      'pos 非对象',
      (p: CurrentSavePayload) => {
        ;(p.position as Record<string, unknown>).pos = null
      },
      /position\.pos/,
    ],
    [
      'pos.col=NaN',
      (p: CurrentSavePayload) => {
        p.position.pos = { col: Number.NaN, row: 0, height: 0 }
      },
      /pos\.col/,
    ],
    [
      'pos.row=字符串',
      (p: CurrentSavePayload) => {
        p.position.pos = { col: 0, row: '1' as unknown as number, height: 0 }
      },
      /pos\.row/,
    ],
    [
      '缺 height',
      (p: CurrentSavePayload) => {
        p.position.pos = { col: 0, row: 0 } as unknown as {
          col: number
          row: number
          height: number
        }
      },
      /pos\.height/,
    ],
    [
      'facing=sideways',
      (p: CurrentSavePayload) => {
        p.position.facing = 'sideways' as unknown as 'down'
      },
      /facing/,
    ],
    [
      'facing=undefined',
      (p: CurrentSavePayload) => {
        ;(p.position as Record<string, unknown>).facing = undefined
      },
      /facing/,
    ],
  ])('position 坏形状 %s 带路径拒绝', (_name, mutate, pattern) => rejects(mutate, pattern)())
})

describe('current-structure · 可选子树存在时的形状检查', () => {
  test.each([
    [
      'resources 值非有限数',
      (p: CurrentSavePayload) => {
        p.world.resources = { pool: Number.NaN }
      },
      /resources/,
    ],
    [
      'audio.currentMusic=数字',
      (p: CurrentSavePayload) => {
        p.world.audio = { currentMusic: 3 as unknown as string }
      },
      /audio\.currentMusic/,
    ],
    [
      'hostileAwareness.rangeMultiplier=1',
      (p: CurrentSavePayload) => {
        p.world.hostileAwareness = { rangeMultiplier: 1 as 0 | 3, remainingMs: 100 }
      },
      /rangeMultiplier/,
    ],
    [
      'hostileAwareness.remainingMs=Infinity',
      (p: CurrentSavePayload) => {
        p.world.hostileAwareness = { rangeMultiplier: 3, remainingMs: Number.POSITIVE_INFINITY }
      },
      /remainingMs/,
    ],
    [
      'script=数组（深层语义留给 codec guard，外层形状仍拒）',
      (p: CurrentSavePayload) => {
        p.world.script = [] as unknown as CurrentSavePayload['world']['script']
      },
      /world\.script/,
    ],
    [
      'ambience=数字',
      (p: CurrentSavePayload) => {
        p.world.ambience = 2 as unknown as string
      },
      /ambience/,
    ],
    [
      'collectValue=NaN',
      (p: CurrentSavePayload) => {
        p.world.collectValue = Number.NaN
      },
      /collectValue/,
    ],
    [
      'skillUseCounts 内层值非有限数',
      (p: CurrentSavePayload) => {
        p.world.skillUseCounts = { hero: { fire: 'x' as unknown as number } }
      },
      /skillUseCounts/,
    ],
  ])('可选子树 %s 拒绝', (_name, mutate, pattern) => rejects(mutate, pattern)())
})

describe('current-structure · CharacterInstance（party 与 reserve 同型）', () => {
  test.each([
    [
      'id 空串',
      (i: Record<string, unknown>) => {
        i.id = ''
      },
      /\.id/,
    ],
    [
      'template 非字符串',
      (i: Record<string, unknown>) => {
        i.template = 7
      },
      /\.template/,
    ],
    [
      'hp=NaN',
      (i: Record<string, unknown>) => {
        i.hp = Number.NaN
      },
      /\.hp/,
    ],
    [
      'maxMP=Infinity',
      (i: Record<string, unknown>) => {
        i.maxMP = Number.POSITIVE_INFINITY
      },
      /\.maxMP/,
    ],
    [
      'luck=字符串',
      (i: Record<string, unknown>) => {
        i.luck = '7'
      },
      /\.luck/,
    ],
    [
      'equipment 值非字符串',
      (i: Record<string, unknown>) => {
        i.equipment = { slot: 3 }
      },
      /\.equipment/,
    ],
    [
      'tags 元素非字符串',
      (i: Record<string, unknown>) => {
        i.tags = ['ok', 2]
      },
      /\.tags\[1\]/,
    ],
    [
      'hiddenExp 未知键',
      (i: Record<string, unknown>) => {
        i.hiddenExp = { notAStat: { exp: 1, level: 1 } }
      },
      /隐藏成长属性键/,
    ],
    [
      'hiddenExp.exp=NaN',
      (i: Record<string, unknown>) => {
        i.hiddenExp = { luck: { exp: Number.NaN, level: 1 } }
      },
      /\.hiddenExp\["luck"\]\.exp/,
    ],
    [
      'poisons 元素缺 tickIndex',
      (i: Record<string, unknown>) => {
        i.poisons = [{ poisonId: 1 } as unknown as { poisonId: number; tickIndex: number }]
      },
      /\.poisons\[0\]\.tickIndex/,
    ],
    [
      'extraStatuses.turns=Infinity',
      (i: Record<string, unknown>) => {
        i.extraStatuses = [{ status: 'protect', turns: Number.POSITIVE_INFINITY }]
      },
      /\.extraStatuses\[0\]\.turns/,
    ],
    [
      'extraPoisonRes=字符串',
      (i: Record<string, unknown>) => {
        i.extraPoisonRes = '3'
      },
      /\.extraPoisonRes/,
    ],
    [
      'appearance.spriteId=数字',
      (i: Record<string, unknown>) => {
        i.appearance = { spriteId: 2 }
      },
      /\.appearance\.spriteId/,
    ],
    [
      'appearance.portrait=数字',
      (i: Record<string, unknown>) => {
        i.appearance = { portrait: 2 }
      },
      /\.appearance\.portrait/,
    ],
    [
      'appearance.battleSprite=null（非可选 null）',
      (i: Record<string, unknown>) => {
        i.appearance = { battleSprite: null }
      },
      /\.appearance\.battleSprite/,
    ],
  ])('实例坏形状 %s 带路径拒绝', (_name, mutate, pattern) => {
    const payload = validPayload()
    mutate(payload.world.party[0] as unknown as Record<string, unknown>)
    expect(() => assertCurrentSaveStructure(payload)).toThrow(pattern)
  })

  test('reserve 元素坏形状同样拒绝（路径含 reserve）', () => {
    const payload = validPayload()
    const template = payload.world.party[0]!
    payload.world.reserve = [structuredClone(template)]
    ;(payload.world.reserve[0]! as unknown as Record<string, unknown>).level = Number.NaN
    expect(() => assertCurrentSaveStructure(payload)).toThrow(/world\.reserve\[0\]\.level/)
  })
})
