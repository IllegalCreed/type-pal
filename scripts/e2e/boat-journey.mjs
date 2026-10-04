import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assertBoatMotion, assertBoatReport, readBoatContract } from './boat-contract.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installErrandObserver, readErrandReforge } from './errand-observer.mjs'
import { committedInnMoves, navigateInnRoute } from './inn-navigation.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'

const sceneMaps = {
  s001: 'map-012',
  s002: 'map-012',
  s003: 'map-010',
  s004: 'map-001',
  s005: 'map-002',
}

export async function runBoatJourney() {
  const args = process.argv.slice(2)
  const mode = args.includes('--headed') ? '--headed' : '--headless'
  const fromIndex = args.indexOf('--from')
  assert(fromIndex >= 0 && args[fromIndex + 1], '006 requires --from 005 saves report')
  const predecessorPath = resolve(args[fromIndex + 1])
  const predecessor = JSON.parse(await readFile(predecessorPath, 'utf8'))
  assert.equal(predecessor.fragment, '005')
  assert.equal(predecessor.engine, 'reforge')
  assert.equal(predecessor.case, 'saves')
  assert.equal(predecessor.status, 'passed')
  const checkpoint = resolve(predecessorPath, '..', predecessor.checkpoint.path)
  const checkpointBytes = await readFile(checkpoint)
  assert.equal(sha256(checkpointBytes), predecessor.checkpoint.sha256)
  const contract = await readBoatContract()

  await runBrowserJourney({
    name: 'reforge-006',
    packageName: '@type-pal/reforge',
    environment: { VITE_PROJECT_ID: 'pal' },
    traceConfig: 'scripts/e2e/errand-reforge.config.mts',
    arguments: [mode],
    initScripts: [installErrandObserver],
    sources: [
      ...Object.keys(contract.hashes),
      'scripts/e2e/boat-contract.mjs',
      'scripts/e2e/boat-journey.mjs',
      'scripts/e2e/errand-observer.mjs',
      'scripts/e2e/inn-navigation.mjs',
      'scripts/e2e/kitchen-contract.mjs',
      'projects/pal/manifest.json',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      Object.assign(report, {
        fragment: '006',
        engine: 'reforge',
        case: 'story',
        kind: 'verify',
        predecessor: { report: predecessorPath, sha256: predecessor.checkpoint.sha256 },
        core: { status: 'running', rows: [], sourceHashes: contract.hashes },
        route: { status: 'running', inputs: [], legs: [] },
        checks: {},
      })
      let page
      let phase = 'bootstrap'
      let phaseOrder = -1
      const shown = new Set()
      const boatMotion = []
      const stateTrace = []
      const stateKeys = new Set()
      const snapshot = async () => {
        const state = await page.evaluate(readErrandReforge)
        const key = JSON.stringify(state)
        if (!stateKeys.has(key)) {
          stateKeys.add(key)
          stateTrace.push({ atMs: Date.now(), phase, state })
        }
        return state
      }
      const drive = () => page.evaluate((after) => window.__readErrandDrive(after), phaseOrder)
      const ready = (s) => kitchenReady(s, 'reforge')
      const inScene = (s, sid) => s.scene === sid
      const grid = (s) => kitchenGrid(s.position, 'reforge')
      const press = async (key, reason) => {
        report.actions.push({ phase, key, reason, atMs: Date.now() })
        await page.keyboard.down(key)
        await page.keyboard.up(key)
      }
      const begin = async (next) => {
        phase = next
        phaseOrder = (await drive()).order
      }
      const navigate = async (sid, destination, finished, sample, ignoreActors = false) => {
        const startOrder = (await drive()).order
        const readWithSample = async () => {
          const state = await snapshot()
          sample?.(state)
          return ignoreActors ? { ...state, routeActors: [] } : state
        }
        await navigateInnRoute({
          engine: 'reforge',
          keyboard: page.keyboard,
          map: contract.maps[sceneMaps[sid]],
          read: readWithSample,
          until,
          health,
          grid,
          inScene: (s) => inScene(s, sid),
          ready,
          destination,
          finished,
          boundaryCommitted: async () =>
            committedInnMoves(await page.evaluate(() => window.__readErrandEvidence()), startOrder)
              .length > 0,
          onInput: (input) => report.route.inputs.push({ phase, scene: sid, ...input }),
          onProgress: () => {},
        })
        report.route.legs.push({ phase, scene: sid, startOrder, endOrder: (await drive()).order })
      }
      const touch = async (sid, id, finished, sample) => {
        const actor = (await snapshot()).actors[id]
        if (!actor)
          console.log(
            '[reforge-006] missing touch actor',
            sid,
            id,
            JSON.stringify(await snapshot()),
          )
        assert(actor?.visible, `missing target ${sid}/${id}`)
        const [tc, tr] = actor.position
        const range = actor.activation?.range ?? 1
        await navigate(
          sid,
          (c, r) => Math.max(Math.abs(c - tc), Math.abs(r - tr)) <= range,
          finished,
          sample,
          id === 'e59' || id === 'e44',
        )
      }
      const interact = async (sid, id) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing interaction target ${sid}/${id}`)
        const [tc, tr] = actor.position
        await navigate(
          sid,
          (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1,
          (s) =>
            inScene(s, sid) &&
            ready(s) &&
            Math.abs(grid(s)[0] - tc) + Math.abs(grid(s)[1] - tr) === 1,
          undefined,
          id === 'e59',
        )
        const [c, r] = grid(await snapshot())
        const key = tc > c ? 'ArrowRight' : tc < c ? 'ArrowLeft' : tr > r ? 'ArrowDown' : 'ArrowUp'
        await page.keyboard.down(key)
        await until(
          snapshot,
          (s) =>
            s.facing ===
            { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[key],
          'face interaction target',
        )
        await page.keyboard.up(key)
        await press('Enter', `interact ${sid}/${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const dialogue = async (label, sid, expected) => {
        phase = label
        for (;;) {
          health()
          const s = await snapshot()
          if (!inScene(s, sid)) console.log(`[reforge-006] ${label} left ${sid}`, JSON.stringify(s))
          assert(inScene(s, sid), `${label} left ${sid}`)
          for (const id of s.runtime?.dialogue?.pageTextIds ?? []) shown.add(id)
          if (ready(s)) break
          if (s.runtime?.dialogue?.phase === 'waiting-input')
            await press('Enter', `${label} dialogue confirmation`)
          await new Promise((done) => setTimeout(done, 40))
        }
        for (const id of expected) assert(shown.has(`dlg.${id}`), `${label} missing dlg.${id}`)
        report.checks[label] = 'passed'
        report.core.rows = [...shown]
      }
      try {
        page = await newPage('006-real-005-saves')
        await page.route('**/__006-checkpoint.json', (route) =>
          route.fulfill({ contentType: 'application/json', body: checkpointBytes }),
        )
        await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__006-checkpoint.json')}`)
        await until(
          snapshot,
          (s) => s.boot?.checkpointLoad === 'loaded' && inScene(s, 's004') && ready(s),
          '005 saves predecessor loaded',
          60000,
        )

        await begin('return-to-inn')
        await touch('s004', 'e94', (s) => inScene(s, 's003') && ready(s))
        await touch('s003', 'e49', (s) => inScene(s, 's002') && ready(s))
        await touch('s002', 'e35', (s) => inScene(s, 's002') && !ready(s))
        await begin('doctor')
        await dialogue(
          'doctor',
          's002',
          [342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364],
        )
        assert.equal(
          await page.evaluate(
            () =>
              window.__rfWorld?.script?.behaviors?.entities?.s005?.e123?.trigger?.selection?.value,
          ),
          'legacy-002',
        )
        assert.equal(
          await page.evaluate(() => window.__rfWorld?.script?.entityState?.s005?.e123),
          3,
          '洪大夫结束后未恢复张四可见状态',
        )
        await begin('room')
        await interact('s002', 'e36')
        await dialogue(
          'room-initial',
          's002',
          [
            307, 308, 310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331,
            332, 334,
          ],
        )
        await interact('s002', 'e36')
        await dialogue('room-repeat-1', 's002', [336, 337])
        await interact('s002', 'e36')
        await dialogue('room-repeat-2', 's002', [339, 340])
        report.checks.room = 'passed'
        await touch('s002', 'e32', (s) => inScene(s, 's003'))
        await until(snapshot, (s) => inScene(s, 's003') && ready(s), 'miao leader auto settles')
        await touch('s003', 'e59', (s) => inScene(s, 's003') && !ready(s))
        await until(
          snapshot,
          (s) => inScene(s, 's003') && !!s.runtime?.dialogue,
          'miao leader counsel starts',
        )
        await dialogue(
          'miao-leader',
          's003',
          [
            366, 367, 368, 369, 371, 372, 374, 375, 376, 378, 380, 381, 382, 384, 386, 387, 388,
            389, 390, 391, 392, 394, 396, 397, 398, 399, 400, 401, 403, 405, 406, 408, 409, 410,
            412, 414, 415, 417, 418, 419,
          ],
        )
        await touch('s003', 'e44', (s) => inScene(s, 's004') && ready(s))
        await touch('s004', 'e95', (s) => inScene(s, 's005') && ready(s))
        await interact('s005', 'e123')
        await dialogue('boat', 's005', [533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546])
        await page.screenshot({ path: resolve(out, '006-before-ride.png') })
        let rideShot = false
        await touch(
          's005',
          'e116',
          (s) => inScene(s, 's014'),
          (s) => {
            if (s.scene !== 's005') return
            const sample = {
              position: s.position,
              facing: s.facing,
              e116: s.actors.e116?.position,
              e117: s.actors.e117?.position,
              e123: s.actors.e123?.position,
              e123Visible: s.actors.e123?.visible,
            }
            const previous = boatMotion.at(-1)
            if (JSON.stringify(previous) !== JSON.stringify(sample)) boatMotion.push(sample)
            if (!rideShot && boatMotion.length > 30) {
              rideShot = true
              void page.screenshot({ path: resolve(out, '006-during-ride.png') })
            }
          },
        )
        await writeFile(
          resolve(out, '006-boat-motion.json'),
          `${JSON.stringify(boatMotion, null, 2)}\n`,
        )
        await writeFile(
          resolve(out, '006-state-trace.json'),
          `${JSON.stringify(stateTrace, null, 2)}\n`,
        )
        report.stateTrace = { path: '006-state-trace.json', samples: stateTrace.length }
        const npcTrace = await page.evaluate(() =>
          window.__readErrandNpcTrace?.([
            'e35',
            'e36',
            'e59',
            'e60',
            'e61',
            'e116',
            'e117',
            'e123',
            'e203',
          ]),
        )
        assert(npcTrace, '006 committed NPC trace hook missing')
        assert.deepEqual(npcTrace.errors, [], '006 committed NPC trace lost an observation')
        await writeFile(
          resolve(out, '006-npc-trace.json'),
          `${JSON.stringify(npcTrace, null, 2)}\n`,
        )
        report.contextTraces = [{ path: '006-npc-trace.json' }]
        report.checks.island = 'passed'
        const islandState = await snapshot()
        report.endWorld = {
          position: {
            sceneId: 's014',
            pos: {
              col: islandState.position[0],
              row: islandState.position[1],
              height: islandState.position[2],
            },
          },
          arrivalDialogue: islandState.runtime?.dialogue?.pageTextIds ?? [],
        }
        await page.screenshot({ path: resolve(out, '006-island-arrival.png') })
        report.boatMotion = {
          ...assertBoatMotion(boatMotion),
          final: boatMotion.at(-1) ?? null,
          source: '006-boat-motion.json',
        }
        report.core.status = 'passed'
        report.route.status = 'passed'
        report.status = 'passed'
        report.sourceHashesStable = true
        await writeFile(
          resolve(out, '006-end.json'),
          `${JSON.stringify(report.endWorld, null, 2)}\n`,
        )
      } finally {
        report.lastPhase = phase
      }
      assertBoatReport(report)
    },
  })
}
