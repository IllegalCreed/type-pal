import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { encodeEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const args = new Set(process.argv.slice(2))
for (const arg of args) assert(['--capture', '--predecessor', '--summon'].includes(arg), arg)
const predecessor = args.has('--predecessor')
const summon = args.has('--summon')
assert(!predecessor || !args.has('--capture'), 'record the corrected authored skill')

const projectPath = 'projects/pal'
const actorsPath = `${projectPath}/content/actors.json`
const skillsPath = `${projectPath}/content/skills.json`
const skillId = summon ? '351' : 'q2-cooperative-heal'
const seed = 6
const party = [
  ['li-xiaoyao', 90, 4],
  ['zhao-linger', 130, 3],
  ['lin-yueru', 1, 5],
].map(([actorId, hp, mp]) => ({ id: actorId, actorId, hp, mp }))
const enemies = [0, 1].map((slot) => ({ id: `bee-${slot + 1}`, slot }))
const setup = {
  seed,
  party,
  enemies,
  reforge: {
    config: {
      party: {
        members: party.map(({ actorId, hp, mp }) => ({
          actorId,
          hp: { kind: 'value', value: hp },
          mp: { kind: 'value', value: mp },
          stats: {},
          equipment: {},
          skills: { kind: 'inherit' },
        })),
      },
      enemies: { kind: 'team', teamId: 'team-4' },
      bag: { items: [] },
      fieldId: 12,
      music: { kind: 'default' },
      money: 0,
      auto: false,
      boss: false,
    },
  },
}

async function authoredFiles() {
  const actors = JSON.parse(await readFile(resolve(repoRoot, actorsPath), 'utf8'))
  const leader = actors.find(({ id }) => id === party[0].actorId)
  assert(leader?.battler, 'missing fixture base actor')
  leader.battler.cooperativeMagicSkillId = skillId
  if (summon) return { [actorsPath]: actors }
  const skills = JSON.parse(await readFile(resolve(repoRoot, skillsPath), 'utf8'))
  const heal = skills.skills.find(({ id }) => id === '296')
  assert(heal, 'missing original recovery-skill assets')
  skills.skills.push({
    ...heal,
    id: skillId,
    name: '协力调息',
    desc: '回复单个队友 37 点体力',
    usableOutsideBattle: false,
    cost: { mp: 120 },
    effects: [{ kind: 'healHp', amount: 37 }],
  })
  return { [actorsPath]: actors, [skillsPath]: skills }
}

function verify(trace, selection) {
  assert(trace && !trace.overflow && trace.errors.length === 0, JSON.stringify(trace?.errors))
  const command = trace.commands.find(({ kind }) => kind === 'coop')
  const cast = trace.actions.find(({ kind }) => kind === 'coop')
  assert(command && cast, 'native cooperative command or core action missing')
  assert.equal(command.skillId, skillId)
  assert.equal(cast.skillId, skillId)
  assert.equal(cast.actorId, 'li-xiaoyao')
  assert.deepEqual(cast.native.lastAction.coopContributors, [0, 1])
  assert.deepEqual(
    cast.before.players.map(({ hp }) => hp),
    [90, 130, 1],
  )
  assert.deepEqual(
    cast.after.players.map(({ mp }) => mp),
    [4, 3, 5],
  )
  assert.deepEqual(cast.after.inventory, cast.before.inventory)
  assert.equal(cast.after.money, cast.before.money)
  assert.deepEqual(cast.native.growthAfter, cast.native.growthBefore)
  const frames = trace.presentations.filter(
    (event) =>
      event.kind === 'battle-frame' &&
      event.payload.turn === 1 &&
      event.payload.animation?.kind === 'coop',
  )
  const fire = frames.flatMap(({ payload }) =>
    (payload.magicOverlays ?? []).filter(({ spriteChunk }) => spriteChunk === (summon ? 13 : 27)),
  )
  assert(fire.length, 'missing actually painted skill FIRE frames')
  const settledHp = cast.after.players.map(({ hp }) => hp)
  if (summon) {
    assert.equal(selection.phase, 'menu')
    assert.equal(command.targetId, null)
    assert.equal(command.targetSide, 'enemy')
    assert.deepEqual(settledHp, [2, 42, 1])
    const hits = cast.native.lastAction.magicHits
    assert.deepEqual(
      hits.map(({ idx }) => idx),
      [0, 1],
    )
    assert(cast.after.enemies.filter(Boolean).every(({ hp }) => hp === 0))
    assert(
      trace.audioEvents.some(
        ({ kind, assetId }) => kind === 'sfx-start' && assetId === 'sound.pal.303',
      ),
      'missing real summon sound',
    )
    assert(
      frames.some(({ payload }) => payload.players.length === 0),
      'missing summon fade',
    )
    const spirit = frames.flatMap(({ payload }) => (payload.summon ? [payload.summon] : []))
    assert(spirit.length > 1 && spirit[0].frameIndex === 0, 'missing actual 武神 sprite draws')
    return {
      selection,
      settledHp,
      hits,
      summon: {
        first: spirit[0],
        distinctFrames: new Set(spirit.map((draw) => draw.frameIndex)).size,
      },
      firstFire: fire[0],
    }
  }
  assert.deepEqual(cast.after.enemies, cast.before.enemies)
  const recovery = trace.presentations.find(
    ({ kind, payload }) =>
      kind === 'battle-frame' &&
      payload.turn === 1 &&
      payload.numbers.some(
        ({ side, tone, value }) => side === 'player' && tone === 'yellow' && value === 37,
      ),
  )
  if (predecessor) {
    assert.equal(selection.targetSide, 'enemy')
    assert.equal(command.targetId, 'bee-2')
    assert.deepEqual(settledHp, [1, 10, 1])
    assert.equal(recovery, undefined)
  } else {
    assert.equal(selection.targetSide, 'ally')
    assert.equal(command.targetId, 'zhao-linger')
    assert.equal(cast.targetId, command.targetId)
    assert.equal(cast.native.lastAction.targetAllyIdx, 1)
    assert.deepEqual(cast.native.lastAction.hpAfterContribution, [1, 10, 1])
    assert.deepEqual(settledHp, [1, 47, 1])
    const firstFire = fire[0]
    assert.deepEqual([firstFire.frameIndex, firstFire.x, firstFire.y], [0, 224, 164])
    assert(fire.every(({ x, y }) => x === firstFire.x && y === firstFire.y))
    assert(recovery, 'missing target recovery number')
    assert(recovery.payload.numbers.some(({ slot, age }) => slot === 1 && age === 0))
    assert.deepEqual(
      recovery.payload.players.map(({ x, y }) => [x, y]),
      [
        [180, 180],
        [234, 170],
        [270, 146],
      ],
      'recovery must appear after party poses return',
    )
    assert.equal(recovery.payload.magicOverlays, undefined)
    assert(
      !frames.some(({ payload }) => payload.numbers.some(({ tone }) => tone === 'blue')),
      'HP contribution damage was rendered as a hit',
    )
    assert(
      trace.audioEvents.some(
        ({ kind, assetId }) => kind === 'sfx-start' && assetId === 'sound.pal.138',
      ),
      'missing started authored skill effect sound',
    )
    const otherActions = trace.actions.filter(
      ({ turn, actorId, actorSide }) => turn === 1 && !actorSide && actorId !== cast.actorId,
    )
    assert.deepEqual(
      otherActions.map(({ actorId, kind }) => [actorId, kind]),
      [
        ['zhao-linger', 'pass'],
        ['lin-yueru', 'pass'],
      ],
    )
  }
  return {
    selection,
    settledHp,
    targetId: cast.targetId,
    firstFire: fire[0],
    recovery: recovery?.payload.numbers[0],
  }
}

await runBrowserJourney({
  name: `q2-battle-coop-${summon ? 'summon' : 'support'}${predecessor ? '-predecessor' : ''}`,
  packageName: '@type-pal/reforge',
  traceConfig: 'scripts/e2e/battle-reforge.config.mts',
  environment: { E2E: '1', Q2_COUNTER: 'none' },
  arguments: ['--headless', ...(args.has('--capture') ? ['--capture'] : [])],
  viewport: { width: 960, height: 760 },
  sources: [
    actorsPath,
    skillsPath,
    `${projectPath}/manifest.json`,
    `${projectPath}/content/enemy-teams.json`,
    `${projectPath}/content/enemies.json`,
    `${projectPath}/content/battle-fields.json`,
    `${projectPath}/assets/index.json`,
    'scripts/e2e/battle-reforge-adapter.mjs',
  ],
  async journey({ newPage, baseURL, out, report, until, capture }) {
    if (predecessor) assert.equal(report.revision, '4b2692d65917034f3743a348ca161d2ffb447b97')
    report.fragment = skillId
    report.predecessor = { kind: 'battle-fixture', setup }
    report.authoredInputs = []
    report.authoredReads = []
    report.run = []
    const authored = await authoredFiles()
    for (const [path, value] of Object.entries(authored)) {
      report.authoredInputs.push({
        projectPath: path,
        ...(await writeEvidenceArtifact(out, `authored-${path.split('/').at(-1)}`, value)),
      })
    }
    for (const number of args.has('--capture') || predecessor ? [1] : [1, 2]) {
      const runId = `authored-coop-${number}`
      const page = await newPage(runId)
      const result = { runId }
      report.run.push(result)
      const read = () => page.evaluate(() => globalThis.__battleHarness?.read())
      const trace = () => page.evaluate(() => globalThis.__battleEvidence?.read())
      let collected
      const key = async (value) => {
        await pressRecordedKey({
          keyboard: page.keyboard,
          action: { key: value, context: runId, phase: 'battle' },
          record: (input) => report.actions.push(input),
        })
      }
      try {
        // Serve independent authored documents inside this fresh browser context.
        // The public project reader, asset bytes and BattleTrial stay on their normal paths.
        for (const [path, value] of Object.entries(authored)) {
          const { bytes } = encodeEvidenceArtifact(value)
          await page.route(`${baseURL}/${path}`, async (route) => {
            report.authoredReads.push({ runId, path })
            await route.fulfill({ contentType: 'application/json', body: bytes })
          })
        }
        await page.addInitScript(
          battleObserverScript({
            engine: 'reforge',
            scenarioId: skillId,
            runId,
            random: { algorithm: 'mulberry32', seed },
            observeMagicOverlays: true,
          }),
        )
        await page.goto(`${baseURL}/q2-battle.html`)
        await until(read, (state) => state?.ready, 'standalone project loader')
        await page.evaluate((fixture) => globalThis.__battleHarness.launch(fixture), setup)
        const menu = await until(
          read,
          (state) => state?.selectingPlayerId === party[0].id && state.selection?.phase === 'menu',
          'Li Xiaoyao’s action menu',
        )
        await capture.arm(page, { event: 'player-menu', state: menu.snapshot, runId })
        await key('ArrowRight')
        const selectedMenu = await until(
          read,
          (state) => state?.selection?.menuIndex === 2,
          'cooperative icon',
        )
        await key('Enter')
        result.selection = selectedMenu.selection
        if (!summon) {
          await until(read, (state) => state?.selection?.phase === 'target', 'native target menu')
          await key('ArrowRight')
          const selected = await until(
            read,
            (state) => state?.selection?.targetIndex === 1,
            'second native target',
          )
          result.selection = selected.selection
          await key('Enter')
        }
        if (summon) {
          await until(
            () =>
              page.evaluate(() =>
                globalThis.__battleEvidence
                  .read()
                  .presentations.some(({ payload }) => payload.settlement),
              ),
            Boolean,
            'rendered victory settlement after summon',
          )
        }
        const final = summon
          ? await read()
          : await until(
              read,
              (state) => state?.turn === 2 && state.selection?.phase === 'menu' && !state.busy,
              'next round’s command menu',
            )
        await capture.finish(page, {
          event: summon ? 'victory-settlement' : 'next-player-menu',
          state: final.snapshot,
          runId,
        })
      } finally {
        collected = await trace()
        if (collected)
          result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, collected)
        await page.close()
      }
      result.summary = verify(collected, result.selection)
      assert.equal(
        new Set(report.authoredReads.filter((read) => read.runId === runId).map(({ path }) => path))
          .size,
        Object.keys(authored).length,
      )
    }
  },
})
