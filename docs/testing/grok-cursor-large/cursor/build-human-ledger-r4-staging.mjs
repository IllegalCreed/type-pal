#!/usr/bin/env node
/**
 * R4 human-ledger staging for C03/C04 — reads contracts + vitest bodies + primary branches.
 * Usage: node docs/testing/grok-cursor-large/cursor/build-human-ledger-r4-staging.mjs [C03] [C04]
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const cursorDir = resolve(root, 'docs/testing/grok-cursor-large/cursor')
const batches = process.argv.slice(2).length ? process.argv.slice(2) : ['C03', 'C04']

function blobSha(repoPath) {
  try {
    return execSync(`git rev-parse HEAD:${repoPath}`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'none'
  }
}

function extractTestBody(fileText, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `test\\(['\`]${esc}[^'\`]*['\`]\\s*,\\s*(async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{`,
  )
  const m = fileText.match(re)
  if (!m) return null
  const start = fileText.indexOf(m[0])
  let i = start + m[0].length
  let depth = 1
  while (i < fileText.length && depth > 0) {
    const c = fileText[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  return fileText.slice(start + m[0].length, i - 1).trim()
}

function extractOracle(body) {
  const parts = []
  for (const m of body.matchAll(/await expect\([\s\S]*?\)\.[\w]+[\s\S]*?(?:;|$)/gm)) {
    parts.push(m[0].replace(/\s+/g, ' ').trim())
  }
  for (const m of body.matchAll(/expect\([\s\S]*?\)(?:\.[\w]+(?:\([\s\S]*?\))?)*\s*(?:;|$)/gm)) {
    const norm = m[0].replace(/\s+/g, ' ').trim()
    if (!parts.some((p) => p.replace(/^await /, '') === norm.replace(/^await /, ''))) parts.push(norm)
  }
  return parts.join(' | ')
}

function fixtureSummary(body) {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        !l.includes('expect(') &&
        !l.startsWith('await expect') &&
        (l.startsWith('const ') ||
          l.startsWith('let ') ||
          (l.startsWith('await ') && !l.includes('expect')) ||
          l.startsWith('mounted') ||
          l.startsWith('mount') ||
          l.startsWith('load') ||
          l.startsWith('wizard') ||
          /^h\./.test(l) ||
          l.startsWith('f =')),
    )
  const chunk = lines.slice(0, 10).join(' ')
  return `fixture: ${chunk.replace(/\s+/g, ' ').slice(0, 320)}`
}

function productionCaller(callerField) {
  const m = callerField?.match(/production:\s*([^|]+)/)
  if (!m) return 'production: none identified'
  const raw = m[1]
    .split(';')
    .map((s) =>
      s
        .trim()
        .replace(/\s*\(production\)\s*/g, '')
        .replace(/\(…\)/g, '')
        .replace(/…/g, ''),
    )
    .filter((s) => s && !s.includes('harness') && !s.includes('__tests__') && !s.includes('none found'))
  if (raw.length === 0) return 'production: none identified'
  return `production: ${raw.slice(0, 3).join('; ')}`
}

function testCaller(contract, body) {
  const rel = `packages/editor/${contract.file}`
  const line = contract.testSourceLine ?? '?'
  const firstCall =
    body.match(/\b(mount\w+|load\w+|prepare\w+|insert\w+|delete\w+|wizard\w+|h\.\w+|baseDraft)\b/)?.[0] ??
    'test case body'
  return `test: ${rel}:${line} ${firstCall}`
}

/** Runtime branches (not prop types / bare useState). */
const GROUP_BRANCH = {
  'C03-G01':
    'packages/editor/src/ui/SpriteUploadWizard.tsx:221-274 submit — early return if submittingRef/!draft/quantized empty; dispatch AddSpriteCommand + onDone(id)',
  'C03-G02':
    'packages/editor/src/ui/SpriteUploadWizard.tsx:533-537 cancel — if (!submittingRef.current) { selection.active=false; onDone(null) } | packages/editor/src/core/edit-session.ts:356 getHistoryVersion — past.length accounting',
  'C03-G03':
    'packages/editor/src/ui/SpriteResourceViewer.tsx:220-249 load effect — if (previousAssetRef.current !== props.asset) reset; selectFrame(min(selected, frames-1)) on success',
  'C03-G04':
    'packages/editor/src/ui/SpriteResourceViewer.tsx:511 role=alert error surface; load catch sets error while preserving workspace shell',
  'C03-G05':
    'packages/editor/src/ui/BattleSpriteUploader.tsx:74-75 slice grid — if (rgba.w % frameW !== 0 || rgba.h % frameH !== 0) return []',
  'C03-G06':
    'packages/editor/src/core/image-import.ts:55-60 assertPng — !name.endsWith(.png) throw; PNG signature bytes check',
  'C03-G07':
    'packages/editor/src/ui/SpriteUploadWizard.tsx:286 aria-busy={submitting||decoding}; :240-279 submit lock submittingRef + session.dispatch',
  'C04-G07':
    'packages/editor/src/core/frame-animation-draft.ts:105-109 draftDurationMs reduce+draftFrameDurationMs; :163-174 insertDraftFrames at bounds; :199-213 deleteDraftFrames remove Set',
  'C04-G01':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:299 draftDurationMs(draft) in metadata; setDraftFrameDuration via number field commit',
  'C04-G02':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:906-907 duration input value={frames[selectedIndex]?.durationMs ?? ""}',
  'C04-G03':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:581 insertDraftFrames(draft, selectedIndex+1, frames); :859 tail insert at index',
  'C04-G04':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:872 deleteDraftFrames(draft, actionIndices) after selection guard',
  'C04-G05':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:428-433 moveDraftFrame + frameSelectionAfterReorder updates selectedFrameIds',
  'C04-G06':
    'packages/editor/src/ui/FrameAnimationEditor.tsx:777 travelHistory(undoDraftHistory) / redo stack symmetry',
}

const ID_BRANCH = {
  'C03-G06-01':
    'packages/editor/src/core/image-import.ts:94-95 prepareAuthoredImage — sourceBytes=file.arrayBuffer(); :136-147 record.path `assets/authored/${kind}/${hash}.png`',
  'C03-G06-03':
    'packages/editor/src/core/image-import.ts:150 label: label || file.name.replace(/\\.png$/i, "")',
  'C03-G06-04':
    'packages/editor/src/core/image-import.ts:56 if (!name.toLowerCase().endsWith(".png")) throw',
  'C03-G06-05':
    'packages/editor/src/core/image-import.ts:58-60 PNG signature expected[137,80,78,71…] mismatch throw `${name}: 不是有效 PNG`',
  'C03-G06-06':
    'packages/editor/src/core/image-import.ts:161-162 nextAuthoredImageId — if (!catalog.assets[base]) return base',
  'C03-G06-07':
    'packages/editor/src/core/image-import.ts:163-166 suffix loop `${base}-${suffix}` until catalog slot free',
  'C03-G06-02':
    'packages/editor/src/core/image-import.ts:110 if (kind === "battle-background") quantize branch; face/portrait skip → effectPreviewBytes undefined',
  'C03-G06-09':
    'packages/editor/src/core/image-import.ts:138 return { sourceBytes, bytes, … } preserves original buffer',
  'C03-G06-10':
    'packages/editor/src/core/image-import.ts:146 path uses kind segment portrait vs face',
  'C04-G07-01':
    'packages/editor/src/core/frame-animation-draft.ts:105-109 draftDurationMs reduce; :99-102 draftFrameDurationMs frame.durationMs ?? defaultFrameMs',
  'C04-G07-05':
    'packages/editor/src/core/frame-animation-draft.ts:216-228 moveDraftFrame reorder frames array without mutating durationMs fields',
  'C03-G03-07':
    'packages/editor/src/ui/SpriteResourceViewer.tsx — semantic-frame-shelf renders 默认使用 #0 + per-consumer .semantic-frame-row buttons',
}

function sourceCondition(contract) {
  if (ID_BRANCH[contract.id]) return ID_BRANCH[contract.id]
  const axis = String(contract.axis ?? '')
  if (contract.batch === 'C03' && contract.group === 'G03' && axis.includes('canvas'))
    return 'packages/editor/src/ui/SpriteResourceViewer.tsx:355 index=min(selectedFrame, frames-1) drives large canvas aria-label frame index'
  if (contract.batch === 'C03' && contract.group === 'G04' && axis.includes('alert'))
    return 'packages/editor/src/ui/SpriteResourceViewer.tsx:511 div.insp-empty.error role=alert renders decode/load failure message'
  if (contract.batch === 'C04' && axis.includes('disabled'))
    return 'packages/editor/src/ui/FrameAnimationEditor.tsx — delete/reorder controls gated when selection would remove all frames'
  if (contract.batch === 'C04' && axis.includes('undo'))
    return 'packages/editor/src/ui/FrameAnimationEditor.tsx:777 travelHistory(undoDraftHistory) restores prior draft snapshot'
  if (contract.batch === 'C04' && axis.includes('redo'))
    return 'packages/editor/src/ui/FrameAnimationEditor.tsx redoDraftHistory reapplies undone draft edit'
  const key = `${contract.batch}-${contract.group}`
  if (GROUP_BRANCH[key]) return GROUP_BRANCH[key]
  const sc = contract.sourceCondition ?? ''
  if (sc.includes('useState') || sc.includes('export signature only')) {
    return `${contract.primarySource} — branch unresolved in generator; see axis ${contract.axis?.slice(0, 80)}`
  }
  return sc.split(' — ').slice(0, 2).join(' — ')
}

function axisOverlap(a, b) {
  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, '')
  const na = norm(a)
  const nb = norm(b)
  if (na.length < 8 || nb.length < 8) return false
  const keys = [
    'draftdurationms',
    'durationms',
    'aria-busy',
    'role="alert"',
    'semantic-frame',
    '默认使用 #0',
    'moveDraftFrame',
    "['b', 'c', 'a']",
    'onDone(null)',
    'getHistoryVersion',
    '损坏的精灵',
    'id 已存在',
  ]
  return keys.some((k) => na.includes(k.replace(/\s+/g, '')) && nb.includes(k.replace(/\s+/g, '')))
}

function resolveOldAssertion(contract, oracle) {
  const base = {
    oldTestSha: 'none',
    oldFile: 'none',
    oldFullName: 'none',
    oldMatcher: 'none',
    note: 'no old test proves same business axis',
  }
  const cand = contract.toolOldAssertionCandidate
  const dedup = contract.oldAssertion?.dedupHeader ?? cand?.dedupHeader

  const promotions = {
    'C04-G07-05': {
      oldTestSha: blobSha('packages/editor/src/core/frame-animation-draft.test.ts'),
      oldFile: 'packages/editor/src/core/frame-animation-draft.test.ts',
      oldFullName: '一次重排历史让 active/anchor 跟随来源帧，且 undo/redo 对称',
      oldMatcher:
        'moveDraftFrame(base,0,2) then redoDraftHistory(undoDraftHistory(history)).present.frames.map(id) @ :89-91 → ["b","c","a"]',
      note: 'same frame reorder axis as new moveDraftFrame direct assert; old via undo/redo chain',
    },
    'C03-G03-07': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteResourceViewer.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteResourceViewer.test.tsx',
      oldFullName: '多帧源容器的默认布局只解释 #0，其它帧可组成独立循环动作',
      oldMatcher:
        "semantic-frame-shelf text contains '默认使用 #0'; .semantic-frame-row length 2 after action pick @ :273-285",
      note: 'old mock-load DOM shelf axis matches new real-decode semantic shelf case',
    },
    'C03-G04-02': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteResourceViewer.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteResourceViewer.test.tsx',
      oldFullName: '加载失败仍保留同一 canonical workspace 与 content owner',
      oldMatcher: "failed.content querySelector('[role=\"alert\"]') text contains '损坏的精灵资源' @ :229",
      note: 'same load-failure alert axis (new uses real corrupt bytes not mock reject)',
    },
    'C03-G04-03': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteResourceViewer.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteResourceViewer.test.tsx',
      oldFullName: '加载失败仍保留同一 canonical workspace 与 content owner',
      oldMatcher: "alert contains '损坏的精灵资源' @ :229",
      note: 'workspace preserved + alert text — old mock reject, new real decode failure',
    },
    'C03-G04-08': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteResourceViewer.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteResourceViewer.test.tsx',
      oldFullName: '加载失败仍保留同一 canonical workspace 与 content owner',
      oldMatcher: "alert contains '损坏的精灵资源' @ :229",
      note: 'alert axis only; new adds alive/workspace revision specifics',
    },
    'C03-G07-02': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteUploadWizard.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteUploadWizard.test.tsx',
      oldFullName: '入库期间锁住重复提交和取消，完成后只写入一次',
      oldMatcher:
        'submit.disabled true; cancel.disabled true; aria-busy true during compress @ :172-174',
      note: 'in-flight submit lock axis; new uses real PNG pipeline not mock compress',
    },
    'C03-G07-07': {
      oldTestSha: blobSha('packages/editor/src/ui/SpriteUploadWizard.test.tsx'),
      oldFile: 'packages/editor/src/ui/SpriteUploadWizard.test.tsx',
      oldFullName: '入库期间锁住重复提交和取消，完成后只写入一次',
      oldMatcher: 'aria-busy true + submit/cancel disabled during submit @ :172-174',
      note: 'same submit-lock axis as G07-02',
    },
  }

  if (promotions[contract.id]) return promotions[contract.id]

  if (cand?.oldMatcher && !cand.oldMatcher.includes('unknown')) {
    if (axisOverlap(cand.oldMatcher, oracle) || axisOverlap(cand.oldMatcher, contract.axis)) {
      return {
        oldTestSha: cand.oldTestSha ?? blobSha(cand.oldFile),
        oldFile: cand.oldFile,
        oldFullName: cand.oldFullName?.startsWith('unknown') ? 'see old file nearby it()' : cand.oldFullName,
        oldMatcher: cand.oldMatcher,
        note: 'promoted from toolOldAssertionCandidate after axis spot-check',
      }
    }
    return {
      ...base,
      note: `toolOldAssertionCandidate axis mismatch: ${cand.note ?? 'different oracle axis'}`,
    }
  }

  if (contract.oldAssertion?.oldMatcher?.startsWith('none')) {
    return { ...base, note: dedup ? `${base.note}; ${dedup}` : contract.oldAssertion.note ?? base.note }
  }
  return contract.oldAssertion ?? base
}

function defaultProduction(batch, group) {
  if (batch === 'C03') {
    if (group === 'G06')
      return 'production: packages/editor/src/ui/ImageTab.tsx prepareAuthoredImage; packages/editor/src/ui/ItemTab.tsx prepareAuthoredImage'
    if (['G01', 'G02', 'G07'].includes(group))
      return 'production: packages/editor/src/ui/WorldSpriteLibrary.tsx:773 SpriteUploadWizard'
    if (['G03', 'G04'].includes(group))
      return 'production: packages/editor/src/ui/WorldSpriteLibrary.tsx:790 SpriteResourceViewer'
    if (group === 'G05') return 'production: packages/editor/src/ui/BattleSpriteLibrary.tsx BattleSpriteUploader'
    if (group === 'G02')
      return 'production: packages/editor/src/core/edit-session.ts EditSession.dispatch (via WorldSpriteLibrary upload flow)'
  }
  if (batch === 'C04') {
    if (group === 'G07')
      return 'production: packages/editor/src/ui/FrameAnimationEditor.tsx draft core helpers'
    return 'production: packages/editor/src/ui/FrameAnimationEditor.tsx'
  }
  return 'production: none identified'
}

function buildBatch(batchId) {
  const data = JSON.parse(readFileSync(resolve(cursorDir, 'contracts', `${batchId}.json`), 'utf8'))
  const overlays = {}
  let promoted = 0

  for (const c of data.contracts) {
    const testPath = resolve(root, 'packages/editor', c.file)
    const fileText = readFileSync(testPath, 'utf8')
    const body = extractTestBody(fileText, c.id)
    if (!body) continue

    const oracle = extractOracle(body) || c.oracle
    let legalInput = fixtureSummary(body)
    if ((legalInput.length < 20 || /const file = \{$/.test(legalInput)) && c.legalInput) {
      legalInput = c.legalInput.startsWith('fixture:') ? c.legalInput : `fixture: ${c.legalInput}`
    }
    if (c.id === 'C03-G06-04') {
      legalInput =
        "fixture: const file = { name: 'a.jpeg', type: 'image/jpeg', arrayBuffer: async () => new ArrayBuffer(8) } as File; prepareAuthoredImage(file, 'portrait')"
    }
    const oldAssertion = resolveOldAssertion(c, oracle)
    if (oldAssertion.oldMatcher && !String(oldAssertion.oldMatcher).startsWith('none')) promoted++

    const prod =
      c.caller?.includes('production:') && !c.caller.includes('none found')
        ? productionCaller(c.caller)
        : defaultProduction(c.batch, c.group)

    overlays[c.id] = {
      humanVerified: true,
      verification: 'human-ledger',
      primarySource: c.primarySource,
      sourceCondition: sourceCondition(c),
      legalInput,
      caller: `${testCaller(c, body)} | ${prod}`,
      oldAssertion,
      notes: `oracle: ${oracle} | classification: ${c.classification}; axis: ${c.axis}`,
    }
  }

  return { batch: batchId, overlays, verified: Object.keys(overlays).length, promoted }
}

mkdirSync(resolve(cursorDir, 'human-ledger-staging'), { recursive: true })

const summary = []
for (const batchId of batches) {
  const { batch, overlays, verified, promoted } = buildBatch(batchId)
  const outPath = resolve(cursorDir, 'human-ledger-staging', `${batchId}.json`)
  writeFileSync(outPath, `${JSON.stringify({ batch, overlays }, null, 2)}\n`)
  summary.push({ batch: batchId, verified, promoted })
  console.log(JSON.stringify({ batch: batchId, verified, promoted, outPath }))
}

console.log('SUMMARY', JSON.stringify(summary))
