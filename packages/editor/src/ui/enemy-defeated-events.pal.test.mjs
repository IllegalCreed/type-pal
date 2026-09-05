import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  createEnemyDefeatedPresentationContext,
  presentEnemyDefeatedEvents,
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
    expect(withEvents.filter((enemy) => enemy.onDefeated.length === 3)).toHaveLength(4)
    expect(presentations.every(({ presentation }) => presentation.exactReward)).toBe(true)
    expect(
      presentations.every(({ presentation }) =>
        allNodes(presentation.nodes).every((node) => !node.invalid),
      ),
    ).toBe(true)
    expect(teams.find((team) => team.id === 'team-4')?.slots).toEqual(['enemy-403', 'enemy-403'])
    expect(
      presentEnemyDefeatedEvents(
        enemies.find((enemy) => enemy.id === 'enemy-403').onDefeated,
        context,
      ).compactSummary,
    ).toBe('击败后：11% 获得蜂巢 ×1')
  })
})
