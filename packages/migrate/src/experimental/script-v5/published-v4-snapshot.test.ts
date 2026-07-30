import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import { reconstructPublishedV4TransitionSnapshots } from './published-v4-snapshot.js'
import { stableJsonSha256 } from './stable-json.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('published v4 shadow snapshot reconstruction', () => {
  test('strips C8/R13 generated locale and enemy additions while retaining author keys', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-v4-reconstruction-'))
    roots.push(repo)
    const projectRoot = resolve(repo, 'projects/pal/content')
    mkdirSync(projectRoot, { recursive: true })
    const parentEnemies = [{ id: 'enemy-1', ai: { mode: 'parent' } }]
    const successorEnemies = [{ id: 'enemy-1', ai: { mode: 'successor' } }]
    writeFileSync(
      resolve(projectRoot, 'locale.json'),
      `${JSON.stringify(
        {
          base: '源生成',
          author: '作者保留',
          'c8.generated': 'C8',
          'r13.generated': 'R13',
          'enemy.generated': 'Enemy',
        },
        null,
        2,
      )}\n`,
    )
    writeFileSync(
      resolve(projectRoot, 'enemies.json'),
      `${JSON.stringify(successorEnemies, null, 2)}\n`,
    )
    const migration: MigrationFileSet = {
      files: new Map<string, MigrationJson>([
        ['content/locale.json', { base: '源生成' }],
        ['content/enemies.json', parentEnemies],
      ]),
      managedFiles: new Set(['content/locale.json', 'content/enemies.json']),
      report: {} as MigrationFileSet['report'],
    }
    const c8Path = '_transitions/c8-item-use-v5-v1.json'
    const confirmPath = '_transitions/r13-confirm-v1.json'
    const enemyPath = '_transitions/r13-enemy-script-v1.json'
    const baseline: MigrationSnapshot = {
      files: new Map<string, MigrationJson>([
        [
          'content/locale.json',
          {
            base: '源生成',
            'c8.generated': 'C8',
            'r13.generated': 'R13',
            'enemy.generated': 'Enemy',
          },
        ],
        ['content/enemies.json', successorEnemies],
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
        [
          enemyPath,
          {
            kind: 'r13-enemy-script-transition',
            augmentation: {
              files: {
                parentEnemiesDigest: stableJsonSha256(parentEnemies),
                successorEnemiesDigest: stableJsonSha256(successorEnemies),
              },
              localeDelta: { 'enemy.generated': 'Enemy' },
            },
          },
        ],
      ]),
      managedFiles: new Set([
        'content/locale.json',
        'content/enemies.json',
        c8Path,
        confirmPath,
        enemyPath,
      ]),
      baselineMetadata: {
        generatorEpoch: 'n3-script-v5-p7-v1',
        transitions: {
          'script-v4-v5': 'a'.repeat(64),
          'c8-item-use-v5-v1': 'b'.repeat(64),
          'r13-confirm-v1': 'c'.repeat(64),
          'r13-enemy-script-v1': 'd'.repeat(64),
        },
      },
    }

    const reconstructed = reconstructPublishedV4TransitionSnapshots(repo, migration, baseline)

    expect(reconstructed.base.files.get('content/locale.json')).toEqual({ base: '源生成' })
    expect(reconstructed.ours.files.get('content/locale.json')).toEqual({
      base: '源生成',
      author: '作者保留',
    })
    expect(reconstructed.ours.files.get('content/enemies.json')).toEqual(parentEnemies)

    writeFileSync(
      resolve(projectRoot, 'enemies.json'),
      `${JSON.stringify([{ id: 'enemy-1', ai: { mode: 'author-drift' } }], null, 2)}\n`,
    )
    expect(() => reconstructPublishedV4TransitionSnapshots(repo, migration, baseline)).toThrow(
      'R13 enemy parent/author 边界漂移',
    )

    writeFileSync(
      resolve(projectRoot, 'enemies.json'),
      `${JSON.stringify(successorEnemies, null, 2)}\n`,
    )
    writeFileSync(
      resolve(projectRoot, 'locale.json'),
      `${JSON.stringify(
        {
          base: '源生成',
          author: '作者保留',
          'c8.generated': 'C8',
          'r13.generated': 'R13',
          'enemy.generated': '作者改值',
        },
        null,
        2,
      )}\n`,
    )
    expect(() => reconstructPublishedV4TransitionSnapshots(repo, migration, baseline)).toThrow(
      'R13 enemy locale 漂移 enemy.generated',
    )

    const badParentBaseline = structuredClone(baseline)
    const badSeal = badParentBaseline.files.get(enemyPath) as Record<string, unknown>
    const badAugmentation = badSeal.augmentation as Record<string, unknown>
    const badFiles = badAugmentation.files as Record<string, unknown>
    badFiles.parentEnemiesDigest = 'f'.repeat(64)
    expect(() =>
      reconstructPublishedV4TransitionSnapshots(repo, migration, badParentBaseline),
    ).toThrow('R13 enemy parent/author 边界漂移')
  })
})
