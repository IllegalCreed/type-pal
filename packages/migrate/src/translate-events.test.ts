/**
 * 开场三 op 翻译回归(2026-07-03 用户实测:李逍遥动作没出来/李大娘没走出场景)。
 * 真值锚:sdlpal script.c 0x0015(dir+gesture)/ 0x0065(setPlayerSprite)/ 0x0073(fadeToScene)。
 */
import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from './source-facts.js'
import { emptyTranslateReport, translateStages } from './translate-events.js'
import type { TranslateCtx } from './translate-events.js'

/** 手搓链 → labelAt(单段,L_1 起步,end 收尾;raw 命令补 op:'raw' 判别)。 */
function ctxOf(cmds: SourceCmd[], spriteIdForNum?: (num: number) => string): TranslateCtx {
  const raws = cmds.map((c) => ({ op: 'raw', ...c }))
  const chain: SourceCmd[] = [{ ...raws[0]!, label: 'L_1' }, ...raws.slice(1), { op: 'end' }]
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  chain.forEach((c, i) => {
    if (c.label) labelAt.set(c.label, { cmds: chain, idx: i })
  })
  return { labelAt, locale: {}, report: emptyTranslateReport(), ...(spriteIdForNum ? { spriteIdForNum } : {}) }
}

function bodyOf(ctx: TranslateCtx): Command[] {
  const stages = translateStages('L_1', 'e0', ctx)
  expect(stages?.length).toBeGreaterThan(0)
  return stages![0]!.body
}

describe('0x15 队员方向+姿势(script.c: wFrame = dir*3 + gesture)', () => {
  test('gesture>0 → setPartyFacing 带 gesture(开场练武 [0,9,0])', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [0, 9, 0] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'down', gesture: 9 }])
  })
  test('gesture=0 → 纯朝向(站立帧;不带 gesture 字段 = 运行时清姿势)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [3, 0, 0] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'right' }])
  })
  test('member>0 → 带 member(跟随者姿势;渲染落地前先保数据)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [1, 2, 1] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'left', gesture: 2, member: 1 }])
  })
})

describe('0x65 换角色大世界精灵(script.c: rgwSpriteNum[role]=sprite)', () => {
  test('role 0 + 精灵 627 → setActorSprite(li-xiaoyao, 由注册回调定 id)', () => {
    const ids: Record<number, string> = { 627: 'npc-627', 2: 'li-xiaoyao' }
    const body = bodyOf(ctxOf([{ opcode: 0x65, operands: [0, 627, 0xffff] }], (n) => ids[n] ?? `npc-${n}`))
    expect(body).toEqual([{ kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'npc-627' }])
  })
  test('切回本体精灵 2 → 映射到 actor 自己的精灵 id', () => {
    const ids: Record<number, string> = { 2: 'li-xiaoyao' }
    const body = bodyOf(ctxOf([{ opcode: 0x65, operands: [0, 2, 0xffff] }], (n) => ids[n] ?? `npc-${n}`))
    expect(body).toEqual([{ kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'li-xiaoyao' }])
  })
  test('无注册回调 → unmigrated(不猜 id)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x65, operands: [0, 627, 0xffff] }]))
    expect(body[0]!.kind).toBe('unmigrated')
  })
})

describe('0x73 淡入场景(script.c: PAL_MakeScene + VIDEO_FadeScreen)', () => {
  test('→ fade in(时长 = operand[0] 换算,非零)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x73, operands: [2, 0, 0] }]))
    expect(body).toHaveLength(1)
    const f = body[0]! as Extract<Command, { kind: 'fade' }>
    expect(f.kind).toBe('fade')
    expect(f.dir).toBe('in')
    expect(f.ms).toBeGreaterThan(0)
  })
})
