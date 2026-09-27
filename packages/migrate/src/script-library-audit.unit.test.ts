import { deriveScriptChunk, type EnemyDef, normalizeScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { auditScriptLibrary, enemyScriptAuditRoots } from './script-library-audit.js'

describe('全库脚本去内联门禁', () => {
  test('Enemy v10 根按 battle domain 分流，ready/turnStart hook 不冒充世界 Command', () => {
    const definition = {
      id: 'enemy-test',
      name: 'name.enemy-test',
      battleSprite: 'enemy-battle-test',
      yPosOffset: 0,
      stats: {
        health: 1,
        level: 1,
        exp: 0,
        cash: 0,
        attackStrength: 1,
        magicStrength: 1,
        defense: 1,
        dexterity: 1,
        fleeRate: 0,
        physicalResistance: 0,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        dualMove: false,
        collectValue: 0,
      },
      ai: {
        resistanceToSorcery: 0,
        hooks: {
          ready: {
            initial: 'initial',
            states: {
              initial: {
                body: [{ kind: 'setFallback' }],
                next: { kind: 'stay' },
              },
            },
          },
        },
      },
      sounds: {},
      choreography: [{ at: 'battleStart', body: [{ kind: 'wait', ms: 1 }] }],
      onDefeated: [{ kind: 'giveMoney', delta: 1 }],
    } satisfies EnemyDef

    expect(enemyScriptAuditRoots([definition]).map(({ domain, id }) => ({ domain, id }))).toEqual([
      {
        domain: 'battle-choreography',
        id: 'global/enemies/enemy-test/choreography-0',
      },
      {
        domain: 'enemy-on-defeated',
        id: 'global/enemies/enemy-test/on-defeated',
      },
      {
        domain: 'enemy-hook',
        id: 'global/enemies/enemy-test/hook-ready',
      },
    ])
  })

  test('作者脚本单列统计，不稀释也不抬高迁移膨胀比', () => {
    const authoredId = 'shared/user/large-a1b2c3d4'
    const internalId = 'shared/L_1/default'
    const shards = { shared: 1, global: {} }
    const chunkId = deriveScriptChunk(authoredId, shards)!
    const scripts = normalizeScriptLibrary(
      {
        version: 1,
        shards,
        chunks: {},
        library: { [authoredId]: { name: '作者大脚本', self: 'none' } },
      },
      {
        [chunkId]: {
          version: 1,
          id: chunkId,
          scripts: {
            [internalId]: [{ kind: 'wait', ms: 1 }],
            [authoredId]: Array.from({ length: 100 }, () => ({ kind: 'wait' as const, ms: 1 })),
          },
        },
      },
    )
    const sourceJson = { commands: [{ op: 1 }] }
    const sourcePretty = JSON.stringify(sourceJson, null, 2)
    const audit = auditScriptLibrary({
      sourceJson,
      sourcePrettyBytes: new TextEncoder().encode(sourcePretty).byteLength,
      sourceCommandCount: 1,
      scenes: [],
      index: scripts.index,
      chunks: scripts.chunks,
    })
    expect(audit.migrated.commands).toBe(1)
    expect(audit.authored.commands).toBe(100)
    expect(audit.ratios.commands).toBe(1)
  })
})
