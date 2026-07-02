/**
 * M1 迁移器 IO 壳:data/extracted → projects/pal(复刻载体工程)。
 * 用法:pnpm --filter @type-pal/migrate run migrate:content
 * 纯逻辑在 ../src/migrate-content.ts(vitest golden 钉真值);本脚本只做读盘/合并/写盘/复制资产。
 * 可重复跑(全量重写 projects/pal 的 content;assets 覆盖复制)。
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  mergeExtras,
  migrateAll,
  type MigrateSources,
  type SourceCmd,
} from '../src/migrate-content.js'
import type { ActorDef, SpriteDef } from '@type-pal/content'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
const writeJson = (rel: string, v: unknown): void => {
  const p = resolve(repo, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`)
}

// ── 源 ──
const allJson = readJson<{ segments: { commands: SourceCmd[] }[] }>('data/extracted/events/all.json')
const src: MigrateSources = {
  roles: readJson<{ roles: MigrateSources['roles'] }>('data/extracted/data/player-roles.json').roles,
  levelUpExp: readJson('data/extracted/data/level-up-exp.json'),
  levelUpMagic: readJson('data/extracted/data/level-up-magic.json'),
  spells: readJson('data/extracted/data/spells.json'),
  magic: readJson('data/extracted/data/magic.json'),
  items: readJson('data/extracted/data/items.json'),
  commands: allJson.segments.flatMap((s) => s.commands),
}
const out = migrateAll(src)

// ── 与 demo 手作合并(youhun/ghost 等 demo 独有条目保留;工程底座种自 demo)──
const demoActors = readJson<ActorDef[]>('projects/demo/content/actors.json')
const demoSprites = readJson<SpriteDef[]>('projects/demo/content/sprites.json')
const demoLocale = readJson<Record<string, string>>('projects/demo/content/locale.json')
const demoScenes = readJson<unknown>('projects/demo/content/scenes.json')
const demoManifest = readJson<Record<string, unknown>>('projects/demo/manifest.json')

const actors = mergeExtras(out.actors, demoActors)
const sprites = mergeExtras(out.sprites, demoSprites)
const locale = { ...demoLocale, ...out.localeNames }

// ── 写 projects/pal ──
writeJson('projects/pal/manifest.json', {
  ...demoManifest,
  id: 'pal',
  name: '仙剑奇侠传·复刻(M1 迁移中)',
})
writeJson('projects/pal/content/actors.json', actors)
writeJson('projects/pal/content/sprites.json', sprites)
writeJson('projects/pal/content/items.json', out.items)
writeJson('projects/pal/content/skills.json', out.skills)
writeJson('projects/pal/content/locale.json', locale)
writeJson('projects/pal/content/scenes.json', demoScenes) // M2 前:场景种自 demo(可启动)
cpSync(resolve(repo, 'projects/demo/assets'), resolve(repo, 'projects/pal/assets'), { recursive: true })

// ── 报告 ──
console.log(`[migrate:content] projects/pal 已生成:`)
console.log(`  actors ${actors.length}(迁移 ${out.actors.length} + demo 独有 ${actors.length - out.actors.length})`)
console.log(`  sprites ${sprites.length} · items ${out.items.length} · skills ${out.skills.skills.length}(纯伤害 57 + curated 3)`)
console.log(`  levelUp 角色数 ${Object.keys(out.skills.levelUp).length} · locale 键 ${Object.keys(locale).length}`)
console.log(`  待 M1b:装备效果 ${src.items.filter((i) => i.flags.equipable).length} 件`)
console.log(`  待 M1c:技能 ${out.report.pendingSkills.length} 个(summon ${out.report.pendingSkills.filter((p) => p.reason.includes('summon')).length} / 脚本 ${out.report.pendingSkills.filter((p) => p.reason.includes('脚本')).length})`)
console.log(`  待 M1d:使用效果 ${src.items.filter((i) => i.flags.usable).length} 件`)
if (out.report.blockedDescs.length) console.log(`  ⚠ desc 护栏命中 ${out.report.blockedDescs.length}(待手修):`, out.report.blockedDescs.slice(0, 5))
