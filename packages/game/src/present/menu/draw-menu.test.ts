import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import type { IndexedImage } from '../../assets/png.js'
import { setGlobalEvents } from '../../core/event-system.js'
import {
  type ActiveMenuEntry,
  createInitialGameState,
  hydratePlayerRolesRuntime,
} from '../../core/game-state.js'
import { confirmEquipItem, createEquipMenu } from '../../core/menu/equip-menu.js'
import { createInGameMagicMenu } from '../../core/menu/in-game-magic-menu.js'
import {
  createInGameMenu,
  createSystemMenu,
  systemMenuEnterSwitch,
} from '../../core/menu/in-game-menu.js'
import { createInventoryActionMenu } from '../../core/menu/inventory-action-menu.js'
import {
  confirmInventoryItem,
  createInventoryMenu,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../core/menu/inventory-menu.js'
import { openMenu } from '../../core/menu/menu-mode.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { createSaveSlotMenu } from '../../core/menu/save-slot-menu.js'
import { createSellMenu, sellMoveRight, sellSelectItem } from '../../core/menu/sell-menu.js'
import { setWordTable } from '../../core/word-lookup.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import {
  freezeNow,
  makeGs,
  makeItem,
  makeRole,
  makeRoles,
} from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE0,
  BOX_STYLE1,
  makeUiFrames,
  rightDigitX,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  iconImage,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { uniformDotGlyphs, uniformTextDot } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawMenuStack } from './draw-menu.js'

const uniformGlyphs = uniformDotGlyphs()
const positionGlyphs = fixtureGlyphs()
/** Distinct slot colors identify actual frame forwarding; semantic digit/chrome fixtures stay separate. */
function distinctUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let frameIndex = 0; frameIndex < 47; frameIndex++) {
    const width = 8,
      height = 8
    const indices = new Uint8Array(width * height).fill((frameIndex % 250) + 1)
    const opaque = new Uint8Array(width * height).fill(1)
    frames.push({ width: width, height: height, indices, opaque })
  }
  return frames
}
let restoreMenuText: () => void
beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
  setGlobalEvents([])
})
afterEach(() => {
  try {
    setGlobalEvents([])
  } finally {
    restoreMenuText()
  }
})
describe('Menu stack rendering', () => {
  describe('Stack geometry and draw order', () => {
    it('menuStack 空 → 不画', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      drawMenuStack(fb, gs, distinctUiFrames())
      expect(fb.indices.every((v) => v === 0)).toBe(true)
    })

    it('In-Game hub → 主菜单 box 在 sdlpal 真值 (3, 37) + cash 框在 (0, 0)', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
      drawMenuStack(fb, gs, distinctUiFrames())
      // sdlpal uigame.c:990 PAL_CreateBox(PAL_XY(3, 37), 3, ...):box 左上角 = (3, 37) tile = 9-slice corner frame 0(idx 1)
      expect(fb.indices[37 * fb.width + 3]).toBe(1)
      // cash box (0,0):SingleLineBox frame 44 (idx 45) 左 corner
      expect(fb.indices[0 * fb.width + 0]).toBe(45)
    })

    it('System menu → box 在 sdlpal 真值 (40, 60)', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gs, { kind: 'system', state: createSystemMenu() })
      drawMenuStack(fb, gs, distinctUiFrames())
      // sdlpal uigame.c:559 PAL_CreateBox(PAL_XY(40, 60), ...)
      expect(fb.indices[60 * fb.width + 40]).toBe(1)
    })

    it('C2-quit:system phase=confirm → 叠确认框(130,100)/(205,100);menu 阶段不画', () => {
      // menu 阶段:确认框位置无 SingleLineBox corner
      const fbMenu = createFramebuffer()
      const gsMenu = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gsMenu, { kind: 'system', state: createSystemMenu() })
      drawMenuStack(fbMenu, gsMenu, distinctUiFrames())
      expect(fbMenu.indices[100 * fbMenu.width + 130]).not.toBe(45)

      // confirm 阶段:(130,100) 否框 + (205,100) 是框 corner = SingleLineBox frame 44(idx 45)
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const sys = createSystemMenu()
      sys.phase = 'confirm'
      openMenu(gs, { kind: 'system', state: sys })
      drawMenuStack(fb, gs, distinctUiFrames())
      expect(fb.indices[100 * fb.width + 130]).toBe(45) // 否框左 corner
      expect(fb.indices[100 * fb.width + 205]).toBe(45) // 是框左 corner
    })

    it('两层栈(in-game + inventory-action) → 子菜单盖住底层内容，主框与cash仍在', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
      openMenu(gs, { kind: 'inventory-action', state: createInventoryActionMenu() })
      drawMenuStack(fb, gs, distinctUiFrames())
      expect(fb.indices[37 * fb.width + 3]).toBe(1) // in-game box
      // 子菜单左上角(30,60)与底层内容重叠；逆序绘制会用底层文字/阴影改写此像素。
      expect(fb.indices[60 * fb.width + 30]).toBe(1)
      expect(fb.indices[0]).toBe(45) // cash box left corner
    })

    it('uiSpriteFrames 不足 → drawSingleLineBox 先抛 frame 44-46 missing', () => {
      const fb = createFramebuffer()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
      expect(() => drawMenuStack(fb, gs, [])).toThrow(/uiSpriteFrames\[44\.\.46\]/)
    })
  })

  describe('Contents and overlays', () => {
    it('save-slot：5 个单行框 (195,7+38i)、标签字色、slotMetas.savedTimes 黄色数字（缺省 0）', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const state = createSaveSlotMenu('save')
      state.slotMetas.set(2, {
        partyLevel: 1,
        cash: 0,
        sceneId: 0,
        savedAt: 0,
        savedTimes: 12,
      })
      openMenu(gs, { kind: 'save-slot', state })
      const fb = sentinelFramebuffer()
      const frames = makeUiFrames()
      const inputs = { gs, state, frames }
      const before = structuredClone(inputs)
      const restore = freezeMenuClock(0)
      try {
        drawMenuStack(fb, gs, frames, uniformGlyphs)
      } finally {
        restore()
      }
      expect(structuredClone(inputs)).toEqual(before)
      // 框体：每行 box 内部应是 style0 素色（左框 mid 段）
      expect(pixel(fb, 200, 11)).toBe(BOX_STYLE0)
      expect(pixel(fb, 200, 7 + 38 * 4 + 3)).toBe(BOX_STYLE0)
      // 槽 1 标签「进度一」第 0 字亮点 = 选中闪烁 0xF9（冻结 tick 0）
      const label1 = uniformTextDot(0, 210, 17)
      expect(pixel(fb, label1.x, label1.y)).toBe(0xf9)
      // 槽 2 有 meta.savedTimes=12 → 个位/十位黄 2/1；槽 1 无 meta → 0
      expect(pixel(fb, rightDigitX(270, 4, 0), 21 + 38)).toBe(yellowDigit(2))
      expect(pixel(fb, rightDigitX(270, 4, 1), 21 + 38)).toBe(yellowDigit(1))
      expect(pixel(fb, rightDigitX(270, 4, 0), 21)).toBe(yellowDigit(0))
      // 第 5 槽框体 + 标签（非选中 0x4F）
      const label5 = uniformTextDot(0, 210, 17 + 38 * 4)
      expect(pixel(fb, label5.x, label5.y)).toBe(0x4f)
    })

    it('inventory-action：框 (30,60)、装备/使用两标签、cursor 0 选中闪烁、切光标后选中移动', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const state = createInventoryActionMenu()
      openMenu(gs, { kind: 'inventory-action', state })
      const frames = makeUiFrames()
      const equipDot = uniformTextDot(0, 43, 73)
      const useDot = uniformTextDot(0, 43, 91)
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawMenuStack(fb, gs, frames, uniformGlyphs)
      } finally {
        restore()
      }
      expect(pixel(fb, 40, 64)).toBe(BOX_STYLE0)
      expect(pixel(fb, equipDot.x, equipDot.y)).toBe(0xf9)
      expect(pixel(fb, useDot.x, useDot.y)).toBe(0x4f)
      // 可达的下一个光标快照:使用选中;这里不验按键路由
      const fb2 = sentinelFramebuffer()
      state.selection.cursor = 1
      const restore2 = freezeMenuClock(0)
      try {
        drawMenuStack(fb2, gs, frames, uniformGlyphs)
      } finally {
        restore2()
      }
      expect(pixel(fb2, useDot.x, useDot.y)).toBe(0xf9)
      expect(pixel(fb2, equipDot.x, equipDot.y)).toBe(0x4f)
    })

    it('system switch 相：叠 关/开 选框（confirmYes=false → 左「关」选中）', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const state = createSystemMenu()
      systemMenuEnterSwitch(state, 'music', false)
      openMenu(gs, { kind: 'system', state })
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawMenuStack(fb, gs, makeUiFrames(), uniformGlyphs)
      } finally {
        restore()
      }
      const guanDot = uniformTextDot(0, 145, 110)
      const kaiDot = uniformTextDot(0, 220, 110)
      expect(pixel(fb, guanDot.x, guanDot.y)).toBe(0xf9) // 左选中
      expect(pixel(fb, kaiDot.x, kaiDot.y)).toBe(0x4f)
    })

    it('shop-sell 栈项：confirm 相在 grid+overlay 之上叠 否/是 确认层', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dwCash = 7
      const item = makeItem(400, '甲', { price: 50, scriptDesc: 1, flags: { sellable: true } })
      const items = [item]
      gs.inventory = [{ itemId: item.id, count: 2 }]
      const state = createSellMenu(gs, items)
      expect(sellSelectItem(state, items)).toBe(true) // 同 dispatchSellMenu 的确认入口
      sellMoveRight(state)
      openMenu(gs, { kind: 'shop-sell', state })
      setGlobalEvents([
        { op: 'end' },
        { op: 'showDialog', label: 'L_1', messageIndex: 1, text: '乙' },
        { op: 'end' },
      ])
      const frames = makeUiFrames()
      const icons = new Map([[item.bitmap, iconImage(0x82)]])
      const inputs = { gs, state, items, frames, icons }
      const before = structuredClone(inputs)
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawMenuStack(fb, gs, frames, uniformGlyphs, { items, itemIcons: icons })
      } finally {
        restore()
      }
      expect(structuredClone(inputs)).toEqual(before)
      expect(state.selectedItemId).toBe(item.id)
      expect(pixel(fb, 2, 0)).toBe(BOX_STYLE1) // 全屏网格,不是紧凑买入列表
      expect(pixel(fb, 19, 16)).toBe(0xf9) // 当前物品名
      expect(pixel(fb, 8, 147)).toBe(0x82) // 网格预览图标
      expect(pixel(fb, 75, 155)).toBe(0x5a) // noDesc:乙的描述亮点不得画出
      expect(pixel(fb, rightDigitX(148, 6, 0), 165)).toBe(yellowDigit(7))
      expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(yellowDigit(5))
      expect(pixel(fb, rightDigitX(272, 6, 1), 165)).toBe(yellowDigit(2))
      const priceLabel = uniformTextDot(0, 234, 160)
      expect(pixel(fb, priceLabel.x, priceLabel.y)).toBe(0)
      const shiDot = uniformTextDot(0, 220, 110)
      const fouDot = uniformTextDot(0, 145, 110)
      expect(pixel(fb, shiDot.x, shiDot.y)).toBe(0xf9) // confirmYes=true → 右「是」选中
      expect(pixel(fb, fouDot.x, fouDot.y)).toBe(0x4f)
    })

    it('缺 extra：player-status / equip / in-game-magic 画占位框 (80,80)，不抛错', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      const roles = { roles: [makeRole(0, '甲', { maxMP: 40, mp: 30 })] }
      hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
      const entries: ActiveMenuEntry[] = [
        { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) },
        { kind: 'equip', state: createEquipMenu(gs, []) },
        {
          kind: 'in-game-magic',
          state: createInGameMagicMenu(roles, gs.partyMembers, []),
        },
      ]
      for (const entry of entries) {
        gs.menuStack.length = 0
        openMenu(gs, entry)
        const fb = sentinelFramebuffer()
        drawMenuStack(fb, gs, makeUiFrames(), uniformGlyphs)
        expect(pixel(fb, 90, 90)).toBe(BOX_STYLE0) // 占位 box 1×14 内部
        // 占位文字 tofu 首行像素（renderText 缺字形 → tofu 框顶行全亮）
        expect(pixel(fb, 96, 88)).toBe(0x4f)
      }
    })
  })

  describe('Forwarded resources', () => {
    it('P05 物品、图标和角色经公开菜单栈传到真实下层', () => {
      const gs = makeGs()
      const roles = makeRoles()
      const item = makeItem(21, '甲', { bitmap: 4, flags: { usable: true } })
      const items = [item]
      gs.partyMembers = [4, 1]
      gs.inventory = [{ itemId: item.id, count: 1 }]
      const menu = createInventoryMenu(gs, items, 'usable')
      confirmInventoryItem(menu, items, roles, gs.partyMembers)
      openMenu(gs, { kind: 'inventory', state: menu })
      const frames = makeUiFrames()
      const icons = new Map([[4, iconImage(0x84)]])
      const name = textDot('戊', 0, 125, 16)
      const restore = freezeNow(0)
      try {
        const bare = createFramebuffer()
        fillSentinel(bare)
        const bareInputs = { gs, menu, frames }
        const beforeBare = cloneInputs(bareInputs)
        drawMenuStack(bare, gs, frames, positionGlyphs)
        expect(cloneInputs(bareInputs)).toEqual(beforeBare)
        expect(pixel(bare, name.x, name.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)
        expect(pixel(bare, 127, 88)).not.toBe(0x84)

        const forwarded = createFramebuffer()
        fillSentinel(forwarded)
        const forwardedInputs = { gs, menu, items, roles, frames, icons }
        const before = cloneInputs(forwardedInputs)
        drawMenuStack(forwarded, gs, frames, positionGlyphs, {
          items,
          itemIcons: icons,
          playerRoles: roles,
        })
        expect(cloneInputs(forwardedInputs)).toEqual(before)
        expect(pixel(forwarded, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
        expect(pixel(forwarded, textDot('甲', 0, 116, 143).x, textDot('甲', 0, 116, 143).y)).toBe(
          0xbe,
        )
        expect(pixel(forwarded, 127, 88)).toBe(0x84)
      } finally {
        restore()
      }
    })

    it('P05 装备背景只在extra.equipBg传入时写入', () => {
      const gs = makeGs()
      const roles = makeRoles()
      const sword = makeItem(40, '剑', {
        flags: { equipable: true, equipableBy: [false, false, false, false, true, false] },
      })
      const items = [sword]
      gs.partyMembers = [4]
      gs.inventory = [{ itemId: sword.id, count: 1 }]
      const menu = createEquipMenu(gs, items)
      confirmEquipItem(menu, items)
      openMenu(gs, { kind: 'equip', state: menu })
      const frames = makeUiFrames()
      const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
      const restore = freezeNow(0)
      try {
        const without = createFramebuffer()
        fillSentinel(without)
        const plain = { gs, menu, items, roles, frames }
        const beforePlain = cloneInputs(plain)
        drawMenuStack(without, gs, frames, positionGlyphs, { items, playerRoles: roles })
        expect(cloneInputs(plain)).toEqual(beforePlain)
        expect(pixel(without, 1, 1)).toBe(SENTINEL)

        const withBg = createFramebuffer()
        fillSentinel(withBg)
        const painted = { ...plain, equipBg: bg }
        const before = cloneInputs(painted)
        drawMenuStack(withBg, gs, frames, positionGlyphs, {
          items,
          playerRoles: roles,
          equipBg: bg,
        })
        expect(cloneInputs(painted)).toEqual(before)
        expect(pixel(withBg, 1, 1)).toBe(0x55)
        expect(pixel(withBg, textDot('戊', 0, 15, 108).x, textDot('戊', 0, 15, 108).y)).toBe(
          MENUITEM_COLOR_SELECTED_FIRST,
        )
      } finally {
        restore()
      }
    })

    it('P05 状态背景和毒数据经extra传到真实状态页', () => {
      const words = Array<string>(80).fill('')
      words[77] = '瘟'
      setWordTable(words)
      const gs = makeGs()
      const roles = makeRoles()
      gs.partyMembers = [4, 1]
      gs.rgPoisonStatus['0_0'] = { wPoisonID: 77, wPoisonScript: 1 }
      const menu = createPlayerStatus(gs.partyMembers)
      openMenu(gs, { kind: 'player-status', state: menu })
      const frames = makeUiFrames()
      const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x56) }
      const poisons = new Map([[77, { level: 1, color: 3 }]])
      const items: ReturnType<typeof makeItem>[] = []
      const poison = textDot('瘟', 0, 185, 58)
      const without = createFramebuffer()
      fillSentinel(without)
      const plain = { gs, menu, items, roles, frames }
      const beforePlain = cloneInputs(plain)
      drawMenuStack(without, gs, frames, positionGlyphs, { playerRoles: roles, items })
      expect(cloneInputs(plain)).toEqual(beforePlain)
      expect(pixel(without, 1, 1)).toBe(SENTINEL)
      expect(pixel(without, poison.x, poison.y)).toBe(SENTINEL)

      const withExtra = createFramebuffer()
      fillSentinel(withExtra)
      const extra = { ...plain, statusBg: bg, poisons }
      const before = cloneInputs(extra)
      drawMenuStack(withExtra, gs, frames, positionGlyphs, {
        playerRoles: roles,
        items,
        statusBg: bg,
        objectPoisons: poisons,
      })
      expect(cloneInputs(extra)).toEqual(before)
      expect(pixel(withExtra, 1, 1)).toBe(0x56)
      expect(pixel(withExtra, poison.x, poison.y)).toBe(13)
      expect(pixel(withExtra, poison.x + 1, poison.y)).toBe(0)
    })
  })
})
