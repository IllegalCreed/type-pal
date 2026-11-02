import assert from 'node:assert/strict'
import { test } from 'node:test'
import { boatMediaEnabled } from './boat-delivery.mjs'

test('006 media is an explicit declared process input, never a truthy environment fallback', () => {
  assert.equal(boatMediaEnabled(undefined), false)
  assert.equal(boatMediaEnabled('1'), true)
  for (const value of ['', '0', 'true', 'yes', 1, null])
    assert.throws(() => boatMediaEnabled(value), /TYPE_PAL_BOAT_MEDIA/)
})
