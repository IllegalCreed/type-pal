import type { SceneDefV14, SharedScriptLibraryV14, StampTemplateV1 } from '@type-pal/content'

const REVIEW_HOOK_ID = 'ui-review-samples'

const REVIEW_SCRIPTS = {
  'shared/ui-review/quest-start': {
    name: '评审样例 · 开始支线',
    description: '仅供开发期检查脚本目录、说明、命令列表与变量引用样式。',
    self: 'none',
    body: [
      { kind: 'setFlag', flag: 'review.quest.started', value: true },
      { kind: 'setVar', var: 'review.quest.progress', value: 1 },
    ],
  },
  'shared/ui-review/quest-branch': {
    name: '评审样例 · 条件分支',
    description: '覆盖条件、then/else 与多条变量写入的视觉密度。',
    self: 'optional',
    body: [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'review.quest.rewarded', is: false },
        then: [
          { kind: 'addVar', var: 'review.reputation', delta: 5 },
          { kind: 'setFlag', flag: 'review.quest.rewarded', value: true },
        ],
        else: [{ kind: 'addVar', var: 'review.reputation', delta: 1 }],
      },
    ],
  },
  'shared/ui-review/z-empty-slot': {
    name: '评审样例 · 空白片段',
    description: '用于检查已选择但正文为空时的编辑器状态。',
    self: 'required',
    body: [],
  },
} satisfies SharedScriptLibraryV14

const REVIEW_VARIABLE_COMMANDS = [
  { kind: 'setFlag', flag: 'review.chapter.opened', value: true },
  { kind: 'setVar', var: 'review.chapter.progress', value: 2 },
  { kind: 'addVar', var: 'review.reputation', delta: 5 },
  {
    kind: 'branch',
    cond: { kind: 'flag', flag: 'review.quest.rewarded', is: false },
    then: [{ kind: 'setFlag', flag: 'review.quest.rewarded', value: true }],
    else: [{ kind: 'setVar', var: 'review.chapter.progress', value: 3 }],
  },
] satisfies SharedScriptLibraryV14[string]['body']

function reviewStamps(tilesetId: string): StampTemplateV1[] {
  const template = (
    id: string,
    name: string,
    category: string,
    tileIds: readonly number[],
    collision = false,
  ): StampTemplateV1 => ({
    id,
    name,
    category,
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'surface', name: '主体', depthMode: 'flat' }],
    visual: tileIds.map((tileId, index) => ({
      layerSlotId: 'surface',
      offset: { dRow: index, du: index },
      tileId,
      height: 0,
    })),
    collision: collision
      ? tileIds.map((_, index) => ({ offset: { dRow: index, du: index }, value: 1 }))
      : [],
  })

  return [
    template('ui-review-stone-path', '评审样例 · 石径', '道路', [0, 1, 2]),
    template('ui-review-garden-edge', '评审样例 · 花圃边缘', '植被', [2, 3, 4, 5]),
    template('ui-review-village-gate', '评审样例 · 村口门楼', '建筑', [6, 7, 8], true),
    template('ui-review-market-stall', '评审样例 · 集市摊位', '建筑', [9, 10]),
    template('ui-review-pond-bank', '评审样例 · 池塘岸线', '水景', [11, 12, 13, 14]),
    template('ui-review-room-corner', '评审样例 · 房间角落', '室内', [15, 16, 17], true),
  ]
}

export interface UiReviewSampleInput {
  scenes: readonly SceneDefV14[]
  sharedScripts: SharedScriptLibraryV14
  stamps: readonly StampTemplateV1[]
  tilesetId?: string
}

export interface UiReviewSampleOutput {
  scenes: SceneDefV14[]
  sharedScripts: SharedScriptLibraryV14
  stamps: StampTemplateV1[]
}

/**
 * Opt-in, in-memory fixtures for product review. IDs are visibly namespaced and existing project
 * records always win, so the helper can be applied repeatedly without hiding real author content.
 */
export function withUiReviewSamples(input: UiReviewSampleInput): UiReviewSampleOutput {
  const scenes = structuredClone(input.scenes) as SceneDefV14[]
  const firstScene = scenes[0]
  if (firstScene) {
    const onEnter = firstScene.hooks?.onEnter
    if (!onEnter?.variants[REVIEW_HOOK_ID]) {
      firstScene.hooks = {
        ...firstScene.hooks,
        onEnter: {
          ...onEnter,
          variants: {
            ...onEnter?.variants,
            [REVIEW_HOOK_ID]: {
              label: 'UI 评审样例（仅开发期）',
              order: Number.MAX_SAFE_INTEGER,
              flow: {
                kind: 'stages',
                initial: 'review',
                stages: [{ id: 'review', body: structuredClone(REVIEW_VARIABLE_COMMANDS) }],
              },
            },
          },
        },
      }
    }
  }

  const sharedScripts = structuredClone(input.sharedScripts)
  for (const [id, script] of Object.entries(REVIEW_SCRIPTS))
    if (!sharedScripts[id]) sharedScripts[id] = structuredClone(script)

  const stamps = structuredClone(input.stamps) as StampTemplateV1[]
  const existingStampIds = new Set(stamps.map((stamp) => stamp.id))
  for (const stamp of input.tilesetId ? reviewStamps(input.tilesetId) : [])
    if (!existingStampIds.has(stamp.id)) stamps.push(stamp)

  return { scenes, sharedScripts, stamps }
}
