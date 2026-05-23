import { describe, it, expectTypeOf } from 'vitest'
import type { Command, RawCommand, GotoCommand, ShowDialogCommand } from './events.js'

describe('Command 联合类型', () => {
  it('RawCommand 有 op: "raw" + opcode + operands', () => {
    expectTypeOf<RawCommand>().toMatchTypeOf<{
      op: 'raw'
      opcode: number
      operands: [number, number, number]
    }>()
  })

  it('GotoCommand 有 op: "goto" + to', () => {
    expectTypeOf<GotoCommand>().toMatchTypeOf<{ op: 'goto'; to: string }>()
  })

  it('ShowDialogCommand 有 op: "showDialog" + text', () => {
    expectTypeOf<ShowDialogCommand>().toMatchTypeOf<{ op: 'showDialog'; text: string }>()
  })

  it('Command 是联合', () => {
    const c: Command = { op: 'raw', opcode: 0, operands: [0, 0, 0] }
    expectTypeOf(c).toMatchTypeOf<Command>()
  })
})
