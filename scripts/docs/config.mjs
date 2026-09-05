// Only these bounded sections declare the current product version. Historical
// versions elsewhere remain evidence, and planned content21 is not current.
export const currentSections = [
  { file: 'packages/content/README.md' },
  { file: 'packages/migrate/README.md', end: /^## 当前发布模型/m },
  { file: 'docs/phase2/guides/shared-script-author-guide.md' },
  { file: 'docs/phase2/specs/script-system.md' },
  { file: 'docs/phase2/specs/content-schema.md' },
  { file: 'docs/phase2/specs/save-system.md' },
  { file: 'docs/phase2/specs/project-lifecycle.md' },
  { file: 'docs/phase2/specs/editor-architecture.md' },
]

// Existing closed cards keep their original top-level spelling. New cards use
// Status:, and every card is parsed only before its first section heading.
export const historicalStatusFiles = new Set([
  'ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md',
  'ED-DS-3-editor-design-system-adoption-gate.md',
  'MIG-PAL-ITEM-SCHEME-LABEL-1-pal-item-scheme-author-labels.md',
  'MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1-pal-role-world-sprite-alias-closure.md',
  'MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md',
])

export const linkExceptions = [
  {
    source: 'reference/sdlpal/docs/README.md',
    target: 'LICENSE',
    reason:
      'Vendored SDLPal documentation; its LICENSE is one directory above. Do not rewrite the reference snapshot.',
  },
  {
    source: 'reference/sdlpal/.github/PULL_REQUEST_TEMPLATE.md',
    target: '../pulls',
    reason: 'Vendored GitHub template: this is an upstream pull-request route, not a local file.',
  },
  {
    source: 'reference/sdlpal/README.md',
    target: 'AUTHORS.md',
    reason:
      'The vendored SDLPal snapshot omits AUTHORS.md; preserve upstream documentation without pretending it exists locally.',
  },
]

export const cancelledReasons = {
  'D15-2-pal-auto-terrain-route-compat.md':
    '用户否定 authored 移动必须查地形的前提，回到 D15-1 修运行时语义。',
  'ED-ACTION-GROUP-ADOPTION-2-frame-animation-timeline.md':
    '用户要求恢复原始帧时间线，由 ED-FRAME-TIMELINE-UX-RESTORE-1 承接。',
  'ED-FRAME-TIMELINE-VIRTUALIZATION-1-frame-card-dom-windowing.md':
    '合并进 ED-FRAME-TIMELINE-UX-RESTORE-1，保留原始可见窗口合同。',
  'OPS-TST-PERF-consolidated-determinism.md':
    'current-only 已删除 P2/P3/P4 producer，证明对象已退役。',
  'OPS-TST-PERF-parallel-gates.md':
    'current-only 已删除 shared/fresh release 路由，不重建旧并行链。',
  'W7E-map-library-scene-binding.md': '用户否决双地图模型，由 W7F 唯一新版地图管线承接。',
}
