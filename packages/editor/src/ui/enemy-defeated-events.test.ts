import type { AuthorEnemyDef, ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  createEnemyDefeatedPresentationContext,
  findEditableEnemyDefeatedItemReward,
  presentEnemyDefeatedEvents,
  replaceEditableEnemyDefeatedItemReward,
} from './enemy-defeated-events.js'

const items: ItemData[] = [
  {
    id: '115',
    name: 'name.item.115',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  },
]

type AuthorEnemyDefeatedCommands = NonNullable<AuthorEnemyDef['onDefeated']>

const context = createEnemyDefeatedPresentationContext({
  items,
  locale: {
    'name.item.115': '蜂巢',
    'dlg.13119': '获得一个蜂巢',
    'dlg.rich': '<yellow>获得一个蜂巢</yellow>',
    'name.actor.li': '李逍遥',
    'speaker.override': '神秘人',
  },
  assetCatalog: {
    version: 1,
    assets: {
      'sound.hit': {
        kind: 'sound',
        path: 'assets/hit.wav',
        mediaType: 'audio/wav',
        bytes: 1,
        sha256: 'test',
        label: '命中音效',
        origin: { kind: 'authored' },
      },
      'music.win': {
        kind: 'music',
        path: 'assets/win.mid',
        mediaType: 'audio/midi',
        bytes: 1,
        sha256: 'test',
        label: '胜利音乐',
        origin: { kind: 'authored' },
      },
      'portrait.li.happy': {
        kind: 'portrait',
        path: 'assets/li-happy.png',
        mediaType: 'image/png',
        bytes: 1,
        sha256: 'test',
        label: '李逍遥开心立绘',
        origin: { kind: 'authored' },
      },
    },
  },
  worldVariables: {
    'quest.done': {
      kind: 'flag',
      name: '任务完成',
      description: '',
      initial: false,
    },
    score: {
      kind: 'number',
      name: '分数',
      description: '',
      initial: 0,
    },
  },
  actors: [
    {
      id: 'li-xiaoyao',
      name: 'name.actor.li',
      spriteId: 'li-xiaoyao',
      portraits: {
        default: 'portrait.li.happy',
        expressions: { happy: 'portrait.li.happy' },
      },
    },
  ],
  scenes: [],
})

const missingActorNameContext = createEnemyDefeatedPresentationContext({
  items,
  locale: { 'dlg.13119': '获得一个蜂巢', 'speaker.override': '神秘人' },
  assetCatalog: { version: 1, assets: {} },
  worldVariables: {},
  actors: [{ id: 'actor-missing-name', name: 'name.actor.missing', spriteId: 'missing' }],
  scenes: [],
})

function honeyReward(): AuthorEnemyDefeatedCommands {
  return [
    {
      kind: 'branch',
      cond: { kind: 'chance', percent: 89 },
      then: [{ kind: 'stopScript' }],
    },
    { kind: 'giveItem', itemId: '115', count: 1 },
    {
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.13119' }] },
    },
  ]
}

describe('enemy defeated event presenter', () => {
  test('把蜜蜂的严格三步模式解释为 11% 奖励，同时保留完整有序树', () => {
    const presentation = presentEnemyDefeatedEvents(honeyReward(), context)

    expect(presentation.compactSummary).toBe('击败后：11% 获得蜂巢 ×1')
    expect(presentation.exactReward).toMatchObject({
      itemId: '115',
      count: 1,
      probability: 11,
    })
    expect(presentation.nodes.map((node) => node.label)).toEqual([
      '89% 概率时',
      '获得蜂巢 ×1',
      '显示“获得一个蜂巢”',
    ])
    expect(presentation.nodes[0]?.arms?.[0]).toMatchObject({
      label: '满足时',
      nodes: [{ label: '结束本敌槽后续事件' }],
    })
    expect(presentation.nodes.some((node) => node.invalid)).toBe(false)
  })

  test.each([
    [79, 21],
    [81, 19],
    [89, 11],
    [85, 15],
  ])('严格概率保护 %i%% 反算为 %i%% 奖励', (skipPercent, rewardPercent) => {
    const commands = honeyReward()
    const branch = commands[0]
    if (branch?.kind !== 'branch') throw new Error('fixture 缺概率分支')
    branch.cond = { kind: 'chance', percent: skipPercent }
    expect(presentEnemyDefeatedEvents(commands, context).exactReward?.probability).toBe(
      rewardPercent,
    )
  })

  test('显式消费真实作者态 dialogue identity，并把富文本解析为玩家可读正文', () => {
    const commands = [
      {
        kind: 'dialog',
        cue: {
          identity: {
            kind: 'actor',
            actor: 'li-xiaoyao',
            portrait: { kind: 'expression', expression: 'happy', side: 'left' },
          },
          rows: [{ text: 'dlg.rich' }],
        },
      },
    ] satisfies NonNullable<AuthorEnemyDef['onDefeated']>

    const presentation = presentEnemyDefeatedEvents(commands, context)
    expect(presentation.nodes[0]).toMatchObject({
      label: '显示“获得一个蜂巢”',
      detail: expect.stringContaining('说话人：李逍遥'),
    })
    expect(presentation.nodes[0]?.detail).toContain('立绘：portrait.li.happy')
    expect(presentation.nodes[0]?.invalid).toBeUndefined()
  })

  test('姓名覆盖不能掩盖角色本体缺失，角色名 TextId 缺失也必须标错并保留原值', () => {
    const missingActor = presentEnemyDefeatedEvents(
      [
        {
          kind: 'dialog',
          cue: {
            identity: {
              kind: 'actor',
              actor: 'missing-actor',
              speakerOverride: 'speaker.override',
            },
            rows: [{ text: 'dlg.13119' }],
          },
        },
      ],
      context,
    )
    expect(missingActor.nodes[0]).toMatchObject({ invalid: true })
    expect(missingActor.nodes[0]?.detail).toContain('说话人：神秘人')
    expect(missingActor.nodes[0]?.detail).toContain('角色引用缺失：missing-actor')

    expect(missingActorNameContext.actor('actor-missing-name')).toEqual({
      id: 'actor-missing-name',
      label: 'name.actor.missing',
      invalid: true,
    })
    const missingActorName = presentEnemyDefeatedEvents(
      [
        {
          kind: 'dialog',
          cue: {
            identity: {
              kind: 'actor',
              actor: 'actor-missing-name',
              speakerOverride: 'speaker.override',
            },
            rows: [{ text: 'dlg.13119' }],
          },
        },
      ],
      missingActorNameContext,
    )
    expect(missingActorName.nodes[0]).toMatchObject({ invalid: true })
    expect(missingActorName.nodes[0]?.detail).toContain(
      '角色名引用缺失：name.actor.missing',
    )
  })

  test.each([
    {
      name: '带 else',
      commands: [
        {
          kind: 'branch' as const,
          cond: { kind: 'chance' as const, percent: 89 },
          then: [{ kind: 'stopScript' as const }],
          else: [{ kind: 'wait' as const, ms: 1 }],
        },
        { kind: 'giveItem' as const, itemId: '115', count: 1 },
        {
          kind: 'dialog' as const,
          cue: { identity: { kind: 'narration' as const }, rows: [{ text: 'dlg.13119' }] },
        },
      ],
    },
    {
      name: '显式空 else（摘要仍不扩大三步严格合同）',
      commands: [
        {
          kind: 'branch' as const,
          cond: { kind: 'chance' as const, percent: 89 },
          then: [{ kind: 'stopScript' as const }],
          else: [],
        },
        { kind: 'giveItem' as const, itemId: '115', count: 1 },
        {
          kind: 'dialog' as const,
          cue: { identity: { kind: 'narration' as const }, rows: [{ text: 'dlg.13119' }] },
        },
      ],
    },
    {
      name: '复合条件',
      commands: [
        {
          kind: 'branch' as const,
          cond: {
            kind: 'all' as const,
            of: [
              { kind: 'chance' as const, percent: 89 },
              { kind: 'allFullHp' as const },
            ],
          },
          then: [{ kind: 'stopScript' as const }],
        },
        { kind: 'giveItem' as const, itemId: '115', count: 1 },
        {
          kind: 'dialog' as const,
          cue: { identity: { kind: 'narration' as const }, rows: [{ text: 'dlg.13119' }] },
        },
      ],
    },
    {
      name: '奖励位于嵌套分支',
      commands: [
        {
          kind: 'branch' as const,
          cond: { kind: 'chance' as const, percent: 11 },
          then: [
            { kind: 'giveItem' as const, itemId: '115', count: 1 },
            {
              kind: 'dialog' as const,
              cue: { identity: { kind: 'narration' as const }, rows: [{ text: 'dlg.13119' }] },
            },
          ],
        },
      ],
    },
  ])('$name 不得套用严格概率奖励公式', ({ commands }) => {
    const presentation = presentEnemyDefeatedEvents(commands, context)
    expect(presentation.exactReward).toBeUndefined()
    expect(presentation.compactSummary).not.toBe('击败后：11% 获得蜂巢 ×1')
  })

  test('13 种叶事件与递归分支都给出可读说明，缺失引用保留原 ID 并标错', () => {
    const commands: AuthorEnemyDefeatedCommands = [
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'copy.missing' }] },
      },
      { kind: 'clearDialog' },
      { kind: 'wait', ms: 250 },
      { kind: 'playSound', asset: 'sound.hit' },
      { kind: 'playMusic', asset: 'music.missing' },
      { kind: 'stopMusic' },
      { kind: 'giveItem', itemId: '115', count: 2 },
      { kind: 'loseItem', itemId: 'item.missing', count: 1 },
      { kind: 'giveMoney', delta: 12 },
      { kind: 'setFlag', flag: 'quest.done', value: true },
      { kind: 'setVar', var: 'score', value: 7 },
      { kind: 'addVar', var: 'missing.var', delta: -2 },
      { kind: 'stopScript' },
      {
        kind: 'branch',
        cond: { kind: 'var', var: 'score', op: '>=', value: 7 },
        then: [{ kind: 'playSound', asset: 'sound.hit' }],
      },
    ]

    const presentation = presentEnemyDefeatedEvents(commands, context)
    expect(presentation.nodes).toHaveLength(14)
    expect(presentation.nodes.map((node) => node.label)).toEqual(
      expect.arrayContaining([
        '显示“copy.missing”',
        '清除对话框',
        '等待 250 毫秒',
        '播放音效 命中音效',
        '播放音乐 music.missing',
        '停止音乐',
        '获得蜂巢 ×2',
        '移除 item.missing ×1',
        '获得金钱 12',
        '将开关 任务完成设为开启',
        '将变量 分数设为 7',
        '变量 missing.var 减少 2',
        '结束本敌槽后续事件',
        '如果 分数 ≥ 7',
      ]),
    )
    expect(presentation.nodes.find((node) => node.label.includes('music.missing'))?.invalid).toBe(
      true,
    )
    expect(presentation.nodes.find((node) => node.label.includes('missing.var'))?.invalid).toBe(
      true,
    )
    expect(presentation.nodes.find((node) => node.label.includes('copy.missing'))?.invalid).toBe(
      true,
    )
  })

  test('无点号的缺失 TextId、错类型资源与缺失表情都保留原值并标错', () => {
    const presentation = presentEnemyDefeatedEvents(
      [
        {
          kind: 'dialog',
          cue: { identity: { kind: 'narration' }, rows: [{ text: 'missing' }] },
        },
        { kind: 'playMusic', asset: 'sound.hit' },
        {
          kind: 'dialog',
          cue: {
            identity: {
              kind: 'actor',
              actor: 'li-xiaoyao',
              portrait: { kind: 'expression', expression: 'angry', side: 'left' },
            },
            rows: [{ text: 'dlg.13119' }],
          },
        },
      ],
      context,
    )

    expect(presentation.nodes[0]).toMatchObject({ label: '显示“missing”', invalid: true })
    expect(presentation.nodes[1]).toMatchObject({
      label: '播放音乐 sound.hit',
      detail: '引用缺失：sound.hit',
      invalid: true,
    })
    expect(presentation.nodes[2]?.detail).toContain('表情：angry（引用缺失）')
    expect(presentation.nodes[2]?.invalid).toBe(true)
  })

  test('复杂事件摘要优先展示实际结果，再概括提示、音效与等待', () => {
    const presentation = presentEnemyDefeatedEvents(
      [
        { kind: 'wait', ms: 250 },
        { kind: 'playSound', asset: 'sound.hit' },
        { kind: 'giveItem', itemId: '115', count: 2 },
        {
          kind: 'dialog',
          cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.13119' }] },
        },
      ],
      context,
    )

    expect(presentation.compactSummary).toBe('击败后：获得蜂巢 ×2；另有等待、音效、提示')
  })

  test('摘要不展示 stopScript 后不可达的奖励', () => {
    const stopped = presentEnemyDefeatedEvents(
      [
        { kind: 'stopScript' },
        { kind: 'giveItem', itemId: '115' },
      ],
      context,
    )
    expect(stopped.compactSummary).toBe('击败后：结束本敌槽后续事件')
    expect(stopped.compactSummary).not.toContain('蜂巢')

    const bothArmsStop = presentEnemyDefeatedEvents(
      [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 50 },
          then: [{ kind: 'stopScript' }],
          else: [{ kind: 'stopScript' }],
        },
        { kind: 'giveItem', itemId: '115' },
      ],
      context,
    )
    expect(bothArmsStop.compactSummary).not.toContain('蜂巢')
    expect(bothArmsStop.compactSummary).toContain('流程终止')
  })

  test('摘要根据分支是否可能终止来判断后续结果，不把普通分支误写成可能结果', () => {
    const alwaysContinues = presentEnemyDefeatedEvents(
      [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 50 },
          then: [{ kind: 'wait', ms: 10 }],
          else: [{ kind: 'wait', ms: 20 }],
        },
        { kind: 'giveMoney', delta: 12 },
      ],
      context,
    )
    expect(alwaysContinues.compactSummary).toBe('击败后：获得金钱 12；另有等待')

    const nestedResult = presentEnemyDefeatedEvents(
      [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 50 },
          then: [{ kind: 'giveMoney', delta: 12 }],
        },
      ],
      context,
    )
    expect(nestedResult.compactSummary).toBe('击败后：按条件可能获得金钱 12')
  })

  test('单个非结果事件不会在摘要中重复概括自身', () => {
    expect(
      presentEnemyDefeatedEvents([{ kind: 'wait', ms: 250 }], context).compactSummary,
    ).toBe('击败后：等待 250 毫秒')
  })
})

describe('enemy defeated reward edit boundary', () => {
  test('只识别唯一顶层 giveItem 及相邻严格保护/对白，替换时保留区间外原序', () => {
    const commands: AuthorEnemyDefeatedCommands = [
      { kind: 'giveMoney', delta: 9 },
      ...honeyReward(),
      { kind: 'setFlag', flag: 'quest.done', value: true },
    ]
    const reward = findEditableEnemyDefeatedItemReward(commands)
    expect(reward).toMatchObject({
      startIndex: 1,
      endIndex: 4,
      itemId: '115',
      count: 1,
      probability: 11,
    })

    expect(
      replaceEditableEnemyDefeatedItemReward(commands, reward, {
        itemId: '115',
        count: 3,
        probability: 40,
      }),
    ).toEqual([
      { kind: 'giveMoney', delta: 9 },
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 60 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: '115', count: 3 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.13119' }] },
      },
      { kind: 'setFlag', flag: 'quest.done', value: true },
    ])
  })

  test('多个顶层物品奖励视为不可安全编辑', () => {
    expect(
      findEditableEnemyDefeatedItemReward([
        { kind: 'giveItem', itemId: '115' },
        { kind: 'giveItem', itemId: '116' },
      ]),
    ).toBeUndefined()
  })

  test('编辑边界接受语义为空的 else，但非空 else 不得解释为概率保护', () => {
    const emptyElse: AuthorEnemyDefeatedCommands = [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 60 },
        then: [{ kind: 'stopScript' }],
        else: [],
      },
      { kind: 'giveItem', itemId: '115' },
    ]
    const nonEmptyElse: AuthorEnemyDefeatedCommands = [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 60 },
        then: [{ kind: 'stopScript' }],
        else: [{ kind: 'wait', ms: 1 }],
      },
      { kind: 'giveItem', itemId: '115' },
    ]
    expect(findEditableEnemyDefeatedItemReward(emptyElse)?.probability).toBe(40)
    expect(findEditableEnemyDefeatedItemReward(nonEmptyElse)).toBeUndefined()
  })

  test('无相邻对白的编辑器写形不冒充严格公式，也不把跳过概率说成奖励概率', () => {
    const presentation = presentEnemyDefeatedEvents(
      [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 60 },
          then: [{ kind: 'stopScript' }],
        },
        { kind: 'giveItem', itemId: '115' },
      ],
      context,
    )
    expect(presentation.exactReward).toBeUndefined()
    expect(presentation.compactSummary).toBe('击败后：按条件可能获得蜂巢 ×1')
    expect(presentation.compactSummary).not.toContain('60% 获得')
    expect(presentation.compactSummary).not.toContain('40% 获得')
  })

  test('0% 奖励编辑往返后不展示不可达奖励，0% 条件分支后的奖励仍判定为必达', () => {
    const zeroPercent = replaceEditableEnemyDefeatedItemReward(undefined, undefined, {
      itemId: '115',
      count: 1,
      probability: 0,
    })
    expect(zeroPercent).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 100 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: '115', count: 1 },
    ])
    expect(presentEnemyDefeatedEvents(zeroPercent, context).compactSummary).not.toContain('蜂巢')

    const alwaysReward = presentEnemyDefeatedEvents(
      [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 0 },
          then: [{ kind: 'stopScript' }],
        },
        { kind: 'giveItem', itemId: '115' },
      ],
      context,
    )
    expect(alwaysReward.compactSummary).toBe('击败后：获得蜂巢 ×1')
  })
})
