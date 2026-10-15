/**
 * TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1（menu-box.ts 冻结源 9aa3bed8）。
 * 去重账：residual 覆盖数字右/左对齐、卷轴自然宽高、确认框位置与互斥；glm-runtime-resource
 * 覆盖 drawSlicedBox 平铺/阴影/缺角/零尺寸；glm-n 覆盖退化尺寸与缺字形臂；status-residual
 * 覆盖状态板毒行/立绘懒加载/成员钳制/阈值身份/图标缩放与级联文字颜色。本文件只做未占用合同：
 * 级联层框几何与金钱条、选中颜色残余臂（now 相位回绕/openPanel 让位/禁用选中）、属性九行
 * 数据驱动布局（行序/坐标/蓝青派发/effectiveStat 接线）、中栏名字与立绘定位、装备格 2×3
 * 网格与空槽跳过。oracle = renderSpans 调用记录（measureSpans 保持真实）+ drawImage 按位图身份过滤。
 */
import type { CharacterInstance, ItemDataMap, WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { confirm, moveCursor, openMenu } from '../menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { type MenuAssets, MenuBox } from './menu-box.js'

const textCalls = vi.hoisted(() => vi.fn((..._args: unknown[]) => 0))
vi.mock('../text/text-render.js', async (original) => ({
  ...(await original<typeof import('../text/text-render.js')>()),
  renderSpans: (...args: unknown[]) => textCalls(...args),
}))

const image = (id: string, width = 8, height = 8): ImageBitmap =>
  ({ id, width, height, close() {} }) as ImageBitmap

/** 九宫格：真实不规则 frame 尺寸（左8/中16/右9 列宽、上下行高4），box/scroll 各一套独立位图。 */
function nine(prefix: string) {
  return [
    image(`${prefix}-tl`, 8, 4),
    image(`${prefix}-top`, 16, 4),
    image(`${prefix}-tr`, 13, 4),
    image(`${prefix}-left`, 8, 18),
    image(`${prefix}-center`, 16, 18),
    image(`${prefix}-right`, 9, 18),
    image(`${prefix}-bl`, 8, 4),
    image(`${prefix}-bottom`, 16, 4),
    image(`${prefix}-br`, 13, 4),
  ]
}

/** 数字 0-9：宽 = 6+d（互异），右/左对齐排布可按位图身份 + 坐标判别。 */
const digits = (prefix: string): ImageBitmap[] =>
  Array.from({ length: 10 }, (_, d) => image(`${prefix}-${d}`, 6 + d, 8))

function host() {
  const box = { tiles: nine('b') }
  const scroll = { tiles: nine('s') }
  const nums = digits('n')
  const numsBlue = digits('nb')
  const numsCyan = digits('nc')
  const equipSlot = image('equip-slot', 34, 34)
  const avatar = image('fallback-avatar', 32, 40)
  const slash = image('slash', 3, 8)
  const swordIcon = image('sword-icon', 28, 28)
  const assets: MenuAssets = {
    box,
    statusBg: image('status-background', 320, 200),
    equipSlot,
    scroll,
    nums,
    avatar,
    numsBlue,
    numsCyan,
    slash,
    itemIcons: { 'icon-sword': swordIcon },
    redBox: { tiles: nine('rb') },
    magicPlayerBox: image('pbox'),
    cursorGrid: image('cursor-grid'),
    cursorUp: image('cursor-up'),
    cursorUpRed: image('cursor-up-red'),
    cursorDown: image('cursor-down'),
    settleArrow: image('settle-arrow'),
    battleIcons: [],
    itembox: { tiles: nine('ib') },
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

interface LabelRecord {
  text: string
  x: number
  y: number
  color: unknown
}

const labels = (): LabelRecord[] =>
  textCalls.mock.calls.map((call) => ({
    text: (call[1] as Array<{ text: string }>).map((span) => span.text).join(''),
    x: call[2] as number,
    y: call[3] as number,
    color: (call[4] as { forceRgba?: unknown }).forceRgba,
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

function member(equipment: CharacterInstance['equipment']): CharacterInstance {
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

const world = (party: CharacterInstance[]): WorldState => ({
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

afterEach(() => vi.unstubAllGlobals())

describe('当前 MenuBox 级联与面板公开布局残余', () => {
  test('级联两级框几何与金钱条：卷轴(0,0)五段带影、金额右对齐(85,14)、框(3+27d,37+23d,61,22+18n)、项字随层偏移', () => {
    const h = host()
    h.stubShadowCanvas()
    const box = new MenuBox(h.glyphs, CASCADE_LOCALE, h.assets, items)
    box.render(h.ctx, confirm(moveCursor(openMenu(), 2)), world([member({})]), 0)

    // 金钱条：卷轴 (0,0) nLen=5 → 宽 8+16×5+9=97、右列 x=88、下行 y=22；三框全带阴影
    expect(h.callsOf(h.scroll.tiles[0])).toEqual([[h.scroll.tiles[0], 0, 0]])
    expect(h.callsOf(h.scroll.tiles[8])).toEqual([[h.scroll.tiles[8], 88, 22]])
    expect(h.created).toHaveLength(3)

    // 金额 205：右缘 85 往左按字形实宽排（5→0→2），y=14
    expect(
      h.drawImage.mock.calls.filter((call) => h.nums.includes(call[0] as ImageBitmap)),
    ).toEqual([
      [h.nums[5], 74, 14],
      [h.nums[0], 68, 14],
      [h.nums[2], 60, 14],
    ])

    // 层框：depth0 (3,37) 4 项 → 高 22+72=94（下行 127）；depth1 (30,60) 2 项 → 高 58（下行 114）
    expect(h.callsOf(h.box.tiles[0])).toEqual([
      [h.box.tiles[0], 3, 37],
      [h.box.tiles[0], 30, 60],
    ])
    expect(h.callsOf(h.box.tiles[2])).toEqual([
      [h.box.tiles[2], 55, 37],
      [h.box.tiles[2], 82, 60],
    ])
    expect(h.callsOf(h.box.tiles[6])).toEqual([
      [h.box.tiles[6], 3, 127],
      [h.box.tiles[6], 30, 114],
    ])

    // 项字：层内 (bx+13, by+13+idx×18)，逐层随 CASCADE_DX/DY 偏移
    expect(labels().map((row) => [row.x, row.y])).toEqual([
      [10, 10],
      [16, 50],
      [16, 68],
      [16, 86],
      [16, 104],
      [43, 73],
      [43, 91],
    ])
  })

  test('级联选中颜色残余臂：最深层随 now 闪烁并整表回绕、系统面板期最深层转静态、禁用选中显红、未选中米白', () => {
    const h = host()
    h.stubShadowCanvas()
    const box = new MenuBox(h.glyphs, CASCADE_LOCALE, h.assets, items)
    const twoLevels = confirm(moveCursor(openMenu(), 2))
    const colorOf = (text: string) => labels().find((row) => row.text === text)?.color

    box.render(h.ctx, twoLevels, world([member({})]), 100)
    expect(colorOf('装备')).toEqual([235, 211, 97]) // floor(100/100)=1

    textCalls.mockClear()
    box.render(h.ctx, twoLevels, world([member({})]), 600)
    expect(colorOf('装备')).toEqual([247, 231, 109]) // floor(600/100)%6=0：整表回绕

    // 系统面板期（confirm 系统叶 → openPanel='system'）主菜单为最深层：选中项「系统」闪烁让位静态高亮
    textCalls.mockClear()
    box.render(h.ctx, confirm(moveCursor(openMenu(), 3)), world([member({})]), 100)
    expect(colorOf('系统')).toEqual([219, 174, 81])
    expect(colorOf('状态')).toEqual([199, 186, 174])

    // moveCursor 不跳过禁用项：光标停在禁用首项上 = 合法态；禁用选中/未选中两臂
    const disabledSelected = structuredClone(openMenu())
    disabledSelected.stack[0]!.nodes[0]!.enabled = false
    textCalls.mockClear()
    box.render(h.ctx, disabledSelected, world([member({})]), 0)
    expect(colorOf('状态')).toEqual([215, 109, 93])
    expect(colorOf('仙术')).toEqual([199, 186, 174])
  })

  test('属性九行数据驱动布局：行序与 label(8,10+20i)、值右对齐(70,14+20i)、HP·MP 斜杠+蓝max、exp 青max、攻击值走装备加成', () => {
    const h = host()
    const box = new MenuBox(
      h.glyphs,
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
      h.assets,
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
      h.ctx,
      { ...openMenu(), openPanel: 'status' },
      world([member({ accessory: 'ring' })]),
      0,
    )

    // 行序 + label 坐标（x=8 过滤掉中栏名字与装备名）
    expect(
      labels()
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
      h.drawImage.mock.calls.filter((call) => h.nums.includes(call[0] as ImageBitmap)),
    ).toEqual([
      [h.nums[3], 61, 14], // exp 3
      [h.nums[1], 63, 34], // level 1
      [h.nums[5], 59, 54], // hp 45
      [h.nums[4], 49, 54],
      [h.nums[8], 56, 74], // mp 8
      [h.nums[2], 62, 94], // attack 12
      [h.nums[1], 55, 94],
      [h.nums[2], 62, 114], // magicAttack 12
      [h.nums[1], 55, 114],
      [h.nums[8], 56, 134], // defense 8
      [h.nums[5], 59, 154], // speed 5
      [h.nums[3], 61, 174], // luck 3
    ])

    // 斜杠只出现在带 max 的行：exp/hp/mp（level 与五维行无斜杠、无 max 数字）
    expect(h.callsOf(h.slash)).toEqual([
      [h.slash, 72, 14],
      [h.slash, 72, 54],
      [h.slash, 72, 74],
    ])

    // max 左对齐 (79, ny+5)：HP/MP 蓝、exp 青；level/五维行无 max 数字
    expect(
      h.drawImage.mock.calls.filter((call) => h.numsBlue.includes(call[0] as ImageBitmap)),
    ).toEqual([
      [h.numsBlue[1], 79, 59], // maxHP 100
      [h.numsBlue[0], 86, 59],
      [h.numsBlue[0], 92, 59],
      [h.numsBlue[4], 79, 79], // maxMP 40
      [h.numsBlue[0], 89, 79],
    ])
    expect(
      h.drawImage.mock.calls.filter((call) => h.numsCyan.includes(call[0] as ImageBitmap)),
    ).toEqual([
      [h.numsCyan[4], 79, 19], // expToNext 42（level 1 → expTable[1]）
      [h.numsCyan[2], 89, 19],
    ])
  })

  test('中栏名字金黄居中于158、回落立绘按宽居中于(142,50)', () => {
    const h = host()
    const box = new MenuBox(h.glyphs, { 'name.hero': '主角' }, h.assets, items)
    box.render(h.ctx, { ...openMenu(), openPanel: 'status' }, world([member({})]), 0)

    // '主角' 2 字 × measureSpans 回退 16 = 32 → x = 158−16 = 142
    const name = labels().find((row) => row.text === '主角')
    expect([name?.x, name?.y, name?.color]).toEqual([142, 30, [255, 203, 113]])
    // 回落立绘（32 宽）居中：round(158−16)=142, y=AVATAR_Y=50
    expect(h.callsOf(h.avatar)).toEqual([[h.avatar, 142, 50]])
  })

  test('装备格2×3网格六格全画(56×56,列距62行距60)、空槽只留格、已装备图标内缩居中、物名0xBE格底居中', () => {
    const h = host()
    const box = new MenuBox(h.glyphs, {}, h.assets, items)
    box.render(
      h.ctx,
      { ...openMenu(), openPanel: 'status' },
      world([member({ weapon: 'sword' })]),
      0,
    )

    // EQUIP_SLOT_IDS 序 weapon/head/body/cloak/feet/accessory → 网格 i=行列
    expect(h.callsOf(h.equipSlot)).toEqual([
      [h.equipSlot, 200, 6, 56, 56],
      [h.equipSlot, 262, 6, 56, 56],
      [h.equipSlot, 200, 66, 56, 56],
      [h.equipSlot, 262, 66, 56, 56],
      [h.equipSlot, 200, 126, 56, 56],
      [h.equipSlot, 262, 126, 56, 56],
    ])

    // 已装备 weapon：图标 28×28 内缩区(42)原比例居中 (214,20)；空槽不画图标
    expect(h.callsOf(h.swordIcon)).toEqual([[h.swordIcon, 214, 20, 28, 28]])

    // 物名：格内底 gy+56−13=49 居中 x=200+(56−32)/2=212，色 0xBE。空槽零图标零物名：
    // 全部文字 = 9 属性行 + 中栏名字 + 1 物名，无任何 '?槽位' 兜底
    expect(labels().filter((row) => row.text === '木剑')).toEqual([
      { text: '木剑', x: 212, y: 49, color: [231, 223, 195] },
    ])
    expect(labels()).toHaveLength(11)
  })
})
