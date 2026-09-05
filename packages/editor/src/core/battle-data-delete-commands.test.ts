import { describe, expect, test, vi } from 'vitest'
import {
  BattleDataInUseError,
  DeleteEnemyCommand,
  DeletePoisonCommand,
  DeleteSkillCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  type ProjectReferenceTarget,
} from './project-reference.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

function state(): EditorState {
  return {
    actors: [],
    levelUp: {},
    skills: [
      {
        id: 'skill-a',
        name: '技能甲',
        desc: '',
        cost: {},
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '9' }],
        animation: {
          effectSprite: 0,
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
        },
      },
      {
        id: 'skill-b',
        name: '技能乙',
        desc: '',
        cost: {},
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [],
        animation: {
          effectSprite: 0,
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
        },
      },
    ],
    items: [],
    enemies: [
      {
        id: 'enemy-a',
        name: 'name.enemy-a',
        battleSprite: 'battle.enemy',
        yPosOffset: 0,
        stats: {
          health: 1,
          level: 1,
          exp: 0,
          cash: 0,
          attackStrength: 1,
          magicStrength: 1,
          defense: 1,
          dexterity: 1,
          fleeRate: 1,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        ai: { resistanceToSorcery: 0 },
        sounds: {},
      },
    ],
    enemyTeams: [{ id: 'team-a', slots: ['enemy-a'] }],
    poisons: [{ id: 9, name: '九号毒', curability: 'common', color: 0 }],
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: {
            party: [],
            money: 0,
            inventory: [],
            seedConditions: { hero: { poisonIds: [9] } },
          },
        },
      ],
    },
    sharedScripts: {
      poison: {
        name: '施毒',
        self: 'none',
        body: [
          {
            kind: 'applyActorCondition',
            actor: 'hero',
            condition: { kind: 'poison', poisonId: 9 },
          },
        ],
      },
    },
    scenes: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

const currentReferences = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

function externalBlockingIndex(target: Extract<ProjectReferenceTarget, { id: string }>) {
  const relation =
    target.kind === 'skill'
      ? ({ kind: 'battle-data-use', target: 'skill', use: 'actor-initial-magic' } as const)
      : target.kind === 'enemy'
        ? ({ kind: 'battle-data-use', target: 'enemy', use: 'enemy-team-slot' } as const)
        : ({ kind: 'battle-data-use', target: 'poison', use: 'item-poison' } as const)
  return createProjectReferenceIndex(
    buildProjectReferenceSnapshot([
      {
        target,
        source: createProjectReferenceSource({ kind: 'project-part', id: 'external' }, '外部引用'),
        relation,
        where: 'external.reference',
        locator: { kind: 'unavailable', reason: '测试外部引用' },
        deletePolicy: 'block',
      },
    ]),
  )
}

function unreferencedState(): EditorState {
  const current = structuredClone(state())
  current.enemyTeams = []
  current.skills = current.skills.map((skill) => ({ ...skill, effects: [] }))
  for (const entry of current.manifest.entryPoints) delete entry.startWorld.seedConditions
  current.sharedScripts = {}
  return current
}

describe('battle data delete commands', () => {
  test('fail closed while references exist', () => {
    const current = state()
    expect(() => new DeletePoisonCommand(9, currentReferences).apply(current)).toThrow(
      BattleDataInUseError,
    )
    expect(() => new DeleteEnemyCommand('enemy-a', currentReferences).apply(current)).toThrow(
      BattleDataInUseError,
    )
  })

  test('delete and invert preserve exact index for unreferenced objects', () => {
    const current = state()
    const skill = new DeleteSkillCommand('skill-b', currentReferences)
    const withoutSkill = skill.apply(current)
    expect(withoutSkill.skills.map((entry) => entry.id)).toEqual(['skill-a'])
    expect(skill.invert(withoutSkill).skills.map((entry) => entry.id)).toEqual([
      'skill-a',
      'skill-b',
    ])

    const unreferenced = structuredClone(current)
    unreferenced.enemyTeams = []
    unreferenced.skills = [{ ...current.skills[0]!, effects: [] }]
    for (const entry of unreferenced.manifest.entryPoints) delete entry.startWorld.seedConditions
    unreferenced.sharedScripts = {}
    const enemy = new DeleteEnemyCommand('enemy-a', currentReferences)
    const withoutEnemy = enemy.apply(unreferenced)
    expect(withoutEnemy.enemies).toEqual([])
    expect(enemy.invert(withoutEnemy).enemies?.[0]?.id).toBe('enemy-a')

    const poison = new DeletePoisonCommand(9, currentReferences)
    const withoutPoison = poison.apply(unreferenced)
    expect(withoutPoison.poisons).toEqual([])
    expect(poison.invert(withoutPoison).poisons?.[0]?.id).toBe(9)
  })

  test('live canonical learn-skill and actor-condition poison block a stale shell', () => {
    const current = unreferencedState()
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        live: {
          name: '实时战斗数据',
          self: 'none',
          body: [
            { kind: 'learnSkill', role: 0, skill: 'skill-b' },
            {
              kind: 'applyActorCondition',
              actor: 'hero',
              condition: { kind: 'poison', poisonId: 9 },
            },
          ],
        },
      },
    }
    const provider = vi.fn((editorState: EditorState) =>
      collectCurrentProjectReferenceIndex(editorState, canonical),
    )
    expect(() => new DeleteSkillCommand('skill-b', provider).apply(current)).toThrow(
      BattleDataInUseError,
    )
    expect(() => new DeletePoisonCommand(9, provider).apply(current)).toThrow(BattleDataInUseError)
    expect(provider).toHaveBeenCalledTimes(2)
  })

  test('self enemy and poison edges remain visible without self-locking deletion', () => {
    const current = unreferencedState()
    current.enemies![0] = {
      ...current.enemies![0]!,
      ai: {
        ...current.enemies![0]!.ai,
        rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'enemy-a' } }],
      },
    }
    current.poisons![0] = { ...current.poisons![0]!, counters: 9 }
    expect(new DeleteEnemyCommand('enemy-a', currentReferences).apply(current).enemies).toEqual([])
    expect(new DeletePoisonCommand(9, currentReferences).apply(current).poisons).toEqual([])
  })

  test('missing targets skip the oracle and provider failures leave history untouched', () => {
    const current = unreferencedState()
    const unused = vi.fn(() => {
      throw new Error('不应调用')
    })
    expect(new DeleteSkillCommand('missing', unused).apply(current)).toBe(current)
    expect(new DeleteEnemyCommand('missing', unused).apply(current)).toBe(current)
    expect(new DeletePoisonCommand(999, unused).apply(current)).toBe(current)
    expect(unused).not.toHaveBeenCalled()

    for (const command of [
      new DeleteSkillCommand('skill-b', () => {
        throw new Error('oracle down')
      }),
      new DeleteEnemyCommand('enemy-a', () => {
        throw new Error('oracle down')
      }),
      new DeletePoisonCommand(9, () => {
        throw new Error('oracle down')
      }),
    ]) {
      const session = new EditSession(current)
      expect(() => session.dispatch(command)).toThrow('oracle down')
      expect(session.getState()).toBe(current)
      expect(session.getHistoryVersion()).toBe(0)
    }
  })

  test('redo revalidates skill, enemy and poison targets against the current oracle', () => {
    const cases = [
      {
        target: { kind: 'skill', id: 'skill-b' } as const,
        command: (provider: typeof currentReferences) =>
          new DeleteSkillCommand('skill-b', provider),
        exists: (editorState: EditorState) =>
          editorState.skills.some((skill) => skill.id === 'skill-b'),
      },
      {
        target: { kind: 'enemy', id: 'enemy-a' } as const,
        command: (provider: typeof currentReferences) =>
          new DeleteEnemyCommand('enemy-a', provider),
        exists: (editorState: EditorState) =>
          editorState.enemies?.some((enemy) => enemy.id === 'enemy-a') ?? false,
      },
      {
        target: { kind: 'poison', id: '9' } as const,
        command: (provider: typeof currentReferences) => new DeletePoisonCommand(9, provider),
        exists: (editorState: EditorState) =>
          editorState.poisons?.some((poison) => poison.id === 9) ?? false,
      },
    ]
    for (const entry of cases) {
      let blocked = false
      const provider = ((editorState: EditorState) =>
        blocked
          ? externalBlockingIndex(entry.target)
          : currentReferences(editorState)) as typeof currentReferences
      const session = new EditSession(unreferencedState())
      session.dispatch(entry.command(provider))
      expect(session.undo()).toBe(true)
      blocked = true
      expect(() => session.redo()).toThrow(BattleDataInUseError)
      expect(entry.exists(session.getState())).toBe(true)
      expect(session.canRedo()).toBe(true)
    }
  })
})
