import { describe, expect, test } from 'vitest'
import {
  SCRIPT_V4_V5_SIDECAR_PATH,
  validateProjectMigrationDescriptorV1,
} from './script-transition-v5.js'

describe('script v4 -> v5 manifest descriptor', () => {
  const valid = {
    version: 1,
    fromContentVersion: 4,
    toContentVersion: 5,
    path: SCRIPT_V4_V5_SIDECAR_PATH,
    sha256: 'a'.repeat(64),
  }

  test('accepts the one frozen transition descriptor', () => {
    expect(validateProjectMigrationDescriptorV1(valid)).toEqual(valid)
  })

  test.each([
    [{ ...valid, version: 2 }, /version: 期望 1/],
    [{ ...valid, path: 'content/migrations/other.json' }, /path: 期望/],
    [{ ...valid, sha256: 'A'.repeat(64) }, /小写 SHA-256/],
    [{ ...valid, extra: true }, /未知字段/],
  ])('rejects malformed descriptor %#', (descriptor, message) => {
    expect(() => validateProjectMigrationDescriptorV1(descriptor)).toThrow(message)
  })
})
