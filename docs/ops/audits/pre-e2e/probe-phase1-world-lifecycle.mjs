// Baseline 84434b8a. Read-only source/data; Save uses its real memory backend.
// node --import tsx docs/ops/audits/pre-e2e/probe-phase1-world-lifecycle.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.ts'
import { restoreDialogHistory } from '../../../../packages/game/src/core/dialog-history.ts'
import { updateAllEquipments } from '../../../../packages/game/src/core/equip-effect.ts'
import { setSceneLoader, tickEventSystem } from '../../../../packages/game/src/core/event-system.ts'
import {
  createInitialGameState,
  createInitialPlayerStatus,
  getOverworldSpriteNum,
  loadDefaultGame,
  normalizePlayerRolesRuntime,
} from '../../../../packages/game/src/core/game-state.ts'
import { tickByMode } from '../../../../packages/game/src/core/mode.ts'
import { Save } from '../../../../packages/game/src/core/save/api.ts'
import { setSceneContext, tickSceneInput } from '../../../../packages/game/src/core/scene-system.ts'
import { parseSpriteChunk } from '../../../../packages/shared/src/rle.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined', 'Refuse a real/preexisting IndexedDB')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Audit forbids network')
}
const playerRoles = JSON.parse(
  readFileSync(
    new URL('../../../../data/extracted/data/player-roles.json', import.meta.url),
    'utf8',
  ),
)
const palette = {
  colors: [
    [90, 80, 70],
    [1, 2, 3],
  ],
  cycles: [],
}
const snap = (pressed = [], held = []) => ({
  held: new Set(held),
  pressed: new Set(pressed),
  frameNum: 0,
})
const ctx = {
  tilemap: {
    width: 64,
    height: 128,
    tileset: 'probe',
    cells: Array.from({ length: 128 }, () =>
      Array.from({ length: 64 }, () => ({ lower: 0, upper: 0 })),
    ),
  },
  eventCommands: [],
  labelMap: {},
}
const bus = createCommandBus()
function newGs(scene) {
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'right' })
  loadDefaultGame(gs, playerRoles)
  gs.wNumScene = scene
  gs.palette = palette
  return gs
}
function runCommands(gs, commands) {
  gs.mode = 'event'
  gs.eventCursor = { commands, labelMap: {}, ip: 0 }
  tickEventSystem(gs, snap(), bus)
}
const source = readFileSync(
  new URL('../../../../packages/game/src/shell/bootstrap.ts', import.meta.url),
  'utf8',
)
const ast = ts.createSourceFile('bootstrap.ts', source, ts.ScriptTarget.Latest, true)
const declarations = new Map()
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node)
  ts.forEachChild(node, visit)
}
visit(ast)
function originalFunction(name, scope) {
  const node = declarations.get(name)
  assert(node, `Missing original function ${name}`)
  const raw = node.getText(ast).replace(/^export\s+/, '')
  const js = ts.transpileModule(`(${raw})`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText
  return vm.runInNewContext(js, scope, { filename: `bootstrap.ts:${name}` })
}
function originalRestore(gs, loadSceneCommon) {
  const scope = {
    gs,
    Save,
    playerRoles,
    items: [],
    restoreDialogHistory,
    normalizePlayerRolesRuntime,
    createInitialPlayerStatus,
    updateAllEquipments,
    palette,
    console,
    Uint8Array,
    structuredClone,
    syncShellAudio() {},
    audio: {},
    fb: { clear() {} },
    flushToCanvas() {},
    canvasCtx: {},
    loadSceneCommon,
  }
  scope.cloneScreenPalette = originalFunction('cloneScreenPalette', {})
  scope.makeBlackScreenPalette = originalFunction('makeBlackScreenPalette', {})
  return originalFunction('loadGameFromSlot', scope)
}
try {
  await Save._clearAllForTest()
  const gs1 = newGs(5)
  await Save.saveSlot(1, newGs(6))
  let rejectOld
  setSceneLoader(
    () =>
      new Promise((_, reject) => {
        rejectOld = reject
      }),
  )
  runCommands(gs1, [{ op: 'loadScene', sceneId: 15 }, { op: 'end' }])
  // Same-reference restore boundary; this case is not a complete bootstrap run.
  Object.assign(gs1, await Save.loadSlot(1))
  gs1.sceneLoading = false
  runCommands(gs1, [{ op: 'showDialog', messageIndex: 1, text: '新场景对话' }, { op: 'end' }])
  const before = {
    scene: gs1.wNumScene,
    mode: gs1.mode,
    waiting: gs1.eventCursor?.waiting,
    hasDialog: !!gs1.dialogBox,
  }
  rejectOld(new Error('audit: old scene request failed after restore'))
  await new Promise((resolve) => setImmediate(resolve))
  const after = {
    scene: gs1.wNumScene,
    mode: gs1.mode,
    cursorCleared: !gs1.eventCursor,
    hasDialog: !!gs1.dialogBox,
  }
  setSceneContext(ctx)
  const box = gs1.dialogBox
  tickByMode(gs1, snap(['Confirm']), bus)
  assert.equal(gs1.eventCursor, undefined)
  assert.equal(gs1.dialogBox, box)
  console.log(JSON.stringify({ id: 'B-01', before, after, confirmCannotAdvanceDialog: true }))
  setSceneLoader(null)

  await Save._clearAllForTest()
  const gs2 = newGs(5)
  await Save.saveSlot(1, gs2)
  const clean = await Save.loadSlot(1)
  runCommands(gs2, [{ op: 'raw', opcode: 0x65, operands: [0, 232, 0] }, { op: 'end' }])
  await originalRestore(gs2, async () => {
    gs2.sceneLoading = false
  })(1)
  assert.equal(Object.hasOwn(clean, 'partyLeaderSpriteId'), false)
  assert.notEqual(clean.PlayerRolesRuntime.rgwSpriteNum[0], 232)
  assert.equal(getOverworldSpriteNum(gs2, 0, playerRoles), 232)
  const invisibleFrames = parseSpriteChunk(
    gunzipSync(
      readFileSync(new URL('../../../../data/extracted/data/sprite/232.rle', import.meta.url)),
    ),
  )
  assert(
    invisibleFrames.length > 0 &&
      invisibleFrames.every(
        (frame) =>
          frame.width === 1 && frame.height === 1 && frame.opaque.every((value) => value === 0),
      ),
  )
  console.log(
    JSON.stringify({
      id: 'B-02',
      savedSprite: clean.PlayerRolesRuntime.rgwSpriteNum[0],
      saveHasAlias: false,
      restoredRuntimeSprite: gs2.PlayerRolesRuntime.rgwSpriteNum[0],
      restoredAlias: gs2.partyLeaderSpriteId,
      renderedSprite: getOverworldSpriteNum(gs2, 0, playerRoles),
      transparentFrameCount: invisibleFrames.length,
    }),
  )

  await Save._clearAllForTest()
  const saved = newGs(15)
  saved.party.x = 320
  saved.party.y = 224
  await Save.saveSlot(1, saved)
  const gs3 = newGs(5)
  let reportedError
  try {
    await originalRestore(gs3, async () => {
      throw new Error('target scene assets unavailable')
    })(1)
  } catch (error) {
    reportedError = error.message
  }
  const beforeX = gs3.party.x
  tickSceneInput(gs3, snap([], ['Right']), bus, ctx)
  assert.equal(gs3.sceneLoading, true)
  assert.equal(gs3.party.x, beforeX)
  assert(gs3.palette.colors.every((color) => color.every((value) => value === 0)))
  console.log(
    JSON.stringify({
      id: 'B-03',
      reportedError,
      scene: gs3.wNumScene,
      sceneLoading: gs3.sceneLoading,
      mode: gs3.mode,
      palette: gs3.palette.colors,
      inputStayedFrozen: true,
    }),
  )
} finally {
  setSceneLoader(null)
  await Save._clearAllForTest()
  globalThis.fetch = oldFetch
}
