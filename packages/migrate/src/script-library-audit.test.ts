import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deriveScriptChunk, type EnemyDef, normalizeScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { mapScenesStatic, type SourceCmd, type SourceScene } from './migrate-content.js'
import { makeGlobalScriptRoots } from './script-graph.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from './script-library-audit.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const pathOf = (path: string): string => `${root}${path}`
const json = <T>(path: string): T => JSON.parse(readFileSync(pathOf(path), 'utf8')) as T

describe('全库脚本去内联门禁', () => {
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

  test('294 个有效场景满足三重 10x、ref 完整、chunk/root/驻留上限', () => {
    const scenes: SourceScene[] = []
    const events = new Map<number, SourceCmd[]>()
    for (let id = 0; existsSync(pathOf(`data/extracted/data/scene/${id}.json`)); id++) {
      scenes.push(json(`data/extracted/data/scene/${id}.json`))
      const path = `data/extracted/events/scene-${String(id).padStart(3, '0')}.json`
      if (existsSync(pathOf(path)))
        events.set(
          id,
          json<{ segments: { commands: SourceCmd[] }[] }>(path).segments.flatMap((x) => x.commands),
        )
    }
    events.set(
      -1,
      json<{ segments: { commands: SourceCmd[] }[] }>(
        'data/extracted/events/shared.json',
      ).segments.flatMap((x) => x.commands),
    )
    const sourceText = readFileSync(pathOf('data/extracted/events/all.json'), 'utf8')
    const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
    events.set(
      -2,
      sourceJson.segments.flatMap((x) => x.commands),
    )
    const items = json<
      Array<{
        scriptOnUse: number
        scriptOnEquip: number
        scriptOnThrow: number
        scriptDesc: number
      }>
    >('data/extracted/data/items.json')
    const spells = json<
      Array<{ scriptOnUse: number; scriptOnSuccess: number; scriptDesc: number }>
    >('data/extracted/data/spells.json')
    const enemies = json<
      Array<{ scriptOnTurnStart: number; scriptOnBattleEnd: number; scriptOnReady: number }>
    >('data/extracted/data/enemy-objects.json')
    const actors = json<Array<{ scriptOnFriendDeath: number; scriptOnDying: number }>>(
      'data/extracted/data/object-players.json',
    )
    const globalRoots = makeGlobalScriptRoots({
      items: items.flatMap((item) => [
        item.scriptOnUse,
        item.scriptOnEquip,
        item.scriptOnThrow,
        item.scriptDesc,
      ]),
      skills: spells.flatMap((spell) => [
        spell.scriptOnUse,
        spell.scriptOnSuccess,
        spell.scriptDesc,
      ]),
      enemies: enemies.flatMap((enemy) => [
        enemy.scriptOnTurnStart,
        enemy.scriptOnBattleEnd,
        enemy.scriptOnReady,
      ]),
      actors: actors.flatMap((actor) => [actor.scriptOnFriendDeath, actor.scriptOnDying]),
    })
    const migrated = mapScenesStatic(scenes, events, new Map(), globalRoots)
    const productEnemies = json<EnemyDef[]>('projects/pal/content/enemies.json')
    const globalCommandRoots = productEnemies.flatMap((enemy) => [
      ...(enemy.choreography ?? []).map((hook, index) => ({
        id: `global/enemies/${enemy.id}/choreography-${index}`,
        body: hook.body,
      })),
      ...(enemy.onDefeated?.length
        ? [{ id: `global/enemies/${enemy.id}/on-defeated`, body: enemy.onDefeated }]
        : []),
    ])
    const audit = auditScriptLibrary({
      sourceJson,
      sourcePrettyBytes: new TextEncoder().encode(sourceText).byteLength,
      sourceCommandCount: sourceJson.segments.reduce(
        (sum, segment) => sum + segment.commands.length,
        0,
      ),
      scenes: migrated.scenes,
      index: migrated.scriptIndex,
      chunks: migrated.scriptChunks,
      extraRoots: globalCommandRoots,
    })
    expect(() => assertScriptLibraryAudit(audit)).not.toThrow()
    expect(migrated.scenes).toHaveLength(294)
    expect(migrated.scriptGraphReport.commands).toBe(43_503)
    expect(migrated.scriptGraphReport.globalRoots).toBeGreaterThan(0)
    expect(migrated.scriptGraphReport.edges.execution).toBeGreaterThan(0)
    expect(migrated.scriptReport.flowCuts).toBe(0)
    expect(migrated.scriptReport.gaps).toEqual([])
    // 旧产物 46 个节点来自 34 个可达源站点被不同 owner 重复展开；报告按源地址去重。
    expect(migrated.scriptReport.knownNoOps['0x78']).toBe(34)
    const resolvedByAddress = new Map(
      migrated.scriptReport.resolvedAddressTargets.map((target) => [
        target.address,
        target.operation,
      ]),
    )
    expect(
      [
        3746, 3925, 7469, 7566, 14461, 15968, 15999, 17178, 17500, 17718, 19309, 19829, 20355,
        21220, 23511,
      ].map((address) => [address, resolvedByAddress.get(address)]),
    ).toEqual([
      [3746, 'end'],
      [3925, 'raw:0x5'],
      [7469, 'raw:0x5'],
      [7566, 'end'],
      [14461, 'raw:0x5'],
      [15968, 'raw:0x5'],
      [15999, 'raw:0x5'],
      [17178, 'end'],
      [17500, 'setDialogStyleBottom'],
      [17718, 'raw:0x5'],
      [19309, 'end'],
      [19829, 'raw:0x5'],
      [20355, 'raw:0x5'],
      [21220, 'raw:0x5'],
      [23511, 'end'],
    ])
    expect(audit.ratios.normalized).toBeLessThan(3)
    expect(audit.ratios.pretty).toBeLessThan(3)
    expect(audit.ratios.commands).toBeLessThan(3)
    expect(audit.largestChunks[0]!.bytes).toBeLessThan(1024 * 1024)
  }, 15_000)
})
