import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { beeCases, beeWorldInput, honeycombText } from './battle-world-bee-scenario.mjs'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const judge = 'scripts/e2e/battle-world-bee-compare.mjs'
const position = ({ col, row }) => [col, row]
const gridFromGame = ([x, y]) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2]
const hpMp = ({ party }) => party.map(({ hp, mp }) => [hp, mp])
const expectedSteps = [94, 95, 96, 97].map((col) => [col, 45])
const startingHealth = [[470, 400]]
const recoveredHealth = [[475, 405]]

async function verifySources() {
  const paths = [
    'data/extracted/events/all.json',
    'data/extracted/data/enemy-objects.json',
    'projects/pal/content/enemies.json',
    'projects/pal/content/scenes/s006.json',
    'projects/pal/content/enemy-teams.json',
  ]
  const [script, objects, enemies, scene, teams] = await Promise.all(
    paths.map(async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'))),
  )
  const rows = script.segments.find(({ name }) => name === 'all').commands
  assert.deepEqual(
    [rows[41027].opcode, rows[41027].operands, rows[41028].itemId, rows[41030].text],
    [6, [12, 0, 0], 115, honeycombText],
  )
  assert.equal(objects.find(({ objectIndex }) => objectIndex === 403).scriptOnBattleEnd, 41027)
  const bee = enemies.find(({ id }) => id === 'enemy-403')
  const [branch] = bee.onDefeated
  assert.deepEqual(
    [branch.cond, branch.then[0].itemId, branch.then[1].cue.rows[0].text],
    [{ kind: 'chance', percent: 11 }, '115', 'dlg.13119'],
  )
  assert.deepEqual(teams.find(({ id }) => id === 'team-4').slots, ['enemy-403', 'enemy-403'])
  assert.equal(scene.battleFieldId, 12)
  const contact = scene.entities.find(({ id }) => id === 'e154')
  assert.deepEqual(
    [contact.hostile.enemyTeamId, contact.hostile.onVictory, contact.hostile.victoryTransition],
    ['team-4', { kind: 'hide', ticks: 800 }, 'fade'],
  )
  assert.deepEqual(
    [rows[41142].operands, rows[41143].to, rows[41127].opcode, rows[41128].opcode],
    [[4, 41075, 41073], 'L_41127', 0x52, 0x50],
  )
}

function makeFacts(engine, trace, row, check) {
  if (engine === 'game') return gameFacts(trace, row, check)
  return reforgeFacts(trace, row, check)
}

function inspectHandoff(engine, trace, check, hasLoot) {
  const game = engine === 'game'
  const { handoff, inputs, timeOrigin } = game ? trace.native : trace
  const rows = (stage) => handoff.filter((point) => point.stage === stage)
  const contact = game ? rows('contact')[0] : trace.events.find(({ kind }) => kind === 'contact')
  const [entry] = rows('battle-entry')
  const intro = rows('battle-intro')
  const revealed = intro.at(-1)
  const [command] = rows('battle-command-ready')
  const [source] = rows('battle-source')
  const fade = rows('fade-out')
  const black = rows('black').filter(({ layer }) => layer === (game ? 'frozen' : 'battle'))
  const map = rows('world-fade-in')
  const [ready] = rows('world-ready')
  const music = game ? trace.native.music : trace.events.filter(({ kind }) => kind === 'music')
  const milliseconds = (a, b) => Math.round(b?.atMs - a?.atMs)
  const between = (value, min, max) =>
    Number.isFinite(value) && value >= min && value <= max
      ? true
      : { observedMs: value, rangeMs: [min, max] }
  const [approach, attack, settle, open, close] = inputs.filter(({ kind }) => kind === 'down')
  const actualCommit = game
    ? trace.native.frames.find(({ battle }) => battle?.pending.length)
    : trace.events.find(({ kind }) => kind === 'command')
  const before = (a, b) => a && b && a.atMs <= b.atMs
  const musicTrack = (row) => (game ? row.track : Number(row.asset?.split('.').at(-1)))
  const audio = (stage, track) =>
    music.find((row) => row.stage === stage && musicTrack(row) === track)
  const battleMusic = audio('play', 37)
  const victoryMusic = audio('play', 3)
  const victoryStop = audio('stop', 3)
  const ambient = game
    ? trace.native.ambient
    : trace.events.filter(({ kind }) => kind === 'ambient')
  const brightMap = game ? ready : map.find(({ alpha }) => alpha === 0)
  const resumedAmbient = ambient?.find((sound) => before(brightMap, sound))

  check(
    '开场由实际接敌后保留地图并按顺序换入六个像素带',
    [
      entry?.completedRounds,
      intro.map(({ completedRounds }) => completedRounds),
      !!before(contact, entry),
      !!before(entry, intro[0]),
      !!before(revealed, command),
    ],
    [0, [1, 2, 3, 4, 5, 6], true, true, true],
  )
  if (game) {
    check(
      'Game 入场初帧仍是实际接敌地图',
      entry?.pixels.rgbaHash,
      rows('contact-world')[0]?.pixels.rgbaHash,
    )
  } else {
    const [complete] = rows('battle-entry-complete')
    check(
      'Reforge 开放选招前完成实际第六带画面',
      [complete?.completedRounds, complete?.pixels.hash, !!before(complete, command)],
      [6, revealed?.pixels.hash, true],
    )
  }
  check(
    '六次换屏实际像素逐次变化',
    new Set([entry, ...intro].map((frame) => frame?.pixels.hash ?? frame?.pixels.rgbaHash)).size,
    7,
  )
  check(
    '每次像素换屏间隔符合原盘 60 毫秒节拍与 Game 40 毫秒采样',
    intro.slice(1).map((frame, index) => between(milliseconds(intro[index], frame), 24, 110)),
    [true, true, true, true, true],
  )
  check(
    '选招按键实到浏览器且发生于菜单绘制后',
    [
      Number.isFinite(timeOrigin) && timeOrigin > 0,
      inputs.map(({ kind, code }) => [kind, code]),
      !!before(approach, contact),
      !!before(command, attack),
      !!before(attack, actualCommit),
    ],
    [
      true,
      [
        'ArrowRight',
        game ? 'Space' : 'Enter',
        game ? 'Space' : 'Enter',
        'Escape',
        'Escape',
      ].flatMap((code) => [
        ['down', code],
        ['up', code],
      ]),
      true,
      true,
      true,
    ],
  )
  check(
    '战斗乐在第六带后启动，胜利乐播放并在淡黑开始时停止',
    [
      !!before(revealed, battleMusic),
      !!before(battleMusic, command),
      battleMusic?.audioContextState,
      !!before(battleMusic, victoryMusic),
      victoryMusic?.audioContextState,
      !!before(victoryMusic, victoryStop),
      !!before(victoryStop, fade[0]),
    ],
    [true, true, 'running', true, 'running', true, true],
  )

  const expectedText = hasLoot ? honeycombText : null
  check(
    '末张战场画面的掉落文字与实际掉落一致',
    [
      rows('battle-source').length,
      game ? (source?.dialog?.text ?? null) : source?.text,
      !!before(settle, source),
    ],
    [1, expectedText, true],
  )
  const ramp = [...fade, ...black]
  check(
    '战场实画逐步变暗至不透明全黑',
    [
      !!before(source, fade[0]),
      fade.length > 8,
      black.length > 0,
      black.every(
        ({ pixels }) => pixels.nonBlack === 0 && pixels.opaque === pixels.width * pixels.height,
      ),
      fade[0]?.pixels.rgbMean < source?.pixels.rgbMean,
      ramp.every(
        (point, index) =>
          index === 0 || point.pixels.rgbMean <= ramp[index - 1].pixels.rgbMean + 0.2,
      ),
    ],
    [true, true, true, true, true, true],
  )
  if (game)
    check(
      'Game 淡出索引实际来自最后战场画面',
      ramp.every(
        ({ frozenFromDraw, pixels }) =>
          frozenFromDraw === source?.draw && pixels.sameIndicesAsBattleSource,
      ),
      true,
    )
  const fadeIn = map[0]
  check(
    '全黑后用原地图的黑帧开始淡入并在完全复原后才接收菜单键',
    [
      !!before(black.at(-1), fadeIn),
      fadeIn?.pixels.nonBlack,
      map.length > 8,
      !!before(map.at(-1), ready),
      ready?.pixels.rgbMean > 0,
      game ? ready?.grid : ready?.position && position(ready.position),
      !!before(ready, open),
      !!before(open, close),
    ],
    [true, 0, true, true, true, beeWorldInput.stop, true, true],
  )
  check(
    '十里坡背景虫鸣在接敌期间暂停，回场后从等待中继续播放',
    [
      ambient?.filter((sound) => before(contact, sound) && !before(brightMap, sound)).length,
      resumedAmbient?.track,
      resumedAmbient?.audioContextState,
      resumedAmbient?.seconds > 0,
      between(milliseconds(brightMap, resumedAmbient), 0, 500),
    ],
    [0, 66, 'running', true, true],
  )
  const configuredOut = game ? fade[0]?.paletteFade.startAtMs : fade[0]?.atMs
  const out = Math.round(black[0]?.atMs - configuredOut)
  const handoffMs = milliseconds(black.at(-1), fadeIn)
  const fadeInMs = milliseconds(fadeIn, ready)
  const entryMs = milliseconds(contact, command)
  check('接敌至首个选招实画维持原盘半秒换屏', between(entryMs, 470, 735), true)
  check(
    '实画淡出、黑帧交接、淡入各自满足时限',
    [between(out, 565, 650), between(handoffMs, 0, 65), between(fadeInMs, 575, 655)],
    [true, true, true],
  )
  return {
    entryMs,
    outMs: out,
    blackHandoffMs: handoffMs,
    inMs: fadeInMs,
    firstBandMs: milliseconds(contact, intro[0]),
    firstCommandMs: milliseconds(command, actualCommit),
    musicToMenuMs: milliseconds(battleMusic, command),
  }
}

function gameFacts(trace, row, check) {
  const { frames, rng, slots, commands } = trace.native
  const rngSamples = []
  const tape = createSeedableRng(trace.seed)
  for (const draw of rng) {
    const before = tape.getState()
    const sample = tape.next()
    const [low, high] = draw.args
    const value =
      draw.kind === 'rangeFloat'
        ? low + sample * (high - low)
        : low + Math.floor(sample * (high - low + 1))
    rngSamples.push(sample)
    check(
      'Game 原生抽样步及数值',
      [draw.before, draw.after, draw.value],
      [before, tape.getState(), value],
    )
  }
  check(
    'Game 抽样目的',
    rng.map(({ kind, args }) => [kind, args]),
    [
      ...Array.from({ length: 3 }, () => ['rangeFloat', [0.9, 1.1]]),
      ...Array.from({ length: 2 }, () => ['rangeInclusive', [0, 5]]),
      ['rangeInclusive', [2, 3]],
      ['rangeInclusive', [1, 100]],
      ['rangeInclusive', [1, 100]],
    ],
  )
  const encounter = frames.find(({ resume, battle }) => resume && battle?.enemies.length === 2)
  const start = trace.restores[0]
  check(
    'Game 实际读档定位及原始接敌入口',
    [
      trace.restores.length,
      start?.grid,
      start?.npc.label,
      start?.party[0].weapon,
      encounter?.scene,
      encounter?.field,
      encounter?.resume.owner,
      encounter?.resume.entry,
      encounter?.grid,
    ],
    [1, [93, 45], 'L_41142', 187, 7, 12, 154, 41143, [97, 45]],
  )
  check(
    'Game 实战实际属性',
    [
      row.role.attackStrength,
      row.role.defense,
      row.role.magicStrength,
      row.role.dexterity,
      row.role.fleeRate,
      row.role.spriteNumInBattle,
      row.role.attackAll,
      row.role.equipment[3],
    ],
    [266, 170, 220, 258, 266, 7, 1, 187],
  )
  const queued = frames.find(({ battle }) => battle?.pending.length)?.battle
  const committed = queued?.pending[0]
  check(
    'Game 原生一次群攻提交',
    [
      queued?.pending.length,
      queued?.auto,
      committed?.[0],
      committed?.[1].type,
      committed?.[1].target,
      committed?.[1].targetSide,
    ],
    [1, false, 0, 'attack', -1, 'enemy'],
  )
  const win = frames.find(({ battle }) => battle?.settlement?.screen?.kind === 'exp-cash')
  const settle = win?.battle.settlement.screen
  const dying = commands.flatMap((event) => event.commands)
  const notices = frames.filter(({ dialog }) => dialog?.text === honeycombText)
  const hidden = frames.find(({ npc }) => npc?.state === -1)
  check(
    'Game 槽执行在世界恢复前',
    slots.every((entry) => entry.order < hidden?.order),
    true,
  )
  check(
    'Game 实际隐藏和可操控的世界末帧',
    [
      hidden?.renderer,
      hidden?.grid,
      hidden?.npc.vanishTime,
      hidden?.event.owner,
      frames.find(({ menu, order }) => menu?.kind === 'in-game' && order > hidden?.order)?.menu
        .kind,
      row.end.renderer,
      row.end.grid,
      row.end.ready,
    ],
    ['world', [97, 45], 800, 154, 'in-game', 'world', [97, 45], true],
  )
  return {
    movement: trace.moves.map(({ to }) => gridFromGame(to)),
    rngSamples,
    rolls: rng.slice(6).map(({ value }) => value),
    slotVisits: slots.map(({ stage, slot, loot, hp, mp, draws }) => [
      stage,
      slot,
      loot,
      [[hp, mp]],
      draws,
    ]),
    defeat: win?.battle.enemies.map(({ id, hp, defeated }) => [id, hp, defeated]),
    experienceAndCash: [settle?.expGained, settle?.cashGained],
    healthAtSettlement: win ? hpMp(win) : null,
    damage: dying
      .filter(({ op }) => op === 'showDamageNum')
      .map(({ value, color }) => [value, color]),
    notices: notices.map((frame) => [frame.dialog.text, frame.renderer, frame.loot, hpMp(frame)]),
    noticeTimes: notices.map(({ atMs }) => atMs),
    returned: hidden ? { health: hpMp(hidden), money: hidden.cash, loot: hidden.loot } : null,
  }
}

function reforgeFacts(trace, row, check) {
  const events = (kind) => trace.events.filter((event) => event.kind === kind)
  const [contact] = events('contact')
  check(
    'Reforge 原生明雷入口及战场',
    [
      events('contact').length,
      contact?.scene,
      contact?.entity,
      contact?.team,
      contact && position(contact.player),
      events('field').map(({ fieldId }) => fieldId),
    ],
    [1, 's006', 'e154', 'team-4', [97, 45], [12]],
  )
  const [prepared] = events('prepared')
  const actor = prepared.players[0]
  check(
    'Reforge 实战实际属性',
    [
      actor.attackStrength,
      actor.defense,
      actor.magicStrength,
      actor.baseDexterity,
      actor.fleeRate,
      prepared.appearance[0],
      actor.attackAll,
      actor.grantedStatuses,
    ],
    [266, 170, 220, 258, 266, 'player-fighter-7', true, ['dualAttack']],
  )
  check(
    'Reforge 实际读档定位、装备及体力',
    [
      row.initial.boot.checkpointLoad,
      position(row.initial.run.position),
      row.initial.party[0].weapon,
      hpMp(row.initial),
    ],
    ['loaded', [93, 45], '187', startingHealth],
  )
  check(
    'Reforge 原生一次群攻提交',
    events('command').map(({ playerIndex, turn, action }) => [
      playerIndex,
      turn,
      action.kind,
      action.targetEnemyIdx,
    ]),
    [[0, 1, 'attack', -1]],
  )
  const actions = events('action')
  const [action] = actions
  check(
    'Reforge 实际只有该次群攻行动',
    actions.map(({ action }) => [action.side, action.idx, action.kind]),
    [['player', 0, 'attack']],
  )
  const draws = events('draw')
  check(
    'Reforge 战斗及槽抽样顺序',
    draws.map(({ source, slot }) => [source, slot]),
    [...Array.from({ length: 6 }, () => ['battle', null]), ['drop', 0], ['drop', 1]],
  )
  const tape = createSeedableRng(trace.seed)
  check(
    'Reforge 原生单位抽样',
    draws.map(({ sample }) => sample),
    draws.map(() => tape.next()),
  )
  const chances = events('chance')
  check(
    'Reforge 真实掉落分支执行',
    chances.map(({ percent, sample, matched }) => [percent, sample, matched]),
    draws.slice(6).map(({ sample }) => [11, sample, sample * 100 < 11]),
  )
  const [win] = events('settlement')
  const [writeback] = events('writeback')
  const [hidden] = events('hidden')
  const notices = events('notice')
  const slots = events('slot')
  check(
    'Reforge 结算之后按敌槽执行，最后提示之后隐藏',
    [
      win?.screen.kind,
      writeback?.result,
      writeback?.slots,
      slots.every((entry) => entry.order > writeback?.order && entry.order < hidden?.order),
      notices.every((entry) => entry.order > writeback?.order && entry.order < hidden?.order),
      writeback?.party,
    ],
    ['exp-cash', 'victory', ['enemy-403', 'enemy-403'], true, true, startingHealth],
  )
  check(
    'Reforge 实际生命周期和可操控的世界末帧',
    [
      hidden?.entity,
      hidden?.scene,
      hidden?.state,
      hidden && position(hidden.position),
      row.returned.entity.hidden,
      row.control.run.menuActive,
      position(row.end.run.position),
      row.end.encounterBusy,
      row.end.run.battleActive,
      row.end.run.menuActive,
    ],
    [
      'e154',
      's006',
      { phase: 'despawned', remainingTicks: 800 },
      [97, 45],
      true,
      true,
      [97, 45],
      false,
      false,
      false,
    ],
  )
  check(
    'Reforge 每个实际飘字与群攻击中序列一致',
    events('number').map(({ value }) => value),
    action?.action.attackAllSweeps.flatMap(({ hits }) => hits.map(({ value }) => value)),
  )
  return {
    movement: events('move').map(({ to }) => position(to)),
    rngSamples: draws.map(({ sample }) => sample),
    rolls: chances.map(({ sample }) => 1 + Math.floor(sample * 100)),
    slotVisits: slots.map(({ stage, slot, loot, party, draws }) => [
      stage,
      slot,
      loot,
      party,
      draws,
    ]),
    defeat: action?.enemies
      .filter(Boolean)
      .map(({ id, hp }) => [Number(id.slice(6)), hp, hp === 0]),
    experienceAndCash: [win?.screen.exp, win?.screen.cash],
    healthAtSettlement: hpMp(row.victory),
    damage: events('number').map(({ value, tone }) => [value, tone ?? 'blue']),
    notices: notices.map(({ text, surface, loot, party }) => [text, surface, loot, party]),
    noticeTimes: notices.map(({ atMs }) => atMs),
    returned: hidden
      ? {
          health: hidden.party,
          money: hidden.money,
          loot: hidden.inventory.find(({ itemId }) => itemId === '115')?.count ?? 0,
        }
      : null,
  }
}

function judgeRun(engine, trace, row, spec, inputs) {
  assert.equal(trace.seed, spec.seed)
  assert.equal(trace.overflow, false)
  assert.deepEqual(trace.errors, [])
  const findings = []
  const check = (rule, actual, expected) => {
    if (!same(actual, expected)) findings.push({ engine, runId: row.label, rule, actual, expected })
  }
  const story = inputs.filter(({ scope }) => scope === 'story')
  const confirm = engine === 'game' ? 'Space' : 'Enter'
  check(
    '实际相同方向步进和一次群攻确认',
    story.map(({ key, phase, kind }) => [phase, key, kind]),
    [
      ['world-approach', 'ArrowRight', 'down'],
      ['world-approach', 'ArrowRight', 'up'],
      ['battle', confirm, 'press'],
      ['settlement', confirm, 'press'],
      ['world-control', 'Escape', 'press'],
      ['world-control', 'Escape', 'press'],
    ],
  )
  const { noticeTimes, ...facts } = makeFacts(engine, trace, row, check)
  check('同一地图真实四格接敌', facts.movement, expectedSteps)
  check('蜂巢低区间命中及11/12边界', facts.rolls, spec.rolls)
  check('实际击败两个同模板敌槽', facts.defeat, [
    [403, 0, true],
    [403, 0, true],
  ])
  check('各入账一次经验和金钱', facts.experienceAndCash, [4, 4])
  check('结算时尚未半恢复', facts.healthAtSettlement, startingHealth)
  const samples = Array.from({ length: 8 }, () => 0)
  const rng = createSeedableRng(spec.seed)
  check(
    '固定种子完整八抽',
    facts.rngSamples,
    samples.map(() => rng.next()),
  )
  // Attack 266 against (−7 + (1+6)×4)=21 defense, divided by two physical resistance.
  const base = Math.trunc(Math.trunc(266 * 2 - 21 * 1.6 + 0.5) / 2)
  const damage = facts.rngSamples.slice(3, 5).flatMap((sample) => {
    const raw = base * (Math.floor(sample * 6) === 0 ? 3 : 1)
    return [
      [raw, 'blue'],
      [Math.floor(raw / 2), 'blue'],
    ]
  })
  check('两挥实绘蓝字按源槽顺序和超杀规则', facts.damage, damage)
  let count = 0
  const slots = spec.grants.flatMap((grant, slot) => {
    const before = ['before', slot, count, startingHealth, 6 + slot]
    count += grant
    return [before, ['after', slot, count, startingHealth, 7 + slot]]
  })
  check('每槽恰执行一次并产生预期库存增量', facts.slotVisits, slots)
  check(
    '逐份战场提示保留到结算恢复前',
    facts.notices,
    Array.from({ length: count }, (_, index) => [
      honeycombText,
      'battle',
      index + 1,
      startingHealth,
    ]),
  )
  check('回世界恢复一半并保留实际奖励', facts.returned, {
    health: recoveredHealth,
    money: 4,
    loot: count,
  })
  if (noticeTimes.length === 2)
    check(
      '两条独立提示各有约一秒半停留',
      noticeTimes[1] - noticeTimes[0] >= 1280 && noticeTimes[1] - noticeTimes[0] <= 1750,
      true,
    )
  const handoff = inspectHandoff(engine, trace, check, count > 0)
  return { seed: spec.seed, repetition: row.repetition, facts, noticeTimes, handoff, findings }
}

async function readReport(path, engine) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.match(report.revision, /^[a-f0-9]{40}$/u)
  assert.equal(git('cat-file', '-t', report.revision).toString().trim(), 'commit')
  assert.deepEqual(
    [report.engine, report.status, report.fragment, report.profile, report.errors],
    [engine, 'passed', 'q2-world-bee', 'verify', []],
  )
  assert.deepEqual(report.input, beeWorldInput)
  const { definition } = report.dependencies
  assert.deepEqual(
    [definition.entry, definition.packageName, definition.traceConfig],
    [
      `scripts/e2e/battle-world-bee-${engine}.mjs`,
      engine,
      `scripts/e2e/battle-world-bee-${engine}.config.mts`,
    ],
  )
  assert.deepEqual(await recordingDependencies(repoRoot, definition), report.dependencies)
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((file) => Object.hasOwn(report.dependencies.hashes, file)),
    [],
    'recording dependency drift from candidate',
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const cases = beeCases.flatMap((spec) => [1, 2].map((repetition) => ({ spec, repetition })))
  const labels = cases.map(({ spec, repetition }) => `seed-${spec.seed}-run-${repetition}`)
  assert.deepEqual(report.contexts, [
    ...(engine === 'game' ? [{ label: 'canonical-scene-baseline', initialDatabases: [] }] : []),
    ...labels.map((label) => ({ label, initialDatabases: [] })),
  ])
  assert.deepEqual(
    report.cases.map(({ label }) => label),
    labels,
  )
  const save = await readEvidenceArtifact(dirname(absolute), report.save)
  assert.equal(save.binding.status, 'verified')
  let cursor = 0
  const runs = []
  for (const [index, row] of report.cases.entries()) {
    const { spec, repetition } = cases[index]
    assert.deepEqual(
      [row.seed, row.repetition, row.rolls, row.grants],
      [spec.seed, repetition, spec.rolls, spec.grants],
    )
    if (engine === 'game') assert.equal(row.slotReadback, save.sha256)
    const { start, end } = row.actionRange
    assert(start === cursor && end > start && end <= report.actions.length, 'unbound input range')
    const inputs = report.actions.slice(start, end)
    assert(
      inputs.every(({ context }) => context === row.label),
      'input context differs',
    )
    cursor = end
    const raw = await readEvidenceArtifact(dirname(absolute), row.raw)
    assert.equal(raw.binding.status, 'verified')
    runs.push({ ...judgeRun(engine, raw.value, row, spec, inputs), artifact: row.raw })
  }
  assert.equal(cursor, report.actions.length, 'unused input receipts')
  return { report: absolute, sha256: sha256(bytes), revision: report.revision, engine, runs }
}

export async function compareWorldBeeReports(gameReport, reforgeReport) {
  const revision = git('rev-parse', 'HEAD').toString().trim()
  const judgeSha256 = sha256(await readFile(resolve(repoRoot, judge)))
  assert.equal(
    judgeSha256,
    sha256(git('show', `${revision}:${judge}`)),
    'freeze world comparator first',
  )
  await verifySources()
  const [game, reforge] = await Promise.all([
    readReport(gameReport, 'game'),
    readReport(reforgeReport, 'reforge'),
  ])
  assert.equal(game.revision, reforge.revision, 'expected one frozen candidate for both recordings')
  const compare = (left, right) => {
    const differences = Object.keys(left.facts).filter(
      (key) => !same(left.facts[key], right.facts[key]),
    )
    const allowances = { entryMs: 120, outMs: 65, blackHandoffMs: 55, inMs: 65 }
    const timing = Object.fromEntries(
      Object.entries(allowances).map(([key, allowedMs]) => {
        const differenceMs = Math.abs(left.handoff[key] - right.handoff[key])
        if (!Number.isFinite(differenceMs) || differenceMs > allowedMs) differences.push(key)
        return [
          key,
          {
            gameOrFirstMs: left.handoff[key],
            reforgeOrSecondMs: right.handoff[key],
            differenceMs,
            allowedMs,
          },
        ]
      }),
    )
    return { seed: left.seed, left: left.repetition, right: right.repetition, differences, timing }
  }
  const paired = game.runs.map((run, index) => compare(run, reforge.runs[index]))
  const repeated = [game, reforge].flatMap(({ engine, runs }) =>
    runs
      .filter((_, index) => index % 2 === 0)
      .map((run, index) => ({ engine, ...compare(run, runs[index * 2 + 1]) })),
  )
  const findings = [...game.runs, ...reforge.runs].flatMap((run) => run.findings)
  return {
    schemaVersion: 1,
    status:
      findings.length || [...paired, ...repeated].some(({ differences }) => differences.length)
        ? 'rejected'
        : 'passed',
    producerRevision: game.revision,
    judgeRevision: revision,
    judgeSha256,
    engines: [game, reforge],
    paired,
    repeated,
    findings,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [game, reforge, output] = process.argv.slice(2)
  assert(
    game && reforge && output,
    'usage: node scripts/e2e/battle-world-bee-compare.mjs GAME_REPORT REFORGE_REPORT NEW_OUTPUT',
  )
  const result = await compareWorldBeeReports(game, reforge)
  await writeEvidenceArtifact(dirname(resolve(output)), basename(output), result)
  console.log(
    JSON.stringify({
      status: result.status,
      findings: result.findings,
      paired: result.paired,
      repeated: result.repeated,
    }),
  )
  if (result.status !== 'passed') process.exitCode = 1
}
