import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  loadPalBaseline,
  loadPalBaselineRepairCandidate,
  PAL_BASELINE_REL,
  serializeMigrationJson,
  sha256,
} from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  R13_CONFIRM_SEAL_PATH,
  R13_CONFIRM_TRANSITION_ID,
  type R13ConfirmTransitionSealV1,
} from './r13-confirm-mg2.js'
import { repairMissingR13ConfirmSeal } from './r13-confirm-seal-repair.js'
import { stableJsonSha256 } from './stable-json.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture(overrides?: { transitionDigest?: string; fileSha256?: string }) {
  const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-r13-confirm-repair-'))
  roots.push(repo)
  const baselineRoot = resolve(repo, PAL_BASELINE_REL)
  mkdirSync(resolve(baselineRoot, '_transitions'), { recursive: true })
  const body = {
    kind: 'r13-confirm-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_CONFIRM_TRANSITION_ID,
    parent: {
      transitionId: 'r13-item-throw-v1',
      digest: '1'.repeat(64),
    },
    evidence: { fixture: true },
    audits: { fixture: true },
  }
  const seal = {
    ...body,
    digest: stableJsonSha256(body),
  } as unknown as R13ConfirmTransitionSealV1
  const content = serializeMigrationJson(seal as unknown as MigrationJson, R13_CONFIRM_SEAL_PATH)
  const state = {
    version: 2,
    generatorEpoch: 'n3-script-v5-p7-v1',
    transitions: {
      [R13_CONFIRM_TRANSITION_ID]: overrides?.transitionDigest ?? seal.digest,
    },
    managedFiles: [R13_CONFIRM_SEAL_PATH],
    files: {
      [R13_CONFIRM_SEAL_PATH]: overrides?.fileSha256 ?? sha256(content),
    },
  }
  const stateText = `${JSON.stringify(state, null, 2)}\n`
  writeFileSync(resolve(baselineRoot, '_state.json'), stateText)
  const baseline = loadPalBaselineRepairCandidate(repo, R13_CONFIRM_SEAL_PATH)!
  return { repo, baselineRoot, baseline, seal, content, stateText }
}

describe('R13 confirm published seal explicit repair', () => {
  test('restores exactly one missing body and keeps state byte-identical', () => {
    const f = fixture()
    expect(() => loadPalBaseline(f.repo)).toThrow(/baseline 缺文件/)

    const result = repairMissingR13ConfirmSeal({
      repo: f.repo,
      baseline: f.baseline,
      expectedSeal: f.seal,
    })

    expect(result).toEqual({
      path: R13_CONFIRM_SEAL_PATH,
      digest: f.seal.digest,
      fileSha256: sha256(f.content),
    })
    expect(readFileSync(resolve(f.baselineRoot, '_state.json'), 'utf8')).toBe(f.stateText)
    expect(readFileSync(resolve(f.baselineRoot, R13_CONFIRM_SEAL_PATH), 'utf8')).toBe(f.content)
    expect(loadPalBaseline(f.repo)?.files.get(R13_CONFIRM_SEAL_PATH)).toEqual(f.seal)
    expect(() =>
      repairMissingR13ConfirmSeal({
        repo: f.repo,
        baseline: f.baseline,
        expectedSeal: f.seal,
      }),
    ).toThrow(/修复目标已被并发写入/)
  })

  test('rejects mismatched transition digest or file SHA', () => {
    const transition = fixture({ transitionDigest: '2'.repeat(64) })
    expect(() =>
      repairMissingR13ConfirmSeal({
        repo: transition.repo,
        baseline: transition.baseline,
        expectedSeal: transition.seal,
      }),
    ).toThrow(/transition digest/)

    const file = fixture({ fileSha256: '3'.repeat(64) })
    expect(() =>
      repairMissingR13ConfirmSeal({
        repo: file.repo,
        baseline: file.baseline,
        expectedSeal: file.seal,
      }),
    ).toThrow(/file SHA/)
  })

  test('rejects an existing body or pending transaction journal', () => {
    const existing = fixture()
    writeFileSync(resolve(existing.baselineRoot, R13_CONFIRM_SEAL_PATH), existing.content)
    expect(() =>
      repairMissingR13ConfirmSeal({
        repo: existing.repo,
        baseline: existing.baseline,
        expectedSeal: existing.seal,
      }),
    ).toThrow(/修复目标已被并发写入/)

    const journal = fixture()
    mkdirSync(resolve(journal.repo, '.type-pal-migrate'), { recursive: true })
    writeFileSync(resolve(journal.repo, '.type-pal-migrate/pal-journal.json'), '{}')
    expect(() =>
      repairMissingR13ConfirmSeal({
        repo: journal.repo,
        baseline: journal.baseline,
        expectedSeal: journal.seal,
      }),
    ).toThrow(/存在待恢复迁移事务/)
  })
})
