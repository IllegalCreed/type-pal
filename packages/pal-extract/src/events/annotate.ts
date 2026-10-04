import type {
  Command,
  GiveItemCommand,
  LoadSceneCommand,
  StartBattleCommand,
} from '@type-pal/shared'
import type { Words } from '../io/word.js'

export interface Symbols {
  item?: Record<string, string>
  spell?: Record<string, string>
  person?: Record<string, string>
  enemy?: Record<string, string>
  scene?: Record<string, string>
}

const SYMBOL_KEYS = ['item', 'spell', 'person', 'enemy', 'scene'] as const

/** Validate the optional human-readable symbols sidecar at its IO boundary. */
export function parseSymbols(value: unknown): Symbols {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('symbols: 期望对象')
  const input = value as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!(SYMBOL_KEYS as readonly string[]).includes(key))
      throw new Error(`symbols.${key}: 未知字段`)
    const table = input[key]
    if (!table || typeof table !== 'object' || Array.isArray(table))
      throw new Error(`symbols.${key}: 期望对象`)
    for (const [id, label] of Object.entries(table as Record<string, unknown>)) {
      if (typeof label !== 'string') throw new Error(`symbols.${key}.${id}: 期望字符串`)
    }
  }
  return structuredClone(value) as Symbols
}

// WORD.DAT 各类名表在【全局 wObjectID 命名空间】里的起始偏移(io/word.ts readBlock offsets)。
// `words.items` 等是 0-based 切片(index 0 = 对应 OBJ_START 的 wObjectID),故用 wObjectID 查名要减偏移。
// **2026-06-02 审计修**:此前直接 `w.items[id]` 用 wObjectID(61+)索引 0-based 数组 → off-by-61
// 全错(itemId=145 标"凤凰羽毛"实为 wObjectID 206;145 应为"灵蛊")。giveItem._item 337/337 错值。
export const PERSON_OBJ_START = 36
export const ITEM_OBJ_START = 61
export const SPELL_OBJ_START = 296
export const ENEMY_OBJ_START = 398

/** wObjectID → 名表词条(减命名空间偏移;越界 / 空词 → undefined,不注释)。 */
function wordAt(table: readonly string[], wObjectId: number, objStart: number): string | undefined {
  const idx = wObjectId - objStart
  if (idx < 0 || idx >= table.length) return undefined
  return table[idx] || undefined
}

export function annotate(commands: Command[], words: Words, symbols: Symbols): Command[] {
  return commands.map((c) => annotateOne(c, words, symbols))
}

function annotateOne(c: Command, words: Words, symbols: Symbols): Command {
  // 结构化命令:递归子列表
  if (c.op === 'sequence') {
    return { ...c, steps: annotate(c.steps, words, symbols) }
  }
  if (c.op === 'if') {
    return {
      ...c,
      then: annotate(c.then, words, symbols),
      else: c.else ? annotate(c.else, words, symbols) : undefined,
    }
  }
  if (c.op === 'choice') {
    return {
      ...c,
      options: c.options.map((o) => ({ ...o, then: annotate(o.then, words, symbols) })),
    }
  }

  // raw 命令不注释(无字段语义)
  if (c.op === 'raw') return c

  switch (c.op) {
    case 'giveItem':
      return annotateGiveItem(c, words, symbols)
    case 'startBattle':
      return annotateStartBattle(c, symbols)
    case 'loadScene':
      return annotateLoadScene(c, symbols)
    default:
      return c
  }
}

function annotateGiveItem(
  command: GiveItemCommand,
  words: Words,
  symbols: Symbols,
): GiveItemCommand {
  const name =
    symbols.item?.[String(command.itemId)] ?? wordAt(words.items, command.itemId, ITEM_OBJ_START)
  return name ? { ...command, _item: name } : command
}

function annotateStartBattle(command: StartBattleCommand, symbols: Symbols): StartBattleCommand {
  const name = symbols.enemy?.[String(command.enemyTeamId)]
  return name ? { ...command, _enemyTeam: name } : command
}

function annotateLoadScene(command: LoadSceneCommand, symbols: Symbols): LoadSceneCommand {
  const name = symbols.scene?.[String(command.sceneId)]
  return name ? { ...command, _scene: name } : command
}
