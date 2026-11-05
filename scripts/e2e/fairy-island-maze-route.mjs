// Frozen normal-key route through the authored collision maps. Ride expectations
// bind each actual trigger stage to its independently checked dock and waypoints.
export const mazeRoute = [
  {
    keys: ['Up15', 'Left1', 'Up5', 'Right1', 'Up14'],
    stop: [90, 20],
    ride: {
      entity: 'e248',
      stage: 'initial',
      waypoints: [[90, 12]],
      landing: [90, 11],
    },
  },
  {
    keys: ['Right2'],
    stop: [92, 11],
    ride: {
      entity: 'e250',
      stage: 'initial',
      waypoints: [
        [103, 11],
        [103, 26],
        [117, 26],
      ],
      landing: [118, 26],
    },
  },
  {
    keys: ['Up7', 'Left6', 'Up1', 'Left5'],
    stop: [107, 18],
    ride: {
      entity: 'e252',
      stage: 'initial',
      waypoints: [[95, 18]],
      landing: [94, 18],
    },
  },
  {
    keys: ['Left2'],
    stop: [92, 18],
    ride: {
      entity: 'e253',
      stage: 'initial',
      waypoints: [[87, 18]],
      landing: [86, 18],
    },
  },
  {
    keys: ['Up7', 'Right1', 'Up1'],
    stop: [87, 10],
    ride: {
      entity: 'e255',
      stage: 'initial',
      waypoints: [
        [87, -6],
        [78, -6],
      ],
      landing: [77, -6],
    },
  },
  {
    keys: ['Down2'],
    stop: [77, -4],
    ride: {
      entity: 'e259',
      stage: 'initial',
      waypoints: [
        [79, -4],
        [79, -8],
        [75, -8],
        [75, -5],
      ],
      landing: [76, -5],
    },
  },
  {
    keys: ['Left1'],
    stop: [75, -5],
    ride: {
      entity: 'e259',
      stage: 'legacy-002',
      waypoints: [[64, -5]],
      landing: [63, -5],
    },
  },
  {
    keys: ['Left3', 'Up3', 'Right7', 'Up4', 'Right1', 'Up1', 'Right2', 'Up3'],
    stop: [70, -16],
    pickup: { entity: 'e263', items: ['67', '68', '69', '70', '71'] },
  },
  {
    keys: ['Down3', 'Left2', 'Down1', 'Left1', 'Down4', 'Left7', 'Down3', 'Right4'],
    stop: [64, -5],
    ride: {
      entity: 'e259',
      stage: 'legacy-003',
      waypoints: [[75, -5]],
      landing: [76, -5],
    },
  },
  {
    keys: ['Right1', 'Up2'],
    stop: [77, -7],
    ride: {
      entity: 'e256',
      stage: 'initial',
      waypoints: [[77, -11]],
      landing: [77, -12],
    },
  },
  {
    keys: ['Up17', 'Left13'],
    stop: [64, -29],
    hammer: { entity: 'e239', facing: 'left' },
  },
  {
    keys: ['Right11', 'Down1', 'Right1', 'Down1', 'Right1', 'Down16'],
    stop: [77, -11],
    ride: {
      entity: 'e256',
      stage: 'legacy-002',
      waypoints: [[77, -7]],
      landing: [77, -6],
    },
  },
  {
    keys: ['Right1'],
    stop: [78, -6],
    ride: {
      entity: 'e255',
      stage: 'legacy-002',
      waypoints: [
        [87, -6],
        [87, 10],
      ],
      landing: [87, 11],
    },
  },
  {
    keys: ['Left7', 'Down1'],
    stop: [80, 12],
    ride: {
      entity: 'e257',
      stage: 'initial',
      waypoints: [
        [80, 17],
        [52, 17],
      ],
      landing: [51, 17],
    },
  },
  {
    keys: ['Left6'],
    stop: [45, 17],
    hammer: { entity: 'e237', facing: 'left' },
  },
  {
    keys: ['Right7'],
    stop: [52, 17],
    ride: {
      entity: 'e257',
      stage: 'legacy-002',
      waypoints: [
        [80, 17],
        [80, 12],
      ],
      landing: [80, 11],
    },
  },
  {
    keys: ['Up9', 'Left7'],
    stop: [73, 2],
    ride: {
      entity: 'e258',
      stage: 'initial',
      waypoints: [[55, 2]],
      landing: [54, 2],
    },
  },
  {
    keys: ['Down5', 'Left1', 'Down1', 'Left7', 'Up9', 'Left15'],
    stop: [31, -1],
    hammer: { entity: 'e238', facing: 'left' },
  },
  {
    keys: ['Right14', 'Down1', 'Right1', 'Down8', 'Right7', 'Up1', 'Right1', 'Up5', 'Right1'],
    stop: [55, 2],
    ride: {
      entity: 'e258',
      stage: 'legacy-002',
      waypoints: [[73, 2]],
      landing: [74, 2],
    },
  },
  {
    keys: ['Right6', 'Down9', 'Right5', 'Down5', 'Right1', 'Down2', 'Right1'],
    stop: [87, 18],
    ride: {
      entity: 'e253',
      stage: 'legacy-002',
      waypoints: [[92, 18]],
      landing: [93, 18],
    },
  },
  {
    keys: ['Right2'],
    stop: [95, 18],
    ride: {
      entity: 'e252',
      stage: 'legacy-002',
      waypoints: [[107, 18]],
      landing: [108, 18],
    },
  },
  {
    keys: ['Right3', 'Down3'],
    stop: [111, 21],
    ride: {
      entity: 'e251',
      stage: 'initial',
      waypoints: [[111, 45]],
      landing: [111, 46],
    },
  },
  {
    keys: ['Down3', 'Right12', 'Up1', 'Right1', 'Up1', 'Right1', 'Up1', 'Right1', 'Up11'],
    stop: [126, 35],
    hammer: { entity: 'e242', facing: 'up' },
  },
  {
    keys: [
      'Down11',
      'Left1',
      'Down1',
      'Left1',
      'Down1',
      'Left1',
      'Down1',
      'Left10',
      'Up1',
      'Left1',
      'Up1',
      'Left1',
      'Up2',
    ],
    stop: [111, 45],
    ride: {
      entity: 'e251',
      stage: 'legacy-002',
      waypoints: [[111, 21]],
      landing: [111, 20],
    },
  },
  {
    keys: ['Up1', 'Right8', 'Up11', 'Left10', 'Up1', 'Left1', 'Up1', 'Left1', 'Up9'],
    stop: [107, -3],
    hammer: { entity: 'e240', facing: 'up' },
  },
  {
    keys: [
      'Down11',
      'Right10',
      'Down1',
      'Right1',
      'Down1',
      'Right1',
      'Down9',
      'Left1',
      'Down7',
      'Left1',
    ],
    stop: [117, 26],
    ride: {
      entity: 'e250',
      stage: 'legacy-002',
      waypoints: [
        [103, 26],
        [103, 11],
        [92, 11],
      ],
      landing: [91, 11],
    },
  },
  {
    keys: ['Left1', 'Down1'],
    stop: [90, 12],
    ride: {
      entity: 'e248',
      stage: 'legacy-002',
      waypoints: [[90, 20]],
      landing: [90, 21],
    },
  },
  {
    keys: ['Down2', 'Left2', 'Down1', 'Left1', 'Down2', 'Left2'],
    stop: [85, 26],
    ride: {
      entity: 'e243',
      stage: 'initial',
      waypoints: [[80, 26]],
      landing: [79, 26],
    },
  },
  {
    keys: ['Up1'],
    stop: [79, 25],
    ride: {
      entity: 'e244',
      stage: 'initial',
      waypoints: [
        [79, 12],
        [56, 12],
      ],
      landing: [55, 12],
    },
  },
  {
    keys: ['Down1'],
    stop: [55, 13],
    ride: {
      entity: 'e249',
      stage: 'initial',
      waypoints: [
        [55, 29],
        [61, 29],
      ],
      landing: [62, 29],
    },
  },
  {
    keys: ['Right1', 'Down1', 'Right1', 'Down1', 'Right1', 'Down12', 'Right13'],
    stop: [78, 43],
    hammer: { entity: 'e241', facing: 'right' },
  },
  {
    keys: ['Left11', 'Up1', 'Left1', 'Up1', 'Left1', 'Up12', 'Left4'],
    stop: [61, 29],
    ride: {
      entity: 'e249',
      stage: 'legacy-002',
      waypoints: [
        [55, 29],
        [55, 13],
      ],
      landing: [55, 12],
    },
  },
  {
    keys: ['Right1'],
    stop: [56, 12],
    ride: {
      entity: 'e244',
      stage: 'legacy-002',
      waypoints: [
        [79, 12],
        [79, 25],
      ],
      landing: [79, 26],
    },
  },
  {
    keys: ['Right1'],
    stop: [80, 26],
    ride: {
      entity: 'e243',
      stage: 'legacy-002',
      waypoints: [[85, 26]],
      landing: [86, 26],
    },
  },
  {
    keys: ['Right8'],
    stop: [94, 26],
    ride: {
      entity: 'e245',
      stage: 'initial',
      waypoints: [
        [100, 26],
        [100, 3],
      ],
      landing: [100, 2],
    },
  },
  {
    keys: ['Up1', 'Right1', 'Up2'],
    stop: [101, -1],
    ride: {
      entity: 'e247',
      stage: 'initial',
      waypoints: [[101, -11]],
      landing: [101, -12],
    },
  },
  {
    keys: ['Up1', 'Left2', 'Up1'],
    stop: [99, -14],
    pickup: { entity: 'e235', items: ['108'] },
  },
  {
    keys: ['Down1', 'Right1', 'Down1', 'Right1', 'Down1'],
    stop: [101, -11],
    ride: {
      entity: 'e247',
      stage: 'legacy-002',
      waypoints: [[101, -1]],
      landing: [101, 0],
    },
  },
  {
    keys: ['Down1', 'Left1', 'Down2'],
    stop: [100, 3],
    ride: {
      entity: 'e245',
      stage: 'legacy-002',
      waypoints: [
        [100, 26],
        [94, 26],
      ],
      landing: [93, 26],
    },
  },
  {
    keys: ['Left1', 'Up1', 'Left3'],
    stop: [89, 25],
    exit: 'e262',
  },
]

export const openedMazeRoute = { keys: ['Up52'], stop: [89, -27], exit: 'e265' }
