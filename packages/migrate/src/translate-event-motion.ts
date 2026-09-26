import type { Command } from '@type-pal/content'
import {
  FACING_BY_DIR,
  legacyEventObjectEntityId,
  partyPosToGrid,
  ROLE_SLUGS,
  signExtendI16,
} from './source-facts.js'

const SPEED: Record<number, 'slow' | 'normal' | 'fast' | 'run'> = {
  2: 'slow',
  3: 'normal',
  4: 'fast',
  8: 'run',
}

export type PalMotionOpcodeTranslation =
  | { handled: false }
  | {
      handled: true
      commands: Command[]
      terminal?: 'end'
      gap?: string
      knownNoOp?: '0xA1.globalTrail'
    }

function currentEntity(word: number, owner: string | undefined): string | undefined {
  return word === 0 || word === 0xffff ? owner : legacyEventObjectEntityId(word)
}

/**
 * PAL 大世界移动/队形 opcode 的纯内存映射。不处理 dialogue flush、报告、source audit 或 cursor。
 */
export function translatePalMotionOpcode(args: {
  opcode: number
  operands: readonly number[]
  owner: string | undefined
}): PalMotionOpcodeTranslation {
  const { opcode, operands: o, owner } = args

  if (opcode >= 0x0b && opcode <= 0x0e) {
    if (!owner) return { handled: true, commands: [], gap: '单步无属主' }
    return {
      handled: true,
      commands: [
        { kind: 'stepEntity', entity: owner, dir: FACING_BY_DIR[opcode - 0x0b] ?? 'down' },
      ],
    }
  }

  if (opcode === 0x10 || opcode === 0x11 || opcode === 0x7c || opcode === 0x82) {
    if (!owner) return { handled: true, commands: [], gap: 'walkTo 无属主' }
    const speedCode = opcode === 0x11 ? 2 : opcode === 0x10 ? 3 : opcode === 0x7c ? 4 : 8
    return {
      handled: true,
      commands: [
        {
          kind: 'moveEntity',
          entity: owner,
          to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
          speed: SPEED[speedCode]!,
        },
      ],
    }
  }

  if (opcode === 0x70 || opcode === 0x7a || opcode === 0x7b) {
    const speedCode = opcode === 0x70 ? 2 : opcode === 0x7a ? 4 : 8
    return {
      handled: true,
      commands: [
        {
          kind: 'moveParty',
          to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
          speed: SPEED[speedCode]!,
        },
      ],
    }
  }

  if (opcode === 0x75) {
    const members = o
      .filter((value): value is number => typeof value === 'number' && value > 0)
      .map((value) => ROLE_SLUGS[value - 1])
      .filter((member): member is (typeof ROLE_SLUGS)[number] => member !== undefined)
    return { handled: true, commands: [{ kind: 'setParty', members: [...members] }] }
  }

  if (opcode === 0xa1) {
    if (owner?.startsWith('global/'))
      return { handled: true, commands: [], knownNoOp: '0xA1.globalTrail' }
    if (!owner) return { handled: true, commands: [], gap: '聚拢无属主' }
    return { handled: true, commands: [{ kind: 'mountParty', entity: owner }] }
  }

  if (opcode === 0x3f || opcode === 0x44 || opcode === 0x97) {
    if (!owner) return { handled: true, commands: [], gap: '骑乘无属主' }
    const speedCode = opcode === 0x3f ? 2 : opcode === 0x44 ? 4 : 8
    return {
      handled: true,
      commands: [
        {
          kind: 'ride',
          entity: owner,
          to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
          speed: SPEED[speedCode]!,
        },
      ],
    }
  }

  if (opcode === 0x6e)
    return {
      handled: true,
      commands: [
        {
          kind: 'nudgeParty',
          dx: signExtendI16(o[0] ?? 0),
          dy: signExtendI16(o[1] ?? 0),
          ...(o[2] ? { layer: signExtendI16(o[2]) } : {}),
        },
      ],
    }

  if (opcode === 0x7d || opcode === 0x6c) {
    const entity = currentEntity(o[0] ?? 0, owner)
    if (!entity)
      return {
        handled: true,
        commands: [],
        gap: opcode === 0x7d ? 'moveObject 无属主' : 'walkOneStep 无属主',
      }
    const nudge: Command = {
      kind: 'nudgeEntity',
      entity,
      dx: signExtendI16(o[1] ?? 0),
      dy: signExtendI16(o[2] ?? 0),
    }
    return {
      handled: true,
      commands: opcode === 0x6c ? [nudge, { kind: 'animEntity', entity }] : [nudge],
    }
  }

  if (opcode === 0x87) {
    if (!owner) return { handled: true, commands: [], gap: 'animate 无属主' }
    return { handled: true, commands: [{ kind: 'animEntity', entity: owner }] }
  }

  if (opcode === 0x4c)
    return {
      handled: true,
      commands: [
        {
          kind: 'chasePlayer',
          range: (o[0] ?? 0) || 8,
          speed: (o[1] ?? 0) || 4,
          ...((o[2] ?? 0) !== 0 ? { floating: true } : {}),
        },
      ],
      terminal: 'end',
    }

  return { handled: false }
}
