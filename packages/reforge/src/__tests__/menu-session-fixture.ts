import {
  type ActorDef,
  buildWorld,
  type ItemDataMap,
  resolveWorldItemUse,
  type SkillDataMap,
  validateActors,
  validateItems,
  validateSkills,
  type WorldItemUseOutcome,
} from '@type-pal/content'
import { vi } from 'vitest'
import { ItemUseSession } from '../menu/item-use-session.js'
import { type MenuPorts, MenuSession } from '../menu/menu-session.js'
import type { SaveMeta } from '../save/types.js'
import type { UseExecutionRequest } from '../use-menu-state.js'

export function menuFixture() {
  const actors: ActorDef[] = ['a', 'b'].map((id) => ({
    id,
    name: id,
    spriteId: 'walker',
    battler: {
      baseStats: {
        level: 1,
        hp: 60,
        maxHP: 100,
        mp: 20,
        maxMP: 40,
        attack: 10,
        defense: 10,
        magicAttack: 10,
        speed: 10,
        luck: 10,
      },
      initialEquipment: {},
      initialMagic: ['heal'],
      battleSprite: 'fighter',
    },
  }))
  const items: ItemDataMap = {
    tonic: {
      id: 'tonic',
      name: 'Tonic',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
    },
    sword: {
      id: 'sword',
      name: 'Sword',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy: ['a', 'b'],
        effects: [{ kind: 'statBonus', stat: 'attack', delta: 5 }],
      },
    },
  }
  const skills: SkillDataMap = {
    heal: {
      id: 'heal',
      name: 'Heal',
      desc: '',
      cost: { mp: 5 },
      usableOutsideBattle: true,
      target: 'oneAlly',
      effects: [{ kind: 'healHp', amount: 10 }],
      animation: { effectSprite: 65535 },
    },
  }
  validateActors(actors)
  validateItems(Object.values(items))
  validateSkills({ skills: Object.values(skills), levelUp: {} })
  let world = buildWorld(
    {
      party: ['a', 'b'],
      money: 20,
      inventory: [
        { itemId: 'tonic', count: 2 },
        { itemId: 'sword', count: 1 },
      ],
    },
    Object.fromEntries(actors.map((actor) => [actor.id, actor])),
  )
  const operation = new ItemUseSession()
  const meta: SaveMeta = {
    slotId: 'm01',
    kind: 'manual',
    party: [{ name: 'A', level: 1 }],
    mapName: 'Room',
    savedAt: 100,
  }
  const context = {
    sceneId: 'room',
    audio: { music: true, sound: true },
    metas: [meta],
    lastSlot: 'm01',
  }
  const ports = {
    readWorld: vi.fn(() => world),
    replaceWorld: vi.fn((next: typeof world) => {
      world = next
    }),
    sceneId: () => context.sceneId,
    executeItemUse: vi.fn(
      async (request: UseExecutionRequest, _signal: AbortSignal): Promise<WorldItemUseOutcome> =>
        resolveWorldItemUse(world, request.targetCharId, request.itemId, items),
    ),
    playSound: vi.fn<MenuPorts['playSound']>(),
    presentItemResults: vi.fn<MenuPorts['presentItemResults']>(async () => undefined),
    showToast: vi.fn<MenuPorts['showToast']>(),
    report: vi.fn<MenuPorts['report']>(),
    audioPreferences: () => context.audio,
    setAudioPreference: vi.fn((kind: 'music' | 'sound', on: boolean) => {
      context.audio[kind] = on
    }),
    saveMetadata: () => context.metas,
    lastSaveSlot: () => context.lastSlot,
    writeSlot: vi.fn(async (_slot: string) => undefined),
    loadSlot: vi.fn(async (_slot: string) => undefined),
    reportSaveFailure: vi.fn(),
    quit: vi.fn(),
  } satisfies MenuPorts
  const menus = new MenuSession({ items, skills, poisonsById: {} }, ports, operation)
  const press = (...keys: string[]) => {
    for (const key of keys) menus.input(new Set([key]))
  }
  function openPanel(panel: 'status' | 'magic' | 'equip' | 'use' | 'system') {
    menus.open()
    // Public navigation only; each fixture starts at the status row.
    const down = panel === 'status' ? 0 : panel === 'magic' ? 1 : panel === 'system' ? 3 : 2
    for (let i = 0; i < down; i++) press('ArrowDown')
    press('Enter')
    if (panel === 'equip' || panel === 'use') {
      if (panel === 'use') press('ArrowDown')
      press('Enter')
    }
  }
  return {
    menus,
    operation,
    ports,
    context,
    items,
    skills,
    press,
    openPanel,
    get world() {
      return world
    },
  }
}

export async function settle() {
  for (let i = 0; i < 16; i++) await Promise.resolve()
}
export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
