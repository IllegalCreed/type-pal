import { describe, expect, test } from 'vitest'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import { serializeMigrationJson, sha256 } from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'
import {
  installR13SixCSeal,
  R13_SIX_C_SEAL_PATH,
  R13_SIX_C_TRANSITION_ID,
  type R13SixCTransitionSealV1,
  rewindPalR13SixCPublicationIfPresent,
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

const sealBody: Omit<R13SixCTransitionSealV1, 'digest'> = {
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
}
const seal: R13SixCTransitionSealV1 = { ...sealBody, digest: stableJsonSha256(sealBody) }

function asJson(value: R13SixCTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

describe('R13-6C seal/rewind', () => {
  test('install 四元组齐备;rewind 剥离 seal 且内容叶逐字节不动', () => {
    const with6C = snapshot()
    expect(installR13SixCSeal(with6C, seal)).toBe('initialize')
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

  test('已发布 replay 完全相等时保持历史四元组原字节且返回 replay', () => {
    const published = snapshot()
    installR13SixCSeal(published, seal)
    const before = structuredClone(published)

    expect(installR13SixCSeal(published, structuredClone(seal))).toBe('replay')
    expect(published).toEqual(before)
  })

  test('已发布 body 漂移即使自报 digest 与文件 hash 同步伪造也 fail-loud', () => {
    const published = snapshot()
    installR13SixCSeal(published, seal)
    const tampered = structuredClone(seal)
    tampered.closure.finalContentDigest = '9'.repeat(64)
    // 攻击面：保留旧自摘要并同步重签文件 hash，验证实现必须从 body 重算 digest。
    published.files.set(R13_SIX_C_SEAL_PATH, asJson(tampered))
    published.hashes?.set(
      R13_SIX_C_SEAL_PATH,
      sha256(serializeMigrationJson(asJson(tampered), R13_SIX_C_SEAL_PATH)),
    )

    expect(() => installR13SixCSeal(published, seal)).toThrow(/body 重算 digest/)
  })

  test('已发布四元组不得被新的 authority 静默覆盖', () => {
    const published = snapshot()
    installR13SixCSeal(published, seal)
    const nextBody = structuredClone(sealBody)
    nextBody.closure.summary.openObservations = 2
    const nextSeal = { ...nextBody, digest: stableJsonSha256(nextBody) }
    const before = structuredClone(published)

    expect(() => installR13SixCSeal(published, nextSeal)).toThrow(/重建 authority 不符/)
    expect(published).toEqual(before)
  })
})
