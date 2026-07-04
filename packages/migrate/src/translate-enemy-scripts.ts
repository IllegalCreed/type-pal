/**
 * 敌人战斗脚本翻译(M4c-2)—— scriptOnTurnStart / scriptOnReady / scriptOnBattleEnd。
 *
 * 原版敌钩子是 **advance 游标状态机**:链按 `end` 分段,每轮 hook 消费一段并推进游标,
 * 走到尾段后停在原地(稳态)。考证(2026-07-04,全 54 敌 67 链普查 + script.c):
 * - 0x67 [magic, rate]:设 fallback 施法参数(rate 缺省 = 10 必中;65535 哨兵 = 掷中不动;
 *   0 = 关施法)。**持久生效直到下一次 0x67** → 翻成 [turn 区间, chance] cast/pass 规则。
 * - 0x06 [rate, tgt]:rate% 执行下一条(不中跳 tgt;tgt=0 = 终止本轮)。
 * - 0x9F 变身 / 0x9C 分裂 / 0x9E 召唤:跟在 0x06 概率门后 → [turn>=k, chance] 动作规则。
 * - 0x91 [tgt]:非首只跳走 → 段条件 firstOfKind。
 * - 对话/音效(0x47)/逃跑(0x69):演出 → choreography(事件 Command 词汇)。
 * - battleEnd:全部是「(概率)给物+对白」→ 复用 translateStages → onDefeated。
 * 翻不净(0x79 队伍条件对话 / 复杂跳转臂等)→ pending 标注,编辑器手修(同 M3 方针)。
 */
import type { AiRule, BattleChoreography, Command } from '@type-pal/content'
import type { SourceCmd } from './source-facts.js'
import type { TranslateCtx } from './translate-events.js'
import { translateStages } from './translate-events.js'

export interface EnemyScriptTranslation {
  rules: AiRule[]
  choreography: BattleChoreography[]
  onDefeated?: Command[]
  pending: string[]
}

interface Seg {
  /** 1-based 轮次(= advance 游标位置)。 */
  k: number
  ops: SourceCmd[]
}

/** 链 → advance 段列表(end 分隔;跟 goto/0x04 call;环/深度截断)。 */
function segment(ctx: TranslateCtx, ip: number): Seg[] | undefined {
  const start = ctx.labelAt.get(`L_${ip}`)
  if (!start) return undefined
  const segs: Seg[] = []
  let cur: SourceCmd[] = []
  const stack: { cmds: readonly SourceCmd[]; idx: number }[] = []
  let cmds = start.cmds
  let i = start.idx
  const seen = new Set<string>()
  let guard = 0
  while (i < cmds.length && guard++ < 400) {
    const key = `${i}`
    if (seen.has(key)) break
    seen.add(key)
    const c = cmds[i]!
    // 邻链边界:走到带 label 的行(非本链首)= 下一个敌/剧情链的开头 → 本链终结。
    // (原版游标理论上能推进过去,但那要 10+ 轮,实战不可达;不拦会把邻链规则误并入本敌。)
    if (c.label && !(cmds === start.cmds && i === start.idx) && stack.length === 0) break
    if (c.op === 'end') {
      // call 内的 end = 返回;顶层 end = 段界
      const back = stack.pop()
      if (back) {
        cmds = back.cmds
        i = back.idx
        continue
      }
      segs.push({ k: segs.length + 1, ops: cur })
      cur = []
      i++
      if (segs.length > 24) break // 防病理长链
      continue
    }
    if (c.op === 'goto') {
      const t = ctx.labelAt.get(`L_${(c as { to?: number }).to}`)
      if (!t) break
      cmds = t.cmds
      i = t.idx
      continue
    }
    if (c.op === 'raw' && c.opcode === 0x04) {
      const t = ctx.labelAt.get(`L_${c.operands?.[0]}`)
      if (t) {
        stack.push({ cmds, idx: i + 1 })
        cmds = t.cmds
        i = t.idx
        continue
      }
    }
    cur.push(c)
    i++
  }
  if (cur.length) segs.push({ k: segs.length + 1, ops: cur })
  // 去掉尾部空段(链尾连续 end)
  while (segs.length && segs[segs.length - 1]!.ops.length === 0) segs.pop()
  return segs
}

/** turn 区间条件:[k, until) 与可选 chance/firstOfKind 组合。 */
function turnCond(k: number, until: number | undefined, extra: (AiRule['when'] | undefined)[]): AiRule['when'] {
  const parts: NonNullable<AiRule['when']>[] = []
  if (k > 1) parts.push({ kind: 'turn', op: '>=', value: k })
  if (until !== undefined) parts.push({ kind: 'not', cond: { kind: 'turn', op: '>=', value: until } })
  for (const e of extra) if (e) parts.push(e)
  if (parts.length === 0) return undefined
  if (parts.length === 1) return parts[0]
  return { kind: 'all', of: parts }
}

/**
 * 翻译一个敌人的 turnStart/ready 钩子链(策略 + 演出)。
 * hook 决定演出挂点(turnStart 演出常见;ready 演出罕见,同样挂 turnStart 播放)。
 */
function translateHook(
  ctx: TranslateCtx,
  ip: number,
  out: EnemyScriptTranslation,
  hookName: string,
  casts: { k: number; magic: number; rate: number }[],
): void {
  const segs = segment(ctx, ip)
  if (!segs) {
    out.pending.push(`${hookName}: L_${ip} 不可达`)
    return
  }
  for (const seg of segs) {
    let firstOnly = false
    const dlg: Command[] = []
    let i = 0
    while (i < seg.ops.length) {
      const c = seg.ops[i]!
      const oc = c.op === 'raw' ? c.opcode : undefined
      const ops = c.operands ?? []
      if (oc === 0x91) {
        firstOnly = true // 非首只跳走 = 首只才执行本段
        i++
        continue
      }
      if (oc === 0x67) {
        casts.push({ k: seg.k, magic: ops[0] ?? 0, rate: ops[1] || 10 })
        i++
        continue
      }
      if (oc === 0x06) {
        const rate = ops[0] ?? 100
        const tgt = ops[1] ?? 0
        const nxt = seg.ops[i + 1]
        const noc = nxt?.op === 'raw' ? nxt.opcode : undefined
        if (tgt === 0 && (noc === 0x9f || noc === 0x9c || noc === 0x9e)) {
          const nops = nxt?.operands ?? []
          const when = turnCond(seg.k, undefined, [
            { kind: 'chance', percent: rate },
            firstOnly ? { kind: 'firstOfKind' } : undefined,
          ])
          if (noc === 0x9f) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'transform', enemyId: `enemy-${nops[0]}` } })
          if (noc === 0x9c) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'divide', copies: 1 } })
          if (noc === 0x9e) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'summon', ...(nops[0] ? { enemyId: `enemy-${nops[0]}` } : {}), count: Math.max(1, nops[1] ?? 1) } })
          i += 2
          // 动作后常跟 0x67 收尾(设哨兵/关闭)——按时间线正常收
          continue
        }
        out.pending.push(`${hookName} 段${seg.k}: 0x06 复杂跳转臂(tgt=${tgt})`)
        i++
        continue
      }
      if (oc === 0x9c || oc === 0x9f || oc === 0x9e) {
        // 无概率门的裸动作(红史莱姆 0x9c)
        const nops = c.operands ?? []
        const when = turnCond(seg.k, undefined, [firstOnly ? { kind: 'firstOfKind' } : undefined])
        if (oc === 0x9f) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'transform', enemyId: `enemy-${nops[0]}` } })
        if (oc === 0x9c) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'divide', copies: 1 } })
        if (oc === 0x9e) out.rules.push({ at: 'act', ...(when ? { when } : {}), do: { kind: 'summon', ...(nops[0] ? { enemyId: `enemy-${nops[0]}` } : {}), count: Math.max(1, nops[1] ?? 1) } })
        i++
        continue
      }
      if (oc === 0x47) {
        dlg.push({ kind: 'playSound', soundId: ops[0] ?? 0 })
        i++
        continue
      }
      if (oc === 0x69) {
        dlg.push({ kind: 'fleeBattle' })
        i++
        continue
      }
      if (oc === 0x05 || oc === 0x8e) {
        i++ // 清框/恢复画面:演出播放器自管,忽略
        continue
      }
      if (c.op === 'showDialog') {
        const idx = (c as { messageIndex?: number }).messageIndex
        const text = (c as { text?: string }).text ?? ''
        const key = idx !== undefined ? `dlg.${idx}` : text
        if (idx !== undefined) ctx.locale[key] = text
        dlg.push({ kind: 'dialog', line: { text: key } }) // 说话人由战斗对话条自补敌名
        i++
        continue
      }
      if (typeof c.op === 'string' && c.op.startsWith('setDialogStyle')) {
        i++
        continue
      }
      out.pending.push(`${hookName} 段${seg.k}: ${c.op === 'raw' ? `op 0x${c.opcode?.toString(16)}` : c.op} 未翻`)
      i++
    }
    if (dlg.length) {
      out.choreography.push({
        at: 'turnStart',
        once: true, // advance 语义:该段只演一次
        ...(seg.k > 1 || firstOnly
          ? {
              when: turnCond(seg.k, undefined, [firstOnly ? { kind: 'firstOfKind' } : undefined]),
            }
          : {}),
        body: dlg,
      })
    }
  }
}

/** 施法时间线 → 区间规则(magic=0 区间无规则 = 纯普攻;65535 → pass)。 */
function castTimelineRules(casts: readonly { k: number; magic: number; rate: number }[]): AiRule[] {
  const sorted = [...casts].sort((a, b) => a.k - b.k)
  // 同 k 后者覆盖(脚本首段 0x67 覆盖 initial)
  const dedup: typeof sorted = []
  for (const c of sorted) {
    if (dedup.length && dedup[dedup.length - 1]!.k === c.k) dedup[dedup.length - 1] = c
    else dedup.push(c)
  }
  const rules: AiRule[] = []
  for (let j = 0; j < dedup.length; j++) {
    const c = dedup[j]!
    const until = dedup[j + 1]?.k
    if (c.magic === 0) continue
    const when = turnCond(c.k, until, [{ kind: 'chance', percent: c.rate * 10 }])
    rules.push({
      at: 'act',
      ...(when ? { when } : {}),
      do: c.magic === 0xffff ? { kind: 'pass' } : { kind: 'cast', skillId: String(c.magic) },
    })
  }
  return rules
}

/**
 * 翻译一个敌人的三钩子。battleEnd 复用事件翻译(线性给物+对白)。
 * initialCast = 敌表 fallback(magic/magicRate),并入 0x67 时间线统一生成区间规则
 * (原版语义:初始参数生效至首个 0x67 覆盖)。
 */
export function translateEnemyScripts(
  ctx: TranslateCtx,
  hooks: { turnStart?: number; ready?: number; battleEnd?: number },
  initialCast?: { magic: number; rate: number },
): EnemyScriptTranslation {
  const out: EnemyScriptTranslation = { rules: [], choreography: [], pending: [] }
  const casts: { k: number; magic: number; rate: number }[] = []
  if (initialCast && initialCast.magic !== 0 && initialCast.rate > 0) {
    casts.push({ k: 1, magic: initialCast.magic, rate: initialCast.rate })
  }
  if (hooks.ready) translateHook(ctx, hooks.ready, out, 'ready', casts)
  if (hooks.turnStart) translateHook(ctx, hooks.turnStart, out, 'turnStart', casts)
  out.rules.push(...castTimelineRules(casts))
  if (hooks.battleEnd) {
    const stages = translateStages(`L_${hooks.battleEnd}`, undefined, ctx)
    const body = stages?.[0]?.body ?? []
    const bad = body.filter((c) => c.kind === 'unmigrated')
    if (bad.length) out.pending.push(`battleEnd: ${bad.length} 条未翻`)
    if (body.length) out.onDefeated = body
  }
  return out
}
