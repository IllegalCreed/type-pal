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
        ['ArrowRight', 10],
        ['ArrowDown', 1],
        ['ArrowRight', 31],
        ['ArrowDown', 9],
        ['ArrowRight', 15],
        ['ArrowDown', 6],
        ['ArrowRight', 1],
        ['ArrowDown', 8],
        ['ArrowRight', 1],
        ['ArrowDown', 9],
        ['ArrowRight', 1],
        ['ArrowDown', 6],
        ['ArrowRight', 1],
        ['ArrowDown', 2],
        ['ArrowRight', 1],
        ['ArrowDown', 1],
        ['ArrowRight', 3],
        ['ArrowDown', 1],
        ['ArrowRight', 1],
        ['ArrowDown', 1],
        ['ArrowRight', 6],
        ['ArrowDown', 7],
        ['ArrowRight', 1],
        ['ArrowDown', 7],
        ['ArrowRight', 3],
        ['ArrowDown', 1],
        ['ArrowRight', 4],
        ['ArrowDown', 6],
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
