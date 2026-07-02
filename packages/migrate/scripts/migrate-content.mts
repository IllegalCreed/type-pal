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
  mapScenesStatic,
  mergeExtras,
  migrateAll,
  sceneSlug,
  type MigrateSources,
  type SourceCmd,
  type SourceScene,
} from '../src/migrate-content.js'
import { existsSync } from 'node:fs'
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

// ── M2b:295 场景静态迁移 + 入口/音乐窄扫描 ──
const srcScenes: SourceScene[] = []
const eventsByScene = new Map<number, SourceCmd[]>()
for (let n = 0; existsSync(resolve(repo, `data/extracted/data/scene/${n}.json`)); n++) {
  srcScenes.push(readJson<SourceScene>(`data/extracted/data/scene/${n}.json`))
  const evPath = `data/extracted/events/scene-${String(n).padStart(3, '0')}.json`
  if (existsSync(resolve(repo, evPath))) {
    const ev = readJson<{ segments: { commands: SourceCmd[] }[] }>(evPath)
    eventsByScene.set(n, ev.segments.flatMap((sg) => sg.commands))
  }
}
const scenesOut = mapScenesStatic(srcScenes, eventsByScene)

// ── 与 demo 手作合并(youhun/ghost 等 demo 独有条目保留;工程底座种自 demo)──
const demoActors = readJson<ActorDef[]>('projects/demo/content/actors.json')
const demoSprites = readJson<SpriteDef[]>('projects/demo/content/sprites.json')
const demoLocale = readJson<Record<string, string>>('projects/demo/content/locale.json')
const demoSceneIds = readJson<string[]>('projects/demo/content/scenes/index.json')
const demoScenes = demoSceneIds.map((id) => readJson<{ id: string }>(`projects/demo/content/scenes/${id}.json`))
const demoManifest = readJson<Record<string, unknown>>('projects/demo/manifest.json')

const actors = mergeExtras(out.actors, demoActors)
const sprites = mergeExtras([...out.sprites, ...scenesOut.sprites], demoSprites)
const locale = { ...demoLocale, ...out.localeNames }

// ── 写 projects/pal ──
writeJson('projects/pal/manifest.json', {
  ...demoManifest,
  id: 'pal',
  name: '仙剑奇侠传·复刻(M2 迁移中)',
  // pal 资源指向共享提取源(可再生;免拷 221 张图进仓)。demo 保持自包含范例。
  assets: { root: '/extracted/data', maps: 'tilemap', tilesets: 'tileset', sprites: 'sprite', palettes: 'palette' },
})
writeJson('projects/pal/content/actors.json', actors)
writeJson('projects/pal/content/sprites.json', sprites)
writeJson('projects/pal/content/items.json', out.items)
writeJson('projects/pal/content/skills.json', out.skills)
writeJson('projects/pal/content/locale.json', locale)
// M2b per-scene:demo 底座场景 + 295 原版静态场景
const allSceneIds = [...demoScenes.map((s) => s.id), ...scenesOut.scenes.map((s) => s.id)]
writeJson('projects/pal/content/scenes/index.json', allSceneIds)
for (const sc of demoScenes) writeJson(`projects/pal/content/scenes/${sc.id}.json`, sc)
for (const sc of scenesOut.scenes) writeJson(`projects/pal/content/scenes/${sc.id}.json`, sc)
cpSync(resolve(repo, 'projects/demo/assets'), resolve(repo, 'projects/pal/assets'), { recursive: true })

// ── 报告 ──
console.log(`[migrate:content] projects/pal 已生成:`)
console.log(`  actors ${actors.length}(迁移 ${out.actors.length} + demo 独有 ${actors.length - out.actors.length})`)
console.log(`  sprites ${sprites.length} · items ${out.items.length} · skills ${out.skills.skills.length}(纯伤害 57 + 线性脚本 18 + 门类 5)`)
console.log(`  levelUp 角色数 ${Object.keys(out.skills.levelUp).length} · locale 键 ${Object.keys(locale).length}`)
console.log(`  装备效果(M1b):${out.items.filter((i) => i.equip).length} 件已翻;pending op ${out.report.pendingEquip.flatMap((p) => p.ops).length}(战斗精灵切换/毒疗)`)
console.log(`  技能 pending ${out.report.pendingSkills.length}(summon ${out.report.pendingSkills.filter((p) => p.reason.includes('summon')).length} / 动态公式 ${out.report.pendingSkills.filter((p) => p.reason.includes('scriptOnUse')).length});有损注 ${out.report.lossySkills.length}`)
console.log(`  场景(M2b):${scenesOut.report.scenes} 静态迁(实体 ${scenesOut.report.entities}/触发区跳 ${scenesOut.report.triggerZonesSkipped}/隐藏 ${scenesOut.report.hidden});入口对 ${scenesOut.report.entriesFound}(start ${scenesOut.report.scenesWithStart}/兜底 ${scenesOut.report.entryFallback.length});音乐 ${scenesOut.report.scenesWithMusic};精灵登记 ${scenesOut.sprites.length}(布局冲突 ${scenesOut.report.layoutConflicts.length}/自循环候选 ${scenesOut.report.autoLoopCandidates})`)
console.log(`  使用效果(M1d):${out.items.filter((i) => i.use).length} 件已翻;pending ${out.report.pendingUse.length}(灵珠剧情/毒杀/遇敌香/蛊系→对应系统);有损注 ${out.report.lossyUse.length}`)
if (out.report.blockedDescs.length) console.log(`  ⚠ desc 护栏命中 ${out.report.blockedDescs.length}(待手修):`, out.report.blockedDescs.slice(0, 5))
