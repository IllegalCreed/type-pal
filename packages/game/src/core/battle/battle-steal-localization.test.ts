import type { Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { isolateLanguagePreference } from '../../localization/language.test-fixtures.js'
import { makeItem } from '../../present/__tests__/menu-state-fixtures.js'
import { runScript } from '../event-system.js'
import { setEnglishWordTable } from '../word-lookup.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { tickBattleDialog } from './battle-system.js'

const input: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference('en')
})
afterEach(() => {
  setEnglishWordTable({})
  restoreLanguage()
})

it.each([
  { itemId: 110, name: "God's Tea", chineseName: '神仙茶' },
  { itemId: 135, name: 'Knock-Out', chineseName: '迷魂香' },
])('battle stealing displays the literal WORD name $name in red without losing punctuation', ({
  itemId,
  name,
  chineseName,
}) => {
  setEnglishWordTable({ [itemId]: name })
  const commands: Command[] = [{ op: 'raw', opcode: 0x6a, operands: [0, 0, 0] }, { op: 'end' }]
  const { gs, state, bus } = createBattleLifecycleFixture({ commands })
  const enemy = state.enemies[0]!
  enemy.e.stealItem = itemId
  enemy.e.stealItemCount = 1
  runScript({
    commands,
    ip: 0,
    bus,
    runtimeMode: 'battle',
    battleCtx: {
      gs,
      state,
      caster: { type: 'enemy', idx: 0 },
      target: { type: 'enemy', idx: 0 },
      items: [makeItem(itemId, chineseName)],
    },
  })
  tickBattleDialog(state, gs, input)
  expect(gs.dialogBox?.currentLineText).toBe(`Got ${name}`)
  expect(gs.dialogBox?.currentLineColors?.slice(4)).toEqual(Array<number>(name.length).fill(0x17))
  expect(gs.inventory).toEqual([{ itemId, count: 1 }])
  expect(enemy.e.stealItemCount).toBe(0)
})
