import type { CurrentManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { collectEditorAssetReferences } from './editor-asset-references.js'
import type { EntityAddressReference } from './entity-address-references.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  projectReferenceTargetKey,
} from './project-reference.js'
import {
  actorReferenceEdges,
  assetReferenceEdges,
  battleDataReferenceEdges,
  buildProjectReferenceSnapshotFromProjection,
  canonicalCommandTargetEdges,
  entityAddressReferenceEdges,
  itemReferenceEdges,
  legacyScriptChunkTargetEdges,
  spriteReferenceEdges,
  structuralProjectReferenceEdges,
} from './project-reference-adapters.js'
import {
  buildCanonicalSchemeReferenceIndexesFromVisits,
  collectCanonicalScriptCommandVisits,
  collectCanonicalScriptTransitionVisits,
  collectCanonicalSharedScriptReferencesFromVisits,
  type CanonicalScriptCommandVisit,
  type CanonicalScriptTransitionVisit,
  type ScriptEditorState,
} from './script-editor.js'
import {
  collectWorldVariableReferencesV1FromVisits,
  type WorldVariableReferenceIndexV1,
} from './world-variable-references.js'
/*
 * Every projection caller must state all synchronized reference domains explicitly. Keeping this
 * fixture in the tests makes a newly added domain fail at compile time instead of silently
 * disappearing behind an optional default.
 */
const emptyProjectionReferences = {
  assetReferences: [],
  worldVariableReferences: { all: [], byId: new Map() } as WorldVariableReferenceIndexV1,
  canonicalSchemeReferences: {
    behavior: new Map(),
    sceneHook: new Map(),
    behaviorEntries: [],
    sceneHookEntries: [],
  },
  sharedScriptReferences: [],
}

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
      ...emptyProjectionReferences,
      state: { manifest: noEntryManifest, scenes: [], scriptChunks: {} } as unknown as EditorState,
      scriptState: { scenes: [], items: [], sharedScripts: {} },
      commandVisits: [
        commandVisit({ kind: 'loadScene', scene: 'next', entryId: 'door' }, 'shared.test.body[0]'),
      ],
      transitionVisits: [],
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
      ...emptyProjectionReferences,
      state: { manifest: noEntryManifest, scenes: [], scriptChunks: {} } as unknown as EditorState,
      scriptState: { scenes: [], items: [], sharedScripts: {} },
      commandVisits: [],
      transitionVisits: [],
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
      ...emptyProjectionReferences,
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
      transitionVisits: [],
      entityAddressReferences: [runtimeReference],
    })
    const index = createProjectReferenceIndex(snapshot)
    expect(index.referencesTo({ kind: 'ambience', id: 'night' })).toMatchObject([
      { source: { owner: { kind: 'runtime-world' }, label: '运行态/存档' } },
    ])
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
      ...emptyProjectionReferences,
      state,
      scriptState,
      commandVisits: [
        commandVisit({ kind: 'learnSkill', role: 0, skill: 'skill-live' }, 'live-learn'),
        livePoison,
      ],
      transitionVisits: [],
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

  test('canonical actor leaves include battle choreography without rescanning nested command arms', () => {
    const nestedParty: CanonicalScriptCommandVisit['command'] = {
      kind: 'setParty',
      members: ['actor-on-lose'],
    }
    const battle: CanonicalScriptCommandVisit['command'] = {
      kind: 'startBattle',
      enemyTeamId: 'team-boss',
      choreography: [
        {
          at: 'battleStart',
          when: { kind: 'playerInParty', role: 'actor-when' },
          body: [
            {
              kind: 'applyActorGrowth',
              actor: 'actor-growth',
              delta: {
                level: 0,
                maxHP: 0,
                maxMP: 0,
                attack: 0,
                magicAttack: 0,
                defense: 0,
                speed: 0,
                luck: 0,
              },
            },
            {
              kind: 'playActorCastEffect',
              actor: 'actor-cast',
              effect: 'pre-magic-white-flash',
            },
            {
              kind: 'dialog',
              cue: {
                identity: { kind: 'actor', actor: 'actor-dialog' },
                slot: 'bottom',
                rows: [{ text: 'dialog.actor' }],
              },
            },
          ],
        },
      ],
      onLose: [nestedParty],
    }
    const parent = commandVisit(battle, 'sharedScripts.shared/test.body[0]')
    const nested: CanonicalScriptCommandVisit = {
      command: nestedParty,
      path: 'sharedScripts.shared/test.body[0].onLose[0]',
      locator: {
        ...parent.locator,
        commandPath: '0/onLose/0',
      },
    }
    const scriptState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/test': {
          name: '战斗演出',
          self: 'none',
          body: [battle],
        },
      },
    } as unknown as ScriptEditorState
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
      scriptChunks: {},
      worlds: [],
    } as unknown as EditorState

    const edges = actorReferenceEdges(state, [parent, nested], [], scriptState)
    expect(
      edges.map((edge) =>
        edge.target.kind === 'actor'
          ? `${edge.target.id}:${edge.relation.kind === 'actor-use' ? edge.relation.use : ''}`
          : '',
      ),
    ).toEqual([
      'actor-when:enemy-condition-player-in-party',
      'actor-growth:enemy-apply-actor-growth',
      'actor-cast:enemy-play-actor-cast-effect',
      'actor-dialog:dialogue-actor',
      'actor-on-lose:command-set-party-member',
    ])
    expect(edges.every((edge) => edge.locator.kind === 'canonical-script')).toBe(true)
    expect(
      edges.filter((edge) => edge.target.kind === 'actor' && edge.target.id === 'actor-on-lose'),
    ).toHaveLength(1)
  })

  test('legacy and runtime actor references remain explicit readonly blockers', () => {
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [{ id: 'hero' }],
      levelUp: {},
      skills: [],
      items: [],
      enemies: [],
      enemyTeams: [],
      poisons: [],
      scriptChunks: {
        legacy: {
          id: 'legacy',
          scripts: { old: [{ kind: 'setParty', members: ['hero'] }] },
        },
      },
      worlds: [
        {
          party: [{ id: 'party-instance', template: 'hero' }],
          reserve: [{ id: 'reserve-instance', template: 'hero' }],
          money: 0,
          inventory: [],
        },
      ],
    } as unknown as EditorState
    const edges = actorReferenceEdges(state, [], [], {
      scenes: [],
      items: [],
      sharedScripts: {},
    }).filter((edge) => edge.target.kind === 'actor' && edge.target.id === 'hero')

    expect(edges).toHaveLength(3)
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            owner: { kind: 'script-chunk', chunkId: 'legacy', scriptId: 'old' },
          }),
          relation: { kind: 'actor-use', use: 'command-set-party-member' },
          locator: expect.objectContaining({ kind: 'unavailable' }),
          deletePolicy: 'block',
        }),
        expect.objectContaining({
          source: expect.objectContaining({ owner: { kind: 'runtime-world' } }),
          relation: { kind: 'actor-use', use: 'world-party-template' },
          locator: expect.objectContaining({ kind: 'unavailable' }),
          deletePolicy: 'block',
        }),
        expect.objectContaining({
          source: expect.objectContaining({ owner: { kind: 'runtime-world' } }),
          relation: { kind: 'actor-use', use: 'world-reserve-template' },
          locator: expect.objectContaining({ kind: 'unavailable' }),
          deletePolicy: 'block',
        }),
      ]),
    )
  })

  test('canonical item command and transition leaves keep exact owner locators', () => {
    const command = commandVisit(
      {
        kind: 'branch',
        cond: { kind: 'hasItem', itemId: 'target', atLeast: 2 },
        then: [],
      },
      'sharedScripts.shared/test.body[0]',
    )
    const transition: CanonicalScriptTransitionVisit = {
      transition: {
        kind: 'branch',
        cond: { kind: 'ownsItem', itemId: 'target', atLeast: 1 },
        then: { kind: 'stay' },
        else: { kind: 'restart' },
      },
      path: 'scenes.scene.entities.entity.behaviors.trigger.flow.machine.states.open.next',
      owner: {
        kind: 'entity-behavior',
        sceneId: 'scene',
        entityId: 'entity',
        channel: 'trigger',
        behaviorId: 'flow',
      },
    }
    const scriptState = {
      scenes: [
        {
          id: 'scene',
          mapId: 'map',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity',
              pos: { col: 0, row: 0, height: 0 },
              behaviors: {
                trigger: {
                  flow: {
                    label: '连续行为',
                    order: 0,
                    flow: {
                      kind: 'stateMachine',
                      machine: {
                        id: 'machine',
                        label: '连续流程',
                        initial: 'open',
                        states: { open: { label: '开场', body: [], next: transition.transition } },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
      items: [],
      sharedScripts: {
        'shared/test': { name: '物品判断', self: 'none', body: [command.command] },
      },
    } as unknown as ScriptEditorState
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [],
      items: [],
      skills: [],
      enemies: [],
      poisons: [],
      shops: [],
      worlds: [],
      scriptChunks: {},
    } as unknown as EditorState

    const edges = itemReferenceEdges(state, [command], [transition], scriptState)
    expect(edges).toHaveLength(2)
    expect(edges).toMatchObject([
      {
        target: { kind: 'item', id: 'target' },
        relation: { kind: 'item-use', access: 'read' },
        locator: { kind: 'canonical-script' },
      },
      {
        target: { kind: 'item', id: 'target' },
        relation: { kind: 'item-use', access: 'read' },
        locator: { kind: 'script-owner', owner: transition.owner },
      },
    ])
  })

  test('item structural, self, legacy and runtime references preserve deletion ownership', () => {
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [
        {
          id: 'hero',
          battler: { initialEquipment: { weapon: 'target' } },
        },
      ],
      items: [
        {
          id: 'target',
          name: '目标',
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'craftRecipe',
                recipes: [
                  {
                    ingredients: [{ itemId: 'target', count: 1 }],
                    products: [{ itemId: 'other', count: 1 }],
                  },
                ],
              },
            ],
          },
        },
        { id: 'other', name: '其他' },
        {
          id: 'gourd',
          name: '葫芦',
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'drawFromResourcePool',
                resource: 'collectValue',
                maxRoll: 1,
                rewards: [{ itemId: 'target', count: 1 }],
              },
            ],
          },
        },
      ],
      skills: [],
      enemies: [
        {
          id: 'enemy',
          onDefeated: [{ kind: 'giveItem', itemId: 'target', count: 1 }],
        },
      ],
      poisons: [],
      shops: [{ id: 1, items: ['target'] }],
      worlds: [
        {
          inventory: [{ itemId: 'target', count: 1 }],
          party: [{ id: 'hero-instance', equipment: { weapon: 'target' } }],
          reserve: [],
        },
      ],
      scriptChunks: {
        legacy: {
          id: 'legacy',
          scripts: { old: [{ kind: 'giveItem', itemId: 'target', count: 1 }] },
        },
      },
    } as unknown as EditorState
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot(
        itemReferenceEdges(state, [], [], { scenes: [], items: [], sharedScripts: {} }),
      ),
    )
    const target = { kind: 'item', id: 'target' } as const
    const references = index.referencesTo(target)

    expect(references).toHaveLength(8)
    expect(index.deletionImpact(target, index.deletionScopeFor([target])).blockers).toHaveLength(7)
    expect(
      references.filter(
        (reference) =>
          reference.source.owner.kind === 'runtime-world' &&
          reference.locator.kind === 'unavailable' &&
          reference.deletePolicy === 'block',
      ),
    ).toHaveLength(2)
    expect(
      references.find((reference) => reference.source.owner.kind === 'script-chunk'),
    ).toMatchObject({ locator: { kind: 'unavailable' }, deletePolicy: 'block' })
    expect(references.find((reference) => reference.source.owner.kind === 'enemy')).toMatchObject({
      locator: { kind: 'object', object: { kind: 'enemy', id: 'enemy' } },
    })
    expect(
      references.find(
        (reference) =>
          reference.source.owner.kind === 'item' && reference.source.owner.id === 'target',
      ),
    ).toMatchObject({
      locator: {
        kind: 'object',
        object: { kind: 'item', id: 'target' },
        section: 'crafting',
      },
    })
    expect(
      references.find(
        (reference) =>
          reference.source.owner.kind === 'item' && reference.source.owner.id === 'gourd',
      ),
    ).toMatchObject({
      locator: {
        kind: 'object',
        object: { kind: 'item', id: 'gourd' },
        section: 'spirit-gourd',
      },
    })
  })

  test('page animation is one stable action edge shared by action and definition buckets', () => {
    const state = {
      manifest: noEntryManifest,
      scenes: [
        {
          id: 'scene',
          mapId: 'map',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'entity',
              actor: 'hero',
              pos: { col: 0, row: 0, height: 0 },
              pages: [
                {
                  id: 'page-two',
                  animation: { sprite: 'sprite', action: 'wave', loop: false },
                },
              ],
            },
          ],
        },
      ],
      actors: [],
      items: [],
      skills: [],
      enemies: [],
      worlds: [],
      scriptChunks: {},
    } as unknown as EditorState
    const edges = spriteReferenceEdges(state, [], { scenes: [], items: [], sharedScripts: {} })
    const snapshot = buildProjectReferenceSnapshot(edges)
    const index = createProjectReferenceIndex(snapshot)
    const action = index.referencesTo({
      kind: 'world-sprite-action',
      spriteId: 'sprite',
      actionId: 'wave',
    })
    const definition = index.referencesTo({ kind: 'world-sprite', id: 'sprite' })

    expect(snapshot.rows).toHaveLength(1)
    expect(action).toHaveLength(1)
    expect(definition).toHaveLength(1)
    expect(action[0]?.id).toBe(definition[0]?.id)
    expect(action[0]?.locator).toEqual({
      kind: 'scene-page',
      sceneId: 'scene',
      entityId: 'entity',
      pageId: 'page-two',
    })
  })

  test('canonical shared/item-private and legacy/runtime sprite leaves keep exact ownership', () => {
    const sharedWorld = commandVisit(
      { kind: 'setActorSprite', actor: 'hero', sprite: 'world-shared' },
      'sharedScripts.shared.body[0]',
    )
    const sharedBattle = commandVisit(
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        battleSprite: 'battle-shared',
      },
      'sharedScripts.shared.body[1]',
    )
    const itemAction: CanonicalScriptCommandVisit = {
      command: {
        kind: 'playEntityAction',
        target: { scene: 'scene', entity: 'entity' },
        sprite: 'world-item',
        action: 'wave',
        loop: false,
      },
      path: 'items.item.use.effects[0].script.body[0]',
      locator: {
        kind: 'command',
        owner: { kind: 'item-private-script', itemId: 'item', ability: 'use', scriptId: 'use' },
        container: { kind: 'body' },
        commandPath: '0',
      },
    }
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [],
      items: [],
      skills: [],
      enemies: [],
      worlds: [
        {
          party: [
            {
              id: 'hero-instance',
              appearance: { spriteId: 'world-runtime', battleSprite: 'battle-runtime' },
            },
          ],
          reserve: [],
          inventory: [],
        },
      ],
      scriptChunks: {
        legacy: {
          id: 'legacy',
          scripts: {
            old: [
              { kind: 'setActorSprite', actor: 'hero', sprite: 'world-legacy' },
              {
                kind: 'setActorAppearance',
                actor: 'hero',
                battleSprite: 'battle-legacy',
              },
            ],
          },
        },
      },
    } as unknown as EditorState
    const scriptState = {
      scenes: [],
      items: [],
      sharedScripts: { shared: { name: '共享', self: 'none', body: [] } },
    } as ScriptEditorState
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot(
        spriteReferenceEdges(state, [sharedWorld, sharedBattle, itemAction], scriptState),
      ),
    )

    expect(index.referencesTo({ kind: 'world-sprite', id: 'world-shared' })).toMatchObject([
      { locator: { kind: 'canonical-script' } },
    ])
    expect(
      index.referencesTo({
        kind: 'world-sprite-action',
        spriteId: 'world-item',
        actionId: 'wave',
      }),
    ).toMatchObject([
      {
        source: { owner: { kind: 'script-owner', owner: { kind: 'item-private-script' } } },
        locator: { kind: 'canonical-script' },
      },
    ])
    expect(index.referencesTo({ kind: 'battle-sprite', id: 'battle-shared' })).toMatchObject([
      {
        relation: { kind: 'battle-sprite-use', expectedProfile: 'player-fighter' },
        locator: { kind: 'canonical-script' },
      },
    ])
    for (const [kind, id] of [
      ['world-sprite', 'world-legacy'],
      ['battle-sprite', 'battle-legacy'],
      ['world-sprite', 'world-runtime'],
      ['battle-sprite', 'battle-runtime'],
    ] as const)
      expect(index.referencesTo({ kind, id })).toMatchObject([
        { locator: { kind: 'unavailable' }, deletePolicy: 'block' },
      ])
  })

  test('enemy sprite command edges retain the real choreography and defeated paths', () => {
    const state = {
      manifest: noEntryManifest,
      scenes: [],
      actors: [],
      items: [],
      skills: [],
      enemies: [
        {
          id: 'enemy',
          battleSprite: 'battle',
          choreography: [{ kind: 'setActorSprite', actor: 'hero', sprite: 'world-choreography' }],
          onDefeated: [
            {
              kind: 'playEntityAction',
              target: { scene: 'scene', entity: 'entity' },
              sprite: 'world-defeated',
              action: 'fall',
              loop: false,
            },
          ],
        },
      ],
      worlds: [],
      scriptChunks: {},
    } as unknown as EditorState
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot(
        spriteReferenceEdges(state, [], { scenes: [], items: [], sharedScripts: {} }),
      ),
    )

    expect(index.referencesTo({ kind: 'world-sprite', id: 'world-choreography' })[0]?.where).toBe(
      'enemies[0](enemy).choreography[0].sprite',
    )
    expect(
      index.referencesTo({
        kind: 'world-sprite-action',
        spriteId: 'world-defeated',
        actionId: 'fall',
      })[0]?.where,
    ).toBe('enemies[0](enemy).onDefeated[0].action')
  })

  test('asset origins and canonical visits produce structured owners without parsing ids', () => {
    const actorId = 'actor:with/slash'
    const state = {
      manifest: {
        ...noEntryManifest,
        assets: {
          catalog: 'assets/index.json',
          roles: { 'video.startupSplash': 'video.role' },
        },
      },
      scenes: [],
      actors: [{ id: actorId, spriteId: 'world', face: 'face.actor' }],
      items: [],
      skills: [],
      enemies: [],
      battleFields: [],
      tilesets: [],
      sprites: [],
      battleSprites: [],
      scriptChunks: {},
      sharedScripts: {
        'shared:with/slash': {
          name: '共享',
          self: 'none',
          body: [
            { kind: 'playSound', asset: 'sound.same' },
            {
              kind: 'startBattle',
              enemyTeamId: 'team',
              music: 'music.battle',
              choreography: [
                { at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.same' }] },
              ],
            },
          ],
        },
      },
      worlds: [
        {
          party: [{ id: 'runtime', appearance: { portrait: 'portrait.runtime' } }],
          reserve: [],
          inventory: [],
        },
      ],
    } as unknown as EditorState
    const scriptState = {
      scenes: [],
      items: [],
      sharedScripts: state.sharedScripts,
    } as unknown as ScriptEditorState
    const visits: CanonicalScriptCommandVisit[] = [
      {
        command: scriptState.sharedScripts['shared:with/slash']!.body[0]!,
        path: 'sharedScripts["shared:with/slash"].body[0]',
        locator: {
          kind: 'command',
          owner: { kind: 'shared-script', scriptId: 'shared:with/slash' },
          container: { kind: 'body' },
          commandPath: '0',
        },
      },
      {
        command: scriptState.sharedScripts['shared:with/slash']!.body[1]!,
        path: 'sharedScripts["shared:with/slash"].body[1]',
        locator: {
          kind: 'command',
          owner: { kind: 'shared-script', scriptId: 'shared:with/slash' },
          container: { kind: 'body' },
          commandPath: '1',
        },
      },
    ]
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot(
        assetReferenceEdges(state, collectEditorAssetReferences(state), visits, scriptState),
      ),
    )

    expect(index.referencesTo({ kind: 'asset', id: 'face.actor' })[0]).toMatchObject({
      source: { owner: { kind: 'actor', id: actorId } },
      locator: { kind: 'object', object: { kind: 'actor', id: actorId } },
    })
    expect(index.referencesTo({ kind: 'asset', id: 'portrait.runtime' })[0]).toMatchObject({
      source: { owner: { kind: 'runtime-world' } },
      locator: { kind: 'unavailable' },
      deletePolicy: 'block',
    })
    expect(
      index
        .referencesTo({ kind: 'asset', id: 'sound.same' })
        .map((reference) =>
          reference.locator.kind === 'canonical-script'
            ? reference.locator.reference.locator.commandPath
            : 'missing',
        ),
    ).toEqual(['0', '1'])
    expect(index.referencesTo({ kind: 'asset', id: 'music.battle' })).toHaveLength(1)
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

  test('builder requires and preserves every synchronized reference domain', () => {
    const flow = {
      kind: 'stages' as const,
      initial: 'initial',
      stages: [{ id: 'initial', body: [] }],
    }
    const scriptState = {
      scenes: [
        {
          id: 'scene-a',
          mapId: 'map-a',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          hooks: {
            onEnter: {
              initial: 'alternate',
              variants: { alternate: { label: '备用进场', order: 0, flow } },
            },
          },
          entities: [
            {
              id: 'entity-a',
              zone: true,
              pos: { col: 0, row: 0, height: 0 },
              pages: [{ id: 'page-a', trigger: 'alternate' }],
              behaviors: {
                trigger: { alternate: { label: '备用交互', order: 0, flow } },
              },
            },
          ],
        },
      ],
      items: [
        {
          id: 'item-a',
          name: '物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [{ kind: 'runScript', script: 'shared/target' }],
          },
        },
      ],
      sharedScripts: {
        'shared/target': { name: '目标', self: 'none', body: [] },
        'shared/caller': {
          name: '调用方',
          self: 'none',
          body: [
            { kind: 'setFlag', flag: 'quest.ready', value: true },
            {
              kind: 'selectEntityBehavior',
              target: { scene: 'scene-a', entity: 'entity-a' },
              channel: 'trigger',
              selection: { kind: 'use', value: 'alternate' },
            },
            {
              kind: 'selectSceneHooks',
              scene: 'scene-a',
              selection: { onEnter: { kind: 'use', value: 'alternate' } },
            },
            { kind: 'callScript', script: 'shared/target' },
          ],
        },
      },
    } as unknown as ScriptEditorState
    const state = {
      manifest: {
        ...noEntryManifest,
        assets: {
          catalog: 'assets/index.json',
          roles: { 'audio.openingMenuMusic': 'music.probe' },
        },
      },
      scenes: scriptState.scenes,
      actors: [],
      items: scriptState.items,
      skills: [],
      enemies: [],
      battleFields: [],
      tilesets: [],
      sprites: [],
      battleSprites: [],
      worlds: [],
      scriptChunks: {},
      sharedScripts: scriptState.sharedScripts,
    } as unknown as EditorState
    const commandVisits = collectCanonicalScriptCommandVisits(scriptState)
    const transitionVisits = collectCanonicalScriptTransitionVisits(scriptState)
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshotFromProjection({
        state,
        scriptState,
        commandVisits,
        transitionVisits,
        entityAddressReferences: [],
        assetReferences: collectEditorAssetReferences(state),
        worldVariableReferences: collectWorldVariableReferencesV1FromVisits(
          scriptState,
          commandVisits,
        ),
        canonicalSchemeReferences: buildCanonicalSchemeReferenceIndexesFromVisits(
          scriptState,
          commandVisits,
        ),
        sharedScriptReferences: collectCanonicalSharedScriptReferencesFromVisits(
          scriptState,
          commandVisits,
        ),
      }),
    )

    expect(index.referencesTo({ kind: 'asset', id: 'music.probe' })).toHaveLength(1)
    expect(index.referencesTo({ kind: 'world-variable', id: 'quest.ready' })).toMatchObject([
      { relation: { kind: 'world-variable', variableKind: 'flag', access: 'write' } },
    ])
    expect(
      index.referencesTo({
        kind: 'entity-behavior',
        sceneId: 'scene-a',
        entityId: 'entity-a',
        channel: 'trigger',
        behaviorId: 'alternate',
      }),
    ).toMatchObject([
      {
        relation: { kind: 'behavior-reference', use: 'page-binding' },
        locator: { kind: 'scene-page' },
      },
      {
        relation: { kind: 'behavior-reference', use: 'select-behavior' },
        locator: { kind: 'canonical-script' },
      },
    ])
    expect(
      index.referencesTo({
        kind: 'scene-hook',
        sceneId: 'scene-a',
        slot: 'onEnter',
        hookId: 'alternate',
      }),
    ).toMatchObject([
      { relation: { kind: 'scene-hook-reference', use: 'hook-initial' } },
      { relation: { kind: 'scene-hook-reference', use: 'select-hook' } },
    ])
    expect(index.referencesTo({ kind: 'shared-script', id: 'shared/target' })).toMatchObject([
      { relation: { kind: 'script-reference', use: 'binding' } },
      { relation: { kind: 'script-reference', use: 'call' } },
    ])
  })
})
