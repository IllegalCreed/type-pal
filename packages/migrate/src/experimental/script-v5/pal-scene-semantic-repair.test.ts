import type { AuthorCommandV5, SceneDefV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { SourceCmd } from '../../source-facts.js'
import { repairPalSceneSemanticsAfterP7 } from './pal-scene-semantic-repair.js'

function scene(
  id: string,
  body: AuthorCommandV5[],
  stages: Extract<
    NonNullable<NonNullable<SceneDefV5['hooks']>['onEnter']>['variants'][string]['flow'],
    { kind: 'stages' }
  >['stages'] = [{ id: 'initial', body }],
): SceneDefV5 {
  return {
    id,
    mapId: `map-${id.slice(1)}`,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '默认进场行为',
            order: 0,
            flow: { kind: 'stages', initial: 'initial', stages },
          },
        },
      },
    },
  }
}

function sourceCommands(): SourceCmd[] {
  const commands = Array.from({ length: 28_306 }, (): SourceCmd => ({ op: 'end' }))
  commands[10_729] = { op: 'raw', opcode: 0x93, operands: [0xfffc, 0, 0] }
  commands[10_735] = { op: 'raw', opcode: 0x05, operands: [0, 2, 0] }
  commands[10_747] = { op: 'raw', opcode: 0x08, operands: [0, 0, 0] }
  commands[10_748] = { op: 'raw', opcode: 0x4a, operands: [6, 0, 0] }
  commands[10_749] = { op: 'end' }
  commands[16_791] = { op: 'raw', opcode: 0x93, operands: [0xfffc, 0, 0] }
  commands[16_799] = { op: 'raw', opcode: 0x09, operands: [28, 0, 0] }
  commands[28_296] = { op: 'raw', opcode: 0x93, operands: [0xffff, 0, 0] }
  commands[28_305] = { op: 'raw', opcode: 0x05, operands: [0, 3, 0] }
  return commands
}

function snapshot(): MigrationSnapshot {
  const body = (before: string, after: string): AuthorCommandV5[] => [
    { kind: 'clearDialog' },
    { kind: 'dialog', cue: { rows: [{ text: before }] } },
    { kind: 'fade', dir: 'out', ms: 1600 },
    { kind: 'clearDialog' },
    { kind: 'dialog', cue: { rows: [{ text: after }] } },
  ]
  const s048Body = body('dlg.3809', 'dlg.3813')
  s048Body.push({ kind: 'dialog', cue: { rows: [{ text: 'dlg.3818' }] } })
  const s048 = scene('s048', s048Body)
  s048.battleFieldId = 6
  const s110 = scene('s110', [])
  s110.entities.push({
    id: 'e2061',
    pos: { col: 0, row: 0, height: 0 },
    sprite: 'sprite-198',
    pages: [
      {
        id: 'default',
        label: '默认模式',
        trigger: 'default',
        triggerActivation: { on: 'touch', range: 3 },
      },
    ],
    initialPage: 'default',
    behaviors: {
      trigger: {
        default: {
          label: '默认触发行为',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'initial',
            stages: [
              {
                id: 'initial',
                body: [
                  { kind: 'dialog', cue: { rows: [{ text: 'dlg.5863' }] } },
                  { kind: 'fade', dir: 'out', ms: 1600 },
                  {
                    kind: 'selectEntityBehavior',
                    target: { scene: 's110', entity: 'e2056' },
                    channel: 'auto',
                    selection: { kind: 'use', value: 'legacy-001' },
                  },
                  { kind: 'wait', ms: 1120 },
                  { kind: 'dialog', cue: { rows: [{ text: 'dlg.5865' }] } },
                ],
              },
            ],
          },
        },
      },
    },
  })
  const s172Body = body('dlg.10025', 'dlg.10026')
  const s172 = scene('s172', s172Body, [
    { id: 'initial', body: s172Body, next: 'legacy-002' },
    { id: 'legacy-002', body: [{ kind: 'wait', ms: 1 }] },
  ])
  return {
    files: new Map([
      ['content/scenes/s048.json', structuredClone(s048) as never],
      ['content/scenes/s110.json', structuredClone(s110) as never],
      ['content/scenes/s172.json', structuredClone(s172) as never],
    ]),
    managedFiles: new Set([
      'content/scenes/s048.json',
      'content/scenes/s110.json',
      'content/scenes/s172.json',
    ]),
  }
}

function flow(result: MigrationSnapshot, id: string) {
  const scene = result.files.get(`content/scenes/${id}.json`) as unknown as SceneDefV5
  const channel = scene.hooks!.onEnter!
  const value = channel.variants[channel.initial!]!.flow
  if (value.kind !== 'stages') throw new Error('expected stages')
  return value
}

function triggerFlow(result: MigrationSnapshot, sceneId: string, entityId: string) {
  const scene = result.files.get(`content/scenes/${sceneId}.json`) as unknown as SceneDefV5
  const value = scene.entities.find((entity) => entity.id === entityId)!.behaviors!.trigger!
    .default!.flow
  if (value.kind !== 'stages') throw new Error('expected stages')
  return value
}

describe('PAL post-P7 scene semantic repair', () => {
  test('显式补回三个 PAL_MakeScene 淡入，并让 s048 首次演出推进到空完成步骤', () => {
    const input = snapshot()
    const original = structuredClone(input.files.get('content/scenes/s048.json'))
    const result = repairPalSceneSemanticsAfterP7({
      snapshot: input,
      sourceCommands: sourceCommands(),
    })

    for (const [id, after, redrawDelay] of [
      ['s048', 'dlg.3813', 120],
      ['s172', 'dlg.10026', 180],
    ] as const) {
      const body = flow(result.snapshot, id).stages[0]!.body
      const clear = body.findIndex((command) => command.kind === 'clearDialog')
      const fadeOut = body.findIndex((command) => command.kind === 'fade' && command.dir === 'out')
      const redraw = body.findIndex(
        (command, index) => index > fadeOut && command.kind === 'clearDialog',
      )
      const fadeIn = body.findIndex(
        (command, index) => index > redraw && command.kind === 'fade' && command.dir === 'in',
      )
      const dialog = body.findIndex(
        (command, index) =>
          index > fadeIn &&
          command.kind === 'dialog' &&
          command.cue.rows.some((row) => row.text === after),
      )
      expect(clear).toBeGreaterThanOrEqual(0)
      expect(fadeOut).toBeGreaterThan(clear)
      expect(redraw).toBeGreaterThan(fadeOut)
      expect(fadeIn).toBe(redraw + 1)
      expect(body[fadeIn]).toEqual({ kind: 'fade', dir: 'in', ms: 600 })
      expect(body[fadeIn + 1]).toEqual({ kind: 'wait', ms: redrawDelay })
      expect(dialog).toBeGreaterThan(fadeIn)
    }

    const s110 = triggerFlow(result.snapshot, 's110', 'e2061')
    const s110Body = s110.stages[0]!.body
    const s110FadeOut = s110Body.findIndex(
      (command) => command.kind === 'fade' && command.dir === 'out',
    )
    const s110Wait = s110Body.findIndex(
      (command, index) => index > s110FadeOut && command.kind === 'wait' && command.ms === 1120,
    )
    const s110FadeIn = s110Body.findIndex(
      (command, index) => index > s110FadeOut && command.kind === 'fade' && command.dir === 'in',
    )
    expect(s110Body.slice(s110FadeIn - 2, s110FadeIn + 2)).toEqual([
      { kind: 'clearDialog' },
      { kind: 'wait', ms: 40 },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'wait', ms: 1080 },
    ])
    expect(s110Wait).toBe(-1)

    const s048 = flow(result.snapshot, 's048')
    expect(s048.stages).toHaveLength(2)
    expect(s048.stages[0]!.next).toBe('completed')
    expect(s048.stages[1]).toEqual({ id: 'completed', body: [] })
    const s172 = flow(result.snapshot, 's172')
    expect(s172.stages).toHaveLength(2)
    expect(s172.stages[0]!.next).toBe('legacy-002')
    expect(s172.stages[1]).toEqual({
      id: 'legacy-002',
      body: [{ kind: 'wait', ms: 1 }],
    })
    expect(input.files.get('content/scenes/s048.json')).toEqual(original)
    expect(result.evidence.sourceSites.map((site) => site.addresses)).toEqual([
      [10_729, 10_735],
      [16_791, 16_799],
      [28_296, 28_305],
      [10_747, 10_748, 10_749],
    ])
  })

  test('重复应用保持同一结果；任一源 opcode 漂移都会 fail loud', () => {
    const source = sourceCommands()
    const first = repairPalSceneSemanticsAfterP7({
      snapshot: snapshot(),
      sourceCommands: source,
    })
    const second = repairPalSceneSemanticsAfterP7({
      snapshot: first.snapshot,
      sourceCommands: source,
    })
    expect(second).toEqual(first)

    const brokenCheckpoint = structuredClone(
      first.snapshot.files.get('content/scenes/s048.json'),
    ) as unknown as SceneDefV5
    const brokenFlow = brokenCheckpoint.hooks!.onEnter!.variants.default!.flow
    if (brokenFlow.kind !== 'stages') throw new Error('expected stages')
    brokenFlow.stages[1]!.next = 'initial'
    first.snapshot.files.set('content/scenes/s048.json', brokenCheckpoint as never)
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: first.snapshot,
        sourceCommands: source,
      }),
    ).toThrow(/已有 completed 步骤但语义不匹配/)

    for (const address of [10_729, 10_735, 10_747, 10_748, 16_791, 16_799, 28_296, 28_305]) {
      const drifted = sourceCommands()
      const command = drifted[address]!
      const operands = [...(command.operands ?? [])]
      operands[operands.length - 1] = (operands.at(-1) ?? 0) + 1
      drifted[address] = { ...command, operands }
      expect(() =>
        repairPalSceneSemanticsAfterP7({
          snapshot: snapshot(),
          sourceCommands: drifted,
        }),
      ).toThrow(/源语义漂移/)
    }

    const endDrift = sourceCommands()
    endDrift[10_749] = { op: 'raw', opcode: 0, operands: [0, 0, 0] }
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: snapshot(),
        sourceCommands: endDrift,
      }),
    ).toThrow(/普通收尾语义漂移/)

    const battlefieldDrift = snapshot()
    const s048 = battlefieldDrift.files.get('content/scenes/s048.json') as unknown as SceneDefV5
    delete s048.battleFieldId
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: battlefieldDrift,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/战场折叠语义漂移/)

    const pathDrift = snapshot()
    const wrongScene = pathDrift.files.get('content/scenes/s172.json') as unknown as SceneDefV5
    wrongScene.id = 's173'
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: pathDrift,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/内容 id=s173 与路径不匹配/)

    const anchorDrift = snapshot()
    const s172 = flow(anchorDrift, 's172')
    s172.stages[0]!.body.unshift({
      kind: 'dialog',
      cue: { rows: [{ text: 'dlg.10025' }] },
    })
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: anchorDrift,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/前置对话 dlg\.10025 锚点数量 2/)
  })

  test('拒绝半修、重复淡入与截断 checkpoint，避免静默叠加错误命令', () => {
    const redrawPartial = snapshot()
    const s048 = flow(redrawPartial, 's048')
    const redraw = s048.stages[0]!.body.findIndex(
      (command, index, body) =>
        index > body.findIndex((candidate) => candidate.kind === 'fade') &&
        command.kind === 'clearDialog',
    )
    s048.stages[0]!.body.splice(redraw + 1, 0, { kind: 'wait', ms: 120 })
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: redrawPartial,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/s048 PAL_MakeScene 重画目标形状漂移/)

    const waitPartial = snapshot()
    const s110 = triggerFlow(waitPartial, 's110', 'e2061')
    const wait1120 = s110.stages[0]!.body.findIndex(
      (command) => command.kind === 'wait' && command.ms === 1120,
    )
    s110.stages[0]!.body.splice(wait1120, 0, { kind: 'clearDialog' })
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: waitPartial,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/s110 PAL_MakeScene 等待目标形状漂移/)

    const duplicateFade = repairPalSceneSemanticsAfterP7({
      snapshot: snapshot(),
      sourceCommands: sourceCommands(),
    }).snapshot
    const s172 = flow(duplicateFade, 's172')
    const after = s172.stages[0]!.body.findIndex(
      (command) => command.kind === 'dialog' && containsText(command, 'dlg.10026'),
    )
    s172.stages[0]!.body.splice(after, 0, { kind: 'fade', dir: 'in', ms: 600 })
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: duplicateFade,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/s172 PAL_MakeScene 重画目标形状漂移/)

    const truncated = snapshot()
    const truncatedFlow = flow(truncated, 's048')
    truncatedFlow.stages[0]!.body.pop()
    expect(() =>
      repairPalSceneSemanticsAfterP7({
        snapshot: truncated,
        sourceCommands: sourceCommands(),
      }),
    ).toThrow(/checkpoint 尾部对话 dlg\.3818 锚点数量 0/)
  })
})

function containsText(command: AuthorCommandV5, text: string): boolean {
  return command.kind === 'dialog' && command.cue.rows.some((row) => row.text === text)
}
