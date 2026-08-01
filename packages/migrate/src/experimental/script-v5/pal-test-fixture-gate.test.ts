import { describe, expect, test } from 'vitest'
import { assertPalProducerFixtureGate } from './pal-test-fixture.js'

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
})
