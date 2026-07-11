/**
 * 0x6D 离线补丁(方案 A 修正版,作者拍板 2026-07-11)。
 *
 * 为什么不全量重生成:盘上产物在上次生成后积累了大量手工内容(playVideo 演出补丁、
 * 四技补录、coveredBy、隐蛊 use 块…),migrate:content 全量重写会全部冲掉(已实测,
 * 149 文件 2714 行删除)。本脚本只做 0x6D 的净效应,其余内容分毫不动:
 *
 *  1. 盘上场景里 `unmigrated opcode 0x6D`(改 enter,op1>0)站点 → 占位 setSceneStage;
 *  2. resolveSceneStagePatches:目标地址链翻译 → 追加为目标场景 onEnter 新段 + 回填下标
 *     (嵌套 0x6D 迭代回填;数字 next 平移;'advance' 保持);
 *  3. 新对白键(dlg./spk. 前缀)并入盘上 locale.json(不覆盖既有键);
 *  4. 只写回有变化的文件。幂等:已转换站点不再命中,重复跑零 diff。
 *
 * 用法:pnpm --filter @type-pal/migrate exec tsx scripts/patch-scene-stages.mts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SceneDef, SpriteDef } from '@type-pal/content'
import { resolveSceneStagePatches, type SourceCmd } from '../src/migrate-content.js'
import { emptyTranslateReport, type TranslateCtx } from '../src/translate-events.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
const writeJson = (rel: string, v: unknown): void => {
  writeFileSync(resolve(repo, rel), `${JSON.stringify(v, null, 2)}\n`)
}

// ── labelAt 全局索引 ──
// 关键:0x6D 目标地址是**全局指令下标**(label "L_N" 的 N = all.json commands 数组下标,
// 实测 L_3545 在 commands[3545])。但非跳转目标(如 0x65 换精灵)无显式 label 字段,故
// 不能只索引带 label 的条目 —— 必须为 all.json **每个下标**注册 L_<下标>,才能定位任意
// 0x6D 目标段首。all.json 是全局超集,翻译目标链时遇到的跳转/reset 目标一并可解析。
const allCommands = readJson<{ segments: { commands: SourceCmd[] }[] }>(
  'data/extracted/events/all.json',
).segments.flatMap((s) => s.commands)
const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
allCommands.forEach((_, i) => labelAt.set(`L_${i}`, { cmds: allCommands, idx: i }))

// ── 读盘上场景 ──
const sceneDir = 'projects/pal/content/scenes'
const files = readdirSync(resolve(repo, sceneDir)).filter(
  (f) => f.endsWith('.json') && f !== 'index.json',
)
const scenes: SceneDef[] = files.map((f) => readJson(`${sceneDir}/${f}`))
const before = new Map(scenes.map((s, i) => [i, JSON.stringify(scenes[i])]))

// ── sprite 注册表 + spriteIdForNum(0x6D 追加段的 0x65 换精灵 + 0x1A 大世界精灵覆写共用;
//    盘上 sprites.json 复用,首见 num 建 npc-<num>,与正常迁移 mapScenesStatic 同规则)──
const spritesPath = 'projects/pal/content/sprites.json'
const sprites = readJson<SpriteDef[]>(spritesPath)
const spriteById = new Map(sprites.map((s) => [s.id, s]))
const spriteIdByNum = new Map<number, string>()
for (const s of sprites) if (!spriteIdByNum.has(s.spriteNum)) spriteIdByNum.set(s.spriteNum, s.id)
let newSprites = 0
const spriteIdForNum = (num: number): string => {
  const hit = spriteIdByNum.get(num)
  if (hit) return hit
  const defId = `npc-${num}`
  if (!spriteById.has(defId)) {
    sprites.push({
      id: defId,
      spriteNum: num,
      label: `原精灵 ${num}(0x65 换装)`,
      layout: { kind: 'directional', framesPerDir: 3 },
    })
    spriteById.set(defId, sprites[sprites.length - 1]!)
    spriteIdByNum.set(num, defId)
    newSprites++
  }
  return defId
}
// roleId(0-based)→ 角色 template(0x1A o[2]-1;成年灵儿 role 1 = zhao-linger)
const ROLE_SLUGS = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao']

// ── ① 站点替换:0x6D → setSceneStage 占位;0x1A(形象字段)→ setActorAppearance ──
// swap 重建数组(非原地改)—— 0x1A 走路帧(field 64)要**丢弃**元素,需 map+filter。
let sites6d = 0
let sites1a = 0
type Cmd = { kind?: string; opcode?: number; operands?: number[] }
const swapCmd = (x: unknown): unknown | undefined => {
  const c = x as Cmd
  if (c?.kind !== 'unmigrated') return x
  const o = c.operands ?? []
  if (c.opcode === 0x6d && (o[1] ?? 0) > 0) {
    sites6d++
    return { kind: 'setSceneStage', scene: `s${String((o[0] ?? 1) - 1).padStart(3, '0')}`, stage: -1, _addr: o[1] }
  }
  if (c.opcode === 0x1a) {
    const actor = ROLE_SLUGS[(o[2] ?? 0) - 1]
    const field = o[0] ?? -1
    const val = o[1] ?? 0
    if (!actor) return x // o[2]=0(当前玩家)数据中未出现 → 保留 unmigrated
    if (field === 0) return sites1a++, { kind: 'setActorAppearance', actor, portrait: val }
    if (field === 1) return sites1a++, { kind: 'setActorAppearance', actor, battleSprite: val }
    if (field === 2) return sites1a++, { kind: 'setActorAppearance', actor, spriteId: spriteIdForNum(val) }
    if (field === 64) return sites1a++, undefined // 走路帧:新精灵 layout 自带,丢弃
    return x // 非形象字段 → 保留 unmigrated
  }
  return x
}
const swap = (o: unknown): unknown => {
  if (Array.isArray(o)) {
    const out: unknown[] = []
    for (const x of o) {
      const swapped = swapCmd(x)
      if (swapped === undefined) continue // field-64 丢弃
      out.push(swapped === x ? swap(x) : swapped)
    }
    return out
  }
  if (o && typeof o === 'object') {
    const r = o as Record<string, unknown>
    for (const k of Object.keys(r)) r[k] = swap(r[k])
    return r
  }
  return o
}
scenes.forEach((s, i) => {
  scenes[i] = swap(s) as SceneDef
})

// ── ② post-pass:追加段 + 回填(0x6D)──
const tctx: TranslateCtx = { labelAt, locale: {}, report: emptyTranslateReport(), spriteIdForNum }
resolveSceneStagePatches(scenes, tctx)
if (newSprites) writeJson(spritesPath, sprites)
const sites = sites6d

// ── ③ locale 合并(新键不覆盖既有)──
const localePath = 'projects/pal/content/locale.json'
const locale = readJson<Record<string, string>>(localePath)
let newKeys = 0
for (const [k, v] of Object.entries(tctx.locale)) {
  if (!(k in locale)) {
    locale[k] = v
    newKeys++
  }
}
if (newKeys) writeJson(localePath, locale)

// ── ④ 只写回有变化的场景 ──
let written = 0
scenes.forEach((s, i) => {
  if (JSON.stringify(s) !== before.get(i)) {
    writeJson(`${sceneDir}/${files[i]}`, s)
    written++
  }
})

console.log(
  `[patch-scene-stages] 0x6D 站点 ${sites} · 0x1A 形象站点 ${sites1a} · 场景写回 ${written} · locale 新键 ${newKeys} · sprites +${newSprites}`,
)
const un = Object.entries(tctx.report.unmigrated)
if (un.length) console.log('  翻译缺口:', un.map(([k, v]) => `${k}×${v}`).join(' / '))
