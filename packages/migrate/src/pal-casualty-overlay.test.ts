import { validateActors } from '@type-pal/content'
import { expect, test } from 'vitest'
import { casualtyFixture, casualtyLocaleKeys } from './__tests__/pal-casualty-fixture.js'
import { applyPalCasualtyOverlays, PAL_CASUALTY_LOCALE_KEYS } from './pal-casualty-scripts.js'

test('all four casualty entries preserve actor input and publish exactly the frozen 36 locale keys', () => {
  const input = casualtyFixture()
  const before = structuredClone(input)
  const output = applyPalCasualtyOverlays(input.actors, input.commands, input.objectPlayers)
  validateActors(output.actors)
  expect(PAL_CASUALTY_LOCALE_KEYS).toEqual(casualtyLocaleKeys)
  expect(output.locale).toEqual(
    Object.fromEntries(casualtyLocaleKeys.map((key) => [key, `fixture:${key}`])),
  )
  const expectedActors = structuredClone(before.actors)
  for (const [index, slot, group] of [
    [0, 'friendDeath', 0],
    [1, 'dying', 1],
    [2, 'friendDeath', 2],
    [2, 'dying', 3],
  ] as const) {
    expectedActors[index]!.battler!.casualty = {
      ...expectedActors[index]!.battler!.casualty,
      [slot]: {
        gates: [
          {
            chance: 75,
            branch: {
              lines: casualtyLocaleKeys.slice(group * 9, group * 9 + 9).map((text, index) => ({
                text,
                style: 'bottom' as const,
                ...(index ? { sameCue: true as const } : {}),
              })),
              effects: [],
            },
          },
        ],
        fallback: { lines: [], effects: [] },
      },
    }
  }
  expect(output.actors).toEqual(expectedActors)
  output.actors[0]!.battler!.baseStats.hp = 1
  expect(input).toEqual(before)
})
test('locale-set drift rejects the complete overlay instead of silently dropping a source message', () => {
  const input = casualtyFixture()
  const message = input.commands.find((command) => command.op === 'showDialog')!
  message.messageIndex = 99999
  const before = structuredClone(input)
  expect(() => applyPalCasualtyOverlays(input.actors, input.commands, input.objectPlayers)).toThrow(
    '台词 locale 键与 P0 冻结集合漂移',
  )
  expect(input).toEqual(before)
})

test('a missing friend-death entry prevents publishing the actor overlays', () => {
  const input = casualtyFixture()
  input.objectPlayers[0]!.scriptOnFriendDeath = 0
  expect(() => applyPalCasualtyOverlays(input.actors, input.commands, input.objectPlayers)).toThrow(
    '期望角色 0 friendDeath 入口缺失',
  )
})
