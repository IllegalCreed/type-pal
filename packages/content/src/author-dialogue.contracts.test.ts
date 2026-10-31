/**
 * TEST-CONTENT-CONTRACTS-1 E1/E2：author-dialogue 身份/cue/resolver（author-dialogue.ts）。
 * narration/actor/unbound 合法联合与非法半状态；portrait.side/rows 对象；resolver fail-loud 无 fallback。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef } from './actor.js'
import type { AuthorDialogueCue } from './author-dialogue.js'
import { checkAuthorDialogueCue, resolveAuthorDialogueCue } from './author-dialogue.js'

const actorCue = (): AuthorDialogueCue => ({
  identity: {
    kind: 'actor',
    actor: 'hero',
    portrait: { kind: 'expression', expression: 'angry', side: 'left' },
  },
  slot: 'bottom',
  autoAdvance: 0,
  rows: [{ text: '你好', speed: 0 }],
})
const unboundCue = () => ({
  identity: { kind: 'unbound', portrait: { asset: 'portrait.hero', side: 'left' } },
  rows: [{ text: '旁白' }],
})

describe('E1 checkAuthorDialogueCue · 合法联合与非法半状态', () => {
  test('actor/unbound cue 合法；narration 合法；非法 kind 拒绝', () => {
    expect(() => checkAuthorDialogueCue(actorCue(), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(unboundCue(), 'c')).not.toThrow()
    expect(() =>
      checkAuthorDialogueCue({ identity: { kind: 'narration' }, rows: [{ text: 'n' }] }, 'c'),
    ).not.toThrow()
    expect(() =>
      checkAuthorDialogueCue({ identity: { kind: 'half' }, rows: [{ text: 'x' }] }, 'c'),
    ).toThrow('c.identity.kind: 期望 narration|actor|unbound')
  })
  test.each([
    [
      '缺 portrait.side',
      {
        identity: { kind: 'actor', actor: 'h', portrait: { kind: 'default' } },
        rows: [{ text: 'x' }],
      },
      /side/,
    ],
    [
      '非法 side 值',
      {
        identity: { kind: 'actor', actor: 'h', portrait: { kind: 'default', side: 'center' } },
        rows: [{ text: 'x' }],
      },
      /side/,
    ],
  ])('%s 拒绝', (_name, cue, pattern) => {
    expect(() => checkAuthorDialogueCue(cue, 'c')).toThrow(pattern)
  })
})

describe('E2 resolveAuthorDialogueCue · 完整值与输入归属', () => {
  const actors = (): ActorDef[] => [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'sprite.hero',
      portraits: { default: 'p.default', expressions: { angry: 'p.angry', calm: 'p.calm' } },
    },
  ]
  test('合法 actor+expression 解析全部字段；cue 与实际传入的 actor 表都不被修改', () => {
    const cue = actorCue()
    const cueBefore = deepSnapshot(cue)
    // 快照真正传入 resolver 的 actor 表（同一对象），不是另一次 factory 调用
    const actorTable = Object.fromEntries(actors().map((a) => [a.id, a]))
    const actorsBefore = deepSnapshot(actorTable)
    const resolved = resolveAuthorDialogueCue(cue, actorTable)
    expect(resolved).toEqual({
      speaker: 'name.hero',
      portrait: { asset: 'p.angry', side: 'left' },
      slot: 'bottom',
      autoAdvance: 0,
      rows: [{ text: '你好', speed: 0 }],
    })
    expect(resolved.rows).not.toBe(cue.rows)
    expect(resolved.rows[0]).not.toBe(cue.rows[0])
    expect(cue).toEqual(cueBefore)
    expect(actorTable).toEqual(actorsBefore)
  })
})
