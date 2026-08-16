import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseRichText } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const contentDir = fileURLToPath(new URL('../../../projects/pal/content/', import.meta.url))
const locale = JSON.parse(readFileSync(`${contentDir}locale.json`, 'utf8')) as Record<
  string,
  string
>

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`
    if (entry.isDirectory()) return jsonFiles(`${path}/`)
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}

function visit(node: unknown, onDialog: (dialog: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const value of node) visit(value, onDialog)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.kind === 'dialog') onDialog(record)
  for (const value of Object.values(record)) visit(value, onDialog)
}

function assertBalancedRichText(text: string): void {
  const tags = /<(\/)?(cyan|red|redAlt|yellow)>/g
  const stack: string[] = []
  for (const match of text.matchAll(tags)) {
    const color = match[2]!
    if (!match[1]) {
      expect(stack, `富文本颜色标签不可嵌套: ${text}`).toHaveLength(0)
      stack.push(color)
    } else {
      expect(stack.pop(), `富文本颜色标签闭合错误: ${text}`).toBe(color)
    }
  }
  expect(stack, `富文本颜色标签未闭合: ${text}`).toHaveLength(0)
  expect(
    parseRichText(text)
      .map((span) => span.text)
      .join(''),
  ).toBe(text.replace(tags, ''))
}

describe('PAL 对话迁移产物', () => {
  test('所有 dialog 只使用 cue.rows，引用文本清洁且富文本平衡', () => {
    let dialogCount = 0
    let rowCount = 0
    const referenced = new Set<string>()

    for (const path of jsonFiles(contentDir)) {
      const json = JSON.parse(readFileSync(path, 'utf8')) as unknown
      visit(json, (dialog) => {
        dialogCount++
        expect(dialog, `${path} 不得残留 line`).not.toHaveProperty('line')
        const cue = dialog.cue as { rows?: { text?: unknown }[] } | undefined
        expect(cue?.rows, `${path} dialog.cue.rows 缺失`).toBeInstanceOf(Array)
        expect(cue?.rows?.length, `${path} dialog.cue.rows 为空`).toBeGreaterThan(0)
        for (const row of cue?.rows ?? []) {
          expect(typeof row.text, `${path} row.text 非 text id`).toBe('string')
          if (typeof row.text === 'string') referenced.add(row.text)
          rowCount++
        }
      })
    }

    // v5 只保留 canonical owner body；v4 chunk 中被多入口重复物化的对话不再重复计数。
    expect(dialogCount).toBeGreaterThan(6_000)
    expect(rowCount).toBeGreaterThan(dialogCount)
    for (const textId of referenced) {
      const text = locale[textId]
      expect(typeof text, `locale 缺少 ${textId}`).toBe('string')
      if (typeof text !== 'string') continue
      expect(text, `${textId} 残留旧控制字符`).not.toMatch(/\$\d{2}|~\d{2}|["'@()\\-]/)
      expect(text, `${textId} 不得用换行模拟 rows`).not.toMatch(/[\r\n]/)
      assertBalancedRichText(text)
    }
  })

  test('开场三段使用明确的逐行速度和 cue 自动推进时间', () => {
    const scene = JSON.parse(readFileSync(`${contentDir}scenes/s000.json`, 'utf8')) as {
      hooks?: {
        onEnter?: {
          initial?: string
          variants: Record<
            string,
            {
              flow: {
                kind: 'stages'
                initial: string
                stages: Array<{ id: string; body: unknown[] }>
              }
            }
          >
        }
      }
    }
    const channel = scene.hooks?.onEnter
    const flow = channel?.initial ? channel.variants[channel.initial]?.flow : undefined
    const body =
      flow?.kind === 'stages'
        ? (flow.stages.find((stage) => stage.id === flow.initial)?.body ?? [])
        : []
    const dialogs = body.filter(
      (command): command is { kind: 'dialog'; cue: Record<string, unknown> } =>
        Boolean(
          command &&
            typeof command === 'object' &&
            (command as { kind?: unknown }).kind === 'dialog',
        ),
    )

    expect(dialogs.map((command) => command.cue)).toEqual([
      {
        identity: { kind: 'narration' },
        rows: [{ text: 'dlg.0', speed: 112 }],
        slot: 'center',
        autoAdvance: 342,
      },
      {
        identity: { kind: 'unbound', speaker: 'spk.李逍遥' },
        rows: [{ text: 'dlg.2', speed: 16 }],
        autoAdvance: 457,
      },
      {
        identity: { kind: 'unbound', speaker: 'spk.李逍遥' },
        rows: [
          { text: 'dlg.3', speed: 16 },
          { text: 'dlg.4', speed: 16 },
        ],
        autoAdvance: 685,
      },
    ])
  })
})
