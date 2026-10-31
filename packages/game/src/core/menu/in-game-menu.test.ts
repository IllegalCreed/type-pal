import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setWordTable } from '../word-lookup.js'
import {
  createInGameMenu,
  createSystemMenu,
  inGameMenuChoice,
  inGameMenuDown,
  inGameMenuUp,
  systemMenuChoice,
  systemMenuDown,
  systemMenuEnterConfirm,
  systemMenuEnterSwitch,
  systemMenuToggleConfirm,
  systemMenuUp,
} from './in-game-menu.js'

let releaseMenuText: (() => void) | undefined

beforeEach(() => {
  releaseMenuText = beginChineseMenuText()
})

afterEach(() => {
  releaseMenuText?.()
  releaseMenuText = undefined
})

describe('菜单项 id = 真 WORD id + label 由 getWord 取(ui.h:61-70 / words.json flat)', () => {
  it('InGameMenu id = GAMEMENU_LABEL 真值 [3,4,5,6](状态/仙术/物品/系统)', () => {
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.id)).toEqual([3, 4, 5, 6])
  })

  it('SystemMenu id = SYSMENU_LABEL 真值 [11,12,13,14,15]', () => {
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.id)).toEqual([11, 12, 13, 14, 15])
  })

  it('词表载入 → label 取 flat[id](WORD.DAT 单一源)', () => {
    const flat: string[] = []
    flat[3] = '状态X'
    flat[4] = '仙术X'
    flat[5] = '物品X'
    flat[6] = '系统X'
    setWordTable(flat)
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['状态X', '仙术X', '物品X', '系统X'])
  })

  it('choice 反查在真 id 下仍正确(id 改值不破坏 choice 映射)', () => {
    // 公开 state 防御合同：已有菜单项反序后仍按 WORD id 解释，不依赖 cursor。
    const s = createInGameMenu()
    s.selection.items.reverse()
    expect(inGameMenuChoice(s)).toBe('system')
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('inventory')
  })
})

describe('InGameMenu(主菜单 — 状态/仙术/物品/系统)', () => {
  it('4 项真值顺序(sdlpal uigame.c:961-966)', () => {
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['状态', '仙术', '物品', '系统'])
  })

  it('默认 cursor=0 → choice "status"', () => {
    const s = createInGameMenu()
    expect(inGameMenuChoice(s)).toBe('status')
  })

  it('defaultCursor 起手记忆(sdlpal iCurMainMenuItem 真值)', () => {
    const s = createInGameMenu(2)
    expect(s.selection.cursor).toBe(2)
    expect(inGameMenuChoice(s)).toBe('inventory')
  })

  it('Down 推进:状态 → 仙术 → 物品 → 系统', () => {
    const s = createInGameMenu()
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('magic')
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('inventory')
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('system')
  })

  it('Up 反推', () => {
    const s = createInGameMenu(3)
    inGameMenuUp(s)
    expect(inGameMenuChoice(s)).toBe('inventory')
  })

  it('defaultCursor 超出 = noop(防越界 crash)', () => {
    const s = createInGameMenu(99)
    expect(s.selection.cursor).toBe(0) // 应保持初始 0
  })
})

describe('SystemMenu(系统菜单 — 储存/读取/音乐/音效/结束)', () => {
  it('5 项真值顺序(sdlpal uigame.c:543-552 PAL_CLASSIC build)', () => {
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '储存进度',
      '读取进度',
      '音乐',
      '音效',
      '结束游戏',
    ])
  })

  it('choice 序列:save / load / music / sound / quit', () => {
    const s = createSystemMenu()
    expect(systemMenuChoice(s)).toBe('save')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('load')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('music')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('sound')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('quit')
  })

  it('defaultCursor 记忆(sdlpal iCurSystemMenuItem 真值)', () => {
    const s = createSystemMenu(4)
    expect(systemMenuChoice(s)).toBe('quit')
  })

  it('Up 反推', () => {
    const s = createSystemMenu(2)
    systemMenuUp(s)
    expect(systemMenuChoice(s)).toBe('load')
  })
})

describe('System menu phases and choice identities', () => {
  it('EnterConfirm 重置已有 Yes；ToggleConfirm 在否/是之间切换', () => {
    const s = createSystemMenu()
    expect(s.phase).toBe('menu')
    expect(s.confirmYes).toBe(false)
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(true)
    systemMenuEnterConfirm(s)
    expect(s.phase).toBe('confirm')
    expect(s.confirmYes).toBe(false) // 默认 否
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(true)
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(false)
  })

  it('EnterSwitch 按当前音频开关初始化目标和高亮', () => {
    const s = createSystemMenu()
    systemMenuEnterSwitch(s, 'music', true)
    expect(s.phase).toBe('switch')
    expect(s.switchTarget).toBe('music')
    expect(s.confirmYes).toBe(true) // 当前开 → 高亮 开
    systemMenuEnterSwitch(s, 'sound', false)
    expect(s.phase).toBe('switch')
    expect(s.switchTarget).toBe('sound')
    expect(s.confirmYes).toBe(false) // 当前关 → 高亮 关
  })

  it('systemMenuChoice 按 label id 映射 choice，不按数组位置猜测', () => {
    const s = createSystemMenu()
    // 公开 state 的防御输入：重排已有合法菜单项，区分 WORD id 与 cursor；
    // 生产 factory 仍使用固定顺序，本例不声称产品允许用户重排菜单。
    s.selection.items.reverse()
    expect(systemMenuChoice(s)).toBe('quit')
    s.selection.cursor = 1
    expect(systemMenuChoice(s)).toBe('sound')
  })
})

describe('Menu cursor boundaries', () => {
  it('cursor 0 Up → 末项 system；末项 Down → 0 status', () => {
    const s = createInGameMenu()
    inGameMenuUp(s)
    expect(s.selection.cursor).toBe(3)
    expect(inGameMenuChoice(s)).toBe('system')
    inGameMenuDown(s)
    expect(s.selection.cursor).toBe(0)
    expect(inGameMenuChoice(s)).toBe('status')
  })

  it('负 defaultCursor 防御归 0（不作为生产记忆游标的合法域证据）', () => {
    expect(createInGameMenu(-1).selection.cursor).toBe(0)
    expect(createSystemMenu(-1).selection.cursor).toBe(0)
  })
})

describe('System menu wrapping and words', () => {
  it('cursor 0 Up → quit；quit Down → save（5 项环绕）', () => {
    const s = createSystemMenu()
    systemMenuUp(s)
    expect(s.selection.cursor).toBe(4)
    expect(systemMenuChoice(s)).toBe('quit')
    systemMenuDown(s)
    expect(s.selection.cursor).toBe(0)
    expect(systemMenuChoice(s)).toBe('save')
  })

  it('defaultCursor 越上界 → 归 0（守卫分支；词表断言在下一条）', () => {
    expect(createSystemMenu(99).selection.cursor).toBe(0)
  })

  it('SystemMenu 词表载入取 flat[11..15] 文案', () => {
    const flat: string[] = []
    flat[11] = '存档X'
    flat[12] = '读档X'
    flat[13] = '音乐X'
    flat[14] = '音效X'
    flat[15] = '退出X'
    setWordTable(flat)
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '存档X',
      '读档X',
      '音乐X',
      '音效X',
      '退出X',
    ])
  })
})
