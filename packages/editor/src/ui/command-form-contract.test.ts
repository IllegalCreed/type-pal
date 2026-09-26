import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AUTHOR_CUSTOM_COMMAND_KINDS,
  createAuthorCommandFormBridge,
} from './command-form-contract.js'

describe('author command form bridge', () => {
  test('keeps canonical-only command kinds in CanonicalCommandForm', () => {
    const branch = {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'opened', is: true },
      then: [],
    } satisfies AuthorCommand

    expect(AUTHOR_CUSTOM_COMMAND_KINDS).toContain('branch')
    expect(createAuthorCommandFormBridge(branch)).toBeUndefined()
  })

  test('admits a shared leaf without copying its draft', () => {
    const command = { kind: 'wait', ms: 80 } satisfies AuthorCommand
    const bridge = createAuthorCommandFormBridge(command)

    expect(bridge?.command).toBe(command)
    expect(bridge?.commit({ kind: 'wait', ms: 120 })).toEqual({ kind: 'wait', ms: 120 })
  })

  test('rejects command-kind drift at the author boundary', () => {
    const bridge = createAuthorCommandFormBridge({ kind: 'wait', ms: 80 })

    expect(() => bridge?.commit({ kind: 'clearDialog' })).toThrow(
      'CommandForm changed command kind: wait -> clearDialog',
    )
  })

  test('preserves canonical dialogue identity and rejects a runtime cue downgrade', () => {
    const command = {
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: '旁白' }] },
    } satisfies AuthorCommand
    const bridge = createAuthorCommandFormBridge(command)
    const next = {
      kind: 'dialog',
      cue: { identity: { kind: 'unbound', speaker: '老人' }, rows: [{ text: '慢走。' }] },
    } satisfies AuthorCommand

    expect(bridge?.commit(next)).toBe(next)
    expect(() =>
      bridge?.commit({ kind: 'dialog', cue: { rows: [{ text: 'identity 被丢失' }] } }),
    ).toThrow('CommandForm removed canonical dialogue identity')
  })
})
