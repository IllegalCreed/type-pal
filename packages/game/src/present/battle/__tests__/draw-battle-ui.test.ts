import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { DialogBoxState } from '../../../core/game-state.js'
import { glyphsOf } from '../../__tests__/glyph-fixtures.js'
import { pixel, SENTINEL } from '../../__tests__/raster-fixtures.js'
import { startDialogLine } from '../../dialog-box.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'
import { battleEnemy, battlePlayer, spriteEnemy, spriteRole } from './battle-sprite-state.js'
import {
  filledUiFrames,
  initialUiGameState,
  namedRole,
  paintUi,
  singleEnemyUiState,
  transparentUiFrames,
  uiBattleState,
  uiGameState,
} from './battle-ui-fixtures.js'

function fbHasWrites(fb: ReturnType<typeof createFramebuffer>): boolean {
  for (let i = 0; i < fb.indices.length; i++) {
    if (fb.indices[i] !== 0) return true
  }
  return false
}

const UI = filledUiFrames()

function keptDialogBox(): DialogBoxState {
  return {
    shownLines: [],
    currentLineText: null,
    typingFrames: 0,
    charsRevealed: 0,
    dialogLineCount: 0,
    phase: 'line-done',
    style: 'bottom',
    fontColor: 1,
    shadow: false,
    keyIconBlink: false,
  }
}

describe('battle UI visibility', () => {
  // 回归(user 2026-06-14:赵灵儿在队遇草妖,底部我方血量/头像/状态面板仍画着)。
  //   sdlpal(battle.c:736-797):草妖类敌的 pre-battle/turnStart 脚本逃跑 → 主循环从不启动 →
  //   PAL_BattleUIUpdate 从不调用 → PlayerInfoBox 全程不画。tickPreBattle 一进 selectAction 即置
  //   uiState='wait',但 selectionStartedForTurn=turn 要等 turnStart 脚本跑完(startFirstReadyPlayerSelection)
  //   才置;草妖逃跑永不到那步 → 此过渡帧/逃跑期 selectionStartedForTurn ≠ turn → InfoBox 不画。
  it('玩家回合未真正开始(selectionStartedForTurn≠turn)不画底部 InfoBox(草妖回归)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'wait',
      turn: 1,
      selectionStartedForTurn: undefined,
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  it('敌人逃跑动画期(enemyEscapeAnim)整个战斗 UI 不画', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    // selectionStartedForTurn===turn(默认),但 enemyEscapeAnim 早退在前 → 仍整体不画
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'wait',
      enemyEscapeAnim: { step: 0 },
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  // 回归(user 2026-06-14:石长老vs盖罗娇剧情自动战开场闪战斗 UI)。
  //   sdlpal uibattle.c:839 PAL_BattleUIUpdate 的 fAutoBattle 分支处理完自动 commit 后 `goto end`,
  //   跳过 PlayerInfoBox(888) + 行动菜单 + 箭头 —— fAutoBattle(0x8A 整场自动)玩家全程不交互、无任何 UI。
  it('fAutoBattle(整场自动)期间整个战斗 UI 不画(对齐 sdlpal goto end)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      fAutoBattle: true, // 即便 selectMove(默认 selectionStartedForTurn===turn)也不画
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  // ---------- 对话显示时**整个战斗 UI 都不画**(菜单 + 血量信息框都隐藏,user 2026-05-31)----------

  it('对话队列非空 —— 战斗 UI 全不画(菜单 + 信息框)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
      battleDialogQueue: [{ text: '林月如', style: 'bottom' }],
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false) // 对话期连血量面板都不画
  })

  it('gs.dialogBox 非空 —— 战斗 UI 全不画', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    const gs = uiGameState({ dialogBox: startDialogLine('甲', { style: 'bottom' }) })
    drawBattleUI(fb, state, playerRoles, [], [], gs, undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  it('hidden(perform 阶段)—— 啥都不画(信息框仅选择阶段;sdlpal Phase!=PerformAction)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'hidden',
      selectingPlayerIdx: undefined,
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false) // perform 期信息框隐藏,飘字由其它 draw 层负责
  })
})

describe('kept battle dialog visibility', () => {
  it('dialogBoxKept 让攻击图标和底部姓名都保持哨兵', () => {
    const gs = initialUiGameState()
    gs.dialogBoxKept = keptDialogBox()
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)]),
      roles: { roles: [namedRole(0)] },
      frames: transparentUiFrames(),
      gs,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 27, 140)).toBe(SENTINEL)
    expect(pixel(fb, 5, 175)).toBe(SENTINEL)
  })
})
