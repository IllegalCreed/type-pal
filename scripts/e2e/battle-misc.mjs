import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  battleFoundationInputSources,
  battleFoundationScenario,
  battleLaunchSpec,
} from './battle-foundation-scenarios.mjs'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, mode, ...extra] = process.argv.slice(2)
assert(['game', 'reforge'].includes(engine) && extra.length === 0, 'choose game or reforge')
assert([undefined, '--probe', '--capture'].includes(mode), 'unknown battle misc mode')
const isGame = engine === 'game'
const scenario = battleFoundationScenario('party-lanterns')
const spec = battleLaunchSpec(scenario)
const repeats = mode ? 1 : 2
const statusNames = ['李逍遥', '巫后']

function installStatusObserver() {
  const paints = []
  globalThis.__battleMiscStatusPaint = (value) => {
    const previous = paints.at(-1)
    if (
      previous?.id === value.id &&
      previous.hp === value.hp &&
      previous.mp === value.mp &&
      previous.portrait === value.portrait
    )
      return
    paints.push({ ...value, atMs: performance.now() })
  }
  globalThis.__battleMiscStatusPaints = () => structuredClone(paints)
}

function readState() {
  const state = globalThis.__battleHarness?.read()
  if (!state) return state
  const gs = globalThis.__tpgs
  return {
    ...state,
    commandCount: Array.isArray(state.commands) ? state.commands.length : state.commands,
    miscIndex: state.selection?.miscIndex ?? gs?.battleState?.miscMenuCursor,
    statusOpen:
      state.selection?.phase === 'status' ||
      (state.mode === 'menu' && gs?.menuStack.at(-1)?.kind === 'player-status'),
    paints: globalThis.__battleMiscStatusPaints(),
  }
}

const main = (state) =>
  state?.phase === 'selectAction' &&
  Boolean(state.selectingPlayerId) &&
  !state.busy &&
  !state.statusOpen &&
  (isGame
    ? state.mode === 'battle' && state.uiState === 'selectMove' && state.menuState === 'main'
    : state.selection?.phase === 'menu')
const misc = (state) =>
  state && (isGame ? state.menuState === 'misc' : state.selection?.phase === 'misc')
const target = (state) =>
  state && (isGame ? state.uiState === 'selectTargetEnemy' : state.selection?.phase === 'target')
const projectCommand = ({ turn, actorId, kind, targetId }) => ({ turn, actorId, kind, targetId })
const stableResult = ({ status, commands, performed, terminal }) => ({
  status,
  commands,
  performed,
  terminal,
})

await runBrowserJourney({
  name: `q2-battle-misc-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/battle-misc.config.mts',
  environment: { E2E: '1', Q2_COUNTER: 'none', Q2_MISC_ENGINE: engine },
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  sources: [
    ...(await battleFoundationInputSources(repoRoot)),
    'scripts/e2e/battle-game.config.mts',
    'scripts/e2e/battle-reforge.config.mts',
    'scripts/e2e/battle-reforge-adapter.mjs',
    'packages/game/src/present/menu/draw-player-status.ts',
    'packages/reforge/src/menu/menu-box.ts',
  ],
  initScripts: isGame ? [installGameBattleAdapter, installStatusObserver] : [installStatusObserver],
  async journey({ newPage, baseURL, out, report, until, capture }) {
    Object.assign(report, { engine, lane: 'Q2', fixture: spec, runs: [] })
    for (let index = 1; index <= repeats; index++) {
      const runId = `battle-misc-${index}`
      const result = { runId }
      report.runs.push(result)
      const page = await newPage(runId)
      await page.addInitScript(
        battleObserverScript({ engine, scenarioId: spec.id, runId, random: scenario.random }),
      )
      const read = () => page.evaluate(readState)
      const wait = (predicate, label, timeout = 7000) =>
        until(read, predicate, `${runId}: ${label}`, timeout)
      const paint = () =>
        page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        )
      const press = async (key, step) => {
        const input = await pressRecordedKey({
          keyboard: page.keyboard,
          action: { key, phase: 'battle', scope: 'story', context: runId, step },
          record: (action) => report.actions.push(action),
        })
        if (isGame) {
          const frame = await page.evaluate(() => globalThis.__tpgs.frameNum)
          const observed = await page.waitForFunction(
            (current) => globalThis.__tpgs.frameNum > current && globalThis.__tpgs.frameNum,
            frame,
            { timeout: 3000 },
          )
          try {
            input.gameLogic = { dispatchedFrame: frame, observedFrame: await observed.jsonValue() }
          } finally {
            await observed.dispose()
          }
        }
        await paint()
      }
      const openMisc = async () => {
        await press('ArrowDown', 'select misc icon')
        await press('Enter', 'open misc menu')
        return wait(misc, 'actual misc menu')
      }
      let trace
      try {
        await page.goto(`${baseURL}${isGame ? '/?skip-intro=1' : '/q2-battle.html'}`)
        await wait((state) => state?.ready, 'public entry ready', 60_000)
        if (isGame) {
          const reject = page.getByRole('button', { name: '拒绝', exact: true })
          if (await reject.isVisible()) await reject.click()
          if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
        }
        await page.evaluate((fixture) => globalThis.__battleHarness.launch(fixture), spec)
        result.initial = await wait(main, 'first actual command', 45_000)
        assert.equal(result.initial.selectingPlayerId, spec.party[0].id)
        assert.deepEqual(result.initial.snapshot, scenario.expected.start)
        if (capture.enabled) {
          report.fragment = 'q2-battle-misc'
          report.predecessor = { kind: 'battle-fixture', setup: spec }
          await capture.arm(page, {
            event: 'battle-fixture-ready',
            runId,
            state: result.initial.snapshot,
          })
        }

        await press('Enter', 'manual attack')
        await wait(target, 'manual enemy target')
        await press('ArrowRight', 'next enemy')
        await press('ArrowRight', 'choose third enemy')
        await press('Enter', 'commit manual attack')
        const before = await wait(
          (state) => main(state) && state.commandCount === 1,
          'second actor retains first command',
        )
        assert.equal(before.selectingPlayerId, spec.party[1].id)
        result.before = before

        assert.equal((await openMisc()).miscIndex, 0)
        await press('ArrowUp', 'wrap to status')
        await wait((state) => misc(state) && state.miscIndex === 4, 'status row')
        await press('Enter', 'open party status')
        const status = []
        for (let slot = 0; slot < statusNames.length; slot++) {
          if (slot > 0) await press('ArrowRight', 'next party status')
          const member = spec.party[slot]
          const id = isGame ? member.gameRole : member.actorId
          const current = await wait(
            (state) => state.statusOpen && state.paints.length === slot + 1,
            `actual status pixels for ${member.id}`,
          )
          const row = current.paints[slot]
          assert.deepEqual(
            { id: row.id, hp: row.hp, mp: row.mp, portrait: row.portrait },
            { id, hp: member.hp, mp: before.snapshot.players[slot].mp, portrait: true },
          )
          assert.equal(current.commandCount, 1)
          assert.equal(current.turn, before.turn)
          status.push({ id: member.id, hp: row.hp, mp: row.mp, portrait: row.portrait })
          await page.screenshot({ path: resolve(out, `${runId}-status-${slot + 1}.png`) })
          assert(
            await capture.readable(statusNames[slot], id, async () => {
              const state = await read()
              return state.statusOpen && state.paints.at(-1)?.id
            }),
            'status page changed before the review frame was captured',
          )
        }
        result.status = status
        await press('Escape', 'close party status')
        const after = await wait(main, 'resume the same command')
        result.after = after
        for (const key of ['selectingPlayerId', 'turn', 'commandCount', 'snapshot'])
          assert.deepEqual(after[key], before[key], `status altered ${key}`)

        const reopened = await openMisc()
        if (reopened.miscIndex !== 0) {
          assert.equal(reopened.miscIndex, 4)
          await press('ArrowDown', 'wrap status to auto')
        }
        await wait((state) => misc(state) && state.miscIndex === 0, 'auto row')
        await press('Enter', 'enable sustained auto attack')
        await wait((state) => state.commandCount === 3, 'remaining two actors submit automatically')
        for (;;) {
          const state = await wait(
            (state) => state.terminal || state.canConfirmSettlement,
            'settlement after all automatic attacks',
            25_000,
          )
          if (state.terminal) {
            result.terminal = state.terminal.result
            break
          }
          await press('Enter', 'confirm settlement')
        }
        assert.equal(result.terminal, 'victory')
        if (capture.enabled) {
          await paint()
          await capture.finish(page, { event: 'battle-result', runId, state: result.terminal })
        }
      } finally {
        const current = await read()
        trace = await page.evaluate(() => globalThis.__battleEvidence.read())
        result.last = current
        result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, {
          statusPaints: current?.paints,
          native: trace,
        })
        await page.close()
      }
      assert.deepEqual(trace.errors, [])
      result.commands = trace.commands.map(projectCommand)
      const expectedTarget = spec.enemies[2].id
      assert.deepEqual(
        result.commands,
        spec.party.map(({ id }) => ({
          turn: 1,
          actorId: id,
          kind: 'attack',
          targetId: expectedTarget,
        })),
      )
      result.performed = trace.actions.map(projectCommand)
      assert.deepEqual(
        result.performed.map(({ actorId }) => actorId),
        spec.party.map(({ id }) => id),
      )
      assert.deepEqual(
        result.performed.map(({ targetId }) => targetId),
        [spec.enemies[2].id, spec.enemies[0].id, spec.enemies[1].id],
      )
      if (index > 1) assert.deepEqual(stableResult(result), stableResult(report.runs[0]))
    }
  },
})
