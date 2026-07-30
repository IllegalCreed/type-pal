import {
  type AiCond,
  type BattleChoreographyAction,
  type DialogueCue,
  type EnemyHookCommand,
  type EnemyHookFlow,
  type EnemyHookTransition,
  type LevelGrowthDelta,
  palMusicAssetId,
} from '@type-pal/content'
import {
  DEFAULT_LEGACY_DIALOG_STATE,
  decodeLegacyDialogueLine,
  LEGACY_DIALOG_DEFAULT_SPEED,
  putLegacyDialogueText,
} from './legacy-dialog.js'
import { resolveSoundAsset } from './sound-migration.js'
import type { SourceCmd } from './source-facts.js'
import { ROLE_SLUGS, signExtendI16 } from './source-facts.js'
import type { TranslateCtx } from './translate-events.js'

/** 0x79 的 rgwName word → 稳定角色模板 id。 */
const NAME_WORD_TO_SLUG: Readonly<Record<number, string>> = {
  36: 'li-xiaoyao',
  37: 'zhao-linger',
  38: 'lin-yueru',
  39: 'anu',
  40: 'wu-hou',
  41: 'gai-luojiao',
}

const ENEMY_SPEAKER_RE = /[∶:：]\s*$/
const MAX_REACHABLE_INSTRUCTIONS = 2_048

interface Cmd extends SourceCmd {
  messageIndex?: number
  to?: string
  frameDelay?: number
  advance?: boolean
  reset?: boolean
  resetTo?: number
}

interface SourcePosition {
  cmds: readonly SourceCmd[]
  idx: number
}

export interface EnemyHookOwner {
  id: string
  name: string
}

export interface EnemyHookFlowTranslation {
  flow: EnemyHookFlow
  /** 保留报告字段兼容迁移汇总；新 CFG 翻译器遇到缺口会 fail-loud，成功时恒为空。 */
  pending: []
}

function sourceAddress(ctx: TranslateCtx, position: SourcePosition): number {
  const indexed = ctx.sourceAddressAt?.(position.cmds, position.idx)
  if (indexed !== undefined) return indexed
  for (let index = position.idx; index >= 0; index--) {
    const match = /^L_(\d+)$/.exec(position.cmds[index]?.label ?? '')
    if (match?.[1] !== undefined) return Number(match[1]) + position.idx - index
  }
  throw new Error(`enemy hook source address 无法从 idx=${position.idx} 推导`)
}

function positionKey(ctx: TranslateCtx, position: SourcePosition): string {
  return String(sourceAddress(ctx, position))
}

function chanceCondition(percent: number): AiCond {
  return { kind: 'chance', percent: Math.max(0, Math.min(100, percent)) }
}

function fallbackFromMagic(
  magic: number,
  rate: number,
): Extract<EnemyHookCommand, { kind: 'setFallback' }> {
  if (magic === 0) return { kind: 'setFallback' }
  return {
    kind: 'setFallback',
    fallback: {
      action: magic === 0xffff ? { kind: 'pass' } : { kind: 'cast', skillId: String(magic) },
      chancePercent: Math.max(0, Math.min(100, (rate || 10) * 10)),
    },
  }
}

function growthAction(
  stat: number,
  delta: number,
  roleWord: number,
): Extract<BattleChoreographyAction, { kind: 'applyActorGrowth' }> | undefined {
  const actor = ROLE_SLUGS[roleWord - 1]
  const field = (
    {
      6: 'level',
      7: 'maxHP',
      8: 'maxMP',
      17: 'attack',
      18: 'magicAttack',
      19: 'defense',
      20: 'speed',
      21: 'luck',
    } as const
  )[stat as 6 | 7 | 8 | 17 | 18 | 19 | 20 | 21]
  if (!actor || !field) return undefined
  return {
    kind: 'applyActorGrowth',
    actor,
    delta: {
      level: 0,
      maxHP: 0,
      maxMP: 0,
      attack: 0,
      magicAttack: 0,
      defense: 0,
      speed: 0,
      luck: 0,
      [field]: signExtendI16(delta),
    },
  }
}

function appendGrowth(
  body: EnemyHookCommand[],
  action: Extract<BattleChoreographyAction, { kind: 'applyActorGrowth' }>,
): void {
  const previous = body[body.length - 1]
  if (previous?.kind !== 'applyActorGrowth' || previous.actor !== action.actor) {
    body.push(action)
    return
  }
  for (const field of Object.keys(action.delta) as (keyof LevelGrowthDelta)[])
    previous.delta[field] += action.delta[field]
}

/**
 * 一条 PAL ready/turnStart 根脚本 → battle-local persistent hook flow。
 *
 * 第一遍按真实 instruction CFG 求可达闭包和 basic-block leaders；第二遍才生成 flow。
 * label 只是地址索引，绝不是邻链边界。这样 advance 跨 label、0xA2 多臂与失败回边不会静默
 * 掉出迁移范围。
 */
export function translateEnemyHookFlow(
  ctx: TranslateCtx,
  rootAddress: number,
  hookName: 'ready' | 'turnStart',
  owner?: EnemyHookOwner,
): EnemyHookFlowTranslation {
  const ownerLabel = owner ? `${owner.id}「${owner.name}」` : 'enemy'
  const fail = (address: number, message: string): never => {
    throw new Error(`${ownerLabel} ${hookName} L_${address}: ${message}`)
  }
  const root = ctx.labelAt.get(`L_${rootAddress}`) ?? fail(rootAddress, '脚本根目标不可达')

  const addressOf = (position: SourcePosition): number => sourceAddress(ctx, position)
  const next = (position: SourcePosition): SourcePosition | undefined => {
    const idx = position.idx + 1
    return idx < position.cmds.length ? { cmds: position.cmds, idx } : undefined
  }
  const requireNext = (position: SourcePosition, reason: string): SourcePosition => {
    const hit = next(position)
    return hit ?? fail(addressOf(position), `${reason} 缺 fallthrough`)
  }
  const target = (address: number, from: SourcePosition): SourcePosition => {
    const hit = ctx.labelAt.get(`L_${address}`)
    return hit ?? fail(addressOf(from), `目标 L_${address} 不可达`)
  }
  const gotoAddress = (command: Cmd, position: SourcePosition): number => {
    const address = Number((command.to ?? '').split('#').pop()?.replace(/^L_/, ''))
    if (!Number.isInteger(address)) fail(addressOf(position), `goto 目标非法 ${String(command.to)}`)
    return address
  }

  // Pass 1: instruction CFG closure + leader discovery.
  const reachable = new Map<string, SourcePosition>()
  const leaders = new Map<string, SourcePosition>()
  const queue: SourcePosition[] = [root]
  leaders.set(positionKey(ctx, root), root)
  const schedule = (position: SourcePosition, leader: boolean): void => {
    const key = positionKey(ctx, position)
    if (leader) leaders.set(key, position)
    if (!reachable.has(key)) queue.push(position)
  }

  while (queue.length) {
    const position = queue.shift()
    if (!position) break
    const key = positionKey(ctx, position)
    if (reachable.has(key)) continue
    if (reachable.size >= MAX_REACHABLE_INSTRUCTIONS)
      fail(rootAddress, `可达闭包超过 ${MAX_REACHABLE_INSTRUCTIONS} 条指令`)
    reachable.set(key, position)

    const command =
      (position.cmds[position.idx] as Cmd | undefined) ?? fail(addressOf(position), '源位置越界')
    const operands = command.operands ?? []
    const opcode = command.op === 'raw' ? command.opcode : undefined

    if (command.op === 'end') {
      if (command.advance) schedule(requireNext(position, 'advance END'), true)
      else if (command.reset) {
        const resetTo = command.resetTo ?? 0
        if (resetTo <= 0) fail(addressOf(position), `reset END 目标非法 ${resetTo}`)
        schedule(target(resetTo, position), true)
      }
      continue
    }
    if (command.op === 'goto') {
      if ((command.frameDelay ?? 0) !== 0)
        fail(addressOf(position), `delayed goto(${command.frameDelay}) 不受敌 hook 支持`)
      schedule(target(gotoAddress(command, position), position), true)
      continue
    }
    if (opcode === 0x06) {
      schedule(requireNext(position, '0x06'), true)
      const branchTarget = operands[1] ?? 0
      if (branchTarget !== 0) schedule(target(branchTarget, position), true)
      continue
    }
    if (opcode === 0x79 || opcode === 0x91) {
      schedule(requireNext(position, `0x${opcode.toString(16)}`), true)
      const branchTarget = opcode === 0x79 ? (operands[1] ?? 0) : (operands[0] ?? 0)
      if (branchTarget !== 0) schedule(target(branchTarget, position), true)
      continue
    }
    if (opcode === 0xa2) {
      const count = operands[0] ?? 0
      if (!Number.isInteger(count) || count <= 0)
        fail(addressOf(position), `0xA2 臂数非法 ${count}`)
      for (let offset = 1; offset <= count; offset++) {
        const choice = { cmds: position.cmds, idx: position.idx + offset }
        if (!position.cmds[choice.idx]) fail(addressOf(position), `0xA2 第 ${offset} 臂越界`)
        schedule(choice, true)
      }
      continue
    }
    if (opcode === 0x9c || opcode === 0x9e) {
      const failureTarget = opcode === 0x9c ? (operands[1] ?? 0) : (operands[2] ?? 0)
      if (failureTarget !== 0) {
        schedule(requireNext(position, `0x${opcode.toString(16)}`), true)
        schedule(target(failureTarget, position), true)
        continue
      }
    }
    schedule(
      requireNext(position, command.op ?? `op 0x${opcode?.toString(16) ?? 'unknown'}`),
      false,
    )
  }

  const orderedLeaders = [...leaders.values()]
    .filter((position) => reachable.has(positionKey(ctx, position)))
    .sort((left, right) => addressOf(left) - addressOf(right))
  const stateIds = new Map<string, string>()
  let ordinal = 1
  for (const position of orderedLeaders) {
    const key = positionKey(ctx, position)
    stateIds.set(
      key,
      key === positionKey(ctx, root) ? 'initial' : `state-${String(ordinal++).padStart(3, '0')}`,
    )
  }
  const stateId = (position: SourcePosition): string =>
    stateIds.get(positionKey(ctx, position)) ??
    fail(addressOf(position), '内部错误：transition 目标不是 basic-block leader')
  const continueTo = (position: SourcePosition): EnemyHookTransition => ({
    kind: 'continue',
    state: stateId(position),
  })
  const advanceTo = (position: SourcePosition): EnemyHookTransition => ({
    kind: 'advance',
    state: stateId(position),
  })

  // Pass 2: leaders → compact basic blocks.
  const states: EnemyHookFlow['states'] = {}
  for (const start of orderedLeaders) {
    const id = stateId(start)
    const body: EnemyHookCommand[] = []
    let position = start
    let transition: EnemyHookTransition | undefined
    let pendingSpeaker: string | undefined
    let dialogState = { ...DEFAULT_LEGACY_DIALOG_STATE }
    let guard = 0

    const finishPendingSpeaker = (): void => {
      if (pendingSpeaker) fail(addressOf(position), `说话人「${pendingSpeaker}」后遇控制边，缺正文`)
    }
    const moveNext = (): void => {
      position = requireNext(position, '线性指令')
    }

    while (!transition) {
      if (guard++ >= MAX_REACHABLE_INSTRUCTIONS)
        fail(addressOf(start), `basic block 超过 ${MAX_REACHABLE_INSTRUCTIONS} 条指令`)
      if (position !== start && leaders.has(positionKey(ctx, position))) {
        finishPendingSpeaker()
        transition = continueTo(position)
        break
      }

      const command =
        (position.cmds[position.idx] as Cmd | undefined) ?? fail(addressOf(position), '源位置越界')
      const address = addressOf(position)
      const operands = command.operands ?? []
      const opcode = command.op === 'raw' ? command.opcode : undefined

      if (command.op === 'end') {
        finishPendingSpeaker()
        if (command.advance) {
          transition = advanceTo(requireNext(position, 'advance END'))
        } else if (command.reset) {
          const reset = target(command.resetTo ?? 0, position)
          transition =
            positionKey(ctx, reset) === positionKey(ctx, root)
              ? { kind: 'restart' }
              : advanceTo(reset)
        } else {
          transition = { kind: 'stay' }
        }
        break
      }

      if (command.op === 'goto') {
        finishPendingSpeaker()
        transition = continueTo(target(gotoAddress(command, position), position))
        break
      }

      if (opcode === 0x06) {
        finishPendingSpeaker()
        const direct = continueTo(requireNext(position, '0x06'))
        const branchTarget = operands[1] ?? 0
        transition = {
          kind: 'branch',
          cond: chanceCondition((operands[0] ?? 100) - 1),
          then: direct,
          else: branchTarget === 0 ? { kind: 'stay' } : continueTo(target(branchTarget, position)),
        }
        break
      }

      if (opcode === 0x79 || opcode === 0x91) {
        finishPendingSpeaker()
        const direct = continueTo(requireNext(position, `0x${opcode.toString(16)}`))
        const branchTarget = opcode === 0x79 ? (operands[1] ?? 0) : (operands[0] ?? 0)
        const jumped: EnemyHookTransition =
          branchTarget === 0 ? { kind: 'stay' } : continueTo(target(branchTarget, position))
        if (opcode === 0x79) {
          const actor =
            NAME_WORD_TO_SLUG[operands[0] ?? -1] ??
            fail(address, `0x79 未知角色 word=${operands[0] ?? -1}`)
          transition = {
            kind: 'branch',
            cond: { kind: 'playerInParty', role: actor },
            then: jumped,
            else: direct,
          }
        } else {
          transition = {
            kind: 'branch',
            cond: { kind: 'firstOfKind' },
            then: direct,
            else: jumped,
          }
        }
        break
      }

      if (opcode === 0xa2) {
        finishPendingSpeaker()
        const count = operands[0] ?? 0
        const choices: Extract<EnemyHookTransition, { kind: 'random' }>['choices'] = []
        for (let offset = 1; offset <= count; offset++)
          choices.push({
            weight: 1,
            then: continueTo({ cmds: position.cmds, idx: position.idx + offset }),
          })
        transition = { kind: 'random', choices }
        break
      }

      if (opcode === 0x9c || opcode === 0x9e || opcode === 0x9f) {
        const effectId = `effect-${address}`
        if (opcode === 0x9c)
          body.push({
            kind: 'effect',
            id: effectId,
            effect: { kind: 'divide', copies: Math.max(1, operands[0] ?? 1) },
          })
        if (opcode === 0x9e)
          body.push({
            kind: 'effect',
            id: effectId,
            effect: {
              ...((operands[0] ?? 0) !== 0 && (operands[0] ?? 0) !== 0xffff
                ? { enemyId: `enemy-${operands[0]}` }
                : {}),
              kind: 'summon',
              count: Math.max(1, signExtendI16(operands[1] ?? 1)),
            },
          })
        if (opcode === 0x9f)
          body.push({
            kind: 'effect',
            id: effectId,
            effect: { kind: 'transform', enemyId: `enemy-${operands[0] ?? 0}` },
          })

        const failureTarget =
          opcode === 0x9c ? (operands[1] ?? 0) : opcode === 0x9e ? (operands[2] ?? 0) : 0
        if (failureTarget !== 0) {
          finishPendingSpeaker()
          transition = {
            kind: 'commandOutcome',
            commandId: effectId,
            outcome: 'succeeded',
            then: continueTo(requireNext(position, `0x${opcode.toString(16)}`)),
            else: continueTo(target(failureTarget, position)),
          }
          break
        }
        moveNext()
        continue
      }

      if (opcode === 0x67) {
        body.push(fallbackFromMagic(operands[0] ?? 0, operands[1] ?? 0))
        moveNext()
        continue
      }

      if (opcode === 0x47) {
        const sound = operands[0] ?? 0
        const asset = resolveSoundAsset(sound, ctx.soundAssetForNum)
        if (sound > 0 && !asset) fail(address, `音效 ${sound} 无可用资产`)
        if (asset) body.push({ kind: 'playSound', asset })
        moveNext()
        continue
      }
      if (opcode === 0x43) {
        const music = operands[0] ?? 0
        body.push(
          music <= 0 ? { kind: 'stopMusic' } : { kind: 'playMusic', asset: palMusicAssetId(music) },
        )
        moveNext()
        continue
      }
      if (opcode === 0x77) {
        const fade = operands[0] ?? 0
        body.push({ kind: 'stopMusic', fadeMs: fade === 0 ? 2_000 : fade * 3_000 })
        moveNext()
        continue
      }
      if (opcode === 0x85) {
        body.push({ kind: 'wait', ms: (operands[0] ?? 0) * 80 })
        moveNext()
        continue
      }
      if (opcode === 0x69) {
        body.push({ kind: 'fleeBattle' })
        moveNext()
        continue
      }
      if (opcode === 0x89) {
        const result = operands[0] ?? 0
        body.push({
          kind: 'endBattle',
          result: result === 3 ? 'won' : result === 1 ? 'lost' : 'terminate',
        })
        moveNext()
        continue
      }
      if (opcode === 0x19) {
        const action =
          growthAction(operands[0] ?? -1, operands[1] ?? 0, operands[2] ?? 0) ??
          fail(address, `0x19 属性/角色不受支持`)
        appendGrowth(body, action)
        moveNext()
        continue
      }
      if (opcode === 0x22 && (operands[0] ?? 0) !== 0) {
        body.push({ kind: 'revivePartyAll', tenths: operands[1] ?? 0 })
        moveNext()
        continue
      }
      if (opcode === 0x1d && (operands[0] ?? 0) !== 0) {
        body.push({ kind: 'increaseHpMp', delta: signExtendI16(operands[1] ?? 0), pools: 'both' })
        moveNext()
        continue
      }
      if (opcode === 0x92) {
        const actor =
          ROLE_SLUGS[(operands[0] ?? 0) - 1] ??
          fail(address, `0x92 角色 word=${operands[0] ?? 0} 不存在`)
        body.push({
          kind: 'playActorCastEffect',
          actor,
          effect: 'pre-magic-white-flash',
        })
        moveNext()
        continue
      }

      if (
        opcode === 0x05 ||
        opcode === 0x8e ||
        (opcode === 0x90 && (operands[1] ?? 0) === 0 && (operands[2] ?? 0) === 0)
      ) {
        // 0x05/0x8E 的对话框/战斗画面恢复由逐 cue 播放器等价承担；精确 0x90 自清旧钩子
        // 已由持久 cursor/遭遇实例隔离取代。source disposition 会分别记录 equivalent。
        moveNext()
        continue
      }

      if (command.op === 'showDialog') {
        const raw = command.text ?? ''
        const decoded = decodeLegacyDialogueLine(raw, dialogState)
        if (ENEMY_SPEAKER_RE.test(decoded.plainText)) {
          pendingSpeaker = decoded.plainText.replace(ENEMY_SPEAKER_RE, '')
        } else {
          dialogState = decoded.state
          const text =
            command.messageIndex === undefined
              ? decoded.text
              : putLegacyDialogueText(ctx.locale, command.messageIndex, raw, decoded.text)
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
            const speaker = `spk.${pendingSpeaker}`
            ctx.locale[speaker] = pendingSpeaker
            cue.speaker = speaker
            pendingSpeaker = undefined
          }
          body.push({ kind: 'dialog', cue })
        }
        moveNext()
        continue
      }

      if (typeof command.op === 'string' && command.op.startsWith('setDialogStyle')) {
        moveNext()
        continue
      }

      fail(
        address,
        command.op === 'raw'
          ? `op 0x${command.opcode?.toString(16) ?? 'unknown'} 不受敌 hook 支持`
          : `${command.op ?? 'unknown'} 不受敌 hook 支持`,
      )
    }

    states[id] = {
      body,
      next: transition ?? fail(addressOf(start), '内部错误：basic block 没有 transition'),
    }
  }

  return {
    flow: { initial: 'initial', states },
    pending: [],
  }
}
