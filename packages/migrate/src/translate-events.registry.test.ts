import { type Command, stableScriptHash } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { unchanged } from './__tests__/pure-migration-fixtures.js'
import { raw, translation } from './__tests__/translation-fixtures.js'
import { ScriptRegistry, type ScriptRegistryRootOriginAudit } from './translate-events.js'

describe('current translation registry boundaries', () => {
  test('registerRoot clones origin and returned audit records without aliasing caller metadata', () => {
    const registry = new ScriptRegistry(() => undefined)
    const origin: ScriptRegistryRootOriginAudit = {
      kind: 'content-entry',
      sources: ['entry/初始'],
      sourceAddresses: [10, 11],
    }
    const original = structuredClone(origin)
    const commands: Command[] = [{ kind: 'wait', ms: 120 }]
    const ref = unchanged(commands, () => registry.registerRoot('shared/intro', commands, origin))
    expect(origin).toEqual(original)
    origin.sources.push('unrelated')
    origin.sourceAddresses!.push(99)
    const expected = [{ id: ref.id, chunk: ref.chunk, kind: 'registered-root', origin: original }]
    expect(registry.auditRecords()).toEqual(expected)
    const returned = registry.auditRecords()
    returned[0]!.origin!.sources[0] = 'polluted'
    expect(registry.auditRecords()).toEqual(expected)
    expect(registry.bodyFor(ref.id)).toEqual([{ kind: 'wait', ms: 120 }])
  })

  test('idempotent root returns same reference while conflicting body and invalid scope fail loudly', () => {
    const registry = new ScriptRegistry(() => undefined)
    const commands: Command[] = [{ kind: 'wait', ms: 120 }]
    const ref = registry.registerRoot('shared/intro', commands)
    expect(registry.registerRoot(ref.id, structuredClone(commands))).toBe(ref)
    expect(() => registry.registerRoot(ref.id, [{ kind: 'wait', ms: 121 }])).toThrow('root id 冲突')
    expect(() => registry.registerRoot('no-scope', [])).toThrow('无法为稳定 id 推导 chunk')
    expect(registry.bodyFor('absent')).toBeUndefined()
    expect(registry.dialogueExitFor({ id: 'absent', chunk: ref.chunk })).toBeUndefined()
    expect(registry.commandBodies()).toEqual([commands])
  })

  test('nested cross-chunk imports are unique sorted and absent for same-chunk references', () => {
    const registry = new ScriptRegistry(() => undefined)
    const a = registry.registerRoot('scene/s001/a', [{ kind: 'wait', ms: 40 }])
    const b = registry.registerRoot('scene/s002/b', [{ kind: 'wait', ms: 80 }])
    const same = registry.registerRoot('scene/s003/sibling', [{ kind: 'wait', ms: 120 }])
    const commands: Command[] = [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 30 },
        then: [
          { kind: 'callScript', ref: b },
          { kind: 'jumpScript', ref: a },
        ],
      },
      { kind: 'callScript', ref: b },
      { kind: 'callScript', ref: same },
    ]
    const root = registry.registerRoot('scene/s003/root', commands)
    expect(root.chunk).toBe(same.chunk)
    expect(new Set([a.chunk, b.chunk, root.chunk]).size).toBe(3)
    const output = unchanged(commands, () => registry.build())
    const expectedImports = [a.chunk, b.chunk].sort()
    expect(output.chunks[root.chunk]).toEqual({
      version: 1,
      id: root.chunk,
      imports: expectedImports,
      scripts: {
        [same.id]: [{ kind: 'wait', ms: 120 }],
        [root.id]: commands,
      },
    })
    expect(output.chunks[a.chunk]!.imports).toBeUndefined()
    expect(Object.keys(output.chunks)).toEqual(Object.keys(output.chunks).sort())
    for (const [id, chunk] of Object.entries(output.chunks)) {
      const json = JSON.stringify(chunk)
      expect(output.index.chunks[id]).toEqual({
        path: `chunks/${id}.json`,
        bytes: Buffer.byteLength(json, 'utf8'),
        hash: stableScriptHash(json).toString(16).padStart(8, '0'),
        ...(id === root.chunk ? { imports: expectedImports } : {}),
      })
    }
  })

  test('target cache distinguishes owner and dialogue entry while identical calls do not retraverse', () => {
    const f = translation([raw(0x09, [2])])
    const registry = f.ctx.registry!
    const first = unchanged(f.source, () => registry.registerTarget('L_100', 'e3', {}, f.ctx))
    const outcomes = structuredClone(f.ctx.report.instructionOutcomes)
    expect(registry.registerTarget('L_100', 'e3', {}, f.ctx)).toBe(first)
    expect(f.ctx.report.instructionOutcomes).toEqual(outcomes)
    const changedOwner = registry.registerTarget('L_100', 'e4', {}, f.ctx)
    const changedEntry = registry.registerTarget('L_100', 'e3', { speed: 17 }, f.ctx)
    expect(new Set([first.id, changedOwner.id, changedEntry.id]).size).toBe(3)
    expect(registry.commandBodies()).toEqual(
      Array.from({ length: 3 }, () => [{ kind: 'wait', ms: 80 }]),
    )
    expect(registry.dialogueExitFor(changedEntry)?.speed).toBe(17)
  })

  test('legacy alias preserves target identity and non-explicit address audit is deduplicated', () => {
    const registry = new ScriptRegistry(() => undefined)
    const f = translation([raw(0x09, [2])], { registry, explicitLabels: new Set() })
    const ref = unchanged(f.source, () =>
      registry.registerLegacyAlias('shared/item-use', 'L_100', undefined, f.ctx),
    )
    const alias = registry.bodyFor(ref.id)!
    expect(alias).toHaveLength(1)
    expect(alias[0]!.kind).toBe('callScript')
    if (alias[0]!.kind !== 'callScript') throw new Error('unreachable after assertion')
    const target = alias[0]!.ref
    expect(target.id).toMatch(/^shared\/L-100\/L-100\/none\/d-/)
    expect(registry.bodyFor(target.id)).toEqual([{ kind: 'wait', ms: 80 }])
    expect(registry.auditRecords().find((a) => a.id === ref.id)).toEqual({
      id: ref.id,
      chunk: ref.chunk,
      kind: 'legacy-alias',
      source: { label: 'L_100', address: 100 },
      aliasTargetId: target.id,
    })
    registry.registerTarget('L_100', 'e3', {}, f.ctx)
    expect(f.ctx.report.resolvedAddressTargets).toEqual([{ address: 100, operation: 'raw:0x9' }])
  })

  test.each([
    'advance',
    'reset',
  ] as const)('registered %s target reports segment successor instead of silently attributing all stages', (term) => {
    const end =
      term === 'advance' ? { op: 'end', advance: true } : { op: 'end', reset: true, resetTo: 700 }
    const f = translation([raw(0x09, [2]), end, raw(0x09, [7])])
    const ref = f.ctx.registry!.registerTarget('L_100', 'e3', {}, f.ctx, 'install')
    expect(f.ctx.registry!.bodyFor(ref.id)).toEqual([{ kind: 'wait', ms: 80 }])
    expect(f.ctx.report.segmentTransferDetails).toEqual([
      {
        label: 'L_100',
        sourceAddress: 100,
        refKind: 'install',
        term,
        successor: term === 'advance' ? 102 : 700,
        owner: 'e3',
        id: ref.id,
        path: `${ref.id} -> L_100`,
      },
    ])
    expect(f.ctx.registry!.auditRecords()[0]!.source!.addresses).toEqual([100, 101])
  })

  test('callback failure preserves original error and closes audit stacks while unfinished output cannot build', () => {
    const original = new Error('source resolver failed')
    const f = translation([raw(0x99, [65535, 2])], {
      mapIdForNum: () => {
        throw original
      },
    })
    const before = structuredClone(f.source)
    expect(() => f.ctx.registry!.registerTarget('L_100', 'e3', {}, f.ctx)).toThrow(original)
    expect(f.source).toEqual(before)
    expect(f.ctx.pathStack).toEqual([])
    expect(f.ctx.sourceAddressAuditStack).toEqual([])
    expect(() => f.ctx.registry!.build()).toThrow('未完成脚本')
  })
})
