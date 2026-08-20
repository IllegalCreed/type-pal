import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import {
  checkAuthorCommands,
  resolveAuthorDialogueTree,
} from './author-script.js'
import { checkAuthorDialogueCue, resolveAuthorDialogueCue } from './author-dialogue.js'

const actor: ActorDef = {
  id: 'actor.li',
  name: 'name.li',
  spriteId: 'sprite.li',
  portraits: {
    default: 'portrait.li.default',
    expressions: { angry: 'portrait.li.angry' },
  },
}

describe('author dialogue identity', () => {
  test('actor 默认名、称谓覆写、主立绘与表情只从本 Actor 解析', () => {
    expect(
      resolveAuthorDialogueCue(
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
      resolveAuthorDialogueCue(
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
    expect(() => resolveAuthorDialogueCue(cue, {})).toThrow(/未知 Actor/)
    expect(() =>
      resolveAuthorDialogueCue(cue, {
        'actor.missing': { id: 'actor.missing', name: 'name', spriteId: 'sprite' },
      }),
    ).toThrow(/portraits\.default/)
    expect(() =>
      resolveAuthorDialogueCue(
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
      checkAuthorDialogueCue(
        { identity: { kind: 'narration' }, speaker: 'legacy', rows: [{ text: 'line' }] },
        'cue',
      ),
    ).toThrow(/cue\.speaker: 未知字段/)
    expect(() =>
      checkAuthorDialogueCue({ identity: { kind: 'unbound' }, rows: [{ text: 'line' }] }, 'cue'),
    ).toThrow(/至少需要 speaker 或 portrait/)
    expect(() =>
      checkAuthorDialogueCue(
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

  test('作者命令只接受当前 identity 形状', () => {
    const historical = [
      {
        kind: 'dialog' as const,
        cue: {
          speaker: 'spk.old',
          portrait: { asset: 'portrait.old', side: 'left' as const },
          rows: [{ text: 'line.old' }],
        },
      },
    ]
    const current = [
      {
        kind: 'dialog' as const,
        cue: {
          identity: { kind: 'unbound' as const, speaker: 'spk.old' },
          rows: [{ text: 'line.old' }],
        },
      },
    ]
    expect(() => checkAuthorCommands(current, 'commands')).not.toThrow()
    expect(() => checkAuthorCommands(historical, 'commands')).toThrow(/cue\.speaker: 未知字段/)
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
    expect(resolveAuthorDialogueTree(commands, { [actor.id]: actor })[0]).toEqual({
      kind: 'dialog',
      cue: {
        speaker: 'name.li',
        portrait: { asset: 'portrait.li.angry', side: 'left' },
        rows: [{ text: 'line' }],
      },
    })
  })
})
