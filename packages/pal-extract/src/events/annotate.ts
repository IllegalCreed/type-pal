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

const RULES: FieldRule[] = [
  {
    field: 'itemId',
    annotationKey: '_item',
    lookup: (id, w, s) => s.item?.[String(id)] ?? w.items[id],
  },
  {
    field: 'spellId',
    annotationKey: '_spell',
    lookup: (id, w, s) => s.spell?.[String(id)] ?? w.spells[id],
  },
  {
    field: 'personId',
    annotationKey: '_person',
    lookup: (id, w, s) => s.person?.[String(id)] ?? w.persons[id],
  },
  {
    field: 'enemyId',
    annotationKey: '_enemy',
    lookup: (id, w, s) => s.enemy?.[String(id)] ?? w.enemies[id],
  },
  {
    field: 'enemyTeamId',
    annotationKey: '_enemyTeam',
    lookup: (id, w, s) => s.enemy?.[String(id)] ?? w.enemies[id],
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
