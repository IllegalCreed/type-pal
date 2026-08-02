import { describe, expect, test } from 'vitest'
import {
  assertPalProducerFixtureGate,
  releasePalTestProducerCachesForCanary,
} from './pal-test-fixture.js'

describe('PAL producer fixture gate', () => {
  test('fails closed in the developer gate and stays available to cold/release producers', () => {
    expect(() => assertPalProducerFixtureGate('fast')).toThrow(/explicit canary\/release gate/)
    expect(() => assertPalProducerFixtureGate(undefined)).toThrow(/explicit canary\/release gate/)
    expect(() => assertPalProducerFixtureGate('canary')).not.toThrow()
    expect(() => assertPalProducerFixtureGate('release')).not.toThrow()
    expect(() => assertPalProducerFixtureGate('release-shared')).not.toThrow()
    expect(() => assertPalProducerFixtureGate('unknown' as never)).toThrow(
      /explicit canary\/release gate/,
    )
  })

  test('allows producer cache release only inside the isolated canary gate', () => {
    const originalGate = process.env.TYPE_PAL_MIGRATE_TEST_GATE
    try {
      process.env.TYPE_PAL_MIGRATE_TEST_GATE = 'fast'
      expect(() => releasePalTestProducerCachesForCanary()).toThrow(/仅允许 canary gate/)
      process.env.TYPE_PAL_MIGRATE_TEST_GATE = 'release-shared'
      expect(() => releasePalTestProducerCachesForCanary()).toThrow(/仅允许 canary gate/)
      process.env.TYPE_PAL_MIGRATE_TEST_GATE = 'canary'
      expect(() => releasePalTestProducerCachesForCanary()).not.toThrow()
    } finally {
      if (originalGate === undefined) delete process.env.TYPE_PAL_MIGRATE_TEST_GATE
      else process.env.TYPE_PAL_MIGRATE_TEST_GATE = originalGate
    }
  })
})
