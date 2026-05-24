import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  Command,
  RawCommand,
  GotoCommand,
  ShowDialogCommand,
  DialogBoxStyle,
  LoadSceneCommand,
  SetDialogStyleTopCommand,
  SetDialogStyleCenterCommand,
  SetDialogStyleBottomCommand,
  SetDialogStyleNarrationCommand,
} from './events.js'

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

describe('SetDialogStyle commands', () => {
  it('DialogBoxStyle 四个具名样式', () => {
    expectTypeOf<DialogBoxStyle>().toEqualTypeOf<
      'top' | 'center' | 'bottom' | 'narration'
    >()
  })

  it('SetDialogStyleTopCommand 字段', () => {
    const c: SetDialogStyleTopCommand = { op: 'setDialogStyleTop' }
    expectTypeOf(c.op).toEqualTypeOf<'setDialogStyleTop'>()
  })

  it('四个 setDialogStyle 都在 Command 联合', () => {
    const cs: Command[] = [
      { op: 'setDialogStyleTop' },
      { op: 'setDialogStyleCenter' },
      { op: 'setDialogStyleBottom' },
      { op: 'setDialogStyleNarration' },
    ]
    expect(cs).toHaveLength(4)
  })
})

describe('LoadSceneCommand(M3.5)', () => {
  it('LoadSceneCommand 字段类型', () => {
    const c: LoadSceneCommand = { op: 'loadScene', sceneId: 5 }
    expectTypeOf(c.op).toEqualTypeOf<'loadScene'>()
    expectTypeOf(c.sceneId).toEqualTypeOf<number>()
  })

  it('LoadSceneCommand 在 Command 联合中', () => {
    const cs: Command[] = [
      { op: 'loadScene', sceneId: 1 },
      { op: 'loadScene', sceneId: 12, _scene: '客栈', label: 'L_3' },
    ]
    expect(cs).toHaveLength(2)
    const first = cs[0] as LoadSceneCommand
    expect(first.sceneId).toBe(1)
  })
})
