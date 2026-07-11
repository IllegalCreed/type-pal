/**
 * boss 对话遭遇绑定迁移(二阶段 clean 架构,作者拍板 2026-07-11)。
 *
 * 把带 gate(原版 0x79 队伍门 / 0x90 说一次)的 boss 敌种的回合台词,从**敌种 def**「搬」到它的
 * **boss 遭遇**(scene 脚本里那条 startBattle),并从 def 删除 —— 消掉原版敌种绑定的莫名判断:
 * 同敌种作 boss 说台词、作杂兵闭嘴,天然由「哪场遭遇」决定。
 *
 * boss 场自动识别规则(实测可靠):**该敌种领衔队(members[0]==敌种)的 scene startBattle**。
 * 杂兵混编里 boss 敌种不在首领位 → 那场不 attach。例:
 *  - 六脚蜘蛛 team-42(solo)→ s138 酒剑仙救场
 *  - 刀手 team-22 领衔 → s021(team-33 首领是别人,刀手杂兵位,不 attach)
 *  - 石长老 team-37 领衔 → s106(team-34 杂兵位不 attach)
 *  - 女飞贼 team-29(solo)→ s086/s093
 *
 * 无 gate 的敌种(固有台词,每次遇到都说)留 def —— 战斗建队回落取之(见 main encounterChoreo)。
 * 胖苗/绿叶(0x79 台词卡敌 AI 翻译未进来)choreography 空,无可搬,略过(pre-existing gap)。
 *
 * 用法:pnpm --filter @type-pal/migrate exec tsx scripts/patch-boss-encounters.mts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EnemyDef, SceneDef } from '@type-pal/content'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
const writeJson = (rel: string, v: unknown): void => {
  writeFileSync(resolve(repo, rel), `${JSON.stringify(v, null, 2)}\n`)
}

// 领衔规则可靠的 boss 敌种(boss 场里该敌种是队伍首领 members[0];实测无误 attach)
const LEAD_BOSS = new Set(['enemy-435', 'enemy-454', 'enemy-478', 'enemy-496'])
// 显式 boss-map(非首领 boss:该敌种在 boss 队非首领位,领衔规则会误 attach 到它领衔的杂兵场)。
// 胖苗:boss 场 s020 水月宫(拜月教掳灵儿,team-19 首领是 495)—— 它领衔的 s246/s228/s229 是
// 苗疆杂兵场(灵儿已离队,原版 0x79 灵儿门正好 gate 掉),故仅 team-19 attach、领衔规则排除胖苗。
const EXPLICIT_BOSS: Record<string, number[]> = { 'enemy-485': [19] }
const BOSS_ENEMIES = new Set([...LEAD_BOSS, ...Object.keys(EXPLICIT_BOSS)])

const enemies = readJson<EnemyDef[]>('projects/pal/content/enemies.json')
const teams = readJson<{ id: string; members: string[] }[]>('projects/pal/content/enemy-teams.json')

// 敌种 → boss 队号:领衔规则(members[0]==敌种,仅 LEAD_BOSS)+ 显式 map
const leadTeamsOf = new Map<string, Set<number>>()
for (const t of teams) {
  const lead = t.members?.[0]
  if (lead && LEAD_BOSS.has(lead)) {
    const n = Number(t.id.replace('team-', ''))
    ;(leadTeamsOf.get(lead) ?? leadTeamsOf.set(lead, new Set()).get(lead)!).add(n)
  }
}
for (const [enemy, tns] of Object.entries(EXPLICIT_BOSS)) {
  const set = leadTeamsOf.get(enemy) ?? leadTeamsOf.set(enemy, new Set()).get(enemy)!
  for (const n of tns) set.add(n)
}
// boss 敌种 → choreography(搬运源)
const choreoOf = new Map<string, EnemyDef['choreography']>()
for (const e of enemies) {
  if (BOSS_ENEMIES.has(e.id) && e.choreography?.length) choreoOf.set(e.id, e.choreography)
}
// 领衔 team 号 → 该敌种 choreography(startBattle attach 查表)
const choreoByLeadTeam = new Map<number, { enemy: string; choreo: EnemyDef['choreography'] }>()
for (const [enemy, tset] of leadTeamsOf) {
  const choreo = choreoOf.get(enemy)
  if (!choreo) continue
  for (const tn of tset) choreoByLeadTeam.set(tn, { enemy, choreo })
}

// ── 场景 startBattle attach ──
const sceneDir = 'projects/pal/content/scenes'
const files = readdirSync(resolve(repo, sceneDir)).filter((f) => f.endsWith('.json') && f !== 'index.json')
let attached = 0
const attachedEnemies = new Set<string>()
for (const f of files) {
  const d = readJson<SceneDef>(`${sceneDir}/${f}`)
  const before = JSON.stringify(d)
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const x of o) walk(x)
    } else if (o && typeof o === 'object') {
      const c = o as { kind?: string; team?: number; choreography?: unknown }
      if (c.kind === 'startBattle' && c.team !== undefined && !c.choreography) {
        const hit = choreoByLeadTeam.get(c.team)
        if (hit) {
          c.choreography = hit.choreo
          attached++
          attachedEnemies.add(hit.enemy)
        }
      }
      for (const v of Object.values(o)) walk(v)
    }
  }
  walk(d)
  if (JSON.stringify(d) !== before) writeJson(`${sceneDir}/${f}`, d)
}

// ── 从 def 删除 boss 敌种 choreography(有 boss 队 + 有对话 = 对话已在/应在遭遇上;
//    幂等:不依赖本次是否 attach —— scene 上次已 attach 时 walk 会跳过,但 def 仍须删)──
let deleted = 0
for (const e of enemies) {
  if (choreoOf.has(e.id) && leadTeamsOf.has(e.id) && e.choreography) {
    delete (e as { choreography?: unknown }).choreography
    deleted++
  }
}
if (deleted) writeJson('projects/pal/content/enemies.json', enemies)

console.log(
  `[patch-boss-encounters] startBattle attach ${attached} 处 · def 删 choreography ${deleted} 敌种 [${[...choreoOf.keys()].filter((k) => leadTeamsOf.has(k)).join(', ')}]`,
)
void existsSync
void attachedEnemies
