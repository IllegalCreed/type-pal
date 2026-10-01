#!/usr/bin/env node
/**
 * Build contracts.json from directed-vitest.json (passed cursor-r1 tests only).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const directed = JSON.parse(readFileSync(resolve(dir, 'directed-vitest.json'), 'utf8'))

/** Task card C01–C10 → primary source paths (best-effort). */
const batchPrimarySource = {
  C01: 'packages/editor/src/ui/WorldSpriteLibrary.tsx',
  C02: 'packages/editor/src/ui/BattleSpriteLibrary.tsx',
  C03: 'packages/editor/src/ui/SpriteUploadWizard.tsx',
  C04: 'packages/editor/src/ui/FrameAnimationEditor.tsx',
  C05: 'packages/editor/src/ui/SpriteActionEditor.tsx',
  C06: 'packages/editor/src/ui/PreviewCanvas.tsx',
  C07: 'packages/editor/src/ui/ImageTab.tsx',
  C08: 'packages/editor/src/ui/TilesetTab.tsx',
  C09: 'packages/editor/src/ui/AudioAssetWorkbench.tsx',
  C10: 'packages/editor/src/ui/design-system/reorder.tsx',
}

/** Vitest fullName often prefixes describe text; take the last Cxx-Gyy-NN token. */
const idReGlobal = /(C\d{2})-(G\d{2})-(\d{2})\b/g

const contracts = []
const seenIds = new Set()
for (const t of directed.tests ?? []) {
  if (t.status !== 'passed') continue
  const matches = [...t.fullName.matchAll(idReGlobal)]
  let batch
  let group
  let seq
  if (matches.length > 0) {
    const mm = matches[matches.length - 1]
    batch = mm[1].toUpperCase()
    group = mm[2].toUpperCase()
    seq = mm[3]
  } else {
    const fileMatch = t.file.match(/\.(c\d{2})-g(\d{2})\./i)
    if (!fileMatch) continue
    batch = `C${fileMatch[1].slice(1)}`.toUpperCase()
    group = `G${fileMatch[2]}`.toUpperCase()
    seq = '00'
  }

  let id = `${batch}-${group}-${seq}`
  if (seenIds.has(id)) {
    let suffix = 2
    while (seenIds.has(`${id}~${suffix}`)) suffix += 1
    id = `${id}~${suffix}`
  }
  seenIds.add(id)
  const title =
    t.fullName
      .replace(/(C\d{2})-(G\d{2})-(\d{2})\b/g, '')
      .replace(/\s+/g, ' ')
      .trim() || t.fullName

  contracts.push({
    id,
    batch,
    group,
    primarySource: batchPrimarySource[batch] ?? 'see batch map in TEST-CURSOR-ASSET-UI-LARGE-1.md',
    caller: `see test source: packages/editor/${t.file}`,
    legalInput:
      'typed synthetic fixtures in packages/editor/src/__tests__/cursor-asset-r1/ or inline in test file',
    oldAssertion:
      'dedup: see file header comment in test; no duplicate matcher vs L/M/P/Q fixed candidates without new axis',
    axis: title.split(/[：:]/)[0]?.slice(0, 120) ?? title.slice(0, 120),
    oracle: `${title}; expect() theme documented in test title and assertions — matcher location: see test source fullName ${t.fullName} @ packages/editor/${t.file}`,
    classification: 'new-contract',
    file: t.file.startsWith('src/') ? t.file : `src/${t.file}`,
    fullName: t.fullName,
    status: 'passed',
  })
}

writeFileSync(
  resolve(dir, 'contracts.json'),
  `${JSON.stringify({ total: contracts.length, contracts }, null, 2)}\n`,
)
console.log(JSON.stringify({ total: contracts.length, out: resolve(dir, 'contracts.json') }))
