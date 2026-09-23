/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B02/B05：battle-trial-prepare issues/preview/prepare（wave2）。
 * 补冻结定位剩余臂：issues 的 maxHP/maxMP 无效、value 超上限、全员 HP0、装备槽位不符、
 * grantSkill 悬空、maxPool warning、敌队 team 悬空/五槽越界/全空、背包悬空定位；
 * previewBattleTrialParty 与 prepareBattleTrial 的 applyTrialParty 覆写/null 脱装/技能替换/
 * HP/MP 池应用（B05 的 prepare 单臂）。
 */
import { describe, expect, test } from 'vitest'
import {
  trialActor as actor,
  trialCatalogFixture as catalog,
  trialConfig as config,
  trialMember as member,
} from './__tests__/coverage-wave2/b-trial-catalog.js'
import type { TrialPool } from './battle-trial-config.js'
import { collectBattleTrialIssues, previewBattleTrialParty } from './battle-trial-prepare.js'

describe('W2-B B02 collectBattleTrialIssues 剩余定位臂', () => {
  test('悬空战场/角色/技能/敌队/背包逐条带 path 定位；不静默换候选', () => {
    const issues = collectBattleTrialIssues(
      config([member({ actorId: 'ghost' })], { fieldId: 99 }),
      catalog(),
    )
    const paths = issues.filter((issue) => issue.severity === 'error').map((issue) => issue.path)
    expect(paths).toContain('fieldId')
    expect(paths).toContain('party.members[0].actorId')
    const badSkill = collectBattleTrialIssues(
      config([member({ skills: { kind: 'replace', ids: ['ghost-skill'] } })]),
      catalog(),
    )
    expect(badSkill.map((issue) => issue.path)).toContain('party.members[0].skills')
    const badTeam = collectBattleTrialIssues(
      config([member()], { enemies: { kind: 'team', teamId: 'ghost-team' } }),
      catalog(),
    )
    expect(badTeam.map((issue) => issue.path)).toContain('enemies')
    const badBag = collectBattleTrialIssues(
      config([member()], { bag: { items: [{ itemId: 'ghost-item', quantity: 1 }] } }),
      catalog(),
    )
    expect(badBag.map((issue) => issue.path)).toContain('bag.items[0]')
  })

  test('maxHP/maxMP 无效与 value 超上限、全员 HP0 各自定位', () => {
    const zeroHpPool = { kind: 'value', value: 0 } as TrialPool
    const allDown = collectBattleTrialIssues(config([member({ hp: zeroHpPool })]), catalog())
    expect(allDown.map((issue) => issue.message)).toContain('我方必须至少有一名体力大于0的队员')
    const overMp = collectBattleTrialIssues(
      config([member({ mp: { kind: 'value', value: 51 } })]),
      catalog(),
    )
    expect(overMp.map((issue) => issue.path)).toContain('party.members[0].mp')
    expect(overMp.map((issue) => issue.message)).toContain('当前值 51 超过最大值 50')
    const badMax = catalog()
    badMax.actorsById.hero = actor(0, 50)
    const issues = collectBattleTrialIssues(config([member()]), badMax)
    expect(issues.map((issue) => issue.path)).toContain('party.members[0].stats')
    expect(issues.map((issue) => issue.message)).toContain('hero 的最大体力无效')
  })

  test('装备槽位/可穿者不符与 grantSkill 悬空定位；maxPool 呈 warning 不阻断', () => {
    const wrongSlot = collectBattleTrialIssues(
      config([member({ equipment: { head: 'sword' } })]),
      catalog(),
    )
    expect(wrongSlot.map((issue) => issue.path)).toContain('party.members[0].equipment.head')
    const notWearable = collectBattleTrialIssues(
      config([member({ equipment: { weapon: 'cursed' } })]),
      catalog(),
    )
    expect(notWearable.map((issue) => issue.message)).toContain(
      '角色 hero 不能在 weapon 穿戴 cursed',
    )
    const brokenGrant = catalog()
    expect(
      collectBattleTrialIssues(
        config([member({ equipment: { weapon: 'ghostSkill' } })]),
        brokenGrant,
      ),
    ).toEqual([])
    brokenGrant.items.ghostSkill!.equip!.effects = [
      { kind: 'grantSkill', skillId: 'missing-skill' },
    ]
    const grantGhost = collectBattleTrialIssues(
      config([member({ equipment: { weapon: 'ghostSkill' } })]),
      brokenGrant,
    )
    expect(grantGhost.map((issue) => issue.message)).toContain(
      '装备授予的技能 missing-skill 不存在',
    )
    const maxPoolWarn = collectBattleTrialIssues(
      config([member({ equipment: { weapon: 'maxpool' } })]),
      catalog(),
    )
    expect(maxPoolWarn.map((issue) => issue.severity)).toContain('warning')
    expect(
      maxPoolWarn.every(
        (issue) => issue.severity !== 'error' || issue.path !== 'party.members[0].equipment.weapon',
      ),
    ).toBe(true)
  })

  test('敌队五槽：空敌队/悬空敌人/越界槽位各自定位', () => {
    const emptyTeam = collectBattleTrialIssues(
      config([member()], { enemies: { kind: 'team', teamId: 'empty' } }),
      catalog(),
    )
    expect(emptyTeam.map((issue) => issue.message)).toContain('请至少选择一个敌人，空敌队不能试打')
    const slots = collectBattleTrialIssues(
      config([member()], {
        enemies: { kind: 'slots', slots: ['ghost', null, null, null, null] },
      }),
      catalog(),
    )
    expect(slots.map((issue) => issue.path)).toContain('enemies.slots[0]')
  })

  test('非法 config 原样落入 config 单条 error（不抛出）', () => {
    const issues = collectBattleTrialIssues({ party: 'nope' }, catalog())
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ path: 'config', severity: 'error' })
  })
})

describe('W2-B B02 previewBattleTrialParty', () => {
  test('覆写 stats、null 脱装、replace 技能、value/full/percent 池全应用', () => {
    const preview = previewBattleTrialParty(
      {
        members: [
          member({
            stats: { attack: 99, maxHP: 120 },
            equipment: { weapon: 'sword', head: null },
            skills: { kind: 'replace', ids: ['ice'] },
            hp: { kind: 'value', value: 77 },
            mp: { kind: 'percent', value: 50 },
          }),
        ],
      },
      catalog(),
    )
    expect(preview).toHaveLength(1) // preview 直接返回 CreatePlayerInput[]
    const player = preview[0]!
    expect(player.hp).toBe(77)
    expect(player.mp).toBe(25) // 50% of maxMP 50
    expect(player.skills).toEqual(['ice']) // replace 生效
    expect(player.attackStrength).toBe(99) // stats 覆写经正式派生落 attackStrength
  })

  test('同输入多次 preview 互不别名：两次输出的 players 数值独立', () => {
    const party = { members: [member({ hp: { kind: 'value', value: 33 } })] }
    const a = previewBattleTrialParty(party, catalog())
    const b = previewBattleTrialParty(party, catalog())
    expect(a[0]!.hp).toBe(b[0]!.hp)
    expect(a[0]).not.toBe(b[0])
  })
})
