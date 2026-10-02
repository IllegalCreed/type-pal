#!/usr/bin/env node
/**
 * CURSOR-R3-01：按批从旧测文件抽取可核旧 matcher 候选，写入 human overrides（仅高置信）。
 * 用法：node docs/testing/grok-cursor-large/cursor/enrich-batch-human.mjs C01 [C02…]
 * 不臆造行号：仅当旧文件全文含与新 oracle 共享的 expect 关键短语时写入。
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const cursorDir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const batches = process.argv.slice(2)
if (batches.length === 0) {
  console.error('usage: enrich-batch-human.mjs C01 [C02…]')
  process.exit(2)
}

const overridesPath = resolve(cursorDir, 'contract-human-overrides.json')
/** Flat map id → overlay (matches generate-contracts.mjs). */
const pack = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {}
if (pack.overrides && typeof pack.overrides === 'object') {
  // migrate legacy wrapper once
  Object.assign(pack, pack.overrides)
  delete pack.overrides
  delete pack.schemaVersion
  delete pack.note
}

function blobSha(repoPath) {
  try {
    return execSync(`git rev-parse HEAD:${repoPath}`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function loadOld(rel) {
  const abs = resolve(root, rel)
  if (!existsSync(abs)) return null
  return { rel, text: readFileSync(abs, 'utf8'), lines: readFileSync(abs, 'utf8').split('\n') }
}

function guessOldPaths(dedupHeader, primarySource) {
  const names = [...(dedupHeader?.matchAll(/([\w.-]+\.(?:test|wave)\.(?:tsx?|ts))/g) ?? [])].map(
    (m) => m[1],
  )
  const out = []
  for (const name of names) {
    try {
      const hit = execSync(`git ls-files 'packages/editor/**/${name}'`, {
        cwd: root,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(Boolean)[0]
      if (hit) out.push(hit)
    } catch {
      /* skip */
    }
  }
  if (primarySource) {
    const base = primarySource.replace(/\.(tsx?)$/, '')
    for (const suffix of ['.test.ts', '.test.tsx', '.wave2.test.ts', '.glm-l.test.ts']) {
      const cand = `${base}${suffix}`
      if (existsSync(resolve(root, cand))) out.push(cand)
    }
  }
  return [...new Set(out)]
}

function oracleKeys(oracle) {
  const keys = new Set()
  for (const m of oracle.matchAll(
    /to(?:Be|Equal|MatchObject|Contain|Throw|HaveLength|Match)\(([^)]{0,80})/gi,
  )) {
    const frag = m[1].replace(/\s+/g, ' ').trim()
    if (frag.length >= 6) keys.add(frag.slice(0, 60))
  }
  for (const m of oracle.matchAll(/['`]([^'`]{4,40})['`]/g)) keys.add(m[1])
  return [...keys].slice(0, 8)
}

function findMatcher(old, keys) {
  if (!old || keys.length === 0) return null
  const hits = []
  for (let i = 0; i < old.lines.length; i++) {
    const line = old.lines[i]
    if (!line.includes('expect(') && !line.includes('toMatchObject') && !line.includes('toEqual'))
      continue
    const joined = [line, old.lines[i + 1] ?? '', old.lines[i + 2] ?? ''].join(' ')
    for (const key of keys) {
      if (key.length >= 6 && joined.includes(key)) {
        hits.push({
          line: i + 1,
          text: joined.replace(/\s+/g, ' ').trim().slice(0, 220),
          key,
        })
        break
      }
    }
  }
  return hits[0] ?? null
}

function describeFullName(old, line) {
  for (let i = line - 1; i >= 0; i--) {
    const m = old.lines[i].match(/\btest\s*\(\s*['`]([^'`]{4,160})['`]/)
    if (m) return m[1]
  }
  return 'unknown-old-fullName'
}

let written = 0
let scanned = 0
for (const batch of batches) {
  const shard = JSON.parse(readFileSync(resolve(cursorDir, `contracts/${batch}.json`), 'utf8'))
  for (const c of shard.contracts) {
    scanned++
    if (pack[c.id]?.humanVerified) continue
    if (
      c.classification === 'existing-proof' &&
      !String(c.oldAssertion?.oldMatcher).startsWith('none')
    )
      continue
    const keys = oracleKeys(c.oracle ?? '').filter(
      (k) =>
        k.length >= 12 &&
        !/^(true|false|definition|expected|aria-label|aria-pressed|directional)$/i.test(k),
    )
    const oldPaths = guessOldPaths(c.oldAssertion?.dedupHeader ?? '', c.primarySource)
    let best = null
    let bestPath = null
    for (const p of oldPaths) {
      const old = loadOld(p)
      const hit = findMatcher(old, keys)
      if (hit) {
        best = hit
        bestPath = p
        break
      }
    }
    if (!best || !bestPath) continue
    if (best.key.length < 12) continue
    pack[c.id] = {
      ...(pack[c.id] ?? {}),
      humanVerified: true,
      classification: c.classification,
      oldAssertion: {
        oldTestSha: blobSha(bestPath),
        oldFile: bestPath,
        oldFullName: describeFullName(loadOld(bestPath), best.line),
        oldMatcher: `${best.text} @ :${best.line} (key=${JSON.stringify(best.key)})`,
        dedupHeader: c.oldAssertion?.dedupHeader ?? '',
        note: `CURSOR-R3-01 batch ${batch} high-confidence shared expect fragment; not auto-reclassified`,
      },
      notes: `enrich-batch-human ${batch}`,
    }
    written++
  }
}

writeFileSync(overridesPath, `${JSON.stringify(pack, null, 2)}\n`)
console.log(JSON.stringify({ batches, scanned, written, totalOverrides: Object.keys(pack).length }))
