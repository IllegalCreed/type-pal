/**
 * B2 c7 —— runScript 返回值 = sdlpal PAL_RunTriggerScript 的 wNextScriptEntry。
 *
 * sdlpal script.c:3171/3204-3237/3478:wNextScriptEntry 初始 = 传入 entry;
 *   0x00 Stop(plain end)→ 不改 → 返回**起始 entry**(每轮从头重跑 = 每轮重显);
 *   0x01(advance)→ 该行 +1(指针前移 = show-once);
 *   0x02(reset)→ operand[0]=resetTo(re-arm 到指定 entry)。
 * 敌 turnStart/ready 调用方据此回写 wScriptOnTurnStart/Ready(fight.c:1186/1226/1689/1719)实现真 show-once。
 *
 * 这里用 explore 模式(无 battleCtx)单测纯返回值契约:脚本只含 end / 可跳过的 raw,跑完同步返回。
 */
import type { Command } from '@type-pal/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCommandBus } from '../../command-bus.js'
import { runScript } from '../../event-system.js'

// explore 模式下 raw opcode 会 console.debug skip —— 静音保持输出 pristine。
beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// 占位 raw(explore 模式 → D26 skip + ip++);用于在 end 前制造位移,证明返回的是"起始 entry"而非"end 位置"。
const NOOP: Command = { op: 'raw', opcode: 0x9F, operands: [0, 0, 0] }

function run(commands: Command[], ip: number): number {
  return runScript({ commands, ip, bus: createCommandBus(), runtimeMode: 'explore' })
}

describe('B2 c7 runScript 返回 wNextScriptEntry', () => {
  it('0x00 plain end → 返回起始 entry(opts.ip),即便 end 在后面(每轮重显)', () => {
    // ip=0 起跑,end 在 ip=1;返回应为起始 0(不是 end 的位置 1)。
    expect(run([NOOP, { op: 'end' }], 0)).toBe(0)
    // end 即起点时同样返回起点。
    expect(run([{ op: 'end' }], 0)).toBe(0)
  })

  it('0x01 advance end → 返回该 end 行 +1(show-once)', () => {
    // end-advance 在 ip=1 → 返回 2(跳过本段)。
    expect(run([NOOP, { op: 'end', advance: true }], 0)).toBe(2)
    // end-advance 在 ip=0 → 返回 1。
    expect(run([{ op: 'end', advance: true }], 0)).toBe(1)
  })

  it('0x02 reset end → 返回 resetTo 标签解析出的 entry(re-arm 指定)', () => {
    // end-reset resetTo=7 → labelMap['L_7'] = 2(带 L_7 标签的命令下标)。
    const commands: Command[] = [
      { op: 'end', reset: true, resetTo: 7 },
      NOOP,
      { op: 'end', label: 'L_7' },
    ]
    expect(run(commands, 0)).toBe(2)
  })

  it('0x02 reset 但 resetTo 标签缺失 → 退回起始 entry(不误禁)', () => {
    expect(run([{ op: 'end', reset: true, resetTo: 999 }], 0)).toBe(0)
  })

  it('ip 越界(脚本未达 end opcode)→ 返回起始 entry(保持 armed,不误禁)', () => {
    // 只有一条可跳过 raw,跑完 ip→1 越界 → 返回 opts.ip=0。
    expect(run([NOOP], 0)).toBe(0)
  })
})
