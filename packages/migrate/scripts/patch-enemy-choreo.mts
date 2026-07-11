/**
 * 敌 AI choreography 针对性重生成(0x90 敌自清补全 —— 刀手/胖苗「说一次」跨战斗)。
 *
 * enemies.json 是纯迁移产物(改动史全是 migrate/M4c/B9,无手工编辑),可安全重生成。本脚本
 * 只重跑 migrateAll 取 out.enemies,**只写回 enemies.json + 合并 locale 新键**(不碰
 * scenes/items/skills/actors —— 那些有手工内容,全量迁移会冲掉)。
 *
 * 用法:pnpm --filter @type-pal/migrate exec tsx scripts/patch-enemy-choreo.mts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EnemyDef } from '@type-pal/content'
import { type MigrateSources, migrateAll, type SourceCmd } from '../src/migrate-content.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
const writeJson = (rel: string, v: unknown): void => {
  writeFileSync(resolve(repo, rel), `${JSON.stringify(v, null, 2)}\n`)
}

const allJson = readJson<{ segments: { commands: SourceCmd[] }[] }>('data/extracted/events/all.json')
const src: MigrateSources = {
  roles: readJson<{ roles: MigrateSources['roles'] }>('data/extracted/data/player-roles.json').roles,
  levelUpExp: readJson('data/extracted/data/level-up-exp.json'),
  levelUpMagic: readJson('data/extracted/data/level-up-magic.json'),
  spells: readJson('data/extracted/data/spells.json'),
  magic: readJson('data/extracted/data/magic.json'),
  items: readJson('data/extracted/data/items.json'),
  commands: allJson.segments.flatMap((s) => s.commands),
  enemies: readJson('data/extracted/data/enemies.json'),
  enemyObjects: readJson('data/extracted/data/enemy-objects.json'),
  enemyTeams: readJson('data/extracted/data/enemy-teams.json'),
}
const out = migrateAll(src)

// 只更新 choreography 有变化的敌种(预期:刀手 enemy-454 末尾多 clearEnemyChoreo)
const disk = readJson<EnemyDef[]>('projects/pal/content/enemies.json')
const byId = new Map(out.enemies.map((e) => [e.id, e]))
let changed = 0
const changedIds: string[] = []
for (const d of disk) {
  const fresh = byId.get(d.id)
  if (!fresh) continue
  if (JSON.stringify(fresh.choreography ?? []) !== JSON.stringify(d.choreography ?? [])) {
    d.choreography = fresh.choreography
    changed++
    changedIds.push(d.id)
  }
}
if (changed) writeJson('projects/pal/content/enemies.json', disk)

// locale 合并(敌战斗对白新键 —— 敌 AI 翻译走 out.localeNames,统一对话 locale;0x79 内联的
// 胖苗/绿叶台词键即在此。含场景 scriptLocale 兜底)
const localePath = 'projects/pal/content/locale.json'
const locale = existsSync(resolve(repo, localePath)) ? readJson<Record<string, string>>(localePath) : {}
let newKeys = 0
for (const [k, v] of Object.entries({ ...out.localeNames, ...out.scriptLocale })) {
  if (!(k in locale)) {
    locale[k] = v
    newKeys++
  }
}
if (newKeys) writeJson(localePath, locale)

console.log(`[patch-enemy-choreo] choreography 更新 ${changed} 敌种 [${changedIds.join(', ')}] · locale 新键 ${newKeys}`)
