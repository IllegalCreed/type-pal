/**
 * TEST-CONTENT-CONTRACTS-1 E3/E4/E5：actor-reference 双 walker 与肖像引用（actor-reference.ts:144-292）。
 * 整树递归 vs canonical 单命令叶不互当替身；setParty 全成员；肖像引用 actor/unbound 区分。
 */
import { describe, expect, test } from 'vitest'
import {
  actorTaggedReferencesAtNode,
  collectActorTaggedReferences,
  collectCanonicalActorTaggedReferences,
  collectDialoguePortraitReferences,
} from './actor-reference.js'

describe('E3 actorTaggedReferencesAtNode · 各 tag 完整 kind/actorId/where', () => {
  test('inParty/setActorSprite/dialog 各输出精确三元组', () => {
    expect(actorTaggedReferencesAtNode({ kind: 'inParty', actorId: 'hero' }, 'x')).toEqual([
      { actorId: 'hero', kind: 'condition-in-party', where: 'x.actorId' },
    ])
    expect(actorTaggedReferencesAtNode({ kind: 'setActorSprite', actor: 'hero' }, 'y')).toEqual([
      { actorId: 'hero', kind: 'command-set-actor-sprite', where: 'y.actor' },
    ])
    expect(
      actorTaggedReferencesAtNode(
        {
          kind: 'dialog',
          cue: {
            identity: { kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'left' } },
            rows: [{ text: 'hi' }],
          },
        },
        'z',
      ),
    ).toEqual([{ actorId: 'hero', kind: 'dialogue-actor', where: 'z.cue.identity.actor' }])
  })
  test('setParty 逐成员（含索引 where）；空串/非字符串成员不产出', () => {
    const refs = actorTaggedReferencesAtNode({ kind: 'setParty', members: ['a', '', 'b', 3] }, 'sp')
    expect(refs).toEqual([
      { actorId: 'a', kind: 'command-set-party-member', where: 'sp.members[0]' },
      { actorId: 'b', kind: 'command-set-party-member', where: 'sp.members[2]' },
    ])
  })
  test('非对象/数组/空 kind 返回空数组；不误收普通字符串字段', () => {
    expect(actorTaggedReferencesAtNode('string', 'x')).toEqual([])
    expect(actorTaggedReferencesAtNode([1], 'x')).toEqual([])
    expect(
      actorTaggedReferencesAtNode({ kind: 'setFlag', flag: 'hero', value: true }, 'x'),
    ).toEqual([])
  })
})

describe('E4 整树递归 vs canonical 单叶 · 不互当替身', () => {
  const tree = {
    kind: 'branch',
    cond: { kind: 'inParty', actorId: 'outer' },
    then: [{ kind: 'setActorSprite', actor: 'inner' }],
  }
  test('collectActorTaggedReferences 整树递归命中两处（含嵌套 then 臂）', () => {
    const refs = collectActorTaggedReferences(tree, 'root')
    expect(refs.map((r) => [r.actorId, r.where])).toEqual([
      ['outer', 'root.cond.actorId'],
      ['inner', 'root.then[0].actor'],
    ])
  })
  test('collectCanonicalActorTaggedReferences 只取单命令叶+cond，不递归嵌套臂', () => {
    const refs = collectCanonicalActorTaggedReferences(tree, 'cmd')
    // branch 的 cond 被访问（条件树），但 then 臂内的 setActorSprite 不递归
    expect(refs.map((r) => r.actorId)).toEqual(['outer'])
    const leaf = { kind: 'setActorSprite', actor: 'leaf' }
    expect(collectCanonicalActorTaggedReferences(leaf, 'cmd')).toEqual([
      { actorId: 'leaf', kind: 'command-set-actor-sprite', where: 'cmd.actor' },
    ])
  })
})

describe('E5 collectDialoguePortraitReferences · actor/unbound 区分与其它角色不误收', () => {
  const heroCue = (expression: string) => ({
    kind: 'dialog',
    cue: {
      identity: {
        kind: 'actor',
        actor: 'hero',
        portrait: { kind: 'expression', expression, side: 'left' },
      },
      slot: 'bottom',
      rows: [{ text: 'hi' }],
    },
  })
  test('actor 默认/表情引用与 unbound 全局 asset 各自产出；其它角色不误收', () => {
    const other = heroCue('calm')
    ;(other.cue.identity as { actor: string }).actor = 'other'
    const tree = {
      a: heroCue('angry'),
      b: {
        kind: 'dialog',
        cue: {
          identity: { kind: 'unbound', portrait: { asset: 'portrait.hero', side: 'right' } },
          rows: [{ text: 'n' }],
        },
      },
      c: other,
    }
    const refs = collectDialoguePortraitReferences(tree, 'root')
    const summary = refs
      .map((r) => `${r.actorId}:${r.portraitKind}${r.expression ? `:${r.expression}` : ''}`)
      .sort()
    expect(summary).toEqual(['hero:expression:angry', 'other:expression:calm'])
    // unbound cue 不产 actor 引用（identity.kind !== 'actor'）
    expect(refs.every((r) => r.actorId !== undefined)).toBe(true)
  })
})
