/**
 * 场景脚本离线补丁(方案 A,作者拍板 2026-07-11)—— 剧情侧未迁移 op 的针对性转换。
 *
 * 为什么不全量重生成:盘上产物在上次生成后积累了大量手工内容(playVideo 演出补丁、
 * 四技补录、coveredBy、隐蛊 use 块…),migrate:content 全量重写会全部冲掉(已实测,
 * 149 文件 2714 行删除)。本脚本只做以下净效应,其余内容分毫不动:
 *
 *  · 0x6D(改场景进场剧情)→ setSceneStage:目标地址链追加为目标场景 onEnter 新段 + 回填
 *    (resolveSceneStagePatches;嵌套迭代;数字 next 平移;'advance' 保持;(scene,addr) 去重);
 *  · 0x1A(改角色形象)→ setActorAppearance:SoA 字段 0头像/1战斗精灵/2大世界精灵→id/64走路帧丢弃;
 *  · 0x90(剧情侧清敌种回合演出)→ clearEnemyChoreo:六脚蜘蛛 s138 酒剑仙救场后降级。
 *  新对白键(dlg./spk. 前缀)并入 locale.json(不覆盖既有)。只写回有变化的文件。幂等。
 *  (敌 AI 侧 0x90 自清 —— 刀手/胖苗 —— 走 patch-enemy-choreo.mts,那侧改 enemies.json)
 *
 * 用法:pnpm --filter @type-pal/migrate exec tsx scripts/patch-scene-stages.mts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pixelToGrid, type SceneDef, type SpriteDef } from '@type-pal/content'
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
const FACING_BY_DIR = ['down', 'left', 'up', 'right'] as const

// 有界巡逻提取:从 addr 取走步/动画序列(0x87 anim / 0x0b-0x0e walkOneStep),遇 0x06 概率循环
// 回跳即止(auto/演出损耗可接受,同 chasePlayer 处理)。修「臂超长(800)」—— 7 个巡逻段互跳网
// 内联爆炸截断成 opcode-0 哨兵,这里还原成有界走动演出(NPC 交互后走一段,不爆炸)。
let patrolFixed = 0
const extractPatrol = (addr: number, owner: string, cap = 24): Record<string, unknown>[] => {
  const at = labelAt.get(`L_${addr}`)
  const out: Record<string, unknown>[] = []
  if (at) {
    const cmds = at.cmds
    for (let i = at.idx; i < cmds.length && out.length < cap; i++) {
      const c = cmds[i] as { op?: string; opcode?: number }
      if (c.op !== 'raw') break // end / 具名 op → 止(巡逻段纯 raw)
      const oc = c.opcode ?? -1
      if (oc === 0x87) out.push({ kind: 'animEntity', entity: owner })
      else if (oc >= 0x0b && oc <= 0x0e)
        out.push({ kind: 'stepEntity', entity: owner, dir: FACING_BY_DIR[oc - 0x0b] })
      else if (oc === 0x09) continue // waitFrames 略
      else break // 0x06 概率循环回跳 / 其他 op → 止
    }
  }
  out.push({ kind: 'stopScript' })
  patrolFixed++
  return out
}

// ── ① 站点替换:0x6D → setSceneStage 占位;0x1A(形象字段)→ setActorAppearance ──
// swap 重建数组(非原地改)—— 0x1A 走路帧(field 64)要**丢弃**元素,需 map+filter。
let sites6d = 0
let sites1a = 0
let sites90 = 0
let sites9a = 0
let sites2 = 0
let sites78 = 0
let sites4 = 0
type Cmd = { kind?: string; opcode?: number; operands?: number[]; note?: string }
const swapCmd = (x: unknown, owner: string): unknown | undefined => {
  const c = x as Cmd
  if (c?.kind !== 'unmigrated') return x
  const o = c.operands ?? []
  // 臂超长(800)哨兵:7 巡逻段互跳网内联爆炸 → 还原有界走动演出(owner 交互后走一段)
  if (c.opcode === 0 && c.note?.startsWith('臂超长')) {
    return owner ? extractPatrol(o[0] ?? 0, owner) : { kind: 'stopScript' }
  }
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
  if (c.opcode === 0x9a) {
    // 0x9A 批量设实体状态:区间 [op0,op1] → 实体 id 数组 e<号−1>(杜绝下标式身份),钳 512
    const from = o[0] ?? 0
    const to = Math.min(o[1] ?? from, from + 511)
    const i16 = (u: number) => (u & 0x8000 ? u - 0x10000 : u)
    const entities: string[] = []
    for (let v = from; v <= to; v++) entities.push(`e${v - 1}`)
    sites9a++
    return { kind: 'setMultiEntityState', entities, state: i16(o[2] ?? 0) }
  }
  // 第二批简单映射(实缺口 → 已有命令 / drop)
  if (c.opcode === 0x53) return sites2++, { kind: 'setAmbience', ambience: 'day' }
  if (c.opcode === 0x54) return sites2++, { kind: 'setAmbience', ambience: 'night' }
  if (c.opcode === 0x9b) return sites2++, undefined // 0x9B sdlpal FIXME wrong,no-op
  if (c.opcode === 0x78) return sites78++, undefined // 0x78 sdlpal FIXME 自己都没实现,no-op
  if (c.opcode === 0x08) return sites78++, undefined // 0x08 触发入口推进(stage 体系已承担),NOP
  // 批 4(runLegacyOp 兜底 → 已有命令;逻辑同 runner runLegacyOp,退役双解释器)
  const i16 = (u: number) => (u & 0x8000 ? u - 0x10000 : u)
  if (c.opcode === 0x77) return sites4++, { kind: 'playMusic', musicId: 0 }
  if (c.opcode === 0xa3) return sites4++, { kind: 'playMusic', musicId: o[1] ?? 0 }
  if (c.opcode === 0x85) return sites4++, { kind: 'wait', ms: (o[0] ?? 0) * 80 }
  if (c.opcode === 0x8c)
    return sites4++, { kind: 'fade', dir: (o[2] ?? 0) !== 0 ? 'in' : 'out', ms: 64 * ((o[1] ?? 0) * 10 || 10) }
  if (c.opcode === 0x93) {
    const step = i16(o[0] ?? 0) || 1
    return sites4++, { kind: 'fade', dir: step < 0 ? 'out' : 'in', ms: Math.ceil(64 / Math.abs(step)) * 100 }
  }
  // 批 4b:runLegacyOp 兜底 → 新具名命令(owner=触发实体;self 选择器 0/0xFFFF → owner)
  const self = (v: number): string | undefined => (v === 0 || v === 0xffff ? owner || undefined : `e${v - 1}`)
  if (c.opcode === 0x13) {
    const ent = self(o[0] ?? 0)
    return ent ? (sites4++, { kind: 'setEntityPos', entity: ent, pos: { ...pixelToGrid(o[1] ?? 0, o[2] ?? 0), height: 0 } }) : x
  }
  if (c.opcode === 0x35) return sites4++, { kind: 'shakeScreen', frames: o[0] ?? 0, level: (o[1] ?? 0) || 4 }
  if (c.opcode === 0x71) return sites4++, { kind: 'setScreenWave', level: o[0] ?? 0, progression: i16(o[1] ?? 0) }
  if (c.opcode === 0x7e) {
    const ent = self(o[0] ?? 0)
    return ent ? (sites4++, { kind: 'setEntityLayer', entity: ent, layer: i16(o[1] ?? 0) }) : x
  }
  if (c.opcode === 0x1d && (o[0] ?? 0) !== 0) return sites4++, { kind: 'increaseHpMp', delta: i16(o[1] ?? 0) }
  if (c.opcode === 0x22 && (o[0] ?? 0) !== 0) return sites4++, { kind: 'revivePartyAll', tenths: o[1] ?? 0 }
  if (c.opcode === 0x55 && (o[1] ?? 0) > 0) return sites4++, { kind: 'learnSkill', role: (o[1] ?? 1) - 1, skill: String(o[0] ?? 0) }
  if (c.opcode === 0x23) return sites4++, { kind: 'unequip', role: o[0] ?? 0, slot: (o[1] ?? 0) === 0 ? 'all' : (o[1] ?? 1) - 1 }
  if (c.opcode === 0x80) return sites4++, { kind: 'toggleDayNight', ms: (o[0] ?? 0) === 0 ? 3200 : 800 }
  if (c.opcode === 0x98) return sites4++, { kind: 'setFollowers', sprites: [o[0] ?? 0, o[1] ?? 0].filter((v) => v > 0) }
  if (c.opcode === 0x99) {
    if ((o[0] ?? 0) === 0xffff) return sites4++, { kind: 'setMapOverride', mapNum: o[1] ?? 0 }
    return sites4++, { kind: 'setMapOverride', scene: `s${String((o[0] ?? 1) - 1).padStart(3, '0')}`, mapNum: o[1] ?? 0 }
  }
  if (c.opcode === 0x8f) return sites4++, { kind: 'halveMoney' }
  if (c.opcode === 0x76) return sites78++, undefined // 0x76 ShowFBP 0xFFFF 填黑(reforge 天然 no-op)
  return x
}
const swap = (o: unknown, owner: string): unknown => {
  if (Array.isArray(o)) {
    const out: unknown[] = []
    let lastRngChunk = 0 // 0x36 设 RNG 序列号,0x37 消费(折叠成 playRng{chunkIdx})
    for (const x of o) {
      const cc = x as Cmd
      if (cc?.kind === 'unmigrated' && cc.opcode === 0x36) {
        lastRngChunk = cc.operands?.[0] ?? 0
        sites4++
        continue // 0x36 折进紧跟的 0x37,不单独成命令
      }
      if (cc?.kind === 'unmigrated' && cc.opcode === 0x37) {
        const op = cc.operands ?? []
        sites4++
        out.push({
          kind: 'playRng',
          chunkIdx: lastRngChunk,
          startFrame: op[0] ?? 0,
          ...((op[1] ?? 0) > 0 ? { endFrame: op[1] } : {}),
          speed: (op[2] ?? 0) > 0 ? op[2] : 16,
        })
        continue
      }
      const swapped = swapCmd(x, owner)
      if (swapped === undefined) continue // field-64 丢弃
      if (Array.isArray(swapped)) out.push(...swapped) // 巡逻还原:多命令展开
      else out.push(swapped === x ? swap(x, owner) : swapped)
    }
    return out
  }
  if (o && typeof o === 'object') {
    const r = o as Record<string, unknown>
    // 进入实体子树时 owner = 实体 id(臂超长巡逻的属主 —— 走步/动画的 entity)
    const childOwner = typeof r.id === 'string' && Array.isArray(r.pages) ? r.id : owner
    for (const k of Object.keys(r)) r[k] = swap(r[k], childOwner)
    return r
  }
  return o
}
scenes.forEach((s, i) => {
  scenes[i] = swap(s, '') as SceneDef
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
  `[patch-scene-stages] 0x6D 站点 ${sites} · 0x1A 形象站点 ${sites1a} · 0x90 敌种降级 ${sites90} · 0x9A 批量状态 ${sites9a} · 第二批 ${sites2} · 0x78 静默 ${sites78} · 批4 ${sites4} · 巡逻还原 ${patrolFixed} · 场景写回 ${written} · locale 新键 ${newKeys} · sprites +${newSprites}`,
)
const un = Object.entries(tctx.report.unmigrated)
if (un.length) console.log('  翻译缺口:', un.map(([k, v]) => `${k}×${v}`).join(' / '))
