#!/usr/bin/env node
/**
 * Build contracts.json by parsing each *.cursor-r1.test.ts(x) case (not batch templates).
 * Validates ordering against directed-vitest.json (passed only).
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = process.cwd()
const cursorDir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const directed = JSON.parse(readFileSync(resolve(cursorDir, 'directed-vitest.json'), 'utf8'))

/** Frozen Cursor source anchor for old-test blob SHA (receipt sourceBase sibling). */
const OLD_TEST_GIT = '6ea1b41ff30e8bf532a78e98af991128947da9df'

const EXISTING_PROOF_IDS = new Set([
  'C09-G02-01',
  'C09-G02-02',
  'C09-G02-03',
  'C09-G02-05',
  'C09-G02-06',
  'C09-G02-10',
  'C09-G01-04',
  'C07-G01-02',
  'C07-G01-10',
])

const idRe = /(C\d{2})-(G\d{2})-(\d{2})\b/

/** @type {Record<string, { oldTestSha: string, oldFile: string, oldFullName: string, oldMatcher: string, proofNote: string }>} */
const EXISTING_PROOF_OLD = {
  'C09-G02-01': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'claimEditorAudioPreview(first)×2 then expect(first.stop).not.toHaveBeenCalled() @ :15-16',
    proofNote: '拆分旧单测 combined 场景的首 claim / 重复 claim 不 stop 段',
  },
  'C09-G02-02': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'claimEditorAudioPreview(first)×2 then expect(first.stop).not.toHaveBeenCalled() @ :15-16',
    proofNote: '同旧例重复 claim 同一 owner 幂等段',
  },
  'C09-G02-03': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'claimEditorAudioPreview(second) then expect(first.stop).toHaveBeenCalledOnce(); expect(isEditorAudioPreviewOwner(second)).toBe(true) @ :18-21',
    proofNote: '拆分旧单测新 owner 抢占段',
  },
  'C09-G02-05': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'releaseEditorAudioPreview(first) while second active then expect(isEditorAudioPreviewOwner(second)).toBe(true) @ :23-24',
    proofNote: '拆分旧单测 release 非活动 owner 段',
  },
  'C09-G02-06': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'stopEditorAudioPreview()×2 after prior stop path @ :25-26 (no throw; no new stop oracle beyond old combined run)',
    proofNote: '旧 combined 已执行空 owner 双 stop；本轴无独立新 oracle，仅 execution safety 拆分',
  },
  'C09-G02-10': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview-session.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview-session.test.ts',
    oldFullName: '编辑器试听 owner 新 owner 会先停止旧 owner，释放和全局停止保持幂等',
    oldMatcher:
      'stopEditorAudioPreview()×2 then expect(second.stop).toHaveBeenCalledOnce() @ :25-27',
    proofNote: '拆分旧单测活动 owner 双 stop 只 stop 一次段',
  },
  'C09-G01-04': {
    oldTestSha: blobSha('packages/editor/src/core/audio-preview.test.ts'),
    oldFile: 'packages/editor/src/core/audio-preview.test.ts',
    oldFullName:
      'WAV preview analysis deduplicates inflight analysis and evicts the least-recently-used entry',
    oldMatcher:
      'cache(2) load a,b; get(a); load c → expect(cache.get(b)).toBeUndefined(); expect(cache.get(a)).toBe(1) @ :55-70',
    proofNote: '旧 LRU get+evict 链；新例显式 get(a) 刷新后 load(c) 淘汰 b',
  },
  'C07-G01-02': {
    oldTestSha: 'same-file-prior-case',
    oldFile: 'packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts',
    oldFullName:
      'C07-G01 static-image 与 imageAssets C07-G01-01 STATIC_IMAGE_KINDS 恰为四种静态图像 kind',
    oldMatcher:
      "expect(STATIC_IMAGE_KINDS).toEqual(['portrait','face','item-icon','battle-background'])",
    proofNote: '四 kind 固定列表已锁定唯一性；Set.size/AssetKind 自相等为同包冗余',
  },
  'C07-G01-10': {
    oldTestSha: 'same-file-prior-case',
    oldFile: 'packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts',
    oldFullName:
      'C07-G01 static-image 与 imageAssets C07-G01-01 STATIC_IMAGE_KINDS 恰为四种静态图像 kind',
    oldMatcher:
      "expect(STATIC_IMAGE_KINDS).toEqual(['portrait','face','item-icon','battle-background'])",
    proofNote: '四 kind 闭集已含否定 frame-animation/video/music 的语义',
  },
}

function blobSha(repoPath) {
  try {
    return execSync(`git rev-parse "${OLD_TEST_GIT}:${repoPath}"`, {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

/** @type {Map<string, { lines: string[], exports: Map<string, number> }>} */
const sourceCache = new Map()

function loadSource(relPath) {
  const key = relPath.replace(/\\/g, '/')
  if (sourceCache.has(key)) return sourceCache.get(key)
  const abs = resolve(root, relPath)
  if (!existsSync(abs)) return undefined
  const text = readFileSync(abs, 'utf8')
  const lines = text.split('\n')
  const exports = new Map()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fn = line.match(/^export (?:async )?function (\w+)/)
    if (fn) exports.set(fn[1], i + 1)
    const cls = line.match(/^export class (\w+)/)
    if (cls) exports.set(cls[1], i + 1)
    const constEx = line.match(/^export const (\w+)/)
    if (constEx) exports.set(constEx[1], i + 1)
  }
  const entry = { lines, exports }
  sourceCache.set(key, entry)
  return entry
}

function jsImportToRepoPath(fromFile, spec) {
  if (!spec.startsWith('.')) return undefined
  const base = resolve(dirname(fromFile), spec)
  const rel = relative(root, base).replace(/\\/g, '/')
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const candidate = rel.endsWith('.js') ? rel.replace(/\.js$/, ext) : `${rel}${ext}`
    const abs = resolve(root, candidate)
    if (existsSync(abs)) return candidate
  }
  if (rel.endsWith('.js')) {
    const ts = rel.replace(/\.js$/, '.ts')
    if (existsSync(resolve(root, ts))) return ts
    const tsx = rel.replace(/\.js$/, '.tsx')
    if (existsSync(resolve(root, tsx))) return tsx
  }
  return undefined
}

function parseImports(testAbsPath, content) {
  /** @type {Map<string, string>} symbol -> repo path */
  const symbols = new Map()
  const importRe = /import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g
  for (const m of content.matchAll(importRe)) {
    const spec = m[3]
    if (
      spec.startsWith('vitest') ||
      spec.includes('@type-pal') ||
      spec.includes('cursor-asset-r1') ||
      spec.includes('__tests__')
    ) {
      continue
    }
    const repo = jsImportToRepoPath(testAbsPath, spec)
    if (!repo) continue
    if (m[2]) {
      symbols.set(m[2], repo)
      continue
    }
    const names = m[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    for (const part of names) {
      const alias = part.match(/^(\w+)(?:\s+as\s+(\w+))?/)
      if (!alias) continue
      const local = alias[2] ?? alias[1]
      symbols.set(local, repo)
    }
  }
  return symbols
}

function inferPrimaryFromFilename(testRepoPath) {
  const base = testRepoPath
    .replace(/\.c\d{2}(?:-g\d{2})?\.cursor-r1\.test\.tsx?$/i, '')
    .replace(/\.cursor-r1\.test\.tsx?$/i, '')
  for (const ext of ['.tsx', '.ts']) {
    const candidate = `${base}${ext}`
    if (existsSync(resolve(root, candidate))) return candidate
  }
  return undefined
}

function findUiComponentPath(componentName) {
  const rel = `packages/editor/src/ui/${componentName}.tsx`
  if (existsSync(resolve(root, rel))) return rel
  const ds = `packages/editor/src/ui/design-system/${componentName}.tsx`
  if (existsSync(resolve(root, ds))) return ds
  const dsTs = `packages/editor/src/ui/design-system/${componentName}.ts`
  if (existsSync(resolve(root, dsTs))) return dsTs
  return undefined
}

function primaryForCase(body, symbols, testRepoPath, fullName) {
  const inferred = inferPrimaryFromFilename(testRepoPath)
  // STATIC_IMAGE_KINDS 常量轴归属 core/static-image，勿因同文件 import imageAssets 漂到 UI。
  if (/\bSTATIC_IMAGE_KINDS\b/.test(fullName) || /\bSTATIC_IMAGE_KINDS\b/.test(body)) {
    const staticImage = 'packages/editor/src/core/static-image.ts'
    if (existsSync(resolve(root, staticImage))) return staticImage
  }
  for (const [sym, repo] of symbols) {
    if (fullName.includes(sym)) return repo
  }
  const stamp = fullName.match(/\b(Stamp[A-Z][A-Za-z0-9]+)\b/)
  if (stamp) {
    const ui = findUiComponentPath(stamp[1])
    if (ui) return ui
  }
  const ds = fullName.match(/\b(Ds[A-Z][A-Za-z0-9]+)\b/)
  if (ds) {
    const ui = findUiComponentPath(ds[1])
    if (ui) return ui
  }
  const usedPaths = new Set()
  for (const [sym, repo] of symbols) {
    if (new RegExp(`\\b${sym}\\b`).test(body)) usedPaths.add(repo)
  }
  if (usedPaths.size === 1) return [...usedPaths][0]
  if (inferred && usedPaths.has(inferred)) return inferred
  if (usedPaths.size > 0) {
    const sorted = [...usedPaths].sort()
    const pick = sorted.find((p) => p.includes('/core/') || p.includes('/ui/')) ?? sorted[0]
    if (pick) return pick
  }
  const prodImports = [...new Set(symbols.values())]
  if (prodImports.length === 1) return prodImports[0]
  if (inferred) return inferred
  return prodImports[0] ?? 'unknown'
}

function extractHeaderDedup(content) {
  const m = content.match(/\/\*\*([\s\S]*?)\*\//)
  if (!m) return ''
  const block = m[1]
  const lines = block
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
  const line = lines.find((l) => l.includes('排重'))
  return line ?? lines.join(' ').slice(0, 240)
}

/** @type {Map<string, Map<string, { startLine: number, endLine: number, body: string }>>} */
const testIndexCache = new Map()

function indexTestsInFile(testRepoPath, lines) {
  if (testIndexCache.has(testRepoPath)) return testIndexCache.get(testRepoPath)
  /** @type {Array<{ id: string, start: number }>} */
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\btest\s*\(\s*['`]([^'"]+)['"]/)
    if (!m) continue
    const idMatch = m[1].match(idRe)
    if (!idMatch) continue
    starts.push({ id: idMatch[0], start: i })
  }
  const byId = new Map()
  for (let k = 0; k < starts.length; k++) {
    const { id, start } = starts[k]
    const end = (starts[k + 1]?.start ?? lines.length) - 1
    byId.set(id, {
      startLine: start + 1,
      endLine: end + 1,
      body: lines.slice(start, end + 1).join('\n'),
    })
  }
  testIndexCache.set(testRepoPath, byId)
  return byId
}

function findTestBlock(testRepoPath, lines, contractId) {
  const byId = indexTestsInFile(testRepoPath, lines)
  return byId.get(contractId)
}

function extractExpectOracle(body) {
  const expects = []
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.includes('expect(')) continue
    expects.push(trimmed.replace(/\s+/g, ' '))
  }
  if (expects.length === 0) {
    const throws = body.match(/await expect\([^)]+\)[\s\S]*?\.(rejects|resolves)/)
    if (throws) return throws[0].replace(/\s+/g, ' ').slice(0, 400)
    return 'no expect() — execution-only or implicit pass'
  }
  return expects.join(' | ')
}

function summarizeLegalInput(body) {
  const hints = []
  if (/\bvi\.fn\b/.test(body)) hints.push('vi.fn() spies')
  if (/catalogOf\(/.test(body)) hints.push('catalogOf typed AssetCatalogV1 fixture')
  if (/loadCursorSpriteProject\(/.test(body))
    hints.push('loadCursorSpriteProject isolated sprite project')
  if (/mountWorldSpriteLibrary\(/.test(body)) hints.push('mountWorldSpriteLibrary jsdom harness')
  if (/mountFrameAnimationEditor\(/.test(body)) hints.push('frame editor harness mount')
  if (/\{ stop: vi\.fn\(\) \}/.test(body)) hints.push('EditorAudioPreviewOwner { stop: mock }')
  if (/new AudioPreviewCache/.test(body)) hints.push('AudioPreviewCache(limit) in-memory')
  if (/createWavPreviewTransport\(/.test(body))
    hints.push('createWavPreviewTransport(stubReader, fakeBackend)')
  if (/installBrowserHardwarePorts\(/.test(body))
    hints.push('installBrowserHardwarePorts for real PNG decode')
  const calls = [
    ...body.matchAll(/\b(claim|release|stop|load|imageAssets|computePcmPeaks)\w*\(/g),
  ].map((x) => x[0])
  const uniqCalls = [...new Set(calls)].slice(0, 6)
  if (uniqCalls.length) hints.push(`calls: ${uniqCalls.join(', ')}`)
  return hints.length ? hints.join('; ') : 'inline typed fixtures in test body (see test source)'
}

function sourceConditionFor(primaryPath, body, symbols) {
  const src = loadSource(primaryPath)
  if (!src) return { sourceCondition: 'unknown — primary source missing', callerRefs: [] }
  const hits = []
  for (const [sym, repo] of symbols) {
    if (repo !== primaryPath) continue
    if (!new RegExp(`\\b${sym}\\b`).test(body)) continue
    const line = src.exports.get(sym)
    if (line) hits.push({ sym, line })
  }
  hits.sort((a, b) => a.line - b.line)
  if (hits.length === 0) {
    const firstExport = [...src.exports.entries()][0]
    if (firstExport) {
      return {
        sourceCondition: `${primaryPath}:${firstExport[1]} export ${firstExport[0]} (inferred)`,
        callerRefs: [],
      }
    }
    return { sourceCondition: `${primaryPath}:1 module under test`, callerRefs: [] }
  }
  const cond = hits.map(({ sym, line }) => `${primaryPath}:${line} export ${sym}`).join('; ')
  return { sourceCondition: cond, callerRefs: hits }
}

function callerLines(testRepoPath, body, symbols, testStartLine) {
  const refs = []
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const sym of symbols.keys()) {
      if (new RegExp(`\\b${sym}\\s*\\(`).test(line)) {
        refs.push(`${testRepoPath}:${testStartLine + i} ${sym}(…)`)
      }
    }
    const chain = line.match(/\b([a-zA-Z_]\w*)\.(load|get|play|claim|stop|release)\s*\(/)
    if (chain) {
      refs.push(`${testRepoPath}:${testStartLine + i} ${chain[1]}.${chain[2]}(…)`)
    }
  }
  return [...new Set(refs)].slice(0, 8).join('; ') || `${testRepoPath}:${testStartLine} test invoke`
}

function oldAssertionFor(id, dedupHeader) {
  if (EXISTING_PROOF_OLD[id]) {
    const o = EXISTING_PROOF_OLD[id]
    return {
      oldTestSha: o.oldTestSha,
      oldFile: o.oldFile,
      oldFullName: o.oldFullName,
      oldMatcher: o.oldMatcher,
      dedupHeader,
      note: o.proofNote,
    }
  }
  if (!dedupHeader) {
    return {
      oldTestSha: 'none',
      oldFile: 'none',
      oldFullName: 'none',
      oldMatcher: 'none',
      dedupHeader: '',
      note: 'no header 排重; treated as net-new axis pending full cross-queue dedup',
    }
  }
  const files = [...dedupHeader.matchAll(/([\w.-]+\.(?:test|wave)\.(?:tsx?|ts))/g)].map((x) => x[1])
  const uniqueFiles = [...new Set(files)]
  let oldTestSha = 'none'
  if (uniqueFiles.length === 1 && !uniqueFiles[0].includes('/')) {
    const guessed = guessOldTestPath(uniqueFiles[0])
    if (guessed) oldTestSha = blobSha(guessed)
  }
  return {
    oldTestSha,
    oldFile: uniqueFiles.length ? uniqueFiles.join(', ') : 'none',
    oldFullName: 'none — header names prior suite only',
    oldMatcher: 'none — no line-level overlap proven in this generator pass',
    dedupHeader,
    note: 'header 排重 cites prior suites; per-case old matcher not auto-resolved',
  }
}

function guessOldTestPath(basename) {
  try {
    const out = execSync(`git ls-tree -r --name-only ${OLD_TEST_GIT} -- packages/editor/src`, {
      cwd: root,
      encoding: 'utf8',
    })
    const first = out.split('\n').find((p) => p.endsWith(`/${basename}`) || p.endsWith(basename))
    return first
  } catch {
    return undefined
  }
}

function parseDirectedId(fullName, file) {
  const matches = [...fullName.matchAll(/(C\d{2})-(G\d{2})-(\d{2})\b/g)]
  if (matches.length) {
    const mm = matches[matches.length - 1]
    return {
      id: `${mm[1]}-${mm[2]}-${mm[3]}`,
      batch: mm[1],
      group: mm[2],
    }
  }
  const fileMatch = file.match(/\.(c\d{2})-g(\d{2})\./i)
  if (fileMatch) {
    return {
      id: `${fileMatch[1].toUpperCase()}-${`G${fileMatch[2]}`.toUpperCase()}-00`,
      batch: fileMatch[1].toUpperCase(),
      group: `G${fileMatch[2]}`.toUpperCase(),
    }
  }
  return undefined
}

/** @type {string[]} */
const ledgerDebt = []

const contracts = []
const fileCache = new Map()

for (const t of directed.tests ?? []) {
  if (t.status !== 'passed') continue
  const parsed = parseDirectedId(t.fullName, t.file)
  if (!parsed) continue
  const { id, batch, group } = parsed
  const testRepoPath = t.file.startsWith('packages/')
    ? t.file
    : `packages/editor/${t.file.startsWith('src/') ? t.file : `src/${t.file}`}`
  const testAbs = resolve(root, testRepoPath)

  let content = fileCache.get(testRepoPath)
  if (!content) {
    if (!existsSync(testAbs)) {
      ledgerDebt.push(`${id}: missing test file ${testRepoPath}`)
      content = ''
    } else {
      content = readFileSync(testAbs, 'utf8')
      fileCache.set(testRepoPath, content)
    }
  }

  const dedupHeader = extractHeaderDedup(content)
  const lines = content.split('\n')
  const block = findTestBlock(testRepoPath, lines, id)
  if (!block) {
    ledgerDebt.push(`${id}: could not locate test block in ${testRepoPath}`)
  }
  const body = block?.body ?? ''
  const symbols = parseImports(testAbs, content)
  const primarySource = primaryForCase(body, symbols, testRepoPath, t.fullName)
  const { sourceCondition } = sourceConditionFor(primarySource, body, symbols)
  if (primarySource === 'unknown' || sourceCondition.includes('unknown')) {
    ledgerDebt.push(`${id}: weak primary/sourceCondition (${primarySource})`)
  }
  const oracle = extractExpectOracle(body)
  const legalInput = summarizeLegalInput(body)
  const caller =
    block != null
      ? callerLines(testRepoPath, body, symbols, block.startLine)
      : `packages/editor/${t.file} (block not parsed)`
  const oldAssertion = oldAssertionFor(id, dedupHeader)
  const axis =
    t.fullName
      .replace(/(C\d{2})-(G\d{2})-(\d{2})\b/g, '')
      .replace(/\s+/g, ' ')
      .trim() || t.fullName

  const clip = (value, max) =>
    typeof value === 'string' && value.length > max ? `${value.slice(0, max)}…` : value
  const clippedOld =
    oldAssertion && typeof oldAssertion === 'object'
      ? Object.fromEntries(
          Object.entries(oldAssertion).map(([key, value]) => [key, clip(value, 160)]),
        )
      : oldAssertion
  contracts.push({
    id,
    batch,
    group,
    primarySource,
    sourceCondition: clip(sourceCondition, 240),
    caller: clip(caller, 240),
    legalInput: clip(legalInput, 240),
    oldAssertion: clippedOld,
    axis: clip(axis, 240),
    oracle: clip(oracle, 240),
    classification: EXISTING_PROOF_IDS.has(id) ? 'existing-proof' : 'new-contract',
    file: t.file.startsWith('src/') ? t.file : `src/${t.file.replace(/^packages\/editor\//, '')}`,
    fullName: t.fullName,
    testSourceLine: block?.startLine ?? null,
    status: 'passed',
  })
}

if (contracts.length !== directed.passed) {
  ledgerDebt.push(
    `count mismatch: directed passed=${directed.passed} contracts=${contracts.length}`,
  )
}

writeFileSync(
  resolve(cursorDir, 'contracts.json'),
  `${JSON.stringify({ total: contracts.length, contracts }, null, 2)}\n`,
)

const existingProof = contracts.filter((c) => c.classification === 'existing-proof').length
const summary = {
  total: contracts.length,
  existingProof,
  netNewEstimate: contracts.length - existingProof,
  ledgerDebtCount: ledgerDebt.length,
  out: resolve(cursorDir, 'contracts.json'),
}
writeFileSync(
  resolve(cursorDir, 'generate-contracts-last.json'),
  `${JSON.stringify({ ...summary, ledgerDebt }, null, 2)}\n`,
)

console.log(JSON.stringify(summary))
