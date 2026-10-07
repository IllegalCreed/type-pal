/**
 * SAVE-PREFLIGHT-1 结构 guard 正负边界矩阵（GM-SP1）。
 * 字段清单以 save/types.ts CurrentSavePayload + content/character.ts
 * WorldState/CharacterInstance 现行类型为真源；可选子树缺席合法、存在时按形状检查；
 * 数值叶只验有限数，不加上限/取整/非负；坐标允许有限分数。
 *
 * TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 重铸（r2 按 Codex B-R1-01 修正）：
 * - 坏形状一律在 unknown 外部对象上构造后直传公开 `assertCurrentSaveStructure(value:
 *   unknown)`（经 IO 形状的 JSON 往返视图），不再用 `as unknown as` 双桥/假枚举把坏数据
 *   塞进 typed 通道；合法正边界仍用 buildWorld/builder 产物。
 * - 跨合同用例拆成原子行；同一调用点同谓词的值维度重复（money NaN/Infinity、party
 *   null/对象、portrait number/null）与被更强 oracle 替代者可去重；但共享 helper 不证明
 *   各字段接线——pos.height、appearance.spriteId/battleSprite、skillUseCounts 内层四条
 *   独立接线合同 r2 已归还各自原子行（B-R1-01）；r3 按 B-R2-01 再归还三条原合同：
 *   maxMP 字段数组成员资格、extraStatuses/poisons 各自回调的稀疏空洞逐下标拒收
 *   （before→after 逐条映射见证据目录）。
 * - 深层语义（skillUseCounts 安全整数、hostileAwareness 正数性、script 内容）由
 *   current-codec.contracts.test.ts 在 codec 层证明，此处只验外层形状。
 */

import { buildWorld, HIDDEN_STAT_KEYS } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  assertCurrentSaveStructure,
  CurrentSaveStructureError,
  SAVE_STRUCTURE_TOAST_TEXT,
} from './current-structure.js'
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

const validPayload = (): CurrentSavePayload => ({
  version: SAVE_VERSION,
  projectId: 'proj',
  contentVersion: 22,
  world: buildWorld({ party: ['hero'], money: 100, inventory: [] }, { hero: actor }),
  position: { sceneId: 's001', pos: { col: 1.5, row: -2.25, height: 0 }, facing: 'down' },
})

/** 运行时核验的收窄助手（测试夹具用，非类型后门：形状不符即抛）。 */
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

/** IO 形状的 unknown 视图：合法 builder 产物经 JSON 往返成为可变 Record，坏形状只在
 * 视图上构造并直传公开 guard——与真实读档入口（结构化数据 → unknown 断言）同边界。 */
function unknownView(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validPayload()))
}

/** 负边界 mutator：在合法载荷的 unknown 视图上构造坏形状后断言拒收。 */
const rejectsView = (mutate: (view: Record<string, unknown>) => void, pattern: RegExp) => () => {
  const view = unknownView()
  mutate(view)
  expect(() => assertCurrentSaveStructure(view)).toThrow(pattern)
}

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
  test('automatic chase claims retain only stable addresses and behavior IDs', () => {
    const payload = {
      ...validPayload(),
      automaticChaseClaims: [
        {
          owner: { scene: 's001', entity: 'owner' },
          target: { scene: 's001', entity: 'npc' },
          behavior: 'chase',
        },
      ],
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
  ])('malformed automatic chase claims are rejected before cloning: %j', (automaticChaseClaims) => {
    expect(() => assertCurrentSaveStructure({ ...validPayload(), automaticChaseClaims })).toThrow(
      /automaticChaseClaims/,
    )
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
    rejectsView((view) => mutate(asRecord(view.world)), pattern)())

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
    rejectsView((view) => mutate(asRecord(view.position)), pattern)())

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
    rejectsView(mutate, pattern)())
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
    rejectsView((view) => mutate(asRecord(view.world)), pattern)())
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
    const view = unknownView()
    mutate(asRecord(asList(asRecord(view.world).party)[0]!))
    expect(() => assertCurrentSaveStructure(view)).toThrow(pattern)
  })

  test('appearance.portrait=null 不在合同内（AssetId | undefined；portrait 自有接线）', () =>
    rejectsView((view) => {
      asRecord(asList(asRecord(view.world).party)[0]!).appearance = { portrait: null }
    }, /portrait/)())

  test('reserve 元素坏形状同样拒绝（同型 guard 单代表，路径含 reserve）', () => {
    const view = unknownView()
    const world = asRecord(view.world)
    const hero = asRecord(asList(world.party)[0]!)
    world.reserve = [{ ...structuredClone(hero), level: Number.NaN }]
    expect(() => assertCurrentSaveStructure(view)).toThrow(/world\.reserve\[0\]\.level/)
  })
})
