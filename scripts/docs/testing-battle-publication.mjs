import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { decodeTerminalUtf8, parseTerminalJson } from './terminal-json.mjs'
import { testingAcquisitionSourceBindings } from './testing-acquisition-source-bridge.mjs'
import {
  assertTestingBridgeReference,
  restoreTestingBridgeHistory,
  testingBridgeSources,
} from './testing-source-bridge.mjs'

export const testingBattlePublicationBase = '43fea71735236272cfb7f6a1c61c3ac2e691a349'
export const testingBattleSessionMechanismBase = '3a921678f20950cccee3f631dfbb1e60bb8efa3b'
export const testingBattleSessionPortraitBase = '18bfe998333912bf2b1449e534133ce73cafca44'
export const testingBattleSessionPresentationBase = '5a3093c93746d6e04e8f569ef526e07778aa439f'
export const testingBattleSessionCadenceBase = 'd0020e0749483651d9b0f86cf79ef738ac34663e'
export const testingBattleSessionCasualtyBase = '58812c028ebd87dd75a9c5dda46a4ec997fb4b09'
export const testingBattleSessionCasualtyDialogueBase = 'f84bcd91dd71498e1099e7bf8f4b2d7900507090'
export const testingBattleSessionPlayerActionsBase = 'faae7bde3078a06d5072326327459994107607e2'
export const testingBattleSessionCooperativeRecoveryBase =
  'a86eea156e360bfb916a63afb8c8c7b5d5d0f018'
export const testingBattleSessionItemEffectsBase = '398a930d2c1ddb4c0fe1a8a96271dba70e3aa93c'
export const testingBattleSessionThrowFeedbackBase = '5a5a02a2f56eb4748d0415e902c334999121dcdb'
export const testingBattleSessionEnemyCastBase = 'a4d04282dbbdaecff8e97e37528b5c0d67659550'
export const testingBattleSessionSpecialStatusBase = '9662bbe177aa9567f15cb7e556a961c286a430da'
export const testingBattleSessionSourcePath = 'packages/reforge/src/battle/battle-session.ts'

const catalogPath = 'docs/testing/catalog.json'
const sessionId = 'runtime-battle-session-owners'
const sessionEvidencePath =
  'docs/testing/domains/runtime/battle/battle-session-owners/evidence.json'
const sessionReceipt = 'docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md'
const sessionBinding = {
  revision: testingBattlePublicationBase,
  action: 'q2-battle-session-source-rebinding',
  date: '2026-11-11',
}
const sessionMechanismBinding = {
  revision: testingBattleSessionMechanismBase,
  action: 'q2-battle-session-mechanism-source-rebinding',
  date: '2026-11-11',
}
const sessionPortraitBinding = {
  revision: testingBattleSessionPortraitBase,
  action: 'q2-battle-session-portrait-source-rebinding',
  date: '2026-11-11',
}
const sessionPresentationBinding = {
  revision: testingBattleSessionPresentationBase,
  action: 'q2-battle-session-presentation-source-rebinding',
  date: '2026-11-12',
}

const sessionCadenceBinding = {
  revision: testingBattleSessionCadenceBase,
  action: 'q2-battle-session-cadence-source-rebinding',
  date: '2026-11-12',
}

const sessionCasualtyBinding = {
  revision: testingBattleSessionCasualtyBase,
  action: 'q2-battle-session-casualty-source-rebinding',
  date: '2026-11-12',
}

const sessionCasualtyDialogueBinding = {
  revision: testingBattleSessionCasualtyDialogueBase,
  action: 'q2-battle-session-casualty-dialogue-source-rebinding',
  date: '2026-11-12',
}

const sessionPlayerActionsBinding = {
  revision: testingBattleSessionPlayerActionsBase,
  action: 'q2-battle-session-player-actions-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionCooperativeRecoveryBinding = {
  revision: testingBattleSessionCooperativeRecoveryBase,
  action: 'q2-battle-session-cooperative-recovery-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionItemEffectsBinding = {
  revision: testingBattleSessionItemEffectsBase,
  action: 'q2-battle-session-item-effects-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionThrowFeedbackBinding = {
  revision: testingBattleSessionThrowFeedbackBase,
  action: 'q2-battle-session-throw-feedback-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionEnemyCastBinding = {
  revision: testingBattleSessionEnemyCastBase,
  action: 'q2-battle-session-enemy-cast-source-rebinding',
  date: '2026-11-14',
  requireExactExcerpt: true,
}

const sessionSpecialStatusBinding = {
  revision: testingBattleSessionSpecialStatusBase,
  action: 'q2-battle-session-special-status-source-rebinding',
  date: '2026-11-14',
  requireExactExcerpt: true,
}

export const testingBattleDefeatSourceRevision = '31002d214bb106272f34af46c86c57872b9b2849'
export const testingBattleVictoryPublicationBase = '11b5b8d8183147732b9ea30560b5eb2bec4b2d7f'
export const testingBattleVictorySourceRevision = '840625b531130f6a9c4819c509ed3bf3a47353a5'
export const testingBattleHandoffPublicationBase = '9f5f57d4df53ea122622ffda110807e39e0ec66e'
export const testingBattleHandoffSourceRevision = '39d5bf7eb080a2a569421c50b79ebe60f38eecb0'
export const testingProjectVictoryPublicationBase = '31cfe5387c5d555b05b05dc1987e7ed31022f3a3'
export const testingProjectVictoryVersionPath = 'packages/content/src/character.ts'
const openingTraceTest = 'scripts/e2e/opening-trace.test.mjs'
const reforgeMain = 'packages/reforge/src/main.ts'
const reforgeBattleHost = 'packages/reforge/src/battle/battle-host.ts'
const reforgeBattleHostTest = 'packages/reforge/src/battle/battle-host.test.ts'
const reforgeBattleCommandSelectionTest =
  'packages/reforge/src/battle/battle-command-selection.test.ts'
const gameBootstrap = 'packages/game/src/shell/bootstrap.ts'
const gameSceneSystem = 'packages/game/src/core/scene-system.ts'
const encounterBindings = new Map([
  ['e2e/evidence/e2e-001.json', { id: 'e2e-001', paths: [openingTraceTest] }],
  ['e2e/evidence/e2e-common-issues.json', { id: 'e2e-common-issues', paths: [openingTraceTest] }],
  [
    'domains/runtime/scene/active-scene/evidence.json',
    { id: 'runtime-active-scene', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/battle/battle-host/evidence.json',
    { id: 'runtime-battle-host', paths: [reforgeMain, reforgeBattleHost] },
  ],
  [
    'domains/runtime/world/world-runtime/evidence.json',
    { id: 'runtime-world-owners', paths: [reforgeMain] },
  ],
])
const defeatSourceRanges = new Map([
  [openingTraceTest, { '527-642': '538-653' }],
  [
    reforgeMain,
    { '407-414': '408-415', '448-455': '449-456', '434-445': '435-446', '1242-1261': '1245-1266' },
  ],
  [reforgeBattleHost, { '53-67': '55-69', '156-160': '165-169' }],
])
export const isTestingBattleDefeatSourcePath = (path) => defeatSourceRanges.has(path)

const victorySourceRanges = new Map([
  [openingTraceTest, { '538-653': '551-666' }],
  [
    reforgeMain,
    { '408-415': '413-420', '449-456': '454-461', '435-446': '440-451', '1245-1266': '1251-1295' },
  ],
  [reforgeBattleHost, { '55-69': '63-78', '165-169': '174-178' }],
])

const handoffSourceRanges = new Map([
  [gameBootstrap, { 346: '349' }],
  [gameSceneSystem, { 44: '46' }],
  [
    reforgeMain,
    { '413-420': '414-421', '454-461': '455-462', '440-451': '441-452', '1251-1295': '1268-1343' },
  ],
  [reforgeBattleHost, { '63-78': '72-88', '174-178': '265-276' }],
  [reforgeBattleHostTest, { '13-36': '14-37' }],
  [
    testingBattleSessionSourcePath,
    { '220-222': '242-244', '381-392': '406-418', '1213-1222': '1243-1252' },
  ],
])

const handoffBindings = new Map(
  [...encounterBindings].filter(([, { paths }]) => paths.includes(reforgeMain)),
)
handoffBindings.set('domains/runtime/battle/battle-host/evidence.json', {
  id: 'runtime-battle-host',
  paths: [reforgeMain, reforgeBattleHost, reforgeBattleHostTest],
})
handoffBindings.set(sessionEvidencePath.slice('docs/testing/'.length), {
  id: sessionId,
  paths: [testingBattleSessionSourcePath],
})
handoffBindings.set('domains/cross-phase/script-corrections/evidence.json', {
  id: 'game-script-corrections',
  paths: [gameBootstrap],
  artifactClaims: true,
})
handoffBindings.set('domains/phase1-runtime/control-rotation/evidence.json', {
  id: 'game-input-rotation',
  paths: [gameSceneSystem],
  artifactClaims: true,
})

export const testingBattleLifecyclePublicationBase = '2d17adc064409630aa74415dc8195080d2344d28'
const lifecycleRanges = new Map([
  [gameBootstrap, { 349: '354' }],
  [reforgeBattleCommandSelectionTest, { '72-95': '73-96' }],
  [reforgeBattleHost, { '72-88': '72-88', '265-276': '277-288' }],
  [
    testingBattleSessionSourcePath,
    { '242-244': '242-244', '406-418': '407-419', '1243-1252': '1254-1263' },
  ],
  [
    reforgeMain,
    { '414-421': '414-421', '455-462': '455-462', '1268-1343': '1269-1367', '441-452': '441-452' },
  ],
])
const lifecycleBindings = new Map([
  [
    'domains/runtime/scene/active-scene/evidence.json',
    { id: 'runtime-active-scene', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/world/world-runtime/evidence.json',
    { id: 'runtime-world-owners', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/battle/battle-session-owners/evidence.json',
    {
      id: sessionId,
      paths: [testingBattleSessionSourcePath, reforgeBattleCommandSelectionTest],
    },
  ],
  [
    'domains/runtime/battle/battle-host/evidence.json',
    { id: 'runtime-battle-host', paths: [reforgeMain, reforgeBattleHost] },
  ],
  [
    'domains/cross-phase/script-corrections/evidence.json',
    { id: 'game-script-corrections', paths: [gameBootstrap], artifactClaims: true },
  ],
])

export const isTestingBattleLifecycleSource = (path) =>
  [...lifecycleBindings.values()].some(({ paths }) => paths.includes(path))

export const testingBattleReviewPublicationBase = '761bc57b8c2420413580b209088db0b87d060cc2'
const battleReviewRanges = new Map([
  [gameBootstrap, { 354: '354' }],
  [openingTraceTest, { '551-666': '554-669' }],
  [
    reforgeMain,
    { '414-421': '414-421', '455-462': '455-462', '1269-1367': '1269-1367', '441-452': '441-452' },
  ],
])
const battleReviewBindings = new Map(
  [...encounterBindings, ...lifecycleBindings]
    .map(([path, binding]) => [
      path,
      { ...binding, paths: binding.paths.filter(isTestingBattleReviewSource) },
    ])
    .filter(([, { paths }]) => paths.length > 0),
)

export function isTestingBattleReviewSource(path) {
  return battleReviewRanges.has(path)
}

export const testingBattleClosurePublicationBase = '4b2692d65917034f3743a348ca161d2ffb447b97'
const battleClosureRanges = new Map([
  [
    reforgeMain,
    { '414-421': '414-421', '441-452': '441-452', '455-462': '455-462', '1269-1367': '1269-1367' },
  ],
  [
    testingBattleSessionSourcePath,
    { '242-244': '246-248', '407-419': '412-424', '1254-1263': '1261-1270' },
  ],
  [reforgeBattleCommandSelectionTest, { '73-96': '73-96' }],
])
const battleClosureBindings = new Map(
  [...lifecycleBindings]
    .map(([path, binding]) => [
      path,
      { ...binding, paths: binding.paths.filter(isTestingBattleClosureSource) },
    ])
    .filter(([, { paths }]) => paths.length > 0),
)
const battleClosureBinding = {
  ranges: battleClosureRanges,
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleClosurePublicationBase,
  action: 'q2-battle-closure-source-rebinding',
  date: '2026-11-16',
}

export function isTestingBattleClosureSource(path) {
  return battleClosureRanges.has(path)
}

export const testingBattleSummonPublicationBase = 'b8b8dd2fcc551a782a2e90387bcf91170bc4899f'
export const testingBattleSummonDivisionPublicationBase = '62959793cf6fb2450806d12072608ce768d80c39'
export const testingBattleEnemyColorPublicationBase = '070e8145c20e3c2cc8cc77c1e696843d453a0a92'
export const testingBattleSummonPlaybackPublicationBase = '093fdb31abab95c08ce42b3b99c142e01adb3710'

/** These handoff sources also appear in publication layers recorded before Q2. */
export const isTestingBattleHandoffHistoricalSource = (path) =>
  path === gameBootstrap || path === gameSceneSystem

function replaceHandoffExcerpt(excerpt, candidate, previous = '') {
  assert.equal(excerpt.split(candidate).length, 2, 'hostile handoff excerpt changed')
  return excerpt.replace(candidate, previous)
}

function handoffExcerpt(excerpt, { path, lines }) {
  if (path === reforgeBattleHost && lines === '63-78')
    return replaceHandoffExcerpt(excerpt, '    this.#entryPresentation?.abortEntry()\n')
  if (path === reforgeBattleHost && lines === '174-178')
    return replaceHandoffExcerpt(
      excerpt,
      [
        '    await this.finishEncounter(',
        '      session,',
        '      result,',
        '      signal,',
        '      assertCurrent,',
        '      restoreMusic,',
        '      presentation?.fadeOnVictory === true,',
        '    )',
      ].join('\n'),
      '    await this.finishEncounter(session, result, signal, assertCurrent, restoreMusic)',
    )
  if (path === testingBattleSessionSourcePath && lines === '381-392')
    return replaceHandoffExcerpt(
      excerpt,
      '      ...(opts.worldSettlement ? { worldSettlement: opts.worldSettlement } : {}),\n',
    )
  if (path !== reforgeMain || lines !== '1251-1295') return excerpt
  const entryPort = excerpt.indexOf('      worldPresentation: (signal) => {\n')
  const victoryPort = excerpt.indexOf('      presentVictory: async (owner, signal, finish) => {\n')
  assert(entryPort > 0 && victoryPort > entryPort, 'hostile entry port changed')
  let restored = excerpt.slice(0, entryPort) + excerpt.slice(victoryPort)
  restored = replaceHandoffExcerpt(
    restored,
    [
      '        const held: NonNullable<typeof victoryFrame> = {',
      '          frame: ctx.getImageData(0, 0, canvas.width, canvas.height),',
      '          signal,',
      '        }',
    ].join('\n'),
    '        const held = { frame: ctx.getImageData(0, 0, canvas.width, canvas.height), signal }',
  )
  restored = replaceHandoffExcerpt(
    restored,
    [
      "          assertRunnerActive(signal, '战斗胜利呈现已取消')",
      '          const encounter = hostileEncounter',
      '          if (encounter?.signal === owner && encounter.commitVictory) {',
      '            encounter.commitVictory()',
      '            await fadeFromVictory(held)',
      '          }',
      '',
    ].join('\n'),
  )
  return replaceHandoffExcerpt(
    restored,
    [
      '          if (victoryFrame === held) {',
      '            dialogBox.releaseBattleVictory(signal)',
      '            victoryFrame = undefined',
      '          }',
    ].join('\n'),
    '          if (victoryFrame === held) victoryFrame = undefined',
  )
}

function defeatExcerpt(excerpt, { path, lines }) {
  if (path !== reforgeMain || lines !== '1242-1261') return excerpt
  const added =
    '      worldDefeatFrameCapture: (signal) =>\n        ordinaryDefeatSignal === signal ? () => gameOverPresentation.hold(ctx, signal) : undefined,\n'
  assert.equal(excerpt.split(added).length, 2, 'defeat frame port changed')
  return excerpt.replace(added, '')
}

function victoryExcerpt(excerpt, { path, lines }) {
  if (path === reforgeBattleHost && lines === '55-69') {
    const cancellation = '    this.#victoryPresentation?.abort()\n'
    assert.equal(excerpt.split(cancellation).length, 2, 'victory owner cancellation changed')
    return excerpt.replace(cancellation, '')
  }
  if (path !== reforgeMain || lines !== '1245-1266') return excerpt
  const settle = [
    '        settleBattleVictory(session, world, canonicalProject, playVictory, undefined, {',
    '          deferRecovery: true,',
    '        }),',
  ].join('\n')
  assert.equal(excerpt.split(settle).length, 2, 'victory settlement port changed')
  const heldFrame = excerpt.indexOf('      presentVictory: async (owner, signal, finish) => {\n')
  const defeated = excerpt.indexOf(
    '      runDefeated: async (definitions, signal, assertCurrent) => {',
  )
  assert(heldFrame > 0 && defeated > heldFrame, 'victory frame port changed')
  return (excerpt.slice(0, heldFrame) + excerpt.slice(defeated)).replace(
    settle,
    '        settleBattleVictory(session, world, canonicalProject, playVictory),',
  )
}

const defeatBinding = {
  ranges: defeatSourceRanges,
  normalizeExcerpt: defeatExcerpt,
  base: testingBattleSessionCasualtyDialogueBase,
  action: 'q2-ordinary-defeat-source-rebinding',
  date: '2026-11-13',
}
const victoryBinding = {
  ranges: victorySourceRanges,
  normalizeExcerpt: victoryExcerpt,
  base: testingBattleVictoryPublicationBase,
  action: 'q2-world-victory-source-rebinding',
  date: '2026-11-14',
}

const handoffBinding = {
  ranges: handoffSourceRanges,
  normalizeExcerpt: handoffExcerpt,
  base: testingBattleHandoffPublicationBase,
  action: 'q2-world-battle-handoff-source-rebinding',
  date: '2026-11-14',
}

const projectVictoryVersionBinding = {
  paths: [testingProjectVictoryVersionPath],
  ranges: new Map([
    [testingProjectVictoryVersionPath, { '168-168': '169-169', '168-170': '169-171' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingProjectVictoryPublicationBase,
  action: 'q2-project-victory-version-source-rebinding',
  date: '2026-11-14',
}
const projectVictoryVersionEvidence = new Map(
  testingAcquisitionSourceBindings
    .filter(({ sourcePaths }) => sourcePaths.includes(testingProjectVictoryVersionPath))
    .map(({ id, path }) => [path, id]),
)

function testingMetadata(bytes) {
  const text = decodeTerminalUtf8(bytes)
  const match = /<!-- testing-meta\s*\n(\{[^\n]*\})\n-->/u.exec(text)
  assert(match, 'project victory version bridge requires canonical testing metadata')
  const start = match.index + match[0].indexOf(match[1])
  return { text, start, json: Buffer.from(match[1]) }
}

export function assertTestingProjectVictoryVersionSource({ readSource, readBase, readFixed }) {
  const path = testingProjectVictoryVersionPath
  const current = readSource(path)
  const fixed = readFixed(path)
  assert(current?.equals(fixed), 'version source differs from the frozen project victory candidate')
  let source = decodeTerminalUtf8(current)
  source = replaceHandoffExcerpt(
    source,
    "import type { HostileVictoryTransition } from './scene-core.js'\n",
  )
  source = replaceHandoffExcerpt(
    source,
    '  /** 普通明雷胜利后的默认回场演出。缺省直接返回，各敌人可以覆写。 */\n  hostileVictoryTransition?: HostileVictoryTransition\n',
  )
  assert(Buffer.from(source).equals(readBase(path)), 'project victory changed the version source')
  return current
}

/** Restore only the version source coordinate/history delta. The encounter bridge
 * then independently checks its caller changes in the four overlapping records. */
export function restoreTestingProjectVictoryVersionBindings(path, currentBytes, inputs) {
  const id = projectVictoryVersionEvidence.get(path)
  if (!id && path !== catalogPath && !path.endsWith('.md')) return currentBytes
  if (!path.startsWith('docs/testing/')) return currentBytes
  const baseBytes = inputs.readBase(path)
  if (!baseBytes) return currentBytes
  const stage = projectVictoryVersionBinding
  const sources = {
    source: testingBridgeSources(inputs.readSource),
    fixed: testingBridgeSources(inputs.readFixed),
    predecessor: testingBridgeSources(inputs.readBase),
  }
  function restoreRef(before, current) {
    const old = before.sourceRefs.filter((item) => stage.paths.includes(item.path))
    const actual = current.sourceRefs.filter((item) => stage.paths.includes(item.path))
    assert.equal(old.length, 1, 'project victory must rebind one existing version reference')
    encounterReferences(old, actual, stage.paths, sources, stage)
    current.sourceRefs[current.sourceRefs.indexOf(actual[0])] = old[0]
    return old
  }
  function restoreHistory(before, current, old) {
    // The final encounter event has its own full replay against the fixed
    // handoff predecessor. Leave that event for the encounter guard, and
    // require every earlier history byte to match here as well.
    const retainsHandoff = before.at(-1)?.action === handoffBinding.action
    const prefix = retainsHandoff ? before.slice(0, -1) : before
    assert.deepEqual(current.slice(0, prefix.length), prefix, 'old history changed')
    if (retainsHandoff)
      assert.equal(current[prefix.length]?.action, handoffBinding.action, 'encounter event moved')
    return encounterHistory(current.slice(0, -1), current, old, inputs.readSource, stage)
  }
  if (path === catalogPath) {
    const before = parseTerminalJson(baseBytes).entries
    const current = parseTerminalJson(currentBytes)
    const byId = new Map(current.entries.map((entry) => [entry.id, entry]))
    for (const [evidencePath, entryId] of projectVictoryVersionEvidence) {
      const prior = before.find(({ id }) => id === entryId)
      const entry = byId.get(entryId)
      assert(prior && entry && `docs/testing/${entry.evidence}` === evidencePath)
      const old = restoreRef(prior, entry)
      entry.revision.history = restoreHistory(prior.revision.history, entry.revision.history, old)
    }
    return Buffer.from(JSON.stringify(current))
  }
  if (id) {
    const before = parseTerminalJson(baseBytes)
    const current = parseTerminalJson(currentBytes)
    assert.equal(before.id, id)
    assert.equal(current.id, id)
    const [old] = restoreRef(before, current)
    current.history = restoreHistory(before.history, current.history, [old])
    const oldPointer = `${old.path}:${old.lines}`
    const currentPointer = `${old.path}:${stage.ranges.get(old.path)[old.lines]}`
    for (const [index, claim] of before.claims.entries()) {
      const pointerIndex = claim.evidence.indexOf(oldPointer)
      if (claim.result !== 'source-backed' || pointerIndex < 0) continue
      assert.equal(current.claims[index].evidence[pointerIndex], currentPointer)
      current.claims[index].evidence[pointerIndex] = oldPointer
    }
    return Buffer.from(JSON.stringify(current))
  }
  const priorText = decodeTerminalUtf8(baseBytes)
  if (!priorText.includes('<!-- testing-meta')) return currentBytes
  const prior = testingMetadata(baseBytes)
  const before = parseTerminalJson(prior.json)
  if (![...projectVictoryVersionEvidence.values()].includes(before.id)) return currentBytes
  const metadata = testingMetadata(currentBytes)
  const current = parseTerminalJson(metadata.json)
  assert.equal(current.id, before.id)
  const old = restoreRef(before, current)
  current.revision.history = restoreHistory(before.revision.history, current.revision.history, old)
  const restored =
    metadata.text.slice(0, metadata.start) +
    JSON.stringify(current) +
    metadata.text.slice(metadata.start + metadata.json.toString().length)
  return Buffer.from(restored)
}

function encounterReferences(before, current, paths, { source, fixed, predecessor }, stage) {
  assert.equal(
    current.length,
    before.length,
    'battle encounter source reference membership changed',
  )
  const previous = []
  const clip = (bytes, range) => {
    const [first, last = first] = range.split('-').map(Number)
    return bytes
      .toString('utf8')
      .split('\n')
      .slice(first - 1, last)
      .join('\n')
  }
  for (const [index, old] of before.entries()) {
    const reference = current[index]
    if (!paths.includes(old.path)) {
      assert.deepEqual(reference, old, 'encounter bridge changed an unrelated source reference')
      continue
    }
    const nextRange = stage.ranges.get(old.path)[old.lines]
    assert(nextRange, 'encounter bridge source range was not admitted')
    assert.deepEqual({ ...reference, sha256: old.sha256, lines: old.lines }, old)
    assert.equal(reference.lines, nextRange, 'encounter bridge referenced a different caller range')
    assertTestingBridgeReference(old, predecessor)
    assertTestingBridgeReference(reference, source)
    const actual = source.read(old.path)
    assert(
      actual.equals(fixed.read(old.path)),
      'encounter source differs from the frozen Q2 candidate',
    )
    assert.equal(
      stage.normalizeExcerpt(clip(actual, nextRange), old),
      clip(predecessor.read(old.path), old.lines),
      'encounter bridge changed the accepted caller excerpt',
    )
    previous.push(old)
  }
  assert(previous.length > 0, 'encounter bridge has no approved reference')
  return previous
}

function encounterHistory(before, current, previous, readSource, stage) {
  const history = restoreTestingBridgeHistory(
    before,
    current,
    previous,
    readSource,
    stage.base,
    sessionReceipt,
  )
  const event = current.at(-1)
  assert.equal(event.action, stage.action)
  assert.equal(event.date, stage.date)
  return history
}

/** Preserve the previously accepted runtime claims while updating their live source references. */
// Battle launch now also accepts an existing script owner. Its isolated entry port changed;
// preparation, defeat capture, and victory/world commit callers in the same excerpt stay intact.
function lifecycleExcerpt(excerpt, ref) {
  if (ref.path !== reforgeMain || ref.lines !== '1268-1343') return excerpt
  const from = excerpt.indexOf('      worldPresentation: (signal, scripted) => {')
  const to = excerpt.indexOf('      presentVictory: async (owner, signal, finish) => {', from)
  assert(from >= 0 && to > from, 'missing the admitted scripted entry port')
  const oldEntry = [
    '      worldPresentation: (signal) => {',
    '        const encounter = hostileEncounter',
    '        if (!encounter?.entry || encounter.signal !== signal) return undefined',
    '        const entry = encounter.entry',
    '        return {',
    '          abortEntry: encounter.abort,',
    '          fadeOnVictory: encounter.commitVictory !== undefined,',
    '          showEntry: async (session) => {',
    '            try {',
    '              await entry.show(() => {',
    '                session.render(ctx, WORLD_SCALE)',
    '                applyAmbienceTint()',
    '              })',
    '            } finally {',
    '              if (hostileEncounter === encounter) delete encounter.entry',
    '            }',
    '          },',
    '        }',
    '      },',
    '',
  ].join('\n')
  return excerpt.slice(0, from) + oldEntry + excerpt.slice(to)
}

export function restoreTestingBattleLifecycleSourceBindings(path, currentBytes, inputs) {
  const stage = {
    ranges: lifecycleRanges,
    normalizeExcerpt: lifecycleExcerpt,
    base: testingBattleLifecyclePublicationBase,
    action: 'q2-battle-lifecycle-source-rebinding',
    date: '2026-11-15',
  }
  return restoreEncounterSourceBindings(path, currentBytes, inputs, stage, lifecycleBindings)
}

/** The presentation fixes and their recorder fixture preserve the prior caller and oracle excerpts. */
export function restoreTestingBattleReviewSourceBindings(path, currentBytes, inputs) {
  const stage = {
    ranges: battleReviewRanges,
    normalizeExcerpt: (excerpt) => excerpt,
    base: testingBattleReviewPublicationBase,
    action: 'q2-battle-review-source-rebinding',
    date: '2026-11-15',
  }
  return restoreEncounterSourceBindings(path, currentBytes, inputs, stage, battleReviewBindings)
}

/** Restore the five older entry objects before replaying their original publication
 * guards. Only the admitted source coordinates and one applicability event may vary. */
export function restoreTestingBattleDefeatSourceBindings(path, currentBytes, inputs) {
  return restoreEncounterSourceBindings(path, currentBytes, inputs, defeatBinding)
}

export function restoreTestingBattleVictorySourceBindings(path, currentBytes, inputs) {
  return restoreEncounterSourceBindings(path, currentBytes, inputs, victoryBinding)
}

export function restoreTestingBattleHandoffSourceBindings(path, currentBytes, inputs) {
  return restoreEncounterSourceBindings(path, currentBytes, inputs, handoffBinding, handoffBindings)
}

function restoreEncounterSourceBindings(
  path,
  currentBytes,
  { readSource, readBase, readFixed },
  stage,
  bindings = encounterBindings,
) {
  if (!path.startsWith('docs/testing/')) return currentBytes
  const binding = bindings.get(path.slice('docs/testing/'.length))
  if (!binding && path !== catalogPath) return currentBytes
  const baseBytes = readBase(path)
  const before = parseTerminalJson(baseBytes)
  const current = parseTerminalJson(currentBytes)
  const sources = {
    source: testingBridgeSources(readSource),
    fixed: testingBridgeSources(readFixed),
    predecessor: testingBridgeSources(readBase),
  }
  if (path === catalogPath) {
    for (const { id, paths } of bindings.values()) {
      const index = before.entries.findIndex((entry) => entry.id === id)
      const old = before.entries[index]
      const entry = current.entries[index]
      assert(
        index >= 0 && entry.id === old.id,
        'encounter bridge changed catalog identity or order',
      )
      const previous = encounterReferences(old.sourceRefs, entry.sourceRefs, paths, sources, stage)
      const history = encounterHistory(
        old.revision.history,
        entry.revision.history,
        previous,
        readSource,
        stage,
      )
      assert.deepEqual(
        { ...entry, sourceRefs: old.sourceRefs, revision: { ...entry.revision, history } },
        old,
      )
      current.entries[index] = old
    }
    return Buffer.from(JSON.stringify(current))
  }

  assert.equal(before.id, binding.id)
  assert.equal(current.id, binding.id)
  const previous = encounterReferences(
    before.sourceRefs,
    current.sourceRefs,
    binding.paths,
    sources,
    stage,
  )
  const history = encounterHistory(before.history, current.history, previous, readSource, stage)
  if (binding.artifactClaims) {
    // Its claims cite execution artifacts, with no live source-coordinate pointer.
    assert.deepEqual({ ...current, sourceRefs: before.sourceRefs, history }, before)
    return baseBytes
  }
  const claimIndex = before.claims.findIndex(
    ({ id, result }) => id === `${binding.id}-source-contract` && result === 'source-backed',
  )
  assert(claimIndex >= 0, 'encounter bridge source claim missing')
  for (const old of previous) {
    const reference = current.sourceRefs[before.sourceRefs.indexOf(old)]
    const pointer = `${old.path}:${old.lines}`
    const previousPointers = before.claims[claimIndex].evidence
    const pointerIndex = previousPointers.indexOf(pointer)
    assert(pointerIndex >= 0 && previousPointers.lastIndexOf(pointer) === pointerIndex)
    const pointers = current.claims[claimIndex].evidence
    assert.equal(pointers[pointerIndex], `${reference.path}:${reference.lines}`)
    pointers[pointerIndex] = pointer
  }
  assert.deepEqual({ ...current, sourceRefs: before.sourceRefs, history }, before)
  return baseBytes
}

const publication = {
  id: 'q2-battle-foundation',
  kind: 'report',
  canonical: 'domains/cross-phase/battle-foundation/report.md',
  index: 'domains/cross-phase/battle-foundation/README.md',
  evidence: 'domains/cross-phase/battle-foundation/evidence.json',
}
const evidencePath = `docs/testing/${publication.evidence}`
const palManifestPath = 'projects/pal/manifest.json'
const battleSummonBinding = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '246-248': '246-248', '412-424': '412-424', '1261-1270': '1261-1270' },
    ],
    [palManifestPath, { 7: '7' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSummonPublicationBase,
  action: 'q2-battle-enemy-summon-source-rebinding',
  date: '2026-11-16',
}
const battleSummonBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [publication.evidence, { id: publication.id, paths: [palManifestPath], artifactClaims: true }],
])

export const isTestingBattleSummonSource = (path) => battleSummonBinding.ranges.has(path)

export function restoreTestingBattleSummonSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(path, bytes, inputs, battleSummonBinding, battleSummonBindings)
}

const battleSummonDivisionRanges = new Map([
  [
    testingBattleSessionSourcePath,
    { '246-248': '248-250', '412-424': '415-427', '1261-1270': '1269-1278' },
  ],
  ['scripts/e2e/battle-reforge-instrumentation.mjs', { 17: '17' }],
  ['packages/reforge/src/battle/battle-core.ts', { 2473: '2466' }],
  ['packages/game/src/core/battle/battle-system.ts', { 2788: '2824' }],
])
const battleSummonDivisionBinding = {
  ranges: battleSummonDivisionRanges,
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSummonDivisionPublicationBase,
  action: 'q2-summon-division-caller-rebinding',
  date: '2026-11-16',
}
const battleSummonDivisionBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [...battleSummonDivisionRanges.keys()].filter(
        (path) => path !== testingBattleSessionSourcePath,
      ),
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleSummonDivisionSource = (path) => battleSummonDivisionRanges.has(path)

export function restoreTestingBattleSummonDivisionSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleSummonDivisionBinding,
    battleSummonDivisionBindings,
  )
}

const battleEnemyColorRanges = new Map([
  ['scripts/e2e/battle-trace-observer.mjs', { 204: '204', 307: '309' }],
  ['scripts/e2e/battle-game-instrumentation.mjs', { 42: '42', 336: '336' }],
])
const battleEnemyColorStage = {
  ranges: battleEnemyColorRanges,
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleEnemyColorPublicationBase,
  action: 'q2-enemy-color-source-rebinding',
  date: '2026-11-16',
}
const battleEnemyColorBindings = new Map([
  [
    publication.evidence,
    { id: publication.id, paths: [...battleEnemyColorRanges.keys()], artifactClaims: true },
  ],
])

export const isTestingBattleEnemyColorSource = (path) => battleEnemyColorRanges.has(path)

export function restoreTestingBattleEnemyColorSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleEnemyColorStage,
    battleEnemyColorBindings,
  )
}

const battleSummonPlaybackStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '248-250': '251-253', '415-427': '420-432', '1269-1278': '1282-1291' },
    ],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSummonPlaybackPublicationBase,
  action: 'q2-enemy-summon-playback-source-rebinding',
  date: '2026-11-16',
}
const battleSummonPlaybackBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
])

export function restoreTestingBattleSummonPlaybackSourceBindings(path, bytes, inputs) {
  return restoreEncounterSourceBindings(
    path,
    bytes,
    inputs,
    battleSummonPlaybackStage,
    battleSummonPlaybackBindings,
  )
}

export const testingBattleSpellFeedbackPublicationBase = '257296ec61b0dd8a6e103df9d26b8af374ca702b'
const battleSpellFeedbackCore = 'packages/reforge/src/battle/battle-core.ts'
const battleSpellFeedbackStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '420-432', '1282-1291': '1286-1295' },
    ],
    [battleSpellFeedbackCore, { 2466: '2466' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSpellFeedbackPublicationBase,
  action: 'q2-enemy-spell-feedback-source-rebinding',
  date: '2026-11-16',
}
const battleSpellFeedbackBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleSpellFeedbackCore], artifactClaims: true },
  ],
])

export const isTestingBattleSpellFeedbackSource = (path) =>
  battleSpellFeedbackStage.ranges.has(path)

export function restoreTestingBattleSpellFeedbackSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleSpellFeedbackStage,
    battleSpellFeedbackBindings,
  )
}

export const testingBattleActionCadencePublicationBase = 'f1a72ef4c649db5a1d75650d18a84991306d6936'
const battleActionCadenceStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '420-432', '1286-1295': '1286-1295' },
    ],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleActionCadencePublicationBase,
  action: 'q2-battle-action-cadence-source-rebinding',
  date: '2026-11-17',
}
const battleActionCadenceBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
])

export function restoreTestingBattleActionCadenceSourceBindings(path, bytes, inputs) {
  return restoreEncounterSourceBindings(
    path,
    bytes,
    inputs,
    battleActionCadenceStage,
    battleActionCadenceBindings,
  )
}

export const testingBattleEnemyTransformPublicationBase = 'b0afdd9e54203fbe5f6d7a457acdf9958168be7f'
const battleTransformGameSystem = 'packages/game/src/core/battle/battle-system.ts'
const battleTransformCore = 'packages/reforge/src/battle/battle-core.ts'
const battleEnemyTransformStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '420-432', '1286-1295': '1286-1295' },
    ],
    [battleTransformGameSystem, { 2824: '2824' }],
    [battleTransformCore, { 2466: '2467' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleEnemyTransformPublicationBase,
  action: 'q2-enemy-transform-source-rebinding',
  date: '2026-11-17',
}
const battleEnemyTransformBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [battleTransformGameSystem, battleTransformCore],
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleEnemyTransformSource = (path) =>
  battleEnemyTransformStage.ranges.has(path)

export function restoreTestingBattleEnemyTransformSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleEnemyTransformStage,
    battleEnemyTransformBindings,
  )
}

export const testingBattleSceneObserverPublicationBase = '53f5fc147de8e987365ef7531dade6c83958ca1f'
const reforgeBattleObserver = 'scripts/e2e/battle-reforge-instrumentation.mjs'
const battleSceneObserverStage = {
  ranges: new Map([[reforgeBattleObserver, { 17: '17' }]]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSceneObserverPublicationBase,
  action: 'q2-scene-observer-source-rebinding',
  date: '2026-11-17',
}
const battleSceneObserverBindings = new Map([
  [
    publication.evidence,
    { id: publication.id, paths: [reforgeBattleObserver], artifactClaims: true },
  ],
])

export const isTestingBattleSceneObserverSource = (path) =>
  battleSceneObserverStage.ranges.has(path)

export function restoreTestingBattleSceneObserverSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleSceneObserverStage,
    battleSceneObserverBindings,
  )
}

export const testingBattleCooperativeRosterPublicationBase =
  '839c6829346a53d8e5e149986d034460aba10432'
const battleCooperativeRosterStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '420-432', '1286-1295': '1283-1292' },
    ],
    [battleTransformGameSystem, { 2824: '2827' }],
    [battleTransformCore, { 2467: '2469' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleCooperativeRosterPublicationBase,
  action: 'q2-cooperative-roster-source-rebinding',
  date: '2026-11-17',
}
const battleCooperativeRosterBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [battleTransformGameSystem, battleTransformCore],
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleCooperativeRosterSource = (path) =>
  battleCooperativeRosterStage.ranges.has(path)

export function restoreTestingBattleCooperativeRosterSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleCooperativeRosterStage,
    battleCooperativeRosterBindings,
  )
}

export const testingBattleCasualtyRosterPublicationBase = 'dd4bd6afd23882b8777ba8b50c3bb8d10a534d17'
const battleCasualtyRosterStage = {
  ranges: new Map([[battleTransformCore, { 2469: '2465' }]]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleCasualtyRosterPublicationBase,
  action: 'q2-casualty-roster-source-rebinding',
  date: '2026-11-17',
}
const battleCasualtyRosterBindings = new Map([
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattleCasualtyRosterSource = (path) =>
  battleCasualtyRosterStage.ranges.has(path)

export function restoreTestingBattleCasualtyRosterSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleCasualtyRosterStage,
    battleCasualtyRosterBindings,
  )
}

export const testingBattleLearnedSkillsPublicationBase = '23c111a58d091685b556b0dc8f69e861317592e4'
const rewardSource = 'packages/content/src/rewards.ts'
const settlementSource = 'packages/reforge/src/battle/settlement.ts'
const battleLearnedSkillsStage = {
  ranges: new Map([
    [rewardSource, { 254: '260' }],
    [settlementSource, { 334: '322' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleLearnedSkillsPublicationBase,
  action: 'q2-learned-skills-source-rebinding',
  date: '2026-11-17',
}
const battleLearnedSkillsBindings = new Map([
  [
    publication.evidence,
    { id: publication.id, paths: [rewardSource, settlementSource], artifactClaims: true },
  ],
])

export const isTestingBattleLearnedSkillsSource = (path) =>
  battleLearnedSkillsStage.ranges.has(path)

export function restoreTestingBattleLearnedSkillsSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleLearnedSkillsStage,
    battleLearnedSkillsBindings,
  )
}

export const testingBattleScriptedShakePublicationBase = '087d243365e62759930c7db40787a7620da6420f'
const battleScriptedShakeStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '420-432', '1283-1292': '1283-1292' },
    ],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleScriptedShakePublicationBase,
  action: 'q2-scripted-shake-source-rebinding',
  date: '2026-11-18',
}
const battleScriptedShakeBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
])

export function restoreTestingBattleScriptedShakeSourceBindings(path, bytes, inputs) {
  return restoreEncounterSourceBindings(
    path,
    bytes,
    inputs,
    battleScriptedShakeStage,
    battleScriptedShakeBindings,
  )
}

export const testingBattleWindBlowPublicationBase = 'aa999b84470b487dfff963ddcc55a90e1df84d7b'
const battleWindBlowStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '420-432': '426-438', '1283-1292': '1289-1298' },
    ],
    [battleTransformCore, { 2465: '2490' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleWindBlowPublicationBase,
  action: 'q2-wind-blow-source-rebinding',
  date: '2026-11-18',
}
const battleWindBlowBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattleWindBlowSource = (path) => battleWindBlowStage.ranges.has(path)

export function restoreTestingBattleWindBlowSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleWindBlowStage,
    battleWindBlowBindings,
  )
}

export const testingBattleConditionalSpellPublicationBase =
  'af55382a655a20b5c78095d0de52f4419d0bad71'
const battleConditionalSpellStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1289-1298': '1289-1298' },
    ],
    [battleTransformCore, { 2490: '2497' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleConditionalSpellPublicationBase,
  action: 'q2-conditional-spell-source-rebinding',
  date: '2026-11-18',
}
const battleConditionalSpellBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattleConditionalSpellSource = (path) =>
  battleConditionalSpellStage.ranges.has(path)

export function restoreTestingBattleConditionalSpellSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleConditionalSpellStage,
    battleConditionalSpellBindings,
  )
}

export const testingBattleGuAndConfusionPublicationBase = '839c1ede2ffff006b0fc67be3deb1c1674b1b303'
const randomInstrumentation = 'scripts/e2e/battle-random-instrumentation.mjs'
const battleGuAndConfusionStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1289-1298': '1290-1299' },
    ],
    [battleTransformCore, { 2497: '2500' }],
    [randomInstrumentation, { 28: '28' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleGuAndConfusionPublicationBase,
  action: 'q2-gu-and-confusion-source-rebinding',
  date: '2026-11-19',
}
const battleGuAndConfusionBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [battleTransformCore, randomInstrumentation],
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleGuAndConfusionSource = (path) =>
  battleGuAndConfusionStage.ranges.has(path)

export function restoreTestingBattleGuAndConfusionSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleGuAndConfusionStage,
    battleGuAndConfusionBindings,
  )
}

export const testingBattleSpellCurrencyPublicationBase = '1805ef135a1238b5c75d152ec643a6ff56053c1d'
const battleCurrencyTrialAdapter = 'scripts/e2e/battle-reforge-adapter.mjs'
const battleCurrencySelection = 'packages/reforge/src/battle/battle-command-selection.ts'
const battleSpellCurrencyStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1290-1299': '1284-1293' },
    ],
    [reforgeBattleCommandSelectionTest, { '73-96': '72-95' }],
    [battleCurrencyTrialAdapter, { 179: '179' }],
    [battleCurrencySelection, { 60: '59' }],
    [battleTransformCore, { 2500: '2500' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleSpellCurrencyPublicationBase,
  action: 'q2-spell-currency-source-rebinding',
  date: '2026-11-19',
}
const battleSpellCurrencyBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath, reforgeBattleCommandSelectionTest] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [battleCurrencyTrialAdapter, battleCurrencySelection, battleTransformCore],
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleSpellCurrencySource = (path) =>
  battleSpellCurrencyStage.ranges.has(path)

export function restoreTestingBattleSpellCurrencySourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleSpellCurrencyStage,
    battleSpellCurrencyBindings,
  )
}

export const testingBattleEscapeSpellPublicationBase = '768c8de4ea02d931826e583d00dc108677adbbea'
const battleEscapeFixtureAdapter = 'scripts/e2e/battle-game-adapter.mjs'
const battleEscapeSpellStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1284-1293': '1284-1293' },
    ],
    [battleEscapeFixtureAdapter, { 480: '480' }],
    [battleTransformCore, { 2500: '2500' }],
    [battleTransformGameSystem, { 2827: '2828' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleEscapeSpellPublicationBase,
  action: 'q2-escape-spell-source-rebinding',
  date: '2026-11-19',
}
const battleEscapeSpellBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    {
      id: publication.id,
      paths: [battleEscapeFixtureAdapter, battleTransformCore, battleTransformGameSystem],
      artifactClaims: true,
    },
  ],
])

export const isTestingBattleEscapeSpellSource = (path) => battleEscapeSpellStage.ranges.has(path)

export function restoreTestingBattleEscapeSpellSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleEscapeSpellStage,
    battleEscapeSpellBindings,
  )
}

export const testingBattleEnemySpellShakePublicationBase =
  'ac11b220065fbbd76cb059132bd6732ab086f998'
const battleEnemySpellShakeStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1284-1293': '1284-1293' },
    ],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleEnemySpellShakePublicationBase,
  action: 'q2-enemy-spell-shake-source-rebinding',
  date: '2026-11-19',
}
const battleEnemySpellShakeBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
])

export function restoreTestingBattleEnemySpellShakeSourceBindings(path, bytes, inputs) {
  return restoreEncounterSourceBindings(
    path,
    bytes,
    inputs,
    battleEnemySpellShakeStage,
    battleEnemySpellShakeBindings,
  )
}

export const testingBattleItemUsePublicationBase = '89dab268613141283aa49ddb228351060607316e'
const battleItemUseStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1284-1293': '1284-1293' },
    ],
    [battleTransformCore, { 2500: '2501' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleItemUsePublicationBase,
  action: 'q2-battle-item-use-source-rebinding',
  date: '2026-11-19',
}
const battleItemUseBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattleItemUseSource = (path) => battleItemUseStage.ranges.has(path)

export function restoreTestingBattleItemUseSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(path, bytes, inputs, battleItemUseStage, battleItemUseBindings)
}

export const testingBattleHidingPublicationBase = '970731da74e22ee1aa7bf661f6e5be6481d26332'
const battleHidingStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1284-1293': '1298-1307' },
    ],
    [battleTransformGameSystem, { 2828: '2844' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleHidingPublicationBase,
  action: 'q2-battle-hiding-source-rebinding',
  date: '2026-11-19',
}
const battleHidingBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformGameSystem], artifactClaims: true },
  ],
])

export const isTestingBattleHidingSource = (path) => battleHidingStage.ranges.has(path)

export function restoreTestingBattleHidingSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(path, bytes, inputs, battleHidingStage, battleHidingBindings)
}

export const testingBattleThrowStatusPublicationBase = '55fcc99d356c1bb0332e687019b495c6eb340052'
const battleThrowStatusStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1298-1307': '1298-1307' },
    ],
    [battleTransformCore, { 2501: '2501' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattleThrowStatusPublicationBase,
  action: 'q2-battle-throw-status-source-rebinding',
  date: '2026-11-19',
}
const battleThrowStatusBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattleThrowStatusSource = (path) => battleThrowStatusStage.ranges.has(path)

export function restoreTestingBattleThrowStatusSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battleThrowStatusStage,
    battleThrowStatusBindings,
  )
}

export const testingBattlePoisonNarrationPublicationBase =
  'aa2e8d2c69c714d050e0d0ae0f684a123a968007'
const battlePoisonNarrationStage = {
  ranges: new Map([
    [
      testingBattleSessionSourcePath,
      { '251-253': '251-253', '426-438': '426-438', '1298-1307': '1305-1314' },
    ],
    [battleTransformCore, { 2501: '2506' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingBattlePoisonNarrationPublicationBase,
  action: 'q2-battle-poison-narration-source-rebinding',
  date: '2026-11-19',
}
const battlePoisonNarrationBindings = new Map([
  [
    sessionEvidencePath.slice('docs/testing/'.length),
    { id: sessionId, paths: [testingBattleSessionSourcePath] },
  ],
  [
    publication.evidence,
    { id: publication.id, paths: [battleTransformCore], artifactClaims: true },
  ],
])

export const isTestingBattlePoisonNarrationSource = (path) =>
  battlePoisonNarrationStage.ranges.has(path)

export function restoreTestingBattlePoisonNarrationSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    battlePoisonNarrationStage,
    battlePoisonNarrationBindings,
  )
}

export const testingWorldItemTargetPublicationBase = '0daf5f51472d793258dd8d3a331ae60e95bc881b'
const worldItemMenuSession = 'packages/reforge/src/menu/menu-session.ts'
const worldItemTargetRanges = new Map([
  [worldItemMenuSession, { '105-128': '106-130' }],
  ['packages/reforge/src/menu/menu-session.test.ts', { '9-32': '9-32' }],
])
const worldItemTargetStage = {
  ranges: worldItemTargetRanges,
  normalizeExcerpt: (excerpt, ref) =>
    ref.path === worldItemMenuSession ? excerpt.replace('  #lastUseTargetIdx = 0\n', '') : excerpt,
  base: testingWorldItemTargetPublicationBase,
  action: 'q2-world-item-target-source-rebinding',
  date: '2026-11-19',
}
const worldItemTargetBindings = new Map([
  [
    'domains/runtime/menu/menu-session/evidence.json',
    { id: 'reforge-menu-session', paths: [...worldItemTargetRanges.keys()] },
  ],
])

export const isTestingWorldItemTargetSource = (path) => worldItemTargetRanges.has(path)

export function restoreTestingWorldItemTargetSourceBindings(path, bytes, inputs) {
  return restoreEncounterSourceBindings(
    path,
    bytes,
    inputs,
    worldItemTargetStage,
    worldItemTargetBindings,
  )
}

export const testingWorldAwarenessPublicationBase = '5e3c1f59de533fa43ceed1ac052c9bcd84f1849b'
const worldScenePresentation = 'packages/reforge/src/world-scene-presentation.ts'
const worldScenePresentationTest = 'packages/reforge/src/world-scene-presentation.test.ts'
const worldAwarenessStage = {
  ranges: new Map([
    [
      reforgeMain,
      {
        '414-421': '414-421',
        '455-462': '455-462',
        '1269-1367': '1269-1367',
        '441-452': '441-452',
        5769: '5784',
      },
    ],
    [worldScenePresentation, { '71-88': '72-89' }],
    [worldScenePresentationTest, { '82-105': '82-105' }],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingWorldAwarenessPublicationBase,
  action: 'q2-world-incense-source-rebinding',
  date: '2026-11-19',
}
const worldAwarenessBindings = new Map([
  [
    'domains/runtime/scene/active-scene/evidence.json',
    { id: 'runtime-active-scene', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/battle/battle-host/evidence.json',
    { id: 'runtime-battle-host', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/world/world-runtime/evidence.json',
    {
      id: 'runtime-world-owners',
      paths: [reforgeMain, worldScenePresentation, worldScenePresentationTest],
    },
  ],
  [publication.evidence, { id: publication.id, paths: [reforgeMain], artifactClaims: true }],
])

export const isTestingWorldAwarenessSource = (path) => worldAwarenessStage.ranges.has(path)

export function restoreTestingWorldAwarenessSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    worldAwarenessStage,
    worldAwarenessBindings,
  )
}

export const testingSceneItemExitPublicationBase = '25b4d5430f7daa410cef5e91447ac02e1dc00c3d'
const sceneItemExitStage = {
  ranges: new Map([
    [
      reforgeMain,
      {
        '414-421': '415-422',
        '455-462': '456-463',
        '1269-1367': '1286-1384',
        '441-452': '442-453',
        5784: '5841',
      },
    ],
  ]),
  normalizeExcerpt: (excerpt) => excerpt,
  base: testingSceneItemExitPublicationBase,
  action: 'q2-scene-item-exit-source-rebinding',
  date: '2026-11-19',
}
const sceneItemExitBindings = new Map(
  [...worldAwarenessBindings].map(([path, binding]) => [
    path,
    { ...binding, paths: [reforgeMain] },
  ]),
)

export const isTestingSceneItemExitSource = (path) => sceneItemExitStage.ranges.has(path)

export function restoreTestingSceneItemExitSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(path, bytes, inputs, sceneItemExitStage, sceneItemExitBindings)
}

export const testingStoryPresentationPublicationBase = '759886346d091f3dc2c0b67f72547c6861b81b6a'
const storyPresentationStage = {
  ranges: new Map([
    [
      reforgeMain,
      {
        '415-422': '416-423',
        '456-463': '458-465',
        '1286-1384': '1289-1387',
        '442-453': '443-455',
        5841: '5833',
      },
    ],
    [worldScenePresentation, { '72-89': '72-88' }],
    [worldScenePresentationTest, { '82-105': '82-105' }],
  ]),
  normalizeExcerpt(excerpt, ref) {
    if (ref.path === reforgeMain && ref.lines === '442-453')
      return excerpt.replace('  const screenShake = new ScreenShakePresentation()\n', '')
    if (ref.path === worldScenePresentation)
      return excerpt
        .replace(
          'visual overrides, wave phase/canvas',
          'visual overrides, shake, wave phase/canvas',
        )
        .replace(
          '  private readonly wave = ',
          '  private shakeFx: { untilMs: number; level: number } | null = null\n  private readonly wave = ',
        )
    return excerpt
  },
  base: testingStoryPresentationPublicationBase,
  action: 'q2-story-presentation-source-rebinding',
  date: '2026-11-19',
}

export const isTestingStoryPresentationSource = (path) => storyPresentationStage.ranges.has(path)

export function restoreTestingStoryPresentationSourceBindings(path, bytes, inputs) {
  return restoreBattleSourceBindings(
    path,
    bytes,
    inputs,
    storyPresentationStage,
    worldAwarenessBindings,
  )
}

function restoreBattleSourceBindings(path, bytes, inputs, stage, bindings) {
  if (path !== `docs/testing/${publication.canonical}`)
    return restoreEncounterSourceBindings(path, bytes, inputs, stage, bindings)
  const priorBytes = inputs.readBase(path)
  const before = parseTerminalJson(testingMetadata(priorBytes).json)
  const current = parseTerminalJson(testingMetadata(bytes).json)
  const previous = encounterReferences(
    before.sourceRefs,
    current.sourceRefs,
    bindings.get(publication.evidence).paths,
    {
      source: testingBridgeSources(inputs.readSource),
      fixed: testingBridgeSources(inputs.readFixed),
      predecessor: testingBridgeSources(inputs.readBase),
    },
    stage,
  )
  const history = encounterHistory(
    before.revision.history,
    current.revision.history,
    previous,
    inputs.readSource,
    stage,
  )
  assert.deepEqual(
    { ...current, sourceRefs: before.sourceRefs, revision: { ...current.revision, history } },
    before,
  )
  return priorBytes
}

export const isTestingBattleEvidencePath = (path) => path === evidencePath
export const isTestingBattleSessionEvidencePath = (path) => path === sessionEvidencePath

const closureArchive = 'docs/tasks/evidence/E2E-Q2-1-battle-closeout-20261116.tar.gz'
const closureClaims = [
  'battle-misc-auto-and-status',
  'authored-coop-support',
  'summon-spirit-offset',
  'battle-steal-inventory-and-feedback',
  'post-battle-growth-respawn',
]
const closureCallers = new Set([
  'scripts/e2e/battle-misc.mjs',
  'scripts/e2e/battle-misc-compare.mjs',
  'scripts/e2e/battle-coop-support.mjs',
  'scripts/e2e/battle-status.mjs',
  'scripts/e2e/battle-status-compare.mjs',
  'scripts/e2e/battle-world-bee-game.mjs',
  'scripts/e2e/battle-world-bee-reforge.mjs',
  'scripts/e2e/battle-world-bee-compare.mjs',
  'scripts/e2e/battle-world-save-compare.mjs',
])
const closureChangedSources = new Set([
  ...closureCallers,
  'scripts/e2e/battle-game-instrumentation.mjs',
  'scripts/e2e/battle-random-instrumentation.mjs',
  'scripts/e2e/battle-reforge-instrumentation.mjs',
  'scripts/e2e/battle-status-rules.mjs',
  'scripts/e2e/battle-status-scenarios.mjs',
  'scripts/e2e/battle-trace-observer.mjs',
  'scripts/e2e/battle-world-bee-reforge.config.mts',
  'scripts/e2e/battle-world-bee-scenario.mjs',
  'scripts/e2e/battle-world-save.mjs',
  'packages/reforge/src/main.ts',
  'packages/reforge/src/battle/battle-core.ts',
  'packages/reforge/src/battle/battle-command-selection.ts',
  'packages/reforge/src/menu/menu-box.ts',
])
const closureNewSources = new Set([
  ...closureCallers,
  'scripts/e2e/battle-status-rules.mjs',
  'scripts/e2e/battle-status-scenarios.mjs',
  'scripts/e2e/battle-world-bee-reforge.config.mts',
  'scripts/e2e/battle-world-bee-scenario.mjs',
  'scripts/e2e/battle-world-save-respawn.mjs',
  'scripts/e2e/battle-world-save.mjs',
  'packages/reforge/src/main.ts',
  'packages/reforge/src/battle/battle-anim.ts',
  'packages/reforge/src/battle/battle-core.ts',
  'packages/reforge/src/battle/battle-command-selection.ts',
  testingBattleSessionSourcePath,
  'packages/reforge/src/menu/menu-box.ts',
  'projects/pal/content/skills.json',
])

function closurePublicationFields(before, current, { readSource, readBase, readFixed }) {
  const sources = testingBridgeSources(readSource)
  const predecessor = testingBridgeSources(readBase)
  const fixed = testingBridgeSources(readFixed)
  const assertFixedReference = (reference) => {
    assertTestingBridgeReference(reference, sources)
    assert(
      sources.read(reference.path)?.equals(fixed.read(reference.path)),
      `battle closure source differs from the frozen candidate: ${reference.path}`,
    )
  }
  assert(
    current.sourceRefs.length >= before.sourceRefs.length,
    'battle closure removed a source reference',
  )
  const changed = []
  for (const [i, old] of before.sourceRefs.entries()) {
    const reference = current.sourceRefs[i]
    if (same(old, reference)) {
      if (closureChangedSources.has(old.path))
        assert(
          sources.read(old.path)?.equals(predecessor.read(old.path)),
          `battle closure retained stale source reference: ${old.path}`,
        )
      continue
    }
    assert(
      closureChangedSources.has(old.path),
      'battle closure changed an unadmitted source reference',
    )
    assert.deepEqual({ ...reference, sha256: old.sha256, lines: old.lines }, old)
    assertTestingBridgeReference(old, predecessor)
    assertFixedReference(reference)
    assert(
      !predecessor.read(old.path).equals(fixed.read(old.path)),
      'battle closure rebound unchanged source',
    )
    changed.push(old)
  }
  const publishedAnchors = new Set(
    before.sourceRefs.map(({ path, anchor }) => `${path}: ${anchor}`),
  )
  for (const reference of current.sourceRefs.slice(before.sourceRefs.length)) {
    assert(closureNewSources.has(reference.path), 'battle closure appended an unadmitted source')
    const anchor = `${reference.path}: ${reference.anchor}`
    assert(!publishedAnchors.has(anchor), 'battle closure duplicated an existing source anchor')
    publishedAnchors.add(anchor)
    assertFixedReference(reference)
  }
  const callers = current.publicCallers
  assert.deepEqual(
    callers.slice(0, before.publicCallers.length),
    before.publicCallers,
    'battle closure changed an existing public caller',
  )
  assert.equal(new Set(callers).size, callers.length, 'battle closure duplicated a public caller')
  for (const caller of callers.slice(before.publicCallers.length)) {
    const [command, path] = caller.split(' ')
    assert(
      command === 'node' && closureCallers.has(path),
      'battle closure appended an unadmitted public caller',
    )
  }
  return { sourceRefs: before.sourceRefs, publicCallers: before.publicCallers, changed }
}

function assertClosureMetadata(before, current, inputs) {
  const { changed, ...fields } = closurePublicationFields(before, current, inputs)
  const history = encounterHistory(
    before.revision.history,
    current.revision.history,
    changed,
    inputs.readSource,
    battleClosureBinding,
  )
  assert.deepEqual(
    { ...current, ...fields, revision: { ...current.revision, history } },
    before,
    'battle closure changed accepted publication metadata',
  )
  return current.revision.history.at(-1)
}

/** The newest finite source layer restores old caller bytes before the older
 * validators replay their original cutoffs. Only Q2's current entry can grow. */
export function restoreTestingBattleClosureSourceBindings(path, currentBytes, inputs) {
  const restored = restoreEncounterSourceBindings(
    path,
    currentBytes,
    inputs,
    battleClosureBinding,
    battleClosureBindings,
  )
  if (path !== catalogPath) return restored
  const before = parseTerminalJson(inputs.readBase(path))
  const current = parseTerminalJson(restored)
  const index = before.entries.findIndex(({ id }) => id === publication.id)
  const previous = before.entries[index]
  assert.equal(current.entries[index]?.id, publication.id)
  assertClosureMetadata(previous, current.entries[index], inputs)
  current.entries[index] = previous
  const oldReadings = before._governance.entryReadings
  const readings = current._governance.entryReadings
  const readerIndex = oldReadings.findIndex(({ id }) => id === publication.id)
  const previousReading = oldReadings[readerIndex]
  const reading = readings[readerIndex]
  assert.deepEqual({ ...reading, conclusion: previousReading.conclusion }, previousReading)
  assert(
    reading.conclusion === previousReading.conclusion ||
      (reading.conclusion.startsWith(`${previousReading.conclusion} `) &&
        reading.conclusion.slice(previousReading.conclusion.length).trim()),
    'battle closure rewrote the earlier catalog reading',
  )
  readings[readerIndex] = previousReading
  assert.deepEqual(current, before, 'battle closure changed an unrelated catalog entry')
  return inputs.readBase(path)
}

/** Validate only the appended machine evidence and the paired embedded report metadata.
 * Equality after removing the admitted suffix protects every existing execution and artifact. */
export function assertTestingBattleClosureAddition(path, bytes, inputs) {
  if (path !== evidencePath && path !== `docs/testing/${publication.canonical}`) return
  const priorBytes = inputs.readBase(path)
  if (path !== evidencePath) {
    const before = parseTerminalJson(testingMetadata(priorBytes).json)
    const current = parseTerminalJson(testingMetadata(bytes).json)
    const event = assertClosureMetadata(before, current, inputs)
    const paired = parseTerminalJson(inputs.readSource(evidencePath))
    assert.deepEqual(current.sourceRefs, paired.sourceRefs)
    assert.deepEqual(current.publicCallers, paired.publicCallers)
    assert.deepEqual(event, paired.history.at(-1))
    return
  }
  const before = parseTerminalJson(priorBytes)
  const current = parseTerminalJson(bytes)
  const { changed, ...fields } = closurePublicationFields(before, current, inputs)
  const history = encounterHistory(
    before.history,
    current.history,
    changed,
    inputs.readSource,
    battleClosureBinding,
  )
  const { battleClosureExecution, artifacts, claims, ...retained } = current
  assert.equal(battleClosureExecution?.producerRevision, inputs.revision)
  assert.deepEqual(
    artifacts.slice(0, -1),
    before.artifacts,
    'battle closure changed an earlier artifact',
  )
  const artifact = artifacts.at(-1)
  assert.equal(artifact?.path, closureArchive)
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/u)
  assert(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0)
  assert(typeof artifact.purpose === 'string' && artifact.purpose.trim())
  assert.deepEqual(
    claims.slice(0, before.claims.length),
    before.claims,
    'battle closure changed an earlier claim',
  )
  const appended = claims.slice(before.claims.length)
  assert.deepEqual(
    appended.map(({ id }) => id),
    closureClaims,
  )
  for (const claim of appended) {
    assert.equal(claim.result, 'runtime-backed')
    assert(
      claim.evidence.some((pointer) => pointer.startsWith(`${closureArchive}#`)),
      'battle closure claim must reference its captured evidence',
    )
  }
  assert.deepEqual(
    { ...retained, ...fields, history, artifacts: before.artifacts, claims: before.claims },
    before,
    'battle closure changed an accepted execution',
  )
  const catalog = parseTerminalJson(inputs.readSource(catalogPath))
  const paired = catalog.entries.find(({ id }) => id === publication.id)
  assert.deepEqual(current.sourceRefs, paired.sourceRefs)
  assert.deepEqual(current.publicCallers, paired.publicCallers)
  assert.deepEqual(current.history.at(-1), paired.revision.history.at(-1))
}

// Each published predecessor keeps its accepted source references and history.
function sessionRebindings(
  path,
  previousBytes,
  {
    readSource,
    fixed,
    mechanismFixed,
    portraitFixed,
    presentationFixed,
    cadenceFixed,
    casualtyFixed,
    casualtyDialogueFixed,
    playerActionsFixed,
    cooperativeRecoveryFixed,
    itemEffectsFixed,
    throwFeedbackFixed,
    enemyCastFixed,
    specialStatusFixed,
  },
) {
  assert(
    fixed &&
      (!portraitFixed || mechanismFixed) &&
      (!presentationFixed || portraitFixed) &&
      (!cadenceFixed || presentationFixed) &&
      (!casualtyFixed || cadenceFixed) &&
      (!casualtyDialogueFixed || casualtyFixed) &&
      (!playerActionsFixed || casualtyDialogueFixed) &&
      (!cooperativeRecoveryFixed || playerActionsFixed) &&
      (!itemEffectsFixed || cooperativeRecoveryFixed) &&
      (!throwFeedbackFixed || itemEffectsFixed) &&
      (!enemyCastFixed || throwFeedbackFixed) &&
      (!specialStatusFixed || enemyCastFixed),
    'battle session source bridge history gap',
  )
  const admitted = [
    { fixed, binding: sessionBinding },
    { fixed: mechanismFixed, binding: sessionMechanismBinding },
    { fixed: portraitFixed, binding: sessionPortraitBinding },
    { fixed: presentationFixed, binding: sessionPresentationBinding },
    { fixed: cadenceFixed, binding: sessionCadenceBinding },
    { fixed: casualtyFixed, binding: sessionCasualtyBinding },
    { fixed: casualtyDialogueFixed, binding: sessionCasualtyDialogueBinding },
    { fixed: playerActionsFixed, binding: sessionPlayerActionsBinding },
    { fixed: cooperativeRecoveryFixed, binding: sessionCooperativeRecoveryBinding },
    { fixed: itemEffectsFixed, binding: sessionItemEffectsBinding },
    { fixed: throwFeedbackFixed, binding: sessionThrowFeedbackBinding },
    { fixed: enemyCastFixed, binding: sessionEnemyCastBinding },
    { fixed: specialStatusFixed, binding: sessionSpecialStatusBinding },
  ].filter((stage) => stage.fixed)
  for (const stage of admitted)
    assert(
      stage.fixed.revision === stage.binding.revision &&
        typeof stage.fixed.readSource === 'function',
      'battle session source bridge requires the fixed accepted predecessor',
    )
  assert.equal(typeof readSource, 'function', 'battle session live source reader missing')
  assert(
    Buffer.isBuffer(previousBytes) && fixed.readSource(path)?.equals(previousBytes),
    'battle session predecessor differs from its fixed Git object',
  )
  const current = readSource(testingBattleSessionSourcePath)
  assert(Buffer.isBuffer(current), 'battle session live source missing')
  const currentStage = admitted.findIndex(({ fixed: snapshot }) => {
    const source = snapshot.readSource(testingBattleSessionSourcePath)
    assert(Buffer.isBuffer(source), 'battle session fixed source missing')
    return source.equals(current)
  })
  const rebindings = currentStage < 0 ? admitted : admitted.slice(0, currentStage)
  return rebindings.map((stage, index) => {
    const next = rebindings[index + 1]?.fixed
    const before = index === 0 ? previousBytes : stage.fixed.readSource(path)
    const after = next?.readSource(path)
    assert(
      Buffer.isBuffer(before) && (!next || Buffer.isBuffer(after)),
      'battle session publication missing',
    )
    return { ...stage, before, after, readSource: next?.readSource ?? readSource }
  })
}

function sourceExcerpt(bytes, range) {
  const [first, last = first] = range.split('-').map(Number)
  let offset = 0
  let start = 0
  for (let line = 1; line <= last; line++) {
    if (line === first) start = offset
    const newline = bytes.indexOf(10, offset)
    offset = newline < 0 ? bytes.length : newline + 1
  }
  return bytes.subarray(start, offset)
}

function assertSessionReferences(before, current, { readSource, fixed, binding }) {
  assert(
    Array.isArray(before) && Array.isArray(current) && current.length === before.length,
    'battle session reference membership changed',
  )
  const sources = testingBridgeSources(readSource)
  const fixedSources = testingBridgeSources(fixed.readSource)
  const changed = []
  for (const [index, old] of before.entries()) {
    const reference = current[index]
    if (old.path !== testingBattleSessionSourcePath) {
      assert.deepEqual(reference, old, 'reference outside battle session source bridge')
      continue
    }
    assert.deepEqual(
      { ...reference, sha256: old.sha256, lines: old.lines },
      old,
      'only battle session reference SHA and range may change',
    )
    assert.notEqual(reference.sha256, old.sha256, 'battle session reference must rebind its SHA')
    assertTestingBridgeReference(old, fixedSources)
    assertTestingBridgeReference(reference, sources)
    if (binding.requireExactExcerpt)
      assert(
        sourceExcerpt(sources.read(reference.path), reference.lines).equals(
          sourceExcerpt(fixedSources.read(old.path), old.lines),
        ),
        'battle session bridge changed the accepted caller excerpt',
      )
    changed.push(old)
  }
  assert.equal(changed.length, 3, 'battle session bridge requires its three caller references')
  return changed
}

function restoreSessionHistory(before, current, changed, readSource, binding) {
  const restored = restoreTestingBridgeHistory(
    before,
    current,
    changed,
    readSource,
    binding.revision,
    sessionReceipt,
  )
  const event = current.at(-1)
  assert.equal(event.action, binding.action, 'battle session bridge history action differs')
  assert.equal(event.date, binding.date, 'battle session bridge history date differs')
  return restored
}

function assertSessionEvidenceRebinding(previousBytes, currentBytes, bridge) {
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  assert.equal(before.id, sessionId, 'battle session evidence predecessor ID differs')
  assert.equal(current.id, sessionId, 'battle session evidence ID changed')
  const changed = assertSessionReferences(before.sourceRefs, current.sourceRefs, bridge)
  const history = restoreSessionHistory(
    before.history,
    current.history,
    changed,
    bridge.readSource,
    bridge.binding,
  )
  const claims = structuredClone(current.claims)
  const claimIndex = before.claims.findIndex(
    ({ id, result }) => id === `${sessionId}-source-contract` && result === 'source-backed',
  )
  assert(claimIndex >= 0, 'accepted battle session source claim missing')
  const oldPointers = before.claims[claimIndex].evidence
  for (const [index, old] of before.sourceRefs.entries()) {
    if (old.path !== testingBattleSessionSourcePath) continue
    const oldPointer = `${old.path}:${old.lines}`
    const pointerIndex = oldPointers.indexOf(oldPointer)
    assert(
      pointerIndex >= 0 && oldPointers.lastIndexOf(oldPointer) === pointerIndex,
      'accepted battle session source claim requires one exact pointer',
    )
    assert.equal(
      claims?.[claimIndex]?.evidence?.[pointerIndex],
      `${old.path}:${current.sourceRefs[index].lines}`,
      'battle session source claim pointer must follow its declared reference',
    )
    claims[claimIndex].evidence[pointerIndex] = oldPointer
  }
  assert.deepEqual(
    { ...current, sourceRefs: before.sourceRefs, claims, history },
    before,
    'battle session bridge changed publication, execution or unrelated evidence',
  )
}

/** Rebind the owner evidence to the current caller ranges while retaining the accepted audit. */
export function assertTestingBattleSessionSourceBridge(path, previousBytes, currentBytes, bridge) {
  assert(isTestingBattleSessionEvidencePath(path), 'unadmitted battle session evidence path')
  const rebindings = sessionRebindings(path, previousBytes, bridge)
  if (!rebindings.length)
    assert(
      previousBytes.equals(currentBytes),
      'battle session evidence changed without source drift',
    )
  for (const stage of rebindings)
    assertSessionEvidenceRebinding(stage.before, stage.after ?? currentBytes, stage)
}

function restoreSessionCatalogEntry(before, current, bridge) {
  assert.equal(before?.id, sessionId, 'battle session owner is absent from the accepted catalog')
  assert.equal(current?.id, sessionId, 'battle session owner catalog identity or order changed')
  const changed = assertSessionReferences(before.sourceRefs, current.sourceRefs, bridge)
  const history = restoreSessionHistory(
    before.revision.history,
    current.revision.history,
    changed,
    bridge.readSource,
    bridge.binding,
  )
  return {
    ...current,
    sourceRefs: before.sourceRefs,
    revision: { ...current.revision, history },
  }
}

/** The accepted predecessor is verified by the historical bridges before this append. */
export function assertTestingBattlePublication(previousBytes, currentBytes, additions, bridge) {
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  const oldEntries = before?.entries
  const oldReadings = before?._governance?.entryReadings
  const entries = current?.entries
  const readings = current?._governance?.entryReadings
  assert(
    [oldEntries, oldReadings, entries, readings].every(Array.isArray),
    'battle publication requires catalog entries and entry readings',
  )
  const rebindings = bridge ? sessionRebindings(catalogPath, previousBytes, bridge) : []
  if (rebindings.length) {
    const index = oldEntries.findIndex(({ id }) => id === sessionId)
    assert(index >= 0, 'battle session owner is absent from the accepted catalog')
    let entry = entries[index]
    for (const stage of rebindings.toReversed()) {
      const previous =
        stage.before === previousBytes
          ? oldEntries[index]
          : parseTerminalJson(stage.before).entries[index]
      entry = restoreSessionCatalogEntry(previous, entry, stage)
      assert.deepEqual(entry, previous, 'battle publication changed existing catalog facts')
    }
    entries[index] = entry
  }
  assert.deepEqual(
    {
      ...current,
      entries: entries.slice(0, oldEntries.length),
      _governance: {
        ...current._governance,
        entryReadings: readings.slice(0, oldReadings.length),
      },
    },
    before,
    'battle publication changed existing catalog facts',
  )
  assert(
    !oldEntries.some((entry) => entry?.id === publication.id),
    'battle foundation was already published',
  )
  assert.deepEqual(
    entries.slice(oldEntries.length).map((entry) => {
      const { id, kind, canonical, index, evidence } = entry ?? {}
      return { id, kind, canonical, index, evidence }
    }),
    [publication],
    'only the admitted battle foundation entry may be appended',
  )
  const newReadings = readings.slice(oldReadings.length)
  assert.deepEqual(
    newReadings.map((reading) => reading?.id),
    [publication.id],
    'battle publication requires the corresponding appended reading',
  )
  assert(
    typeof newReadings[0]?.conclusion === 'string' && newReadings[0].conclusion.trim(),
    'battle publication requires a concrete reading conclusion',
  )
  for (const [path, templateId] of [
    [publication.canonical, 'test-domain-report-v1'],
    [publication.index, 'governance-index-v1'],
    [publication.evidence, 'test-machine-evidence-v1'],
  ]) {
    assert.equal(
      additions.get(`docs/testing/${path}`)?.templateId,
      templateId,
      `battle publication requires an admitted pair: ${path}`,
    )
  }
}

// This is the bounded identity/native-execution admission, not a replacement for
// check-testing's paired metadata, source references and actual artifact hashes.
export function assertTestingBattleEvidence(path, bytes) {
  assert(isTestingBattleEvidencePath(path), 'unadmitted testing battle evidence path')
  const evidence = parseTerminalJson(bytes)
  assert.equal(evidence?.id, publication.id, 'testing battle evidence identity differs')
  assert(
    evidence.schemaVersion === 2 &&
      evidence.kind === 'runtime-execution' &&
      evidence.runtimeExecution?.performed === true &&
      evidence._governance?.variant === 'execution' &&
      Array.isArray(evidence.claims) &&
      evidence.claims.some((claim) => claim?.result === 'runtime-backed'),
    'testing battle evidence must declare its actual native execution',
  )
}
