import { describe, expect, test } from 'vitest'
import { upgradeLegacyDialogues } from './dialogue-upgrade.js'
import { checkCommands } from './script.js'

describe('upgradeLegacyDialogues', () => {
  test('旧 line 在边界单向升级为 cue + 单 row，并保留软换行', () => {
    const result = upgradeLegacyDialogues([
      {
        kind: 'dialog',
        line: {
          speaker: 'spk.li',
          text: '第一行\n第二行',
          speed: 16,
          autoAdvance: 300,
          slot: 'top',
          portrait: { icon: 1, side: 'left' },
          cursorFrame: 2,
        },
      },
    ])

    expect(result.upgraded).toBe(1)
    expect(result.value).toEqual([
      {
        kind: 'dialog',
        cue: {
          speaker: 'spk.li',
          rows: [{ text: '第一行\n第二行', speed: 16 }],
          autoAdvance: 300,
          slot: 'top',
          portrait: { icon: 1, side: 'left' },
          cursorFrame: 2,
        },
      },
    ])
    expect(() => checkCommands(result.value, 'test')).not.toThrow()
  })

  test('canonical cue 原样通过，line/cue 并存 fail-loud', () => {
    const canonical = [{ kind: 'dialog', cue: { rows: [{ text: 'ok' }] } }]
    expect(upgradeLegacyDialogues(canonical)).toEqual({ value: canonical, upgraded: 0 })
    expect(() =>
      upgradeLegacyDialogues([{ kind: 'dialog', line: { text: 'old' }, cue: { rows: [] } }]),
    ).toThrow(/同时含 line 与 cue/)
  })

  test('旧 Dialogue.lines 容器升级为 cues，字段归入 cue/row', () => {
    expect(
      upgradeLegacyDialogues({
        id: 'ghost',
        lines: [
          {
            speaker: 'spk.ghost',
            text: 'dlg.ghost',
            speed: 48,
            autoAdvance: 800,
            slot: 'top',
            portrait: { icon: 2, side: 'left' },
            cursorFrame: 1,
          },
        ],
      }),
    ).toEqual({
      upgraded: 1,
      value: {
        id: 'ghost',
        cues: [
          {
            speaker: 'spk.ghost',
            rows: [{ text: 'dlg.ghost', speed: 48 }],
            autoAdvance: 800,
            slot: 'top',
            portrait: { icon: 2, side: 'left' },
            cursorFrame: 1,
          },
        ],
      },
    })
    expect(() => upgradeLegacyDialogues({ id: 'bad', lines: [], cues: [] })).toThrow(
      /同时含 lines 与 cues/,
    )
  })
})
