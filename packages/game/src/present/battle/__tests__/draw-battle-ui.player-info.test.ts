import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  battleGs,
  battleState,
  role,
  rolesOf,
  battlePlayer as rosterPlayer,
} from '../../__tests__/battle-render-fixtures.js'
import { glyphsOf } from '../../__tests__/glyph-fixtures.js'
import { yellowDigit } from '../../__tests__/menu-ui-fixtures.js'
import { at, pixel, SENTINEL, solidIndexedImage } from '../../__tests__/raster-fixtures.js'
import { battleView } from '../../__tests__/render-input-snapshots.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'
import { battleEnemy, battlePlayer, spriteEnemy, spriteRole } from './battle-sprite-state.js'
import {
  filledUiFrames,
  initialUiGameState,
  namedRole,
  paintUi,
  selectionFrames,
  singleEnemyUiState,
  transparentUiFrames,
  uiBattleState,
  uiGameState,
} from './battle-ui-fixtures.js'

/** 统计顶部50行写入；主菜单图标在底部，这里只观察缺帧兜底的顶部空域。 */
function topRegionWrites(fb: ReturnType<typeof createFramebuffer>): number {
  let n = 0
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x < 320; x++) {
      if (fb.indices[y * 320 + x] !== 0) n++
    }
  }
  return n
}

const UI = filledUiFrames()

describe('battle UI party information', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(0))

  afterEach(() => vi.restoreAllMocks())

  it('无 uiSpriteFrames —— 优雅跳过 sprite(只画底部状态栏,不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], uiGameState())).not.toThrow()
    // 4 图标在底部(y 140-180),顶部 y<50 无写入
    expect(topRegionWrites(fb)).toBe(0)
    expect(fb.indices[175 * 320 + 5]).toBe(1) // 缺资源文字兜底姓名首点
  })

  it('PAL_PlayerInfoBox —— 活人画乱/定/眠/封状态字,死亡时不画', () => {
    const aliveFb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0, { hp: 123 })] }
    const player = battlePlayer(0)
    player.status = { ...player.status, confused: 2, paralyzed: 2, sleep: 2, silence: 2 }
    const aliveState = uiBattleState([player], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })

    drawBattleUI(aliveFb, aliveState, playerRoles, [], [], uiGameState(), undefined, UI)
    for (const color of [0x5f, 0xbf, 0x0e, 0x3c]) {
      let writes = 0
      for (let y = 160; y < 200; y++) {
        for (let x = 80; x < 170; x++) if (aliveFb.indices[y * 320 + x] === color) writes++
      }
      expect(writes).toBeGreaterThan(0)
    }

    const deadFb = createFramebuffer()
    const deadRoles: PlayerRoles = { roles: [spriteRole(0, { hp: 0 })] }
    const deadState = uiBattleState([player], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    drawBattleUI(deadFb, deadState, deadRoles, [], [], uiGameState(), undefined, UI)
    for (const color of [0x5f, 0xbf, 0x0e, 0x3c]) {
      expect(deadFb.indices.includes(color)).toBe(false)
    }
  })

  it('fAutoAttack —— 信息框隐藏(sdlpal !fAutoAttack)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
      fAutoAttack: true,
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    let bottomWrites = 0
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 200; x++) if (fb.indices[y * 320 + x] !== 0) bottomWrites++
    }
    expect(bottomWrites).toBe(0) // auto 模式不画信息框
  })
})

describe('battle party status and resource fallback', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('活人的乱和封落在信息框偏移上', () => {
    const player = battlePlayer(0)
    player.status = { ...player.status, confused: 2, silence: 2 }
    const fb = paintUi({
      state: singleEnemyUiState([player]),
      roles: { roles: [namedRole(0, { hp: 100 })] },
      frames: transparentUiFrames(),
      glyphs: glyphsOf(['乱', '封']),
    })
    expect(pixel(fb, 126, 184)).toBe(0x5f)
    expect(pixel(fb, 146, 185)).toBe(0x3c)
  })

  it('中毒头像按毒色高半字节重染，不再写出原索引', () => {
    const frames = transparentUiFrames()
    frames[48] = solidIndexedImage(1, 1, 0x30)
    const gs = initialUiGameState()
    gs.partyMembers = [0]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 0 }
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)]),
      roles: { roles: [namedRole(0, { hp: 100 })] },
      frames,
      gs,
      poisons: new Map([[552, { level: 1, color: 64 }]]),
    })
    expect(pixel(fb, 89, 161)).toBe(0x40)
  })

  it('界面帧数不超过 48 时改画文字姓名，不画头像', () => {
    const frames = transparentUiFrames(48)
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)]),
      roles: { roles: [namedRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 5, 175)).toBe(1)
    expect(pixel(fb, 89, 161)).toBe(SENTINEL)
  })

  it('帧数刚到 49 时画头像，底部文字姓名保持哨兵', () => {
    const frames = transparentUiFrames(49)
    frames[48] = solidIndexedImage(1, 1, 0x30)
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)]),
      roles: { roles: [namedRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 89, 161)).toBe(0x30)
    expect(pixel(fb, 5, 175)).toBe(SENTINEL)
  })
})

describe('battle missing-role fallback', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('防御输入:未定义的roleId不画HP，已定义角色仍画', () => {
    // roleId 99 不是可组队角色。正控是已定义的 role 0；99 只验证缺资料时跳过该槽。
    const frames = selectionFrames()
    const gs = battleGs()
    const cast = rolesOf([role(0, { hp: 11 })])
    const missing = battleState([rosterPlayer(0), rosterPlayer(99)], [], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    const fb = createFramebuffer()
    const before = battleView(missing)
    drawBattleUI(fb, missing, cast, [], [], gs, undefined, frames)
    expect(battleView(missing)).toEqual(before)
    expect(at(fb, 135, 170)).toBe(yellowDigit(1))
    expect(at(fb, 212, 170)).toBe(0)
  })
})
