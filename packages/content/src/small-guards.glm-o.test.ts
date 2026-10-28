import type { ActorDef, Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { resolveDialogueIdentity } from './author-dialogue.js'
import { buildWorld, instantiate } from './character.js'
import { collectCommandTargetReferences } from './command-target-reference.js'
import { validateEnemyTeamStructure } from './enemy-team.js'
import { spriteDefinitionFrameDemand, spriteDefinitionFrameIndices } from './sprite.js'
import { checkThrowSpec } from './validate.js'
import { validateRuntimeScenes } from './validate-runtime.js'

describe('O09 spriteDefinitionFrameDemand / FrameIndices', () => {
  test('directional 帧需求 = framesPerDir*4 + poses 绝对帧', () => {
    const demand = spriteDefinitionFrameDemand({
      layout: { kind: 'directional', framesPerDir: 3 },
      poses: { wave: { label: 'w', steps: [{ frame: 20, durationMs: 100 }] } },
    })
    expect(demand).toBe(21)
    expect(
      spriteDefinitionFrameIndices({
        layout: { kind: 'directional', framesPerDir: 2 },
      }).size,
    ).toBe(8)
  })

  test('static 帧需求 = 1', () => {
    expect(spriteDefinitionFrameDemand({ layout: { kind: 'static' } })).toBe(1)
  })
})

describe('O09 validateEnemyTeamStructure：槽位形状', () => {
  test('非数组 / 槽位非数组 / 非字符串槽 / 非法 id 逐轴拒绝；null 槽合法', () => {
    expect(() => validateEnemyTeamStructure('x')).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: 't', slots: 'x' }])).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: 't', slots: [42] }])).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: '', slots: [] }])).toThrow()
    expect(validateEnemyTeamStructure([{ id: 't', slots: ['e1', null] }])).toEqual([
      { id: 't', slots: ['e1', null] },
    ])
  })
})

describe('O09 checkRuntimeScenes：运行态场景入口', () => {
  test('非法场景（entry 缺 facing）拒绝；合法最小场景通过', () => {
    expect(() =>
      validateRuntimeScenes([
        {
          id: 's',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'south' },
          entities: [],
        },
      ]),
    ).toThrow(/facing: 期望 up\/down\/left\/right/)
    expect(() =>
      validateRuntimeScenes([
        {
          id: 's',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ]),
    ).not.toThrow()
  })
})

describe('O09 checkThrowSpec：投掷规格边界', () => {
  const legal = {
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 1, elemental: 0 }],
    sound: 'sound.pal.028',
    presentation: {
      kind: 'magic',
      animation: { effectSprite: 1 },
    },
  }

  test('effects 空 / target 非法 逐轴拒绝', () => {
    expect(() => checkThrowSpec({ ...legal, effects: [] })).toThrow(/effects: 不得为空/)
    expect(() => checkThrowSpec({ ...legal, target: 'allAllies' })).toThrow(
      'throw.target: 期望 oneEnemy/allEnemies',
    )
  })

  test('presentation 非 magic 拒绝', () => {
    expect(() =>
      checkThrowSpec({
        ...legal,
        presentation: { kind: 'fade', animation: { effectSprite: 1 } },
      }),
    ).toThrow('throw.presentation.kind: 期望 magic')
  })
})

describe('O09 resolveDialogueIdentity / collectCommandTargetReferences', () => {
  const actors: ActorDef[] = [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      portraits: { default: 'portrait.hero' },
    },
  ]

  test('身份：actor 绑定命中 actor 得头像；未知 actor 拒绝；narration 空', () => {
    const byId = Object.fromEntries(actors.map((entry) => [entry.id, entry]))
    const hit = resolveDialogueIdentity({ kind: 'actor', actor: 'hero' }, byId)
    // 无显式 portrait 时回退 speaker = actor name textId；portrait 仅在显式声明时透传。
    expect(hit).toEqual({ speaker: 'name.hero' })
    expect(() => resolveDialogueIdentity({ kind: 'actor', actor: 'ghost' }, byId)).toThrow(/ghost/)
    expect(resolveDialogueIdentity({ kind: 'narration' }, byId)).toEqual({})
  })

  test('loadScene 命令收集目标场景引用', () => {
    const command: Command = { kind: 'loadScene', scene: 's-target', entryId: 'default' }
    const refs = collectCommandTargetReferences(command, 'p')
    expect(refs.length).toBeGreaterThan(0)
    expect(JSON.stringify(refs)).toContain('s-target')
  })
})

describe('O09 buildWorld / instantiate：实例域边界', () => {
  test('instantiate：无 battler fail-loud；battler 角色取 baseStats', () => {
    expect(() => instantiate({ id: 'npc', name: 'n', spriteId: 's' })).toThrow(
      'instantiate: 角色 "npc" 无 battler(不可入队/参战)',
    )
    const hero = instantiate({
      id: 'hero',
      name: 'name.hero',
      spriteId: 's',
      battler: {
        baseStats: {
          level: 2,
          hp: 150,
          maxHP: 150,
          mp: 30,
          maxMP: 30,
          attack: 9,
          defense: 8,
          magicAttack: 7,
          speed: 6,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
        battleSprite: 'b',
      },
    })
    expect(hero.hp).toBe(150)
  })

  test('buildWorld：入口 party 引用缺失 actor → 精确 missing-actor 诊断', () => {
    // actorsById 只含 hero（真实合法表）；ghost 是真正缺键。
    expect(() =>
      buildWorld(
        { party: ['ghost'], money: 0, inventory: [] },
        {
          hero: {
            id: 'hero',
            name: 'name.hero',
            spriteId: 'hero-sprite',
            battler: {
              baseStats: {
                level: 1,
                hp: 100,
                maxHP: 100,
                mp: 30,
                maxMP: 30,
                attack: 10,
                defense: 10,
                magicAttack: 10,
                speed: 10,
                luck: 10,
              },
              initialEquipment: {},
              initialMagic: [],
              battleSprite: 'hero-battle',
            },
          },
        },
      ),
    ).toThrow('buildWorld: 角色 "ghost" 不在 actors 表')
  })
})
