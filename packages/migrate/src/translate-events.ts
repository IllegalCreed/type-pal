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
import { type Command, type DialogueLine, pixelToGrid, type ScriptStage } from '@type-pal/content'
import type { SourceCmd } from './source-facts.js'
import {
  FACING_BY_DIR,
  partyPosToGrid,
  ROLE_SLUGS,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'

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
  arg0?: number // 对话样式 op 的 operand[0]:top/bottom = 立绘号(wNumCharFace)
}

export interface TranslateReport {
  chains: number
  stages: number
  commands: number
  /** note → 次数(翻译覆盖缺口清单;M3b/c 按此收敛)。 */
  unmigrated: Record<string, number>
  /** 因未实现跳转族而截断的段数。 */
  flowCuts: number
  /** 0x6D 场景进场剧情补丁站点数(post-pass 追加段+回填)。 */
  sceneStagePatches?: number
}

export function emptyTranslateReport(): TranslateReport {
  return { chains: 0, stages: 0, commands: 0, unmigrated: {}, flowCuts: 0 }
}

export interface TranslateCtx {
  /** 全局 label 索引(跨场景/共享段;mapScenesStatic 已建)。 */
  labelAt: Map<string, { cmds: readonly SourceCmd[]; idx: number }>
  /** 分支臂记忆化(label|owner → 已译体;同一游戏over/败臂被数百战斗共享,防重复走+堆爆)。 */
  armMemo?: Map<string, Command[]>
  /** 在译链栈(label|owner):0x24/25 页目标可自引用,防 translateStages 无限递归。 */
  translating?: Set<string>
  /** B9:0x8A 置位、下一个 0x07 消费 → startBattle.auto(fAutoBattle 语义)。 */
  pendingAuto?: boolean
  /** 文本累积(dlg.<msgIdx> / spk.<名>);IO 壳并入工程 locale。 */
  locale: Record<string, string>
  report: TranslateReport
  /**
   * 0x65(换角色精灵)的 spriteNum → 精灵 id 解析(mapScenesStatic 注入:
   * 角色本体精灵优先,未注册的补登记 npc-<num>)。缺省 → 0x65 落 unmigrated。
   */
  spriteIdForNum?: (num: number) => string
}

/** 尚未结构化的跳转族(census 全清单减去 M3b 已实现:0x06/07/0A/1E/20/79/94)。
 * 命中即截断本段,不猜控制流。 */
const JUMP_FAMILY = new Set([
  0x2e, 0x33, 0x34, 0x38, 0x3a, 0x58, 0x5d, 0x5e, 0x61, 0x64, 0x68, 0x74, 0x81, 0x83, 0x84, 0x86,
  0x91, 0x95, 0x9c, 0x9e, 0xa2,
])
/** 原版速度码 → WalkSpeed。 */
const SPEED: Record<number, 'slow' | 'normal' | 'fast' | 'run'> = {
  2: 'slow',
  3: 'normal',
  4: 'fast',
  8: 'run',
}
/** 原版 giveItem-0 数据 bug 修正表(扬州宝物屋 3 箱「获得X」后 giveItem 0 给空;
 *  键 = 前句 showDialog 的 MSG.DAT 下标,值 = 应给物品号。一阶段 event-system
 *  patchGiveItemZeroBugs 同表;reforge 无运行时 patch 层,烘在翻译期,产物即干净)。 */
const GIVEITEM_ZERO_FIXUP: Record<number, number> = {
  12256: 164, // 「获得九节鞭」→ 九截鞭
  12347: 103, // 「获得紫青玉蓉膏」→ 紫菁玉蓉膏
  12408: 116, // 「获得腐尸肉」→ 尸腐肉
}

/** 分支臂内联深度上限(臂内再遇跳转的嵌套;更深 → unmigrated,M3c 提共享脚本)。 */
const MAX_ARM_DEPTH = 3
/** 单臂命令上限(超限 → unmigrated;防组合爆炸,如层层嵌套的战斗败臂)。 */
const MAX_ARM_BODY = 200
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
  const start0 = ctx.labelAt.get(startLabel)
  if (!start0) return undefined
  const startAt = start0 // 收窄后常量(闭包内 TS 不保 start0 非空)
  const tkey = `${startLabel}|${ownerEntity ?? ''}`
  const inFlight = (ctx.translating ??= new Set())
  if (inFlight.has(tkey)) {
    note(ctx, '链自引用截断(0x24/25 环)')
    return undefined
  }
  inFlight.add(tkey)
  try {
    return translateStagesInner()
  } finally {
    inFlight.delete(tkey)
  }

  function translateStagesInner(): ScriptStage[] | undefined {
    ctx.report.chains++

    const stages: (ScriptStage & { _next?: string })[] = []
    const idxByLabel = new Map<string, number>()
    /** 段位置去重:goto 回跳 + end.advance 会产生无 label 的重复段位置 → 无限段(scene23 堆爆根因)。 */
    const seenPos = new Set<string>()
    const arrId = new Map<readonly SourceCmd[], number>()
    const posKey = (cmds: readonly SourceCmd[], idx: number): string => {
      let id = arrId.get(cmds)
      if (id === undefined) {
        id = arrId.size
        arrId.set(cmds, id)
      }
      return `${id}:${idx}`
    }
    /** 每链命令总预算(超限截断上报;防病理链膨胀)。 */
    let budget = 4000
    /** 待走队列:reset 目标(按 label);advance 续段在主循环内联(保证 index+1 相邻)。 */
    const queue: string[] = []

    let cursor: { cmds: readonly SourceCmd[]; idx: number; label?: string } | undefined = {
      ...startAt,
      label: startLabel,
    }
    while (cursor) {
      const stageIdx = stages.length
      const pk = posKey(cursor.cmds, cursor.idx)
      if (seenPos.has(pk) || budget <= 0) {
        if (budget <= 0 && stages.length) note(ctx, '链命令预算截断')
        cursor = nextFromQueue()
        continue
      }
      seenPos.add(pk)
      if (cursor.label) {
        if (idxByLabel.has(cursor.label)) {
          cursor = nextFromQueue()
          continue
        }
        idxByLabel.set(cursor.label, stageIdx)
      }
      const { body, term } = walkBody(cursor.cmds, cursor.idx, ownerEntity, ctx)
      budget -= body.length
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
  depth = 0,
): { body: Command[]; term: WalkTerm } {
  const body: Command[] = []
  let lastRngChunk = 0 // 0x36 设当前 RNG 序列号,0x37 播放时消费(折叠成 playRng{chunkIdx})
  let slot: DialogueLine['slot'] | undefined
  /** 当前立绘(对话样式 op 的 arg0 = RGM 立绘号;top→左 / bottom→右;0/narration = 无)。 */
  let portrait: DialogueLine['portrait']
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
      if (portrait) line.portrait = portrait
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
      // 跨库目标(带 "shared#" 前缀)以前显式截断(0x4C 海内联会展开 49.8 万条);
      // B8 后 0x4C 段翻成单条 chasePlayer 即终止,海已排干 → 放开正常内联(环/超长截断兜底)。
      // 提取器把跨场景共享目标改写为 "shared#L_X"(slice.ts rewriteJumps);索引用裸名 → 剥前缀查
      const toName = (c.to ?? '').split('#').pop() ?? ''
      const target = ctx.labelAt.get(toName)
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
      flush() // 先出旧批(用旧 slot/portrait),再切样式
      slot = STYLE_SLOT[op]
      // 立绘:top(0x3C)/bottom(0x3D) 的 arg0 = wNumCharFace(RGM 立绘号);sdlpal script.c:3402/3412。
      // top→左 / bottom→右(reforge POS 已定位);center/narration 无立绘(arg0 是颜色,清)。
      const face = op === 'setDialogStyleTop' || op === 'setDialogStyleBottom' ? (c.arg0 ?? 0) : 0
      portrait =
        face > 0 ? { icon: face, side: op === 'setDialogStyleTop' ? 'left' : 'right' } : undefined
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
      // 原版数据 bug 烘焙(扬州宝物屋 3 箱:「获得X」提示后 giveItem 0 给空;一阶段修在
      // 运行时 patchGiveItemZeroBugs,reforge 无运行时 patch 层 → 翻译期按前句 MSG 下标补真 id)
      const fix = c.itemId === 0 ? GIVEITEM_ZERO_FIXUP[batch[batch.length - 1]?.msgIdx ?? -1] : undefined
      flush()
      const cnt = c.count && c.count > 1 ? c.count : undefined
      body.push({ kind: 'giveItem', itemId: String(fix ?? c.itemId), ...(cnt ? { count: cnt } : {}) })
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
      // 对象引用:操作数 0xFFFF = 脚本属主"自己";其余是 **1-based 全局**对象号
      // (script.c:631 `pCurrent = &lprgEventObject[operand-1]`;一阶段 resolveGlobalEventObject
      // 同语义)。提取的 eo.id 是 0-based 全局累加(scene1=0..31,scene2=32..),故 -1 即得
      // e<id>。⚠ 曾直译 e${v} 全体 +1 错位(2026-07-03 用户报,考证见 opcode 缺口审计)。
      const entRef = (v: number): string | undefined => (v === 0xffff ? owner : `e${v - 1}`)
      // pCurrent 式引用:0 也是"自己"(script.c:op0==0 → pEvtObj)
      const pcRef = (v: number): string | undefined =>
        v === 0 || v === 0xffff ? owner : `e${v - 1}`
      /** 跳走臂内联:跳转目标链整段翻成 Command[](环/深度超限 → unmigrated)。
       *  臂尾一律补 stopScript:原版跳转命中后链一路跑到 END 即整个脚本结束,臂跑完
       *  绝不落穿回父体(曾漏 → 概率门/确认门全废:then=[] 空臂照跑后续 = 21% 掉落变
       *  100%、选"否"照办事)。addr 0/缺 = 原版跳全局 0 号 END = 当场退,臂就是一条 stop。 */
      const inlineArm = (addr: number | undefined): Command[] => {
        if (!addr) return [{ kind: 'stopScript' }]
        const memoKey = `L_${addr}|${owner ?? ''}`
        const memo = (ctx.armMemo ??= new Map())
        const hit = memo.get(memoKey)
        if (hit) return hit
        const target = ctx.labelAt.get(`L_${addr}`)
        if (!target || depth >= MAX_ARM_DEPTH) {
          note(ctx, target ? '分支臂深度截断' : '分支臂目标缺失')
          return [
            { kind: 'unmigrated', opcode: 0, operands: [addr], note: '分支臂不可内联' },
            { kind: 'stopScript' },
          ]
        }
        memo.set(memoKey, []) // 先占位:环(臂内再跳回自己)拿到空臂而非无限递归
        const r = walkBody(target.cmds, target.idx, owner, ctx, depth + 1)
        if (r.term.kind === 'advance' || r.term.kind === 'reset')
          note(ctx, '分支臂含段转移(按 end 处理)')
        let arm = r.body
        if (arm.length > MAX_ARM_BODY) {
          // 巡逻互跳网(0x87 anim + walkOneStep + 0x06 概率环)内联爆炸:保留前段走步演出(有界),
          // 弃尾部互跳链 —— 不丢成 opcode-0 哨兵(NPC 交互后走一段;概率循环由演出损耗吸收)
          note(ctx, '分支臂超长截断(保留前段走步)')
          arm = arm.slice(0, MAX_ARM_BODY)
        }
        arm = [...arm, { kind: 'stopScript' }]
        memo.set(memoKey, arm)
        return arm
      }
      if (oc === 0x09) push({ kind: 'wait', ms: Math.max(1, o[0] ?? 1) * FRAME_MS })
      else if (oc === 0x46) {
        push({ kind: 'teleportParty', pos: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0) })
      } else if (oc === 0x15) {
        // 原版(script.c 0x0015)同时写 wPartyDirection 和 rgParty[o[2]].wFrame = dir*3 + o[1]。
        // ⚠ 曾只译 o[0] 朝向、丢 o[1] 姿势帧 —— 全场景 775 处的脚本姿势(开场李逍遥
        // 练武/摊手)全部不显(2026-07-03 用户实测 + 一阶段 partyScriptedFrame oracle 实锤)。
        const gesture = o[1] ?? 0
        const member = o[2] ?? 0
        push({
          kind: 'setPartyFacing',
          facing: FACING_BY_DIR[o[0] ?? 0] ?? 'down',
          ...(gesture ? { gesture } : {}), // 0 = 站立帧,省略 → 运行时清脚本姿势
          ...(member ? { member } : {}),
        })
      } else if (oc === 0x9a) {
        // 0x9A 批量设实体状态(script.c:2756):全局对象号区间 [op0,op1] 全设 sState=op2。
        // 展开成实体 id 数组(e<号−1>;杜绝下标式身份);区间钳 512 防病理(同 runLegacyOp)。
        const from = o[0] ?? 0
        const to = Math.min(o[1] ?? from, from + 511)
        const entities: string[] = []
        for (let v = from; v <= to; v++) entities.push(`e${v - 1}`)
        push({ kind: 'setMultiEntityState', entities, state: signExtendI16(o[2] ?? 0) })
      } else if (oc === 0x53) {
        push({ kind: 'setAmbience', ambience: 'day' }) // 0x53 use day palette(script.c:1803)
      } else if (oc === 0x54) {
        push({ kind: 'setAmbience', ambience: 'night' }) // 0x54 use night palette(script.c:1810)
      } else if (oc === 0x9b) {
        push(undefined) // 0x9B fade-to-scene:sdlpal 自认 FIXME wrong(script.c:2769),no-op
      } else if (oc === 0x08) {
        push(undefined) // 0x08 触发入口推进(script.c:3335;stage 推进体系已承担),NOP
      } else if (oc === 0x77) {
        push({ kind: 'playMusic', musicId: 0 }) // 0x77 停当前音乐(script.c:2215)
      } else if (oc === 0xa3) {
        push({ kind: 'playMusic', musicId: o[1] ?? 0 }) // 0xA3 CD 音轨 → 回退 RIX 曲 op1(script.c:3023)
      } else if (oc === 0x85) {
        push({ kind: 'wait', ms: (o[0] ?? 0) * 80 }) // 0x85 延时 op0×80ms(script.c:2511)
      } else if (oc === 0x8c) {
        // 0x8C 颜色渐变(script.c:2582):ms=64×(op1×10||10);fFrom(op2)=从纯色渐回场景 → fade in
        push({ kind: 'fade', dir: (o[2] ?? 0) !== 0 ? 'in' : 'out', ms: 64 * ((o[1] ?? 0) * 10 || 10) })
      } else if (oc === 0x93) {
        // 0x93 SceneFade(script.c:2664):step=int16(op0)||1;ms=ceil(64/|step|)×100;step<0=渐暗
        const step = signExtendI16(o[0] ?? 0) || 1
        push({ kind: 'fade', dir: step < 0 ? 'out' : 'in', ms: Math.ceil(64 / Math.abs(step)) * 100 })
      } else if (oc === 0x13) {
        // 0x13 实体绝对定位(script.c:716):op0 选择器,op1/op2 原版像素 → pixelToGrid
        const ent = pcRef(o[0] ?? 0)
        if (ent) push({ kind: 'setEntityPos', entity: ent, pos: { ...pixelToGrid(o[1] ?? 0, o[2] ?? 0), height: 0 } })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '0x13 无属主' })
      } else if (oc === 0x35) {
        push({ kind: 'shakeScreen', frames: o[0] ?? 0, level: (o[1] ?? 0) || 4 }) // 0x35 震屏
      } else if (oc === 0x71) {
        push({ kind: 'setScreenWave', level: o[0] ?? 0, progression: signExtendI16(o[1] ?? 0) }) // 0x71 屏波
      } else if (oc === 0x7e) {
        const ent = pcRef(o[0] ?? 0)
        if (ent) push({ kind: 'setEntityLayer', entity: ent, layer: signExtendI16(o[1] ?? 0) }) // 0x7E 图层
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '0x7E 无属主' })
      } else if (oc === 0x1d && (o[0] ?? 0) !== 0) {
        push({ kind: 'increaseHpMp', delta: signExtendI16(o[1] ?? 0) }) // 0x1D 全队增血蓝(op0=1)
      } else if (oc === 0x22 && (o[0] ?? 0) !== 0) {
        push({ kind: 'revivePartyAll', tenths: o[1] ?? 0 }) // 0x22 全队复活(op0=1)
      } else if (oc === 0x55 && (o[1] ?? 0) > 0) {
        push({ kind: 'learnSkill', role: (o[1] ?? 1) - 1, skill: String(o[0] ?? 0) }) // 0x55 学仙术
      } else if (oc === 0x23) {
        push({ kind: 'unequip', role: o[0] ?? 0, slot: (o[1] ?? 0) === 0 ? 'all' : (o[1] ?? 1) - 1 }) // 0x23 卸装
      } else if (oc === 0x80) {
        push({ kind: 'toggleDayNight', ms: (o[0] ?? 0) === 0 ? 3200 : 800 }) // 0x80 昼夜切换
      } else if (oc === 0x98) {
        push({ kind: 'setFollowers', sprites: [o[0] ?? 0, o[1] ?? 0].filter((x) => x > 0) }) // 0x98 跟随者
      } else if (oc === 0x99) {
        // 0x99 换底图:op0=0xFFFF 当前场景即时重载;else 目标场景下次进场
        if ((o[0] ?? 0) === 0xffff) push({ kind: 'setMapOverride', mapNum: o[1] ?? 0 })
        else push({ kind: 'setMapOverride', scene: sceneSlug((o[0] ?? 1) - 1), mapNum: o[1] ?? 0 })
      } else if (oc === 0x8f) {
        push({ kind: 'halveMoney' }) // 0x8F 金钱减半
      } else if (oc === 0x36) {
        lastRngChunk = o[0] ?? 0 // 0x36 设当前 RNG 序列号(script.c:1537;配 0x37)
      } else if (oc === 0x37) {
        // 0x37 播 RNG(script.c:1544):startFrame=op0,endFrame=op1>0,speed=op2>0?op2:16
        push({
          kind: 'playRng',
          chunkIdx: lastRngChunk,
          startFrame: o[0] ?? 0,
          ...((o[1] ?? 0) > 0 ? { endFrame: o[1] } : {}),
          speed: (o[2] ?? 0) > 0 ? o[2]! : 16,
        })
      } else if (oc === 0x76) {
        push(undefined) // 0x76 ShowFBP:全数据 op0=0xFFFF 填黑帧缓冲(reforge 每帧重画天然 no-op)
      } else if (oc === 0x49) {
        const ent = entRef(o[0] ?? 0)
        if (ent) push({ kind: 'setEntityState', entity: ent, state: signExtendI16(o[1] ?? 0) })
        else {
          push({
            kind: 'unmigrated',
            opcode: oc,
            operands: [...o],
            note: '0xFFFF 自指但无属主(onEnter)',
          })
          note(ctx, 'setState 自指无属主')
        }
      } else if (oc === 0x0f && owner) {
        flush()
        if ((o[0] ?? 0xffff) !== 0xffff)
          body.push({
            kind: 'setEntityFacing',
            entity: owner,
            facing: FACING_BY_DIR[o[0]!] ?? 'down',
          })
        if ((o[1] ?? 0xffff) !== 0xffff)
          body.push({ kind: 'setEntityFrame', entity: owner, frame: o[1]! })
      } else if (oc === 0x14 && owner) {
        flush()
        body.push({ kind: 'setEntityFacing', entity: owner, facing: 'down' })
        body.push({ kind: 'setEntityFrame', entity: owner, frame: o[0] ?? 0 })
      } else if (oc === 0x16) {
        flush()
        const ent16 = (o[0] ?? 0) !== 0 ? entRef(o[0]!) : undefined
        if (ent16) {
          body.push({
            kind: 'setEntityFacing',
            entity: ent16,
            facing: FACING_BY_DIR[o[1] ?? 0] ?? 'down',
          })
          body.push({ kind: 'setEntityFrame', entity: ent16, frame: o[2] ?? 0 })
        }
      } else if (oc === 0x47) push({ kind: 'playSound', soundId: o[0] ?? 0 })
      else if (oc === 0x43) push({ kind: 'playMusic', musicId: o[0] ?? 0 })
      // 0x45/0x4A(原版全局变量「从此以后战斗用 X」)→ 迁移期内部标记 BattleCfgMarker
      // (schema overrideSceneBattle 已退役,不复活):邻战 → fold 进 startBattle 一次性参数;
      // 其余 → bakeAndStrip 烘成 SceneDef 默认(打完 boss 回落场景默认;无持久态)。绝不进最终 content。
      else if (oc === 0x45) push(battleCfgMarker({ musicId: o[0] ?? 0 }))
      else if (oc === 0x4a) push(battleCfgMarker({ fieldId: o[0] ?? 0 }))
      else if (oc === 0x50) push({ kind: 'fade', dir: 'out' })
      else if (oc === 0x51) push({ kind: 'fade', dir: 'in' })
      else if (oc === 0x73) {
        // 淡入场景(script.c 0x0073:PAL_MakeScene + VIDEO_FadeScreen(o[0]))。
        // o[0] 为原版 fade 速度档(开场=2);换算成 ms 走通用 fade 驱动。
        push({ kind: 'fade', dir: 'in', ms: Math.max(1, o[0] ?? 1) * 300 })
      } else if (oc === 0x65) {
        // 换角色大世界精灵(script.c 0x0065:rgwSpriteNum[o[0]] = o[1])。开场李逍遥
        // 练武 627/疯跑 193 全靠它;未迁移时角色只会站桩(2026-07-03 用户实测)。
        // o[2](即时重载 flag)不建模:clean 引擎换精灵即时生效,无"延迟到下次装载"语义。
        const actor = ROLE_SLUGS[o[0] ?? 0]
        const sprite = actor !== undefined ? ctx.spriteIdForNum?.(o[1] ?? 0) : undefined
        if (actor && sprite) push({ kind: 'setActorSprite', actor, sprite })
        else {
          push({
            kind: 'unmigrated',
            opcode: oc,
            operands: [...o],
            note: sprite ? `未知 roleId ${o[0]}` : '无精灵注册回调',
          })
          note(ctx, sprite ? 'setActorSprite 未知角色' : 'setActorSprite 无注册回调')
        }
      } else if (oc === 0x1a) {
        // 0x1A 改角色 SoA 属性(script.c:834:p[field*6 + role] = val)。全游戏 4 站点全是**形象**字段
        // (成年灵儿 role 1):field 0=头像 / 1=战斗精灵 / 2=大世界精灵 / 64=走路帧。映射成具名
        // setActorAppearance,杜绝下标式身份。field 2 的精灵号 → id(spriteIdForNum);64 走路帧
        // 由新精灵 layout 自带,丢弃。o[2]=0(当前玩家,数据中未出现)→ unmigrated。
        const roleIdx = (o[2] ?? 0) - 1
        const actor = roleIdx >= 0 ? ROLE_SLUGS[roleIdx] : undefined
        const field = o[0] ?? -1
        const val = o[1] ?? 0
        if (actor && field === 0) push({ kind: 'setActorAppearance', actor, portrait: val })
        else if (actor && field === 1) push({ kind: 'setActorAppearance', actor, battleSprite: val })
        else if (actor && field === 2) {
          const sprite = ctx.spriteIdForNum?.(val)
          if (sprite) push({ kind: 'setActorAppearance', actor, spriteId: sprite })
          else {
            push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '0x1A 精灵无注册回调' })
            note(ctx, '0x1A setActorAppearance 无精灵回调')
          }
        } else if (actor && field === 64) {
          push(undefined) // 走路帧:新精灵 layout 自带,clean 模型无独立帧数字段
        } else {
          push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: `0x1A 字段 ${field}` })
          note(ctx, `0x1A 字段 ${field}(非形象/o2=0)`)
        }
      } else if (oc === 0x90 && (o[2] ?? 0) === 0 && (o[1] ?? 0) === 0) {
        // 0x90 剧情侧清 enemy scriptOnTurnStart(六脚蜘蛛 s138 酒剑仙救场后降级):原版敌种绑定的
        // 「说一次」hack。二阶段遭遇绑定后**无需** —— 对话属于这场遭遇的 startBattle,丢弃(no-op)。
        push(undefined)
      } else if (oc === 0x05 || oc === 0x8e) push({ kind: 'clearDialog' })
      else if (oc === 0xa7)
        push(undefined) // noop(备份屏)
      else if (oc === 0x1e && (o[1] ?? 0) === 0)
        push({ kind: 'giveMoney', delta: signExtendI16(o[0] ?? 0) })
      else if (oc === 0x20 && (o[2] ?? 0) === 0) {
        const cnt = (o[1] ?? 0) > 1 ? o[1] : undefined
        push({ kind: 'loseItem', itemId: String(o[0]), ...(cnt ? { count: cnt } : {}) })
      } else if (oc >= 0x0b && oc <= 0x0e) {
        if (owner)
          push({ kind: 'stepEntity', entity: owner, dir: FACING_BY_DIR[oc - 0x0b] ?? 'down' })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '单步无属主' })
      } else if (oc === 0x10 || oc === 0x11 || oc === 0x7c || oc === 0x82) {
        const sp = oc === 0x11 ? 2 : oc === 0x10 ? 3 : oc === 0x7c ? 4 : 8
        if (owner)
          push({
            kind: 'moveEntity',
            entity: owner,
            to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
            speed: SPEED[sp]!,
          })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: 'walkTo 无属主' })
      } else if (oc === 0x70 || oc === 0x7a || oc === 0x7b) {
        const sp = oc === 0x70 ? 2 : oc === 0x7a ? 4 : 8
        push({
          kind: 'moveParty',
          to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
          speed: SPEED[sp]!,
        })
      } else if (oc === 0x75) {
        // SetParty(C7/D22):operand[0..2] = roleId+1(0=空)→ 角色模板 slug 有序表
        const members = o.filter((v): v is number => typeof v === 'number' && v > 0)
          .map((v) => ROLE_SLUGS[v - 1])
          .filter((m): m is (typeof ROLE_SLUGS)[number] => m !== undefined)
        push({ kind: 'setParty', members: [...members] })
      } else if (oc === 0xa1) {
        // SetAllPartyPos 全员聚拢队首:骑乘链开头(E7)→ mountParty(属主=载具,全员叠上)
        if (owner) push({ kind: 'mountParty', entity: owner })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '聚拢无属主' })
      } else if (oc === 0x3f || oc === 0x44 || oc === 0x97) {
        // PartyRideEventObject 骑当前对象走位(速 2/4/8);挂载 op-scoped:
        // 引擎 moveParty 走位即下筏(dismountParty),连骑不卸、无持久态
        const sp = oc === 0x3f ? 2 : oc === 0x44 ? 4 : 8
        if (owner)
          push({
            kind: 'ride',
            entity: owner,
            to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
            speed: SPEED[sp]!,
          })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '骑乘无属主' })
      } else if (oc === 0x75) {
        // SetParty(C7/D22):operands = roleId+1(0=空槽)→ setParty 模板 id 有序表
        //(站位序;离队进 reserve 状态不丢)。⚠ 杜绝下标:翻成 slug 不是序号。
        const members: string[] = []
        for (const v of o) {
          const slug = v > 0 ? ROLE_SLUGS[v - 1] : undefined
          if (slug) members.push(slug)
        }
        push({ kind: 'setParty', members })
      } else if (oc === 0x6e) {
        push({ kind: 'nudgeParty', dx: signExtendI16(o[0] ?? 0), dy: signExtendI16(o[1] ?? 0) })
      } else if (oc === 0x7d) {
        const ent = pcRef(o[0] ?? 0)
        if (ent)
          push({
            kind: 'nudgeEntity',
            entity: ent,
            dx: signExtendI16(o[1] ?? 0),
            dy: signExtendI16(o[2] ?? 0),
          })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: 'moveObject 无属主' })
      } else if (oc === 0x6c) {
        const ent = pcRef(o[0] ?? 0)
        if (ent) {
          flush()
          body.push({
            kind: 'nudgeEntity',
            entity: ent,
            dx: signExtendI16(o[1] ?? 0),
            dy: signExtendI16(o[2] ?? 0),
          })
          body.push({ kind: 'animEntity', entity: ent })
        } else
          push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: 'walkOneStep 无属主' })
      } else if (oc === 0x87) {
        if (owner) push({ kind: 'animEntity', entity: owner })
        else push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: 'animate 无属主' })
      } else if (oc === 0x4c) {
        // B8 追逐:0x4C [maxDist, speed, floating](缺省 8/4;script.c:1733-1751)。原版靠
        // goto-self/0x06 概率环逐帧重复 —— 新引擎 auto runner 天然循环,单条声明即持续追逐,
        // 段后骨架整体吞掉(概率停顿细节属演出损耗,可接受)。
        flush()
        body.push({
          kind: 'chasePlayer',
          range: (o[0] ?? 0) || 8,
          speed: (o[1] ?? 0) || 4,
          ...((o[2] ?? 0) !== 0 ? { floating: true } : {}),
        })
        return { body, term: { kind: 'end' } }
      } else if (oc === 0x4b) {
        // B8:实体短暂消失(原版 sVanishTime=-15 ≈ 1.5s;野怪战胜后的重生窗)
        push({ kind: 'vanishEntity', seconds: 2 })
      } else if (oc === 0x52) {
        // B8:self 长消失(script.c:1794-1800 sVanishTime=op0||800 帧,10fps ≈ 80s;野怪重生主机制)
        push({ kind: 'vanishEntity', seconds: Math.round(((o[0] ?? 0) || 800) / 10) })
      } else if (oc === 0x4e) {
        push({ kind: 'loadLastSave' })
      } else if (oc === 0x4f) {
        push({ kind: 'fade', dir: 'out', ms: 900, color: 'red' })
      } else if (oc === 0x8a) {
        // B9:标记下一场战斗自动(fAutoBattle);合进紧邻的 startBattle.auto(下方消费 pendingAuto)
        flush()
        ctx.pendingAuto = true
      } else if (oc === 0x07) {
        flush()
        const onLose = (o[1] ?? 0) !== 0 ? inlineArm(o[1]) : undefined
        const onFlee = (o[2] ?? 0) !== 0 ? inlineArm(o[2]) : undefined
        body.push({
          kind: 'startBattle',
          team: o[0] ?? 0,
          ...(onLose?.length ? { onLose } : {}),
          ...(onFlee?.length ? { onFlee } : {}),
          ...(ctx.pendingAuto ? { auto: true } : {}),
          // 原版 fIsBoss = !op2(script.c:3318):无逃跑臂 = 首领战(不可逃+胜利曲 2)
          ...((o[2] ?? 0) === 0 ? { boss: true } : {}),
        })
        ctx.pendingAuto = false
      } else if (oc === 0x06) {
        flush()
        // jumpByRate:random(1,100) ≥ op0 → 跳。跳走臂结构:branch{chance,then:臂},不中直走
        body.push({
          kind: 'branch',
          cond: { kind: 'chance', percent: 101 - (o[0] ?? 100) },
          then: inlineArm(o[1]),
        })
      } else if (oc === 0x0a) {
        flush()
        body.push({ kind: 'confirm', onNo: inlineArm(o[0]) })
      } else if (oc === 0x1e && (o[1] ?? 0) !== 0) {
        flush()
        const amt = signExtendI16(o[0] ?? 0)
        if (amt < 0) {
          // 钱不够 → 跳走臂;够 → 扣钱直走
          body.push({
            kind: 'branch',
            cond: { kind: 'not', cond: { kind: 'hasMoney', atLeast: -amt } },
            then: inlineArm(o[1]),
          })
          body.push({ kind: 'giveMoney', delta: amt })
        } else {
          body.push({ kind: 'giveMoney', delta: amt })
          note(ctx, 'addCash 正数带跳(原版不可能跳)')
        }
      } else if (oc === 0x20 && (o[2] ?? 0) !== 0) {
        flush()
        const cnt = Math.max(1, o[1] ?? 1)
        body.push({
          kind: 'branch',
          cond: { kind: 'not', cond: { kind: 'hasItem', itemId: String(o[0]), atLeast: cnt } },
          then: inlineArm(o[2]),
        })
        body.push({ kind: 'loseItem', itemId: String(o[0]), ...(cnt > 1 ? { count: cnt } : {}) })
      } else if (oc === 0x94) {
        flush()
        const ent = entRef(o[0] ?? 0)
        if (ent)
          body.push({
            kind: 'branch',
            cond: { kind: 'entityState', entity: ent, is: signExtendI16(o[1] ?? 0) },
            then: inlineArm(o[2]),
          })
        else
          push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: 'jumpIfObjState 无属主' })
      } else if (oc === 0x79) {
        flush()
        body.push({
          kind: 'branch',
          cond: { kind: 'inParty', actorId: ROLE_SLUGS[o[0] ?? 0] ?? String(o[0]) },
          then: inlineArm(o[1]),
        })
      } else if (oc === 0x7f) {
        flush()
        const [a = 0, b = 0, cc = 0] = o
        if (a === 0 && b === 0)
          body.push({ kind: 'cameraSnap' }) // 回正
        else if (cc === 0xffff) body.push({ kind: 'cameraSnap', to: partyPosToGrid(a, b, 0) })
        else
          body.push({
            kind: 'cameraPan',
            dx: signExtendI16(a),
            dy: signExtendI16(b),
            frames: Math.max(1, cc),
          })
      } else if (oc === 0x04) {
        // callScript:目标链整段内联(owner 可被 op1 覆盖;memo 防重展)
        flush()
        const callOwner = (o[1] ?? 0) !== 0 ? `e${o[1]}` : owner
        const memoKey = `call:L_${o[0]}|${callOwner ?? ''}`
        const memo = (ctx.armMemo ??= new Map())
        let calleeBody = memo.get(memoKey)
        if (!calleeBody) {
          const target = ctx.labelAt.get(`L_${o[0]}`)
          if (!target || depth >= MAX_ARM_DEPTH) {
            note(ctx, target ? 'call 深度截断' : 'call 目标缺失')
            calleeBody = [
              { kind: 'unmigrated', opcode: oc, operands: [...o], note: 'call 不可内联' },
            ]
          } else {
            memo.set(memoKey, [])
            const r = walkBody(target.cmds, target.idx, callOwner, ctx, depth + 1)
            calleeBody =
              r.body.length > MAX_ARM_BODY
                ? [
                    {
                      kind: 'unmigrated',
                      opcode: oc,
                      operands: [...o],
                      note: `call 体超长(${r.body.length})`,
                    },
                  ]
                : r.body
            if (r.body.length > MAX_ARM_BODY) note(ctx, 'call 体超长截断')
          }
          memo.set(memoKey, calleeBody)
        }
        body.push(...calleeBody)
      } else if (oc === 0x24 || oc === 0x25) {
        flush()
        if ((o[0] ?? 0) === 0) {
          // 原版:op0==0 整条无效
        } else {
          const ent = entRef(o[0]!)
          if (!ent) note(ctx, '页切换无属主')
          else if ((o[1] ?? 0) === 0) {
            body.push(
              oc === 0x24
                ? { kind: 'setEntityAuto', entity: ent, stages: [] }
                : { kind: 'setEntityTrigger', entity: ent, stages: [] },
            )
          } else {
            const sub = translateStages(`L_${o[1]}`, ent, ctx)
            if (sub?.length) {
              body.push(
                oc === 0x24
                  ? { kind: 'setEntityAuto', entity: ent, stages: sub }
                  : { kind: 'setEntityTrigger', entity: ent, stages: sub },
              )
            } else {
              body.push({ kind: 'unmigrated', opcode: oc, operands: [...o], note: '页目标不可译' })
              note(ctx, '页目标不可译')
            }
          }
        }
      } else if (oc === 0x40) {
        flush()
        if ((o[0] ?? 0) !== 0) {
          const ent = entRef(o[0]!)
          const mode = o[1] ?? 0
          if (ent) {
            body.push(
              mode >= 1 && mode <= 3
                ? { kind: 'setEntityTriggerMode', entity: ent, on: 'interact', range: mode }
                : mode >= 4 && mode <= 8
                  ? { kind: 'setEntityTriggerMode', entity: ent, on: 'touch', range: mode - 4 }
                  : { kind: 'setEntityTriggerMode', entity: ent },
            )
          }
        }
      } else if (oc === 0x26 || oc === 0x27) {
        push({ kind: 'openShop', shop: o[0] ?? 0, mode: oc === 0x26 ? 'buy' : 'sell' })
      } else if (oc === 0x6d && (o[0] ?? 0) > 0 && (o[1] ?? 0) > 0) {
        // 0x6D 改场景 onEnter 到新地址(45 站点目标全是新链):emit 占位(stage=-1 + _addr),
        // migrate-content post-pass 把目标链追加为目标场景 onEnter 新段后回填真下标。
        // op2(teleport 地址)非零仅 1 站点且与 enter 互斥 —— 仍落 unmigrated 保留
        const tgt = (o[0] ?? 1) - 1 // 1-based 场景号 → 0-based slug
        push({
          kind: 'setSceneStage',
          scene: `s${String(tgt).padStart(3, '0')}`,
          stage: -1,
          _addr: o[1],
        } as Command)
        ctx.report.sceneStagePatches = (ctx.report.sceneStagePatches ?? 0) + 1
      } else if (JUMP_FAMILY.has(oc)) {
        // 未实现的跳转族:截断本段(不猜控制流)
        flush()
        body.push({
          kind: 'unmigrated',
          opcode: oc,
          operands: [...o],
          note: `jump-family 0x${oc.toString(16)}`,
        })
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
    out.push({
      kind: 'loadScene',
      scene: c.scene,
      ...(pos ? { pos } : {}),
      ...(facing ? { facing } : {}),
    })
    i += consumed
  }
  return out
}

/**
 * 迁移期内部战斗配置标记(原版 0x4A/0x45 全局变量的翻译中转;schema overrideSceneBattle 已退役,
 * 不复活)。以隐藏于 Command[] 的形式(as 出入,免全链改型)流经 fold(邻战 → startBattle 一次性
 * 参数)与 bakeAndStripBattleCfg(→ SceneDef 默认),**绝不出现在最终 content**。kind 判别经 asBattleCfg。
 */
export interface BattleCfgMarker {
  kind: 'overrideSceneBattle'
  scene?: string
  fieldId?: number
  musicId?: number
}
export function battleCfgMarker(cfg: { fieldId?: number; musicId?: number }): Command {
  return {
    kind: 'overrideSceneBattle',
    ...(cfg.fieldId !== undefined ? { fieldId: cfg.fieldId } : {}),
    ...(cfg.musicId !== undefined ? { musicId: cfg.musicId } : {}),
  } as unknown as Command
}
export function asBattleCfg(c: Command): BattleCfgMarker | undefined {
  const m = c as unknown as BattleCfgMarker
  return m.kind === 'overrideSceneBattle' && m.scene === undefined ? m : undefined
}

/**
 * 战斗配置 peephole:BattleCfgMarker(0x45/0x4A 翻译产物)——
 * ① 相邻同类合并(field+music 常成对出现);② 其后 ≤3 距离内出现 startBattle →
 * fold 成该 startBattle 的一次性 fieldId/musicId(原版剧情战「战前现场设」的 28+28 处);
 * 剩余标记保留(bakeAndStripBattleCfg 烘成 SceneDef 默认;赤鬼王/水魔兽类打完回落场景默认)。
 */
export function foldBattleConfig(body: Command[]): Command[] {
  const out: Command[] = []
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!
    const cfg = asBattleCfg(c)
    if (!cfg) {
      out.push(c)
      continue
    }
    let fieldId = cfg.fieldId
    let musicId = cfg.musicId
    // ① 吸收紧随的同类(合并 field+music 对)
    let j = i + 1
    for (; j < body.length; j++) {
      const n = asBattleCfg(body[j]!)
      if (!n) break
      fieldId = n.fieldId ?? fieldId
      musicId = n.musicId ?? musicId
    }
    // ② 向前看 ≤3:startBattle → fold 成一次性参数
    let folded = false
    for (let k = j; k <= j + 2 && k < body.length; k++) {
      const n = body[k]!
      if (n.kind === 'startBattle') {
        body[k] = {
          ...n,
          ...(fieldId !== undefined ? { fieldId } : {}),
          ...(musicId !== undefined ? { musicId } : {}),
        }
        folded = true
        break
      }
      // 中途隔的只允许轻量演出指令(设向/帧/音效);其余打断 fold
      if (!['setEntityFacing', 'setEntityFrame', 'playSound', 'wait'].includes(n.kind)) break
    }
    if (!folded && (fieldId !== undefined || musicId !== undefined))
      out.push(battleCfgMarker({ fieldId, musicId }))
    i = j - 1
  }
  return out
}

/**
 * 从脚本段 bake 出战斗配置默认(last-wins 累加进 acc:后设的赢 —— 赤鬼王类「打完设回区域曲」在触发段、
 * 晚于 enter 段,区域常态值胜)+ strip 所有标记 → 干净 stages(标记绝不进最终 content)。
 * 替代原 hoistBattleDefaults;onEnter/实体触发/onTeleport 共用同一场景 acc。
 */
export function bakeAndStripBattleCfg(
  stages: ScriptStage[],
  acc: { battleFieldId?: number; battleMusicId?: number },
): ScriptStage[] {
  return stages.map((s) => ({
    ...s,
    body: s.body.filter((c) => {
      const m = asBattleCfg(c)
      if (!m) return true
      if (m.fieldId !== undefined) acc.battleFieldId = m.fieldId
      if (m.musicId !== undefined) acc.battleMusicId = m.musicId
      return false
    }),
  }))
}

/** 对整条 stages 应用 peephole(体内折叠;段间不跨)。 */
export function foldStages(stages: ScriptStage[]): ScriptStage[] {
  return stages.map((s) => ({ ...s, body: foldBattleConfig(foldDoorPattern(s.body)) }))
}
