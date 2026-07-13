import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { EnemyDef } from '@type-pal/content'
import { mapScenesStatic, type SourceCmd, type SourceScene } from './migrate-content.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from './script-library-audit.js'
import { makeGlobalScriptRoots } from './script-graph.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const pathOf = (path: string): string => `${root}${path}`
const json = <T>(path: string): T => JSON.parse(readFileSync(pathOf(path), 'utf8')) as T

describe('全库脚本去内联门禁', () => {
  test('295 场景满足三重 10x、ref 完整、chunk/root/驻留上限', () => {
    const scenes: SourceScene[] = []
    const events = new Map<number, SourceCmd[]>()
    for (let id = 0; existsSync(pathOf(`data/extracted/data/scene/${id}.json`)); id++) {
      scenes.push(json(`data/extracted/data/scene/${id}.json`))
      const path = `data/extracted/events/scene-${String(id).padStart(3, '0')}.json`
      if (existsSync(pathOf(path)))
        events.set(id, json<{ segments: { commands: SourceCmd[] }[] }>(path).segments.flatMap((x) => x.commands))
    }
    events.set(-1, json<{ segments: { commands: SourceCmd[] }[] }>('data/extracted/events/shared.json').segments.flatMap((x) => x.commands))
    const sourceText = readFileSync(pathOf('data/extracted/events/all.json'), 'utf8')
    const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
    events.set(-2, sourceJson.segments.flatMap((x) => x.commands))
    const items = json<Array<{ scriptOnUse: number; scriptOnEquip: number; scriptOnThrow: number; scriptDesc: number }>>('data/extracted/data/items.json')
    const spells = json<Array<{ scriptOnUse: number; scriptOnSuccess: number; scriptDesc: number }>>('data/extracted/data/spells.json')
    const enemies = json<Array<{ scriptOnTurnStart: number; scriptOnBattleEnd: number; scriptOnReady: number }>>('data/extracted/data/enemy-objects.json')
    const actors = json<Array<{ scriptOnFriendDeath: number; scriptOnDying: number }>>('data/extracted/data/object-players.json')
    const globalRoots = makeGlobalScriptRoots({
      items: items.flatMap((item) => [item.scriptOnUse, item.scriptOnEquip, item.scriptOnThrow, item.scriptDesc]),
      skills: spells.flatMap((spell) => [spell.scriptOnUse, spell.scriptOnSuccess, spell.scriptDesc]),
      enemies: enemies.flatMap((enemy) => [enemy.scriptOnTurnStart, enemy.scriptOnBattleEnd, enemy.scriptOnReady]),
      actors: actors.flatMap((actor) => [actor.scriptOnFriendDeath, actor.scriptOnDying]),
    })
    const migrated = mapScenesStatic(scenes, events, [], globalRoots)
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
      sourceCommandCount: sourceJson.segments.reduce((sum, segment) => sum + segment.commands.length, 0),
      scenes: migrated.scenes,
      index: migrated.scriptIndex,
      chunks: migrated.scriptChunks,
      extraRoots: globalCommandRoots,
    })
    expect(() => assertScriptLibraryAudit(audit)).not.toThrow()
    expect(migrated.scenes).toHaveLength(295)
    expect(migrated.scriptGraphReport.commands).toBe(43_503)
    expect(migrated.scriptGraphReport.globalRoots).toBeGreaterThan(0)
    expect(migrated.scriptGraphReport.edges.execution).toBeGreaterThan(0)
    expect(audit.ratios.normalized).toBeLessThan(3)
    expect(audit.ratios.pretty).toBeLessThan(3)
    expect(audit.ratios.commands).toBeLessThan(3)
    expect(audit.largestChunks[0]!.bytes).toBeLessThan(1024 * 1024)
  }, 15_000)
})
