/** Public MenuBox layout. Text spans and bitmap coordinates are observed; glyph pixels are outside this suite. */
import type { CharacterInstance, ItemDataMap, WorldState } from '@type-pal/content'
import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest'
import { confirm, moveCursor, openMenu } from '../menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import * as textRenderer from '../text/text-render.js'
import { type MenuAssets, MenuBox } from './menu-box.js'

const realRenderSpans = textRenderer.renderSpans
let textCalls: MockInstance<typeof textRenderer.renderSpans>

beforeEach(() => {
  textCalls = vi.spyOn(textRenderer, 'renderSpans')
})

const bitmapStub = (id: string, width = 8, height = 8): ImageBitmap =>
  ({ id, width, height, close() {} }) as ImageBitmap

/** 不规则尺寸的九宫格替身：左8/中16/右中9、右角13，上下行高4；box/scroll 各有独立位图。 */
function irregularBoxTiles(prefix: string) {
  return [
    bitmapStub(`${prefix}-tl`, 8, 4),
    bitmapStub(`${prefix}-top`, 16, 4),
    bitmapStub(`${prefix}-tr`, 13, 4),
    bitmapStub(`${prefix}-left`, 8, 18),
    bitmapStub(`${prefix}-center`, 16, 18),
    bitmapStub(`${prefix}-right`, 9, 18),
    bitmapStub(`${prefix}-bl`, 8, 4),
    bitmapStub(`${prefix}-bottom`, 16, 4),
    bitmapStub(`${prefix}-br`, 13, 4),
  ]
}

/** 数字 0-9：宽 = 6+d（互异），右/左对齐排布可按位图身份 + 坐标判别。 */
const digitBitmaps = (prefix: string): ImageBitmap[] =>
  Array.from({ length: 10 }, (_, d) => bitmapStub(`${prefix}-${d}`, 6 + d, 8))

function layoutHost() {
  const box = { tiles: irregularBoxTiles('b') }
  const scroll = { tiles: irregularBoxTiles('s') }
  const nums = digitBitmaps('n')
  const numsBlue = digitBitmaps('nb')
  const numsCyan = digitBitmaps('nc')
  const equipSlot = bitmapStub('equip-slot', 34, 34)
  const avatar = bitmapStub('fallback-avatar', 32, 40)
  const slash = bitmapStub('slash', 3, 8)
  const swordIcon = bitmapStub('sword-icon', 28, 28)
  const assets: MenuAssets = {
    box,
    statusBg: bitmapStub('status-background', 320, 200),
    equipSlot,
    scroll,
    nums,
    avatar,
    numsBlue,
    numsCyan,
    slash,
    itemIcons: { 'icon-sword': swordIcon },
    redBox: { tiles: irregularBoxTiles('rb') },
    magicPlayerBox: bitmapStub('pbox'),
    cursorGrid: bitmapStub('cursor-grid'),
    cursorUp: bitmapStub('cursor-up'),
    cursorUpRed: bitmapStub('cursor-up-red'),
    cursorDown: bitmapStub('cursor-down'),
    settleArrow: bitmapStub('settle-arrow'),
    battleIcons: [],
    itembox: { tiles: irregularBoxTiles('ib') },
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
  /** drawBoxShadow 离屏画布：独立 drawImage/fillRect，不污染主画布记录；可数创建次数。 */
  const created: Array<{ width: number; height: number }> = []
  const stubShadowCanvas = () => {
    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`)
        const off = {
          width: 0,
          height: 0,
          getContext: () => ({
            ...ctx,
            drawImage: vi.fn(),
            fillRect: vi.fn(),
          }),
        }
        created.push(off)
        return off
      },
    })
  }
  /** 主画布上按位图身份过滤的全部调用参数。 */
  const callsOf = (bitmap: unknown) => drawImage.mock.calls.filter((call) => call[0] === bitmap)
  return {
    assets,
    avatar,
    box,
    callsOf,
    created,
    ctx,
    drawImage,
    glyphs,
    nums,
    numsBlue,
    numsCyan,
    scroll,
    slash,
    stubShadowCanvas,
    swordIcon,
    equipSlot,
  }
}

const recordedLabels = () =>
  textCalls.mock.calls.map(([, spans, x, y, opts]) => ({
    text: spans.map((span) => span.text).join(''),
    x,
    y,
    color: opts.forceRgba,
  }))

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
  sword: {
    id: 'sword',
    name: '木剑',
    desc: [],
    buyPrice: 60,
    sellPrice: 30,
    sellable: true,
    icon: 'icon-sword',
    equip: {
      slot: 'weapon',
      equipableBy: ['hero'],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 3 }],
    },
  },
}

function partyMember(equipment: CharacterInstance['equipment']): CharacterInstance {
  return {
    id: 'hero-instance',
    template: 'hero',
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
    equipment,
    tags: [],
  }
}

const worldWithParty = (party: CharacterInstance[]): WorldState => ({
  party,
  reserve: [],
  money: 205,
  inventory: [],
  learnedSkills: {},
})

const CASCADE_LOCALE = {
  'menu.cash': '金钱',
  'menu.status': '状态',
  'menu.magic': '仙术',
  'menu.item': '物品',
  'menu.system': '系统',
  'menu.equip': '装备',
  'menu.use': '使用',
}

afterEach(() => {
  try {
    textCalls.mockRestore()
    expect(textRenderer.renderSpans).toBe(realRenderSpans)
  } finally {
    vi.unstubAllGlobals()
  }
})
describe('MenuBox cascade layout', () => {
  test('级联框按深度布局，金钱数字按实际字形右对齐', () => {
    const rendering = layoutHost()
    rendering.stubShadowCanvas()
    const box = new MenuBox(rendering.glyphs, CASCADE_LOCALE, rendering.assets, items)
    box.render(
      rendering.ctx,
      confirm(moveCursor(openMenu(), 2)),
      worldWithParty([partyMember({})]),
      0,
    )

    // 金钱条：卷轴 (0,0) nLen=5 → 宽 8+16×5+9=97、右列 x=88、下行 y=22；三框全带阴影
    expect(rendering.callsOf(rendering.scroll.tiles[0])).toEqual([
      [rendering.scroll.tiles[0], 0, 0],
    ])
    expect(rendering.callsOf(rendering.scroll.tiles[8])).toEqual([
      [rendering.scroll.tiles[8], 88, 22],
    ])
    expect(rendering.created).toHaveLength(3)

    // 金额 205：右缘 85 往左按字形实宽排（5→0→2），y=14
    expect(
      rendering.drawImage.mock.calls.filter((call) =>
        rendering.nums.includes(call[0] as ImageBitmap),
      ),
    ).toEqual([
      [rendering.nums[5], 74, 14],
      [rendering.nums[0], 68, 14],
      [rendering.nums[2], 60, 14],
    ])

    // 层框：depth0 (3,37) 4 项 → 高 22+72=94（下行 127）；depth1 (30,60) 2 项 → 高 58（下行 114）
    expect(rendering.callsOf(rendering.box.tiles[0])).toEqual([
      [rendering.box.tiles[0], 3, 37],
      [rendering.box.tiles[0], 30, 60],
    ])
    expect(rendering.callsOf(rendering.box.tiles[2])).toEqual([
      [rendering.box.tiles[2], 55, 37],
      [rendering.box.tiles[2], 82, 60],
    ])
    expect(rendering.callsOf(rendering.box.tiles[6])).toEqual([
      [rendering.box.tiles[6], 3, 127],
      [rendering.box.tiles[6], 30, 114],
    ])

    // 项字：层内 (bx+13, by+13+idx×18)，逐层随 CASCADE_DX/DY 偏移
    expect(recordedLabels().map((row) => [row.x, row.y])).toEqual([
      [10, 10],
      [16, 50],
      [16, 68],
      [16, 86],
      [16, 104],
      [43, 73],
      [43, 91],
    ])
  })

  test('级联闪烁相位回绕，系统面板和禁用项各用自己的颜色', () => {
    const rendering = layoutHost()
    rendering.stubShadowCanvas()
    const box = new MenuBox(rendering.glyphs, CASCADE_LOCALE, rendering.assets, items)
    const twoLevels = confirm(moveCursor(openMenu(), 2))
    const colorOf = (text: string) => recordedLabels().find((row) => row.text === text)?.color

    box.render(rendering.ctx, twoLevels, worldWithParty([partyMember({})]), 100)
    expect(colorOf('装备')).toEqual([235, 211, 97]) // floor(100/100)=1

    textCalls.mockClear()
    box.render(rendering.ctx, twoLevels, worldWithParty([partyMember({})]), 600)
    expect(colorOf('装备')).toEqual([247, 231, 109]) // floor(600/100)%6=0：整表回绕

    // 系统面板期（confirm 系统叶 → openPanel='system'）主菜单为最深层：选中项「系统」闪烁让位静态高亮
    textCalls.mockClear()
    box.render(
      rendering.ctx,
      confirm(moveCursor(openMenu(), 3)),
      worldWithParty([partyMember({})]),
      100,
    )
    expect(colorOf('系统')).toEqual([219, 174, 81])
    expect(colorOf('状态')).toEqual([199, 186, 174])

    // moveCursor 不跳过禁用项：光标停在禁用首项上 = 合法态；禁用选中/未选中两臂
    const disabledSelected = structuredClone(openMenu())
    disabledSelected.stack[0]!.nodes[0]!.enabled = false
    textCalls.mockClear()
    box.render(rendering.ctx, disabledSelected, worldWithParty([partyMember({})]), 0)
    expect(colorOf('状态')).toEqual([215, 109, 93])
    expect(colorOf('仙术')).toEqual([199, 186, 174])
  })
})

describe('MenuBox status layout', () => {
  test('状态页九行数值按坐标和颜色布局，攻击包含装备加成', () => {
    const rendering = layoutHost()
    const box = new MenuBox(
      rendering.glyphs,
      {
        'name.hero': '主角',
        'stat.exp': '经验',
        'stat.level': '等级',
        'stat.hp': '生命',
        'stat.mp': '灵力',
        'stat.attack': '攻击',
        'stat.magicAttack': '法攻',
        'stat.defense': '防御',
        'stat.speed': '身法',
        'stat.luck': '吉运',
      },
      rendering.assets,
      items,
      {
        actorsById: {
          hero: {
            id: 'hero',
            name: 'name.hero',
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
          },
        },
      },
    )
    box.render(
      rendering.ctx,
      { ...openMenu(), openPanel: 'status' },
      worldWithParty([partyMember({ accessory: 'ring' })]),
      0,
    )

    // 行序 + label 坐标（x=8 过滤掉中栏名字与装备名）
    expect(
      recordedLabels()
        .filter((row) => row.x === 8)
        .map((row) => [row.text, row.y]),
    ).toEqual([
      ['经验', 10],
      ['等级', 30],
      ['生命', 50],
      ['灵力', 70],
      ['攻击', 90],
      ['法攻', 110],
      ['防御', 130],
      ['身法', 150],
      ['吉运', 170],
    ])

    // 值数字：黄、右对齐 x=70、y=14+20i；攻击 10+护符2=12（effectiveStat 接线）
    expect(
      rendering.drawImage.mock.calls.filter((call) =>
        rendering.nums.includes(call[0] as ImageBitmap),
      ),
    ).toEqual([
      [rendering.nums[3], 61, 14], // exp 3
      [rendering.nums[1], 63, 34], // level 1
      [rendering.nums[5], 59, 54], // hp 45
      [rendering.nums[4], 49, 54],
      [rendering.nums[8], 56, 74], // mp 8
      [rendering.nums[2], 62, 94], // attack 12
      [rendering.nums[1], 55, 94],
      [rendering.nums[2], 62, 114], // magicAttack 12
      [rendering.nums[1], 55, 114],
      [rendering.nums[8], 56, 134], // defense 8
      [rendering.nums[5], 59, 154], // speed 5
      [rendering.nums[3], 61, 174], // luck 3
    ])

    // 斜杠只出现在带 max 的行：exp/hp/mp（level 与五维行无斜杠、无 max 数字）
    expect(rendering.callsOf(rendering.slash)).toEqual([
      [rendering.slash, 72, 14],
      [rendering.slash, 72, 54],
      [rendering.slash, 72, 74],
    ])

    // max 左对齐 (79, ny+5)：HP/MP 蓝、exp 青；level/五维行无 max 数字
    expect(
      rendering.drawImage.mock.calls.filter((call) =>
        rendering.numsBlue.includes(call[0] as ImageBitmap),
      ),
    ).toEqual([
      [rendering.numsBlue[1], 79, 59], // maxHP 100
      [rendering.numsBlue[0], 86, 59],
      [rendering.numsBlue[0], 92, 59],
      [rendering.numsBlue[4], 79, 79], // maxMP 40
      [rendering.numsBlue[0], 89, 79],
    ])
    expect(
      rendering.drawImage.mock.calls.filter((call) =>
        rendering.numsCyan.includes(call[0] as ImageBitmap),
      ),
    ).toEqual([
      [rendering.numsCyan[4], 79, 19], // expToNext 42（level 1 → expTable[1]）
      [rendering.numsCyan[2], 89, 19],
    ])
  })

  test('角色名和回落立绘各自按宽度居中', () => {
    const rendering = layoutHost()
    const box = new MenuBox(rendering.glyphs, { 'name.hero': '主角' }, rendering.assets, items)
    box.render(
      rendering.ctx,
      { ...openMenu(), openPanel: 'status' },
      worldWithParty([partyMember({})]),
      0,
    )

    // '主角' 2 字 × measureSpans 回退 16 = 32 → x = 158−16 = 142
    const name = recordedLabels().find((row) => row.text === '主角')
    expect([name?.x, name?.y, name?.color]).toEqual([142, 30, [255, 203, 113]])
    // 回落立绘（32 宽）居中：round(158−16)=142, y=AVATAR_Y=50
    expect(rendering.callsOf(rendering.avatar)).toEqual([[rendering.avatar, 142, 50]])
  })

  test('六个装备格按2×3排列，图标和物名居中，空槽不画内容', () => {
    const rendering = layoutHost()
    const box = new MenuBox(rendering.glyphs, {}, rendering.assets, items)
    box.render(
      rendering.ctx,
      { ...openMenu(), openPanel: 'status' },
      worldWithParty([partyMember({ weapon: 'sword' })]),
      0,
    )

    // EQUIP_SLOT_IDS 序 weapon/head/body/cloak/feet/accessory → 网格 i=行列
    expect(rendering.callsOf(rendering.equipSlot)).toEqual([
      [rendering.equipSlot, 200, 6, 56, 56],
      [rendering.equipSlot, 262, 6, 56, 56],
      [rendering.equipSlot, 200, 66, 56, 56],
      [rendering.equipSlot, 262, 66, 56, 56],
      [rendering.equipSlot, 200, 126, 56, 56],
      [rendering.equipSlot, 262, 126, 56, 56],
    ])

    // 已装备 weapon：图标 28×28 内缩区(42)原比例居中 (214,20)；空槽不画图标
    expect(rendering.callsOf(rendering.swordIcon)).toEqual([[rendering.swordIcon, 214, 20, 28, 28]])

    // 物名：格内底 gy+56−13=49 居中 x=200+(56−32)/2=212，色 0xBE。空槽零图标零物名：
    // 全部文字 = 9 属性行 + 中栏名字 + 1 物名，无任何 '?槽位' 兜底
    expect(recordedLabels().filter((row) => row.text === '木剑')).toEqual([
      { text: '木剑', x: 212, y: 49, color: [231, 223, 195] },
    ])
    expect(recordedLabels()).toHaveLength(11)
  })
})
