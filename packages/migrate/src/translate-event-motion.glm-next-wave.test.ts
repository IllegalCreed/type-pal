/** TEST-GLM-NEW-J-1 J03：translate-event-motion 其余公开臂。
 * 旧证：translate-event-motion.test.ts 已盖 0x0b/0x0e、0x10/0x11/0x7c/0x82、0x7b、
 * 0x75、0xa1、0x44、0x6e 带层、0x7d/0x6c 属主解析、0x4c 浮动、0x09 未处理。
 * 本文件钉剩余臂：0x0c/0x0d 方向、0x70/0x7a 速度、0x3f/0x97 骑乘速度、
 * walkTo/骑乘/animate/moveObject/walkOneStep 五类无属主 gap、0x6e 无层形状、
 * 0x4c 非浮动形状、空操作数缺省投影。纯函数，单点断言不与旧证重叠。
 */
import { describe, expect, test } from 'vitest'
import { translatePalMotionOpcode } from './translate-event-motion.js'

const translate = (opcode: number, operands: number[] = [], owner = 'e5') =>
  translatePalMotionOpcode({ opcode, operands, owner })

describe('PAL motion opcode translation：剩余公开臂', () => {
  test('0x0c/0x0d 单步映射 left/up，方向表 0x0b 起顺时针序', () => {
    expect(translate(0x0c)).toEqual({
      handled: true,
      commands: [{ kind: 'stepEntity', entity: 'e5', dir: 'left' }],
    })
    expect(translate(0x0d)).toEqual({
      handled: true,
      commands: [{ kind: 'stepEntity', entity: 'e5', dir: 'up' }],
    })
  })

  test('0x70/0x7a 队伍走位补齐 slow/fast 两档', () => {
    expect(translate(0x70, [1, 2, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'moveParty', to: { col: 4, row: 1, height: 0 }, speed: 'slow' }],
    })
    expect(translate(0x7a, [1, 2, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'moveParty', to: { col: 4, row: 1, height: 0 }, speed: 'fast' }],
    })
  })

  test('0x3f/0x97 骑乘补齐 slow/run 两档，目的地投影与旧证同构', () => {
    expect(translate(0x3f, [1, 2, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'ride', entity: 'e5', to: { col: 4, row: 1, height: 0 }, speed: 'slow' }],
    })
    expect(translate(0x97, [1, 2, 1])).toEqual({
      handled: true,
      commands: [{ kind: 'ride', entity: 'e5', to: { col: 4, row: 1, height: 0 }, speed: 'run' }],
    })
  })

  test('walkTo 族无属主：四档同 gap，不凭空指定实体', () => {
    for (const opcode of [0x10, 0x11, 0x7c, 0x82])
      expect(translatePalMotionOpcode({ opcode, operands: [1, 2, 1], owner: undefined })).toEqual({
        handled: true,
        commands: [],
        gap: 'walkTo 无属主',
      })
  })

  test('骑乘/动画/对象位移无属主：各记具名 gap', () => {
    expect(
      translatePalMotionOpcode({ opcode: 0x44, operands: [1, 2, 1], owner: undefined }),
    ).toEqual({ handled: true, commands: [], gap: '骑乘无属主' })
    expect(translatePalMotionOpcode({ opcode: 0x97, operands: [], owner: undefined })).toEqual({
      handled: true,
      commands: [],
      gap: '骑乘无属主',
    })
    expect(translatePalMotionOpcode({ opcode: 0x87, operands: [], owner: undefined })).toEqual({
      handled: true,
      commands: [],
      gap: 'animate 无属主',
    })
    expect(
      translatePalMotionOpcode({ opcode: 0x7d, operands: [0, 1, 1], owner: undefined }),
    ).toEqual({ handled: true, commands: [], gap: 'moveObject 无属主' })
    expect(
      translatePalMotionOpcode({ opcode: 0x6c, operands: [0xffff], owner: undefined }),
    ).toEqual({ handled: true, commands: [], gap: 'walkOneStep 无属主' })
  })

  test('0x87 有属主 → 动画命令作用于属主本体', () => {
    expect(translate(0x87)).toEqual({
      handled: true,
      commands: [{ kind: 'animEntity', entity: 'e5' }],
    })
  })

  test('0x6e 无第三操作数时不产出 layer 键（toEqual 精确形状）', () => {
    expect(translate(0x6e, [3, 4])).toEqual({
      handled: true,
      commands: [{ kind: 'nudgeParty', dx: 3, dy: 4 }],
    })
  })

  test('0x4c 零层操作数时不产出 floating 键', () => {
    expect(translate(0x4c, [0, 0])).toEqual({
      handled: true,
      commands: [{ kind: 'chasePlayer', range: 8, speed: 4 }],
      terminal: 'end',
    })
  })

  test('walkTo 空操作数：目的地缺省投影到原点格', () => {
    expect(translate(0x10, [])).toEqual({
      handled: true,
      commands: [
        { kind: 'moveEntity', entity: 'e5', to: { col: 0, row: 0, height: 0 }, speed: 'normal' },
      ],
    })
  })
})
