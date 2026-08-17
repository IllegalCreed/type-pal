import type {
  AuthorCommandV5,
  CursorHandoffV5,
  SceneDefV5,
  ScriptFlowV5,
  StateTransitionV5,
} from '@type-pal/content'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type { SourceCmd } from '../../source-facts.js'
import { sourceAutoCommand } from './p7-canonical.js'
import { stableJson, stableJsonSha256 } from './stable-json.js'
import type { P4AuthorOwnerIdentity } from './types.js'

interface AutoSourceCmd extends SourceCmd {
  advance?: boolean
  reset?: boolean
  resetTo?: number
  idleFrames?: number
  to?: string
  frameDelay?: number
}

type ProductPoint = {
  address: number
  counter: number
}

type StateRole = {
  id: string
  addresses: readonly number[]
}

type ProductSpec = {
  sceneId: string
  entityId: string
  behaviorId: string
  label: string
  rootAddress: number
  seeds?: readonly ProductPoint[]
  roles: readonly StateRole[]
  stateId?: (point: ProductPoint) => string | undefined
  body?: (point: ProductPoint, sourceBody: AuthorCommandV5[]) => AuthorCommandV5[] | undefined
  transition?: (
    point: ProductPoint,
    ensure: (point: ProductPoint) => string,
  ) => StateTransitionV5 | undefined
}

type GateOwnerSpec = ProductSpec & {
  mode: 'replace' | 'add' | 'folded-animation'
  gates: ReadonlyArray<{
    address: number
    target: number
    threshold: number
  }>
  delayedGotos?: ReadonlyArray<{
    address: number
    target: number
    threshold: number
  }>
}

type DelayedGotoOwnerSpec = ProductSpec & {
  mode: 'replace'
  delayedGotos: ReadonlyArray<{
    address: number
    target: number
    threshold: number
  }>
}

type RestoredAutoOwnerSpec = ProductSpec & {
  mode: 'add'
  order: number
  sourceAddresses: readonly number[]
}

export interface R13AutoIdleGateOwnerEvidenceV1 {
  ownerKey: string
  rootAddress: number
  gateAddresses: number[]
  gatePhaseCount: number
  productStates: number
  sourceDigest: string
  flowDigest: string
}

export interface R13AutoDelayedGotoOwnerEvidenceV1 {
  ownerKey: string
  rootAddress: number
  delayedGotoAddresses: number[]
  delayedGotoPhaseCount: number
  productStates: number
  sourceDigest: string
  flowDigest: string
}

export interface R13AutoProductOwnerEvidenceV1 {
  ownerKey: string
  rootAddress: number
  productStates: number
  sourceDigest: string
  flowDigest: string
}

export interface R13AutoInstallerOwnerEvidenceV1 {
  ownerKey: string
  commands: number
  cases: number
  flowDigest: string
}

export interface R13AutoIdleGateEvidenceV1 {
  kind: 'r13-auto-idle-gate-evidence'
  version: 1
  sourceGateAddresses: 11
  entityOwners: 12
  executionSites: 13
  ownerExpandedGatePhases: 84
  delayedGotoAddresses: 8
  delayedGotoExecutionSites: 15
  delayedGotoOwnerExpandedPhases: 1657
  steadyAutoOwners: 15
  restoredAutoOwners: 16
  cursorHandoffCases: {
    e405Forward: 1
    e4168Forward: 16
    s231CrowdForward: 176
    e4409Forward: 13
    e4440Forward: 15
    e4723Forward: 24
    reverse: 2
  }
  owners: R13AutoIdleGateOwnerEvidenceV1[]
  delayedGotoOwners: R13AutoDelayedGotoOwnerEvidenceV1[]
  steadyOwners: R13AutoProductOwnerEvidenceV1[]
  restoredOwners: R13AutoProductOwnerEvidenceV1[]
  installerOwners: R13AutoInstallerOwnerEvidenceV1[]
  digest: string
}

export interface R13AutoIdleGateAugmentation {
  snapshot: MigrationSnapshot
  evidence: R13AutoIdleGateEvidenceV1
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index)

const stateCursor = (state: string) => ({ kind: 'state', machine: 'machine', state }) as const

const E4409_DEFAULT_STATES = [
  'pursuit',
  'route-choice',
  ...range(1, 10).map((phase) => `wait-${String(phase).padStart(2, '0')}`),
  'cycle-reset',
] as const

const E4440_DEFAULT_STATES = [
  'pre-pursuit',
  'pre-reset',
  'post-pursuit',
  'post-route-choice',
  ...range(1, 10).map((phase) => `post-wait-${String(phase).padStart(2, '0')}`),
  'post-cycle-reset',
] as const

function legacyGateState(point: ProductPoint): string | undefined {
  if (point.address === 33644)
    return `remaining-${String(Math.max(1, 4 - point.counter)).padStart(2, '0')}`
  if (point.address === 33667) return 'restore-touch'
  return undefined
}

function waitState(prefix: string, counter: number): string {
  return `${prefix}${String(counter + 1).padStart(2, '0')}`
}

function e405DefaultStateId(point: ProductPoint): string | undefined {
  if (point.address === 7316) return 'first-step'
  if (point.address === 7317) return waitState('first-wait-', point.counter)
  if (point.address === 7318) return 'second-step'
  if (point.address === 7319) return waitState('second-wait-', point.counter)
  if (point.address === 7320) return 'cycle-reset'
  return undefined
}

const E4723_DEFAULT_ROLES = [
  { id: 'first-wait', addresses: [36140] },
  { id: 'second-wait', addresses: [36141] },
  { id: 'pose-up', addresses: [36142] },
  { id: 'third-wait', addresses: [36143] },
  { id: 'pose-down', addresses: [36144] },
  { id: 'cycle-reset', addresses: [36145] },
] as const

const E4723_DEFAULT_POINTS: readonly ProductPoint[] = [
  ...range(0, 5).map((counter) => ({ address: 36140, counter })),
  ...range(0, 5).map((counter) => ({ address: 36141, counter })),
  { address: 36142, counter: 0 },
  ...range(0, 8).map((counter) => ({ address: 36143, counter })),
  { address: 36144, counter: 0 },
  { address: 36145, counter: 0 },
]

const E4168_LEGACY_003_POINTS: readonly ProductPoint[] = [
  ...range(0, 3).map((counter) => ({ address: 32021, counter })),
  ...range(32022, 32027).map((address) => ({ address, counter: 0 })),
  ...[32029, 32030, 32032, 32033, 32035, 32036].map((address) => ({
    address,
    counter: 0,
  })),
]

const S231_CROWD_TARGETS = [
  { entityId: 'e4156', rootAddress: 32228, endAddress: 32233, firstWaitThreshold: 3 },
  { entityId: 'e4157', rootAddress: 32234, endAddress: 32239, firstWaitThreshold: 2 },
  { entityId: 'e4158', rootAddress: 32240, endAddress: 32245, firstWaitThreshold: 3 },
  { entityId: 'e4159', rootAddress: 32246, endAddress: 32252, firstWaitThreshold: 2 },
  { entityId: 'e4160', rootAddress: 32253, endAddress: 32258, firstWaitThreshold: 4 },
  { entityId: 'e4161', rootAddress: 32259, endAddress: 32264, firstWaitThreshold: 5 },
  { entityId: 'e4162', rootAddress: 32265, endAddress: 32269, firstWaitThreshold: 4 },
  { entityId: 'e4163', rootAddress: 32270, endAddress: 32275, firstWaitThreshold: 3 },
  { entityId: 'e4164', rootAddress: 32276, endAddress: 32282, firstWaitThreshold: 3 },
  { entityId: 'e4165', rootAddress: 32283, endAddress: 32288, firstWaitThreshold: 2 },
  { entityId: 'e4166', rootAddress: 32289, endAddress: 32297, firstWaitThreshold: 3 },
] as const

const STEADY_AUTO_SPECS = [
  {
    sceneId: 's021',
    entityId: 'e405',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 7316,
    roles: [
      { id: 'first-step', addresses: [7316] },
      { id: 'first-wait', addresses: [7317] },
      { id: 'second-step', addresses: [7318] },
      { id: 'second-wait', addresses: [7319] },
      { id: 'cycle-reset', addresses: [7320] },
    ],
    stateId: e405DefaultStateId,
  },
  ...S231_CROWD_TARGETS.map<ProductSpec>(({ entityId }) => ({
    sceneId: 's231',
    entityId,
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 32021,
    roles: [
      { id: 'idle-wait', addresses: [32021] },
      { id: 'direction-roll', addresses: range(32022, 32025) },
      { id: 'face-up', addresses: range(32026, 32027) },
      { id: 'face-down', addresses: range(32029, 32030) },
      { id: 'face-left', addresses: range(32032, 32033) },
      { id: 'face-right', addresses: range(32035, 32036) },
    ],
  })),
  {
    sceneId: 's250',
    entityId: 'e4409',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 33668,
    roles: [
      { id: 'pursuit', addresses: [33668] },
      { id: 'route-choice', addresses: [33669] },
      { id: 'wait', addresses: [33670] },
      { id: 'cycle-reset', addresses: [33671] },
    ],
    stateId: ({ address, counter }) =>
      address === 33668
        ? 'pursuit'
        : address === 33669
          ? 'route-choice'
          : address === 33670
            ? waitState('wait-', counter)
            : address === 33671
              ? 'cycle-reset'
              : undefined,
  },
  {
    sceneId: 's252',
    entityId: 'e4440',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 33641,
    seeds: [
      { address: 33641, counter: 0 },
      { address: 33668, counter: 0 },
    ],
    roles: [
      { id: 'pre-pursuit', addresses: [33641] },
      { id: 'pre-reset', addresses: [33642] },
      { id: 'post-pursuit', addresses: [33668] },
      { id: 'post-route-choice', addresses: [33669] },
      { id: 'post-wait', addresses: [33670] },
      { id: 'post-cycle-reset', addresses: [33671] },
    ],
    stateId: ({ address, counter }) =>
      address === 33641
        ? 'pre-pursuit'
        : address === 33642
          ? 'pre-reset'
          : address === 33668
            ? 'post-pursuit'
            : address === 33669
              ? 'post-route-choice'
              : address === 33670
                ? waitState('post-wait-', counter)
                : address === 33671
                  ? 'post-cycle-reset'
                  : undefined,
  },
] as const satisfies readonly ProductSpec[]

const FOLDED_STEADY_AUTO_SPECS = [
  {
    sceneId: 's273',
    entityId: 'e4723',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 36140,
    roles: E4723_DEFAULT_ROLES,
  },
] as const satisfies readonly ProductSpec[]

const GATE_OWNER_SPECS = [
  {
    sceneId: 's003',
    entityId: 'e56',
    behaviorId: 'legacy-006',
    label: '自动行为 6',
    rootAddress: 373,
    mode: 'replace',
    gates: [{ address: 379, target: 377, threshold: 12 }],
    roles: [
      { id: 'intro', addresses: range(373, 376) },
      { id: 'cycle', addresses: range(377, 379) },
      { id: 'outro', addresses: range(380, 384) },
      { id: 'completed', addresses: [385] },
    ],
    body: ({ address }, sourceBody) =>
      address === 384
        ? [
            {
              kind: 'selectEntityBehavior',
              target: { scene: 's003', entity: 'e56' },
              channel: 'trigger',
              selection: { kind: 'use', value: 'legacy-001' },
            },
          ]
        : sourceBody,
  },
  {
    sceneId: 's001',
    entityId: 'e26',
    behaviorId: 'legacy-003',
    label: '自动行为 3',
    rootAddress: 541,
    mode: 'replace',
    gates: [{ address: 542, target: 541, threshold: 8 }],
    roles: [
      { id: 'cycle', addresses: range(541, 542) },
      { id: 'completed', addresses: [543] },
    ],
  },
  {
    sceneId: 's004',
    entityId: 'e88',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    rootAddress: 840,
    mode: 'replace',
    gates: [{ address: 842, target: 841, threshold: 7 }],
    roles: [
      { id: 'intro', addresses: [840] },
      { id: 'cycle', addresses: range(841, 842) },
      { id: 'completed', addresses: [843] },
    ],
  },
  {
    sceneId: 's003',
    entityId: 'e59',
    behaviorId: 'legacy-002',
    label: '自动行为 2',
    rootAddress: 1168,
    mode: 'replace',
    gates: [{ address: 1173, target: 1170, threshold: 12 }],
    roles: [
      { id: 'intro', addresses: range(1168, 1169) },
      { id: 'cycle', addresses: range(1170, 1173) },
      { id: 'outro', addresses: [1174, 1175, 406, 407, 408, 409] },
      { id: 'completed', addresses: [410] },
    ],
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    rootAddress: 32213,
    mode: 'add',
    gates: [{ address: 32215, target: 32213, threshold: 8 }],
    roles: [
      { id: 'cycle', addresses: range(32213, 32215) },
      { id: 'pose', addresses: [32216] },
      { id: 'completed', addresses: [32217] },
    ],
  },
  {
    sceneId: 's231',
    entityId: 'e4167',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 32298,
    mode: 'folded-animation',
    gates: [{ address: 32300, target: 32298, threshold: 5 }],
    roles: [
      { id: 'cycle', addresses: range(32298, 32300) },
      { id: 'completed', addresses: [32301] },
    ],
  },
  {
    sceneId: 's253',
    entityId: 'e4464',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    rootAddress: 33435,
    mode: 'replace',
    gates: [
      { address: 33436, target: 33435, threshold: 6 },
      { address: 33440, target: 33439, threshold: 6 },
    ],
    roles: [
      { id: 'first-cycle', addresses: range(33435, 33436) },
      { id: 'bridge', addresses: range(33437, 33438) },
      { id: 'second-cycle', addresses: range(33439, 33440) },
      { id: 'completed', addresses: [33441] },
    ],
  },
  ...(['s250/e4409', 's252/e4440'] as const).map<GateOwnerSpec>((owner) => {
    const [sceneId, entityId] = owner.split('/') as ['s250' | 's252', 'e4409' | 'e4440']
    const targetState = entityId === 'e4409' ? 'pursuit' : 'post-pursuit'
    return {
      sceneId,
      entityId,
      behaviorId: 'legacy-001',
      label: '自动行为 1',
      rootAddress: 33644,
      seeds: range(0, 3).map((counter) => ({ address: 33644, counter })),
      mode: 'replace' as const,
      gates: [{ address: 33666, target: 33644, threshold: 4 }],
      roles: [
        { id: 'entry', addresses: range(33644, 33665) },
        { id: 'gate', addresses: [33666] },
        { id: 'restore-touch', addresses: [33667] },
      ],
      stateId: legacyGateState,
      body: ({ address }: ProductPoint, sourceBody: AuthorCommandV5[]) =>
        address === 33667
          ? [
              ...sourceBody,
              {
                kind: 'selectEntityBehavior',
                target: { scene: sceneId, entity: entityId },
                channel: 'auto',
                selection: { kind: 'use', value: 'default' },
                cursorHandoff: {
                  kind: 'stateMap',
                  fromBehavior: 'legacy-001',
                  cases: [
                    {
                      from: stateCursor('restore-touch'),
                      to: stateCursor(targetState),
                    },
                  ],
                  onUnmapped: 'error',
                },
              },
            ]
          : sourceBody,
      transition: ({ address }: ProductPoint): StateTransitionV5 | undefined =>
        address === 33667 ? { kind: 'stay' } : undefined,
    }
  }),
  ...(['e4658', 'e4659'] as const).map<GateOwnerSpec>((entityId) => ({
    sceneId: 's266',
    entityId,
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 34311,
    mode: 'replace' as const,
    gates: [{ address: 34319, target: 34318, threshold: 4 }],
    delayedGotos: [{ address: 34313, target: 34311, threshold: 15 }],
    roles: [
      { id: 'approach', addresses: range(34311, 34313) },
      { id: 'bridge', addresses: range(34314, 34317) },
      { id: 'gate', addresses: range(34318, 34319) },
      { id: 'outro', addresses: range(34320, 34325) },
      { id: 'tail', addresses: range(34326, 34328) },
    ],
  })),
  {
    sceneId: 's278',
    entityId: 'e4748',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 35434,
    mode: 'replace',
    gates: [{ address: 35436, target: 35434, threshold: 4 }],
    roles: [
      { id: 'cycle', addresses: range(35434, 35436) },
      { id: 'completed', addresses: [35437] },
    ],
  },
] as const satisfies readonly GateOwnerSpec[]

const DELAYED_GOTO_OWNER_SPECS = [
  ...(['e25', 'e26'] as const).flatMap<DelayedGotoOwnerSpec>((entityId) => [
    {
      sceneId: 's001',
      entityId,
      behaviorId: 'legacy-001',
      label: '自动行为 1',
      rootAddress: 2614,
      mode: 'replace',
      delayedGotos: [{ address: 2616, target: 2615, threshold: 9 }],
      roles: [
        { id: 'intro', addresses: [2614] },
        { id: 'cycle', addresses: range(2615, 2616) },
        { id: 'outro', addresses: [2617] },
        { id: 'completed', addresses: [2618] },
      ],
    },
    {
      sceneId: 's001',
      entityId,
      behaviorId: 'legacy-002',
      label: '自动行为 2',
      rootAddress: 2619,
      mode: 'replace',
      delayedGotos: [{ address: 2621, target: 2620, threshold: 9 }],
      roles: [
        { id: 'intro', addresses: [2619] },
        { id: 'cycle', addresses: range(2620, 2621) },
        { id: 'outro', addresses: [2622] },
        { id: 'completed', addresses: [2623] },
      ],
    },
  ]),
  {
    sceneId: 's016',
    entityId: 'e220',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 5572,
    mode: 'replace',
    delayedGotos: [{ address: 5573, target: 5572, threshold: 10 }],
    roles: [
      { id: 'cycle', addresses: range(5572, 5573) },
      { id: 'outro', addresses: range(5574, 5580) },
      { id: 'completed', addresses: [5581] },
    ],
  },
  {
    sceneId: 's021',
    entityId: 'e405',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    rootAddress: 7339,
    mode: 'replace',
    delayedGotos: [{ address: 7340, target: 7339, threshold: 140 }],
    roles: [
      { id: 'cycle', addresses: range(7339, 7340) },
      { id: 'outro', addresses: [7341] },
      { id: 'completed', addresses: [7342] },
    ],
  },
  {
    sceneId: 's021',
    entityId: 'e406',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 7335,
    mode: 'replace',
    delayedGotos: [{ address: 7340, target: 7339, threshold: 140 }],
    roles: [
      { id: 'intro', addresses: range(7335, 7338) },
      { id: 'cycle', addresses: range(7339, 7340) },
      { id: 'outro', addresses: [7341] },
      { id: 'completed', addresses: [7342] },
    ],
    body: ({ address }, sourceBody) =>
      address === 7338
        ? [
            {
              kind: 'selectEntityBehavior',
              target: { scene: 's021', entity: 'e405' },
              channel: 'auto',
              selection: { kind: 'use', value: 'legacy-001' },
            },
          ]
        : sourceBody,
  },
  {
    sceneId: 's102',
    entityId: 'e1884',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 16512,
    mode: 'replace',
    delayedGotos: [{ address: 16513, target: 16512, threshold: 12 }],
    roles: [
      { id: 'cycle', addresses: range(16512, 16513) },
      { id: 'completed', addresses: [16514] },
    ],
  },
  {
    sceneId: 's251',
    entityId: 'e4438',
    behaviorId: 'default',
    label: '默认自动行为',
    rootAddress: 33768,
    mode: 'replace',
    delayedGotos: [{ address: 33770, target: 33768, threshold: 9 }],
    roles: [
      { id: 'cycle', addresses: range(33768, 33770) },
      { id: 'outro', addresses: range(33771, 33773) },
      { id: 'tail', addresses: range(33774, 33776) },
    ],
  },
  ...(
    [
      ['e4723', 'c8-3278127a7af6'],
      ['e4726', 'c8-119ab4af0281'],
      ['e4727', 'c8-0c47a1f79fad'],
      ['e4728', 'c8-900c5edf30b3'],
    ] as const
  ).map<DelayedGotoOwnerSpec>(([entityId, behaviorId]) => ({
    sceneId: 's273',
    entityId,
    behaviorId,
    label: `物品剧情行为 ${behaviorId.slice(3)}`,
    rootAddress: 34778,
    mode: 'replace',
    delayedGotos: [{ address: 34779, target: 34778, threshold: 320 }],
    roles: [
      { id: 'cycle', addresses: range(34778, 34779) },
      { id: 'outro', addresses: [34780] },
      { id: 'completed', addresses: [34781] },
    ],
  })),
] as const satisfies readonly DelayedGotoOwnerSpec[]

const RESTORED_AUTO_OWNER_SPECS = [
  {
    sceneId: 's250',
    entityId: 'e4410',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress: 33641,
    mode: 'add',
    sourceAddresses: range(33641, 33642),
    roles: [
      { id: 'pursuit', addresses: [33641] },
      { id: 'cycle-reset', addresses: [33642] },
    ],
  },
  {
    sceneId: 's250',
    entityId: 'e4413',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress: 33786,
    mode: 'add',
    sourceAddresses: range(33786, 33795),
    roles: [
      { id: 'departure', addresses: range(33786, 33793) },
      { id: 'tail', addresses: range(33794, 33795) },
    ],
  },
  ...S231_CROWD_TARGETS.map<RestoredAutoOwnerSpec>(
    ({ entityId, rootAddress, endAddress, firstWaitThreshold }) => ({
      sceneId: 's231',
      entityId,
      behaviorId: 'legacy-001',
      label: '自动行为 1',
      order: 1,
      rootAddress,
      seeds: range(0, Math.min(3, firstWaitThreshold - 1)).map((counter) => ({
        address: rootAddress,
        counter,
      })),
      mode: 'add',
      sourceAddresses: range(rootAddress, endAddress),
      roles: [
        { id: 'sequence', addresses: range(rootAddress, endAddress - 1) },
        { id: 'completed', addresses: [endAddress] },
      ],
    }),
  ),
  {
    sceneId: 's231',
    entityId: 'e4168',
    behaviorId: 'legacy-002',
    label: '自动行为 2',
    order: 2,
    rootAddress: 32218,
    mode: 'add',
    sourceAddresses: range(32218, 32221),
    roles: [
      { id: 'move', addresses: range(32218, 32219) },
      { id: 'pose', addresses: [32220] },
      { id: 'completed', addresses: [32221] },
    ],
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    behaviorId: 'legacy-003',
    label: '自动行为 3',
    order: 3,
    rootAddress: 32021,
    mode: 'add',
    sourceAddresses: E4168_LEGACY_003_POINTS.map(({ address }) => address).filter(
      (address, index, all) => all.indexOf(address) === index,
    ),
    roles: [
      { id: 'idle-wait', addresses: [32021] },
      { id: 'direction-roll', addresses: range(32022, 32025) },
      { id: 'face-up', addresses: range(32026, 32027) },
      { id: 'face-down', addresses: range(32029, 32030) },
      { id: 'face-left', addresses: range(32032, 32033) },
      { id: 'face-right', addresses: range(32035, 32036) },
    ],
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    behaviorId: 'legacy-004',
    label: '自动行为 4',
    order: 4,
    rootAddress: 32222,
    seeds: range(0, 2).map((counter) => ({ address: 32222, counter })),
    mode: 'add',
    sourceAddresses: range(32222, 32227),
    roles: [
      { id: 'entry', addresses: [32222] },
      { id: 'pose-before-wait', addresses: [32223] },
      { id: 'wait', addresses: [32224] },
      { id: 'move', addresses: [32225] },
      { id: 'pose-after-move', addresses: [32226] },
      { id: 'completed', addresses: [32227] },
    ],
  },
] as const satisfies readonly RestoredAutoOwnerSpec[]

function labelAddress(label: string | undefined): number | undefined {
  const match = /(?:^|#)L_(\d+)$/.exec(label ?? '')
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function pointKey(point: ProductPoint): string {
  return `${point.address}:${point.counter}`
}

function genericStateId(spec: ProductSpec, point: ProductPoint): string {
  const role = spec.roles.find((candidate) => candidate.addresses.includes(point.address))
  if (!role)
    throw new Error(
      `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} ` +
        `地址 ${point.address} 未登记业务 role`,
    )
  const ordinal = role.addresses.indexOf(point.address)
  const base =
    role.addresses.length === 1 ? role.id : `${role.id}-${String(ordinal + 1).padStart(2, '0')}`
  return point.counter === 0 ? base : `${base}-phase-${String(point.counter + 1).padStart(2, '0')}`
}

function compileProductFlow(args: {
  spec: ProductSpec
  sourceCommands: readonly SourceCmd[]
  entityScenes: ReadonlyMap<string, readonly string[]>
}): {
  flow: ScriptFlowV5
  sourceAddresses: number[]
  productStates: number
} {
  const { spec } = args
  const identity: P4AuthorOwnerIdentity = {
    kind: 'entity-behavior',
    sceneId: spec.sceneId,
    entityId: spec.entityId,
    channel: 'auto',
    behaviorId: spec.behaviorId,
  }
  const queue = [...(spec.seeds ?? [{ address: spec.rootAddress, counter: 0 }])]
  const queued = new Set(queue.map(pointKey))
  const idByPoint = new Map<string, string>()
  const pointById = new Map<string, string>()
  const states = new Map<
    string,
    {
      label: string
      body: AuthorCommandV5[]
      next: StateTransitionV5
    }
  >()
  const sourceAddresses = new Set<number>()

  const ensure = (point: ProductPoint): string => {
    if (!Number.isInteger(point.address) || point.address <= 0)
      throw new Error(`R13 idle gate: 非法 source address ${point.address}`)
    if (!Number.isInteger(point.counter) || point.counter < 0)
      throw new Error(`R13 idle gate: 非法 auto counter ${point.counter}`)
    const key = pointKey(point)
    let id = idByPoint.get(key)
    if (!id) {
      id = spec.stateId?.(point) ?? genericStateId(spec, point)
      const previous = pointById.get(id)
      if (previous && previous !== key)
        throw new Error(
          `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} state id 冲突 ${id}`,
        )
      idByPoint.set(key, id)
      pointById.set(id, key)
    }
    if (!queued.has(key) && !states.has(id)) {
      queued.add(key)
      queue.push(point)
    }
    return id
  }

  for (const seed of queue) ensure(seed)
  while (queue.length) {
    const point = queue.shift()!
    const id = ensure(point)
    if (states.has(id)) continue
    const command = args.sourceCommands[point.address] as AutoSourceCmd | undefined
    if (!command)
      throw new Error(
        `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} ` +
          `缺源指令 ${point.address}`,
      )
    sourceAddresses.add(point.address)
    let sourceBody: AuthorCommandV5[]
    if (
      spec.sceneId === 's003' &&
      spec.entityId === 'e56' &&
      spec.behaviorId === 'legacy-006' &&
      point.address === 384
    )
      sourceBody = []
    else if (
      spec.sceneId === 's021' &&
      spec.entityId === 'e406' &&
      spec.behaviorId === 'default' &&
      point.address === 7338
    )
      sourceBody = []
    else sourceBody = sourceAutoCommand(command, identity, args.entityScenes, point.address)
    const body = spec.body?.(point, sourceBody) ?? sourceBody
    let next = spec.transition?.(point, ensure)
    if (!next) {
      if (command.op === 'end') {
        if (command.advance)
          next = {
            kind: 'advance',
            state: ensure({ address: point.address + 1, counter: point.counter }),
          }
        else if (command.reset) {
          if (!Number.isInteger(command.resetTo))
            throw new Error(`R13 idle gate: reset ${point.address} 缺 target`)
          const threshold = command.idleFrames ?? 0
          if (threshold > 0) {
            const incremented = point.counter + 1
            next =
              incremented < threshold
                ? {
                    kind: 'advance',
                    state: ensure({
                      address: command.resetTo!,
                      counter: incremented,
                    }),
                  }
                : {
                    kind: 'advance',
                    state: ensure({ address: point.address + 1, counter: 0 }),
                  }
          } else
            next = {
              kind: 'advance',
              state: ensure({
                address: command.resetTo!,
                counter: point.counter,
              }),
            }
        } else next = { kind: 'stay' }
      } else if (command.op === 'goto') {
        const target = labelAddress(command.to)
        if (target === undefined) throw new Error(`R13 idle gate: goto ${point.address} 缺 target`)
        const delay = command.frameDelay ?? 0
        if (delay > 0) {
          const incremented = point.counter + 1
          next =
            incremented < delay
              ? {
                  kind: 'continue',
                  state: ensure({ address: target, counter: incremented }),
                }
              : {
                  kind: 'to',
                  state: ensure({ address: point.address + 1, counter: 0 }),
                  yield: 'worldTick',
                }
        } else
          next = {
            kind: 'continue',
            state: ensure({ address: target, counter: point.counter }),
          }
      } else if (command.op === 'raw' && command.opcode === 0x06) {
        const rawTarget = command.operands?.[1] ?? 0
        const percent = Math.max(0, Math.min(100, 101 - (command.operands?.[0] ?? 0)))
        next = {
          kind: 'branch',
          cond: { kind: 'chance', percent },
          then:
            rawTarget === 0
              ? {
                  kind: 'to',
                  state: ensure(point),
                  yield: 'worldTick',
                }
              : {
                  kind: 'continue',
                  state: ensure({ address: rawTarget, counter: point.counter }),
                },
          else: {
            kind: 'to',
            state: ensure({ address: point.address + 1, counter: point.counter }),
            yield: 'worldTick',
          },
        }
      } else if (command.op === 'raw' && command.opcode === 0x09) {
        const threshold = Math.max(1, command.operands?.[0] ?? 1)
        const incremented = point.counter + 1
        next = {
          kind: 'to',
          state:
            incremented < threshold
              ? ensure({ address: point.address, counter: incremented })
              : ensure({ address: point.address + 1, counter: 0 }),
          yield: 'worldTick',
        }
      } else
        next = {
          kind: 'to',
          state: ensure({ address: point.address + 1, counter: point.counter }),
          yield: 'worldTick',
        }
    }
    states.set(id, { label: id, body, next })
  }

  const initial = ensure({ address: spec.rootAddress, counter: 0 })
  const flow: ScriptFlowV5 = {
    kind: 'stateMachine',
    machine: {
      id: 'machine',
      label: spec.label,
      cadence: 'transition',
      initial,
      states: Object.fromEntries([...states].sort(([left], [right]) => left.localeCompare(right))),
    },
  }
  return {
    flow,
    sourceAddresses: [...sourceAddresses].sort((left, right) => left - right),
    productStates: states.size,
  }
}

function readScenes(snapshot: MigrationSnapshot): SceneDefV5[] {
  const ids = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))
    throw new Error('R13 idle gate: scene index 无效')
  return ids.map((id) => {
    const scene = snapshot.files.get(`content/scenes/${String(id)}.json`)
    if (!scene) throw new Error(`R13 idle gate: scene 缺失 ${String(id)}`)
    return structuredClone(scene) as unknown as SceneDefV5
  })
}

function entitySceneIndex(scenes: readonly SceneDefV5[]): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, string[]>()
  for (const scene of scenes)
    for (const entity of scene.entities) {
      const values = index.get(entity.id) ?? []
      values.push(scene.id)
      index.set(entity.id, values)
    }
  for (const values of index.values()) values.sort()
  return index
}

function entityAt(scenes: readonly SceneDefV5[], sceneId: string, entityId: string) {
  const scene = scenes.find((candidate) => candidate.id === sceneId)
  const entity = scene?.entities.find((candidate) => candidate.id === entityId)
  if (!scene || !entity) throw new Error(`R13 idle gate: entity 不存在 ${sceneId}/${entityId}`)
  return entity
}

function installFoldedSteadyAuto(
  scenes: SceneDefV5[],
  spec: ProductSpec,
  flow: ScriptFlowV5,
): void {
  const entity = entityAt(scenes, spec.sceneId, spec.entityId)
  if (!entity.behaviors) entity.behaviors = {}
  if (!entity.behaviors.auto) entity.behaviors.auto = {}
  const auto = entity.behaviors.auto
  if (auto[spec.behaviorId])
    throw new Error(
      `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} folded owner 已存在`,
    )
  const pages = entity.pages ?? []
  if (pages.length !== 1)
    throw new Error(`R13 idle gate: ${spec.sceneId}/${spec.entityId} page 数量漂移`)
  const page = pages[0]!
  const expectedAnimation = {
    sprite: 'sprite-196',
    action: 'pal-auto-v1-08679dac4d0551b2',
    loop: true,
    startAtMs: 1020,
  }
  if (stableJson(page.animation) !== stableJson(expectedAnimation) || page.auto !== undefined)
    throw new Error(`R13 idle gate: ${spec.sceneId}/${spec.entityId} folded animation 漂移`)
  delete page.animation
  page.auto = spec.behaviorId
  auto[spec.behaviorId] = { label: spec.label, order: 0, flow }
}

function assertSourceControlManifest(sourceCommands: readonly SourceCmd[]): void {
  const gates = new Map<number, { target: number; threshold: number }>()
  for (const spec of GATE_OWNER_SPECS)
    for (const gate of spec.gates) {
      const previous = gates.get(gate.address)
      const value = { target: gate.target, threshold: gate.threshold }
      if (previous && stableJson(previous) !== stableJson(value))
        throw new Error(`R13 idle gate: gate manifest 多义 ${gate.address}`)
      gates.set(gate.address, value)
    }
  const expected: Array<readonly [number, number, number]> = [
    [379, 377, 12],
    [542, 541, 8],
    [842, 841, 7],
    [1173, 1170, 12],
    [32215, 32213, 8],
    [32300, 32298, 5],
    [33436, 33435, 6],
    [33440, 33439, 6],
    [33666, 33644, 4],
    [34319, 34318, 4],
    [35436, 35434, 4],
  ]
  if (
    stableJson([...gates].map(([address, gate]) => [address, gate.target, gate.threshold])) !==
    stableJson(expected)
  )
    throw new Error('R13 idle gate: frozen 11 gate manifest 漂移')
  for (const [address, target, threshold] of expected) {
    const command = sourceCommands[address] as AutoSourceCmd | undefined
    if (
      command?.op !== 'end' ||
      command.reset !== true ||
      command.resetTo !== target ||
      command.idleFrames !== threshold
    )
      throw new Error(`R13 idle gate: source gate 漂移 ${address}`)
  }
  const delayed = new Map<number, { target: number; threshold: number }>()
  for (const spec of [...GATE_OWNER_SPECS, ...DELAYED_GOTO_OWNER_SPECS])
    for (const gate of 'delayedGotos' in spec ? (spec.delayedGotos ?? []) : []) {
      const previous = delayed.get(gate.address)
      const value = { target: gate.target, threshold: gate.threshold }
      if (previous && stableJson(previous) !== stableJson(value))
        throw new Error(`R13 idle gate: delayed goto manifest 多义 ${gate.address}`)
      delayed.set(gate.address, value)
    }
  const expectedDelayed: Array<readonly [number, number, number]> = [
    [2616, 2615, 9],
    [2621, 2620, 9],
    [5573, 5572, 10],
    [7340, 7339, 140],
    [16513, 16512, 12],
    [33770, 33768, 9],
    [34313, 34311, 15],
    [34779, 34778, 320],
  ]
  if (
    stableJson(
      [...delayed]
        .sort(([left], [right]) => left - right)
        .map(([address, gate]) => [address, gate.target, gate.threshold]),
    ) !== stableJson(expectedDelayed)
  )
    throw new Error('R13 idle gate: frozen 8 delayed goto manifest 漂移')
  for (const [address, target, threshold] of expectedDelayed) {
    const command = sourceCommands[address] as AutoSourceCmd | undefined
    if (
      command?.op !== 'goto' ||
      labelAddress(command.to) !== target ||
      command.frameDelay !== threshold
    )
      throw new Error(`R13 idle gate: delayed goto ${address} 漂移`)
  }
}

function replaceOrAddBehavior(
  scenes: SceneDefV5[],
  spec: GateOwnerSpec | DelayedGotoOwnerSpec | RestoredAutoOwnerSpec,
  flow: ScriptFlowV5,
): void {
  const entity = entityAt(scenes, spec.sceneId, spec.entityId)
  if (!entity.behaviors) entity.behaviors = {}
  const behaviors = entity.behaviors
  if (!behaviors.auto) behaviors.auto = {}
  const auto = behaviors.auto
  const existing = auto[spec.behaviorId]
  if (spec.mode === 'add') {
    if (existing)
      throw new Error(
        `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} 应为缺失 owner`,
      )
    auto[spec.behaviorId] = {
      label: spec.label,
      order: 'order' in spec ? spec.order : 1,
      flow,
    }
    return
  }
  if (spec.mode === 'folded-animation') {
    if (existing)
      throw new Error(
        `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} folded owner 已存在`,
      )
    const pages = entity.pages ?? []
    if (pages.length !== 1)
      throw new Error(`R13 idle gate: ${spec.sceneId}/${spec.entityId} page 数量漂移`)
    const page = pages[0]!
    const expectedAnimation = {
      sprite: 'sprite-486',
      action: 'pal-auto-v1-2898ab1f6e18d521',
      loop: true,
      startAtMs: 380,
    }
    if (stableJson(page.animation) !== stableJson(expectedAnimation) || page.auto !== undefined)
      throw new Error(`R13 idle gate: ${spec.sceneId}/${spec.entityId} folded animation 漂移`)
    delete page.animation
    page.auto = spec.behaviorId
    auto[spec.behaviorId] = { label: spec.label, order: 0, flow }
    return
  }
  if (!existing)
    throw new Error(
      `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} behavior 缺失`,
    )
  existing.flow = flow
}

function forwardHandoff(
  fromStates: readonly string[],
  targetForState: (state: string) => string,
): CursorHandoffV5 {
  return {
    kind: 'stateMap',
    fromBehavior: 'default',
    cases: fromStates.map((state) => ({
      from: stateCursor(state),
      to: stateCursor(targetForState(state)),
    })),
    onUnmapped: 'error',
  }
}

function addForwardHandoff(
  scenes: SceneDefV5[],
  sceneId: 's250' | 's252',
  entityId: 'e4409' | 'e4440',
): void {
  const entity = entityAt(scenes, sceneId, entityId)
  const trigger = entity.behaviors?.trigger?.default
  if (!trigger) throw new Error(`R13 idle gate: ${sceneId}/${entityId} default trigger 缺失`)
  const sourceStates = entityId === 'e4409' ? [...E4409_DEFAULT_STATES] : [...E4440_DEFAULT_STATES]
  const targetForState = (state: string): string => {
    const wait = /(?:^|-)wait-(\d{2})$/.exec(state)?.[1]
    if (!wait || Number(wait) <= 1) return 'remaining-04'
    if (Number(wait) === 2) return 'remaining-03'
    if (Number(wait) === 3) return 'remaining-02'
    return 'remaining-01'
  }
  let matches = 0
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }
    if (!value || typeof value !== 'object') return
    const command = value as Record<string, unknown>
    if (
      command.kind === 'selectEntityBehavior' &&
      (command.target as { scene?: unknown; entity?: unknown } | undefined)?.scene === sceneId &&
      (command.target as { scene?: unknown; entity?: unknown } | undefined)?.entity === entityId &&
      command.channel === 'auto' &&
      stableJson(command.selection) === stableJson({ kind: 'use', value: 'legacy-001' })
    ) {
      if (command.cursorHandoff !== undefined)
        throw new Error(`R13 idle gate: ${sceneId}/${entityId} forward handoff 已存在`)
      command.cursorHandoff = forwardHandoff(sourceStates, targetForState)
      matches++
    }
    for (const child of Object.values(command)) visit(child)
  }
  visit(trigger.flow)
  if (matches !== 1)
    throw new Error(`R13 idle gate: ${sceneId}/${entityId} forward installer 数量 ${matches}`)
}

function addAutoCursorHandoff(args: {
  scenes: SceneDefV5[]
  sceneId: string
  entityId: string
  behaviorId: string
  fromBehavior: string
  cases: Array<{
    from: ReturnType<typeof stateCursor>
    to: ReturnType<typeof stateCursor>
  }>
}): void {
  let matches = 0
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }
    if (!value || typeof value !== 'object') return
    const command = value as Record<string, unknown>
    if (
      command.kind === 'selectEntityBehavior' &&
      (command.target as { scene?: unknown; entity?: unknown } | undefined)?.scene ===
        args.sceneId &&
      (command.target as { scene?: unknown; entity?: unknown } | undefined)?.entity ===
        args.entityId &&
      command.channel === 'auto' &&
      stableJson(command.selection) === stableJson({ kind: 'use', value: args.behaviorId })
    ) {
      if (command.cursorHandoff !== undefined)
        throw new Error(
          `R13 idle gate: ${args.sceneId}/${args.entityId}/${args.behaviorId} handoff 已存在`,
        )
      command.cursorHandoff = {
        kind: 'stateMap',
        fromBehavior: args.fromBehavior,
        cases: args.cases,
        onUnmapped: 'error',
      } satisfies CursorHandoffV5
      matches++
    }
    for (const child of Object.values(command)) visit(child)
  }
  visit(args.scenes)
  if (matches !== 1)
    throw new Error(
      `R13 idle gate: ${args.sceneId}/${args.entityId}/${args.behaviorId} ` +
        `installer 数量 ${matches}`,
    )
}

function assertPublicIdsAddressFree(flow: ScriptFlowV5, ownerKey: string): void {
  if (flow.kind !== 'stateMachine') throw new Error(`R13 idle gate: ${ownerKey} 非 stateMachine`)
  const ids = [flow.machine.id, ...Object.keys(flow.machine.states)]
  if (ids.some((id) => /source-\d|L[_-]\d/.test(id)))
    throw new Error(`R13 idle gate: ${ownerKey} 泄漏 PAL address`)
}

function cursorHandoffStats(flow: ScriptFlowV5): {
  commands: number
  cases: number
} {
  let commands = 0
  let cases = 0
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (
      record.kind === 'selectEntityBehavior' &&
      record.cursorHandoff &&
      typeof record.cursorHandoff === 'object' &&
      !Array.isArray(record.cursorHandoff)
    ) {
      const handoffCases = (record.cursorHandoff as { cases?: unknown }).cases
      commands++
      cases += Array.isArray(handoffCases) ? handoffCases.length : 0
    }
    for (const child of Object.values(record)) visit(child)
  }
  visit(flow)
  return { commands, cases }
}

export function augmentR13AutoIdleGates(args: {
  snapshot: MigrationSnapshot
  sourceCommands: readonly SourceCmd[]
}): R13AutoIdleGateAugmentation {
  assertSourceControlManifest(args.sourceCommands)
  const scenes = readScenes(args.snapshot)
  const entityScenes = entitySceneIndex(scenes)
  const steadyOwners: R13AutoProductOwnerEvidenceV1[] = []
  const recordProductOwner = (
    target: R13AutoProductOwnerEvidenceV1[],
    spec: ProductSpec,
    compiled: ReturnType<typeof compileProductFlow>,
  ): void => {
    target.push({
      ownerKey: `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`,
      rootAddress: spec.rootAddress,
      productStates: compiled.productStates,
      sourceDigest: stableJsonSha256(
        compiled.sourceAddresses.map((address) => ({
          address,
          command: args.sourceCommands[address],
        })),
      ),
      flowDigest: stableJsonSha256(compiled.flow),
    })
  }

  for (const spec of STEADY_AUTO_SPECS) {
    const entity = entityAt(scenes, spec.sceneId, spec.entityId)
    const behavior = entity.behaviors?.auto?.[spec.behaviorId]
    if (!behavior)
      throw new Error(
        `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} default auto 缺失`,
      )
    const compiled = compileProductFlow({
      spec,
      sourceCommands: args.sourceCommands,
      entityScenes,
    })
    behavior.flow = compiled.flow
    assertPublicIdsAddressFree(
      compiled.flow,
      `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`,
    )
    recordProductOwner(steadyOwners, spec, compiled)
  }
  for (const spec of FOLDED_STEADY_AUTO_SPECS) {
    const compiled = compileProductFlow({
      spec,
      sourceCommands: args.sourceCommands,
      entityScenes,
    })
    installFoldedSteadyAuto(scenes, spec, compiled.flow)
    assertPublicIdsAddressFree(
      compiled.flow,
      `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`,
    )
    recordProductOwner(steadyOwners, spec, compiled)
  }

  if (!entityAt(scenes, 's003', 'e56').behaviors?.trigger?.['legacy-001'])
    throw new Error('R13 idle gate: s003/e56 trigger root 355 的 stable owner 缺失')

  const owners: R13AutoIdleGateOwnerEvidenceV1[] = []
  const delayedGotoOwners: R13AutoDelayedGotoOwnerEvidenceV1[] = []
  const restoredOwners: R13AutoIdleGateEvidenceV1['restoredOwners'] = []
  const recordDelayedGotoOwner = (
    spec: GateOwnerSpec | DelayedGotoOwnerSpec,
    compiled: ReturnType<typeof compileProductFlow>,
  ): void => {
    const gates = spec.delayedGotos ?? []
    if (!gates.length) return
    delayedGotoOwners.push({
      ownerKey: `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`,
      rootAddress: spec.rootAddress,
      delayedGotoAddresses: gates.map((gate) => gate.address),
      delayedGotoPhaseCount: gates.reduce((sum, gate) => sum + gate.threshold, 0),
      productStates: compiled.productStates,
      sourceDigest: stableJsonSha256(
        compiled.sourceAddresses.map((address) => ({
          address,
          command: args.sourceCommands[address],
        })),
      ),
      flowDigest: stableJsonSha256(compiled.flow),
    })
  }
  for (const spec of GATE_OWNER_SPECS) {
    const compiled = compileProductFlow({
      spec,
      sourceCommands: args.sourceCommands,
      entityScenes,
    })
    replaceOrAddBehavior(scenes, spec, compiled.flow)
    const ownerKey = `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`
    assertPublicIdsAddressFree(compiled.flow, ownerKey)
    owners.push({
      ownerKey,
      rootAddress: spec.rootAddress,
      gateAddresses: spec.gates.map((gate) => gate.address),
      gatePhaseCount: spec.gates.reduce((sum, gate) => sum + gate.threshold, 0),
      productStates: compiled.productStates,
      sourceDigest: stableJsonSha256(
        compiled.sourceAddresses.map((address) => ({
          address,
          command: args.sourceCommands[address],
        })),
      ),
      flowDigest: stableJsonSha256(compiled.flow),
    })
    recordDelayedGotoOwner(spec, compiled)
  }
  for (const spec of DELAYED_GOTO_OWNER_SPECS) {
    const compiled = compileProductFlow({
      spec,
      sourceCommands: args.sourceCommands,
      entityScenes,
    })
    replaceOrAddBehavior(scenes, spec, compiled.flow)
    const ownerKey = `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`
    assertPublicIdsAddressFree(compiled.flow, ownerKey)
    recordDelayedGotoOwner(spec, compiled)
  }
  for (const spec of RESTORED_AUTO_OWNER_SPECS) {
    const compiled = compileProductFlow({
      spec,
      sourceCommands: args.sourceCommands,
      entityScenes,
    })
    if (stableJson(compiled.sourceAddresses) !== stableJson(spec.sourceAddresses))
      throw new Error(
        `R13 idle gate: ${spec.sceneId}/${spec.entityId}/${spec.behaviorId} ` +
          `source closure 漂移 ${stableJson(compiled.sourceAddresses)}`,
      )
    replaceOrAddBehavior(scenes, spec, compiled.flow)
    const ownerKey = `${spec.sceneId}/${spec.entityId}/auto/${spec.behaviorId}`
    assertPublicIdsAddressFree(compiled.flow, ownerKey)
    recordProductOwner(restoredOwners, spec, compiled)
  }

  const e405TargetSpec = DELAYED_GOTO_OWNER_SPECS.find(
    (spec) =>
      spec.sceneId === 's021' && spec.entityId === 'e405' && spec.behaviorId === 'legacy-001',
  )
  const e4723TargetSpec = DELAYED_GOTO_OWNER_SPECS.find(
    (spec) =>
      spec.sceneId === 's273' && spec.entityId === 'e4723' && spec.behaviorId === 'c8-3278127a7af6',
  )
  if (!e405TargetSpec || !e4723TargetSpec)
    throw new Error('R13 idle gate: delayed handoff target spec 缺失')
  addAutoCursorHandoff({
    scenes,
    sceneId: 's021',
    entityId: 'e405',
    behaviorId: 'legacy-001',
    fromBehavior: 'default',
    // PAL 每帧按实体 id 升序：e405 先跑，e406 的 wait3 到期后下一帧
    // 才在 @7338 安装；此刻 e405 唯一可达相位是 @7317/counter=5。
    cases: [
      {
        from: stateCursor(e405DefaultStateId({ address: 7317, counter: 5 })!),
        to: stateCursor(genericStateId(e405TargetSpec, { address: 7339, counter: 5 })),
      },
    ],
  })
  for (const target of S231_CROWD_TARGETS) {
    const sourceSpec = STEADY_AUTO_SPECS.find(
      (spec) =>
        spec.sceneId === 's231' &&
        spec.entityId === target.entityId &&
        spec.behaviorId === 'default',
    )
    const targetSpec = RESTORED_AUTO_OWNER_SPECS.find(
      (spec) => spec.entityId === target.entityId && spec.behaviorId === 'legacy-001',
    )
    if (!sourceSpec || !targetSpec)
      throw new Error(`R13 idle gate: s231/${target.entityId} cursor handoff spec 缺失`)
    addAutoCursorHandoff({
      scenes,
      sceneId: 's231',
      entityId: target.entityId,
      behaviorId: 'legacy-001',
      fromBehavior: 'default',
      cases: E4168_LEGACY_003_POINTS.map((point) => ({
        from: stateCursor(genericStateId(sourceSpec, point)),
        to: stateCursor(
          genericStateId(targetSpec, {
            address: target.rootAddress,
            counter:
              point.address === 32021 ? Math.min(point.counter, target.firstWaitThreshold - 1) : 0,
          }),
        ),
      })),
    })
  }
  const e4168SourceSpec = RESTORED_AUTO_OWNER_SPECS.find((spec) => spec.behaviorId === 'legacy-003')
  const e4168TargetSpec = RESTORED_AUTO_OWNER_SPECS.find((spec) => spec.behaviorId === 'legacy-004')
  if (!e4168SourceSpec || !e4168TargetSpec)
    throw new Error('R13 idle gate: s231/e4168 cursor handoff spec 缺失')
  addAutoCursorHandoff({
    scenes,
    sceneId: 's231',
    entityId: 'e4168',
    behaviorId: 'legacy-004',
    fromBehavior: 'legacy-003',
    cases: E4168_LEGACY_003_POINTS.map((point) => ({
      from: stateCursor(genericStateId(e4168SourceSpec, point)),
      to: stateCursor(
        genericStateId(e4168TargetSpec, {
          address: 32222,
          counter: point.address === 32021 ? Math.min(point.counter, 2) : 0,
        }),
      ),
    })),
  })
  addAutoCursorHandoff({
    scenes,
    sceneId: 's273',
    entityId: 'e4723',
    behaviorId: 'c8-3278127a7af6',
    fromBehavior: 'default',
    cases: E4723_DEFAULT_POINTS.map((point) => ({
      from: stateCursor(genericStateId(FOLDED_STEADY_AUTO_SPECS[0], point)),
      to: stateCursor(genericStateId(e4723TargetSpec, { address: 34778, counter: point.counter })),
    })),
  })

  addForwardHandoff(scenes, 's250', 'e4409')
  addForwardHandoff(scenes, 's252', 'e4440')

  const refreshFinalFlowDigest = (owner: { ownerKey: string; flowDigest: string }): void => {
    const match = /^([^/]+)\/([^/]+)\/auto\/(.+)$/.exec(owner.ownerKey)
    const flow = match
      ? scenes
          .find((scene) => scene.id === match[1])
          ?.entities.find((entity) => entity.id === match[2])?.behaviors?.auto?.[match[3]!]?.flow
      : undefined
    if (!flow) throw new Error(`R13 idle gate: final owner flow 缺失 ${owner.ownerKey}`)
    owner.flowDigest = stableJsonSha256(flow)
  }
  for (const owner of [...owners, ...delayedGotoOwners, ...steadyOwners, ...restoredOwners])
    refreshFinalFlowDigest(owner)

  const installerOwners: R13AutoInstallerOwnerEvidenceV1[] = []
  for (const scene of scenes) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {})) {
          const stats = cursorHandoffStats(behavior.flow)
          if (stats.commands)
            installerOwners.push({
              ownerKey: `entity:${scene.id}:${entity.id}:${channel}:${behaviorId}`,
              ...stats,
              flowDigest: stableJsonSha256(behavior.flow),
            })
        }
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {})) {
        const stats = cursorHandoffStats(hook.flow)
        if (stats.commands)
          installerOwners.push({
            ownerKey: `hook:${scene.id}:${slot}:${hookId}`,
            ...stats,
            flowDigest: stableJsonSha256(hook.flow),
          })
      }
  }
  installerOwners.sort((left, right) => left.ownerKey.localeCompare(right.ownerKey))
  if (
    installerOwners.length !== 7 ||
    installerOwners.reduce((sum, owner) => sum + owner.commands, 0) !== 18 ||
    installerOwners.reduce((sum, owner) => sum + owner.cases, 0) !== 247
  )
    throw new Error(
      `R13 idle gate: cursor handoff owners/commands/cases=` +
        `${installerOwners.length}/` +
        `${installerOwners.reduce((sum, owner) => sum + owner.commands, 0)}/` +
        `${installerOwners.reduce((sum, owner) => sum + owner.cases, 0)}，` +
        `期望 7/18/247`,
    )

  if (owners.length !== 12) throw new Error(`R13 idle gate: owner 数量 ${owners.length}，期望 12`)
  const executionSites = owners.reduce((sum, owner) => sum + owner.gateAddresses.length, 0)
  const ownerExpandedGatePhases = owners.reduce((sum, owner) => sum + owner.gatePhaseCount, 0)
  if (executionSites !== 13 || ownerExpandedGatePhases !== 84)
    throw new Error(
      `R13 idle gate: sites/phases=${executionSites}/${ownerExpandedGatePhases}，期望 13/84`,
    )
  const delayedGotoAddresses = new Set(
    delayedGotoOwners.flatMap((owner) => owner.delayedGotoAddresses),
  )
  const delayedGotoExecutionSites = delayedGotoOwners.reduce(
    (sum, owner) => sum + owner.delayedGotoAddresses.length,
    0,
  )
  const delayedGotoOwnerExpandedPhases = delayedGotoOwners.reduce(
    (sum, owner) => sum + owner.delayedGotoPhaseCount,
    0,
  )
  if (
    delayedGotoAddresses.size !== 8 ||
    delayedGotoExecutionSites !== 15 ||
    delayedGotoOwnerExpandedPhases !== 1657
  )
    throw new Error(
      `R13 idle gate: delayed addresses/sites/phases=` +
        `${delayedGotoAddresses.size}/${delayedGotoExecutionSites}/` +
        `${delayedGotoOwnerExpandedPhases}，期望 8/15/1657`,
    )
  if (restoredOwners.length !== 16)
    throw new Error(`R13 idle gate: restored auto owner 数量 ${restoredOwners.length}，期望 16`)
  if (steadyOwners.length !== 15)
    throw new Error(`R13 idle gate: steady auto owner 数量 ${steadyOwners.length}，期望 15`)

  validateHistoricalScenesForCurrentSchema(scenes)
  const files = new Map(args.snapshot.files)
  const managedFiles = new Set(args.snapshot.managedFiles)
  // `readScenes` already created this augmentation's isolated working set.  Retain those values
  // directly in the successor instead of JSON-cloning every scene a second time at the handoff.
  for (const scene of scenes) {
    const path = `content/scenes/${scene.id}.json`
    files.set(path, scene as unknown as MigrationJson)
    managedFiles.add(path)
  }
  const withoutDigest = {
    kind: 'r13-auto-idle-gate-evidence',
    version: 1,
    sourceGateAddresses: 11,
    entityOwners: 12,
    executionSites: 13,
    ownerExpandedGatePhases: 84,
    delayedGotoAddresses: 8,
    delayedGotoExecutionSites: 15,
    delayedGotoOwnerExpandedPhases: 1657,
    steadyAutoOwners: 15,
    restoredAutoOwners: 16,
    cursorHandoffCases: {
      e405Forward: 1,
      e4168Forward: 16,
      s231CrowdForward: 176,
      e4409Forward: 13,
      e4440Forward: 15,
      e4723Forward: 24,
      reverse: 2,
    },
    owners: owners.sort((left, right) => left.ownerKey.localeCompare(right.ownerKey)),
    delayedGotoOwners: delayedGotoOwners.sort((left, right) =>
      left.ownerKey.localeCompare(right.ownerKey),
    ),
    steadyOwners: steadyOwners.sort((left, right) => left.ownerKey.localeCompare(right.ownerKey)),
    restoredOwners: restoredOwners.sort((left, right) =>
      left.ownerKey.localeCompare(right.ownerKey),
    ),
    installerOwners,
  } as const
  return {
    snapshot: { files, managedFiles },
    evidence: {
      ...withoutDigest,
      digest: stableJsonSha256(withoutDigest),
    },
  }
}
