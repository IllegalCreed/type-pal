import type {
  ActorDef,
  CasualtyBranch,
  CasualtyEffect,
  CasualtyLine,
  CasualtyScript,
} from '@type-pal/content'
import type { SourceCmd } from './migrate-content.js'

/**
 * B11-1: 原版 OBJECT_PLAYER.scriptOnFriendDeath / scriptOnDying 的结构化翻译。
 *
 * 真值来源（2026-08-05 三方 agree）：
 * - object-players.json：obj[0] 李逍遥 friendDeath=43445、obj[1] 赵灵儿 dying=43374、
 *   obj[2] 林月如 friendDeath=43474 + dying=43400；
 * - 0x06 = 顺序概率门（r≥阈值跳分支，命中即停，不再掷后续门）；
 * - 0x1B/0x1C = 回体力/真气满；0x30 = 临时百分比 buff（17=attack、18=magic、20=speed、
 *   21=luck；delta = 未 buff 运行时值 × percent/100，战内有效、战后清空）；
 * - showDialog 台词按 `dlg.<messageIndex>` 落 locale（源文本随脚本一起带出）。
 *
 * 只接受本卡四个脚本已用到的 opcode；遇到未知 opcode 或结构漂移 fail-closed，
 * 禁止静默丢语义。
 */

const STAT_INDEX_TO_NAME = {
  17: 'attack',
  18: 'magic',
  20: 'speed',
  21: 'luck',
} as const

type DialogStyle = CasualtyLine['style']

/**
 * B11-1 四个伤亡脚本的台词 messageIndex(P0 冻结;36 键)。
 * 6A→6B rewind 靠它把 locale 精确还原成 6A surface;parse 结果必须与该集合逐键一致。
 */
export const PAL_CASUALTY_LOCALE_KEYS: readonly string[] = [
  13470, 13471, 13472, 13473, 13474, 13475, 13476, 13477, 13478, 13479, 13480, 13481,
  13482, 13483, 13484, 13485, 13486, 13487, 13488, 13489, 13490, 13491,
  13499, 13500, 13501, 13502, 13503, 13504, 13505, 13506, 13507, 13508, 13509, 13510,
  13511, 13512,
].map((index) => `dlg.${index}`)

function parseBranch(
  commands: readonly SourceCmd[],
  from: number,
  locale: Record<string, string>,
): CasualtyBranch {
  const lines: CasualtyLine[] = []
  const effects: CasualtyEffect[] = []
  let style: DialogStyle = 'bottom'
  for (let ip = from; ip < commands.length; ip++) {
    const command = commands[ip]
    if (!command) throw new Error(`B11-1 casualty: branch @${from} 越界`)
    switch (command.op) {
      case 'setDialogStyleBottom':
        style = 'bottom'
        break
      case 'setDialogStyleTop':
        style = 'top'
        break
      case 'setDialogStyleNarration':
        style = 'narration'
        break
      case 'showDialog': {
        const messageIndex = (command as { messageIndex?: unknown }).messageIndex
        if (typeof messageIndex !== 'number' || typeof command.text !== 'string')
          throw new Error(`B11-1 casualty: branch @${from} showDialog 缺 messageIndex/text`)
        const key = `dlg.${messageIndex}`
        lines.push({ text: key, style })
        locale[key] = command.text
        break
      }
      case 'end':
        return { lines, effects }
      case 'raw': {
        const operands = command.operands ?? []
        switch (command.opcode) {
          case 0x1b:
            effects.push({ kind: 'heal', resource: 'hp' })
            break
          case 0x1c:
            effects.push({ kind: 'heal', resource: 'mp' })
            break
          case 0x30: {
            const stat = STAT_INDEX_TO_NAME[operands[0] as keyof typeof STAT_INDEX_TO_NAME]
            const percent = operands[1]
            if (
              !stat ||
              typeof percent !== 'number' ||
              !Number.isSafeInteger(percent) ||
              percent < 0
            )
              throw new Error(`B11-1 casualty: branch @${from} 0x30 参数无效 ${JSON.stringify(operands)}`)
            effects.push({ kind: 'tempStatBuff', stat, percent })
            break
          }
          case 0x05:
            // 原版重绘红点帧 [0,0,0]：纯演出 no-op，结构化数据不保留。
            if ((operands[1] ?? 0) !== 0 || (operands[2] ?? 0) !== 0)
              throw new Error(`B11-1 casualty: branch @${from} 0x05 参数非空 ${JSON.stringify(operands)}`)
            break
          default:
            throw new Error(
              `B11-1 casualty: branch @${from} 不支持的 opcode 0x${(command.opcode ?? 0).toString(16)}`,
            )
        }
        break
      }
      default:
        throw new Error(`B11-1 casualty: branch @${from} 不支持的指令 ${command.op}`)
    }
  }
  throw new Error(`B11-1 casualty: branch @${from} 未以 end 结束`)
}

export function translateCasualtyScript(
  commands: readonly SourceCmd[],
  entry: number,
  locale: Record<string, string>,
): CasualtyScript {
  const gates: CasualtyScript['gates'] = []
  let ip = entry
  for (;;) {
    const command = commands[ip]
    if (!command || command.op !== 'raw' || command.opcode !== 0x06) break
    const operands = command.operands ?? []
    const chance = operands[0]
    const target = operands[1]
    if (
      typeof chance !== 'number' ||
      !Number.isSafeInteger(chance) ||
      typeof target !== 'number' ||
      !Number.isSafeInteger(target) ||
      (operands[2] ?? 0) !== 0
    )
      throw new Error(`B11-1 casualty: 0x06 门 @${ip} 参数无效 ${JSON.stringify(operands)}`)
    gates.push({ chance, branch: parseBranch(commands, target, locale) })
    ip++
  }
  if (!gates.length)
    throw new Error(`B11-1 casualty: entry @${entry} 缺 0x06 概率门`)
  return { gates, fallback: parseBranch(commands, ip, locale) }
}

export function applyPalCasualtyOverlays(
  actors: readonly ActorDef[],
  commands: readonly SourceCmd[],
  objectPlayers: readonly { scriptOnFriendDeath: number; scriptOnDying: number }[],
): { actors: ActorDef[]; locale: Record<string, string> } {
  // object-players 顺序 = player-roles 顺序（36..41 → 李逍遥/赵灵儿/林月如/巫后/阿奴/盖罗娇）。
  const expected = [
    { roleIndex: 0, kind: 'friendDeath' as const, entry: objectPlayers[0]?.scriptOnFriendDeath ?? 0 },
    { roleIndex: 1, kind: 'dying' as const, entry: objectPlayers[1]?.scriptOnDying ?? 0 },
    { roleIndex: 2, kind: 'friendDeath' as const, entry: objectPlayers[2]?.scriptOnFriendDeath ?? 0 },
    { roleIndex: 2, kind: 'dying' as const, entry: objectPlayers[2]?.scriptOnDying ?? 0 },
  ]
  const locale: Record<string, string> = {}
  const output = actors.map((actor) => structuredClone(actor))
  for (const { roleIndex, kind, entry } of expected) {
    if (!Number.isSafeInteger(entry) || entry <= 0)
      throw new Error(`B11-1 casualty: 期望角色 ${roleIndex} ${kind} 入口缺失`)
    const actor = output[roleIndex]
    if (!actor?.battler)
      throw new Error(`B11-1 casualty: 角色 ${roleIndex} 缺 battler`)
    const script = translateCasualtyScript(commands, entry, locale)
    const casualty = { ...(actor.battler.casualty ?? {}) }
    casualty[kind] = script
    actor.battler = { ...actor.battler, casualty }
  }
  const parsedKeys = Object.keys(locale).sort()
  const expectedKeys = [...PAL_CASUALTY_LOCALE_KEYS].sort()
  if (parsedKeys.length !== expectedKeys.length || parsedKeys.some((key, index) => key !== expectedKeys[index]))
    throw new Error('B11-1 casualty: 台词 locale 键与 P0 冻结集合漂移')
  return { actors: output, locale }
}
