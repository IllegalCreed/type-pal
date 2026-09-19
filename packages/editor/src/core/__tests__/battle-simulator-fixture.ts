import {
  type BattleSimulatorLibrary,
  emptyBattleSimulatorLibrary,
} from '../battle-simulator-library.js'

/** Legal editor drafts; enemy/field references need runtime readiness and are not asserted runnable. */
export function simulatorLibrary(): BattleSimulatorLibrary {
  const library = emptyBattleSimulatorLibrary()
  library.allies.push({
    id: 'party-a',
    name: '练习队',
    description: '',
    config: {
      members: [
        {
          actorId: 'hero',
          stats: { level: 8 },
          equipment: { weapon: null },
          skills: { kind: 'replace', ids: [] },
          hp: { kind: 'full' },
          mp: { kind: 'value', value: 0 },
        },
      ],
    },
  })
  library.enemies.push({
    id: 'enemy-a',
    name: '待配置敌队',
    description: '',
    config: { kind: 'slots', slots: [null, null, null, null, null] },
  })
  library.bags.push({ id: 'bag-a', name: '空背包', description: '', config: { items: [] } })
  library.plans.push({
    id: 'plan-a',
    name: '练习方案',
    description: '',
    config: {
      party: { kind: 'preset', presetId: 'party-a' },
      enemies: { kind: 'preset', presetId: 'enemy-a' },
      bag: { kind: 'preset', presetId: 'bag-a' },
      fieldId: 0,
      music: { kind: 'silent' },
      money: 0,
      auto: false,
      boss: false,
      overrides: {},
    },
  })
  return library
}
