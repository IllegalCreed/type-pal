import type { WorldItemUseOutcome } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/deferred.js'
import { menuFixture, settle } from '../__tests__/menu-session-fixture.js'
import { executeWorldItemUse } from '../item-use-executor.js'
import { CLOSED } from '../menu-state.js'
import type { UseExecutionRequest } from '../use-menu-state.js'

afterEach(() => vi.restoreAllMocks())

test('closed menu ignores input; independent sessions retain independent panel and cursor state', () => {
  const a = menuFixture(),
    b = menuFixture()
  a.press('Enter', 'Escape')
  expect(a.ports.readWorld).not.toHaveBeenCalled()
  expect(a.menus.closed).toBe(true)
  a.openPanel('magic')
  expect(a.menus.view.magicMenu.phase).toBe('pick-caster')
  expect(b.menus.view.menu).toBe(CLOSED)
  a.menus.close()
  a.menus.open()
  expect(a.menus.view.menu.stack[0]?.cursor).toBe(1)
  expect(a.menus.view.menu.openPanel).toBeUndefined()
  b.menus.open()
  expect(b.menus.view.menu.stack[0]?.cursor).toBe(0)
})

test('status traverses live party and returns to hub; navigation aliases preserve selected panel', () => {
  const h = menuFixture()
  h.openPanel('status')
  h.press('ArrowDown')
  expect(h.menus.view.statusIdx).toBe(1)
  h.press('ArrowLeft')
  expect(h.menus.view.statusIdx).toBe(0)
  h.press('ArrowUp')
  expect(h.menus.view.menu.openPanel).toBeUndefined()
  h.press('ArrowRight', 'Enter')
  expect(h.menus.view.menu.openPanel).toBe('magic')
  h.press('Escape', 'ArrowLeft', 'Enter', 'Enter', 'Enter')
  expect(h.menus.view.menu.openPanel).toBeUndefined()
  h.press('Enter', 'Escape')
  expect(h.menus.active).toBe(true)
})

test('magic reads the current world instead of a startup snapshot and remembers the confirmed caster', () => {
  const h = menuFixture()
  h.openPanel('magic')
  h.press('ArrowDown', 'Enter')
  expect(h.menus.view.magicMenu.casterIdx).toBe(1)
  const latest = structuredClone(h.world)
  latest.party[0]!.hp = 10
  latest.party[1]!.mp = 5
  h.ports.replaceWorld(latest)
  h.press('Enter', 'ArrowUp', 'Enter')
  expect(h.world.party.map(({ hp, mp }) => ({ hp, mp }))).toEqual([
    { hp: 20, mp: 20 },
    { hp: 60, mp: 0 },
  ])
  expect(h.menus.view.magicMenu.phase).toBe('pick-spell')
  h.press('Escape', 'Enter')
  expect(h.menus.view.magicMenu.casterIdx).toBe(1)
})

test('equipment lists a teammate-only weapon and commits only to the eligible selected member', () => {
  const h = menuFixture()
  const sword = h.items.sword
  if (!sword?.equip) throw new Error('fixture weapon missing')
  const equip = { ...sword.equip, equipableBy: ['b'] }
  h.items.sword = { ...sword, equip }
  h.items['old-sword'] = { ...sword, equip, id: 'old-sword', name: 'Old Sword' }
  const starting = structuredClone(h.world)
  starting.party[1]!.equipment.weapon = 'old-sword'
  const before = structuredClone(starting)
  h.ports.replaceWorld(starting)
  h.ports.replaceWorld.mockClear()

  h.openPanel('equip')
  expect(h.menus.view.equipMenu.items.map(({ id }) => id)).toEqual(['sword'])
  h.press('Enter', 'Enter')
  expect(h.menus.view.equipMenu).toMatchObject({
    phase: 'pick-role',
    casterId: 'a',
    selectedItemId: 'sword',
  })
  expect(h.ports.replaceWorld).not.toHaveBeenCalled()
  expect(h.world).toEqual(before)

  h.press('ArrowUp', 'Enter')
  expect(h.world.party.map(({ equipment }) => equipment.weapon)).toEqual([undefined, 'sword'])
  expect(h.world.inventory).toEqual([
    { itemId: 'tonic', count: 2 },
    { itemId: 'old-sword', count: 1 },
  ])
  expect(h.ports.replaceWorld).toHaveBeenCalledTimes(1)
  expect(h.menus.view.equipMenu).toMatchObject({
    phase: 'pick-role',
    casterId: 'b',
    selectedItemId: 'old-sword',
  })
  h.press('Escape', 'Enter')
  expect(h.menus.view.equipMenu).toMatchObject({
    phase: 'pick-role',
    casterId: 'a',
    selectedItemId: 'old-sword',
  })
})

test.each([
  'music',
  'sound',
] as const)('system %s commits only on confirm; cancel preserves preferences and remembered cursor', (kind) => {
  const h = menuFixture()
  h.openPanel('system')
  for (let i = 0; i < (kind === 'music' ? 2 : 3); i++) h.press('ArrowDown')
  h.press('Enter', 'ArrowUp', 'Escape')
  expect(h.context.audio).toEqual({ music: true, sound: true })
  expect(h.ports.setAudioPreference).not.toHaveBeenCalled()
  expect(h.menus.view.menu.openPanel).toBeUndefined()
  h.press('Enter')
  expect(h.menus.view.systemMenu.cursor).toBe(kind === 'music' ? 2 : 3)
  h.press('Enter', 'ArrowLeft', 'Enter')
  expect(h.ports.setAudioPreference).toHaveBeenCalledExactlyOnceWith(kind, false)
  expect(h.context.audio[kind]).toBe(false)
  expect(h.menus.view.menu.openPanel).toBeUndefined()
})

test('quit default no and Escape remain in hub; explicit yes calls only the navigation port', () => {
  const h = menuFixture()
  h.openPanel('system')
  h.press('ArrowUp', 'Enter', 'Enter')
  expect(h.ports.quit).not.toHaveBeenCalled()
  expect(h.menus.view.menu.openPanel).toBeUndefined()
  h.press('Enter', 'Enter', 'ArrowRight', 'Escape')
  expect(h.ports.quit).not.toHaveBeenCalled()
  h.press('Enter', 'Enter', 'ArrowDown', 'Enter')
  expect(h.ports.quit).toHaveBeenCalledOnce()
})

test('save browser owns input over system menu and overwrite requires explicit yes', async () => {
  const h = menuFixture()
  h.openPanel('system')
  h.press('Enter')
  expect(h.menus.view.saveBrowser.cursor).toBe(2)
  h.press('Enter')
  expect(h.menus.view.saveBrowser.confirmOverwrite).toBe(true)
  h.press('Enter')
  expect(h.ports.writeSlot).not.toHaveBeenCalled()
  h.press('Enter', 'ArrowRight', 'Escape')
  expect(h.ports.writeSlot).not.toHaveBeenCalled()
  h.press('Enter', 'ArrowLeft', 'Enter')
  await settle()
  expect(h.ports.writeSlot).toHaveBeenCalledExactlyOnceWith('m01')
  expect(h.menus.view.overwriteYes).toBe(false)
  h.press('ArrowDown', 'Enter')
  await settle()
  expect(h.ports.writeSlot).toHaveBeenLastCalledWith('m02')
  h.press('Escape')
  expect(h.menus.view.saveBrowser.active).toBe(false)
  expect(h.menus.view.menu.openPanel).toBe('system')
})

test('refresh updates metadata without moving the cursor or resetting an overwrite prompt', () => {
  const h = menuFixture()
  h.context.lastSlot = ''
  h.openPanel('system')
  h.press('Enter', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp')
  expect(h.menus.view.saveBrowser.cursor).toBe(0)
  h.press('Enter') // Auto slot cannot be manually written.
  expect(h.ports.writeSlot).not.toHaveBeenCalled()
  h.press('ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight')
  expect(h.menus.view.saveBrowser.confirmOverwrite).toBe(true)
  expect(h.menus.view.overwriteYes).toBe(true)
  const meta = { ...h.context.metas[0]!, savedAt: 200 }
  h.menus.refreshSaveBrowser([meta])
  expect(h.menus.view.saveBrowser).toMatchObject({
    mode: 'save',
    cursor: 2,
    confirmOverwrite: true,
  })
  expect(h.menus.view.saveBrowser.metas[2]).toEqual(meta)
  expect(h.menus.view.overwriteYes).toBe(true)

  h.menus.close()
  h.menus.refreshSaveBrowser([meta])
  expect(h.menus.active).toBe(false)
  expect(h.menus.view.saveBrowser.active).toBe(false)
})

test('save write rejection is reported through the existing failure port without closing the browser', async () => {
  const h = menuFixture(),
    failure = new Error('disk failed')
  h.ports.writeSlot.mockRejectedValue(failure)
  h.context.metas = []
  h.openPanel('system')
  h.press('Enter', 'Enter')
  await settle()
  expect(h.ports.reportSaveFailure).toHaveBeenCalledExactlyOnceWith(failure)
  expect(h.menus.view.saveBrowser.active).toBe(true)
})

test('load request rejection remains visible; successful close is owned by the storage completion callback', async () => {
  const h = menuFixture()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  h.ports.loadSlot.mockRejectedValueOnce(new Error('read failed'))
  h.openPanel('system')
  h.press('ArrowDown', 'Enter', 'Enter')
  await settle()
  expect(h.ports.loadSlot).toHaveBeenCalledExactlyOnceWith('m01')
  expect(h.ports.showToast).toHaveBeenCalledExactlyOnceWith('读档失败')
  expect(h.menus.active).toBe(true)
  expect(h.menus.view.saveBrowser.active).toBe(true)
  h.ports.loadSlot.mockImplementation(async () => {
    h.menus.close()
  })
  h.press('Enter')
  await settle()
  expect(h.menus.closed).toBe(true)
})

test('system cancellation returns to hub and repeated item execution preserves exact real effects', async () => {
  const h = menuFixture(),
    original = structuredClone(h.world)
  h.openPanel('use')
  h.press('Enter', 'Enter')
  await settle()
  const expected = structuredClone(original)
  expected.party[0]!.hp += 10
  expected.inventory[0]!.count -= 1
  expect(h.world).toEqual(expected)
  expect(h.menus.view.useMenu.phase).toBe('pick-target')
  h.press('Enter')
  await settle()
  expect(h.world.inventory).toEqual([{ itemId: 'sword', count: 1 }])
  expect(h.menus.view.useMenu.phase).toBe('pick-item')
  h.press('Escape', 'Escape', 'ArrowDown', 'Enter', 'Escape')
  expect(h.menus.view.menu.openPanel).toBeUndefined()
})

test('item target selection wraps, survives reopening, and sends both uses to the chosen ally', async () => {
  const h = menuFixture()
  h.openPanel('use')
  h.press('Enter', 'ArrowLeft', 'Escape', 'Enter', 'Enter')
  await settle()
  expect(h.world.party.map(({ hp }) => hp)).toEqual([60, 70])
  expect(h.menus.view.useMenu.phase).toBe('pick-target')
  h.press('Enter')
  await settle()
  expect(h.world.party.map(({ hp }) => hp)).toEqual([60, 80])
  expect(h.world.inventory).toEqual([{ itemId: 'sword', count: 1 }])
  expect(h.menus.view.useMenu.phase).toBe('pick-item')
})

const failures: [WorldItemUseOutcome['reason'], string][] = [
  ['not-owned', '物品已经不在背包或装备中'],
  ['missing-target', '没有可作用的目标'],
  ['wrong-context', '这个物品不能在大世界使用'],
  ['gate-failed', '没有产生效果'],
  ['missing-materials', '材料不足'],
  ['empty-resource-pool', '当前没有可用资源'],
  ['external-unavailable', '当前场景无法执行这个用途'],
  ['invalid-effect-chain', '物品用途配置不完整'],
  ['unknown-item', '现在无法使用这个物品'],
]
test.each(
  failures,
)('item outcome %s keeps the exact menu request and reports its stable message', async (reason, text) => {
  const h = menuFixture(),
    before = structuredClone(h.world)
  h.ports.executeItemUse.mockResolvedValue({
    status: 'failure',
    world: h.world,
    consumed: false,
    changed: false,
    effectResults: [],
    presentations: [],
    reason,
    menu: 'keep',
  })
  h.openPanel('use')
  h.press('Enter')
  const menu = h.menus.view.menu,
    use = h.menus.view.useMenu
  h.press('Enter')
  expect(h.menus.closed).toBe(true)
  await settle()
  expect(h.menus.view.menu).toBe(menu)
  expect(h.menus.view.useMenu).toBe(use)
  expect(h.world).toEqual(before)
  expect(h.ports.showToast).toHaveBeenCalledExactlyOnceWith(text)
  expect(h.ports.report).toHaveBeenCalledExactlyOnceWith(`itemUse(tonic): ${text}`)
})

test('blocked placement shows a world notice and returns to exploration with the item', async () => {
  const h = menuFixture()
  const gate = deferred<void>()
  const inventory = structuredClone(h.world.inventory)
  const message = '此处无法放置'
  h.items.tonic!.use = {
    target: 'scene',
    consuming: true,
    menuAfterUse: 'close',
    effects: [
      {
        kind: 'placeEntityInFront',
        target: { scene: 'room', entity: 'trap' },
        state: 2,
        unavailableMessage: message,
      },
    ],
  }
  const placement = vi.fn(async () => false)
  h.ports.executeItemUse.mockImplementation((request, signal) =>
    executeWorldItemUse({
      world: h.world,
      itemId: request.itemId,
      targetCharId: request.targetCharId,
      items: h.items,
      host: {
        currentWorld: () => h.world,
        runScript: vi.fn(async () => undefined),
        runSceneHook: vi.fn(async () => false),
        placeEntityInFront: placement,
      },
      signal,
    }),
  )
  h.ports.presentPlacementFailure.mockReturnValue(gate.promise)
  h.openPanel('use')
  h.press('Enter')
  await settle()
  try {
    expect(placement).toHaveBeenCalledOnce()
    expect(h.ports.presentPlacementFailure).toHaveBeenCalledExactlyOnceWith(
      message,
      h.ports.executeItemUse.mock.calls[0]?.[1],
    )
    expect(h.ports.showToast).not.toHaveBeenCalled()
    expect(h.menus.closed).toBe(true)
    expect(h.operation.pending).toBe(true)
  } finally {
    gate.resolve()
    await settle()
  }
  expect(h.menus.closed).toBe(true)
  expect(h.operation.pending).toBe(false)
  expect(h.world.inventory).toEqual(inventory)
})

test('custom item message is retained and unexpected executor failure restores the original menu', async () => {
  const h = menuFixture(),
    failure = new Error('executor failed')
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  h.ports.executeItemUse
    .mockResolvedValueOnce({
      status: 'failure',
      world: h.world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'gate-failed',
      message: 'custom reason',
      menu: 'keep',
    })
    .mockRejectedValueOnce(failure)
  h.openPanel('use')
  h.press('Enter')
  const menu = h.menus.view.menu,
    use = h.menus.view.useMenu
  h.press('Enter')
  await settle()
  expect(h.ports.showToast).toHaveBeenLastCalledWith('custom reason')
  h.press('Enter')
  await settle()
  expect(error).toHaveBeenCalledWith('[item-use]', 'tonic', failure)
  expect(h.ports.showToast).toHaveBeenLastCalledWith('物品用途执行失败，请检查脚本或配置')
  expect(h.menus.view.menu).toBe(menu)
  expect(h.menus.view.useMenu).toBe(use)
  expect(h.operation.pending).toBe(false)
})

test('in-flight item hides the menu, rejects duplicate input and consumes its own cancellation before reuse', async () => {
  const h = menuFixture(),
    gate = deferred<WorldItemUseOutcome>(),
    before = structuredClone(h.world)
  let signal: AbortSignal | undefined
  h.ports.executeItemUse.mockImplementationOnce(async (_request, current) => {
    signal = current
    return gate.promise
  })
  h.openPanel('use')
  h.press('Enter', 'Enter')
  try {
    expect(h.menus.closed).toBe(true)
    expect(h.operation.pending).toBe(true)
    h.press('Enter')
    expect(h.ports.executeItemUse).toHaveBeenCalledOnce()
    h.operation.cancel()
    expect(signal?.aborted).toBe(true)
    const contaminated = structuredClone(before)
    contaminated.money = 999
    gate.resolve({
      status: 'success',
      world: contaminated,
      consumed: true,
      changed: true,
      effectResults: [],
      presentations: [],
      menu: 'keep',
    })
    await settle()
    expect(h.world).toEqual(before)
    expect(h.menus.closed).toBe(true)
    expect(h.operation.pending).toBe(false)
    h.menus.open()
    h.press('Enter', 'ArrowDown', 'Enter', 'Enter', 'Enter')
    await settle()
    expect(h.ports.executeItemUse).toHaveBeenCalledTimes(2)
    expect(h.ports.executeItemUse.mock.calls[1]?.[1]).not.toBe(signal)
  } finally {
    gate.reject(new DOMException('cancelled', 'AbortError'))
    await gate.promise.catch(() => undefined)
    await settle()
  }
})

test('item result presentation retains ownership until settled; AbortError never restores the old menu', async () => {
  const h = menuFixture(),
    gate = deferred<void>()
  h.items.tonic!.use!.sound = 'item-sound'
  const result: WorldItemUseOutcome = {
    status: 'success',
    world: h.world,
    consumed: true,
    changed: true,
    effectResults: [],
    presentations: [
      { kind: 'item-result', source: 'craftRecipe', items: [{ itemId: 'sword', count: 1 }] },
    ],
    menu: 'keep',
  }
  h.ports.executeItemUse.mockResolvedValue(result)
  h.ports.presentItemResults.mockImplementation(async (_entries, signal) => {
    await gate.promise
    signal.throwIfAborted()
  })
  h.openPanel('use')
  h.press('Enter', 'Enter')
  await settle()
  try {
    expect(h.ports.playSound).toHaveBeenCalledExactlyOnceWith('item-sound')
    expect(h.ports.presentItemResults).toHaveBeenCalledOnce()
    expect(h.menus.closed).toBe(true)
    expect(h.operation.pending).toBe(true)
    h.operation.cancel()
    gate.resolve()
    await settle()
    expect(h.menus.closed).toBe(true)
    expect(h.operation.pending).toBe(false)
    expect(h.ports.showToast).not.toHaveBeenCalled()
  } finally {
    gate.resolve()
    await gate.promise
    await settle()
  }
})

test('late item IO failure cannot reopen the menu after its operation is cancelled', async () => {
  const h = menuFixture()
  const gate = deferred<WorldItemUseOutcome>()
  h.ports.executeItemUse.mockImplementationOnce(async () => gate.promise)
  h.openPanel('use')
  h.press('Enter', 'Enter')
  expect(h.operation.pending).toBe(true)
  const signal = h.ports.executeItemUse.mock.calls[0]?.[1]
  try {
    h.operation.cancel()
    expect(signal?.aborted).toBe(true)
    expect(h.operation.pending).toBe(true)
    gate.reject(new Error('resource read failed after cancellation'))
    await vi.waitFor(() => expect(h.operation.pending).toBe(false))
    expect(h.menus.closed).toBe(true)
    expect(h.ports.showToast).not.toHaveBeenCalled()
    expect(h.ports.replaceWorld).not.toHaveBeenCalled()
  } finally {
    h.operation.cancel()
    gate.reject(new Error('release test gate'))
    await gate.promise.catch(() => undefined)
    await vi.waitFor(() => expect(h.operation.pending).toBe(false))
  }
})

test('scene-changing item result closes the old menu even when executor requested keep', async () => {
  const h = menuFixture()
  let captured: UseExecutionRequest | undefined
  h.ports.executeItemUse.mockImplementation(async (request) => {
    captured = request
    h.context.sceneId = 'other'
    return {
      status: 'success',
      world: h.world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      menu: 'keep',
    }
  })
  h.openPanel('use')
  h.press('Enter', 'Enter')
  await settle()
  expect(captured?.itemId).toBe('tonic')
  expect(h.menus.closed).toBe(true)
  expect(h.operation.pending).toBe(false)
})
