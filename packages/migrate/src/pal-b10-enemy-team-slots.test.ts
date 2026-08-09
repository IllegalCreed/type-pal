import { describe, expect, test } from 'vitest'
import {
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
} from './experimental/script-v5/r13-z-transition-mg2.js'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from './migration-baseline.js'
import {
  assertB10PublishedAuthority,
  assertB10PublishedReplayUnchanged,
  B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
  B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
  B10_ENEMY_TEAMS_PATH,
  buildB10EnemyTeamSlotsSeal,
  finalizeB10EnemyTeamSlotsSeal,
  installB10EnemyTeamSlotsSeal,
  rewindB10ProjectAgainstPublishedBaseline,
  rewindB10PublicationIfPresent,
  shouldRunB10EnemyTeamSlotsTransition,
} from './pal-b10-enemy-team-slots.js'
import type { MigrationJson } from './pal-migration.js'
import { R13_SIX_C_SEAL_PATH, R13_SIX_C_TRANSITION_ID } from './pal-r13-six-c.js'

const census = {
  sourceTeams: 380,
  sourceEntries: 1900,
  skippedEmptySlots: 1039,
  semanticSlots: 861,
  nullSlots: 104,
  validSlots: 757,
  teamsWithNullSlots: 68,
  teamsWithNullAndMultipleValid: 56,
} as const

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function setFile(snapshot: MigrationSnapshot, path: string, value: unknown): void {
  const json = asJson(value)
  snapshot.files.set(path, json)
  snapshot.managedFiles.add(path)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(json, path)))
}

function control(snapshot: MigrationSnapshot, id: string, path: string, digest: string): void {
  setFile(snapshot, path, { kind: `${id}-test`, version: 1, digest })
  snapshot.baselineMetadata!.transitions[id] = digest
}

function parentSnapshot(): MigrationSnapshot {
  const snapshot: MigrationSnapshot = {
    files: new Map(),
    managedFiles: new Set(),
    hashes: new Map(),
    baselineMetadata: { generatorEpoch: 'test-v11', transitions: {} },
  }
  setFile(snapshot, B10_ENEMY_TEAMS_PATH, [
    { id: 'team-0', members: ['enemy-1', 'enemy-2'] },
    { id: 'team-1', members: ['enemy-3'] },
  ])
  control(snapshot, R13_SIX_C_TRANSITION_ID, R13_SIX_C_SEAL_PATH, '6'.repeat(64))
  control(snapshot, R13_Z_TRANSITION_ID, R13_Z_SEAL_PATH, '7'.repeat(64))
  return snapshot
}

const sourceTeams = [
  { id: 0, enemyObjectIndexes: [1, 0, 2, 65535, 65535] },
  { id: 1, enemyObjectIndexes: [3, 65535, 65535, 65535, 65535] },
]
const successorTeams = [
  { id: 'team-0', slots: ['enemy-1', null, 'enemy-2'] },
  { id: 'team-1', slots: ['enemy-3'] },
]

function publish(): { parent: MigrationSnapshot; published: MigrationSnapshot } {
  const parent = parentSnapshot()
  const authority = buildB10EnemyTeamSlotsSeal({
    baseline: parent,
    sourceTeams,
    successorTeams,
    census,
  })
  const published = structuredClone(parent)
  setFile(published, B10_ENEMY_TEAMS_PATH, successorTeams)
  const seal = finalizeB10EnemyTeamSlotsSeal(authority, published)
  expect(
    installB10EnemyTeamSlotsSeal(published, seal, {
      parentContent: parent.files.get(B10_ENEMY_TEAMS_PATH),
      successorContent: successorTeams,
    }),
  ).toBe('initialize')
  return { parent, published }
}

describe('B10 enemy-team slots append-only authority', () => {
  test('CLI entry routes both v11 initialization and published v12 replay', () => {
    const base = {
      bootstrap: false,
      hasExpectedTransition: false,
      writeOnce: false,
      verifyIdempotence: false,
      repairR13ConfirmSeal: false,
    } as const
    expect(shouldRunB10EnemyTeamSlotsTransition({ ...base, contentVersion: 11 })).toBe(true)
    expect(shouldRunB10EnemyTeamSlotsTransition({ ...base, contentVersion: 12 })).toBe(true)
    for (const key of [
      'bootstrap',
      'hasExpectedTransition',
      'writeOnce',
      'verifyIdempotence',
      'repairR13ConfirmSeal',
    ] as const)
      expect(
        shouldRunB10EnemyTeamSlotsTransition({ ...base, contentVersion: 12, [key]: true }),
      ).toBe(false)
    expect(shouldRunB10EnemyTeamSlotsTransition({ ...base, contentVersion: 10 })).toBe(false)
  })

  test('initialize/replay/rewind preserve the frozen v11 parent and full v12 slot surface', () => {
    const { parent, published } = publish()
    const seal = assertB10PublishedAuthority(published)
    expect(seal?.transitionId).toBe(B10_ENEMY_TEAM_SLOTS_TRANSITION_ID)

    const rebuiltBody = buildB10EnemyTeamSlotsSeal({
      baseline: parent,
      sourceTeams,
      successorTeams,
      census,
    })
    const rebuilt = finalizeB10EnemyTeamSlotsSeal(rebuiltBody, published)
    const beforeReplay = structuredClone(published)
    expect(
      installB10EnemyTeamSlotsSeal(published, rebuilt, { successorContent: successorTeams }),
    ).toBe('replay')
    expect(published).toEqual(beforeReplay)

    const rewound = rewindB10PublicationIfPresent(published)
    expect(rewound.files.get(B10_ENEMY_TEAMS_PATH)).toEqual(parent.files.get(B10_ENEMY_TEAMS_PATH))
    expect(rewound.files.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(rewound.managedFiles.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(rewound.hashes?.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(
      rewound.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID],
    ).toBeUndefined()
  })

  test('published replay rejects null-slot source drift even when parent and census stay fixed', () => {
    const { parent, published } = publish()
    const driftedSourceTeams = [
      { id: 0, enemyObjectIndexes: [0, 1, 2, 65535, 65535] },
      sourceTeams[1]!,
    ]
    const driftedSuccessorTeams = [
      { id: 'team-0', slots: [null, 'enemy-1', 'enemy-2'] },
      successorTeams[1]!,
    ]
    const authority = buildB10EnemyTeamSlotsSeal({
      baseline: parent,
      sourceTeams: driftedSourceTeams,
      successorTeams: driftedSuccessorTeams,
      census,
    })
    const rebuilt = structuredClone(parent)
    setFile(rebuilt, B10_ENEMY_TEAMS_PATH, driftedSuccessorTeams)
    const seal = finalizeB10EnemyTeamSlotsSeal(authority, rebuilt)
    expect(
      installB10EnemyTeamSlotsSeal(rebuilt, seal, {
        parentContent: parent.files.get(B10_ENEMY_TEAMS_PATH),
        successorContent: driftedSuccessorTeams,
      }),
    ).toBe('initialize')
    expect(() => assertB10PublishedReplayUnchanged(published, rebuilt)).toThrow(
      /重建 authority 与 published authority 不符/,
    )
    expect(rewindB10PublicationIfPresent(rebuilt).files.get(B10_ENEMY_TEAMS_PATH)).toEqual(
      parent.files.get(B10_ENEMY_TEAMS_PATH),
    )
  })

  test('project rewind is pinned by the published baseline and removes a managed placeholder', () => {
    const { parent, published } = publish()
    const project: MigrationSnapshot = {
      files: new Map([
        [B10_ENEMY_TEAMS_PATH, asJson(successorTeams)],
        [
          B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
          asJson(published.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)),
        ],
      ]),
      managedFiles: new Set([B10_ENEMY_TEAMS_PATH, B10_ENEMY_TEAM_SLOTS_SEAL_PATH]),
      hashes: new Map([
        [
          B10_ENEMY_TEAMS_PATH,
          sha256(serializeMigrationJson(asJson(successorTeams), B10_ENEMY_TEAMS_PATH)),
        ],
        [
          B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
          sha256(
            serializeMigrationJson(
              asJson(published.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)),
              B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
            ),
          ),
        ],
      ]),
    }
    const rewound = rewindB10ProjectAgainstPublishedBaseline(project, published)
    expect(rewound.files.get(B10_ENEMY_TEAMS_PATH)).toEqual(parent.files.get(B10_ENEMY_TEAMS_PATH))
    expect(rewound.files.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(rewound.managedFiles.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)

    const drift = structuredClone(project)
    setFile(drift, B10_ENEMY_TEAMS_PATH, [{ id: 'team-0', slots: ['enemy-1'] }])
    expect(() => rewindB10ProjectAgainstPublishedBaseline(drift, published)).toThrow(
      /published authority/,
    )

    const forgedSeal = structuredClone(project)
    const seal = forgedSeal.files.get(B10_ENEMY_TEAM_SLOTS_SEAL_PATH) as Record<string, unknown>
    seal.digest = 'f'.repeat(64)
    expect(() => rewindB10ProjectAgainstPublishedBaseline(forgedSeal, published)).toThrow(
      /工程 seal 与 published authority 不符/,
    )
  })

  test('half-state, parent-control drift and successor drift all fail closed', () => {
    const { published } = publish()
    const half = structuredClone(published)
    half.hashes?.delete(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)
    expect(() => rewindB10PublicationIfPresent(half)).toThrow(/半状态/)

    const controlDrift = structuredClone(published)
    controlDrift.baselineMetadata!.transitions[R13_Z_TRANSITION_ID] = '8'.repeat(64)
    expect(() => rewindB10PublicationIfPresent(controlDrift)).toThrow(/metadata 与 published/)

    const contentDrift = structuredClone(published)
    setFile(contentDrift, B10_ENEMY_TEAMS_PATH, [{ id: 'team-0', slots: ['enemy-1', 'enemy-2'] }])
    expect(() => rewindB10PublicationIfPresent(contentDrift)).toThrow(/successor content digest/)
  })

  test('initialize rejects a slots/members mixed parent surface', () => {
    const parent = parentSnapshot()
    const authority = buildB10EnemyTeamSlotsSeal({
      baseline: parent,
      sourceTeams,
      successorTeams,
      census,
    })
    const mixed = structuredClone(parent)
    setFile(mixed, B10_ENEMY_TEAMS_PATH, [
      { id: 'team-0', members: ['enemy-1'], slots: ['enemy-1'] },
    ])
    const seal = finalizeB10EnemyTeamSlotsSeal(authority, mixed)
    expect(() =>
      installB10EnemyTeamSlotsSeal(mixed, seal, {
        parentContent: parent.files.get(B10_ENEMY_TEAMS_PATH),
      }),
    ).toThrow(/未知字段|v12/)
  })

  test('seal 构建拒绝 null 位置或敌引用偏离 extracted source 的伪 successor', () => {
    const parent = parentSnapshot()
    expect(() =>
      buildB10EnemyTeamSlotsSeal({
        baseline: parent,
        sourceTeams,
        successorTeams: [
          { id: 'team-0', slots: [null, 'enemy-1', 'enemy-2'] },
          { id: 'team-1', slots: ['enemy-3'] },
        ],
        census,
      }),
    ).toThrow(/精确投影/)
  })

  test('initialize 在落四元组前拒绝自洽但伪造的 parent control', () => {
    const parent = parentSnapshot()
    const authority = buildB10EnemyTeamSlotsSeal({
      baseline: parent,
      sourceTeams,
      successorTeams,
      census,
    })
    const target = structuredClone(parent)
    setFile(target, B10_ENEMY_TEAMS_PATH, successorTeams)
    const forged = structuredClone(authority)
    forged.parent.sealDigest = '8'.repeat(64)
    const seal = finalizeB10EnemyTeamSlotsSeal(forged, target)
    expect(() =>
      installB10EnemyTeamSlotsSeal(target, seal, {
        parentContent: parent.files.get(B10_ENEMY_TEAMS_PATH),
        successorContent: successorTeams,
      }),
    ).toThrow(/control 漂移/)
    expect(target.files.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(target.managedFiles.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(target.hashes?.has(B10_ENEMY_TEAM_SLOTS_SEAL_PATH)).toBe(false)
    expect(target.baselineMetadata?.transitions[B10_ENEMY_TEAM_SLOTS_TRANSITION_ID]).toBeUndefined()
  })
})
