import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import { stationarySourceWriter } from './stationary-automatic-cycle.mjs'

test('stationary incoming census follows real Game self and selected-object effects', async (t) => {
  const require = createRequire(new URL('../../packages/game/package.json', import.meta.url)),
    { createServer } = await import(require.resolve('vite')),
    cacheDir = await mkdtemp(join(tmpdir(), 'pal-stationary-writers-')),
    server = await createServer({
      configFile: false,
      cacheDir,
      root: fileURLToPath(new URL('../../', import.meta.url)),
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'custom',
    })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const { createInitialGameState, npcFromEventObject } = await server.ssrLoadModule(
      '/packages/game/src/core/game-state.ts',
    ),
    { tickAutoScripts, setGlobalEvents } = await server.ssrLoadModule(
      '/packages/game/src/core/event-system.ts',
    ),
    commands = original.segments[0].commands
  t.after(() => setGlobalEvents([]))
  const state = () => {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    gs.allEventObjects = objects.eventObjects.map((object) => npcFromEventObject(object))
    return gs
  }
  // Source 0x24 selects e88; it does not mutate its e87 caller or treat the
  // second operand (entry 840) as an object number.
  const selection = commands.findIndex(
      (c) => c.op === 'raw' && c.opcode === 36 && c.operands[0] === 89 && c.operands[1] === 840,
    ),
    gs = state(),
    owner = gs.allEventObjects[87],
    target = gs.allEventObjects[88]
  gs.npcs = [owner, target]
  owner.autoCursor = { ip: selection }
  setGlobalEvents(commands)
  tickAutoScripts(gs)
  assert.equal(target.autoLabel, 'L_840')
  assert.equal(owner.autoLabel, 'L_824')
  assert.equal(stationarySourceWriter({ command: commands[selection], actor: 87 }), target.id)

  // 0x6f reads pCurrent but writes pEvtObj. Exercise the actual interpreter,
  // with legal current objects and primary instruction operands.
  const sync = commands.findIndex(
      (c) => c.op === 'raw' && c.opcode === 111 && c.operands[0] > 0 && c.operands[0] < 65535,
    ),
    syncCommand = commands[sync],
    other = state(),
    self = other.allEventObjects[101],
    readTarget = other.allEventObjects[syncCommand.operands[0] - 1]
  readTarget.sState = syncCommand.operands[1]
  self.sState = readTarget.sState === 1 ? 2 : 1
  const initialSelfState = self.sState
  self.autoCursor = { ip: sync }
  other.npcs = [self]
  tickAutoScripts(other)
  assert.equal(self.sState, readTarget.sState)
  assert.notEqual(
    self.sState,
    initialSelfState,
    'the source handler must actually commit a state change',
  )
  assert.equal(stationarySourceWriter({ command: syncCommand, actor: self.id }), self.id)
  assert.notEqual(
    self.id,
    readTarget.id,
    'the read target must discriminate a wrong pCurrent writer model',
  )
  assert.throws(
    () =>
      stationarySourceWriter({
        command: { op: 'raw', opcode: 65534, operands: [117, 0, 0] },
        actor: 101,
      }),
    /unsupported/,
  )
})
