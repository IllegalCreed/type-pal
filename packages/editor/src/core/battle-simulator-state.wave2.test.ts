/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B02：battle-simulator-state 主题覆写臂（wave2）。
 * 补冻结定位 :78-84/:38-93 —— applyTrialSubject 三主题（敌队/敌人/技能）的悬空拒绝、
 * 技能主题必须选本方案施放队员、覆写不改原预设对象（深拷贝隔离）。
 */
import type { ActorDef, EnemyDef, EnemyTeamDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyTrialSubject,
  emptyTrialPlan,
  resolveTrialDraft,
  trialCatalog,
} from './battle-simulator-state.js'
import type { EditorState } from './edit-session.js'

const state = () =>
  ({
    actors: [
      {
        id: 'hero',
        name: 'Hero',
        template: 'hero',
        battler: {
          baseStats: { level: 1, maxHP: 100, maxMP: 50, attack: 9, defense: 4, speed: 3, luck: 2 },
          initialEquipment: {},
          initialMagic: ['fire'],
        },
      },
    ] as unknown as ActorDef[],
    skills: [{ id: 'fire' } as unknown as SkillData, { id: 'ice' } as unknown as SkillData],
    items: [],
    enemies: [{ id: 'slime' } as unknown as EnemyDef],
    enemyTeams: [{ id: 'wolves' } as unknown as EnemyTeamDef],
    battleFields: [{ id: 0 }],
    assetCatalog: { version: 1, assets: {} },
  }) as unknown as EditorState

const library = () =>
  ({
    allies: [],
    enemies: [],
    bags: [],
    plans: [],
    kind: 'type-pal-battle-simulator',
    version: 1,
  }) as never

describe('W2-B B02 applyTrialSubject 主题覆写', () => {
  test('enemy-team 主题：合法写入 overrides；悬空敌队 throw', () => {
    const plan = emptyTrialPlan(state())
    const next = applyTrialSubject(plan, library(), state(), { kind: 'enemy-team', id: 'wolves' })
    expect(next.overrides.enemies).toEqual({ kind: 'team', teamId: 'wolves' })
    expect(plan.overrides.enemies).toBeUndefined() // 原 plan 未被修改（深拷贝隔离）
    expect(() =>
      applyTrialSubject(plan, library(), state(), { kind: 'enemy-team', id: 'ghost-team' }),
    ).toThrow('当前敌队已不存在')
  })

  test('enemy 主题：单敌写入五槽首位；悬空敌人 throw', () => {
    const plan = emptyTrialPlan(state())
    const next = applyTrialSubject(plan, library(), state(), { kind: 'enemy', id: 'slime' })
    expect(next.overrides.enemies).toEqual({
      kind: 'slots',
      slots: ['slime', null, null, null, null],
    })
    expect(() =>
      applyTrialSubject(plan, library(), state(), { kind: 'enemy', id: 'ghost' }),
    ).toThrow('当前敌人已不存在')
  })

  test('skill 主题：加进本方案指定队员的 replace 集合并去重；缺队员/悬空技能各 throw', () => {
    const base = emptyTrialPlan(state())
    base.party = {
      kind: 'inline',
      config: {
        members: [
          {
            actorId: 'hero',
            stats: {},
            equipment: {},
            skills: { kind: 'inherit' },
            hp: { kind: 'full' },
            mp: { kind: 'full' },
          },
        ],
      },
    }
    const next = applyTrialSubject(base, library(), state(), { kind: 'skill', id: 'ice' }, 'hero')
    const resolved = resolveTrialDraft(library(), next)
    expect(resolved.party.members[0]!.skills).toEqual({ kind: 'replace', ids: ['fire', 'ice'] }) // 继承集+新技能
    const again = applyTrialSubject(next, library(), state(), { kind: 'skill', id: 'ice' }, 'hero')
    const resolved2 = resolveTrialDraft(library(), again)
    expect(resolved2.party.members[0]!.skills).toEqual({ kind: 'replace', ids: ['fire', 'ice'] }) // Set 去重
    expect(() =>
      applyTrialSubject(base, library(), state(), { kind: 'skill', id: 'ice' }, 'ghost-member'),
    ).toThrow('请选择本方案中的施放队员')
    expect(() =>
      applyTrialSubject(base, library(), state(), { kind: 'skill', id: 'ghost-skill' }, 'hero'),
    ).toThrow('当前技能已不存在')
  })

  test('trialCatalog 从编辑器状态投影正式目录表', () => {
    const catalog = trialCatalog(state())
    expect(Object.keys(catalog.actorsById)).toEqual(['hero'])
    expect(Object.keys(catalog.enemyTeamsById)).toEqual(['wolves'])
    expect(catalog.battleFields).toHaveLength(1)
  })
})
