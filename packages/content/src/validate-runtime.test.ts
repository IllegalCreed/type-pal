import { describe, expect, test } from 'vitest'
import { validateRuntimeScenes } from './validate-runtime.js'

const target = { scene: 's001', entity: 'e001' }
const flow = {
  kind: 'stages' as const,
  initial: 'start',
  stages: [{ id: 'start', body: [{ kind: 'hideEntity' as const, target, ticks: 8 }] }],
}

function scene(over: Record<string, unknown> = {}) {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e001',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'default',
        pages: [{ id: 'default', label: 'default', trigger: 'talk' }],
        behaviors: { trigger: { talk: { label: 'talk', order: 0, flow } } },
      },
    ],
    ...over,
  }
}

describe('canonical runtime scene validation', () => {
  test('accepts lifecycle commands in nested flow and explicit hostile policy', () => {
    expect(() =>
      validateRuntimeScenes([
        scene({
          entities: [
            {
              ...scene().entities[0],
              hostile: {
                enemyTeamId: 'team-1',
                onVictory: { kind: 'hide', ticks: 800 },
                onPlayerFlee: { kind: 'suspend', ticks: 15 },
              },
            },
          ],
        }),
      ]),
    ).not.toThrow()
  })

  test('rejects old hostile fields and nested vanish in any script channel', () => {
    expect(() =>
      validateRuntimeScenes([
        scene({
          entities: [
            {
              ...scene().entities[0],
              hostile: {
                enemyTeamId: 'team-1',
                respawnSeconds: 80,
                onVictory: { kind: 'remove' },
                onPlayerFlee: { kind: 'remain' },
              },
            },
          ],
        }),
      ]),
    ).toThrow(/未知字段/)
    expect(() =>
      validateRuntimeScenes([
        scene({
          hooks: {
            onEnter: {
              initial: 'intro',
              variants: {
                intro: {
                  label: 'intro',
                  order: 0,
                  flow: { ...flow, stages: [{ id: 'start', body: [{ kind: 'vanishEntity' }] }] },
                },
              },
            },
          },
        }),
      ]),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('rejects facing on a current zone entity', () => {
    expect(() =>
      validateRuntimeScenes([
        scene({
          entities: [
            {
              id: 'zone-1',
              zone: true,
              pos: { col: 1, row: 1, height: 0 },
              facing: 'down',
            },
          ],
        }),
      ]),
    ).toThrow(/zone 无朝向/)
  })
})
