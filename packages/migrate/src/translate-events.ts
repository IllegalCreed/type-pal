/**
 * M3a · 原版事件字节码 → 结构化脚本 AST 翻译器(线性层 + 门模式)。
 * 设计:docs/phase2/foundation/script-model-m3-design.md §3;编码事实(2026-07-02 实测):
 *  - 具名 op:showDialog{messageIndex,text} / loadScene{sceneId 0-based} / goto{to,frameDelay}
 *    / giveItem{itemId,count(0=1)} / setDialogStyle{Bottom,Top,Narration,Center} /
 *    end{} | end{advance:true} | end{reset:true,resetTo:<地址>,idleFrames}
 *  - 其余是 raw{opcode,operands};label = "L_<地址>",跳转目标必有 label。
 * 分层规则:
 *  - 线性直译查表;连续 showDialog 成组(尾冒号行 = speaker,后续行拼一页,文本进 locale);
 *  - 门模式:loadScene ± setPartyPos ± fadeOut(窗口 ≤3 命令)折叠成单条 loadScene{scene,pos};
 *  - end.advance/reset → 多段 stages(原版触发入口推进的 clean 版);
 *  - goto:frameDelay→wait,目标内联续走(环 → 截断);
 *  - 跳转族(census 31 op)未实现的 → unmigrated + 截断本段(flow-cut,不猜控制流);
 *  - 其它未知 op → unmigrated + 继续(不破坏后续可译部分)。
 */
import type { Command, DialogueLine, ScriptStage } from '@type-pal/content'
import { FACING_BY_DIR, partyPosToGrid, sceneSlug, signExtendI16 } from './source-facts.js'
import type { SourceCmd } from './source-facts.js'

/** 提取 JSON 的宽字段(SourceCmd 之上,具名 op 的专有字段)。 */
interface Cmd extends SourceCmd {
  messageIndex?: number
  sceneId?: number
  to?: string
  frameDelay?: number
  itemId?: number
  count?: number
  advance?: boolean
  reset?: boolean
  resetTo?: number
}

export interface TranslateReport {
  chains: number
  stages: number
  commands: number
  /** note → 次数(翻译覆盖缺口清单;M3b/c 按此收敛)。 */
  unmigrated: Record<string, number>
  /** 因未实现跳转族而截断的段数。 */
  flowCuts: number
}

export function emptyTranslateReport(): TranslateReport {
  return { chains: 0, stages: 0, commands: 0, unmigrated: {}, flowCuts: 0 }
}

export interface TranslateCtx {
  /** 全局 label 索引(跨场景/共享段;mapScenesStatic 已建)。 */
  labelAt: Map<string, { cmds: readonly SourceCmd[]; idx: number }>
  /** 文本累积(dlg.<msgIdx> / spk.<名>);IO 壳并入工程 locale。 */
  locale: Record<string, string>
  report: TranslateReport
}

/** 原版跳转族(census 全清单)—— 未实现的命中即截断本段,不猜控制流。 */
const JUMP_FAMILY = new Set([
  0x06, 0x07, 0x0a, 0x1e, 0x20, 0x2e, 0x33, 0x34, 0x38, 0x3a, 0x58, 0x5d, 0x5e, 0x61, 0x64,
  0x68, 0x74, 0x79, 0x81, 0x83, 0x84, 0x86, 0x91, 0x94, 0x95, 0x9c, 0x9e, 0xa2,
])
/** 每逻辑帧 40ms(一阶段主循环 tick;waitFrames/goto frameDelay 换算)。 */
const FRAME_MS = 40
/** 段体命令上限(防御:超长 cutscene 截断上报,不静默膨胀)。 */
const MAX_BODY = 800

const STYLE_SLOT: Record<string, DialogueLine['slot'] | undefined> = {
  setDialogStyleBottom: undefined, // bottom = 缺省,不写字段
  setDialogStyleTop: 'top',
  setDialogStyleNarration: 'narration',
  setDialogStyleCenter: 'narration', // 居中文本 M3a 并入叙述窗;视觉差异 M3b 细分
}

/** 说话人行:以全角/半角冒号结尾(原版约定;DialogueLine 显式 speaker 字段的来源)。 */
const SPEAKER_RE = /[∶:：]\s*$/

interface WalkTerm {
  kind: 'end' | 'advance' | 'reset' | 'cut'
  resetTo?: string // L_<addr>
  /** advance:下一段起点(同数组下标)。 */
  nextIdx?: number
}

/**
 * 翻译一条触发/进场链 → stages。
 * @param ownerEntity 0x0F/0x14(无目标操作数)作用的实体 id;onEnter 链传 undefined。
 */
export function translateStages(
  startLabel: string,
  ownerEntity: string | undefined,
  ctx: TranslateCtx,
): ScriptStage[] | undefined {
  const start = ctx.labelAt.get(startLabel)
  if (!start) return undefined
  ctx.report.chains++

  const stages: (ScriptStage & { _next?: string })[] = []
  const idxByLabel = new Map<string, number>()
  /** 待走队列:reset 目标(按 label);advance 续段在主循环内联(保证 index+1 相邻)。 */
  const queue: string[] = []

  let cursor: { cmds: readonly SourceCmd[]; idx: number; label?: string } | undefined = {
    ...start,
    label: startLabel,
  }
  while (cursor) {
    const stageIdx = stages.length
    if (cursor.label) {
      if (idxByLabel.has(cursor.label)) {
        cursor = nextFromQueue()
        continue
      }
      idxByLabel.set(cursor.label, stageIdx)
    }
    const { body, term } = walkBody(cursor.cmds, cursor.idx, ownerEntity, ctx)
    ctx.report.stages++
    ctx.report.commands += body.length
    if (term.kind === 'advance' && term.nextIdx !== undefined) {
      stages.push({ body, next: 'advance' })
      const nextLabel = (cursor.cmds[term.nextIdx] as Cmd | undefined)?.label
      cursor = { cmds: cursor.cmds, idx: term.nextIdx, label: nextLabel }
    } else if (term.kind === 'reset' && term.resetTo) {
      stages.push({ body, next: -1, _next: term.resetTo } as ScriptStage & { _next: string })
      if (!idxByLabel.has(term.resetTo)) queue.push(term.resetTo)
      cursor = nextFromQueue()
    } else {
      stages.push({ body })
      cursor = nextFromQueue()
    }
  }

  // 解析 reset 目标 → 段下标(目标已入队走过;缺 = 数据异常,回 0 并上报)
  for (const st of stages) {
    if (st._next !== undefined) {
      const target = idxByLabel.get(st._next)
      if (target === undefined) {
        note(ctx, `reset 目标不可达 ${st._next}`)
        st.next = 0
      } else st.next = target
      delete st._next
    }
  }
  return stages

  function nextFromQueue() {
    const label = queue.shift()
    if (!label) return undefined
    const at = ctx.labelAt.get(label)
    return at ? { ...at, label } : undefined
  }
}

function note(ctx: TranslateCtx, key: string): void {
  ctx.report.unmigrated[key] = (ctx.report.unmigrated[key] ?? 0) + 1
}

/** 走一段体:从 idx 到 end 变体/流截断。 */
function walkBody(
  cmds: readonly SourceCmd[],
  startIdx: number,
  owner: string | undefined,
  ctx: TranslateCtx,
): { body: Command[]; term: WalkTerm } {
  const body: Command[] = []
  let slot: DialogueLine['slot'] | undefined
  /** 对话批:待成组的 showDialog 行。 */
  let batch: { msgIdx: number; text: string }[] = []
  const visited = new Set<number>() // goto 环保护(同数组按下标;跨数组由 steps 总上限兜底)
  let steps = 0
  let at = { cmds, idx: startIdx }

  const flush = () => {
    if (!batch.length) return
    // 成组:尾冒号行开新 utterance 记 speaker;其余行拼接为一页文本
    let speaker: string | undefined
    let parts: { msgIdx: number; text: string }[] = []
    let emittedForSpeaker = false
    const emit = () => {
      if (!parts.length) return
      const key = `dlg.${parts[0]!.msgIdx}`
      ctx.locale[key] = parts.map((p) => p.text).join('')
      const line: DialogueLine = { text: key }
      if (speaker) {
        const sk = `spk.${speaker}`
        ctx.locale[sk] = speaker
        line.speaker = sk
        emittedForSpeaker = true
      }
      if (slot) line.slot = slot
      body.push({ kind: 'dialog', line })
      parts = []
    }
    for (const l of batch) {
      if (SPEAKER_RE.test(l.text)) {
        emit()
        speaker = l.text.replace(SPEAKER_RE, '')
        emittedForSpeaker = false
      } else parts.push(l)
    }
    emit()
    if (speaker && !emittedForSpeaker) note(ctx, '悬空说话人行(无正文)') // 罕见边角,上报不造假页
    batch = []
  }

  while (at.idx < at.cmds.length && body.length < MAX_BODY && steps++ < MAX_BODY * 4) {
    const c = at.cmds[at.idx] as Cmd
    const op = c.op

    // ── end 族:段终 ──
    if (op === 'end') {
      flush()
      if (c.advance) return { body, term: { kind: 'advance', nextIdx: at.idx + 1 } }
      if (c.reset) return { body, term: { kind: 'reset', resetTo: `L_${c.resetTo}` } }
      return { body, term: { kind: 'end' } }
    }
    // ── goto:延迟 → wait;目标内联续走(环 → 截断)──
    if (op === 'goto') {
      flush()
      if ((c.frameDelay ?? 0) > 0) body.push({ kind: 'wait', ms: c.frameDelay! * FRAME_MS })
      const target = ctx.labelAt.get(c.to ?? '')
      if (!target || (target.cmds === at.cmds && visited.has(target.idx))) {
        note(ctx, target ? 'goto 环截断' : `goto 目标缺失`)
        ctx.report.flowCuts++
        return { body, term: { kind: 'cut' } }
      }
      visited.add(at.idx)
      at = { cmds: target.cmds, idx: target.idx }
      continue
    }
    if (op === 'showDialog') {
      batch.push({ msgIdx: c.messageIndex ?? -1, text: c.text ?? '' })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op && op in STYLE_SLOT) {
      flush()
      slot = STYLE_SLOT[op]
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op === 'loadScene') {
      flush()
      body.push({ kind: 'loadScene', scene: sceneSlug(c.sceneId ?? 0) })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op === 'giveItem') {
      flush()
      const cnt = c.count && c.count > 1 ? c.count : undefined
      body.push({ kind: 'giveItem', itemId: String(c.itemId), ...(cnt ? { count: cnt } : {}) })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }

    // ── raw 表 ──
    if (op === 'raw' && typeof c.opcode === 'number') {
      const o = c.operands ?? []
      const oc = c.opcode
      const push = (cmd: Command | undefined) => {
        flush()
        if (cmd) body.push(cmd)
      }
      if (oc === 0x09) push({ kind: 'wait', ms: Math.max(1, o[0] ?? 1) * FRAME_MS })
      else if (oc === 0x46) {
        push({ kind: 'teleportParty', pos: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0) })
      } else if (oc === 0x15) push({ kind: 'setPartyFacing', facing: FACING_BY_DIR[o[0] ?? 0] ?? 'down' })
      else if (oc === 0x49) push({ kind: 'setEntityState', entity: `e${o[0]}`, state: signExtendI16(o[1] ?? 0) })
      else if (oc === 0x0f && owner) {
        flush()
        if ((o[0] ?? 0xffff) !== 0xffff) body.push({ kind: 'setEntityFacing', entity: owner, facing: FACING_BY_DIR[o[0]!] ?? 'down' })
        if ((o[1] ?? 0xffff) !== 0xffff) body.push({ kind: 'setEntityFrame', entity: owner, frame: o[1]! })
      } else if (oc === 0x14 && owner) {
        flush()
        body.push({ kind: 'setEntityFacing', entity: owner, facing: 'down' })
        body.push({ kind: 'setEntityFrame', entity: owner, frame: o[0] ?? 0 })
      } else if (oc === 0x16) {
        flush()
        if ((o[0] ?? 0) !== 0) {
          body.push({ kind: 'setEntityFacing', entity: `e${o[0]}`, facing: FACING_BY_DIR[o[1] ?? 0] ?? 'down' })
          body.push({ kind: 'setEntityFrame', entity: `e${o[0]}`, frame: o[2] ?? 0 })
        }
      } else if (oc === 0x47) push({ kind: 'playSound', soundId: o[0] ?? 0 })
      else if (oc === 0x43) push({ kind: 'playMusic', musicId: o[0] ?? 0 })
      else if (oc === 0x45) push({ kind: 'setBattleMusic', musicId: o[0] ?? 0 })
      else if (oc === 0x4a) push({ kind: 'setBattleField', fieldId: o[0] ?? 0 })
      else if (oc === 0x50) push({ kind: 'fade', dir: 'out' })
      else if (oc === 0x51) push({ kind: 'fade', dir: 'in' })
      else if (oc === 0x05 || oc === 0x8e) push({ kind: 'clearDialog' })
      else if (oc === 0xa7) push(undefined) // noop(备份屏)
      else if (oc === 0x1e && (o[1] ?? 0) === 0) push({ kind: 'giveMoney', delta: signExtendI16(o[0] ?? 0) })
      else if (oc === 0x20 && (o[2] ?? 0) === 0) {
        const cnt = (o[1] ?? 0) > 1 ? o[1] : undefined
        push({ kind: 'loseItem', itemId: String(o[0]), ...(cnt ? { count: cnt } : {}) })
      } else if (JUMP_FAMILY.has(oc)) {
        // 未实现的跳转族:截断本段(不猜控制流)
        flush()
        body.push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: `jump-family 0x${oc.toString(16)}` })
        note(ctx, `flow-cut 0x${oc.toString(16)}`)
        ctx.report.flowCuts++
        return { body, term: { kind: 'cut' } }
      } else {
        flush()
        body.push({ kind: 'unmigrated', opcode: oc, operands: [...o] })
        note(ctx, `op 0x${oc.toString(16)}`)
      }
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }

    // 未知具名 op(不应出现):上报 + 跳过
    note(ctx, `具名 ${op}`)
    at = { cmds: at.cmds, idx: at.idx + 1 }
  }
  flush()
  if (body.length >= MAX_BODY) {
    note(ctx, '段体超长截断')
    ctx.report.flowCuts++
  }
  return { body, term: { kind: 'cut' } }
}

/**
 * 门模式 peephole:loadScene 与相邻(≤2 距离)teleportParty/fade(out) 折叠为单条
 * loadScene{scene,pos}(主流原版链形 `loadScene setPartyPos fadeOut`×666 及变序)。
 * 引擎的 loadScene 内建淡出/淡入,相邻 fade 一并吸收。
 */
export function foldDoorPattern(body: Command[]): Command[] {
  const out: Command[] = []
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!
    if (c.kind !== 'loadScene') {
      out.push(c)
      continue
    }
    let pos = c.pos
    let facing = c.facing
    // 向前看 ≤2:teleportParty(取坐标)/fade out(吸收)
    let consumed = 0
    for (let j = i + 1; j <= i + 2 && j < body.length; j++) {
      const n = body[j]!
      if (n.kind === 'teleportParty' && !pos) {
        pos = n.pos
        facing ??= n.facing
        consumed = j - i
      } else if (n.kind === 'fade' && n.dir === 'out') {
        consumed = j - i
      } else break
    }
    // 向后看已产出的尾部 ≤2:setPartyPos 先于 loadScene 的变序(33×)
    for (let k = out.length - 1; k >= out.length - 2 && k >= 0 && !pos; k--) {
      const p = out[k]!
      if (p.kind === 'teleportParty') {
        pos = p.pos
        facing ??= p.facing
        out.splice(k, 1)
        break
      }
      if (p.kind !== 'fade') break
    }
    out.push({ kind: 'loadScene', scene: c.scene, ...(pos ? { pos } : {}), ...(facing ? { facing } : {}) })
    i += consumed
  }
  return out
}

/** 对整条 stages 应用 peephole(体内折叠;段间不跨)。 */
export function foldStages(stages: ScriptStage[]): ScriptStage[] {
  return stages.map((s) => ({ ...s, body: foldDoorPattern(s.body) }))
}
