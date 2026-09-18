/**
 * TEST-CONTENT-CONTRACTS-1 E1/E2：author-dialogue 身份/cue/resolver（author-dialogue.ts:93-202）。
 * narration/actor/unbound 合法联合与非法半状态；portrait.side/rows 对象；resolver fail-loud 无 fallback。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
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
  rows: [{ text: '你好' }],
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
    ).toThrow()
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
    ['rows 字符串数组', { ...unboundCue(), rows: ['text'] }, /rows\[0\]: 期望对象/],
    ['rows 空数组', { ...unboundCue(), rows: [] }, /rows: 期望非空数组/],
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

describe('E2 resolveAuthorDialogueCue · fail-loud 无 fallback', () => {
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
    const actorTable = Object.fromEntries(actors().map((a) => [a.id, a])) as Parameters<
      typeof resolveAuthorDialogueCue
    >[1]
    const actorsBefore = deepSnapshot(actorTable)
    const resolved = resolveAuthorDialogueCue(cue, actorTable)
    expect(resolved.speaker).toBe('name.hero')
    expect(resolved.portrait).toEqual({ asset: 'p.angry', side: 'left' })
    expect(resolved.rows).toEqual([{ text: '你好' }])
    expect(cue).toEqual(cueBefore)
    expect(actorTable).toEqual(actorsBefore)
  })
  test('缺 Actor/缺主立绘/缺命名表情 fail-loud 不回退全局资源', () => {
    expect(() =>
      resolveAuthorDialogueCue(
        actorCue(),
        Object.fromEntries(
          actors()
            .filter((a) => a.id !== 'hero')
            .map((a) => [a.id, a]),
        ) as Parameters<typeof resolveAuthorDialogueCue>[1],
      ),
    ).toThrow()
    // 缺主立绘：改用 default portrait 的 cue 才会消费 portraits.default（expression cue 不需要）
    const noDefault = actors()
    ;(noDefault[0] as unknown as { portraits: Record<string, unknown> }).portraits = {
      expressions: { angry: 'p.angry' },
    }
    const defaultCue: AuthorDialogueCue = {
      identity: { kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'left' } },
      rows: [{ text: 'x' }],
    }
    expect(() =>
      resolveAuthorDialogueCue(
        defaultCue,
        Object.fromEntries(noDefault.map((a) => [a.id, a])) as Parameters<
          typeof resolveAuthorDialogueCue
        >[1],
      ),
    ).toThrow()
    const noAngry = actors()
    ;(noAngry[0] as unknown as { portraits: Record<string, unknown> }).portraits = {
      default: 'p.default',
      expressions: { calm: 'p.calm' },
    }
    expect(() =>
      resolveAuthorDialogueCue(
        actorCue(),
        Object.fromEntries(noAngry.map((a) => [a.id, a])) as Parameters<
          typeof resolveAuthorDialogueCue
        >[1],
      ),
    ).toThrow()
  })
})
