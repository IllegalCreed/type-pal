import { validateActors, validateItems } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  trialActor,
  trialCatalogFixture,
  trialMember,
} from './__tests__/coverage-wave2/b-trial-catalog.js'
import { previewBattleTrialParty } from './battle-trial-prepare.js'

test('derives a party from stat overrides and removes the skill granted by explicitly unequipped gear', () => {
  const project = trialCatalogFixture()
  const [hat] = validateItems([
    {
      id: 'fire-hat',
      name: 'name.fire-hat',
      desc: [],
      buyPrice: 1,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'head',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantSkill', skillId: 'fire' }],
      },
    },
  ])
  const hero = trialActor(100, 51)
  if (!hat || !hero.battler) throw new Error('试打预览夹具缺少角色或装备')
  hero.battler.initialEquipment.head = hat.id
  validateActors([hero])
  project.actorsById.hero = hero
  project.items[hat.id] = hat
  const member = trialMember({
    stats: { attack: 99, maxHP: 120 },
    skills: { kind: 'replace', ids: ['ice'] },
    hp: { kind: 'value', value: 77 },
    mp: { kind: 'percent', value: 50 },
  })
  const bareHead = { members: [{ ...member, equipment: { head: null } }] }
  const before = structuredClone({ member, project, bareHead })

  const equipped = previewBattleTrialParty({ members: [member] }, project)
  expect(equipped).toMatchObject([{ skills: ['ice', 'fire'] }])
  expect(previewBattleTrialParty(bareHead, project)).toMatchObject([
    {
      hp: 77,
      maxHp: 120,
      mp: 25,
      maxMp: 51,
      skills: ['ice'],
      attackStrength: 99,
    },
  ])
  expect({ member, project, bareHead }).toEqual(before)
})

test('each full-pool preview owns its output and leaves the shared project intact', () => {
  const project = trialCatalogFixture()
  const party = { members: [trialMember({ stats: { maxHP: 121, maxMP: 51 } })] }
  const before = structuredClone({ party, project })
  const [first] = previewBattleTrialParty(party, project)
  const [second] = previewBattleTrialParty(party, project)
  if (!first || !second) throw new Error('试打预览缺少队员')

  first.hp = 1
  first.skills.push('ice')
  expect(second).toMatchObject({ hp: 121, maxHp: 121, mp: 51, maxMp: 51, skills: ['fire'] })
  expect({ party, project }).toEqual(before)
})
