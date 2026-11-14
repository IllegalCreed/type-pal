import type { HostileVictoryTransition } from '@type-pal/content'

const labels = {
  direct: '直接返回地图',
  fade: '淡出战场，淡入地图',
} satisfies Record<HostileVictoryTransition, string>

export const hostileVictoryTransitionOptions = [
  { value: 'direct', label: labels.direct },
  { value: 'fade', label: labels.fade },
] as const
