import { fixedRoutePlan } from './fixed-route-plan.mjs'

// Frozen from the Game 009 checkpoint probe's committed moves and interaction boundaries.
const legs = {
  exterior: {
    id: 'peach-grove-to-palace-exterior',
    scene: 's016',
    start: [114, 48],
    holds: [
      ['ArrowUp', 15],
      ['ArrowRight', 1],
      ['ArrowUp', 5],
      ['ArrowRight', 1],
      ['ArrowUp', 7],
      ['ArrowRight', 2],
      ['ArrowUp', 5],
      ['ArrowRight', 1],
      ['ArrowUp', 1],
      ['ArrowRight', 3],
      ['ArrowUp', 7],
    ],
    completion: { scene: 's019', position: [77, 59], mode: 'ready' },
  },
  guide: {
    id: 'palace-exterior-to-linger-guide',
    scene: 's019',
    start: [77, 59],
    holds: [['ArrowUp', 33]],
    completion: { scene: 's019', position: [77, 26], mode: 'dialogue' },
  },
  interior: {
    id: 'linger-guide-to-palace-interior',
    scene: 's019',
    start: [77, 26],
    holds: [
      ['ArrowUp', 14],
      ['ArrowLeft', 2],
      ['ArrowUp', 3],
      ['ArrowLeft', 1],
      ['ArrowUp', 3],
      ['ArrowLeft', 2],
      ['ArrowUp', 1],
    ],
    completion: { scene: 's020', position: [111, 79], mode: 'ready' },
  },
  chest: {
    id: 'palace-interior-to-miao-saber-chest',
    scene: 's020',
    start: [111, 79],
    holds: [
      ['ArrowUp', 37],
      ['ArrowLeft', 14],
    ],
    completion: { scene: 's020', position: [97, 42], mode: 'ready' },
  },
  water: {
    id: 'miao-saber-chest-to-bath-water',
    scene: 's020',
    start: [97, 42],
    holds: [
      ['ArrowRight', 22],
      ['ArrowUp', 13],
      ['ArrowLeft', 4],
      ['ArrowUp', 7],
      ['ArrowRight', 3],
      ['ArrowDown', 2],
    ],
    completion: { scene: 's020', position: [118, 24], mode: 'ready' },
  },
  linger: {
    id: 'bath-water-to-linger-medicine',
    scene: 's020',
    start: [118, 24],
    holds: [
      ['ArrowUp', 2],
      ['ArrowLeft', 3],
      ['ArrowDown', 7],
      ['ArrowRight', 4],
      ['ArrowDown', 13],
      ['ArrowLeft', 14],
      ['ArrowUp', 18],
      ['ArrowLeft', 9],
    ],
    completion: { scene: 's020', position: [96, 24], mode: 'dialogue' },
  },
}

export function waterMoonPalaceRoutes(engine) {
  return Object.fromEntries(
    Object.entries(legs).map(([id, route]) => [id, fixedRoutePlan(engine, route)]),
  )
}
