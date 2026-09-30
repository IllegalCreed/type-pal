/** TEST-GLM-WAVE-O-1 O05：窄供应守卫的残余公开合同（overlay/伤亡/窄消息/Store0 边界）。
 *  旧证：pal-authored-overlays.test.ts、pal-casualty-scripts.test.ts、
 *  pal-item-message-source.pal.test.ts、pal-store-boundary.test.ts 覆盖常规路径；
 *  本卡按 gap-map 直击未覆盖臂：隐蛊/puppet overlay、伤亡 opcode 轴、
 *  窄消息形状漂移、Store0 货单与 census 轴。全部纯内存，typed 输入。
 */
import { describe, expect, test } from 'vitest'
import type { ItemData } from '@type-pal/content'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
  applyPalItemOverlays,
} from './pal-authored-overlays.js'
import {
  applyPalCasualtyOverlays,
  translateCasualtyScript,
} from './pal-casualty-scripts.js'
import {
  applyPalItemMessageSources,
  buildPalItemMessageSources,
  buildSourceAddressLabelIndex,
  translateCraftRecipeScript,
  translateResourcePoolScript,
} from './pal-item-message-source.js'
import {
  assertPalAlchemyBoundaryInvariant,
  assertPalStoreBoundaryInvariant,
} from './pal-store-boundary.js'
import type { SourceStore } from './pal-derived-content.js'
import type { SourceCmd } from './source-facts.js'
import type { SourceItem } from './pal-source-types.js'

const line = (messageIndex: number): SourceCmd => ({ op: 'showDialog', messageIndex, text: 't' })
const gate = (target: number): SourceCmd => ({ op: 'raw', opcode: 0x06, operands: [100, target] })
const end: SourceCmd = { op: 'end' }

const item = (id: string, over: Partial<ItemData> = {}): ItemData => ({
  id,
  name: `物品${id}`,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  ...over,
})

describe('O05 applyPalItemOverlays：隐蛊与 puppet 轴', () => {
  test('item141 被覆写为全队隐形 3 回合且 battleOnly', () => {
    const [overlaid] = applyPalItemOverlays([item('141')])
    expect(overlaid!.use).toEqual({
      target: 'allAllies',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'hideParty', turns: 3 }],
    })
  })

  test('非 141 物品结构化克隆返回（输入不被共享引用）', () => {
    const source = item('100')
    const [out] = applyPalItemOverlays([source])
    expect(out).toEqual(source)
    expect(out).not.toBe(source)
  })

  test('puppet 状态效果被强制 battleOnly（无论原值）', () => {
    const puppet = item('50', {
      use: {
        target: 'oneEnemy',
        consuming: true,
        effects: [{ kind: 'applyStatus', status: 'puppet', turns: 2 } as never],
      },
    })
    const [out] = applyPalItemOverlays([puppet])
    expect(out!.use!.battleOnly).toBe(true)
  })

  test('非 puppet 效果不注入 battleOnly', () => {
    const plain = item('60', {
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'increaseHpMp', delta: 50 } as never] },
    })
    const [out] = applyPalItemOverlays([plain])
    expect(out!.use!.battleOnly).toBeUndefined()
  })
})

describe('O05 applyPalGeneratedCraftMessages / ResourcePool：同轮消息同步', () => {
  const craft = (message?: string) => ({
    kind: 'craftRecipe' as const,
    recipes: [{ ingredients: [{ itemId: '117', count: 1 }], products: [{ itemId: '148', count: 1 }] }],
    ...(message === undefined ? {} : { unavailableMessage: message }),
  })
  const pool = (message?: string) => ({
    kind: 'drawFromResourcePool' as const,
    resource: 'collectValue' as const,
    maxRoll: 1,
    rewards: [{ itemId: '100', count: 1 }],
    ...(message === undefined ? {} : { unavailableMessage: message }),
  })

  test('无消息的 generated 物品整批跳过（不触碰 current）', () => {
    const current = [item('268', { use: { target: 'scene', consuming: true, effects: [craft()] } })]
    const out = applyPalGeneratedCraftMessages(current, [item('300', { use: { target: 'scene', consuming: true, effects: [craft()] } })])
    expect(out).toEqual(current)
  })

  test('current 缺同 id 物品 → fail-loud', () => {
    const generated = [item('268', { use: { target: 'scene', consuming: true, effects: [craft('缺材料')] } })]
    expect(() => applyPalGeneratedCraftMessages([], generated)).toThrow(
      'PAL generated craft message: current 缺物品 268',
    )
  })

  test('craft 数量漂移与 recipes 漂移分别 fail-loud', () => {
    const current = [item('268', { use: { target: 'scene', consuming: true, effects: [craft()] } })]
    const generatedDrift = [
      item('268', { use: { target: 'scene', consuming: true, effects: [craft('缺材料'), craft()] } }),
    ]
    expect(() => applyPalGeneratedCraftMessages(current, generatedDrift)).toThrow(
      'PAL generated craft message: item268 craft 数量漂移',
    )
    const generatedDifferent = [
      item('268', {
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                { ingredients: [{ itemId: '118', count: 1 }], products: [{ itemId: '148', count: 1 }] },
              ],
              unavailableMessage: '缺材料',
            },
          ],
        },
      }),
    ]
    expect(() => applyPalGeneratedCraftMessages(current, generatedDifferent)).toThrow(
      'PAL generated craft message: item268 recipes drift',
    )
  })

  test('非法消息（空白/未修剪）→ fail-loud', () => {
    const current = [item('268', { use: { target: 'scene', consuming: true, effects: [craft()] } })]
    const generated = [item('268', { use: { target: 'scene', consuming: true, effects: [craft(' 缺材料 ')] } })]
    expect(() => applyPalGeneratedCraftMessages(current, generated)).toThrow(
      'PAL generated craft message: item268 message 非法',
    )
  })

  test('resource pool 漂移轴：数量/结构/消息逐轴拒绝', () => {
    const current = [item('270', { use: { target: 'scene', consuming: true, effects: [pool()] } })]
    expect(() =>
      applyPalGeneratedResourcePoolMessages(current, [
        item('270', { use: { target: 'scene', consuming: true, effects: [pool('无'), pool('无')] } }),
      ]),
    ).toThrow('PAL generated resource message: item270 pool 数量漂移')
    expect(() =>
      applyPalGeneratedResourcePoolMessages(current, [
        item('270', {
          use: {
            target: 'scene',
            consuming: true,
            effects: [{ ...pool('无'), maxRoll: 2 }],
          },
        }),
      ]),
    ).toThrow('PAL generated resource message: item270 resource pool drift')
    expect(() =>
      applyPalGeneratedResourcePoolMessages(current, [
        item('270', { use: { target: 'scene', consuming: true, effects: [pool(' 无 ')] } }),
      ]),
    ).toThrow('PAL generated resource message: item270 message 非法')
  })

  test('generated/current 内部重复 id → fail-loud', () => {
    const dup = [item('1'), item('1')]
    expect(() => applyPalGeneratedCraftMessages([], dup)).toThrow(
      'PAL generated craft message: generated 重复 item id 1',
    )
  })
})

describe('O05 translateCasualtyScript / applyPalCasualtyOverlays：opcode 轴', () => {
  test('入口缺 0x06 门 → fail-loud', () => {
    expect(() => translateCasualtyScript([line(1), end], 0, {})).toThrow(
      'B11-1 casualty: entry @0 缺 0x06 概率门',
    )
  })

  test('0x06 门参数非法（非整数/第三操作数非零）→ fail-loud', () => {
    const bad: SourceCmd[] = [{ op: 'raw', opcode: 0x06, operands: [1.5, 1] }, line(1), end]
    expect(() => translateCasualtyScript(bad, 0, {})).toThrow(/0x06 门 @0 参数无效/)
    const bad2: SourceCmd[] = [{ op: 'raw', opcode: 0x06, operands: [1, 1, 9] }, line(1), end]
    expect(() => translateCasualtyScript(bad2, 0, {})).toThrow(/0x06 门 @0 参数无效/)
  })

  test('分支引用越界 / 未以 end 结束 / 未知指令逐轴拒绝', () => {
    // 越界分支同样以“未以 end 结束”终止（parseBranch 读不到 end）。
    expect(() => translateCasualtyScript([gate(99)], 0, {})).toThrow(
      'B11-1 casualty: branch @99 未以 end 结束',
    )
    const noEnd: SourceCmd[] = [gate(1), line(1)]
    expect(() => translateCasualtyScript(noEnd, 0, {})).toThrow('B11-1 casualty: branch @1 未以 end 结束')
    const unknown: SourceCmd[] = [gate(1), { op: 'loadScene' } as SourceCmd, end]
    expect(() => translateCasualtyScript(unknown, 0, {})).toThrow('B11-1 casualty: branch @1 不支持的指令 loadScene')
  })

  test('0x30 参数非法 / 0x05 非零参数 / 未知 opcode 逐轴拒绝', () => {
    const badStat: SourceCmd[] = [gate(1), { op: 'raw', opcode: 0x30, operands: [99, 50] }, end]
    expect(() => translateCasualtyScript(badStat, 0, {})).toThrow(/0x30 参数无效/)
    const negative: SourceCmd[] = [gate(1), { op: 'raw', opcode: 0x30, operands: [17, -1] }, end]
    expect(() => translateCasualtyScript(negative, 0, {})).toThrow(/0x30 参数无效/)
    const badRedraw: SourceCmd[] = [gate(1), { op: 'raw', opcode: 0x05, operands: [0, 1] }, end]
    expect(() => translateCasualtyScript(badRedraw, 0, {})).toThrow(/0x05 参数非空/)
    const unknownOp: SourceCmd[] = [gate(1), { op: 'raw', opcode: 0x99, operands: [] }, end]
    expect(() => translateCasualtyScript(unknownOp, 0, {})).toThrow(/不支持的 opcode 0x99/)
  })

  test('合法 0x30/0x1b/0x1c 效果与 top/narration 风格进入结构化脚本', () => {
    const commands: SourceCmd[] = [
      gate(4),
      { op: 'setDialogStyleTop' },
      line(1),
      { op: 'raw', opcode: 0x30, operands: [17, 30] },
      { op: 'raw', opcode: 0x1b, operands: [] },
      end,
      { op: 'setDialogStyleNarration' },
      line(2),
      { op: 'raw', opcode: 0x1c, operands: [] },
      end,
    ]
    const locale: Record<string, string> = {}
    const script = translateCasualtyScript(commands, 0, locale)
    expect(script.gates[0]!.branch.effects).toEqual([{ kind: 'heal', resource: 'hp' }])
    expect(script.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 30 },
      { kind: 'heal', resource: 'hp' },
    ])
    expect(script.gates[0]!.branch.lines).toEqual([])
    expect(script.fallback.lines[0]).toEqual({ text: 'dlg.1', style: 'top' })
    expect(locale).toEqual({ 'dlg.1': 't' })
  })

  test('applyPalCasualtyOverlays：入口缺失 / 角色缺 battler / locale 键漂移 逐轴拒绝', () => {
    expect(() => applyPalCasualtyOverlays([], [{ op: 'end' }], [])).toThrow(
      'B11-1 casualty: 期望角色 0 friendDeath 入口缺失',
    )
    const npc = { id: 'npc', name: 'n', spriteId: 's' }
    expect(() => applyPalCasualtyOverlays([npc], [{ op: 'end' }], [{ scriptOnFriendDeath: 0, scriptOnDying: 0 }])).toThrow(
      'B11-1 casualty: 期望角色 0 friendDeath 入口缺失',
    )
  })
})

describe('O05 buildPalItemMessageSources / translate*：窄消息形状漂移', () => {
  const usableItem = (id: number, scriptOnUse: number): SourceItem => ({
    id,
    _name: `物品${id}`,
    bitmap: 1,
    price: 0,
    scriptOnUse,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  })
  const narration = (text: string): SourceCmd => ({ op: 'showDialog', text })
  const craftBlock = (start: number): SourceCmd[] => [
    { op: 'raw', opcode: 0x20, operands: [117, 1, start + 5] },
    { op: 'goto', to: `L_${start + 5}` },
    { op: 'setDialogStyleNarration' },
    narration('炼蛊的材料不足'),
    end,
    { label: `L_${start + 5}`, op: 'giveItem', itemId: 148, count: 1 },
  ]

  test('Store0 数量 ≠1 / item 定义缺失或不可用 → fail-loud', () => {
    const commands = craftBlock(0)
    expect(() =>
      buildPalItemMessageSources([usableItem(268, 0)], commands, [
        { id: 0, items: [100] },
        { id: 0, items: [100] },
      ]),
    ).toThrow('PAL 窄物品提示源: Store0 数量 2 != 1')
    expect(() =>
      buildPalItemMessageSources([], commands, [{ id: 0, items: [100] }]),
    ).toThrow('PAL 窄物品提示源: item268 缺唯一可用定义')
    const unusable = { ...usableItem(268, 0), flags: { ...usableItem(268, 0).flags, usable: false } }
    expect(() =>
      buildPalItemMessageSources([unusable], commands, [{ id: 0, items: [100] }]),
    ).toThrow('PAL 窄物品提示源: item268 缺唯一可用定义')
  })

  test('显式 label 与数组地址不一致 → label 索引拒绝', () => {
    expect(() => buildSourceAddressLabelIndex([{ label: 'L_9', op: 'end' }])).toThrow(
      /all\.json 显式 label 与数组地址不一致: index=0, label=L_9/,
    )
  })

  test('craft 形状漂移：itemId 非法 / 失败块缺失 / 产物缺失 逐轴返回 undefined', () => {
    const labelIndex = buildSourceAddressLabelIndex([])
    expect(translateCraftRecipeScript([], labelIndex, 0)).toBeUndefined()
    const badItem: SourceCmd[] = [
      { op: 'raw', opcode: 0x20, operands: [0, 1, 5] },
      { op: 'setDialogStyleNarration' },
      narration('x'),
      end,
      { label: 'L_4', op: 'giveItem', itemId: 1, count: 1 },
    ]
    expect(translateCraftRecipeScript(badItem, buildSourceAddressLabelIndex(badItem), 0)).toBeUndefined()
    const noProduct: SourceCmd[] = [
      { op: 'raw', opcode: 0x20, operands: [117, 1, 2] },
      { op: 'setDialogStyleNarration' },
      narration('x'),
      end,
    ]
    expect(translateCraftRecipeScript(noProduct, buildSourceAddressLabelIndex(noProduct), 0)).toBeUndefined()
  })

  test('pool 形状漂移：0x34 缺 end / 失败地址非法 / 失败块非旁白 逐轴返回 undefined', () => {
    const labelIndex = buildSourceAddressLabelIndex([])
    expect(translateResourcePoolScript([], labelIndex, 0, [100])).toBeUndefined()
    const noEnd: SourceCmd[] = [{ op: 'raw', opcode: 0x34, operands: [2] }]
    expect(translateResourcePoolScript(noEnd, buildSourceAddressLabelIndex(noEnd), 0, [100])).toBeUndefined()
    const badFail: SourceCmd[] = [
      { op: 'raw', opcode: 0x34, operands: [0] },
      end,
    ]
    expect(translateResourcePoolScript(badFail, buildSourceAddressLabelIndex(badFail), 0, [100])).toBeUndefined()
    const badBlock: SourceCmd[] = [
      { op: 'raw', opcode: 0x34, operands: [2] },
      end,
      { op: 'setDialogStyleTop' },
      narration('x'),
      end,
    ]
    expect(translateResourcePoolScript(badBlock, buildSourceAddressLabelIndex(badBlock), 0, [100])).toBeUndefined()
  })

  test('applyPalItemMessageSources：current 缺用途 → fail-loud', () => {
    const sources = [{ id: '268', effect: {
      kind: 'craftRecipe',
      recipes: [{ ingredients: [{ itemId: '117', count: 1 }], products: [{ itemId: '148', count: 1 }] }],
      unavailableMessage: '缺材料',
    } as const }]
    expect(() => applyPalItemMessageSources([item('268')], sources)).toThrow(
      'PAL 窄物品提示源: current 缺物品 268 用途',
    )
  })
})

describe('O05 assertPalStoreBoundaryInvariant / Alchemy：边界轴', () => {
  const sourceStores: SourceStore[] = [
    { id: 0, items: [100, 105, 95, 112, 72, 131, 97, 102, 111] },
    ...Array.from({ length: 20 }, (_v, i) => ({ id: i + 1, items: [141] })),
  ]
  const gourd = item('270', {
    use: {
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 9,
          rewards: [100, 105, 95, 112, 72, 131, 97, 102, 111].map((id) => ({ itemId: String(id), count: 1 })),
          unavailableMessage: '无任何效果',
        },
      ],
    },
  })
  const vessel = item('268', {
    use: {
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'craftRecipe',
          recipes: [117, 118, 119, 120, 121].map((id) => ({
            ingredients: [{ itemId: String(id), count: 1 }],
            products: [{ itemId: '148', count: 1 }],
          })),
          unavailableMessage: '炼蛊的材料不足',
        },
      ],
    },
  })
  const rewardItems = () => [
    item('100'),
    item('105'),
    item('95'),
    item('112'),
    item('72'),
    item('131'),
    item('97'),
    item('102'),
    item('111'),
  ]
  const legalItems = () => [gourd, vessel, ...rewardItems()]
  const openShop = (shop: number, mode: 'buy' | 'sell') => ({ kind: 'openShop', shop, mode })

  test('alchemy 正控通过并校验 112/72 buyPrice=0 合同', () => {
    const items = legalItems().map((entry) =>
      entry.id === '112' || entry.id === '72' ? { ...entry, buyPrice: 0 } : entry,
    )
    expect(() => assertPalAlchemyBoundaryInvariant({ sourceStores, items })).not.toThrow()
    const badPrice = items.map((entry) => (entry.id === '112' ? { ...entry, buyPrice: 5 } : entry))
    expect(() => assertPalAlchemyBoundaryInvariant({ sourceStores, items: badPrice })).toThrow(
      'PAL Store0 invariant: 试炼果/舍利子原始 buyPrice 应保持 0',
    )
  })

  test('源 Store0 数量/零奖励 轴拒绝', () => {
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores: sourceStores.filter(({ id }) => id !== 0), items: legalItems() }),
    ).toThrow('PAL Store0 invariant: 源 Store0 数量 0 != 1')
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: [{ id: 0, items: [0] }],
        items: legalItems(),
      }),
    ).toThrow('PAL Store0 invariant: 源 Store0 奖励不得为 0')
  })

  test('item268/270 结构漂移轴（recipes 桶、消息、资源池数量）逐轴拒绝', () => {
    const items = legalItems()
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores, items: items.filter(({ id }) => id !== '268') }),
    ).toThrow('PAL Store0 invariant: 缺物品 268')
    const brokenGourd = items.map((entry) =>
      entry.id === '270'
        ? { ...entry, use: { ...entry.use!, effects: [{ ...entry.use!.effects[0]!, maxRoll: 8 }] } }
        : entry,
    )
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores, items: brokenGourd }),
    ).toThrow('PAL Store0 invariant: item270 奖励档位漂移')
    const brokenVessel = items.map((entry) =>
      entry.id === '268'
        ? { ...entry, use: { ...entry.use!, effects: [{ ...entry.use!.effects[0]!, unavailableMessage: '错' }] } }
        : entry,
    )
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores, items: brokenVessel }),
    ).toThrow('PAL Store0 invariant: item268 unavailableMessage=错')
  })

  test('发布商店：ShopDef0 / 源 id 顺序 / 货单一致性 逐轴拒绝', () => {
    const shops = (fn: (list: Array<{ id: number; items: string[] }>) => Array<{ id: number; items: string[] }>) =>
      fn(Array.from({ length: 20 }, (_v, i) => ({ id: i + 1, items: ['141'] })))
    const census = { expectedBuyCalls: 0 }
    expect(() =>
      assertPalStoreBoundaryInvariant({
        sourceStores,
        shops: shops((list) => [{ id: 0, items: [] }, ...list.slice(1)]),
        items: legalItems(),
        commandRoots: [],
      }),
    ).toThrow('PAL Store0 invariant: 禁止发布 ShopDef0')
    expect(() =>
      assertPalStoreBoundaryInvariant({
        sourceStores,
        shops: shops((list) => list.slice(1)),
        items: legalItems(),
        commandRoots: [],
      }),
    ).toThrow(/真实商店 id\/顺序漂移/)
    expect(() =>
      assertPalStoreBoundaryInvariant({
        sourceStores,
        shops: shops((list) => list.map((shop) => (shop.id === 1 ? { ...shop, items: ['999'] } : shop))),
        items: legalItems(),
        commandRoots: [],
      }),
    ).toThrow('PAL Store0 invariant: 生成商店 1 货单与源不一致')
    void census
  })

  test('openShop census：shop 非整数 / mode 非法 / buy 未知商店 / sell 商店非 0 逐轴拒绝', () => {
    const base = { sourceStores, shops: Array.from({ length: 20 }, (_v, i) => ({ id: i + 1, items: ['141'] })), items: legalItems() }
    expect(() =>
      assertPalStoreBoundaryInvariant({ ...base, commandRoots: [[{ kind: 'openShop', shop: 1.5, mode: 'buy' }]] }),
    ).toThrow('PAL Store0 invariant: openShop.shop 非整数 1.5')
    expect(() =>
      assertPalStoreBoundaryInvariant({ ...base, commandRoots: [[{ kind: 'openShop', shop: 1, mode: 'steal' }]] }),
    ).toThrow('PAL Store0 invariant: openShop.mode 非法 steal')
    expect(() =>
      assertPalStoreBoundaryInvariant({ ...base, commandRoots: [[openShop(99, 'buy')]], expectedBuyCalls: 1 }),
    ).toThrow('PAL Store0 invariant: buy openShop 引用未知商店 99')
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...base,
        commandRoots: [[openShop(1, 'buy'), openShop(0, 'sell'), openShop(3, 'sell')]],
        expectedBuyCalls: 1,
        expectedSellCalls: 2,
        expectedSellShopId: 0,
      }),
    ).toThrow('PAL Store0 invariant: sell shop 应为 0，收到 3')
  })

  test('buy/sell 数量期望不符 → 精确数量诊断（嵌套数组递归）', () => {
    const base = { sourceStores, shops: Array.from({ length: 20 }, (_v, i) => ({ id: i + 1, items: ['141'] })), items: legalItems() }
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...base,
        commandRoots: [{ nested: [[openShop(1, 'buy')], [openShop(2, 'buy')]] }],
        expectedBuyCalls: 1,
      }),
    ).toThrow('PAL Store0 invariant: buy openShop 数量 2 != 1')
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...base,
        commandRoots: [[openShop(0, 'sell')]],
        expectedSellCalls: 2,
      }),
    ).toThrow('PAL Store0 invariant: sell openShop 数量 1 != 2')
  })
})
