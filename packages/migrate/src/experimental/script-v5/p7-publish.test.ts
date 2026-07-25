import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from '../../migration-baseline.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
} from '../../migration-transaction.js'
import { planP7ReleaseTransaction } from './p7-publish.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function tempRepo(): string {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-p7-publish-'))
  roots.push(root)
  return root
}

function write(repo: string, path: string, content: string): void {
  const full = resolve(repo, path)
  mkdirSync(resolve(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

function fixture(repo: string) {
  const binary = 'pal-wave'
  write(repo, 'projects/pal/assets/authored/sound.wav', binary)
  write(repo, 'projects/pal/assets/index.json', '{"old":true}\n')
  write(repo, 'projects/pal/content/stamps.json', '[]\n')
  write(repo, 'projects/pal/content/value.json', '{"value":1}\n')
  write(repo, 'projects/pal/content/scripts/legacy.json', '{"legacy":true}\n')
  write(repo, 'projects/pal/manifest.json', '{"contentVersion":4}\n')
  write(repo, 'packages/migrate/baselines/pal/content/value.json', '{"value":1}\n')
  write(repo, 'packages/migrate/baselines/pal/content/scripts/legacy.json', '{"legacy":true}\n')
  write(repo, 'packages/migrate/baselines/pal/_state.json', '{"version":1}\n')

  const catalog = `${JSON.stringify(
    {
      version: 1,
      assets: {
        sound: {
          kind: 'sound',
          path: 'assets/authored/sound.wav',
          mediaType: 'audio/wav',
          bytes: binary.length,
          sha256: sha256(binary),
          origin: { kind: 'authored' },
        },
      },
    },
    null,
    2,
  )}\n`
  const project = new Map([
    ['assets/index.json', catalog],
    ['content/stamps.json', '[]\n'],
    ['content/value.json', '{"value":2}\n'],
    ['content/migrations/script-v4-v5-save.json', '{"transitionId":"script-v4-v5"}\n'],
    [
      'manifest.json',
      `${JSON.stringify(
        {
          id: 'pal',
          contentVersion: 5,
          assets: { catalog: 'assets/index.json', roles: {} },
        },
        null,
        2,
      )}\n`,
    ],
  ])
  const baseline = new Map([
    ['content/value.json', '{"value":2}\n'],
    ['_transitions/script-v4-v5.json', '{"version":1}\n'],
    [
      '_state.json',
      `${JSON.stringify(
        {
          version: 2,
          generatorEpoch: 'n3-script-v5-p7-v1',
          transitions: { 'script-v4-v5': 'a'.repeat(64) },
          managedFiles: ['content/value.json'],
          files: { 'content/value.json': sha256('{"value":2}\n') },
        },
        null,
        2,
      )}\n`,
    ],
  ])
  return {
    project,
    baseline,
    currentProjectManaged: new Set([
      'assets/index.json',
      'content/stamps.json',
      'content/value.json',
      'content/scripts/legacy.json',
    ]),
    currentBaselineManaged: new Set([
      'content/value.json',
      'content/scripts/legacy.json',
      '_state.json',
    ]),
  }
}

describe('P7 canonical release transaction plan', () => {
  test('publishes project, ledger, sidecar, and baseline before switching manifest', () => {
    const repo = tempRepo()
    const data = fixture(repo)
    const plan = planP7ReleaseTransaction({ repo, ...data })
    expect(plan.summary).toEqual({
      projectWrites: 3,
      projectDeletes: 1,
      baselineWrites: 3,
      baselineDeletes: 1,
      manifestWrites: 1,
    })
    expect(plan.changes.at(-1)).toMatchObject({
      target: 'projects/pal/manifest.json',
      scope: 'manifest',
    })
    expect(plan.changes.at(-1)?.preconditions).toEqual(
      expect.arrayContaining([
        {
          target: 'projects/pal/assets/authored/sound.wav',
          hash: sha256('pal-wave'),
        },
        {
          target: 'projects/pal/assets/index.json',
          hash: sha256(data.project.get('assets/index.json')!),
        },
      ]),
    )

    commitMigrationTransaction(repo, plan.changes)
    expect(
      JSON.parse(readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')).contentVersion,
    ).toBe(5)
    expect(readFileSync(resolve(repo, 'projects/pal/content/value.json'), 'utf8')).toBe(
      '{"value":2}\n',
    )
    expect(existsSync(resolve(repo, 'projects/pal/content/scripts/legacy.json'))).toBe(false)
    expect(
      existsSync(resolve(repo, 'packages/migrate/baselines/pal/_transitions/script-v4-v5.json')),
    ).toBe(true)
    expect(planP7ReleaseTransaction({ repo, ...data }).changes).toEqual([])
  })

  test('fault before manifest leaves v4 visible and recovery completes the same release', () => {
    const repo = tempRepo()
    const data = fixture(repo)
    const plan = planP7ReleaseTransaction({ repo, ...data })
    const manifestIndex = plan.changes.length - 1
    expect(() =>
      commitMigrationTransaction(repo, plan.changes, {
        afterOperation: (_operation, index) => {
          if (index === manifestIndex - 1) throw new Error('before-manifest')
        },
      }),
    ).toThrow('before-manifest')
    expect(
      JSON.parse(readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')).contentVersion,
    ).toBe(4)
    expect(recoverMigrationTransaction(repo)).toBe(true)
    expect(
      JSON.parse(readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')).contentVersion,
    ).toBe(5)
  })

  test('rejects path traversal and non-v5 manifests before producing changes', () => {
    const repo = tempRepo()
    const data = fixture(repo)
    expect(() =>
      planP7ReleaseTransaction({
        repo,
        ...data,
        project: new Map([...data.project, ['../escape.json', '{}\n']]),
      }),
    ).toThrow(/路径越界/)
    expect(() =>
      planP7ReleaseTransaction({
        repo,
        ...data,
        project: new Map([
          ...[...data.project].filter(([path]) => path !== 'manifest.json'),
          ['manifest.json', '{"contentVersion":4}\n'],
        ]),
      }),
    ).toThrow(/contentVersion 5/)
  })
})
