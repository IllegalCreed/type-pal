import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import {
  installR13SixCSeal,
  R13_SIX_C_SEAL_PATH,
  R13_SIX_C_TRANSITION_ID,
  rewindPalR13SixCPublicationIfPresent,
  type R13SixCTransitionSealV1,
} from './pal-r13-six-c.js'

function snapshot(): MigrationSnapshot {
  return {
    files: new Map([['content/skills.json', { skills: [{ id: '352' }] }]]),
    managedFiles: new Set(['content/skills.json']),
    hashes: new Map([['content/skills.json', 'a'.repeat(64)]]),
    baselineMetadata: {
      generatorEpoch: 'test',
      transitions: {},
    },
  }
}

const seal: R13SixCTransitionSealV1 = {
  kind: 'r13-6c-lossy-closure-transition',
  version: 1,
  projectId: 'pal',
  transitionId: R13_SIX_C_TRANSITION_ID,
  parent: { transitionId: 'r13-source-semantics-v1', digest: 'b'.repeat(64) },
  closure: {
    version: 1,
    methodVersion: 'n3-p7-r13-6c-lossy-closure-v1',
    closures: [
      {
        skillId: '352',
        evidenceDigest: 'c'.repeat(64),
        sourceClosureDigest: 'd'.repeat(64),
        finalTargetDigest: 'e'.repeat(64),
      },
    ],
    finalContentDigest: 'f'.repeat(64),
    summary: { lossyClosed: 3, openObservations: 1 },
  },
  digest: '1'.repeat(64),
}

describe('R13-6C seal/rewind', () => {
  test('install 四元组齐备;rewind 剥离 seal 且内容叶逐字节不动', () => {
    const with6C = snapshot()
    installR13SixCSeal(with6C, seal)
    expect(with6C.files.has(R13_SIX_C_SEAL_PATH)).toBe(true)
    expect(with6C.managedFiles.has(R13_SIX_C_SEAL_PATH)).toBe(true)
    expect(with6C.hashes?.has(R13_SIX_C_SEAL_PATH)).toBe(true)
    expect(with6C.baselineMetadata?.transitions[R13_SIX_C_TRANSITION_ID]).toBe(seal.digest)

    const rewound = rewindPalR13SixCPublicationIfPresent(with6C)
    expect(rewound.files.has(R13_SIX_C_SEAL_PATH)).toBe(false)
    expect(rewound.managedFiles.has(R13_SIX_C_SEAL_PATH)).toBe(false)
    expect(rewound.hashes?.has(R13_SIX_C_SEAL_PATH)).toBe(false)
    expect(rewound.baselineMetadata?.transitions[R13_SIX_C_TRANSITION_ID]).toBeUndefined()
    // 零内容叶:content 文件逐字节不动
    expect(rewound.files.get('content/skills.json')).toEqual({ skills: [{ id: '352' }] })
    expect(rewound.hashes?.get('content/skills.json')).toBe('a'.repeat(64))
  })

  test('无 marker 为 no-op(合成/历史 fixture 兼容)', () => {
    const plain = snapshot()
    expect(rewindPalR13SixCPublicationIfPresent(plain)).toBe(plain)
  })

  test('半状态 fail-closed', () => {
    const half = snapshot()
    half.files.set(R13_SIX_C_SEAL_PATH, {})
    expect(() => rewindPalR13SixCPublicationIfPresent(half)).toThrow(/半状态/)
  })
})
