import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  createEnemyDefeatedPresentationContext,
  findEditableEnemyDefeatedItemReward,
  presentEnemyDefeatedEvents,
  replaceEditableEnemyDefeatedItemReward,
} from './enemy-defeated-events.js'

const palContent = new URL('../../../../projects/pal/content/', import.meta.url)
const readJson = (name) => JSON.parse(readFileSync(new URL(name, palContent), 'utf8'))

describe('PAL defeated event coverage', () => {
  test('15 个现存敌人全部解析为可读奖励，team-4 双蜜蜂仍逐槽保留', () => {
    const enemies = readJson('enemies.json')
    const items = readJson('items.json')
    const locale = readJson('locale.json')
    const teams = readJson('enemy-teams.json')
    const context = createEnemyDefeatedPresentationContext({
      items,
      locale,
      assetCatalog: { version: 1, assets: {} },
      worldVariables: {},
      actors: [],
      scenes: [],
    })
    const withEvents = enemies.filter((enemy) => enemy.onDefeated?.length)
    const presentations = withEvents.map((enemy) => ({
      enemy,
      presentation: presentEnemyDefeatedEvents(enemy.onDefeated, context),
    }))
    const allNodes = (nodes) =>
      nodes.flatMap((node) => [node, ...(node.arms ?? []).flatMap((arm) => allNodes(arm.nodes))])

    expect(withEvents).toHaveLength(15)
    expect(withEvents.filter((enemy) => enemy.onDefeated.length === 2)).toHaveLength(11)
    const conditional = withEvents.filter(({ onDefeated }) => onDefeated[0].kind === 'branch')
    expect(
      conditional.map(({ id, onDefeated }) => [
        id,
        findEditableEnemyDefeatedItemReward(onDefeated)?.probability,
      ]),
    ).toEqual([
      ['enemy-400', 21],
      ['enemy-401', 19],
      ['enemy-403', 11],
      ['enemy-404', 15],
    ])
    expect(presentations.every(({ presentation }) => presentation.exactReward)).toBe(true)
    expect(
      presentations.every(({ presentation }) =>
        allNodes(presentation.nodes).every((node) => !node.invalid),
      ),
    ).toBe(true)
    expect(teams.find((team) => team.id === 'team-4')?.slots).toEqual(['enemy-403', 'enemy-403'])
    const honey = conditional.find(({ id }) => id === 'enemy-403').onDefeated
    expect(presentEnemyDefeatedEvents(honey, context).compactSummary).toBe(
      '击败后：11% 获得蜂巢 ×1',
    )
    const reward = findEditableEnemyDefeatedItemReward(honey)
    expect(
      replaceEditableEnemyDefeatedItemReward(honey, reward, {
        itemId: '115',
        count: 2,
        probability: 30,
      }),
    ).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 30 },
        then: [{ kind: 'giveItem', itemId: '115', count: 2 }, honey[0].then[1]],
      },
    ])
  })
})
