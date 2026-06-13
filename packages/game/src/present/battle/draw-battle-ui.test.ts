import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../core/game-state.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawBattleUI } from './draw-battle-ui.js'

// drawBattleUI 只读 state 的少数字段(uiState/fAutoAttack/enemyEscapeAnim/battleDialogQueue/players),
// 手搓最小 state 即可(无需 startBattle 全流程)。无 glyphs/uiSpriteFrames → InfoBox 走 drawPartyStatus
// 文字兜底,renderText 用 TOFU_GLYPH 画方块 → fb 有非零像素,可观察"画了/没画"。
function makeWaitState(extra: Partial<BattleState> = {}): BattleState {
  return {
    uiState: 'wait',
    menuState: 'main',
    fAutoAttack: false,
    battleDialogQueue: [],
    players: [{ roleId: 0, status: {} }],
    ...extra,
  } as unknown as BattleState
}

const playerRoles = {
  roles: [{ _name: 'P1', hp: 100, maxHP: 100, mp: 50, maxMP: 50 }],
  // biome-ignore lint/suspicious/noExplicitAny: 测试只用到 roles[roleId] 的 name/hp/mp 字段
} as any

function drawnAnything(state: BattleState): boolean {
  const fb = createFramebuffer()
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  drawBattleUI(fb, state, playerRoles, [], [], gs)
  return fb.indices.some((px) => px !== 0)
}

describe('drawBattleUI 战斗 UI 显隐 gate', () => {
  it('基线:wait 态画底部血量面板(确有像素,防 vacuous 通过)', () => {
    expect(drawnAnything(makeWaitState())).toBe(true)
  })

  // 回归(user 2026-06-14:赵灵儿在队遇草妖,命令菜单已不显示,但血量面板仍闪现)。
  // sdlpal 真值(battle.c:736-797):敌 pre-battle/turnStart 脚本逃跑 → BattleResult≠OnGoing →
  //   主循环 while 首判即 break → PAL_BattleStartFrame/PAL_BattleUIUpdate 从不调用 → 整个战斗 UI
  //   (命令菜单 + 血量 InfoBox)全程不画。我们逃跑动画期 uiState 仍='wait' → 旧逻辑照画 InfoBox。
  it('敌人逃跑动画期(enemyEscapeAnim)整个战斗 UI 不画(对齐 sdlpal 主循环不启动)', () => {
    expect(drawnAnything(makeWaitState({ enemyEscapeAnim: { step: 0 } }))).toBe(false)
  })
})
