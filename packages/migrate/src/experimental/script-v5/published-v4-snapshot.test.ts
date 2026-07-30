import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import { reconstructPublishedV4TransitionSnapshots } from './published-v4-snapshot.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('published v4 shadow snapshot reconstruction', () => {
  test('strips C8 and R13 generated locale additions while retaining author keys', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-v4-reconstruction-'))
    roots.push(repo)
    const projectRoot = resolve(repo, 'projects/pal/content')
    mkdirSync(projectRoot, { recursive: true })
    writeFileSync(
      resolve(projectRoot, 'locale.json'),
      `${JSON.stringify(
        {
          base: '源生成',
          author: '作者保留',
          'c8.generated': 'C8',
          'r13.generated': 'R13',
        },
        null,
        2,
      )}\n`,
    )
    const migration: MigrationFileSet = {
      files: new Map([['content/locale.json', { base: '源生成' }]]),
      managedFiles: new Set(['content/locale.json']),
      report: {} as MigrationFileSet['report'],
    }
    const c8Path = '_transitions/c8-item-use-v5-v1.json'
    const confirmPath = '_transitions/r13-confirm-v1.json'
    const baseline: MigrationSnapshot = {
      files: new Map<string, MigrationJson>([
        [
          c8Path,
          {
            kind: 'c8-item-use-transition',
            ownedTargets: [{ identity: { kind: 'locale', key: 'c8.generated' } }],
          },
        ],
        [
          confirmPath,
          {
            kind: 'r13-confirm-transition',
            evidence: {
              materializedLocaleIds: ['r13.generated'],
              materializedSpriteIds: [],
            },
          },
        ],
      ]),
      managedFiles: new Set(['content/locale.json', c8Path, confirmPath]),
      baselineMetadata: {
        generatorEpoch: 'n3-script-v5-p7-v1',
        transitions: {
          'script-v4-v5': 'a'.repeat(64),
          'c8-item-use-v5-v1': 'b'.repeat(64),
          'r13-confirm-v1': 'c'.repeat(64),
        },
      },
    }

    const reconstructed = reconstructPublishedV4TransitionSnapshots(repo, migration, baseline)

    expect(reconstructed.base.files.get('content/locale.json')).toEqual({ base: '源生成' })
    expect(reconstructed.ours.files.get('content/locale.json')).toEqual({
      base: '源生成',
      author: '作者保留',
    })
  })
})
