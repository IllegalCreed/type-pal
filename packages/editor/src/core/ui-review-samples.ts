import type {
  AuthorSceneDef,
  AuthorScriptLibrary,
  StampTemplate,
  WorldVariableRegistryV1,
} from '@type-pal/content'

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
} satisfies AuthorScriptLibrary

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
] satisfies AuthorScriptLibrary[string]['body']

const REVIEW_WORLD_VARIABLES = {
  'review.quest.started': {
    kind: 'flag',
    name: '支线任务已开始',
    description: '在评审样例的开始支线脚本中写入。',
    initial: false,
  },
  'review.quest.rewarded': {
    kind: 'flag',
    name: '任务奖励已领取',
    description: '覆盖同一变量读写混合、then/else 分支和精确引用定位。',
    initial: false,
  },
  'review.chapter.opened': {
    kind: 'flag',
    name: '章节已开启',
    description: '场景进入脚本中的开关写入样例。',
    initial: false,
  },
  'review.quest.progress': {
    kind: 'number',
    name: '支线进度',
    description: '可复用脚本中的数值赋值样例。',
    initial: 0,
  },
  'review.chapter.progress': {
    kind: 'number',
    name: '章节推进度',
    description: '场景脚本中的数值赋值与分支嵌套样例。',
    initial: 0,
  },
  'review.reputation': {
    kind: 'number',
    name: '当前地区阵营声望累计值（长名称布局评审样例）',
    description: '在条件分支的两个结果分支中分别累加，用于验证多处写入与长内容布局。',
    initial: 0,
  },
  'review.unused.counter': {
    kind: 'number',
    name: '未使用计数器',
    description: '合法的零引用定义，用于验证 0 处状态和可删除规则。',
    initial: 12,
  },
} satisfies WorldVariableRegistryV1

function reviewStamps(tilesetId: string): StampTemplate[] {
  const template = (
    id: string,
    name: string,
    category: string,
    tileIds: readonly number[],
    collision = false,
  ): StampTemplate => ({
    id,
    name,
    category,
    origin: 'authored',
    width: Math.max(1, tileIds.length),
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: [tilesetId],
    layers: [
      {
        id: 'surface',
        name: '主体',
        tiles: [tileIds.map((tileId) => tileId), tileIds.map(() => null)],
        sources: [tileIds.map(() => 0), tileIds.map(() => null)],
      },
    ],
    collision: [tileIds.map(() => (collision ? 1 : null)), tileIds.map(() => null)],
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
  scenes: readonly AuthorSceneDef[]
  sharedScripts: AuthorScriptLibrary
  stamps: readonly StampTemplate[]
  worldVariables: WorldVariableRegistryV1
  tilesetId?: string
}

export interface UiReviewSampleOutput {
  scenes: AuthorSceneDef[]
  sharedScripts: AuthorScriptLibrary
  stamps: StampTemplate[]
  worldVariables: WorldVariableRegistryV1
}

/**
 * Opt-in, in-memory fixtures for product review. IDs are visibly namespaced and existing project
 * records always win, so the helper can be applied repeatedly without hiding real author content.
 */
export function withUiReviewSamples(input: UiReviewSampleInput): UiReviewSampleOutput {
  const scenes = structuredClone(input.scenes) as AuthorSceneDef[]
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

  const stamps = structuredClone(input.stamps) as StampTemplate[]
  const existingStampIds = new Set(stamps.map((stamp) => stamp.id))
  for (const stamp of input.tilesetId ? reviewStamps(input.tilesetId) : [])
    if (!existingStampIds.has(stamp.id)) stamps.push(stamp)

  const worldVariables = structuredClone(input.worldVariables)
  for (const [id, definition] of Object.entries(REVIEW_WORLD_VARIABLES))
    if (!worldVariables[id]) worldVariables[id] = structuredClone(definition)

  return { scenes, sharedScripts, stamps, worldVariables }
}
