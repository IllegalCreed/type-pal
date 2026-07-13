/**
 * M1 迁移器 IO 壳:data/extracted → projects/pal(复刻载体工程)。
 * 用法:pnpm --filter @type-pal/migrate run migrate:content
 * 纯逻辑在 ../src/migrate-content.ts(vitest golden 钉真值);本脚本只做读盘/合并/写盘/复制资产。
 * 可重复跑(全量重写 projects/pal 的 content;assets 覆盖复制)。
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type MigrateSources,
  mapScenesStatic,
  mergeSceneScriptBindings,
  migrateAll,
  type SourceCmd,
  type SourceScene,
  sceneSlug,
} from '../src/migrate-content.js'
import { assertScriptLibraryAudit, auditScriptLibrary } from '../src/script-library-audit.js'
import { makeGlobalScriptRoots } from '../src/script-graph.js'
import type { EnemyDef, SceneDef } from '@type-pal/content'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
const writeJson = (rel: string, v: unknown): void => {
  const p = resolve(repo, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`)
}

// ── 源 ──
const allJson = readJson<{ segments: { commands: SourceCmd[] }[] }>(
  'data/extracted/events/all.json',
)
const src: MigrateSources = {
  roles: readJson<{ roles: MigrateSources['roles'] }>('data/extracted/data/player-roles.json')
    .roles,
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
const objectPlayers = readJson<Array<{ scriptOnFriendDeath: number; scriptOnDying: number }>>(
  'data/extracted/data/object-players.json',
)
const globalRoots = makeGlobalScriptRoots({
  items: src.items.flatMap((item) => [
    item.scriptOnUse,
    item.scriptOnEquip,
    item.scriptOnThrow,
    item.scriptDesc,
  ]),
  skills: src.spells.flatMap((spell) => [
    spell.scriptOnUse,
    spell.scriptOnSuccess,
    spell.scriptDesc,
  ]),
  enemies: (src.enemyObjects ?? []).flatMap((enemy) => [
    enemy.scriptOnTurnStart,
    enemy.scriptOnBattleEnd,
    enemy.scriptOnReady,
  ]),
  actors: objectPlayers.flatMap((actor) => [actor.scriptOnFriendDeath, actor.scriptOnDying]),
})

// ── M2b:295 场景静态迁移 + 入口/音乐窄扫描 ──
const srcScenes: SourceScene[] = []
const eventsByScene = new Map<number, SourceCmd[]>()
for (let n = 0; existsSync(resolve(repo, `data/extracted/data/scene/${n}.json`)); n++) {
  srcScenes.push(readJson<SourceScene>(`data/extracted/data/scene/${n}.json`))
  const evPath = `data/extracted/events/scene-${String(n).padStart(3, '0')}.json`
  if (existsSync(resolve(repo, evPath))) {
    const ev = readJson<{ segments: { commands: SourceCmd[] }[] }>(evPath)
    eventsByScene.set(
      n,
      ev.segments.flatMap((sg) => sg.commands),
    )
  }
}
// 共享段(跨场景 label,如 autoScript 公共巡逻/朝向链)以 key -1 挂入 label 全局索引
if (existsSync(resolve(repo, 'data/extracted/events/shared.json'))) {
  const ev = readJson<{ segments: { commands: SourceCmd[] }[] }>(
    'data/extracted/events/shared.json',
  )
  eventsByScene.set(
    -1,
    ev.segments.flatMap((sg) => sg.commands),
  )
}
// 全流兜底(key -2,label 索引后置:场景/共享文件优先):跳进战斗侧等未分区段的目标
eventsByScene.set(
  -2,
  allJson.segments.flatMap((sg) => sg.commands),
)
const DEBUG_SCENES = process.env.MIG_DEBUG === '1'
if (DEBUG_SCENES) {
  // 逐场景跑,找翻译爆点
  for (const sc of srcScenes) {
    process.stderr.write(`scene ${sc.sceneId}...`)
    const t0 = Date.now()
    const one = mapScenesStatic([sc], eventsByScene, out.sprites, globalRoots)
    process.stderr.write(` cmds=${one.scriptReport.commands} ${Date.now() - t0}ms\n`)
  }
  process.exit(0)
}
const scenesOut = mapScenesStatic(srcScenes, eventsByScene, out.sprites, globalRoots)
const productEnemies = readJson<EnemyDef[]>('projects/pal/content/enemies.json')
const globalCommandRoots = productEnemies.flatMap((enemy) => [
  ...(enemy.choreography ?? []).map((hook, index) => ({
    id: `global/enemies/${enemy.id}/choreography-${index}`,
    body: hook.body,
  })),
  ...(enemy.onDefeated?.length
    ? [{ id: `global/enemies/${enemy.id}/on-defeated`, body: enemy.onDefeated }]
    : []),
])

// ── M3 门禁:先审后写，失败时磁盘保持原样 ──
const sourceText = readFileSync(resolve(repo, 'data/extracted/events/all.json'), 'utf8')
const audit = auditScriptLibrary({
  sourceJson: allJson,
  sourcePrettyBytes: Buffer.byteLength(sourceText),
  sourceCommandCount: src.commands.length,
  scenes: scenesOut.scenes,
  index: scenesOut.scriptIndex,
  chunks: scenesOut.scriptChunks,
  extraRoots: globalCommandRoots,
})
assertScriptLibraryAudit(audit)

// ── M3 白名单写盘:只改脚本绑定 + scripts 目录，绝不覆盖其他手工内容域 ──
for (const fresh of scenesOut.scenes) {
  const path = `projects/pal/content/scenes/${fresh.id}.json`
  const disk = existsSync(resolve(repo, path)) ? readJson<SceneDef>(path) : fresh
  writeJson(path, mergeSceneScriptBindings(disk, fresh))
}
const scriptsRoot = resolve(repo, 'projects/pal/content/scripts')
rmSync(scriptsRoot, { recursive: true, force: true })
writeJson('projects/pal/content/scripts/index.json', scenesOut.scriptIndex)
for (const [id, chunk] of Object.entries(scenesOut.scriptChunks)) {
  const meta = scenesOut.scriptIndex.chunks[id]
  if (!meta) throw new Error(`scripts index 缺 chunk ${id}`)
  writeJson(`projects/pal/content/scripts/${meta.path}`, chunk)
}

// ── 报告 ──
console.log(`[migrate:content] projects/pal 已生成:`)
console.log(
  `  actors ${out.actors.length}(本次不写盘,保护手工内容)`,
)
console.log(
  `  sprites ${out.sprites.length + scenesOut.sprites.length} · items ${out.items.length} · skills ${out.skills.skills.length}(本次均不写盘)`,
)
console.log(
  `  levelUp 角色数 ${Object.keys(out.skills.levelUp).length} · 脚本 locale 键 ${Object.keys(scenesOut.scriptLocale).length}(沿用盘上 locale)`,
)
const sr = scenesOut.scriptReport
const unmigTotal = Object.values(sr.unmigrated).reduce((a, b) => a + b, 0)
console.log(
  `  脚本翻译(M3a):链 ${sr.chains} · 段 ${sr.stages} · 命令 ${sr.commands} · unmigrated ${unmigTotal}(流截断 ${sr.flowCuts})`,
)
console.log(
  `  脚本库(M3):chunk ${Object.keys(scenesOut.scriptChunks).length} · ratio compact ${audit.ratios.normalized.toFixed(2)}x / pretty ${audit.ratios.pretty.toFixed(2)}x / nodes ${audit.ratios.commands.toFixed(2)}x · 最大 chunk ${audit.largestChunks[0]?.id ?? '-'} ${audit.largestChunks[0]?.bytes ?? 0}B · 最大依赖闭包 ${audit.maxDependencyClosureBytes}B`,
)
const gr = scenesOut.scriptGraphReport
console.log(
  `  CFG(M3):命令 ${gr.commands} · 根 ${gr.roots}(global ${gr.globalRoots}) · 边 exec/bind/recovery ${gr.edges.execution}/${gr.edges.binding}/${gr.edges.recovery} · SCC ${gr.components}(环 ${gr.cyclicComponents}) · 归属 scene/shared/global/unreachable ${gr.ownership.scene}/${gr.ownership.shared}/${gr.ownership.global}/${gr.ownership.unreachable}`,
)
console.log(
  `    前驱 Top20:${gr.topPredecessors.map((x) => `L_${x.entry}×${x.count}`).join(' / ')}`,
)
console.log(
  `    chunk Top20:${audit.largestChunks.map((x) => `${x.id} ${x.bytes}B`).join(' / ')}`,
)
console.log(
  `    root Top20:${audit.largestRoots.map((x) => `${x.id} ${x.bytes}B`).join(' / ')}`,
)
const top = Object.entries(sr.unmigrated)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
console.log(`    缺口 Top:${top.map(([k, v]) => `${k}×${v}`).join(' / ')}`)
console.log(
  `  装备效果(M1b):${out.items.filter((i) => i.equip).length} 件已翻;pending op ${out.report.pendingEquip.flatMap((p) => p.ops).length}(战斗精灵切换/毒疗)`,
)
console.log(
  `  技能 pending ${out.report.pendingSkills.length}(summon ${out.report.pendingSkills.filter((p) => p.reason.includes('summon')).length} / 动态公式 ${out.report.pendingSkills.filter((p) => p.reason.includes('scriptOnUse')).length});有损注 ${out.report.lossySkills.length}`,
)
console.log(
  `  场景(M2b):${scenesOut.report.scenes} 静态迁(实体 ${scenesOut.report.entities}/触发区跳 ${scenesOut.report.triggerZonesSkipped}/隐藏 ${scenesOut.report.hidden});入口对 ${scenesOut.report.entriesFound}(start ${scenesOut.report.scenesWithStart}/兜底 ${scenesOut.report.entryFallback.length});音乐 ${scenesOut.report.scenesWithMusic};精灵登记 ${scenesOut.sprites.length}(布局冲突 ${scenesOut.report.layoutConflicts.length}/自循环候选 ${scenesOut.report.autoLoopCandidates})`,
)
console.log(
  `  使用效果(M1d):${out.items.filter((i) => i.use).length} 件已翻;pending ${out.report.pendingUse.length}(灵珠剧情/毒杀/遇敌香/蛊系→对应系统);有损注 ${out.report.lossyUse.length}`,
)
console.log(
  `  敌人(M4a):${out.enemies.length} 迁(有 AI 脚本 ${out.enemyReport?.withScript ?? 0};越界 enemyId ${out.enemyReport?.danglingEnemyId.length ?? 0})`,
)
{
  const ps = out.enemyReport?.pendingScripts ?? []
  const ai = out.enemies.filter((e) => e.ai.rules?.length).length
  const ch = out.enemies.filter((e) => e.choreography?.length).length
  const od = out.enemies.filter((e) => e.onDefeated?.length).length
  console.log(
    `  敌 AI(M4c):规则敌 ${ai} · 演出 ${ch} · 战后 ${od};脚本翻不净 ${ps.length}${
      ps.length
        ? ` → ${ps
            .slice(0, 6)
            .map((p) => p.name)
            .join('/')}${ps.length > 6 ? '…' : ''}`
        : ''
    }`,
  )
}
console.log(
  `  敌队(M4b):${out.enemyTeams.length} 队(空成员引用 ${out.enemyTeamReport?.danglingMember.length ?? 0})`,
)
if (out.report.blockedDescs.length)
  console.log(
    `  ⚠ desc 护栏命中 ${out.report.blockedDescs.length}(待手修):`,
    out.report.blockedDescs.slice(0, 5),
  )
