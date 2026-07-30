/**
 * R13-confirm parent 的冻结敌脚本翻译权威。
 *
 * 这份实现固定为发布提交 6a8296a1 的 v9 语义，只用于重建已经发布的
 * P2 → P7 → r13-confirm 历史父层。生产 current migration 必须继续使用
 * translate-enemy-scripts.ts 的 v10 persistent hook 翻译器。
 */
import type {
  AiRule,
  BattleChoreography,
  BattleChoreographyAction,
  Command,
  DialogueCue,
} from '@type-pal/content'
import {
  DEFAULT_LEGACY_DIALOG_STATE,
  decodeLegacyDialogueLine,
  LEGACY_DIALOG_DEFAULT_SPEED,
  putLegacyDialogueText,
} from '../../legacy-dialog.js'
import { resolveSoundAsset } from '../../sound-migration.js'
import type { SourceCmd } from '../../source-facts.js'
import type { TranslateCtx } from '../../translate-events.js'
import { translateStages } from '../../translate-events.js'

export const R13_CONFIRM_PARENT_ENEMY_AUTHORITY = 'r13-confirm-parent-enemy-v9@6a8296a1' as const

/**
 * 6a8296a1 发布时的敌脚本翻译输出边界。
 *
 * 特别是 onDefeated 仍是通用 Command[]，不得借用 current v10 的
 * EnemyOnDefeatedCommandV10；历史重放只在 mapEnemies 注入点做一次适配。
 */
export interface LegacyEnemyScriptTranslationV9 {
  rules: AiRule[]
  choreography: BattleChoreography[]
  onDefeated?: Command[]
  pending: string[]
}

const NAME_WORD_TO_SLUG: Readonly<Record<number, string>> = {
  36: 'li-xiaoyao',
  37: 'zhao-linger',
  38: 'lin-yueru',
  39: 'anu',
  40: 'wu-hou',
  41: 'gai-luojiao',
}

const ENEMY_SPEAKER_RE = /[∶:：]\s*$/

interface Segment {
  k: number
  ops: SourceCmd[]
}

function segment(ctx: TranslateCtx, ip: number): Segment[] | undefined {
  const start = ctx.labelAt.get(`L_${ip}`)
  if (!start) return undefined
  const segments: Segment[] = []
  let current: SourceCmd[] = []
  const stack: { cmds: readonly SourceCmd[]; idx: number }[] = []
  let commands = start.cmds
  let index = start.idx
  const seen = new Set<string>()
  let guard = 0
  while (index < commands.length && guard++ < 400) {
    const key = `${index}`
    if (seen.has(key)) break
    seen.add(key)
    const command = commands[index]!
    if (command.label && !(commands === start.cmds && index === start.idx) && stack.length === 0)
      break
    if (command.op === 'end') {
      const back = stack.pop()
      if (back) {
        commands = back.cmds
        index = back.idx
        continue
      }
      segments.push({ k: segments.length + 1, ops: current })
      current = []
      index++
      if (segments.length > 24) break
      continue
    }
    if (command.op === 'goto') {
      const target = ctx.labelAt.get(`L_${(command as { to?: number }).to}`)
      if (!target) break
      commands = target.cmds
      index = target.idx
      continue
    }
    if (command.op === 'raw' && command.opcode === 0x04) {
      const target = ctx.labelAt.get(`L_${command.operands?.[0]}`)
      if (target) {
        stack.push({ cmds: commands, idx: index + 1 })
        commands = target.cmds
        index = target.idx
        continue
      }
    }
    current.push(command)
    index++
  }
  if (current.length) segments.push({ k: segments.length + 1, ops: current })
  while (segments.length && segments[segments.length - 1]!.ops.length === 0) segments.pop()
  return segments
}

function turnCondition(
  turn: number,
  until: number | undefined,
  extra: (AiRule['when'] | undefined)[],
): AiRule['when'] {
  const parts: NonNullable<AiRule['when']>[] = []
  if (turn > 1) parts.push({ kind: 'turn', op: '>=', value: turn })
  if (until !== undefined)
    parts.push({ kind: 'not', cond: { kind: 'turn', op: '>=', value: until } })
  for (const condition of extra) if (condition) parts.push(condition)
  if (parts.length === 0) return undefined
  if (parts.length === 1) return parts[0]
  return { kind: 'all', of: parts }
}

function translateHook(
  ctx: TranslateCtx,
  ip: number,
  out: LegacyEnemyScriptTranslationV9,
  hookName: string,
  casts: { k: number; magic: number; rate: number }[],
): void {
  const segments = segment(ctx, ip)
  if (!segments) {
    out.pending.push(`${hookName}: L_${ip} 不可达`)
    return
  }
  for (const current of segments) {
    let firstOnly = false
    let partyGate: string | undefined
    const body: BattleChoreographyAction[] = []
    let pendingSpeaker: string | undefined
    let dialogState = { ...DEFAULT_LEGACY_DIALOG_STATE }
    let index = 0
    while (index < current.ops.length) {
      const command = current.ops[index]!
      const opcode = command.op === 'raw' ? command.opcode : undefined
      const operands = command.operands ?? []
      if (opcode === 0x91) {
        firstOnly = true
        index++
        continue
      }
      if (opcode === 0x79) {
        const laterDialog = current.ops
          .slice(index + 1)
          .some((candidate) => candidate.op === 'showDialog')
        if (!laterDialog) {
          partyGate = NAME_WORD_TO_SLUG[operands[0] ?? -1]
          const targetOps = segment(ctx, operands[1] ?? 0)?.[0]?.ops ?? []
          current.ops.splice(index + 1, 0, ...targetOps)
        }
        index++
        continue
      }
      if (opcode === 0x67) {
        casts.push({
          k: current.k,
          magic: operands[0] ?? 0,
          rate: operands[1] || 10,
        })
        index++
        continue
      }
      if (opcode === 0x06) {
        const rate = operands[0] ?? 100
        const target = operands[1] ?? 0
        const next = current.ops[index + 1]
        const nextOpcode = next?.op === 'raw' ? next.opcode : undefined
        if (target === 0 && (nextOpcode === 0x9f || nextOpcode === 0x9c || nextOpcode === 0x9e)) {
          const nextOperands = next?.operands ?? []
          const when = turnCondition(current.k, undefined, [
            { kind: 'chance', percent: rate },
            firstOnly ? { kind: 'firstOfKind' } : undefined,
          ])
          if (nextOpcode === 0x9f)
            out.rules.push({
              at: 'act',
              ...(when ? { when } : {}),
              do: { kind: 'transform', enemyId: `enemy-${nextOperands[0]}` },
            })
          if (nextOpcode === 0x9c)
            out.rules.push({
              at: 'act',
              ...(when ? { when } : {}),
              do: { kind: 'divide', copies: 1 },
            })
          if (nextOpcode === 0x9e)
            out.rules.push({
              at: 'act',
              ...(when ? { when } : {}),
              do: {
                kind: 'summon',
                ...(nextOperands[0] ? { enemyId: `enemy-${nextOperands[0]}` } : {}),
                count: Math.max(1, nextOperands[1] ?? 1),
              },
            })
          index += 2
          continue
        }
        out.pending.push(`${hookName} 段${current.k}: 0x06 复杂跳转臂(tgt=${target})`)
        index++
        continue
      }
      if (opcode === 0x9c || opcode === 0x9f || opcode === 0x9e) {
        const actionOperands = command.operands ?? []
        const when = turnCondition(current.k, undefined, [
          firstOnly ? { kind: 'firstOfKind' } : undefined,
        ])
        if (opcode === 0x9f)
          out.rules.push({
            at: 'act',
            ...(when ? { when } : {}),
            do: { kind: 'transform', enemyId: `enemy-${actionOperands[0]}` },
          })
        if (opcode === 0x9c)
          out.rules.push({
            at: 'act',
            ...(when ? { when } : {}),
            do: { kind: 'divide', copies: 1 },
          })
        if (opcode === 0x9e)
          out.rules.push({
            at: 'act',
            ...(when ? { when } : {}),
            do: {
              kind: 'summon',
              ...(actionOperands[0] ? { enemyId: `enemy-${actionOperands[0]}` } : {}),
              count: Math.max(1, actionOperands[1] ?? 1),
            },
          })
        index++
        continue
      }
      if (opcode === 0x47) {
        const sound = resolveSoundAsset(operands[0], ctx.soundAssetForNum)
        if (sound) body.push({ kind: 'playSound', asset: sound })
        index++
        continue
      }
      if (opcode === 0x69) {
        body.push({ kind: 'fleeBattle' })
        index++
        continue
      }
      if (opcode === 0x89) {
        const result = operands[0] ?? 0
        body.push({
          kind: 'endBattle',
          result: result === 3 ? 'won' : result === 1 ? 'lost' : 'terminate',
        })
        index++
        continue
      }
      if (opcode === 0x90 && (operands[2] ?? 0) === 0 && (operands[1] ?? 0) === 0) {
        index++
        continue
      }
      if (opcode === 0x05 || opcode === 0x8e) {
        index++
        continue
      }
      if (command.op === 'showDialog') {
        const messageIndex = (command as { messageIndex?: number }).messageIndex
        const raw = (command as { text?: string }).text ?? ''
        const decoded = decodeLegacyDialogueLine(raw, dialogState)
        if (ENEMY_SPEAKER_RE.test(decoded.plainText)) {
          pendingSpeaker = decoded.plainText.replace(ENEMY_SPEAKER_RE, '')
        } else {
          dialogState = decoded.state
          const text =
            messageIndex === undefined
              ? decoded.text
              : putLegacyDialogueText(ctx.locale, messageIndex, raw, decoded.text)
          const cue: DialogueCue = {
            rows: [
              {
                text,
                ...(decoded.speed !== LEGACY_DIALOG_DEFAULT_SPEED ? { speed: decoded.speed } : {}),
              },
            ],
            ...(decoded.autoAdvance !== undefined ? { autoAdvance: decoded.autoAdvance } : {}),
            ...(decoded.cursorFrame !== undefined ? { cursorFrame: decoded.cursorFrame } : {}),
          }
          if (pendingSpeaker) {
            const speakerKey = `spk.${pendingSpeaker}`
            ctx.locale[speakerKey] = pendingSpeaker
            cue.speaker = speakerKey
            pendingSpeaker = undefined
          }
          body.push({ kind: 'dialog', cue })
        }
        index++
        continue
      }
      if (typeof command.op === 'string' && command.op.startsWith('setDialogStyle')) {
        index++
        continue
      }
      out.pending.push(
        `${hookName} 段${current.k}: ${
          command.op === 'raw' ? `op 0x${command.opcode?.toString(16)}` : command.op
        } 未翻`,
      )
      index++
    }
    if (body.length) {
      const when = turnCondition(current.k, undefined, [
        firstOnly ? { kind: 'firstOfKind' } : undefined,
        partyGate ? { kind: 'playerInParty', role: partyGate } : undefined,
      ])
      const choreography: BattleChoreography = {
        at: 'turnStart',
        once: true,
        ...(when ? { when } : {}),
        body,
      }
      out.choreography.push(choreography)
    }
  }
}

function castTimelineRules(casts: readonly { k: number; magic: number; rate: number }[]): AiRule[] {
  const sorted = [...casts].sort((left, right) => left.k - right.k)
  const deduplicated: typeof sorted = []
  for (const cast of sorted) {
    if (deduplicated.length && deduplicated[deduplicated.length - 1]!.k === cast.k)
      deduplicated[deduplicated.length - 1] = cast
    else deduplicated.push(cast)
  }
  const rules: AiRule[] = []
  for (let index = 0; index < deduplicated.length; index++) {
    const cast = deduplicated[index]!
    const until = deduplicated[index + 1]?.k
    if (cast.magic === 0) continue
    const when = turnCondition(cast.k, until, [{ kind: 'chance', percent: cast.rate * 10 }])
    rules.push({
      at: 'act',
      ...(when ? { when } : {}),
      do: cast.magic === 0xffff ? { kind: 'pass' } : { kind: 'cast', skillId: String(cast.magic) },
    })
  }
  return rules
}

export function translateEnemyScriptsR13ConfirmParent(
  ctx: TranslateCtx,
  hooks: { turnStart?: number; ready?: number; battleEnd?: number },
  initialCast?: { magic: number; rate: number },
): LegacyEnemyScriptTranslationV9 {
  const out: LegacyEnemyScriptTranslationV9 = {
    rules: [],
    choreography: [],
    pending: [],
  }
  const casts: { k: number; magic: number; rate: number }[] = []
  if (initialCast && initialCast.magic !== 0 && initialCast.rate > 0)
    casts.push({
      k: 1,
      magic: initialCast.magic,
      rate: initialCast.rate,
    })
  if (hooks.ready) translateHook(ctx, hooks.ready, out, 'ready', casts)
  if (hooks.turnStart) translateHook(ctx, hooks.turnStart, out, 'turnStart', casts)
  out.rules.push(...castTimelineRules(casts))
  if (hooks.battleEnd) {
    const body = translateStages(`L_${hooks.battleEnd}`, undefined, ctx)?.[0]?.body ?? []
    // 6a8296a1 的历史 translator 不在这里套 current v10 validator；否则未来 schema
    // 收紧会反向改变已发布 parent。PAL 的冻结语料只包含已钉死的旧 Command 子集。
    if (body.length) out.onDefeated = body
  }
  return out
}
