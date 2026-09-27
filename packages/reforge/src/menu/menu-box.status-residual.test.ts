import type {
  ActorDef,
  CharacterInstance,
  ItemDataMap,
  PoisonDef,
  WorldState,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { confirm, moveCursor, openMenu } from '../menu-state.js'
import type { ProjectImageCache } from '../project-image-cache.js'
import type { GlyphTable } from '../text/glyph.js'
import { type MenuAssets, MenuBox } from './menu-box.js'

const textCalls = vi.hoisted(() => vi.fn((..._args: unknown[]) => 0))
vi.mock('../text/text-render.js', async (original) => ({
  ...(await original<typeof import('../text/text-render.js')>()),
  renderSpans: (...args: unknown[]) => textCalls(...args),
}))

const image = (id: string, width = 8, height = 8): ImageBitmap =>
  ({ id, width, height, close() {} }) as ImageBitmap

function host() {
  const tile = image('tile')
  const tiles = { tiles: Array.from({ length: 9 }, () => tile) }
  const ringIcon = image('ring-icon', 12, 12)
  const assets: MenuAssets = {
    box: tiles,
    statusBg: image('status-background', 320, 200),
    equipSlot: image('equip-slot', 34, 34),
    scroll: tiles,
    nums: Array.from({ length: 10 }, (_, index) => image(`number-${index}`)),
    avatar: image('fallback-avatar', 32, 40),
    numsBlue: Array.from({ length: 10 }, (_, index) => image(`blue-${index}`)),
    numsCyan: Array.from({ length: 10 }, (_, index) => image(`cyan-${index}`)),
    slash: image('slash'),
    itemIcons: { 'icon-ring': ringIcon },
    redBox: tiles,
    magicPlayerBox: tile,
    cursorGrid: tile,
    cursorUp: tile,
    cursorUpRed: tile,
    cursorDown: tile,
    settleArrow: tile,
    battleIcons: [],
    itembox: tiles,
  }
  const drawImage = vi.fn((..._args: unknown[]) => undefined)
  const ctx = {
    drawImage,
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: true,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  textCalls.mockClear()
  return { assets, ctx, drawImage, glyphs, ringIcon }
}

const items: ItemDataMap = {
  ring: {
    id: 'ring',
    name: '护符',
    desc: [],
    buyPrice: 30,
    sellPrice: 15,
    sellable: true,
    icon: 'icon-ring',
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 2 }],
    },
  },
}

function member(template = 'hero'): CharacterInstance {
  return {
    id: `${template}-instance`,
    template,
    level: 1,
    exp: 3,
    hp: 45,
    maxHP: 100,
    mp: 8,
    maxMP: 40,
    attack: 10,
    defense: 8,
    magicAttack: 12,
    speed: 5,
    luck: 3,
    equipment: template === 'hero' ? { accessory: 'ring' } : {},
    tags: [],
  }
}

function world(party: CharacterInstance[] = [member()]): WorldState {
  return { party, reserve: [], money: 70, inventory: [], learnedSkills: {} }
}

function actor(id: string): ActorDef {
  return {
    id,
    name: `name.${id}`,
    spriteId: 'walker',
    battler: {
      baseStats: {
        level: 1,
        hp: 80,
        maxHP: 100,
        mp: 30,
        maxMP: 40,
        attack: 10,
        defense: 8,
        magicAttack: 12,
        speed: 5,
        luck: 3,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: 'fighter',
      leveling: { expTable: [0, 42] },
    },
  }
}

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, value): [number, number, number] => [
    value,
    value,
    value,
  ]),
  cycles: [],
}

function labels(): Array<{ text: string; color: unknown }> {
  return textCalls.mock.calls.map((call) => ({
    text: (call[1] as Array<{ text: string }>).map((span) => span.text).join(''),
    color: (call[4] as { forceRgba?: unknown }).forceRgba,
  }))
}

afterEach(() => vi.unstubAllGlobals())

describe('当前状态板与级联菜单画面所有权', () => {
  test('状态板按 live 等级阈值、可解毒名与装备效果画数值，不显示不可解毒', () => {
    const { assets, ctx, drawImage, glyphs, ringIcon } = host()
    const c = member()
    c.poisons = [
      { poisonId: 551, tickIndex: 0 },
      { poisonId: 137, tickIndex: 0 },
    ]
    const state = world([c])
    const before = structuredClone(state)
    const poisonsById: Record<number, PoisonDef> = {
      551: { id: 551, name: '赤毒', curability: 'common', color: 5 },
      137: { id: 137, name: '无影毒', curability: 'incurable', color: 7 },
    }
    const box = new MenuBox(glyphs, { 'name.hero': '主角' }, assets, items, {
      actorsById: { hero: actor('hero') },
      poisonsById,
      palette,
    })
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
    expect(drawImage).toHaveBeenCalledWith(assets.statusBg, 0, 0, 320, 200)
    expect(drawImage.mock.calls.some(([bitmap]) => bitmap === assets.avatar)).toBe(true)
    expect(drawImage.mock.calls.some(([bitmap]) => bitmap === ringIcon)).toBe(true)
    expect(labels().map((row) => row.text)).toContain('赤毒')
    expect(labels().map((row) => row.text)).not.toContain('无影毒')
    expect(labels().find((row) => row.text === '赤毒')?.color).toEqual([15, 15, 15])
    expect(labels().map((row) => row.text)).toContain('护符')
    expect(drawImage.mock.calls.some(([bitmap]) => bitmap === assets.numsCyan[4])).toBe(true)
    expect(drawImage.mock.calls.some(([bitmap]) => bitmap === assets.numsCyan[2])).toBe(true)
    expect(state).toEqual(before)
  })

  test('状态页无队员只画底；成员索引越界分别钳到队首与队尾', () => {
    const { assets, ctx, drawImage, glyphs } = host()
    const box = new MenuBox(glyphs, { 'name.hero': '主角', 'name.friend': '同伴' }, assets, items)
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, world([]), 0)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(assets.statusBg, 0, 0, 320, 200)
    expect(labels()).toEqual([])

    const state = world([member('hero'), member('friend')])
    drawImage.mockClear()
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0, -5)
    expect(labels().map((row) => row.text)).toContain('主角')
    textCalls.mockClear()
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0, 99)
    expect(labels().map((row) => row.text)).toContain('同伴')
    expect(labels().map((row) => row.text)).not.toContain('主角')
  })

  test('立绘异步加载时先回落默认图；同 AssetId 就绪后替换且不重复读取', async () => {
    const { assets, ctx, drawImage, glyphs } = host()
    let release!: (value: ImageBitmap) => void
    const pending = new Promise<ImageBitmap>((resolve) => {
      release = resolve
    })
    const load = vi.fn(() => pending)
    const imageCache = { load } as unknown as ProjectImageCache
    const hero = actor('hero')
    hero.portraits = { default: 'portrait.hero' }
    const box = new MenuBox(glyphs, { 'name.hero': '主角' }, assets, items, {
      actorsById: { hero },
      imageCache,
    })
    const state = world()
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
    expect(load).toHaveBeenCalledExactlyOnceWith('portrait.hero', 'portrait')
    expect(drawImage.mock.calls.some(([bitmap]) => bitmap === assets.avatar)).toBe(true)

    const resolved = image('portrait.hero', 40, 50)
    release(resolved)
    await vi.waitFor(() => {
      drawImage.mockClear()
      box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
      expect(drawImage.mock.calls.some(([bitmap]) => bitmap === resolved)).toBe(true)
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('立绘读取失败被记录为当前 AssetId 的稳定错误，不吞掉后续状态页异常', async () => {
    const { assets, ctx, glyphs } = host()
    const failure = new Error('portrait denied')
    const load = vi.fn(async () => {
      throw failure
    })
    const imageCache = { load } as unknown as ProjectImageCache
    const hero = actor('hero')
    hero.portraits = { default: 'portrait.hero' }
    const box = new MenuBox(glyphs, {}, assets, items, {
      actorsById: { hero },
      imageCache,
    })
    const state = world()
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
    await vi.waitFor(() =>
      expect(() => box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)).toThrow(
        failure,
      ),
    )
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('当前外观立绘覆写模板图；非 Error 的读失败也稳定转为带原因的异常', async () => {
    const { assets, ctx, glyphs } = host()
    const load = vi.fn(async () => {
      throw 'portrait missing'
    })
    const hero = actor('hero')
    hero.portraits = { default: 'portrait.template' }
    const state = world()
    state.party[0]!.appearance = { portrait: 'portrait.current' }
    const box = new MenuBox(glyphs, {}, assets, items, {
      actorsById: { hero },
      imageCache: { load } as unknown as ProjectImageCache,
    })
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
    expect(load).toHaveBeenCalledExactlyOnceWith('portrait.current', 'portrait')
    await vi.waitFor(() =>
      expect(() => box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)).toThrow(
        'portrait missing',
      ),
    )
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('毒名过宽另起一行；未知毒与未提供调色板不绘制额外字色', () => {
    const { assets, ctx, glyphs } = host()
    const state = world()
    state.party[0]!.poisons = [
      { poisonId: 11, tickIndex: 0 },
      { poisonId: 12, tickIndex: 0 },
      { poisonId: 13, tickIndex: 0 },
    ]
    const box = new MenuBox(glyphs, {}, assets, items, {
      poisonsById: {
        11: { id: 11, name: '赤毒缠身', curability: 'common', color: 2 },
        12: { id: 12, name: '青毒缠身', curability: 'common', color: 5 },
      },
    })
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, state, 0)
    const first = textCalls.mock.calls.find(
      (call) => (call[1] as Array<{ text: string }>)[0]?.text === '赤毒缠身',
    )
    const second = textCalls.mock.calls.find(
      (call) => (call[1] as Array<{ text: string }>)[0]?.text === '青毒缠身',
    )
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect([first?.[2], first?.[3]]).toEqual([118, 98])
    expect([second?.[2], second?.[3]]).toEqual([118, 116])
    expect((first?.[4] as { forceRgba?: unknown }).forceRgba).toBeUndefined()
    expect(labels().map((row) => row.text)).not.toContain('?13')
  })

  test('装备图标按槽内框等比缩放；目录缺席的已装备 ID 仍留可定位的名称', () => {
    const { assets, ctx, drawImage, glyphs } = host()
    const large = image('wide-icon', 84, 21)
    assets.itemIcons['wide-icon'] = large
    const c = member()
    c.equipment = { head: 'unknown', accessory: 'wide-ring' }
    const box = new MenuBox(glyphs, {}, assets, {
      ...items,
      'wide-ring': { ...items.ring!, id: 'wide-ring', name: '宽护符', icon: 'wide-icon' },
    })
    box.render(ctx, { ...openMenu(), openPanel: 'status' }, world([c]), 0)
    expect(drawImage.mock.calls.filter(([bitmap]) => bitmap === large)).toEqual([
      [large, 269, 149, 42, 11],
    ])
    expect(labels().map((row) => row.text)).toContain('?unknown')
    expect(labels().map((row) => row.text)).toContain('宽护符')
  })

  test('两级级联把父项留静态高亮，子级选中继续闪烁，禁用项保留红色区分', () => {
    const { assets, ctx, glyphs } = host()
    const offCtx = { ...ctx, drawImage: vi.fn(), fillRect: vi.fn() }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: () => offCtx,
      })),
    })
    const box = new MenuBox(
      glyphs,
      {
        'menu.cash': '金钱',
        'menu.status': '状态',
        'menu.magic': '仙术',
        'menu.item': '物品',
        'menu.system': '系统',
        'menu.equip': '装备',
        'menu.use': '使用',
      },
      assets,
      items,
    )
    const state = structuredClone(confirm(moveCursor(openMenu(), 2)))
    state.stack[1]!.nodes[1]!.enabled = false
    box.render(ctx, state, world(), 0)
    expect(labels().map((row) => row.text)).toEqual([
      '金钱',
      '状态',
      '仙术',
      '物品',
      '系统',
      '装备',
      '使用',
    ])
    expect(labels().find((row) => row.text === '物品')?.color).toEqual([219, 174, 81])
    expect(labels().find((row) => row.text === '装备')?.color).toEqual([247, 231, 109])
    expect(labels().find((row) => row.text === '使用')?.color).toEqual([166, 40, 32])
  })
})
