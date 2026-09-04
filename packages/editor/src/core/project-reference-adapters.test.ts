import type { CurrentManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import type { EntityAddressReference } from './entity-address-references.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  projectReferenceTargetKey,
} from './project-reference.js'
import {
  battleDataReferenceEdges,
  buildProjectReferenceSnapshotFromProjection,
  canonicalCommandTargetEdges,
  entityAddressReferenceEdges,
  legacyScriptChunkTargetEdges,
  structuralProjectReferenceEdges,
} from './project-reference-adapters.js'
import type { CanonicalScriptCommandVisit, ScriptEditorState } from './script-editor.js'

const commandVisit = (
  command: CanonicalScriptCommandVisit['command'],
  path: string,
): CanonicalScriptCommandVisit => ({
  command,
  path,
  locator: {
    kind: 'command',
    owner: { kind: 'shared-script', scriptId: 'shared/test' },
    container: { kind: 'body' },
    commandPath: '0',
  },
})

const manifest = {
  id: 'test',
  name: 'Test',
  contentVersion: 19,
  defaultEntryId: 'main',
  entryPoints: [
    {
      id: 'main',
      label: '主入口',
      scene: 'start',
      startWorld: { party: [], inventory: [], money: 0 },
    },
  ],
  content: {},
  assets: { catalog: 'assets/index.json', roles: {} },
  minimumSaveVersion: 8,
} as unknown as CurrentManifest
const noEntryManifest = { ...manifest, entryPoints: [] } as unknown as CurrentManifest

describe('project reference adapters', () => {
  test('canonical loadScene entry is one row shared by entry and parent scene buckets', () => {
    const edges = canonicalCommandTargetEdges([
      commandVisit({ kind: 'loadScene', scene: 'next', entryId: 'door' }, 'shared.test.body[0]'),
    ])
    const snapshot = buildProjectReferenceSnapshotFromProjection({
      state: { manifest: noEntryManifest, scenes: [], scriptChunks: {} } as unknown as EditorState,
      scriptState: { scenes: [], items: [], sharedScripts: {} },
      commandVisits: [
        commandVisit({ kind: 'loadScene', scene: 'next', entryId: 'door' }, 'shared.test.body[0]'),
      ],
      entityAddressReferences: [],
    })
    const index = createProjectReferenceIndex(snapshot)
    expect(edges).toHaveLength(1)
    expect(snapshot.rows).toHaveLength(2)
    const entryReference = index.referencesTo({
      kind: 'scene-entry',
      sceneId: 'next',
      entryId: 'door',
    })[0]
    expect(entryReference).toBeDefined()
    expect(index.referencesTo({ kind: 'scene', id: 'next' })[0]?.id).toBe(entryReference?.id)
  })

  test('buy creates a shop edge while sell zero/nonzero never does', () => {
    const edges = canonicalCommandTargetEdges([
      commandVisit({ kind: 'openShop', shop: 7, mode: 'buy' }, 'buy'),
      commandVisit({ kind: 'openShop', shop: 0, mode: 'sell' }, 'sell-zero'),
      commandVisit({ kind: 'openShop', shop: 7, mode: 'sell' }, 'sell-nonzero'),
    ])
    expect(edges.map((edge) => edge.target)).toEqual([{ kind: 'shop', id: '7' }])
  })

  test('s230-style script map override is visible without a scene.mapId edge', () => {
    const edges = canonicalCommandTargetEdges([
      commandVisit({ kind: 'setSceneMapOverride', mapId: 'map-164' }, 's230.override'),
    ])
    expect(edges.map((edge) => edge.target)).toEqual([{ kind: 'map', id: 'map-164' }])
  })

  test('structural entry and scene map edges use stable owner identities', () => {
    const edges = structuralProjectReferenceEdges({
      manifest,
      scenes: [
        {
          id: 'start',
          mapId: 'map-start',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ],
    } as Pick<EditorState, 'manifest' | 'scenes'>)
    expect(edges.map((edge) => edge.target)).toEqual([
      { kind: 'battle-field', id: '24' },
      { kind: 'scene', id: 'start' },
      { kind: 'map', id: 'map-start' },
    ])
    expect(edges.every((edge) => !edge.source.key.includes('主入口'))).toBe(true)
  })

  test('structural battle field, enemy team and runtime ambience edges preserve ownership', () => {
    const edges = structuralProjectReferenceEdges({
      manifest: noEntryManifest,
      scenes: [
        {
          id: 'arena',
          mapId: 'map-arena',
          battleFieldId: 25,
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'guard',
              sprite: 'guard',
              pos: { col: 1, row: 2, height: 0 },
              hostile: { enemyTeamId: 'team-guard', battleFieldId: 26 },
            },
          ],
        },
      ],
      worlds: [
        {
          ambience: 'night',
          party: [],
          reserve: [],
          money: 0,
          learnedSkills: {},
          inventory: [],
        },
      ],
    } as Pick<EditorState, 'manifest' | 'scenes' | 'worlds'>)
    const index = createProjectReferenceIndex(buildProjectReferenceSnapshot(edges))

    expect(index.referencesTo({ kind: 'battle-field', id: '24' })).toMatchObject([
      {
        relation: { kind: 'battle-field-use', use: 'project-default' },
        locator: { kind: 'unavailable' },
        deletePolicy: 'block',
      },
    ])
    expect(index.referencesTo({ kind: 'battle-field', id: '25' })).toMatchObject([
      {
        source: { owner: { kind: 'scene', id: 'arena' } },
        relation: { kind: 'battle-field-use', use: 'scene-default' },
        locator: {
          kind: 'object',
          object: { kind: 'scene', id: 'arena' },
          section: 'battle-field',
        },
      },
    ])
    expect(index.referencesTo({ kind: 'battle-field', id: '26' })).toMatchObject([
      {
        source: { owner: { kind: 'scene-entity', sceneId: 'arena', entityId: 'guard' } },
        relation: { kind: 'battle-field-use', use: 'hostile' },
        locator: {
          kind: 'object',
          object: { kind: 'entity', sceneId: 'arena', entityId: 'guard' },
        },
      },
    ])
    expect(index.referencesTo({ kind: 'enemy-team', id: 'team-guard' })).toMatchObject([
      { relation: { kind: 'enemy-team-use', use: 'hostile' } },
    ])
    expect(index.referencesTo({ kind: 'ambience', id: 'night' })).toMatchObject([
      {
        source: { owner: { kind: 'runtime-world' } },
        relation: { kind: 'ambience-use', use: 'world-state' },
        locator: { kind: 'unavailable' },
        deletePolicy: 'block',
      },
    ])
  })

  test('canonical battle and ambience commands use domain relations with exact locators', () => {
    const edges = canonicalCommandTargetEdges([
      commandVisit({ kind: 'startBattle', enemyTeamId: 'team-boss', fieldId: 30 }, 'battle'),
      commandVisit({ kind: 'setAmbience', ambience: 'warm' }, 'ambience'),
      commandVisit({ kind: 'toggleDayNight', ms: 800 }, 'toggle'),
    ])
    const index = createProjectReferenceIndex(buildProjectReferenceSnapshot(edges))

    expect(index.referencesTo({ kind: 'enemy-team', id: 'team-boss' })).toMatchObject([
      {
        relation: { kind: 'enemy-team-use', use: 'start-battle' },
        locator: { kind: 'canonical-script' },
        deletePolicy: 'replace-suggest',
      },
    ])
    expect(index.referencesTo({ kind: 'battle-field', id: '30' })).toMatchObject([
      { relation: { kind: 'battle-field-use', use: 'start-battle' } },
    ])
    expect(index.referencesTo({ kind: 'ambience', id: 'warm' })).toMatchObject([
      { relation: { kind: 'ambience-use', use: 'set-ambience' } },
    ])
    for (const id of ['day', 'night'])
      expect(index.referencesTo({ kind: 'ambience', id })).toMatchObject([
        { relation: { kind: 'ambience-use', use: 'toggle-day-night' } },
      ])
  })

  test('self entity addresses are omitted while cross-owner addresses stay queryable', () => {
    const references: EntityAddressReference[] = [
      {
        sceneId: 'start',
        entityId: 'door',
        path: 'scenes[0].entities[0].target',
        locator: { kind: 'scene-entity', sceneId: 'start', entityId: 'door' },
      },
      {
        sceneId: 'start',
        entityId: 'door',
        path: 'scenes[0].entities[1].target',
        locator: { kind: 'scene-entity', sceneId: 'start', entityId: 'watcher' },
      },
    ]
    const edges = entityAddressReferenceEdges(references)
    const snapshot = buildProjectReferenceSnapshotFromProjection({
      state: { manifest: noEntryManifest, scenes: [], scriptChunks: {} } as unknown as EditorState,
      scriptState: { scenes: [], items: [], sharedScripts: {} },
      commandVisits: [],
      entityAddressReferences: references,
    })
    const index = createProjectReferenceIndex(snapshot)
    expect(edges).toHaveLength(1)
    expect(edges[0]?.where).toBe('scenes[0].entities[1].target')
    expect(snapshot.rows).toHaveLength(2)
    expect(index.referencesTo({ kind: 'scene', id: 'start' })).toHaveLength(0)
    const entity = { kind: 'entity', sceneId: 'start', entityId: 'door' } as const
    expect(index.deletionImpact(entity, index.deletionScopeFor([entity])).blockers).toHaveLength(1)
  })

  test('legacy chunks retain readonly scene targets without enabling legacy author commands', () => {
    const edges = legacyScriptChunkTargetEdges({
      c0: {
        id: 'c0',
        scripts: {
          legacy: [
            { kind: 'setSceneOnEnter', scene: 'start', script: { chunk: 'c0', id: 'next' } },
          ],
        },
      },
    } as never)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      target: { kind: 'scene', id: 'start' },
      relation: { kind: 'command-target', use: 'legacy-scene-script-binding' },
      locator: { kind: 'unavailable' },
      deletePolicy: 'block',
    })
  })

  test('legacy battle and ambience targets keep domain relations but remain readonly blockers', () => {
    const edges = legacyScriptChunkTargetEdges({
      c0: {
        id: 'c0',
        scripts: {
          legacy: [
            { kind: 'startBattle', enemyTeamId: 'team-old', fieldId: 31 },
            { kind: 'setAmbience', ambience: 'warm' },
            { kind: 'toggleDayNight', ms: 800 },
          ],
        },
      },
    } as never)
    expect(edges).toHaveLength(5)
    expect(edges.every((edge) => edge.locator.kind === 'unavailable')).toBe(true)
    expect(edges.every((edge) => edge.deletePolicy === 'block')).toBe(true)
    expect(edges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining([
        { kind: 'enemy-team-use', use: 'start-battle' },
        { kind: 'battle-field-use', use: 'start-battle' },
        { kind: 'ambience-use', use: 'set-ambience' },
        { kind: 'ambience-use', use: 'toggle-day-night' },
      ]),
    )
  })

  test('runtime world entity and ambience edges share one stable source definition', () => {
    const runtimeReference: EntityAddressReference = {
      sceneId: 'arena',
      entityId: 'guard',
      path: 'worlds[0].script.followers[0]',
      locator: { kind: 'world', worldId: 'save-1' },
    }
    const snapshot = buildProjectReferenceSnapshotFromProjection({
      state: {
        manifest: noEntryManifest,
        scenes: [],
        scriptChunks: {},
        worlds: [
          {
            ambience: 'night',
            party: [],
            reserve: [],
            money: 0,
            learnedSkills: {},
            inventory: [],
          },
        ],
      } as unknown as EditorState,
      scriptState: { scenes: [], items: [], sharedScripts: {} },
      commandVisits: [],
      entityAddressReferences: [runtimeReference],
    })
    const runtimeSources = snapshot.sources.filter(
      (source) => source.owner.kind === 'runtime-world',
    )
    expect(runtimeSources).toEqual([expect.objectContaining({ label: '运行态/存档' })])
    const index = createProjectReferenceIndex(snapshot)
    expect(index.referencesTo({ kind: 'ambience', id: 'night' })).toHaveLength(1)
    expect(
      index.referencesTo({ kind: 'entity', sceneId: 'arena', entityId: 'guard' }),
    ).toHaveLength(1)
  })

  test('battle data self edges stay visible but deletion scope only preserves external blockers', () => {
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [],
      levelUp: {},
      skills: [],
      items: [],
      enemies: [
        {
          id: 'self',
          ai: { rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'self' } }] },
        },
        {
          id: 'other',
          ai: { rules: [{ at: 'act', do: { kind: 'summon', enemyId: 'self', count: 1 } }] },
        },
      ],
      enemyTeams: [],
      poisons: [
        { id: 1, name: '一号毒', curability: 'common', color: 0, counters: 1 },
        { id: 2, name: '二号毒', curability: 'common', color: 0, lethalWith: 1 },
      ],
      scriptChunks: {},
    } as unknown as EditorState
    const edges = battleDataReferenceEdges(state, [], { scenes: [], items: [], sharedScripts: {} })
    const index = createProjectReferenceIndex(buildProjectReferenceSnapshot(edges))

    const enemyTarget = { kind: 'enemy', id: 'self' } as const
    expect(index.referencesTo(enemyTarget)).toHaveLength(2)
    expect(
      index.deletionImpact(enemyTarget, index.deletionScopeFor([enemyTarget])).blockers,
    ).toMatchObject([
      {
        source: { owner: { kind: 'enemy', id: 'other' } },
        relation: { kind: 'battle-data-use', use: 'enemy-summon' },
      },
    ])

    const poisonTarget = { kind: 'poison', id: '1' } as const
    expect(index.referencesTo(poisonTarget)).toHaveLength(2)
    expect(
      index.deletionImpact(poisonTarget, index.deletionScopeFor([poisonTarget])).blockers,
    ).toMatchObject([
      {
        source: { owner: { kind: 'poison', id: '2' } },
        relation: { kind: 'battle-data-use', use: 'poison-lethal-pair' },
      },
    ])
  })

  test('learn-skill, actor-condition poison and runtime battle data keep exact/read-only locators', () => {
    const livePoison = commandVisit(
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'poison', poisonId: 9 },
      },
      'live-poison',
    )
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [],
      levelUp: {},
      skills: [],
      items: [],
      enemies: [],
      enemyTeams: [],
      poisons: [],
      scriptChunks: {
        legacy: {
          id: 'legacy',
          scripts: {
            old: [
              { kind: 'learnSkill', role: 0, skill: 'skill-live' },
              {
                kind: 'applyActorCondition',
                actor: 'hero',
                condition: { kind: 'poison', poisonId: 9 },
              },
            ],
          },
        },
      },
      worlds: [
        {
          party: [{ id: 'hero-instance', poisons: [{ poisonId: 9, tickIndex: 0 }] }],
          reserve: [{ id: 'reserve-instance', poisons: [{ poisonId: 9, tickIndex: 1 }] }],
          money: 0,
          learnedSkills: { 'hero-instance': ['skill-live'] },
          skillUseCounts: { 'hero-instance': { 'skill-live': 2 } },
          inventory: [],
        },
      ],
    } as unknown as EditorState
    const scriptState: ScriptEditorState = { scenes: [], items: [], sharedScripts: {} }
    const snapshot = buildProjectReferenceSnapshotFromProjection({
      state,
      scriptState,
      commandVisits: [
        commandVisit({ kind: 'learnSkill', role: 0, skill: 'skill-live' }, 'live-learn'),
        livePoison,
      ],
      entityAddressReferences: [],
    })
    const index = createProjectReferenceIndex(snapshot)

    const skillReferences = index.referencesTo({ kind: 'skill', id: 'skill-live' })
    expect(skillReferences).toHaveLength(4)
    expect(skillReferences.map((reference) => reference.relation)).toEqual(
      expect.arrayContaining([
        { kind: 'battle-data-use', target: 'skill', use: 'command-learn-skill' },
        { kind: 'battle-data-use', target: 'skill', use: 'world-learned-skill' },
        { kind: 'battle-data-use', target: 'skill', use: 'world-skill-use-count' },
      ]),
    )
    expect(
      skillReferences.filter((reference) => reference.locator.kind === 'canonical-script'),
    ).toHaveLength(1)
    expect(
      skillReferences.filter(
        (reference) =>
          reference.locator.kind === 'unavailable' &&
          reference.source.owner.kind === 'script-chunk',
      ),
    ).toHaveLength(1)

    const poisonReferences = index.referencesTo({ kind: 'poison', id: '9' })
    expect(poisonReferences).toHaveLength(4)
    expect(
      poisonReferences.filter((reference) => reference.locator.kind === 'canonical-script'),
    ).toHaveLength(1)
    expect(
      poisonReferences.filter(
        (reference) =>
          reference.relation.kind === 'battle-data-use' &&
          reference.relation.use === 'world-active-poison',
      ),
    ).toHaveLength(2)
    expect(
      poisonReferences.find((reference) => reference.locator.kind === 'unavailable')?.deletePolicy,
    ).toBe('block')
  })

  test('canonical source deletion scope includes exact behavior and hook targets', () => {
    const behaviorVisit: CanonicalScriptCommandVisit = {
      ...commandVisit({ kind: 'learnSkill', role: 0, skill: 'skill-live' }, 'behavior'),
      locator: {
        kind: 'command',
        owner: {
          kind: 'entity-behavior',
          sceneId: 'scene-a',
          entityId: 'entity-a',
          channel: 'trigger',
          behaviorId: 'default',
        },
        container: { kind: 'body' },
        commandPath: '0',
      },
    }
    const hookVisit: CanonicalScriptCommandVisit = {
      ...commandVisit({ kind: 'learnSkill', role: 0, skill: 'skill-live' }, 'hook'),
      locator: {
        kind: 'command',
        owner: { kind: 'scene-hook', sceneId: 'scene-a', slot: 'onEnter', hookId: 'default' },
        container: { kind: 'body' },
        commandPath: '0',
      },
    }
    const edges = canonicalCommandTargetEdges([behaviorVisit, hookVisit])
    expect(edges[0]?.source.deletedWith).toContain(
      projectReferenceTargetKey({
        kind: 'entity-behavior',
        sceneId: 'scene-a',
        entityId: 'entity-a',
        channel: 'trigger',
        behaviorId: 'default',
      }),
    )
    expect(edges[1]?.source.deletedWith).toContain(
      projectReferenceTargetKey({
        kind: 'scene-hook',
        sceneId: 'scene-a',
        slot: 'onEnter',
        hookId: 'default',
      }),
    )
  })

  test('builder accepts the same projection inputs in sync and worker callers', () => {
    const state = { manifest, scenes: [], scriptChunks: {} } as unknown as EditorState
    const scriptState: ScriptEditorState = { scenes: [], items: [], sharedScripts: {} }
    const visits = [commandVisit({ kind: 'openShop', shop: 1, mode: 'buy' }, 'buy')]
    const input = { state, scriptState, commandVisits: visits, entityAddressReferences: [] }
    expect(buildProjectReferenceSnapshotFromProjection(input)).toEqual(
      buildProjectReferenceSnapshotFromProjection(input),
    )
  })
})
