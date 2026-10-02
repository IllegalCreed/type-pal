#!/usr/bin/env node
/**
 * Build per-batch contract shards + slim contracts-index.json by parsing each
 * *.cursor-r1.test.ts(x) case (not batch templates).
 * Validates ordering against directed-vitest.json (passed only).
 *
 * Full contract bodies live in contracts/C01.json … C10.json (no field clipping).
 * contracts-index.json holds totals + shard paths + id→shard map only.
 *
 * Optional human overlays: contract-human-overrides.json (keyed by contract id).
 * Overlay fields win on every regen and are never overwritten by auto fields.
 */
import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const cursorDir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const contractsDir = resolve(cursorDir, 'contracts')
const directed = JSON.parse(readFileSync(resolve(cursorDir, 'directed-vitest.json'), 'utf8'))
const overridesPath = resolve(cursorDir, 'contract-human-overrides.json')

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
  'C05-G01-01',
  'C05-G01-02',
  'C06-G07-02',
  'C06-G07-03',
  'C06-G07-04',
])

const idRe = /(C\d{2})-(G\d{2})-(\d{2})\b/

const BATCHES = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10']

const ORACLE_BRANCH_KEYWORDS = [
  'aria-pressed',
  'aria-label',
  'visibleMembers',
  'showCollision',
  'missingTiles',
  'hiddenLayerIds',
  'visualCount',
  'collisionMembers',
  'previewMembers',
  'setShowCollision',
  'setHiddenLayerIds',
]

const FIXTURE_CALL_NAMES = [
  'c08StampTemplate',
  'buildBlankProjectMap',
  'loadLegalProject',
  'mountStampPreview',
  'mountWorldSpriteLibrary',
  'mountFrameAnimationEditor',
  'loadCursorSpriteProject',
  'catalogOf',
  'createWavPreviewTransport',
  'installBrowserHardwarePorts',
]

function blobSha(repoPath) {
  for (const rev of [OLD_TEST_GIT, 'HEAD']) {
    try {
      return execSync(`git rev-parse "${rev}:${repoPath}"`, {
        cwd: root,
        encoding: 'utf8',
      }).trim()
    } catch {
      // try next rev
    }
  }
  try {
    return execSync(`git hash-object "${repoPath}"`, {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

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
    oldTestSha: blobSha('packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts'),
    oldFile: 'packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts',
    oldFullName:
      'C07-G01 static-image 与 imageAssets C07-G01-01 STATIC_IMAGE_KINDS 恰为四种静态图像 kind',
    oldMatcher:
      "expect(STATIC_IMAGE_KINDS).toEqual(['portrait','face','item-icon','battle-background'])",
    proofNote:
      '四 kind 固定列表已锁定唯一性；Set.size/AssetKind 自相等为同包冗余。prior-case: same cursor-r1 file case C07-G01-01; oldTestSha = git blob of that file at OLD_TEST_GIT (HEAD/hash-object fallback if missing)',
  },
  'C07-G01-10': {
    oldTestSha: blobSha('packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts'),
    oldFile: 'packages/editor/src/core/static-image.c07-g01.cursor-r1.test.ts',
    oldFullName:
      'C07-G01 static-image 与 imageAssets C07-G01-01 STATIC_IMAGE_KINDS 恰为四种静态图像 kind',
    oldMatcher:
      "expect(STATIC_IMAGE_KINDS).toEqual(['portrait','face','item-icon','battle-background'])",
    proofNote:
      '四 kind 闭集已含否定 frame-animation/video/music 的语义。prior-case: same cursor-r1 file case C07-G01-01; oldTestSha = git blob of that file at OLD_TEST_GIT (HEAD/hash-object fallback if missing)',
  },
  'C05-G01-01': {
    oldTestSha: blobSha('packages/editor/src/core/sprite-actions.test.ts'),
    oldFile: 'packages/editor/src/core/sprite-actions.test.ts',
    oldFullName: '按 order/label/id 稳定排序并派生零基显示编号',
    oldMatcher:
      "expect(sortedSpriteActions(...)).toMatchObject([{id:'first',index:0},{id:'late',index:1}]) @ :26-31",
    proofNote:
      "旧单测零基 index；wave2 sprite-actions.wave2.test.ts:38-49 expect(sortedSpriteActions(input)).toEqual(['action','a','b','c','action-2','z'].map((id, index) => ({ id, index, action: input.poses![id] }))) complete id/index/action array",
  },
  'C05-G01-02': {
    oldTestSha: blobSha('packages/editor/src/core/sprite-actions.wave2.test.ts'),
    oldFile: 'packages/editor/src/core/sprite-actions.wave2.test.ts',
    oldFullName: '按 order/label/id 稳定排序并派生零基显示编号',
    oldMatcher:
      "expect(sortedSpriteActions(input)).toEqual(['action','a','b','c','action-2','z'].map(...)) @ :38-49 — action.order=0 before missing-order action-2/z",
    proofNote:
      'wave2 完整数组直证 order=0 排在缺省 order 之前；同 patch 亦令 CTR-C05-09 与 wave2 共红，故转 existing-proof/cross-check',
  },
  'C06-G07-02': {
    oldTestSha: blobSha('packages/editor/src/ui/StampPreviewCanvas.test.tsx'),
    oldFile: 'packages/editor/src/ui/StampPreviewCanvas.test.tsx',
    oldFullName: '缺 tileId fail-visible，canvas 有文本等价且图层/碰撞可独立切换',
    oldMatcher: 'collision aria-pressed true→click→false @ :107-109',
    proofNote: '旧 combined 碰撞叠层 aria-pressed 切换段',
  },
  'C06-G07-03': {
    oldTestSha: blobSha('packages/editor/src/ui/StampPreviewCanvas.test.tsx'),
    oldFile: 'packages/editor/src/ui/StampPreviewCanvas.test.tsx',
    oldFullName: '缺 tileId fail-visible，canvas 有文本等价且图层/碰撞可独立切换',
    oldMatcher: 'layer click → aria-pressed false + text 0 个可见成员 @ :110-115',
    proofNote: '旧 combined 图层隐藏后可见成员归零段',
  },
  'C06-G07-04': {
    oldTestSha: blobSha('packages/editor/src/ui/StampPreviewCanvas.test.tsx'),
    oldFile: 'packages/editor/src/ui/StampPreviewCanvas.test.tsx',
    oldFullName: '缺 tileId fail-visible，canvas 有文本等价且图层/碰撞可独立切换',
    oldMatcher: "canvas aria-label contains '1 层、1 个视觉成员' @ :101-103",
    proofNote: '旧 combined canvas aria-label 层数/视觉成员段',
  },
}

/** @type {Record<string, Record<string, unknown>>} */
const humanOverrides = existsSync(overridesPath)
  ? JSON.parse(readFileSync(overridesPath, 'utf8'))
  : {}

/**
 * Deep-merge: overlay leaf values win; arrays replaced wholesale.
 * @param {unknown} base
 * @param {unknown} overlay
 */
function deepMerge(base, overlay) {
  if (overlay === undefined) return base
  if (overlay === null || typeof overlay !== 'object' || Array.isArray(overlay)) return overlay
  if (base === null || typeof base !== 'object' || Array.isArray(base)) return overlay
  /** @type {Record<string, unknown>} */
  const out = { .../** @type {Record<string, unknown>} */ (base) }
  for (const [key, value] of Object.entries(/** @type {Record<string, unknown>} */ (overlay))) {
    out[key] = key in out ? deepMerge(out[key], value) : value
  }
  return out
}

/** @type {Map<string, { lines: string[], exports: Map<string, number>, text: string }>} */
const sourceCache = new Map()

function loadSource(relPath) {
  const key = relPath.replace(/\\/g, '/')
  if (sourceCache.has(key)) return sourceCache.get(key)
  const abs = resolve(root, key)
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
  const entry = { lines, exports, text }
  sourceCache.set(key, entry)
  return entry
}

/**
 * Balance (), [], {} from an opening bracket index; returns index after closer.
 * @param {string} text
 * @param {number} openIdx
 */
function balanceFrom(text, openIdx) {
  const pairs = { '(': ')', '[': ']', '{': '}' }
  const open = text[openIdx]
  const closer = pairs[open]
  if (!closer) return openIdx + 1
  const stack = [closer]
  let i = openIdx + 1
  let inStr = /** @type {string | null} */ (null)
  let escaped = false
  while (i < text.length && stack.length) {
    const ch = text[i]
    if (inStr) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === inStr) inStr = null
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch
      i++
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(pairs[ch])
      i++
      continue
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (stack[stack.length - 1] === ch) stack.pop()
      i++
      continue
    }
    i++
  }
  return i
}

/**
 * Collapse whitespace outside of string literals only.
 * @param {string} s
 */
function compactOutsideStrings(s) {
  let out = ''
  let inStr = /** @type {string | null} */ (null)
  let escaped = false
  let pendingSpace = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      if (pendingSpace) {
        out += ' '
        pendingSpace = false
      }
      inStr = ch
      out += ch
      continue
    }
    if (/\s/.test(ch)) {
      pendingSpace = out.length > 0
      continue
    }
    if (pendingSpace) {
      out += ' '
      pendingSpace = false
    }
    out += ch
  }
  return out.trim()
}

/**
 * Extract one complete expect(...)[.matcher(...)]* spanning lines.
 * @param {string} text
 * @param {number} startIdx index of 'expect'
 */
function extractCompleteExpect(text, startIdx) {
  if (!text.startsWith('expect', startIdx)) return null
  let i = startIdx + 'expect'.length
  while (i < text.length && /\s/.test(text[i])) i++
  if (text[i] !== '(') return null
  i = balanceFrom(text, i)
  // Chain .not.toBeNull() / .toEqual([...]) / .rejects.toThrow() across lines.
  // Keep consuming `.ident` / `.ident(` until the chain ends (do not stop at bare `.not`).
  for (;;) {
    let k = i
    while (k < text.length && /\s/.test(text[k])) k++
    if (text[k] !== '.') break
    k++
    while (k < text.length && /[A-Za-z0-9_]/.test(text[k])) k++
    while (k < text.length && /\s/.test(text[k])) k++
    if (text[k] === '(') {
      i = balanceFrom(text, k)
      continue
    }
    // Property access without call (rare) — still part of chain if followed by `.`
    i = k
    let peek = i
    while (peek < text.length && /\s/.test(text[peek])) peek++
    if (text[peek] === '.') continue
    break
  }
  return compactOutsideStrings(text.slice(startIdx, i))
}

function extractExpectOracle(body) {
  const expects = []
  let i = 0
  while (i < body.length) {
    const idx = body.indexOf('expect(', i)
    if (idx < 0) break
    // avoid false positives like expectTypeOf(
    if (idx > 0 && /[A-Za-z0-9_]/.test(body[idx - 1])) {
      i = idx + 6
      continue
    }
    const complete = extractCompleteExpect(body, idx)
    if (complete) {
      expects.push(complete)
      i = idx + complete.length
    } else {
      i = idx + 6
    }
  }
  if (expects.length === 0) {
    return 'no expect() — execution-only or implicit pass'
  }
  return expects.join(' | ')
}

function isOracleIncomplete(oracle) {
  if (!oracle || oracle.startsWith('no expect()')) return false
  if (/\(\[\s*$/.test(oracle) || /toEqual\(\[\s*$/.test(oracle)) return true
  if (/expect\(\(\)\s*=>\s*$/.test(oracle)) return true
  if (
    /expect\(\(\)\s*=>/.test(oracle) &&
    !/\)\s*\.\w+/.test(oracle) &&
    !/toThrow|toBe|toEqual/.test(oracle)
  )
    return true
  // Truncated mid-chain: ends with `([` or bare `expect(() =>`
  if (/\[\s*$/.test(oracle) || /expect\(\(\)\s*=>\s*$/.test(oracle)) return true
  // Bare `.not` / `.rejects` / `.resolves` without matcher (C03-G04-02 style)
  if (/(?:^|\|)\s*expect\([\s\S]*?\)\.(?:not|rejects|resolves)\s*(?:\||$)/.test(oracle)) return true
  if (/\.(?:not|rejects|resolves)\s*$/.test(oracle.trim())) return true
  return false
}

/**
 * Skip signature/param lines; collect first if/throw/return body conditions.
 * @param {{ lines: string[] }} src
 * @param {number} exportLine 1-based
 * @param {string} sym
 */
function exportSnippet(src, exportLine, sym) {
  const i = exportLine - 1
  const line = src.lines[i] ?? ''
  const collected = []

  if (/^export const /.test(line)) {
    let j = i
    let depth = 0
    let started = false
    while (j < src.lines.length && collected.length < 4) {
      const l = src.lines[j].trim()
      for (const ch of l) {
        if (ch === '[' || ch === '{' || ch === '(') {
          depth++
          started = true
        }
        if (ch === ']' || ch === '}' || ch === ')') depth--
      }
      collected.push(l)
      if (started && depth <= 0) break
      j++
    }
    return collected.join(' ').replace(/\s+/g, ' ')
  }

  if (/^export (?:async )?function /.test(line) || /^export class /.test(line)) {
    // Find body opening brace (skip signature / param type lines).
    let j = i
    let sigDepth = 0
    let bodyStart = -1
    while (j < src.lines.length) {
      const raw = src.lines[j]
      for (let c = 0; c < raw.length; c++) {
        const ch = raw[c]
        if (ch === '(' || ch === '<' || ch === '[') sigDepth++
        else if (ch === ')' || ch === '>' || ch === ']') sigDepth = Math.max(0, sigDepth - 1)
        else if (ch === '{' && sigDepth === 0) {
          bodyStart = j
          break
        }
      }
      if (bodyStart >= 0) break
      j++
    }
    if (bodyStart < 0) {
      return `(export signature only — condition unresolved) export ${sym}`
    }
    j = bodyStart + 1
    while (j < src.lines.length && collected.length < 4) {
      const l = src.lines[j].trim()
      j++
      if (!l || l === '{' || l === '}') continue
      if (l.startsWith('//') || l.startsWith('*') || l.startsWith('/*')) continue
      // Skip remaining param-looking lines if any leaked
      if (/^[\w?]+\s*:/.test(l) && !/\b(if|return|throw|const|let|var)\b/.test(l)) continue
      collected.push(l)
      if (/\breturn\b|\bthrow\b|\bif\s*\(/.test(l)) break
    }
    if (collected.length === 0) {
      return `(export signature only — condition unresolved) export ${sym}`
    }
    return collected.map((l) => l.replace(/\s+/g, ' ').replace(/;?\s*$/, '')).join('; ')
  }

  return `(export signature only — condition unresolved) export ${sym}`
}

function isReactComponentSym(sym, src) {
  if (!/^[A-Z]/.test(sym)) return false
  const line = src.exports.get(sym)
  if (!line) return false
  const text = src.lines[line - 1] ?? ''
  return /export function /.test(text) || /forwardRef/.test(text)
}

/** Prop/callback type lines must not be cited as sourceCondition branches. */
function isPropsTypeLine(trimmed) {
  if (!trimmed) return false
  if (/^export function \w+\(props\s*:/.test(trimmed)) return true
  // onFoo?: (…)=> void / foo: Type
  if (
    /^\w+\??\s*:\s*(\(|readonly\s+|boolean\b|string\b|number\b|ReactNode\b|undefined\b)/.test(
      trimmed,
    )
  )
    return true
  if (
    /=>\s*(void|Promise<|boolean|string|number|undefined)\b/.test(trimmed) &&
    !/\b(if|return|throw)\b/.test(trimmed)
  )
    return true
  return false
}

/**
 * Cite render/state branches touched by oracle keywords for React components.
 * @param {{ lines: string[] }} src
 * @param {string} primaryPath
 * @param {string} oracle
 * @param {string} body
 * @param {string} sym
 * @param {number} exportLine
 */
function componentBranchCondition(src, primaryPath, oracle, body, sym, exportLine) {
  const hay = `${oracle}\n${body}`
  const hitKeywords = ORACLE_BRANCH_KEYWORDS.filter((kw) => hay.includes(kw))
  // Also pick Chinese UI labels that map to collision / visible member branches
  if (/碰撞|aria-pressed/.test(hay) && !hitKeywords.includes('showCollision')) {
    hitKeywords.push('showCollision', 'aria-pressed')
  }
  if (/可见成员|视觉成员|aria-label/.test(hay)) {
    if (!hitKeywords.includes('visibleMembers')) hitKeywords.push('visibleMembers')
    if (!hitKeywords.includes('aria-label')) hitKeywords.push('aria-label')
    if (!hitKeywords.includes('visualCount')) hitKeywords.push('visualCount')
  }
  if (/瓦片资源缺失|missing/.test(hay) && !hitKeywords.includes('missingTiles')) {
    hitKeywords.push('missingTiles')
  }

  const cites = []
  const seen = new Set()
  for (let i = 0; i < src.lines.length; i++) {
    const line = src.lines[i]
    const trimmed = line.trim()
    // Props/type signatures are not runtime conditions (R4 honesty).
    if (isPropsTypeLine(trimmed)) continue
    for (const kw of hitKeywords) {
      if (!line.includes(kw)) continue
      const key = `${i + 1}:${kw}`
      if (seen.has(key)) continue
      seen.add(key)
      cites.push(`${primaryPath}:${i + 1} ${kw}: ${trimmed.replace(/\s+/g, ' ').slice(0, 120)}`)
      break
    }
    if (cites.length >= 6) break
  }
  if (cites.length > 0) {
    return `${primaryPath}:${exportLine} export ${sym} — branches: ${cites.join('; ')}`
  }
  const snip = exportSnippet(src, exportLine, sym)
  if (snip.includes('export signature only')) {
    return `${primaryPath}:${exportLine} export ${sym} — ${snip}`
  }
  // Component body found but no keyword branches — still prefer body over params
  return `${primaryPath}:${exportLine} export ${sym} — ${snip}`
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
      // Still allow harness mounts from __tests__ to map symbols when needed —
      // skip product path resolution for fixtures, but keep mount* names for caller indexing.
      if (spec.includes('__tests__')) {
        if (m[2]) symbols.set(m[2], `harness:${spec}`)
        else {
          const names = m[1]
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
          for (const part of names) {
            const alias = part.match(/^(\w+)(?:\s+as\s+(\w+))?/)
            if (!alias) continue
            symbols.set(alias[2] ?? alias[1], `harness:${spec}`)
          }
        }
      }
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

function usesJsxOrMount(body, componentName) {
  if (new RegExp(`<${componentName}\\b`).test(body)) return true
  if (/mountStampPreview\s*\(/.test(body) && componentName === 'StampPreviewCanvas') return true
  if (/createRoot\s*\(/.test(body) && new RegExp(`<${componentName}\\b`).test(body)) return true
  return false
}

function primaryForCase(body, symbols, testRepoPath, fullName) {
  const inferred = inferPrimaryFromFilename(testRepoPath)
  // STATIC_IMAGE_KINDS 常量轴归属 core/static-image，勿因同文件 import imageAssets 漂到 UI。
  if (/\bSTATIC_IMAGE_KINDS\b/.test(fullName) || /\bSTATIC_IMAGE_KINDS\b/.test(body)) {
    const staticImage = 'packages/editor/src/core/static-image.ts'
    if (existsSync(resolve(root, staticImage))) return staticImage
  }
  // Prefer React component when JSX / mount harness touches it.
  for (const name of ['StampPreviewCanvas', 'StampMiniPreview']) {
    if (
      (fullName.includes(name) || usesJsxOrMount(body, name) || /mountStampPreview/.test(body)) &&
      (name === 'StampPreviewCanvas' || usesJsxOrMount(body, name))
    ) {
      if (
        name === 'StampPreviewCanvas' &&
        (/mountStampPreview/.test(body) || fullName.includes('StampPreviewCanvas'))
      ) {
        const ui = findUiComponentPath('StampPreviewCanvas')
        if (ui) return ui
      }
      const ui = findUiComponentPath(name)
      if (ui) return ui
    }
  }
  for (const [sym, repo] of symbols) {
    if (repo.startsWith('harness:')) continue
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
    if (repo.startsWith('harness:')) continue
    if (new RegExp(`\\b${sym}\\b`).test(body)) usedPaths.add(repo)
  }
  if (usedPaths.size === 1) return [...usedPaths][0]
  if (inferred && usedPaths.has(inferred)) return inferred
  if (usedPaths.size > 0) {
    const sorted = [...usedPaths].sort()
    const pick = sorted.find((p) => p.includes('/core/') || p.includes('/ui/')) ?? sorted[0]
    if (pick) return pick
  }
  const prodImports = [...new Set([...symbols.values()].filter((p) => !p.startsWith('harness:')))]
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
  return line ?? lines.join(' ')
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

/**
 * Quote a balanced call starting at name( … ) including nested braces/parens.
 * @param {string} body
 * @param {string} name
 */
function extractBalancedCall(body, name) {
  const re = new RegExp(`\\b${name}\\s*\\(`)
  const m = re.exec(body)
  if (!m) return undefined
  const openIdx = body.indexOf('(', m.index)
  if (openIdx < 0) return undefined
  const end = balanceFrom(body, openIdx)
  return body.slice(m.index, end).replace(/\s+/g, ' ').trim().slice(0, 220)
}

function summarizeLegalInput(body) {
  const hints = []
  const fixtureQuotes = []
  for (const name of FIXTURE_CALL_NAMES) {
    const quoted = extractBalancedCall(body, name)
    if (quoted) fixtureQuotes.push(quoted)
  }
  if (/new AudioPreviewCache\s*\(/.test(body)) {
    const m = body.match(/new\s+AudioPreviewCache\s*\([^)]*\)/)
    if (m) fixtureQuotes.push(m[0].replace(/\s+/g, ' ').trim())
  }
  if (/\{\s*stop:\s*vi\.fn\(\)\s*\}/.test(body)) {
    fixtureQuotes.push('{ stop: vi.fn() }')
  }
  const stampPlace = body.match(/authoring\.stampPlacements(?:\s*=\s*[^;\n]+)?/)
  if (stampPlace) fixtureQuotes.push(stampPlace[0].replace(/\s+/g, ' ').trim().slice(0, 160))

  // Broader mount* capture (any mountFoo not already listed)
  for (const m of body.matchAll(/\b(mount[A-Z]\w*)\s*\(/g)) {
    if (FIXTURE_CALL_NAMES.includes(m[1])) continue
    const quoted = extractBalancedCall(body.slice(m.index), m[1])
    if (quoted && !fixtureQuotes.includes(quoted)) fixtureQuotes.push(quoted)
  }
  if (fixtureQuotes.length) {
    hints.push(`fixture: ${[...new Set(fixtureQuotes)].slice(0, 4).join('; ')}`)
  }

  if (/\bvi\.fn\b/.test(body)) hints.push('vi.fn() spies')

  const calls = [
    ...body.matchAll(/\b(claim|release|stop|load|imageAssets|computePcmPeaks)\w*\(/g),
  ].map((x) => x[0])
  const uniqCalls = [...new Set(calls)].slice(0, 6)
  if (uniqCalls.length) hints.push(`calls: ${uniqCalls.join(', ')}`)

  if (hints.length) return hints.join('; ')
  return 'inline typed fixtures in test body (see test source)'
}

function sourceConditionFor(primaryPath, body, symbols, oracle, fullName) {
  const src = loadSource(primaryPath)
  if (!src) return { sourceCondition: 'unknown — primary source missing', callerRefs: [] }

  // Prefer component named in fullName / JSX / mount when primary is that file.
  const preferredNames = []
  const stamp = fullName.match(/\b(Stamp[A-Z][A-Za-z0-9]+)\b/)
  if (stamp) preferredNames.push(stamp[1])
  const ds = fullName.match(/\b(Ds[A-Z][A-Za-z0-9]+)\b/)
  if (ds) preferredNames.push(ds[1])
  for (const [sym] of src.exports) {
    if (usesJsxOrMount(body, sym) || /mountStampPreview/.test(body)) {
      if (isReactComponentSym(sym, src)) preferredNames.push(sym)
    }
  }
  if (/mountStampPreview/.test(body) && src.exports.has('StampPreviewCanvas')) {
    preferredNames.unshift('StampPreviewCanvas')
  }

  for (const name of preferredNames) {
    const line = src.exports.get(name)
    if (!line) continue
    if (isReactComponentSym(name, src) || /^[A-Z]/.test(name)) {
      return {
        sourceCondition: componentBranchCondition(src, primaryPath, oracle, body, name, line),
        callerRefs: [{ sym: name, line }],
      }
    }
  }

  const hits = []
  for (const [sym, repo] of symbols) {
    if (repo !== primaryPath) continue
    if (!new RegExp(`\\b${sym}\\b`).test(body)) continue
    const line = src.exports.get(sym)
    if (line) hits.push({ sym, line })
  }
  // Prefer PascalCase component symbols over helper loaders when both hit
  hits.sort((a, b) => {
    const aComp = /^[A-Z]/.test(a.sym) ? 0 : 1
    const bComp = /^[A-Z]/.test(b.sym) ? 0 : 1
    if (aComp !== bComp) return aComp - bComp
    return a.line - b.line
  })

  if (hits.length === 0) {
    // Fall back to first matching export in primary that is a component, else first export
    for (const [sym, line] of src.exports) {
      if (
        isReactComponentSym(sym, src) &&
        (fullName.includes(sym) || inferredComponentFromPath(primaryPath) === sym)
      ) {
        return {
          sourceCondition: componentBranchCondition(src, primaryPath, oracle, body, sym, line),
          callerRefs: [{ sym, line }],
        }
      }
    }
    const firstExport = [...src.exports.entries()][0]
    if (firstExport) {
      const [sym, line] = firstExport
      if (isReactComponentSym(sym, src)) {
        return {
          sourceCondition: componentBranchCondition(src, primaryPath, oracle, body, sym, line),
          callerRefs: [{ sym, line }],
        }
      }
      const snip = exportSnippet(src, line, sym)
      return {
        sourceCondition: `${primaryPath}:${line} export ${sym} — ${snip} (inferred; no used export symbol matched in body)`,
        callerRefs: [],
      }
    }
    return {
      sourceCondition: `${primaryPath}:1 module under test (no export map; export signature only — condition unresolved)`,
      callerRefs: [],
    }
  }

  const primaryHit = hits[0]
  if (isReactComponentSym(primaryHit.sym, src)) {
    return {
      sourceCondition: componentBranchCondition(
        src,
        primaryPath,
        oracle,
        body,
        primaryHit.sym,
        primaryHit.line,
      ),
      callerRefs: hits,
    }
  }

  const cond = hits
    .slice(0, 3)
    .map(({ sym, line }) => {
      const snip = exportSnippet(src, line, sym)
      return `${primaryPath}:${line} export ${sym} — ${snip}`
    })
    .join('; ')
  return { sourceCondition: cond, callerRefs: hits }
}

function inferredComponentFromPath(primaryPath) {
  const base = primaryPath.split('/').pop() ?? ''
  return base.replace(/\.(tsx|ts|jsx|js)$/, '')
}

function testCallerLines(testRepoPath, body, symbols, testStartLine) {
  const refs = []
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const sym of symbols.keys()) {
      if (new RegExp(`\\b${sym}\\s*\\(`).test(line)) {
        refs.push(`${testRepoPath}:${testStartLine + i} ${sym}(…)`)
      } else if (new RegExp(`<${sym}\\b`).test(line)) {
        refs.push(`${testRepoPath}:${testStartLine + i} <${sym}`)
      } else if (new RegExp(`\\b${sym}\\b`).test(line) && !/^\s*import\b/.test(line)) {
        if (!refs.some((r) => r.includes(`${testRepoPath}:${testStartLine + i} ${sym}`))) {
          refs.push(`${testRepoPath}:${testStartLine + i} ${sym}`)
        }
      }
    }
    if (/\bmountStampPreview\s*\(/.test(line)) {
      refs.push(`${testRepoPath}:${testStartLine + i} mountStampPreview(…)`)
    }
    if (/\bcreateRoot\s*\(/.test(line)) {
      refs.push(`${testRepoPath}:${testStartLine + i} createRoot(…)`)
    }
    const chain = line.match(/\b([a-zA-Z_]\w*)\.(load|get|play|claim|stop|release)\s*\(/)
    if (chain) {
      refs.push(`${testRepoPath}:${testStartLine + i} ${chain[1]}.${chain[2]}(…)`)
    }
  }
  return [...new Set(refs)].slice(0, 12)
}

/** @type {Map<string, string[]> | null} */
let prodCallerIndex = null

function isTestPath(relPath) {
  return /\.test\.[jt]sx?$/.test(relPath) || /\.spec\.[jt]sx?$/.test(relPath)
}

function isHarnessPath(relPath) {
  return relPath.includes('/__tests__/')
}

function walkEditorSrcFiles(dir, out, { includeHarness = false } = {}) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const abs = join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) {
      walkEditorSrcFiles(abs, out, { includeHarness })
      continue
    }
    if (!/\.[jt]sx?$/.test(name)) continue
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (isTestPath(rel)) continue
    if (isHarnessPath(rel) && !includeHarness) continue
    out.push(rel)
  }
}

/**
 * One-pass index: symbol → production + harness JSX/call sites.
 * @returns {Map<string, string[]>}
 */
function buildProductionCallerIndex() {
  /** @type {Map<string, string[]>} */
  const index = new Map()
  const files = []
  const editorSrc = resolve(root, 'packages/editor/src')
  if (!existsSync(editorSrc)) return index
  walkEditorSrcFiles(editorSrc, files, { includeHarness: false })
  const harnessFiles = []
  walkEditorSrcFiles(editorSrc, harnessFiles, { includeHarness: true })
  const allFiles = [...new Set([...files, ...harnessFiles.filter((p) => isHarnessPath(p))])]

  const callRe = /\b([A-Z]?[a-zA-Z_]\w*)\s*\(/g
  const jsxRe = /<([A-Z][A-Za-z0-9]*)\b/g
  const identRe = /\b([A-Z][A-Z0-9_]*|[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g
  const skipCalls = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'return',
    'await',
    'typeof',
    'new',
    'function',
    'expect',
    'describe',
    'test',
    'it',
    'vi',
    'useMemo',
    'useState',
    'useEffect',
    'useCallback',
    'useRef',
  ])

  for (const rel of allFiles) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    const lines = text.split('\n')
    const harness = isHarnessPath(rel)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (
        /^\s*import\b/.test(line) ||
        /^\s*export\s+(?:async\s+)?function\b/.test(line) ||
        /^\s*export\s+const\b/.test(line) ||
        /^\s*export\s+class\b/.test(line) ||
        /^\s*export\s+(type|interface)\b/.test(line)
      ) {
        // Still allow JSX on export default / other lines; skip pure defs.
        if (!/</.test(line)) continue
      }

      // JSX <ComponentName
      jsxRe.lastIndex = 0
      for (const m of line.matchAll(jsxRe)) {
        const sym = m[1]
        const tag = harness ? 'harness' : 'production'
        const entry = `${rel}:${i + 1} <${sym} (${tag})`
        const list = index.get(sym) ?? []
        if (!list.includes(entry)) list.push(entry)
        index.set(sym, list)
      }

      callRe.lastIndex = 0
      for (const m of line.matchAll(callRe)) {
        const sym = m[1]
        if (!sym || sym.length < 2 || skipCalls.has(sym)) continue
        const tag = harness ? 'harness' : 'production'
        const entry = `${rel}:${i + 1} ${sym}(…) (${tag})`
        const list = index.get(sym) ?? []
        if (!list.includes(entry)) list.push(entry)
        index.set(sym, list)
      }

      if (harness) continue
      // SCREAMING_SNAKE / PascalCase constant uses (non-call) — production only
      identRe.lastIndex = 0
      for (const m of line.matchAll(identRe)) {
        const sym = m[1]
        if (!/^[A-Z][A-Z0-9_]+$/.test(sym) && !/^[A-Z][a-zA-Z0-9]+$/.test(sym)) continue
        if (new RegExp(`\\b${sym}\\s*\\(`).test(line) || new RegExp(`<${sym}\\b`).test(line))
          continue
        const entry = `${rel}:${i + 1} ${sym}`
        const list = index.get(sym) ?? []
        if (!list.includes(entry)) list.push(entry)
        index.set(sym, list)
      }
    }
  }
  return index
}

function productionCallersFor(symbols, body, primarySource) {
  if (!prodCallerIndex) prodCallerIndex = buildProductionCallerIndex()
  const used = [...symbols.keys()].filter((sym) => {
    if (symbols.get(sym)?.startsWith('harness:')) {
      return new RegExp(`\\b${sym}\\b`).test(body)
    }
    return new RegExp(`\\b${sym}\\b`).test(body) || new RegExp(`<${sym}\\b`).test(body)
  })
  // Always include primary component name for JSX lookup
  const primaryName = inferredComponentFromPath(primarySource)
  if (primaryName && /^[A-Z]/.test(primaryName) && !used.includes(primaryName)) {
    used.unshift(primaryName)
  }
  if (/mountStampPreview/.test(body) && !used.includes('StampPreviewCanvas')) {
    used.unshift('StampPreviewCanvas')
  }
  if (/mountStampPreview/.test(body) && !used.includes('mountStampPreview')) {
    used.push('mountStampPreview')
  }

  const production = []
  const harness = []
  for (const sym of used) {
    const list = prodCallerIndex.get(sym) ?? []
    for (const entry of list) {
      if (/\(harness\)/.test(entry)) {
        if (!harness.includes(entry)) harness.push(entry)
      } else if (!production.includes(entry)) {
        production.push(entry)
      }
    }
  }
  // Production first; harness appended only as separate non-production evidence.
  return [...production.slice(0, 6), ...harness.slice(0, 2)]
}

function formatCallerField(testRefs, prodRefs, testRepoPath, testStartLine) {
  const testPart =
    testRefs.length > 0
      ? `test: ${testRefs.join('; ')}`
      : `test: ${testRepoPath}:${testStartLine} test invoke`
  const productionOnly = []
  const harnessOnly = []
  for (const ref of prodRefs) {
    if (/\(harness\)/.test(ref) || /harness:/.test(ref)) harnessOnly.push(ref)
    else productionOnly.push(ref)
  }
  const prodPart =
    productionOnly.length > 0
      ? `production: ${productionOnly.join('; ')}`
      : 'production: none found in packages/editor/src (excl. *.test.* / harness)'
  const harnessPart =
    harnessOnly.length > 0
      ? `harness: ${harnessOnly.join('; ')}`
      : 'harness: none (not a production caller)'
  return `${testPart} | ${prodPart} | ${harnessPart}`
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

function isExportOnlyCondition(sourceCondition) {
  return (
    sourceCondition.includes('export signature only — condition unresolved') ||
    /\(export signature only/.test(sourceCondition)
  )
}

function isOldMatcherNone(oldAssertion) {
  const m = oldAssertion?.oldMatcher
  return !m || m === 'none' || String(m).startsWith('none')
}

function isProductionCallerNone(caller) {
  return /production:\s*none/.test(caller)
}

/** @type {string[]} */
const ledgerDebtNotes = []

const contracts = []
const fileCache = new Map()
let overlaysApplied = 0

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
      ledgerDebtNotes.push(`${id}: missing test file ${testRepoPath}`)
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
    ledgerDebtNotes.push(`${id}: could not locate test block in ${testRepoPath}`)
  }
  const body = block?.body ?? ''
  const symbols = parseImports(testAbs, content)
  const primarySource = primaryForCase(body, symbols, testRepoPath, t.fullName)
  const oracle = extractExpectOracle(body)
  const { sourceCondition } = sourceConditionFor(primarySource, body, symbols, oracle, t.fullName)
  if (primarySource === 'unknown' || sourceCondition.includes('unknown')) {
    ledgerDebtNotes.push(`${id}: weak primary/sourceCondition (${primarySource})`)
  }
  const legalInput = summarizeLegalInput(body)
  const testRefs =
    block != null ? testCallerLines(testRepoPath, body, symbols, block.startLine) : []
  const prodRefs = productionCallersFor(symbols, body, primarySource)
  const caller =
    block != null
      ? formatCallerField(testRefs, prodRefs, testRepoPath, block.startLine)
      : `test: packages/editor/${t.file} (block not parsed) | production: none found in packages/editor/src (excl. *.test.*)`
  const oldAssertion = oldAssertionFor(id, dedupHeader)
  const axis =
    t.fullName
      .replace(/(C\d{2})-(G\d{2})-(\d{2})\b/g, '')
      .replace(/\s+/g, ' ')
      .trim() || t.fullName

  /** @type {Record<string, unknown>} */
  let contract = {
    id,
    batch,
    group,
    primarySource,
    sourceCondition,
    caller,
    legalInput,
    oldAssertion,
    axis,
    oracle,
    classification: EXISTING_PROOF_IDS.has(id) ? 'existing-proof' : 'new-contract',
    file: t.file.startsWith('src/') ? t.file : `src/${t.file.replace(/^packages\/editor\//, '')}`,
    fullName: t.fullName,
    testSourceLine: block?.startLine ?? null,
    status: 'passed',
  }

  const overlay = humanOverrides[id]
  if (overlay && typeof overlay === 'object') {
    // Never promote tool candidates into ledger oldAssertion via merge.
    const { toolOldAssertionCandidate, ...overlayRest } = /** @type {Record<string, unknown>} */ (
      overlay
    )
    contract = /** @type {Record<string, unknown>} */ (deepMerge(contract, overlayRest))
    if (toolOldAssertionCandidate) {
      contract.toolOldAssertionCandidate = toolOldAssertionCandidate
    }
    // Honesty: humanVerified only when overlay explicitly says human-ledger + true.
    const isHumanLedger =
      overlayRest.verification === 'human-ledger' && overlayRest.humanVerified === true
    if (isHumanLedger) {
      contract.humanVerified = true
      contract.verification = 'human-ledger'
    } else {
      contract.humanVerified = false
      contract.verification = String(overlayRest.verification ?? 'staging-draft')
      if (contract.verification === 'human-ledger') contract.verification = 'staging-draft'
    }
    overlaysApplied++
  }

  contracts.push(contract)
}

if (contracts.length !== directed.passed) {
  ledgerDebtNotes.push(
    `count mismatch: directed passed=${directed.passed} contracts=${contracts.length}`,
  )
}

mkdirSync(contractsDir, { recursive: true })

/** @type {Record<string, typeof contracts>} */
const byBatch = Object.fromEntries(BATCHES.map((b) => [b, []]))
for (const c of contracts) {
  const batch = /** @type {string} */ (c.batch)
  if (!byBatch[batch]) byBatch[batch] = []
  byBatch[batch].push(c)
}

/** @type {{ batch: string, path: string, count: number, bytes: number }[]} */
const shardMeta = []
/** @type {Record<string, string>} */
const idToShard = {}

for (const batch of BATCHES) {
  const list = byBatch[batch] ?? []
  const relPath = `contracts/${batch}.json`
  const abs = resolve(cursorDir, relPath)
  const payload = {
    batch,
    count: list.length,
    contracts: list,
  }
  const text = `${JSON.stringify(payload, null, 2)}\n`
  writeFileSync(abs, text)
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes >= 1024 * 1024) {
    ledgerDebtNotes.push(`${relPath}: shard size ${bytes} >= 1MiB`)
  }
  shardMeta.push({ batch, path: relPath, count: list.length, bytes })
  for (const c of list) idToShard[/** @type {string} */ (c.id)] = relPath
}

// Remove legacy monolithic ledger if present (Biome 1MiB gate).
const legacyMonolith = resolve(cursorDir, 'contracts.json')
if (existsSync(legacyMonolith)) {
  rmSync(legacyMonolith)
}

const existingProof = contracts.filter((c) => c.classification === 'existing-proof').length

const ledgerDebt = {
  'oldMatcher-none': contracts.filter((c) => isOldMatcherNone(c.oldAssertion)).length,
  'sourceCondition-export-only': contracts.filter((c) =>
    isExportOnlyCondition(String(c.sourceCondition ?? '')),
  ).length,
  'oracle-incomplete': contracts.filter((c) => isOracleIncomplete(String(c.oracle ?? ''))).length,
  'production-caller-none': contracts.filter((c) => isProductionCallerNone(String(c.caller ?? '')))
    .length,
  notes: ledgerDebtNotes,
}

const index = {
  total: contracts.length,
  existingProof,
  netNewEstimate: contracts.length - existingProof,
  shards: shardMeta,
  idToShard,
  note: 'Full contract bodies live in per-batch shards under contracts/; this index has no bodies.',
}

writeFileSync(resolve(cursorDir, 'contracts-index.json'), `${JSON.stringify(index, null, 2)}\n`)

const summary = {
  total: contracts.length,
  existingProof,
  netNewEstimate: contracts.length - existingProof,
  overlaysApplied,
  overlaysAvailable: Object.keys(humanOverrides).length,
  ledgerDebt,
  shards: shardMeta.map((s) => ({ batch: s.batch, path: s.path, count: s.count, bytes: s.bytes })),
  outIndex: resolve(cursorDir, 'contracts-index.json'),
  outShardsDir: contractsDir,
  fieldClipping: false,
}
writeFileSync(
  resolve(cursorDir, 'generate-contracts-last.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)

console.log(JSON.stringify(summary, null, 2))
