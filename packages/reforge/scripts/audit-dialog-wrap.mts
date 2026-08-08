/**
 * D14-1 对话折行全量审计（复用 2026-08-06 冻结设计时的扫描方法）。
 *
 * 冻结语义:maxRight=320(屏幕右缘),usable = 320 − startX——
 *   bottom 有头像 20→300px / 无头像 44→276px;top 有头像 96→224px / 无头像 44→276px;
 *   center 80→240px;narration 60→260px(卷轴不折行,仅统计)。
 * 断言:11102 行中仅 6 行(原版会裁边的超限行)继续折行,其余 0 意外折行。
 * 失败即 exit 1(CI 门禁可挂)。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repo = resolve(import.meta.dirname, '../../..')
const scenesDir = resolve(repo, 'projects/pal/content/scenes')
const strings = JSON.parse(
  readFileSync(resolve(repo, 'data/extracted/lookup/strings.json'), 'utf8'),
) as Record<string, string>
const glyphs = (
  JSON.parse(readFileSync(resolve(repo, 'data/extracted/data/font/glyphs.json'), 'utf8')) as {
    glyphs: Array<{ codepoint: number; width: number }>
  }
).glyphs
const wmap = new Map(glyphs.map((g) => [g.codepoint, g.width]))

function widthOf(s: string): number {
  let w = 0
  for (const ch of s) w += wmap.get(ch.codePointAt(0) ?? 0) ?? 16
  return w
}

function textOf(id: string): string {
  return strings[id] ?? strings[id.replace(/^dlg\./, '')] ?? ''
}

const startX = (slot: string, hasPortrait: boolean): number => {
  if (slot === 'bottom') return hasPortrait ? 20 : 44
  if (slot === 'top') return hasPortrait ? 96 : 44
  if (slot === 'center') return 80
  return 60 // narration
}

type Row = {
  scene: string
  id: string
  text: string
  width: number
  slot: string
  hasPortrait: boolean
}
const rows: Row[] = []

function walk(node: unknown, scene: string): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const n of node) walk(n, scene)
    return
  }
  const o = node as {
    kind?: string
    cue?: { slot?: string; portrait?: unknown; rows?: Array<{ text: string }> }
  }
  if (o.kind === 'dialog' && o.cue) {
    const cue = o.cue
    const slot = cue.slot ?? 'bottom'
    const hasPortrait = Boolean(cue.portrait)
    for (const r of cue.rows ?? []) {
      const t = textOf(r.text) ?? ''
      rows.push({ scene, id: r.text, text: t, width: widthOf(t), slot, hasPortrait })
    }
    return
  }
  for (const k of Object.keys(o)) walk((o as Record<string, unknown>)[k], scene)
}

for (const f of readdirSync(scenesDir).filter((x) => x.endsWith('.json')))
  walk(JSON.parse(readFileSync(resolve(scenesDir, f), 'utf8')), f)

const over: Row[] = []
for (const r of rows) {
  const usable = 320 - startX(r.slot, r.hasPortrait)
  if (r.width > usable) over.push(r)
}

// 2026-08-06 冻结设计时的 6 条超限行(原版会裁边,reforge 合法折行)。
const EXPECTED_OVER = new Set([
  'dlg.7569',
  'dlg.8217',
  'dlg.9198',
  'dlg.10164',
  'dlg.10208',
  'dlg.8565',
])
const overIds = new Set(over.map((r) => r.id))

console.log(
  `[audit-dialog-wrap] 对话行 ${rows.length}（唯一文本 ${new Set(rows.map((r) => r.id)).size}）`,
)
console.log(`[audit-dialog-wrap] 超原版最大可视宽度(合法折行) ${over.length} 行`)
for (const r of over)
  console.log(
    `  ${r.scene} ${r.id} slot=${r.slot} p=${r.hasPortrait ? 'y' : 'n'} w=${r.width} "${r.text}"`,
  )

const unexpected = over.filter((r) => !EXPECTED_OVER.has(r.id))
const missing = [...EXPECTED_OVER].filter((id) => !overIds.has(id))
if (unexpected.length || missing.length) {
  console.error('[audit-dialog-wrap] ✗ 折行集合与冻结设计不符:')
  for (const r of unexpected) console.error(`  意外折行: ${r.scene} ${r.id} w=${r.width}`)
  for (const id of missing) console.error(`  缺失预期超限行: ${id}`)
  process.exit(1)
}
console.log('[audit-dialog-wrap] ✓ 0 意外折行,仅冻结设计的 6 条超限行折行')
