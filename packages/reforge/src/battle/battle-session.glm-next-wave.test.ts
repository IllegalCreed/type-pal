/**
 * TEST-GLM-NEW-G-1 G01：battle-session 公开边界残差。
 * 旧证（battle-session.test.ts / *.flows / battle-host.test.ts）已证 tick 驱动的
 * 回合/终态/取消-in-flight 路径；本文件只补旧题未覆盖的公开合同：
 *   1) 构造边界 playerBaseDefinitionIds 长度守卫（battle-session.ts:373-376）；
 *   2) done 已兑现后的 cancel() 幂等不扰（battle-session.ts:538-539 doneSettled 门）；
 *   3) defeat 终局后公开结算读出（rewards/moneyDelta/collectGained/hiddenCounts）。
 * 全部经现行构造器/驱动器与公开 API；不 mock 被测核心，不裁决新数值规则。
 */
import { describe, expect, test } from 'vitest'
import {
  assertWfCatalogPassesProductionGuards,
  enemyProfile,
  PLAYER_PROFILE,
  wfEnemy,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import { stubGlyphs, stubPalette } from '../__tests__/battle-workflows/controlled-io.js'
import {
  makeWfSession,
  wfLoadedBattleSprite,
} from '../__tests__/battle-workflows/session-driver.js'
import { BattleSession } from './battle-session.js'

/** 微任务冲洗（对齐 W3 settleDone 前置）。 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

/** over 后逐屏确认直至 done 兑现（对齐 W3 settleDone）。 */
const settleDone = async (h: ReturnType<typeof makeWfSession>): Promise<string> => {
  for (let screen = 0; screen < 8; screen += 1) {
    h.idle(350)
    h.press([' '])
    await flush()
  }
  return h.session.done
}

describe('G01 battle-session 公开边界残差', () => {
  test('fixture 合法门：现行驱动器仍产出真实会话', () => {
    expect(() => assertWfCatalogPassesProductionGuards()).not.toThrow()
  })

  test('playerBaseDefinitionIds 长度与 players 不符在构造边界 fail-loud（battle-session.ts:373）', async () => {
    const players = [wfPlayer('p1'), wfPlayer('p2')]
    const enemies = [wfEnemy('e1')]
    const spriteId = 'battle-sprite.player'
    const spriteEntries = new Map([
      [spriteId, wfLoadedBattleSprite(spriteId, PLAYER_PROFILE)],
      [
        enemies[0]!.battleSprite,
        wfLoadedBattleSprite(enemies[0]!.battleSprite, enemyProfile(enemies[0]!.battleSprite)),
      ],
    ])
    const base = {
      palette: stubPalette,
      glyphs: stubGlyphs,
      battleSprites: spriteEntries,
    }
    // 正控对照：长度匹配时现行公开构造器正常建会话。
    const matched = new BattleSession(
      players,
      enemies,
      { ...base, playerBaseDefinitionIds: [spriteId, spriteId] },
      (id) => id,
      () => 0,
    )
    expect(matched.debugPlayers().length).toBe(2)
    // 对照会话不被断言消费：显式接住 cancel 的 AbortError 拒绝，避免未处理拒绝。
    const matchedDone = matched.done.catch(() => 'cancelled' as const)
    matched.cancel()
    await expect(matchedDone).resolves.toBe('cancelled')
    // 负控：单点变异（基础形象 id 少一条）→ 精确守卫消息，绝不静默建会话。
    expect(
      () =>
        new BattleSession(
          players,
          enemies,
          { ...base, playerBaseDefinitionIds: [spriteId] },
          (id) => id,
          () => 0,
        ),
    ).toThrowError(/playerBaseDefinitionIds 长度 1 != players 2/)
  })

  test('done 兑现后的 cancel() 幂等：不扰胜利终态，done 仍精确 resolve victory', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('one-hit', { health: 20, defense: 0, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    await expect(settleDone(h)).resolves.toBe('victory')
    // 终局后取消是显式 no-op（doneSettled 门）：不抛、不改写已 resolve 的 done。
    expect(() => h.session.cancel()).not.toThrow()
    await expect(h.session.done).resolves.toBe('victory')
  })

  test('defeat 终局后公开结算读出：rewards/collectGained 为零、hiddenCounts 键即参战阵容', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 20, maxHp: 20, attackStrength: 1, baseDexterity: 1 })],
      enemies: [wfEnemy('brute', { health: 500, attackStrength: 200, dexterity: 200 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    await expect(settleDone(h)).resolves.toBe('defeat')
    expect(h.session.rewards()).toEqual({ exp: 0, cash: 0 })
    expect(h.session.moneyDelta()).toBe(0)
    expect(h.session.collectGained()).toBe(0)
    expect(Object.keys(h.session.hiddenCounts())).toEqual(['p1'])
    expect(h.session.enemySlotDefs().map((def) => def.id)).toEqual(['brute'])
  })
})
