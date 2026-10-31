import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef } from './actor.js'
import type { AuthorDialogueCue, DialogueIdentity } from './author-dialogue.js'
import {
  checkAuthorDialogueCue,
  resolveAuthorDialogueCue,
  resolveDialogueIdentity,
} from './author-dialogue.js'
import { checkAuthorCommands, resolveAuthorDialogueTree } from './author-script.js'
import { validateActors } from './validate.js'
import { validateAuthorDialogueReferences, validateAuthorSharedScripts } from './validate-author.js'

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
    ).toEqual({
      speaker: 'title.hero',
      portrait: { asset: 'portrait.li.angry', side: 'left' },
      rows: [{ text: 'line' }],
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

  test.each([
    {
      name: '未定义角色不借用对象原型中的同名键',
      identity: { kind: 'actor', actor: 'constructor' } satisfies DialogueIdentity,
      message: '未知 Actor "constructor"',
    },
    {
      name: '未定义表情不借用对象原型中的同名键',
      identity: {
        kind: 'actor',
        actor: actor.id,
        portrait: { kind: 'expression', expression: 'constructor', side: 'left' },
      } satisfies DialogueIdentity,
      message: '缺表情 "constructor"',
    },
  ])('$name', ({ identity, message }) => {
    const sharedScripts = validateAuthorSharedScripts({
      probe: {
        name: 'probe',
        self: 'none',
        body: [{ kind: 'dialog', cue: { identity, rows: [{ text: 'line' }] } }],
      },
    })
    expect(() =>
      validateAuthorDialogueReferences({
        scenes: [],
        items: [],
        enemies: [],
        sharedScripts,
        actors: validateActors([actor]),
      }),
    ).toThrow(message)
  })

  test('实际定义的同名角色与表情仍按自己的定义解析', () => {
    const actors = validateActors([
      {
        ...actor,
        id: 'constructor',
        name: 'name.defined',
        portraits: {
          default: 'portrait.defined',
          expressions: { constructor: 'portrait.expression.defined' },
        },
      },
    ])
    const cue: AuthorDialogueCue = {
      identity: {
        kind: 'actor',
        actor: 'constructor',
        portrait: {
          kind: 'expression',
          expression: 'constructor',
          side: 'right',
        },
      },
      rows: [{ text: 'line' }],
    }
    const sharedScripts = validateAuthorSharedScripts({
      probe: { name: 'probe', self: 'none', body: [{ kind: 'dialog', cue }] },
    })
    expect(() =>
      validateAuthorDialogueReferences({
        scenes: [],
        items: [],
        enemies: [],
        sharedScripts,
        actors,
      }),
    ).not.toThrow()
    expect(
      resolveAuthorDialogueCue(cue, Object.fromEntries(actors.map((entry) => [entry.id, entry]))),
    ).toEqual({
      speaker: 'name.defined',
      portrait: { asset: 'portrait.expression.defined', side: 'right' },
      rows: [{ text: 'line' }],
    })
  })

  test('resolve 复制 slot/cursorFrame，未请求立绘时只出 speaker', () => {
    const cue = {
      identity: { kind: 'actor' as const, actor: actor.id },
      rows: [{ text: 'line.plain' }],
      slot: 'top' as const,
      cursorFrame: 2 as const,
    }
    const actors = { [actor.id]: actor }
    const cueSnap = deepSnapshot(cue)
    const actorsSnap = deepSnapshot(actors)
    checkAuthorDialogueCue(cue, 'cue')
    expect(cue).toEqual(cueSnap)
    expect(resolveAuthorDialogueCue(cue, actors, 'cue')).toEqual({
      speaker: 'name.li',
      rows: [{ text: 'line.plain' }],
      slot: 'top',
      cursorFrame: 2,
    })
    expect(cue).toEqual(cueSnap)
    expect(actors).toEqual(actorsSnap)
    expect(actors[actor.id]).toBe(actor)
  })

  test('unbound：speaker/portrait 声明性透传（浅拷贝 portrait）', () => {
    expect(resolveDialogueIdentity({ kind: 'unbound', speaker: '旁白甲' }, {})).toEqual({
      speaker: '旁白甲',
    })
    const portrait = { asset: 'portrait.narrator', side: 'left' } as const
    const withPortrait = resolveDialogueIdentity({ kind: 'unbound', portrait }, {})
    expect(withPortrait.portrait).toEqual({ asset: 'portrait.narrator', side: 'left' })
    expect(withPortrait.portrait).not.toBe(portrait)
  })
})
