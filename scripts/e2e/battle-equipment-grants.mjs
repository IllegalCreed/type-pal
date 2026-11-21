import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { equipmentCatalogue, loadEquipmentInputs } from './battle-weapon-world-scenarios.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, selector = 'all', captureFlag] = process.argv.slice(2)
assert(engine === 'game' || engine === 'reforge')
assert(captureFlag === undefined || (captureFlag === '--capture' && selector !== 'all'))
assert(process.argv.length <= 5)
const game = engine === 'game'
const caster = 'zhao-linger'
const partner = 'li-xiaoyao'
const roles = [
  { id: caster, actorId: caster, gameRole: 1, hp: 200, speed: 900 },
  { id: partner, actorId: partner, gameRole: 0, hp: 200, speed: 250 },
]
const enemies = ['first', 'second', 'third'].map((id, slot) => ({
  id: `lantern-${id}`,
  slot,
  templateId: 'enemy-399',
}))
const seed = 1729
const skillsPath = 'projects/pal/content/skills.json'
const catalogue = equipmentCatalogue(await loadEquipmentInputs())
const { skills } = JSON.parse(await readFile(resolve(repoRoot, skillsPath), 'utf8'))
const cases = [...catalogue.values()].flatMap(({ id, slot, roles, authored, effects }) => {
  const grant = effects.find(([opcode, field]) => opcode === 0x1a && field === 65)
  if (!grant || (selector !== 'all' && selector !== id)) return []
  const skill = skills.find(({ id }) => id === String(grant[2]))
  assert(slot === 'accessory' && roles.includes(1))
  assert(authored.some(({ kind, skillId }) => kind === 'grantSkill' && skillId === skill?.id))
  assert(skill.target === 'oneEnemy' || skill.target === 'allEnemies')
  return [{ item: id, skill }]
})
assert.equal(cases.length, selector === 'all' ? 7 : 1)

function launchSpec(item) {
  const id = `equipped-spell-${item}`
  return {
    id,
    seed,
    party: roles,
    enemies,
    game: {
      fixture: {
        id,
        label: id,
        partyMembers: roles.map(({ gameRole }) => gameRole),
        playerOverrides: Object.fromEntries(
          roles.map(({ id, gameRole, hp, speed }) => [
            gameRole,
            {
              level: 3,
              hp,
              maxHP: hp,
              mp: 100,
              maxMP: 100,
              attackStrength: 250,
              defense: 100,
              magicStrength: 50,
              dexterity: speed,
              fleeRate: 30,
              magic: [],
              equipment: [0, 0, 0, 0, 0, id === caster ? Number(item) : 0],
            },
          ]),
        ),
        inventory: [],
        enemyTeamId: 3,
        battleFieldId: 7,
      },
    },
    reforge: {
      config: {
        party: {
          members: roles.map(({ id, hp, speed }) => ({
            actorId: id,
            stats: {
              level: 3,
              maxHP: hp,
              maxMP: 100,
              attack: 250,
              defense: 100,
              magicAttack: 50,
              speed,
              luck: 30,
            },
            hp: { kind: 'value', value: hp },
            mp: { kind: 'full' },
            skills: { kind: 'replace', ids: [] },
            equipment: id === caster ? { accessory: item } : {},
          })),
        },
        enemies: { kind: 'team', teamId: 'team-3' },
        bag: { items: [] },
        fieldId: 7,
        music: { kind: 'default' },
        money: 0,
        auto: false,
        boss: false,
      },
    },
  }
}

await runBrowserJourney({
  name: `q2-equipment-grants-${engine}-${selector}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
  environment: { E2E: '1', Q2_COUNTER: 'none' },
  arguments: ['--headless', ...(captureFlag ? ['--capture'] : [])],
  journeyTimeoutMs: 240_000,
  viewport: { width: 960, height: 720 },
  initScripts: game ? [installGameBattleAdapter] : [],
  sources: [
    skillsPath,
    'data/extracted/data/items.json',
    'data/extracted/data/player-roles.json',
    'data/extracted/data/enemy-teams.json',
    'data/extracted/data/magic.json',
    'data/extracted/events/all.json',
    'projects/pal/content/items.json',
    'projects/pal/content/actors.json',
    'projects/pal/content/enemy-teams.json',
    'projects/pal/content/battle-fields.json',
    'projects/pal/assets/index.json',
  ],
  async journey({ newPage, baseURL, out, report, until, capture, health }) {
    Object.assign(report, { engine, lane: 'Q2', cases: [] })
    for (const { item, skill } of cases) {
      const configured = launchSpec(item)
      const runId = configured.id
      const page = await newPage(runId)
      const run = { item, skill: skill.id, configured }
      report.cases.push(run)
      const read = () => page.evaluate(() => globalThis.__battleHarness?.read())
      try {
        await page.addInitScript(
          battleObserverScript({
            engine,
            scenarioId: runId,
            runId,
            observeMagicOverlays: true,
            random: { algorithm: 'mulberry32', seed },
          }),
        )
        await page.goto(baseURL + (game ? '/?skip-intro=1' : '/q2-battle.html'))
        await until(read, (view) => view?.ready, 'native battle entry', 60_000)
        if (game) {
          const reject = page.getByRole('button', { name: '拒绝', exact: true })
          if (await reject.isVisible()) await reject.click()
          if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
        }
        await page.evaluate((spec) => globalThis.__battleHarness.launch(spec), configured)
        run.opening = await until(read, (view) => view?.snapshot, 'equipped battle start', 60_000)
        assert.equal(String(run.opening.nativePlayers[0].equipment[5]), item)
        if (capture.enabled) {
          report.fragment = `q2-${runId}`
          report.predecessor = { kind: 'battle-fixture', setup: configured }
          await capture.arm(page, {
            event: 'battle-fixture-ready',
            runId,
            state: run.opening.snapshot,
          })
        }
        const started = Date.now()
        const next = game ? nextGameBattleKey : nextReforgeBattleKey
        const fromEquipment = game ? 'coop' : 'cast'
        const single = skill.target === 'oneEnemy'
        for (;;) {
          health()
          const view = await read()
          assert(!view.failure && !view.errors?.length, JSON.stringify(view.errors))
          if (view.terminal) {
            run.terminal = view.terminal
            break
          }
          assert(Date.now() - started < 60_000, 'the native equipped battle did not finish')
          const { turn, selectingPlayerId: actorId } = view
          assert(turn <= 3, 'the input ledger permits the equipped spell and cleanup attacks')
          const target = view.snapshot.enemies.find((enemy) => enemy?.alive)?.id
          const supplied = actorId === caster && turn === 1
          const command = supplied
            ? {
                turn,
                actorId,
                kind: fromEquipment,
                skillId: skill.id,
                targetSide: 'enemy',
                targetId: single ? target : null,
              }
            : { turn, actorId, kind: 'attack', targetId: target }
          const key = next(view, command)
          if (key) {
            await pressRecordedKey({
              keyboard: page.keyboard,
              action: { key, phase: 'battle', context: runId, turn, actorId },
              record: (input) => report.actions.push(input),
            })
          }
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
          )
        }
        const trace = await page.evaluate(() => globalThis.__battleEvidence.read())
        run.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, trace)
        assert(!trace.overflow && !trace.errors.length)
        assert.equal(run.terminal.result, 'victory')
        assert.equal(run.terminal.settlementCount, 1)
        const cast = trace.actions.find(
          ({ actorId, kind }) => actorId === caster && kind === fromEquipment,
        )
        assert(cast && cast.skillId === skill.id && cast.turn === 1, 'actual equipment spell')
        const expected = cast.before.players.map(({ hp, mp, id }) =>
          game ? [hp - skill.cost.mp, mp] : [hp, id === caster ? mp - skill.cost.mp : mp],
        )
        assert.deepEqual(
          cast.after.players.map(({ hp, mp }) => [hp, mp]),
          expected,
        )
        const affected = cast.before.enemies.filter(
          (enemy, i) => enemy?.hp > cast.after.enemies[i]?.hp,
        )
        assert.deepEqual(
          affected.map(({ id }) => id),
          enemies.slice(0, single ? 1 : 3).map(({ id }) => id),
        )
        const fire = trace.presentations.filter(
          ({ kind, payload }) =>
            kind === 'battle-frame' &&
            payload.magicOverlays?.some((fx) => fx.spriteChunk === skill.animation.effectSprite),
        )
        assert(fire.length, 'actual painted equipment spell effect')
        run.effect = {
          kind: cast.kind,
          slot: 0,
          skillId: cast.skillId,
          affected: affected.map(({ id }) => id),
          fireFrames: fire.length,
        }
        if (capture.enabled)
          await capture.finish(page, { event: 'battle-result', runId, state: run.terminal })
      } finally {
        if (!run.trace) {
          const trace = await page.evaluate(() => globalThis.__battleEvidence?.read())
          if (trace) run.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, trace)
        }
        await page.close()
      }
    }
  },
})
