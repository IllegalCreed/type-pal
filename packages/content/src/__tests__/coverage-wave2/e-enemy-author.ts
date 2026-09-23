import { checkEnemyHookFlow, type EnemyHookFlow } from '../../enemy-script.js'
import type { RuntimeSceneDef } from '../../runtime-scene.js'
import { validateRuntimeScenes } from '../../validate-runtime.js'

export function enemyFlow(): EnemyHookFlow {
  const flow: EnemyHookFlow = {
    initial: 'one',
    states: {
      one: {
        body: [
          { kind: 'effect', id: 'spawn', effect: { kind: 'summon', enemyId: 'friend', count: 1 } },
          { kind: 'setFallback', fallback: { action: { kind: 'pass' }, chancePercent: 0 } },
        ],
        next: {
          kind: 'commandOutcome',
          commandId: 'spawn',
          outcome: 'succeeded',
          then: { kind: 'advance', state: 'two' },
          else: { kind: 'random', choices: [{ weight: 1, then: { kind: 'stay' } }] },
        },
      },
      two: { body: [{ kind: 'wait', ms: 0 }], next: { kind: 'restart' } },
    },
  }
  checkEnemyHookFlow(flow, 'hook')
  return flow
}
export function runtimeScene(): RuntimeSceneDef {
  const scene: RuntimeSceneDef = {
    id: 's',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'zone',
        zone: true,
        pos: { col: 0, row: 0, height: 0 },
        behaviors: {
          trigger: {
            talk: {
              label: 'Talk',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [{ id: 'start', body: [{ kind: 'wait', ms: 1 }] }],
              },
            },
          },
        },
        hostile: {
          enemyTeamId: 'team',
          onVictory: { kind: 'remove' },
          onPlayerFlee: { kind: 'remain' },
        },
      },
    ],
  }
  validateRuntimeScenes([scene])
  return scene
}
