import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import type { AuthorCommandV13 } from './script-v13.js'
import {
  checkAuthorCommandsV14,
  downgradeDialogueTreeV14ToV13,
  resolveDialogueTreeV14ToV13,
  upgradeDialogueTreeV13ToV14,
  upgradeDialogueTreeV13ToV14WithCount,
} from './script-v14.js'
import {
  checkDialogueCueV14,
  resolveDialogueCueV14,
  upgradeDialogueCueV13ToV14,
} from './dialogue-v14.js'

const actor: ActorDef = {
  id: 'actor.li',
  name: 'name.li',
  spriteId: 'sprite.li',
  portraits: {
    default: 'portrait.li.default',
    expressions: { angry: 'portrait.li.angry' },
  },
}

describe('content14 dialogue identity', () => {
  test('v13 四态无猜测升级并保持显示结果', () => {
    const cases = [
      { rows: [{ text: 'line.narration' }] },
      { speaker: 'spk.li', rows: [{ text: 'line.speaker' }] },
      {
        rows: [{ text: 'line.portrait' }],
        portrait: { asset: 'portrait.legacy', side: 'left' as const },
      },
      {
        speaker: 'spk.li',
        rows: [{ text: 'line.both', speed: 24 }],
        portrait: { asset: 'portrait.legacy', side: 'right' as const },
        slot: 'top' as const,
        autoAdvance: 160,
        cursorFrame: 2 as const,
      },
    ]
    const before = JSON.parse(JSON.stringify(cases)) as typeof cases
    const upgraded = cases.map(upgradeDialogueCueV13ToV14)
    expect(upgraded.map((cue) => cue.identity.kind)).toEqual([
      'narration',
      'unbound',
      'unbound',
      'unbound',
    ])
    expect(upgraded.map((cue) => resolveDialogueCueV14(cue, {}))).toEqual(cases)
    expect(cases).toEqual(before)
  })

  test('升级把 identity 放在旧身份首位，回投保持字段语义', () => {
    const source = [
      {
        kind: 'dialog',
        cue: {
          rows: [{ text: 'line' }],
          portrait: { side: 'left', asset: 'portrait.legacy' },
          autoAdvance: 80,
          speaker: 'spk.legacy',
          slot: 'top',
        },
      },
      { kind: 'dialog', cue: { slot: 'center', rows: [{ text: 'narration' }] } },
    ]
    const upgraded = upgradeDialogueTreeV13ToV14(source)
    expect(Object.keys(upgraded[0]!.cue)).toEqual([
      'rows',
      'identity',
      'autoAdvance',
      'slot',
    ])
    const firstCue = (upgraded[0] as unknown as { cue: { identity: object } }).cue
    expect(Object.keys(firstCue.identity)).toEqual(['kind', 'portrait', 'speaker'])
    expect(downgradeDialogueTreeV14ToV13(upgraded)).toEqual(source)
  })

  test('actor 身份没有 content13 逆映射，回投必须 fail-loud', () => {
    expect(() =>
      downgradeDialogueTreeV14ToV13([
        {
          kind: 'dialog',
          cue: {
            identity: { kind: 'actor', actor: actor.id },
            rows: [{ text: 'line' }],
          },
        },
      ]),
    ).toThrow(/actor 身份无法无损回退 content13/)
  })

  test('actor 默认名、称谓覆写、主立绘与表情只从本 Actor 解析', () => {
    expect(
      resolveDialogueCueV14(
        {
          identity: {
            kind: 'actor',
            actor: actor.id,
            portrait: { kind: 'default', side: 'right' },
          },
          rows: [{ text: 'line' }],
        },
        { [actor.id]: actor },
      ),
    ).toEqual({
      speaker: 'name.li',
      portrait: { asset: 'portrait.li.default', side: 'right' },
      rows: [{ text: 'line' }],
    })
    expect(
      resolveDialogueCueV14(
        {
          identity: {
            kind: 'actor',
            actor: actor.id,
            speakerOverride: 'title.hero',
            portrait: { kind: 'expression', expression: 'angry', side: 'left' },
          },
          rows: [{ text: 'line' }],
        },
        { [actor.id]: actor },
      ),
    ).toMatchObject({
      speaker: 'title.hero',
      portrait: { asset: 'portrait.li.angry', side: 'left' },
    })
  })

  test('缺 actor/default/expression 全部 fail-loud，不回退全局资源', () => {
    const cue = {
      identity: {
        kind: 'actor' as const,
        actor: 'actor.missing',
        portrait: { kind: 'default' as const, side: 'right' as const },
      },
      rows: [{ text: 'line' }],
    }
    expect(() => resolveDialogueCueV14(cue, {})).toThrow(/未知 Actor/)
    expect(() =>
      resolveDialogueCueV14(cue, {
        'actor.missing': { id: 'actor.missing', name: 'name', spriteId: 'sprite' },
      }),
    ).toThrow(/portraits\.default/)
    expect(() =>
      resolveDialogueCueV14(
        {
          ...cue,
          identity: {
            kind: 'actor',
            actor: actor.id,
            portrait: { kind: 'expression', expression: 'sad', side: 'right' },
          },
        },
        { [actor.id]: actor },
      ),
    ).toThrow(/缺表情 "sad"/)
  })

  test('拒绝半状态、空 unbound 与 actor 直接 AssetId', () => {
    expect(() =>
      checkDialogueCueV14(
        { identity: { kind: 'narration' }, speaker: 'legacy', rows: [{ text: 'line' }] },
        'cue',
      ),
    ).toThrow(/cue\.speaker: 未知字段/)
    expect(() =>
      checkDialogueCueV14({ identity: { kind: 'unbound' }, rows: [{ text: 'line' }] }, 'cue'),
    ).toThrow(/至少需要 speaker 或 portrait/)
    expect(() =>
      checkDialogueCueV14(
        {
          identity: {
            kind: 'actor',
            actor: actor.id,
            portrait: { asset: 'portrait.other', side: 'left' },
          },
          rows: [{ text: 'line' }],
        },
        'cue',
      ),
    ).toThrow(/kind/)
  })

  test('历史 AuthorCommandV13 仍接受冻结 speaker/portrait，v14 单独校验 identity', () => {
    const historical: AuthorCommandV13[] = [
      {
        kind: 'dialog',
        cue: {
          speaker: 'spk.old',
          portrait: { asset: 'portrait.old', side: 'left' },
          rows: [{ text: 'line.old' }],
        },
      },
    ]
    const current = upgradeDialogueTreeV13ToV14(historical)
    expect(historical[0]).toHaveProperty('cue.speaker', 'spk.old')
    expect(current[0]).toHaveProperty('cue.identity.kind', 'unbound')
    expect(() => checkAuthorCommandsV14(current, 'commands')).not.toThrow()
    expect(() => checkAuthorCommandsV14(historical, 'commands')).toThrow(/cue\.speaker: 未知字段/)
  })

  test('G1：同一 walker 覆盖 ai.hooks、onDefeated、choreography 与递归 arm', () => {
    const cue = { kind: 'dialog', cue: { speaker: 'spk', rows: [{ text: 'line' }] } }
    const source = {
      ai: {
        hooks: {
          ready: {
            states: {
              initial: { body: [cue], next: { kind: 'stay' } },
            },
          },
        },
      },
      onDefeated: [{ kind: 'branch', cond: { kind: 'chance', percent: 50 }, then: [cue] }],
      choreography: [{ at: 'turnStart', body: [cue] }],
    }
    const upgraded = upgradeDialogueTreeV13ToV14WithCount(source)
    expect(upgraded.upgradedCues).toBe(3)
    expect(upgraded.value.ai.hooks.ready.states.initial.body[0]).toHaveProperty(
      'cue.identity.kind',
      'unbound',
    )
    expect(upgraded.value.onDefeated[0]!.then[0]).toHaveProperty(
      'cue.identity.kind',
      'unbound',
    )
    expect(upgraded.value.choreography[0]!.body[0]).toHaveProperty(
      'cue.identity.kind',
      'unbound',
    )
    expect(() => upgradeDialogueTreeV13ToV14(upgraded.value)).toThrow(/拒绝重复升级/)
  })

  test('runtime 全树投影调用同一 resolver', () => {
    const commands = [
      {
        kind: 'dialog' as const,
        cue: {
          identity: {
            kind: 'actor' as const,
            actor: actor.id,
            portrait: { kind: 'expression' as const, expression: 'angry', side: 'left' as const },
          },
          rows: [{ text: 'line' }],
        },
      },
    ]
    expect(resolveDialogueTreeV14ToV13(commands, { [actor.id]: actor })[0]).toEqual({
      kind: 'dialog',
      cue: {
        speaker: 'name.li',
        portrait: { asset: 'portrait.li.angry', side: 'left' },
        rows: [{ text: 'line' }],
      },
    })
  })
})
