/** F03: fast decoupling of the offline audit, exact accounting and failure behavior. */
import { checkEnemyHookFlow, type EnemyDef, validateEnemies } from '@type-pal/content'
import { expect, test } from 'vitest'
import { sourceEnemy, sourceObject } from './__tests__/coverage-wave2/f-enemies-source.js'
import {
  auditLibrary,
  authoredId,
  migratedId,
} from './__tests__/coverage-wave2/f-script-library.js'
import { mapEnemies } from './migrate-enemies.js'
import {
  assertScriptLibraryAudit,
  auditScriptLibrary,
  enemyScriptAuditRoots,
  worldCommandAuditRoots,
} from './script-library-audit.js'

test('audit keeps authored bytes and nodes out of migration ratios and measures Unicode in UTF8', () => {
  const input = auditLibrary(),
    before = structuredClone(input),
    result = auditScriptLibrary(input)
  const bodies = Object.values(input.chunks)[0]!.scripts
  const size = (body: unknown) => ({
    normalizedBytes: new TextEncoder().encode(JSON.stringify(body)).byteLength,
    prettyBytes: new TextEncoder().encode(JSON.stringify(body, null, 2)).byteLength,
  })
  expect(result.migrated).toEqual({ ...size(bodies[migratedId]), commands: 1 })
  expect(result.authored).toEqual({ ...size(bodies[authoredId]), commands: 2 })
  expect(result.source).toEqual({
    normalizedBytes: new TextEncoder().encode(JSON.stringify(input.sourceJson)).byteLength,
    prettyBytes: input.sourcePrettyBytes,
    commands: 1,
  })
  expect(result.source.normalizedBytes).toBeGreaterThan(JSON.stringify(input.sourceJson).length)
  expect(result.ratios.commands).toBe(1)
  expect(result.issues).toEqual([])
  expect(() => assertScriptLibraryAudit(result)).not.toThrow()
  expect(input).toEqual(before)
})
test('audit reports missing chunk files exactly and assert propagates every diagnostic', () => {
  const good = auditLibrary()
  const missing = Object.keys(good.chunks)[0]!
  const input = { ...good, chunks: {} },
    before = structuredClone(input)
  const result = auditScriptLibrary(input)
  expect(result.issues).toEqual([`index chunk 缺文件 ${missing}`])
  expect(() => assertScriptLibraryAudit(result)).toThrow(
    `脚本库门禁失败:\nindex chunk 缺文件 ${missing}`,
  )
  expect(input).toEqual(before)
})
test('extra world roots traverse nested battle failure arms and report an actual orphan reference', () => {
  const base = auditLibrary()
  const extraRoots = worldCommandAuditRoots([
    {
      id: 'global/test',
      body: [
        {
          kind: 'startBattle',
          enemyTeamId: 'team',
          onLose: [{ kind: 'callScript', ref: { chunk: 'missing', id: 'shared/missing/default' } }],
        },
      ],
    },
  ])
  const input = { ...base, sourceCommandCount: 100, extraRoots },
    before = structuredClone(input)
  const result = auditScriptLibrary(input)
  expect(result.migrated.commands).toBe(3)
  expect(result.issues).toEqual([
    expect.stringMatching(/^孤儿 ref missing:shared\/missing\/default\(derived=/),
  ])
  expect(input).toEqual(before)
})
test('enemy hook, choreography and defeat roots retain distinct domains and complete bodies', () => {
  const enemy: EnemyDef = mapEnemies([sourceEnemy({ magic: 0, magicRate: 0 })], [sourceObject()])
    .enemies[0]!
  enemy.ai.hooks = {
    ready: {
      initial: 'main',
      states: { main: { body: [{ kind: 'setFallback' }], next: { kind: 'stay' } } },
    },
  }
  enemy.choreography = [{ at: 'battleStart', body: [{ kind: 'wait', ms: 2 }] }]
  enemy.onDefeated = [{ kind: 'giveMoney', delta: 1 }]
  validateEnemies([enemy])
  checkEnemyHookFlow(enemy.ai.hooks.ready, 'hook')
  const before = structuredClone(enemy)
  const roots = enemyScriptAuditRoots([enemy])
  expect(roots).toEqual([
    {
      domain: 'battle-choreography',
      id: 'global/enemies/enemy-398/choreography-0',
      body: [{ kind: 'wait', ms: 2 }],
    },
    {
      domain: 'enemy-on-defeated',
      id: 'global/enemies/enemy-398/on-defeated',
      body: [{ kind: 'giveMoney', delta: 1 }],
    },
    {
      domain: 'enemy-hook',
      id: 'global/enemies/enemy-398/hook-ready',
      flow: before.ai.hooks!.ready,
    },
  ])
  expect(
    auditScriptLibrary({ ...auditLibrary(), sourceCommandCount: 100, extraRoots: roots }).migrated
      .commands,
  ).toBe(5)
  expect(enemy).toEqual(before)
})
