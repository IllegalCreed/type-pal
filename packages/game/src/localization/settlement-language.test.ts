import { afterEach, expect, it, vi } from 'vitest'
import { makeUiFrames } from '../__tests__/glm-phase1-leaves/present-fixtures.js'
import { createBattleLifecycleFixture } from '../core/battle/battle-lifecycle.test-fixtures.js'
import { buildBattleWonSettlement } from '../core/battle/battle-settlement.js'
import { setEnglishWordTable, setWordTable } from '../core/word-lookup.js'
import { drawBattleSettlement } from '../present/battle/draw-battle-settlement.js'
import * as font from '../present/font.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import { setLanguage } from './language.js'

afterEach(() => {
  vi.restoreAllMocks()
  setLanguage('zh-CN')
  setWordTable([])
  setEnglishWordTable({})
})

it('translates an already-created settlement by role and magic identities without changing its rewards', () => {
  const f = createBattleLifecycleFixture({
    partyMembers: [3],
    role: { name: 40, _name: '巫后', level: 1 },
    levelUpMagic: [
      [
        { level: 0, magic: 0 },
        { level: 0, magic: 0 },
        { level: 0, magic: 0 },
        { level: 2, magic: 349 },
      ],
    ],
  })
  f.state.phase = 'won'
  f.state.enemies[0]!.defeated = true
  f.state.enemies[0]!.e.health = 0
  f.state.expGained = 100
  f.state.cashGained = 0
  const words: string[] = []
  words[40] = '巫后'
  words[349] = '天师符法'
  setWordTable(words)
  setEnglishWordTable({ '40': 'Queen', '349': 'RuneCast', '48': 'Lv', '32': 'Up' })
  buildBattleWonSettlement(f.gs, f.state, f.resources)
  const learned = f.state.settlement?.screens.find((screen) => screen.kind === 'learn-magic')
  const level = f.state.settlement?.screens.find((screen) => screen.kind === 'level-up')
  if (!learned || !level) throw new Error('legitimate level-up fixture must learn magic 349')
  expect(learned.data.name).toBe('巫后')
  const restored = parseImportedSave(serializeSave(f.gs))
  expect(
    restored.battleState?.settlement?.screens.find((screen) => screen.kind === 'learn-magic')?.data
      .magicId,
  ).toBe(349)
  const before = JSON.stringify(f.gs.PlayerRolesRuntime)
  setLanguage('en')
  const spy = vi.spyOn(font, 'renderText')
  for (const screen of [learned, level]) {
    drawBattleSettlement({
      fb: createFramebuffer(),
      screen,
      uiSpriteFrames: makeUiFrames(),
      roleNames: f.gs.PlayerRolesRuntime.rgwName,
    })
  }
  const displayed = spy.mock.calls.map((call) => call[1])
  expect(displayed).toContain('Queen')
  expect(displayed).toContain('RuneCast')
  expect(displayed).toContain('QueenLvUp')
  expect(JSON.stringify(f.gs.PlayerRolesRuntime)).toBe(before)
})
