import { expect, test } from 'vitest'
import {
  flowOf,
  preview,
  settle,
} from '../../../packages/editor/src/core/__tests__/playback-canonical-fixtures.js'

// Explicitly isolated product diagnostic; not a test.fails or a changed green expectation.
test('D1 first canonical step executes the first command instead of an invisible stage gate', async () => {
  const r = preview()
  await r.start(flowOf([{ kind: 'setPartyFacing', facing: 'left' }]), { paused: true })
  expect(r.p.view.player.facing).toBe('down')
  r.p.step()
  await settle()
  expect(r.p.view.player.facing).toBe('left')
})
