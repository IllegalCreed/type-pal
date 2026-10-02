import {
  type AuthorCommand,
  type AuthorScriptFlow,
  type BaseStateTransition,
  type FlowCursor,
  type RuntimeCommand,
  type RuntimeScriptFlow,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import scene009 from '../../../projects/pal/content/scenes/s009.json' with { type: 'json' }
import scene023 from '../../../projects/pal/content/scenes/s023.json' with { type: 'json' }
import scene050 from '../../../projects/pal/content/scenes/s050.json' with { type: 'json' }
import scene084 from '../../../projects/pal/content/scenes/s084.json' with { type: 'json' }
import scene091 from '../../../projects/pal/content/scenes/s091.json' with { type: 'json' }
import scene100 from '../../../projects/pal/content/scenes/s100.json' with { type: 'json' }
import scene111 from '../../../projects/pal/content/scenes/s111.json' with { type: 'json' }
import scene127 from '../../../projects/pal/content/scenes/s127.json' with { type: 'json' }
import scene148 from '../../../projects/pal/content/scenes/s148.json' with { type: 'json' }
import { sha256Bytes } from './hash.js'
import { compileRuntimeScriptFlow, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

// Historical graph cuts are isolated evidence; these twelve current author flows use ordinary steps.
const candidates = [
  ['s023/e437/default', 1, 'ffbc0d2e77c27189a8876d875ce536a2997d209454a5c1fc4965acc0d0239ccc'],
  ['s050/e845/default', 1, '8db2854702d11340882667bfddbc017c2e2bf2dc6435e4a64fd24ea8163b2a3b'],
  ['s050/e846/default', 1, '8db2854702d11340882667bfddbc017c2e2bf2dc6435e4a64fd24ea8163b2a3b'],
  ['s084/e1583/legacy-001', 1, 'e96e5871118bbbb48803ad5496e026fdd4b4fb1d35295bc4d5d4eb1e6e52a4a5'],
  ['s084/e1584/legacy-001', 1, 'e96e5871118bbbb48803ad5496e026fdd4b4fb1d35295bc4d5d4eb1e6e52a4a5'],
  ['s100/e1837/default', 1, 'c7088915ea27862cbf942ec242ba5258cd5364d861098fcf95f8109d441ba486'],
  ['s111/e2085/default', 1, 'b542b51efd0fa509a1dfc29b63f908df6fa180b26be775e838e34c72b67a1511'],
  ['s127/e2224/default', 1, 'a95721b43372133dbc78c2e30ddcf6e43709958e8c48dee8c7d01a059a68c600'],
  ['s009/e188/default', 3, 'a642c3e3024db9ab65bb609bde1b188f3f5429ce57f4d8dea970585912b4bc3f'],
  ['s100/e1817/default', 2, 'cc0371f27446aa9207b942750ce4985e0d5628d7f10a17974f6d16d19cfc9b8e'],
  ['s100/e1825/default', 3, '5e3b98f3bcad33295018b5f9ffc3665959acb28c12209ac062bc2100576af44c'],
  ['s148/e2433/default', 2, '11047c630b9ab18789ada454fef9bfbe669a9ad0c0d35f85bedd709e27b9f41e'],
] as const

const scenes = validateAuthorScenes([
  scene009,
  scene023,
  scene050,
  scene084,
  scene091,
  scene100,
  scene111,
  scene127,
  scene148,
])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const digest = 'c'.repeat(64)
type Machine = Extract<RuntimeScriptFlow, { kind: 'stateMachine' }>['machine']
type Commands = Machine['states'][string]['body']

interface HistoricalShape {
  id: string
  label: string
  initial: string
  states: Record<
    string,
    {
      label: string
      stage: string
      path: number[]
      offset: number
      count: number
      next: BaseStateTransition
      confirm?: boolean
    }
  >
}

const historicalShapes: Record<string, HistoricalShape> = {
  's023/e437/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 4,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [3],
        offset: 0,
        count: 0,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 4,
        count: 1,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's050/e845/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 3,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's050/e846/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 3,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's084/e1583/legacy-001': {
    id: 'confirm-decisions',
    label: '触发行为 1',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '触发行为 1 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '触发行为 1 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 8,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's084/e1584/legacy-001': {
    id: 'confirm-decisions',
    label: '触发行为 1',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '触发行为 1 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '触发行为 1 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 8,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's100/e1837/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 87,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's111/e2085/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 0,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 3,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's127/e2224/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 0,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 6,
        next: {
          kind: 'restart',
        },
      },
    },
  },
  's009/e188/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-002',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-002': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 3,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-002',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-002-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-002-yes',
          },
        },
        confirm: true,
      },
      'decision-002-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [4],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-002-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 5,
        count: 18,
        next: {
          kind: 'advance',
          state: 'legacy-002',
        },
      },
      'legacy-002': {
        label: '步骤 legacy-002',
        stage: 'legacy-002',
        path: [],
        offset: 0,
        count: 1,
        next: {
          kind: 'advance',
          state: 'legacy-003',
        },
      },
      'legacy-003': {
        label: '步骤 legacy-003',
        stage: 'legacy-003',
        path: [],
        offset: 0,
        count: 1,
        next: {
          kind: 'stay',
        },
      },
    },
  },
  's100/e1817/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 7,
        next: {
          kind: 'advance',
          state: 'legacy-002',
        },
      },
      'legacy-002': {
        label: '步骤 legacy-002',
        stage: 'legacy-002',
        path: [],
        offset: 0,
        count: 1,
        next: {
          kind: 'stay',
        },
      },
    },
  },
  's100/e1825/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-002',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [1],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-002': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 2,
        count: 7,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-002',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-002-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-002-yes',
          },
        },
        confirm: true,
      },
      'decision-002-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [8],
        offset: 0,
        count: 2,
        next: {
          kind: 'restart',
        },
      },
      'decision-002-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 9,
        count: 20,
        next: {
          kind: 'advance',
          state: 'legacy-002',
        },
      },
      'legacy-002': {
        label: '步骤 legacy-002',
        stage: 'legacy-002',
        path: [],
        offset: 0,
        count: 2,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-003',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-003-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-003-yes',
          },
        },
        confirm: true,
      },
      'decision-003-no': {
        label: '默认触发行为 · 选择否',
        stage: 'legacy-002',
        path: [1],
        offset: 0,
        count: 0,
        next: {
          kind: 'advance',
          state: 'legacy-002',
        },
      },
      'decision-003-yes': {
        label: '默认触发行为 · 继续',
        stage: 'legacy-002',
        path: [],
        offset: 2,
        count: 15,
        next: {
          kind: 'advance',
          state: 'legacy-003',
        },
      },
      'legacy-003': {
        label: '步骤 legacy-003',
        stage: 'legacy-003',
        path: [],
        offset: 0,
        count: 1,
        next: {
          kind: 'stay',
        },
      },
    },
  },
  's148/e2433/default': {
    id: 'confirm-decisions',
    label: '默认触发行为',
    initial: 'initial',
    states: {
      initial: {
        label: '步骤 initial',
        stage: 'initial',
        path: [],
        offset: 0,
        count: 4,
        next: {
          kind: 'commandOutcome',
          commandId: 'decision-001',
          command: 'confirm',
          outcome: 'no',
          then: {
            kind: 'continue',
            state: 'decision-001-no',
          },
          else: {
            kind: 'continue',
            state: 'decision-001-yes',
          },
        },
        confirm: true,
      },
      'decision-001-no': {
        label: '默认触发行为 · 选择否',
        stage: 'initial',
        path: [3],
        offset: 0,
        count: 0,
        next: {
          kind: 'restart',
        },
      },
      'decision-001-yes': {
        label: '默认触发行为 · 继续',
        stage: 'initial',
        path: [],
        offset: 4,
        count: 45,
        next: {
          kind: 'advance',
          state: 'legacy-002',
        },
      },
      'legacy-002': {
        label: '步骤 legacy-002',
        stage: 'legacy-002',
        path: [],
        offset: 0,
        count: 1,
        next: {
          kind: 'stay',
        },
      },
    },
  },
}

function source(key: string) {
  const [sceneId, entityId, behaviorId] = key.split('/')
  const behavior = scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((entity) => entity.id === entityId)?.behaviors?.trigger?.[behaviorId!]
  if (!behavior) throw new Error(`missing ${key}`)
  return behavior.flow
}

interface PaymentDelta {
  amount: number
  stage: string
  stageGuard: number
  state: string
  stateGuard: number
  confirmFirst?: boolean
}

// Explicitly approved semantic corrections, not refreshed historical golden hashes.
const paymentDeltas: Record<string, PaymentDelta> = {
  's023/e437/default': {
    amount: 20,
    stage: 'initial',
    stageGuard: 2,
    state: 'initial',
    stateGuard: 1,
    confirmFirst: true,
  },
  's050/e845/default': {
    amount: 100,
    stage: 'initial',
    stageGuard: 2,
    state: 'decision-001-yes',
    stateGuard: 0,
  },
  's050/e846/default': {
    amount: 100,
    stage: 'initial',
    stageGuard: 2,
    state: 'decision-001-yes',
    stateGuard: 0,
  },
  's084/e1583/legacy-001': {
    amount: 100,
    stage: 'initial',
    stageGuard: 2,
    state: 'decision-001-yes',
    stateGuard: 0,
  },
  's084/e1584/legacy-001': {
    amount: 100,
    stage: 'initial',
    stageGuard: 2,
    state: 'decision-001-yes',
    stateGuard: 0,
  },
  's111/e2085/default': {
    amount: 30,
    stage: 'initial',
    stageGuard: 2,
    state: 'decision-001-yes',
    stateGuard: 0,
  },
  's127/e2224/default': {
    amount: 100,
    stage: 'initial',
    stageGuard: 3,
    state: 'decision-001-yes',
    stateGuard: 1,
  },
  's100/e1825/default': {
    amount: 100,
    stage: 'legacy-002',
    stageGuard: 4,
    state: 'decision-003-yes',
    stateGuard: 2,
  },
}

const approvedStageLabels: Record<string, Record<string, string>> = {
  's023/e437/default': { initial: '确认购买并支付二十文' },
  's050/e845/default': { initial: '确认购买并支付一百文' },
  's050/e846/default': { initial: '确认购买并支付一百文' },
  's084/e1583/legacy-001': { initial: '确认交费后两名衙役放行' },
  's084/e1584/legacy-001': { initial: '确认交费后两名衙役放行' },
  's111/e2085/default': { initial: '确认购买并支付三十文' },
  's127/e2224/default': { initial: '确认买酒并支付一百文' },
  's100/e1825/default': {
    initial: '施舍半数钱财，打听刘府传闻',
    'legacy-002': '支付一百文，打听小莲儿',
    'legacy-003': '今日生意的复读',
  },
}

function checkedMoneyGuard(body: AuthorCommand[], index: number, amount: number) {
  const guard = body[index]
  if (guard?.kind !== 'branch') throw new Error('missing exact payment branch')
  expect(guard.cond).toEqual({ kind: 'not', cond: { kind: 'hasMoney', atLeast: amount } })
  expect(body[index + 1]).toEqual({ kind: 'giveMoney', delta: -amount })
  return guard
}

function undoAuthorizedPaymentDelta(key: string) {
  const current = structuredClone(source(key))
  if (current.kind !== 'stages') throw new Error(`${key}: current content must use ordinary steps`)
  const delta = paymentDeltas[key]
  if (!delta) return current
  const body = current.stages.find((stage) => stage.id === delta.stage)?.body
  if (!body) throw new Error('missing exact payment step')
  const guard = checkedMoneyGuard(body, delta.stageGuard, delta.amount)
  expect(guard.then.at(-1)).toEqual({ kind: 'stopScript' })
  expect(guard.then.filter((command) => command.kind === 'stopScript')).toHaveLength(1)
  guard.then.pop()
  if (delta.confirmFirst) {
    expect(body.map((command) => command.kind)).toEqual([
      'dialog',
      'confirm',
      'branch',
      'giveMoney',
      'giveItem',
    ])
    const confirm = body.splice(1, 1)[0]!
    expect(confirm).toMatchObject({
      kind: 'confirm',
      id: 'decision-001',
      onNo: [{ kind: 'stopScript' }],
    })
    body.splice(3, 0, confirm)
  }
  return current
}

function correctedHistoricalSource(key: string, original: AuthorScriptFlow): AuthorScriptFlow {
  const corrected = structuredClone(original)
  const delta = paymentDeltas[key]
  if (!delta) return corrected
  if (corrected.kind !== 'stateMachine') throw new Error('expected historical reference graph')
  const state = corrected.machine.states[delta.state]
  if (!state) throw new Error('missing exact historical payment state')
  const guard = checkedMoneyGuard(state.body, delta.stateGuard, delta.amount)
  expect(guard.then.some((command) => command.kind === 'stopScript')).toBe(false)
  guard.then.push({ kind: 'stopScript' })
  if (delta.confirmFirst) {
    expect(state.body.map((command) => command.kind)).toEqual([
      'dialog',
      'branch',
      'giveMoney',
      'confirm',
    ])
    const [balanceCheck, charge] = state.body.splice(1, 2)
    const accepted = corrected.machine.states['decision-001-yes']
    if (!balanceCheck || !charge || !accepted) throw new Error('missing historical purchase arm')
    expect(accepted.body).toEqual([{ kind: 'giveItem', itemId: '80' }])
    accepted.body.unshift(balanceCheck, charge)
  }
  return corrected
}

function historicalSource(key: string): AuthorScriptFlow {
  const current = undoAuthorizedPaymentDelta(key)
  const shape = historicalShapes[key]
  if (!shape) throw new Error(`missing historical graph ${key}`)
  return {
    kind: 'stateMachine',
    machine: {
      id: shape.id,
      label: shape.label,
      initial: shape.initial,
      states: Object.fromEntries(
        Object.entries(shape.states).map(([id, state]) => {
          const stage = current.stages.find((candidate) => candidate.id === state.stage)
          if (!stage) throw new Error(`missing ordinary step ${state.stage}`)
          let commands = stage.body
          for (const index of state.path) {
            const command = commands[index]
            if (command?.kind !== 'confirm') throw new Error('missing inline confirm')
            commands = command.onNo
          }
          const body = structuredClone(commands.slice(state.offset, state.offset + state.count))
          if (state.confirm) {
            const confirm = body.at(-1)
            if (confirm?.kind !== 'confirm') throw new Error('missing historical terminal confirm')
            confirm.onNo = []
          }
          return [id, { label: state.label, body, next: state.next }]
        }),
      ),
    },
  }
}

function terminalTarget(machine: Machine, stateId: string, next: BaseStateTransition): string {
  if (next.kind === 'restart') return machine.initial
  if (next.kind === 'stay') return stateId
  if (next.kind === 'advance') return next.state
  throw new Error(`unsupported terminal ${next.kind}`)
}

/** Structural lowering only; all execution/comparison is delegated to the real compiler/runner. */
function organizeConfirmCandidate(
  flow: RuntimeScriptFlow,
): Extract<RuntimeScriptFlow, { kind: 'stages' }> {
  if (flow.kind !== 'stateMachine' || flow.machine.cadence !== undefined)
    throw new Error('requires an interactive perCommand candidate')
  const { machine } = flow
  const roots = new Set([machine.initial])
  for (const state of Object.values(machine.states)) {
    if (state.entry) throw new Error('scene-entry candidate excluded')
    if (state.next.kind === 'advance') roots.add(state.next.state)
  }
  const stages = [...roots].map((root) => {
    const terminals = new Set<string>()
    const visit = (stateId: string, ancestors = new Set<string>()) => {
      if (ancestors.has(stateId)) throw new Error('same-activation cycle')
      const state = machine.states[stateId]
      if (!state) throw new Error(`missing state ${stateId}`)
      const path = new Set([...ancestors, stateId])
      const transition = (next: BaseStateTransition): void => {
        if (next.kind === 'continue') visit(next.state, path)
        else if (next.kind === 'commandOutcome') {
          transition(next.then)
          transition(next.else)
        } else terminals.add(terminalTarget(machine, stateId, next))
      }
      transition(state.next)
    }
    visit(root)
    const other = [...terminals].filter((target) => target !== root)
    if (other.length > 1) throw new Error('requires conditional next step')
    const nextStep = other[0] ?? root
    const emit = (stateId: string, inNo = false): Commands => {
      const state = machine.states[stateId]!
      const body = structuredClone(state.body)
      const { next } = state
      if (next.kind === 'continue') return [...body, ...emit(next.state, inNo)]
      if (next.kind === 'commandOutcome') {
        const confirm = body.at(-1)
        if (
          confirm?.kind !== 'confirm' ||
          confirm.id !== next.commandId ||
          confirm.onNo.length !== 0 ||
          next.then.kind !== 'continue' ||
          next.else.kind !== 'continue'
        )
          throw new Error('requires a terminal confirm with explicit synchronous arms')
        confirm.onNo = emit(next.then.state, true)
        return [...body, ...emit(next.else.state, inNo)]
      }
      const target = terminalTarget(machine, stateId, next)
      if (inNo) {
        if (target !== root) throw new Error('declining requires a different next step')
        return [...body, { kind: 'stopScript' }]
      }
      if (target !== nextStep) throw new Error('accepting requires a different next step')
      return body
    }
    return { id: root, body: emit(root), ...(nextStep === root ? {} : { next: nextStep }) }
  })
  return { kind: 'stages', initial: machine.initial, stages }
}

async function activate(
  flow: RuntimeScriptFlow,
  cursor: FlowCursor | undefined,
  answers: readonly boolean[],
  condition: boolean,
) {
  const trace: unknown[] = []
  const commands: RuntimeCommand[] = []
  const commits: FlowCursor[] = []
  let answerIndex = 0
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(command)
      trace.push(['command', command])
    },
    evalCondition(value) {
      trace.push(['condition', value])
      return condition
    },
    async confirm() {
      const answer = answers[answerIndex++ % answers.length]!
      trace.push(['confirm', answer])
      return answer
    },
    async startBattle(request) {
      trace.push(['battle', request])
      return condition ? 'victory' : 'defeat'
    },
    teleportOut: async () => condition,
    async wait(ms) {
      trace.push(['wait', ms])
    },
    async waitWorldTick() {
      trace.push('worldTick')
    },
    async yieldMacroTask() {
      trace.push('macroTask')
    },
  }
  await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(
    compileRuntimeScriptFlow(flow, { timing: 'interactive', canonicalContentDigest: digest }),
    {
      cursor,
      cursorController: {
        reachSafePoint(next) {
          commits.push(next)
          return 'continue'
        },
      },
    },
  )
  return { trace, commands, cursor: commits.at(-1) ?? cursor, commits }
}

test.each(
  candidates,
)('%s uses %i steps with verified history and explicitly corrected payment semantics', async (key, steps, hash) => {
  const author = historicalSource(key)
  expect(await sha256Bytes(new TextEncoder().encode(JSON.stringify(author)))).toBe(hash)
  const reference = resolveAuthorDialogueTree(correctedHistoricalSource(key, author), actors)
  const candidate = organizeConfirmCandidate(reference)
  expect(candidate.stages).toHaveLength(steps)
  for (const stage of candidate.stages) {
    const label = approvedStageLabels[key]?.[stage.id]
    if (label !== undefined) stage.label = label
  }
  const actual = resolveAuthorDialogueTree(source(key), actors)
  expect(actual).toEqual(candidate)
  for (const condition of [false, true]) {
    for (let mask = 0; mask < 8; mask++) {
      const answers = [Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4)]
      let referenceCursor: FlowCursor | undefined
      let newCursor: FlowCursor | undefined
      for (let count = 0; count < 4; count++) {
        const expected = await activate(reference, referenceCursor, answers, condition)
        const organized = await activate(actual, newCursor, answers, condition)
        expect(organized.trace).toEqual(expected.trace)
        referenceCursor = expected.cursor
        newCursor = organized.cursor
        if (referenceCursor) expect(referenceCursor.kind).toBe('state')
        const referenceStep = referenceCursor?.kind === 'state' ? referenceCursor.state : 'initial'
        const newStep = newCursor?.kind === 'stage' ? newCursor.stage : candidate.initial
        expect(newStep).toBe(referenceStep)
      }
    }
  }
})

test('declining inline ends this activation without committing next or executing the accepted arm', async () => {
  const current = resolveAuthorDialogueTree(historicalSource('s100/e1817/default'), actors)
  const candidate = organizeConfirmCandidate(current)
  const original = await activate(current, undefined, [false], false)
  const declined = await activate(candidate, undefined, [false], false)
  expect(declined.trace).toEqual(original.trace)
  expect(original.commits).toEqual([
    { kind: 'state', machine: 'confirm-decisions', state: 'initial' },
  ])
  expect(declined.commits).toEqual([])
  const accepted = await activate(candidate, declined.cursor, [true], false)
  expect(accepted.cursor).toEqual({ kind: 'stage', stage: 'legacy-002' })
})

test.each(
  Object.entries(paymentDeltas),
)('%s corrects a proven insufficient-balance fallthrough instead of declaring it equivalent', async (key, delta) => {
  const original = historicalSource(key)
  const wrong = resolveAuthorDialogueTree(original, actors)
  const corrected = resolveAuthorDialogueTree(correctedHistoricalSource(key, original), actors)
  const cursor: FlowCursor | undefined =
    delta.stage === 'initial'
      ? undefined
      : { kind: 'state', machine: 'confirm-decisions', state: delta.stage }
  const before = await activate(wrong, cursor, [true], true)
  const after = await activate(corrected, cursor, [true], true)
  expect(
    before.commands.filter(
      (command) => command.kind === 'giveMoney' && command.delta === -delta.amount,
    ),
  ).toHaveLength(1)
  expect(
    after.commands.some((command) => command.kind === 'giveMoney' || command.kind === 'giveItem'),
  ).toBe(false)
  expect(after.trace).not.toEqual(before.trace)
  expect(after.commits).toEqual([])
})

test('the authorized s023 change removes the historical charge when the player declines', async () => {
  const key = 's023/e437/default'
  const original = historicalSource(key)
  const before = await activate(
    resolveAuthorDialogueTree(original, actors),
    undefined,
    [false],
    false,
  )
  const after = await activate(
    resolveAuthorDialogueTree(correctedHistoricalSource(key, original), actors),
    undefined,
    [false],
    false,
  )
  expect(before.commands.filter((command) => command.kind === 'giveMoney')).toEqual([
    { kind: 'giveMoney', delta: -20 },
  ])
  expect(
    after.commands.some((command) => command.kind === 'giveMoney' || command.kind === 'giveItem'),
  ).toBe(false)
  expect(after.trace).not.toEqual(before.trace)
})

test('different yes/no future steps are rejected rather than flattened to a common cursor', () => {
  const current = resolveAuthorDialogueTree(source('s091/e1682/default'), actors)
  expect(() => organizeConfirmCandidate(current)).toThrow('requires conditional next step')
})

test('same vendor text does not make explicit top and default bottom dialogue identical', () => {
  const current = source('s023/e433/default')
  if (current.kind !== 'stateMachine') throw new Error('expected unmodified counterexample')
  const top = current.machine.states['after-checkpoint']!.body[0]!
  const bottom = current.machine.states['after-checkpoint-002']!.body[0]!
  if (top.kind !== 'dialog' || bottom.kind !== 'dialog') throw new Error('expected dialogue')
  expect(top.cue.rows).toEqual(bottom.cue.rows)
  expect(top.cue.slot).toBe('top')
  expect(bottom.cue.slot).toBeUndefined()
  expect(top).not.toEqual(bottom)
})

test('moving the decline stop into a shared call would only return from the callee', async () => {
  const commands: string[] = []
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(command.kind)
    },
    evalCondition: () => false,
    confirm: async () => false,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
  const shared = new RuntimeSharedScriptResolver(
    { decline: { name: 'decline', self: 'none', body: [{ kind: 'stopScript' }] } },
    digest,
  )
  const flow: RuntimeScriptFlow = {
    kind: 'stages',
    initial: 'initial',
    stages: [
      {
        id: 'initial',
        body: [
          { kind: 'confirm', onNo: [{ kind: 'callScript', script: 'decline' }] },
          { kind: 'giveMoney', delta: -100 },
        ],
        next: 'repeat',
      },
      { id: 'repeat', body: [] },
    ],
  }
  const cursors: FlowCursor[] = []
  await new RuntimeScriptRunner(host, new AbortController().signal, shared).runFlow(
    compileRuntimeScriptFlow(flow, { timing: 'interactive', canonicalContentDigest: digest }),
    {
      cursorController: {
        reachSafePoint: (cursor) => {
          cursors.push(cursor)
          return 'continue'
        },
      },
    },
  )
  expect(commands).toEqual(['giveMoney'])
  expect(cursors).toEqual([{ kind: 'stage', stage: 'repeat' }])
})
