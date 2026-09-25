import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { localTarget } from './check.mjs'
import { applyRelocation, digest, validateMoves } from './relocate.mjs'

test('absolute, backslash, empty, and .git path segments fail before any write', () => {
  for (const path of ['/docs/a.md', 'docs\\a.md', 'docs//a.md', 'docs/.git/a.md', 'docs/../a.md']) {
    assert.throws(() => validateMoves([{ from: path, to: 'docs/b.md' }]), /Unsafe/)
    assert.throws(() => validateMoves([{ from: 'docs/a.md', to: path }]), /Unsafe/)
  }
})

test('existing destination and overlapping swaps fail on an isolated tree with zero writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'type-pal-doc-security-'))
  try {
    writeFileSync(join(dir, 'a.md'), 'alpha')
    writeFileSync(join(dir, 'b.md'), 'beta')
    const beforeA = readFileSync(join(dir, 'a.md'), 'utf8')
    const beforeB = readFileSync(join(dir, 'b.md'), 'utf8')
    assert.throws(
      () =>
        applyRelocation(
          dir,
          [{ from: 'a.md', to: 'b.md', sha256: digest('alpha') }],
          new Map([['a.md', 'b.md']]),
          { write: true },
        ),
      /Destination exists|Overlapping/,
    )
    assert.throws(
      () =>
        applyRelocation(
          dir,
          [
            { from: 'a.md', to: 'b.md', sha256: digest('alpha') },
            { from: 'b.md', to: 'a.md', sha256: digest('beta') },
          ],
          new Map([
            ['a.md', 'b.md'],
            ['b.md', 'a.md'],
          ]),
          { write: true },
        ),
      /Overlapping/,
    )
    assert.equal(readFileSync(join(dir, 'a.md'), 'utf8'), beforeA)
    assert.equal(readFileSync(join(dir, 'b.md'), 'utf8'), beforeB)
    assert.equal(existsSync(join(dir, 'c.md')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    assert.equal(existsSync(dir), false)
  }
})

test('scheme and protocol-relative destinations stay out of local file checks', () => {
  assert.equal(localTarget('docs/a.md', 'file:///etc/passwd'), undefined)
  assert.equal(localTarget('docs/a.md', '//example.org/secret.md'), undefined)
  assert.equal(localTarget('docs/a.md', 'javascript:alert(1)'), undefined)
})
