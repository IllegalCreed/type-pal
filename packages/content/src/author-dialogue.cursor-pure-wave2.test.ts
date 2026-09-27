/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：slot/cursorFrame 随 resolve 复制，不参与身份。
 * 旧套件已证 default/expression 解析与空 unbound 拒绝，不重做。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, wave2Actor } from './__tests__/cursor-pure-wave2-fixtures.js'
import { checkAuthorDialogueCue, resolveAuthorDialogueCue } from './author-dialogue.js'

const actor = wave2Actor('actor.li', 'name.li')

describe('C1 author-dialogue 剩余合同', () => {
  test('resolve 复制 slot/cursorFrame，无立绘 actor 只出 speaker', () => {
    const cue = {
      identity: { kind: 'actor' as const, actor: actor.id },
      rows: [{ text: 'line.plain' }],
      slot: 'top' as const,
      cursorFrame: 2 as const,
    }
    const actors = { [actor.id]: actor }
    const cueSnap = inputSnap(cue)
    const actorsSnap = inputSnap(actors)
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
})
