import { expect } from 'vitest'
import type { SourceCmd } from '../source-facts.js'
import {
  emptyTranslateReport,
  ScriptRegistry,
  type TranslateCtx,
  translateStages,
} from '../translate-events.js'
import { unchanged } from './pure-migration-fixtures.js'

export { raw } from './pure-migration-fixtures.js'
export type Instruction = SourceCmd & {
  sceneId?: number
  to?: string
  frameDelay?: number
  advance?: boolean
  reset?: boolean
  resetTo?: number
  idleFrames?: number
  itemId?: number
  count?: number
}

/** Decoded source instructions, not canonical content. The current producer uses a registry. */
export function translation(input: Instruction[], overrides: Partial<TranslateCtx> = {}) {
  const source: Instruction[] = input.map((command, index) => ({
    ...command,
    ...(index === 0 ? { label: 'L_100' } : {}),
  }))
  source.push({ op: 'end' })
  const labelAt: TranslateCtx['labelAt'] = new Map()
  for (const [idx, command] of source.entries()) {
    if (command.label) labelAt.set(command.label, { cmds: source, idx })
  }
  const registry = new ScriptRegistry(() => 's001')
  const ctx: TranslateCtx = {
    labelAt,
    locale: {},
    report: emptyTranslateReport(),
    palSemanticProfile: 'current-r13-6b',
    palReferenceSchema: 'stable-id',
    registry,
    ...overrides,
  }
  return {
    source,
    ctx,
    run(owner: string | undefined) {
      const stages = unchanged(source, () => translateStages('L_100', owner, ctx))
      expect(stages).toBeDefined()
      return stages!
    },
  }
}

export function body(
  input: Instruction[],
  owner: string | undefined = 'e3',
  overrides: Partial<TranslateCtx> = {},
) {
  const fixture = translation(input, overrides)
  const stages = fixture.run(owner)
  expect(stages).toHaveLength(1)
  expect(fixture.ctx.report.gaps).toEqual([])
  return stages[0]!.body
}
