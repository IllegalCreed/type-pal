import { fixedRoutePlan } from './fixed-route-plan.mjs'

const scene = 's016'

/** Same legal movement and facing in both engines. Each runner verifies its own native commits. */
export function fairyPoolRoutes(engine) {
  return {
    herb: fixedRoutePlan(engine, {
      id: 'peach-grove-arrival-to-herb',
      scene,
      start: [61, 42],
      holds: [
        ['ArrowUp', 52],
        ['ArrowLeft', 7],
        ['ArrowUp', 1],
        ['ArrowLeft', 10],
      ],
      completion: { scene, position: [44, -11], mode: 'ready' },
    }),
    pool: fixedRoutePlan(engine, {
      id: 'herb-to-pool-clothes',
      scene,
      start: [44, -11],
      holds: [
        ['ArrowDown', 2],
        ['ArrowRight', 5],
        ['ArrowDown', 29],
        ['ArrowRight', 37],
        ['ArrowDown', 10],
        ['ArrowRight', 10],
        ['ArrowDown', 23],
        ['ArrowRight', 5],
        ['ArrowDown', 1],
        ['ArrowRight', 22],
      ],
      completion: { scene, position: [123, 54], mode: 'ready' },
    }),
    return: fixedRoutePlan(engine, {
      id: 'return-to-pool-after-first-cutscene',
      scene,
      start: [97, 55],
      holds: [['ArrowRight', 25]],
      completion: { scene, position: [122, 55], mode: 'dialogue' },
    }),
  }
}
