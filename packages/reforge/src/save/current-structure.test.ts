import { buildWorld, HIDDEN_STAT_KEYS } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertCurrentSaveStructure, CurrentSaveStructureError } from './current-structure.js'
import { buildCurrentSavePayload } from './ops.js'
import { type CurrentSavePayload, SAVE_VERSION } from './types.js'

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

const validPayload = (): CurrentSavePayload =>
  buildCurrentSavePayload(
    buildWorld({ party: ['hero'], money: 100, inventory: [] }, { hero: actor }),
    { sceneId: 's001', pos: { col: 1.5, row: -2.25, height: 0 }, facing: 'down' },
    'proj',
  )

function asRecord(value: unknown): Record<string, unknown> {
  const isRecordLike = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  if (!isRecordLike(value)) throw new Error('test fixture: 期望对象')
  return value
}

function asList(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('test fixture: 期望数组')
  return value
}

function rejectsView(mutate: (view: Record<string, unknown>) => void, pattern: RegExp): void {
  // The storage port uses structured clone, which preserves undefined properties and sparse arrays.
  const view = asRecord(structuredClone(validPayload()))
  mutate(view)
  expect(() => assertCurrentSaveStructure(view)).toThrow(pattern)
}

test.each([
  ['gait.source', { gait: { phase: 2, source: ['auto'], owner: 'npc' } }],
  [
    'move.speed',
    {
      move: {
        owner: 'npc',
        to: { col: 4, row: 5, height: 0 },
        speed: ['slow'],
        slowRestPending: true,
        slowCadence: true,
      },
    },
  ],
] as const)('scene runtime rejects an array at motion.%s', (field, motion) => {
  const payload = {
    ...validPayload(),
    sceneRuntime: {
      s001: { entities: { npc: { motion } }, automatic: {}, chaseClaims: [], actions: [] },
    },
  }
  expect(() => assertCurrentSaveStructure(payload)).toThrow(
    expect.objectContaining({ field: `载荷.sceneRuntime.s001.entities.npc.motion.${field}` }),
  )
})

describe('current-structure · 合法载荷（正边界）', () => {
  test('现行保存器产物通过；分数坐标/负坐标原样放行', () => {
    expect(() => assertCurrentSaveStructure(validPayload())).not.toThrow()
  })

  test('全部可选子树缺席合法（world 级九项 + 实例级五项，typed 缺席即合法）', () => {
    const payload = validPayload()
    delete payload.world.reserve
    delete payload.world.skillUseCounts
    delete payload.world.ambience
    delete payload.world.collectValue
    delete payload.world.resources
    delete payload.world.audio
    delete payload.world.hostileAwareness
    delete payload.world.script
    delete payload.world.entityLifecycles
    for (const key of [
      'hiddenExp',
      'poisons',
      'extraStatuses',
      'extraPoisonRes',
      'appearance',
    ] as const)
      delete payload.world.party[0]![key]
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('合法零值与空容器：HP=0、空 equipment/tags/inventory/learnedSkills、空 reserve/skillUseCounts/entityLifecycles', () => {
    const payload = validPayload()
    payload.world.party[0]!.hp = 0
    payload.world.party[0]!.equipment = {}
    payload.world.party[0]!.tags = []
    payload.world.inventory = []
    payload.world.learnedSkills = {}
    payload.world.reserve = []
    payload.world.skillUseCounts = {}
    payload.world.entityLifecycles = {}
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('audio.currentMusic=null 为显式静音，合法', () => {
    const payload = validPayload()
    payload.world.audio = { currentMusic: null }
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('hiddenExp 全部七个隐藏成长属性键通过（HIDDEN_STAT_KEYS 真源，含分数经验）', () => {
    const payload = validPayload()
    payload.world.party[0]!.hiddenExp = Object.fromEntries(
      HIDDEN_STAT_KEYS.map((key) => [key, { exp: 1.5, level: 2 }]),
    )
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('appearance 三可选字段全为字符串 AssetId 通过', () => {
    const payload = validPayload()
    payload.world.party[0]!.appearance = {
      spriteId: 'sprite.alt',
      portrait: 'portrait.hero',
      battleSprite: 'battle.alt',
    }
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('extraStatuses 合法可携带状态 id（protect）通过', () => {
    const payload = validPayload()
    payload.world.party[0]!.extraStatuses = [{ status: 'protect', turns: 3 }]
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
  })

  test('R4：错误携带完整路径 message 与固定短中文 shortMessage（像素宽度回归见 chain 测试）', () => {
    const payload = validPayload()
    payload.world.party[0]!.hiddenExp = { luck: { exp: Number.NaN, level: 1 } }
    expect(() => assertCurrentSaveStructure(payload)).toThrow(
      expect.objectContaining({
        name: CurrentSaveStructureError.name,
        message: expect.stringContaining('载荷.world.party[0].hiddenExp["luck"].exp'),
        shortMessage: '存档损坏，无法读取',
      }),
    )
  })

  test('结构校验不修改通过的载荷', () => {
    const payload = validPayload()
    const before = structuredClone(payload)
    assertCurrentSaveStructure(payload)
    expect(payload).toEqual(before)
  })
})

describe('current-structure · Envelope / world / position（负边界）', () => {
  test('automatic chase claims retain only stable addresses and behavior IDs', () => {
    const payload = {
      ...validPayload(),
      sceneRuntime: {
        s001: {
          entities: {},
          automatic: {},
          actions: [],
          chaseClaims: [
            {
              owner: { scene: 's001', entity: 'owner' },
              target: { scene: 's001', entity: 'npc' },
              behavior: 'chase',
            },
          ],
        },
      },
    }
    const before = structuredClone(payload)
    expect(() => assertCurrentSaveStructure(payload)).not.toThrow()
    expect(payload).toEqual(before)
  })

  test.each([
    null,
    {},
    [null],
    Array.from({ length: 1 }),
    [{ owner: null, target: { scene: 's001', entity: 'npc' }, behavior: 'chase' }],
    [
      {
        owner: { scene: '', entity: 'owner' },
        target: { scene: 's001', entity: 'npc' },
        behavior: 'chase',
      },
    ],
    [
      {
        owner: { scene: 's001', entity: 'owner' },
        target: { scene: 's001', entity: 'npc' },
        behavior: '',
      },
    ],
    [
      {
        owner: { scene: 's001', entity: 'owner', epoch: 1 },
        target: { scene: 's001', entity: 'npc' },
        behavior: 'chase',
      },
    ],
    [
      {
        owner: { scene: 's001', entity: 'owner' },
        target: { scene: 's001', entity: 'npc' },
        behavior: 'chase',
        commandEpoch: 1,
      },
    ],
    [
      {
        owner: { scene: 's001', entity: 'owner' },
        target: { scene: 's001', entity: 'npc' },
        behavior: 'chase',
      },
      {
        owner: { scene: 's001', entity: 'other' },
        target: { scene: 's001', entity: 'npc' },
        behavior: 'chase',
      },
    ],
  ])('malformed automatic chase claims are rejected before cloning: %j', (chaseClaims) => {
    expect(() =>
      assertCurrentSaveStructure({
        ...validPayload(),
        sceneRuntime: { s001: { entities: {}, automatic: {}, chaseClaims, actions: [] } },
      }),
    ).toThrow(/chaseClaims/)
  })

  test.each([
    ['载荷=null', () => null, /载荷/],
    ['载荷=数组', () => [validPayload()], /载荷/],
    ['world 缺席', () => ({ ...validPayload(), world: undefined }), /载荷\.world/],
    ['position 缺席', () => ({ ...validPayload(), position: undefined }), /载荷\.position/],
    [
      'version 非当前 SAVE 常量',
      () => ({ ...validPayload(), version: SAVE_VERSION - 1 }),
      /version/,
    ],
    ['projectId 空串', () => ({ ...validPayload(), projectId: '' }), /projectId/],
    [
      'contentVersion 非数字',
      () => ({ ...validPayload(), contentVersion: '20' }),
      /contentVersion/,
    ],
  ])('Envelope 坏形状 %s 带路径拒绝', (_name, build, pattern) => {
    expect(() => assertCurrentSaveStructure(build())).toThrow(pattern)
  })

  test.each([
    [
      'money=字符串',
      (world: Record<string, unknown>) => {
        world.money = 'not-money'
      },
      /world\.money/,
    ],
    [
      'money=NaN（有限数条件代表；Infinity 同层同 oracle）',
      (world: Record<string, unknown>) => {
        world.money = Number.NaN
      },
      /world\.money/,
    ],
    [
      'party=null（数组条件代表）',
      (world: Record<string, unknown>) => {
        world.party = null
      },
      /world\.party/,
    ],
    [
      'learnedSkills 值非数组',
      (world: Record<string, unknown>) => {
        world.learnedSkills = { hero: 'fire' }
      },
      /learnedSkills/,
    ],
    [
      'inventory 元素缺 itemId',
      (world: Record<string, unknown>) => {
        world.inventory = [{ count: 1 }]
      },
      /inventory\[0\]\.itemId/,
    ],
    [
      'inventory count=NaN',
      (world: Record<string, unknown>) => {
        world.inventory = [{ itemId: 'herb', count: Number.NaN }]
      },
      /inventory\[0\]\.count/,
    ],
  ])('world 坏形状 %s 带路径拒绝', (_name, mutate, pattern) =>
    rejectsView((view) => mutate(asRecord(view.world)), pattern))

  test.each([
    [
      'sceneId 空串',
      (position: Record<string, unknown>) => {
        position.sceneId = ''
      },
      /sceneId/,
    ],
    [
      'pos 非对象',
      (position: Record<string, unknown>) => {
        position.pos = null
      },
      /position\.pos/,
    ],
    [
      'pos.col=NaN',
      (position: Record<string, unknown>) => {
        position.pos = { col: Number.NaN, row: 0, height: 0 }
      },
      /pos\.col/,
    ],
    [
      'pos.row=字符串',
      (position: Record<string, unknown>) => {
        position.pos = { col: 0, row: '1', height: 0 }
      },
      /pos\.row/,
    ],
    [
      '缺 height（独立接线，B-R1-01 归还）',
      (position: Record<string, unknown>) => {
        position.pos = { col: 0, row: 0 }
      },
      /pos\.height/,
    ],
    [
      'facing=sideways（四方向枚举条件代表）',
      (position: Record<string, unknown>) => {
        position.facing = 'sideways'
      },
      /facing/,
    ],
  ])('position 坏形状 %s 带路径拒绝', (_name, mutate, pattern) =>
    rejectsView((view) => mutate(asRecord(view.position)), pattern))

  test.each([
    [
      'inventory[0]（记录型元素数组代表）',
      (view: Record<string, unknown>) => {
        asRecord(view.world).inventory = new Array(1)
      },
      /inventory\[0\]/,
    ],
    [
      'tags[0]（字符串元素数组代表）',
      (view: Record<string, unknown>) => {
        asRecord(asList(asRecord(view.world).party)[0]!).tags = new Array(1)
      },
      /tags\[0\]/,
    ],
    [
      'extraStatuses[0]（独立回调接线，B-R2-01 归还）',
      (view: Record<string, unknown>) => {
        asRecord(asList(asRecord(view.world).party)[0]!).extraStatuses = new Array(1)
      },
      /extraStatuses\[0\]/,
    ],
    [
      'poisons[0]（独立回调接线，B-R2-01 归还）',
      (view: Record<string, unknown>) => {
        asRecord(asList(asRecord(view.world).party)[0]!).poisons = new Array(1)
      },
      /poisons\[0\]/,
    ],
  ])('R3：稀疏空洞逐下标拒绝：%s，不被 forEach 跳过', (_name, mutate, pattern) =>
    rejectsView(mutate, pattern))
})

describe('current-structure · 可选子树存在时的形状检查', () => {
  test.each([
    [
      'resources 值非有限数',
      (world: Record<string, unknown>) => {
        world.resources = { pool: Number.NaN }
      },
      /resources/,
    ],
    [
      'skillUseCounts 内层值非有限数（独立接线，B-R1-01 归还）',
      (world: Record<string, unknown>) => {
        world.skillUseCounts = { hero: { fire: 'x' } }
      },
      /skillUseCounts/,
    ],
    [
      'audio.currentMusic=数字',
      (world: Record<string, unknown>) => {
        world.audio = { currentMusic: 3 }
      },
      /audio\.currentMusic/,
    ],
    [
      'hostileAwareness.rangeMultiplier=1（外层 0/3 检查；深层正数性见 codec 合同）',
      (world: Record<string, unknown>) => {
        world.hostileAwareness = { rangeMultiplier: 1, remainingMs: 100 }
      },
      /rangeMultiplier/,
    ],
    [
      'hostileAwareness.remainingMs=Infinity（外层有限数）',
      (world: Record<string, unknown>) => {
        world.hostileAwareness = { rangeMultiplier: 3, remainingMs: Number.POSITIVE_INFINITY }
      },
      /remainingMs/,
    ],
    [
      'script=数组（深层语义留给 codec，外层形状仍拒）',
      (world: Record<string, unknown>) => {
        world.script = []
      },
      /world\.script/,
    ],
    [
      'ambience=数字',
      (world: Record<string, unknown>) => {
        world.ambience = 2
      },
      /ambience/,
    ],
    [
      'collectValue=NaN（标量有限数代表）',
      (world: Record<string, unknown>) => {
        world.collectValue = Number.NaN
      },
      /collectValue/,
    ],
  ])('可选子树 %s 拒绝', (_name, mutate, pattern) =>
    rejectsView((view) => mutate(asRecord(view.world)), pattern))
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
      'hp=NaN（十一条数值字段共用有限数循环；luck=字符串 为类型条件代表）',
      (i: Record<string, unknown>) => {
        i.hp = Number.NaN
      },
      /\.hp/,
    ],
    [
      'maxMP=Infinity（字段数组成员资格，B-R2-01 归还）',
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
      'poisons 元素缺 tickIndex',
      (i: Record<string, unknown>) => {
        i.poisons = [{ poisonId: 1 }]
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
      'extraStatuses 未知状态 id（复用 content 枚举真源）',
      (i: Record<string, unknown>) => {
        i.extraStatuses = [{ status: 'not-a-status', turns: 3 }]
      },
      /可携带状态枚举/,
    ],
    [
      'extraPoisonRes=字符串',
      (i: Record<string, unknown>) => {
        i.extraPoisonRes = '3'
      },
      /\.extraPoisonRes/,
    ],
    [
      'appearance.spriteId=数字（独立接线，B-R1-01 归还）',
      (i: Record<string, unknown>) => {
        i.appearance = { spriteId: 2 }
      },
      /\.appearance\.spriteId/,
    ],
    [
      'appearance.battleSprite=null（非可选 null；独立接线，B-R1-01 归还）',
      (i: Record<string, unknown>) => {
        i.appearance = { battleSprite: null }
      },
      /\.appearance\.battleSprite/,
    ],
  ])('实例坏形状 %s 带路径拒绝', (_name, mutate, pattern) => {
    const view = asRecord(structuredClone(validPayload()))
    mutate(asRecord(asList(asRecord(view.world).party)[0]!))
    expect(() => assertCurrentSaveStructure(view)).toThrow(pattern)
  })

  test('appearance.portrait=null 不在合同内（AssetId | undefined；portrait 自有接线）', () =>
    rejectsView((view) => {
      asRecord(asList(asRecord(view.world).party)[0]!).appearance = { portrait: null }
    }, /portrait/))

  test('reserve 元素坏形状同样拒绝（同型 guard 单代表，路径含 reserve）', () => {
    const view = asRecord(structuredClone(validPayload()))
    const world = asRecord(view.world)
    const hero = asRecord(asList(world.party)[0]!)
    world.reserve = [{ ...structuredClone(hero), level: Number.NaN }]
    expect(() => assertCurrentSaveStructure(view)).toThrow(/world\.reserve\[0\]\.level/)
  })
})
