import type { Command } from '@type-pal/shared'
import type { Words } from '../io/word.js'

export interface Symbols {
  item?: Record<string, string>
  spell?: Record<string, string>
  person?: Record<string, string>
  enemy?: Record<string, string>
  scene?: Record<string, string>
}

interface FieldRule {
  field: string
  annotationKey: string
  lookup: (id: number, words: Words, symbols: Symbols) => string | undefined
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

const RULES: FieldRule[] = [
  {
    field: 'itemId',
    annotationKey: '_item',
    lookup: (id, w, s) => s.item?.[String(id)] ?? wordAt(w.items, id, ITEM_OBJ_START),
  },
  {
    field: 'spellId',
    annotationKey: '_spell',
    lookup: (id, w, s) => s.spell?.[String(id)] ?? wordAt(w.spells, id, SPELL_OBJ_START),
  },
  {
    field: 'personId',
    annotationKey: '_person',
    lookup: (id, w, s) => s.person?.[String(id)] ?? wordAt(w.persons, id, PERSON_OBJ_START),
  },
  {
    field: 'enemyId',
    annotationKey: '_enemy',
    lookup: (id, w, s) => s.enemy?.[String(id)] ?? wordAt(w.enemies, id, ENEMY_OBJ_START),
  },
  {
    field: 'enemyTeamId',
    annotationKey: '_enemyTeam',
    // enemyTeamId 是 team 号(非 wObjectID),无 WORD.DAT 名表映射 —— 仅 symbols 兜底
    // (此前误用 w.enemies[teamId] 把 team 号当敌人名索引,命名空间彻底错)。
    lookup: (id, _w, s) => s.enemy?.[String(id)],
  },
  {
    field: 'sceneId',
    annotationKey: '_scene',
    // 无 WORD.DAT 兜底 —— 1998 Win9x 版 WORD.DAT 的 scenes 字段为毒素/杂项名,不是场景名
    lookup: (id, _w, s) => s.scene?.[String(id)],
  },
]

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

  // 具名命令:按规则表添加注释字段
  const out: Record<string, unknown> = { ...(c as unknown as Record<string, unknown>) }
  for (const rule of RULES) {
    const id = out[rule.field]
    if (typeof id !== 'number') continue
    const name = rule.lookup(id, words, symbols)
    if (name) out[rule.annotationKey] = name
  }
  return out as unknown as Command
}
