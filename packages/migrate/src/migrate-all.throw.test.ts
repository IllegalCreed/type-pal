import { describe, expect, it } from 'vitest'
import { assemble, chain, sources, thrown } from './__tests__/migration-assembly-fixtures.js'
import { magic, raw } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly throw', () => {
  it('actual OBJECT to MAGIC lookup preserves signed offsets, sound and layer in presentation', () => {
    const output = assemble(
      sources({
        items: [thrown()],
        objectMagics: [{ id: 9, magicNumber: 2 }],
        magic: [
          magic({ id: 1, effect: 99 }),
          magic({ id: 2, baseDamage: 65535, special: 65534, xOffset: 65530, sound: 3 }),
        ],
        commands: chain(raw(0x42, [9]), raw(0x28, [0, 552])),
      }),
    )
    expect(output.items[0]?.throw).toEqual({
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
      presentation: {
        kind: 'magic',
        animation: {
          effectSprite: 7,
          placement: 'normal',
          xOffset: -6,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
          wave: 0,
          sound: 'sound.pal.003',
          layerOffset: -2,
        },
      },
    })
    expect(output.report.pendingThrow).toEqual([])
    // Current buildPalMigration applies the target overlay after this raw aggregation boundary.
    expect(output.items[0]?.throw).not.toHaveProperty('target')
  })

  it('zero layer stays absent and presentation-only is retained without inventing gameplay effects', () => {
    const output = assemble(
      sources({
        items: [thrown()],
        objectMagics: [{ id: 9, magicNumber: 1 }],
        magic: [magic({ baseDamage: 65535 })],
        commands: chain(raw(0x42, [9])),
      }),
    )
    expect(output.items[0]?.throw?.effects).toEqual([])
    expect(output.items[0]?.throw?.presentation?.animation).not.toHaveProperty('layerOffset')
    expect(output.items[0]?.throw?.presentation?.kind).toBe('magic')
    expect(output.report.pendingThrow).toEqual([])
  })

  it.each([
    'no-objects',
    'missing-object',
    'missing-magic',
    'damage',
    'element',
    'summon',
  ] as const)('unproved presentation %s leaves gameplay intact and no fabricated animation', (kind) => {
    const input = sources({
      items: [thrown()],
      objectMagics: [{ id: 9, magicNumber: 1 }],
      magic: [magic({ baseDamage: 65535 })],
      commands: chain(raw(0x42, [9]), raw(0x28, [0, 552])),
    })
    if (kind === 'no-objects') delete input.objectMagics
    if (kind === 'missing-object') input.objectMagics = []
    if (kind === 'missing-magic') input.magic = []
    if (kind === 'damage') input.magic[0]!.baseDamage = 0
    if (kind === 'element') input.magic[0]!.elemental = 1
    if (kind === 'summon') input.magic[0]!.type = 'summon'
    const output = assemble(input)
    expect(output.items[0]?.throw).toEqual({ effects: [{ kind: 'applyPoison', poisonId: '552' }] })
    expect(output.report.pendingThrow).toEqual([])
  })

  it('presentation-only unproved input has neither a throw block nor a guessed diagnostic', () => {
    const output = assemble(sources({ items: [thrown()], commands: chain(raw(0x42, [9])) }))
    expect(output.items[0]).not.toHaveProperty('throw')
    expect(output.report.pendingThrow).toEqual([])
  })

  it('conflicting sounds discard the complete throw block and record exact item ownership', () => {
    const output = assemble(
      sources({
        items: [thrown({ _name: '冲突投掷' })],
        commands: chain(raw(0x28, [0, 552]), raw(0x47, [2]), raw(0x47, [3])),
      }),
    )
    expect(output.items[0]).not.toHaveProperty('throw')
    expect(output.report.pendingThrow).toEqual([
      { itemId: 20, name: '冲突投掷', reason: '多个不同 0x47 音效(sound.pal.002,sound.pal.003)' },
    ])
  })

  it('throw flag and zero root suppress processing while sound-only remains an explicit throw', () => {
    const disabled = thrown()
    disabled.flags.throwable = false
    const output = assemble(
      sources({
        items: [disabled, thrown({ id: 21, scriptOnThrow: 0 }), thrown({ id: 22 })],
        commands: chain(raw(0x47, [2])),
      }),
    )
    expect(output.items.map((entry) => entry.throw)).toEqual([
      undefined,
      undefined,
      { effects: [], sound: 'sound.pal.002' },
    ])
    expect(output.report.pendingThrow).toEqual([])
  })
})
