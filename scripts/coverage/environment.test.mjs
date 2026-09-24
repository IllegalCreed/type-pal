import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { preciseCoverageEnvironment } from './environment.mjs'

test('precise coverage rejects inherited and override cache activation without mutating inputs', () => {
  const inherited = Object.freeze({
    PATH: '/kept',
    NODE_COMPILE_CACHE: '/host-cache',
    NODE_DISABLE_COMPILE_CACHE: '0',
    MARKER: 'inherited',
  })
  const overrides = Object.freeze({
    NODE_COMPILE_CACHE: '/override-cache',
    NODE_DISABLE_COMPILE_CACHE: '0',
    MARKER: 'override',
    TYPE_PAL_COVERAGE: '1',
  })
  assert.deepEqual(preciseCoverageEnvironment(overrides, inherited), {
    PATH: '/kept',
    NODE_DISABLE_COMPILE_CACHE: '1',
    MARKER: 'override',
    TYPE_PAL_COVERAGE: '1',
  })
  assert.equal(inherited.NODE_COMPILE_CACHE, '/host-cache')
  assert.equal(overrides.NODE_COMPILE_CACHE, '/override-cache')
})

test('fresh coverage subprocess starts with compile cache disabled and unrelated environment intact', () => {
  const cache = mkdtempSync(join(tmpdir(), 'type-pal-cache-env-'))
  try {
    const run = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { getCompileCacheDir } from 'node:module';
console.log(JSON.stringify({cache:getCompileCacheDir()??null,cacheEnv:process.env.NODE_COMPILE_CACHE??null,disabled:process.env.NODE_DISABLE_COMPILE_CACHE,marker:process.env.COVERAGE_ENV_WITNESS}));`,
      ],
      {
        encoding: 'utf8',
        env: preciseCoverageEnvironment({
          NODE_COMPILE_CACHE: cache,
          NODE_DISABLE_COMPILE_CACHE: '0',
          COVERAGE_ENV_WITNESS: 'actual-child',
        }),
      },
    )
    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(JSON.parse(run.stdout), {
      cache: null,
      cacheEnv: null,
      disabled: '1',
      marker: 'actual-child',
    })
  } finally {
    rmSync(cache, { recursive: true, force: true })
  }
})
