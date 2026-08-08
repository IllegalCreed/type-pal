import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'

const TRANSITION_ID = 'test-transition'
const SEAL_PATH = '_transitions/test-transition.json'

function snapshot(mask: number): MigrationSnapshot {
  return {
    files: new Map(mask & 0b0010 ? [[SEAL_PATH, null]] : []),
    managedFiles: new Set(mask & 0b0100 ? [SEAL_PATH] : []),
    hashes: new Map(mask & 0b1000 ? [[SEAL_PATH, 'a'.repeat(64)]] : []),
    baselineMetadata: {
      generatorEpoch: 'test',
      transitions: mask & 0b0001 ? { [TRANSITION_ID]: 'b'.repeat(64) } : {},
    },
  }
}

describe('append-only transition publication state', () => {
  test.each(
    Array.from({ length: 16 }, (_, mask) => mask),
  )('classifies the complete four-bit state %#', (mask) => {
    const bits = {
      metadata: (mask & 0b0001) !== 0,
      file: (mask & 0b0010) !== 0,
      managed: (mask & 0b0100) !== 0,
      hash: (mask & 0b1000) !== 0,
    }
    const classify = () =>
      appendOnlyTransitionState(snapshot(mask), {
        transitionId: TRANSITION_ID,
        sealPath: SEAL_PATH,
        errorPrefix: 'test MG2',
      })

    if (mask === 0) expect(classify()).toBe('initialize')
    else if (mask === 0b1111) expect(classify()).toBe('replay')
    else
      expect(classify).toThrow(
        `test MG2: transition 半状态 metadata=${bits.metadata} file=${bits.file} ` +
          `managed=${bits.managed} hash=${bits.hash}`,
      )
  })
})
