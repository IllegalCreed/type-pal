import type { AuthorAcquisitionFlow, AuthorGrantRewardCommand } from '../item-acquisition.js'

export const items = [{ id: 'herb', name: 'item.herb' }]
export const self = { scene: 'island', entity: 'chest' }
export const cue = { identity: { kind: 'narration' as const }, rows: [{ text: 'line.reward' }] }
export const grant: AuthorGrantRewardCommand = {
  kind: 'grantReward',
  rewards: [
    { kind: 'item', itemId: 'herb', count: 3 },
    { kind: 'money', amount: 50 },
  ],
  notice: { kind: 'custom', timing: 'before', cue },
}
export const chest = {
  kind: 'acquisition',
  recipe: 'builtin/item/chest',
  rewards: grant.rewards,
  notice: grant.notice,
  opening: { facing: 'down', frame: 1, sound: 'sound.open' },
  stages: {
    available: { id: 'unopened', label: '打开' },
    collected: { id: 'empty', label: '空箱' },
  },
  empty: { kind: 'custom', cue: { ...cue, rows: [{ text: 'line.empty' }] } },
} satisfies AuthorAcquisitionFlow
export function acquisitionScene<Flow>(flow: Flow) {
  return {
    id: self.scene,
    mapId: 'map-island',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
    entities: [
      {
        id: self.entity,
        zone: true as const,
        pos: { col: 1, row: 1, height: 0 },
        behaviors: { trigger: { collect: { label: 'Collect', order: 0, flow } } },
        pages: [{ id: 'active', label: 'Active', trigger: 'collect' }],
        initialPage: 'active',
      },
    ],
  }
}

export const search = {
  kind: 'acquisition',
  recipe: 'builtin/item/search',
  afterCollect: 'repeat',
  stages: chest.stages,
  rewards: grant.rewards,
  notice: grant.notice,
  empty: { kind: 'silent' },
} satisfies AuthorAcquisitionFlow
export const disabledSearch = {
  kind: 'acquisition',
  recipe: 'builtin/item/search',
  afterCollect: 'disable',
  stages: chest.stages,
  rewards: grant.rewards,
  notice: grant.notice,
} satisfies AuthorAcquisitionFlow
