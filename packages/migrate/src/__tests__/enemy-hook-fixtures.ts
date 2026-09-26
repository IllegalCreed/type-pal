import { expect } from 'vitest'
import { translateEnemyScripts } from '../translate-enemy-scripts.js'
import { emptyTranslateReport, type TranslateCtx } from '../translate-events.js'
import type { Instruction } from './translation-fixtures.js'

export type HookInstruction = Instruction & { messageIndex?: number }
export const raw = (opcode: number, ...operands: number[]): HookInstruction => ({
  op: 'raw',
  opcode,
  operands,
})
export const end = (
  options: Pick<HookInstruction, 'advance' | 'reset' | 'resetTo'> = {},
): HookInstruction => ({ op: 'end', ...options })
export const go = (address: number): HookInstruction => ({ op: 'goto', to: `L_${address}` })
export const dialog = (text: string, messageIndex?: number): HookInstruction => ({
  op: 'showDialog',
  text,
  ...(messageIndex === undefined ? {} : { messageIndex }),
})
export const owner = { id: 'enemy-boundary', name: '边界敌人' }

/** Decoded source, not a fabricated canonical enemy; output passes the production wrapper guard. */
export function hookFixture(
  chains: Record<number, HookInstruction[]>,
  overrides: Partial<TranslateCtx> = {},
) {
  const source = Object.entries(chains).map(([address, commands]) =>
    commands.map((command, index) => ({
      ...command,
      ...(index === 0 ? { label: `L_${address}` } : {}),
    })),
  )
  const labelAt: TranslateCtx['labelAt'] = new Map()
  const addresses = new Map<readonly HookInstruction[], number[]>()
  for (const [chain, commands] of source.entries()) {
    const start = Number(Object.keys(chains)[chain])
    addresses.set(
      commands,
      commands.map((_, idx) => start + idx),
    )
    for (const [idx, command] of commands.entries()) {
      labelAt.set(`L_${start + idx}`, { cmds: commands, idx })
      if (command.label) labelAt.set(command.label, { cmds: commands, idx })
    }
  }
  const ctx: TranslateCtx = {
    labelAt,
    sourceAddressAt: (commands, idx) => addresses.get(commands)?.[idx],
    locale: {},
    report: emptyTranslateReport(),
    palSemanticProfile: 'current-r13-6b',
    palReferenceSchema: 'stable-id',
    ...overrides,
  }
  function run(
    hooks: Parameters<typeof translateEnemyScripts>[1] = { ready: 100 },
    cast?: Parameters<typeof translateEnemyScripts>[2],
    who: Parameters<typeof translateEnemyScripts>[3] = owner,
  ) {
    const before = structuredClone({ source, hooks, cast, who })
    try {
      return translateEnemyScripts(ctx, hooks, cast, who)
    } finally {
      expect({ source, hooks, cast, who }).toEqual(before)
    }
  }
  return { source, ctx, run, ready: () => run().hooks!.ready! }
}
