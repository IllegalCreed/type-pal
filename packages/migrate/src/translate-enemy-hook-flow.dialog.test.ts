import { describe, expect, test } from 'vitest'
import { dialog, end, go, hookFixture } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook dialogue boundaries', () => {
  test('speaker and controls produce canonical cues with exact locale and source mapping', () => {
    const f = hookFixture({
      100: [dialog('敌人：'), dialog('$07-警告-)~07', 9), dialog('后文', 10), end()],
    })
    const result = f.run()
    expect(result.hooks?.ready?.states.initial?.body).toEqual([
      {
        kind: 'dialog',
        cue: {
          rows: [{ text: 'dlg.9', speed: 80 }],
          speaker: 'spk.敌人',
          autoAdvance: 80,
          cursorFrame: 1,
        },
      },
      { kind: 'dialog', cue: { rows: [{ text: 'dlg.10', speed: 80 }] } },
    ])
    expect(f.ctx.locale).toEqual({
      'spk.敌人': '敌人',
      'dlg.9': '<cyan>警告</cyan>',
      'dlg.10': '后文',
    })
    expect(result.hookSources?.ready?.sourceMappings).toEqual([
      ...[100, 101, 102].map((sourceAddress) => ({
        sourceAddress,
        disposition: 'translated',
        targetSelectors: ['states.initial'],
      })),
      { sourceAddress: 103, disposition: 'translated', targetSelectors: ['states.initial.next'] },
    ])
  })

  test('unindexed text stays inline and style-only instructions remain equivalent', () => {
    const f = hookFixture({ 100: [{ op: 'setDialogStyleCenter' }, dialog('正文('), end()] })
    const result = f.run()
    expect(result.hooks?.ready?.states.initial?.body).toEqual([
      { kind: 'dialog', cue: { rows: [{ text: '正文' }], cursorFrame: 2 } },
    ])
    expect(f.ctx.locale).toEqual({})
    expect(result.hookSources?.ready?.sourceMappings[0]).toEqual({
      sourceAddress: 100,
      disposition: 'equivalent',
      targetSelectors: ['states.initial'],
    })
  })

  test('colour state produces a separate locale variant without overwriting the baseline line', () => {
    const f = hookFixture({
      100: [dialog('-前', 1), dialog('同文', 2), dialog('-'), dialog('同文', 2), end()],
    })
    const body = f.ready().states.initial!.body
    const row = body[1]
    expect(row?.kind).toBe('dialog')
    if (row?.kind !== 'dialog') throw new Error('missing dialogue')
    const variant = row.cue.rows[0]!.text
    expect(variant).toMatch(/^dlg\.2\.v-[0-9a-f]{8}$/)
    expect(f.ctx.locale[variant]).toBe('<cyan>同文</cyan>')
    expect(f.ctx.locale['dlg.2']).toBe('同文')
    expect(body[3]).toEqual({ kind: 'dialog', cue: { rows: [{ text: 'dlg.2' }] } })
  })

  test('each activation block starts with default speed and colour', () => {
    const f = hookFixture({
      100: [dialog('$07-前'), end({ advance: true }), dialog('后', 2), end()],
    })
    const result = f.ready()
    expect(result.states.initial?.body).toEqual([
      { kind: 'dialog', cue: { rows: [{ text: '<cyan>前</cyan>', speed: 80 }] } },
    ])
    expect(result.states['state-L_102']?.body).toEqual([
      { kind: 'dialog', cue: { rows: [{ text: 'dlg.2' }] } },
    ])
    expect(f.ctx.locale).toEqual({ 'dlg.2': '后' })
  })

  test('speaker cannot be silently discarded at a control boundary', () => {
    const bad = hookFixture({ 100: [dialog('敌人：'), go(200)], 200: [end()] })
    expect(() => bad.run()).toThrow(
      'enemy-boundary「边界敌人」 ready L_101: 说话人「敌人」后遇控制边，缺正文',
    )
    expect(
      hookFixture({ 100: [dialog('敌人：'), dialog('正文'), go(200)], 200: [end()] }).ready().states
        .initial?.body,
    ).toEqual([{ kind: 'dialog', cue: { rows: [{ text: '正文' }], speaker: 'spk.敌人' } }])
  })

  test('locale collision rejects without replacing existing text', () => {
    const f = hookFixture({ 100: [dialog('新文', 9), end()] }, { locale: { 'dlg.9': '原文' } })
    expect(() => f.run()).toThrow('对话 locale id 冲突 dlg.9: "原文" / "新文"')
    expect(f.ctx.locale).toEqual({ 'dlg.9': '原文' })
  })
})
