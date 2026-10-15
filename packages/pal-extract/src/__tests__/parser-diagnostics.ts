import { Console } from 'node:console'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'

interface ExpectedWarning {
  message: string
  errorFrom?: { functionName: string; moduleUrl: URL }
}

/** Synchronous parser IO: validate complete log records and restore console before returning. */
export function withParserWarnings<T>(expected: readonly ExpectedWarning[], action: () => T): T {
  let stdout = ''
  let stderr = ''
  const output = new Writable({
    write(chunk, _encoding, done) {
      stdout += String(chunk)
      done()
    },
  })
  const errors = new Writable({
    write(chunk, _encoding, done) {
      stderr += String(chunk)
      done()
    },
  })
  const previous = globalThis.console
  globalThis.console = new Console({
    stdout: output,
    stderr: errors,
    colorMode: false,
    ignoreErrors: false,
  })
  let outcome: { ok: true; value: T } | { ok: false; error: unknown }
  try {
    outcome = { ok: true, value: action() }
  } catch (error) {
    outcome = { ok: false, error }
  } finally {
    globalThis.console = previous
    output.destroy()
    errors.destroy()
  }

  expect(stdout).toBe('')
  const lines = stderr === '' ? [] : stderr.trimEnd().split('\n')
  let cursor = 0
  for (const warning of expected) {
    expect(lines[cursor++]).toBe(warning.message)
    if (!warning.errorFrom) continue
    const stack: string[] = []
    while (cursor < lines.length) {
      const line = lines[cursor]
      if (!line?.startsWith('    at ')) break
      stack.push(line)
      cursor++
    }
    expect(stack.length).toBeGreaterThanOrEqual(2)
    expect(stack[0]).toContain('decodeRle (')
    expect(stack[0]).toContain('/packages/shared/src/rle.ts:')
    expect(stack[1]).toContain(`${warning.errorFrom.functionName} (`)
    expect(stack[1]).toContain(fileURLToPath(warning.errorFrom.moduleUrl))
  }
  expect(cursor).toBe(lines.length)
  if (!outcome.ok) throw outcome.error
  return outcome.value
}
