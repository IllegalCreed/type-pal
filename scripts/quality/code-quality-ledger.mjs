import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const header = '| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |'
const closedStates = new Set(['已验证', '保留'])
const reviewStates = new Set(['review', 'blocked', 'rework'])
const categories = new Set(['product', 'test', 'fixture', 'generated', 'tool', 'vendor/reference'])

function visibleLines(source) {
  const lines = []
  let fence
  for (const line of source.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined
      continue
    }
    if (!fence) lines.push(line)
  }
  return lines
}

function number(value) {
  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(value)) return undefined
  const parsed = Number(value.replaceAll(',', ''))
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

/** Checks record integrity only; a successful result never proves semantic code review. */
export function auditCodeQualityLedger(source, inventory) {
  const issues = []
  const known = new Set()
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.records)) {
    return { issues: ['invalid inventory: expected schemaVersion=1 and records'], counts: null }
  }
  for (const record of inventory.records) {
    if (typeof record?.path !== 'string' || !record.path) {
      issues.push('invalid inventory path')
      continue
    }
    if (known.has(record.path)) issues.push(`duplicate inventory path: ${record.path}`)
    known.add(record.path)
  }
  if (known.size === 0) issues.push('empty inventory')

  const lines = visibleLines(source)
  const summaries = lines.filter((line) => line.startsWith('当前已闭合核验：'))
  const summary =
    summaries.length === 1
      ? /^当前已闭合核验：([\d,]+)；已读但待审：([\d,]+)；尚未逐文件核验：([\d,]+)；合计未闭合：([\d,]+)。$/.exec(
          summaries[0],
        )
      : undefined
  if (!summary) issues.push('missing, duplicate or malformed status summary')
  const declaredInventories = lines.filter((line) => line.includes('当前 tracked 清单'))
  const declaredInventory =
    declaredInventories.length === 1
      ? /当前 tracked 清单[^：]*：([\d,]+)。$/.exec(declaredInventories[0])
      : undefined
  if (!declaredInventory) issues.push('missing, duplicate or malformed tracked inventory count')
  else if (number(declaredInventory[1]) !== known.size) {
    issues.push(`inventory count mismatch: declared ${declaredInventory[1]}, actual ${known.size}`)
  }

  const tables = lines.flatMap((line, index) => (line === header ? [index] : []))
  if (tables.length !== 1) issues.push('expected exactly one file ledger table')
  const records = new Map()
  if (tables.length === 1) {
    const start = tables[0]
    if (!/^\|(?:\s*:?-+:?\s*\|){5}$/.test(lines[start + 1] ?? '')) {
      issues.push('missing or malformed file ledger separator')
    } else {
      for (let index = start + 2; index < lines.length && lines[index].startsWith('|'); index++) {
        const cells = lines[index].split('|').map((cell) => cell.trim())
        const path = /^`([^`]+)`$/.exec(cells[1] ?? '')?.[1]
        const category = cells[2]
        const status = cells[3]
        if (!path || cells.length < 7 || cells.at(-1) !== '') {
          issues.push(`malformed ledger row: ${lines[index]}`)
          continue
        }
        if (records.has(path)) issues.push(`duplicate ledger path: ${path}`)
        if (!known.has(path)) issues.push(`unknown ledger path: ${path}`)
        if (!categories.has(category)) issues.push(`invalid category for ${path}: ${category}`)
        if (!closedStates.has(status) && !reviewStates.has(status) && status !== '待核') {
          issues.push(`invalid status for ${path}: ${status}`)
        }
        if (!cells[4]) issues.push(`missing evidence for ${path}`)
        // Never give a duplicate or out-of-scope row extra progress credit.
        if (!records.has(path) && known.has(path)) records.set(path, status)
      }
    }
  }
  if (records.size === 0) issues.push('empty file ledger')

  const counts = { total: known.size, verified: 0, review: 0, pending: 0, unclosed: 0 }
  for (const path of known) {
    const status = records.get(path)
    if (closedStates.has(status)) counts.verified++
    else if (reviewStates.has(status)) counts.review++
    else counts.pending++
  }
  counts.unclosed = counts.review + counts.pending
  if (summary) {
    const declared = summary.slice(1).map(number)
    const actual = [counts.verified, counts.review, counts.pending, counts.unclosed]
    if (declared.some((value, index) => value !== actual[index])) {
      issues.push(
        `status count mismatch: declared ${declared.join('/')}, actual ${actual.join('/')}`,
      )
    }
  }
  return { issues, counts }
}

function main() {
  if (process.argv.length !== 2)
    throw new Error('usage: node scripts/quality/code-quality-ledger.mjs')
  const inventory = JSON.parse(
    execFileSync(process.execPath, ['scripts/quality/code-quality-inventory.mjs'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  )
  const source = readFileSync(resolve(root, 'docs/ops/audits/code-quality-file-ledger.md'), 'utf8')
  const { issues, counts } = auditCodeQualityLedger(source, inventory)
  if (issues.length > 0) {
    process.stderr.write(`code-quality ledger: FAIL\n${issues.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    `code-quality ledger: PASS — ${counts.total} files; ${counts.verified} closed / ${counts.review} review / ${counts.pending} pending; semantic review still required\n`,
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
