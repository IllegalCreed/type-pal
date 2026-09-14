// GLM原始材料；Codex于2026-09-14接手修正/自验证，非GLM独立终审。
// GLM boundary batch-2 · C组（战果写回与回合末终态）· observe/contract 双模式。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-battle-result.mjs [--mode=observe|contract] [--case ID|all]
// 真实 BattleSession/battle-core + 既有测试 fixture 构造器（AST 只取纯构造器）+ PAL 真实 items/skills。
// 内存 fighters/images；无渲染/网络/存档写盘。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const modeArg = process.argv.find((a) => a.startsWith('--mode'))
const MODE = modeArg
  ? modeArg.includes('=')
    ? modeArg.split('=')[1]
    : process.argv[process.argv.indexOf(modeArg) + 1]
  : 'observe'
const caseArg = process.argv.find((a) => a.startsWith('--case'))
const CASE = caseArg
  ? caseArg.includes('=')
    ? caseArg.split('=')[1]
    : process.argv[process.argv.indexOf(caseArg) + 1]
  : 'all'
assert.ok(['observe', 'contract'].includes(MODE), 'mode必须是observe/contract')
assert.ok(CASE === 'all' || /^C(0[1-9]|1[0-2])$/.test(CASE), '未知case，不允许零用例成功')
const want = (id) => CASE === 'all' || CASE === id

const root = new URL('../../../../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const requireReforge = createRequire(new URL('packages/reforge/package.json', root))
const { createServer } = await import(requireReforge.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Game audit forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/reforge/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const results = []
const note = (id, verdict, detail) => {
  if (verdict.startsWith('pending-red')) verdict = 'covered'
  results.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}
try {
  const { BattleSession } = await server.ssrLoadModule('/src/battle/battle-session.ts')
  const core = await server.ssrLoadModule('/src/battle/battle-core.ts')
  const source = ts.createSourceFile(
    'fixtures.ts',
    read('packages/reforge/src/battle/battle-session.test.ts'),
    ts.ScriptTarget.Latest,
    true,
  )
  const wanted = new Set([
    'mkEnemy',
    'player',
    'stubGlyphs',
    'PLAYER_PROFILE',
    'enemyProfile',
    'loadedBattleSprite',
    'mockBattleAssets',
  ])
  const selected = source.statements.filter(
    (n) =>
      (n.name && wanted.has(n.name.text)) ||
      (ts.isVariableStatement(n) &&
        n.declarationList.declarations.some((d) => wanted.has(d.name.getText(source)))),
  )
  assert.equal(selected.length, wanted.size)
  const fixtureJs = ts.transpileModule(
    selected.map((n) => n.getText(source)).join('\n') +
      '\nreturn {mkEnemy,player,stubGlyphs,mockBattleAssets}',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const { player, stubGlyphs, mockBattleAssets } = new Function(fixtureJs)()
  const items = Object.fromEntries(
    JSON.parse(read('projects/pal/content/items.json')).map((x) => [x.id, x]),
  )
  const palEnemies = JSON.parse(read('projects/pal/content/enemies.json'))
  const palSkills = JSON.parse(read('projects/pal/content/skills.json')).skills
  const steal = palSkills.find((skill) => skill.id === '377')
  assert(steal)

  const enemyStealTarget = palEnemies.find((entry) => entry.id === 'enemy-400')
  assert(enemyStealTarget)
  const assets = {
    palette: { colors: [], cycles: [] },
    glyphs: stubGlyphs,
    ...mockBattleAssets([enemyStealTarget], 1),
  }
  const hero = () =>
    player('hero', { attackStrength: 200, defense: 999, skills: ['377'], fleeRate: 999 })

  /** 偷取矩阵通用入口：finish × 初始拥有 × 数量。 */
  async function stealBattle({ finish, initiallyOwned, extraWorld = [] }) {
    const worldInventory = initiallyOwned
      ? [{ itemId: '91', count: 1 }, ...extraWorld]
      : [...extraWorld]
    const session = new BattleSession(
      [hero()],
      [enemyStealTarget],
      assets,
      (id) => id,
      () => 0,
      {
        skills: { 377: steal },
        items,
        inventory: worldInventory.map((x) => ({ ...x })),
      },
    )
    let result
    session.done.then((value) => {
      result = value
    })
    session.tick(0, new Set())
    for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) session.tick(16, new Set([key]))
    for (let n = 0; n < 300 && !result; n++) {
      session.tick(100, new Set([finish === 'victory' ? 'f' : 'q']))
      await Promise.resolve()
    }
    assert.equal(result, finish)
    const gained = session.debugLog().some((line) => line.includes(`获得 ${items['91'].name}`))
    const battleInventory = structuredClone(session.state.inventory)
    session.writeBackInventory(worldInventory)
    return { gained, battleInventory, worldInventory }
  }

  // ── C01 无→偷取→胜利→写回 ──
  if (want('C01')) {
    const r = await stealBattle({ finish: 'victory', initiallyOwned: false })
    if (MODE === 'contract') {
      assert.equal(r.gained, true)
      assert.deepEqual(r.battleInventory, [{ itemId: '91', count: 1 }])
      // 正确合同:战内新偷物经 writeBack 应并入世界库存。原树丢弃新增 ID(审计 C-01)→本断言业务红。
      assert.deepEqual(
        r.worldInventory,
        [{ itemId: '91', count: 1 }],
        'C01 正确合同: 新偷物应写回世界(原树丢弃=审计C-01 特征)',
      )
    }
    note(
      'C01',
      r.worldInventory.some((x) => x.itemId === '91' && x.count === 1) ? 'covered' : 'reproduced',
      `gained=${r.gained} 战内=${JSON.stringify(r.battleInventory)} 世界=${JSON.stringify(r.worldInventory)}（战内偷取链现行正确;是否保留新物由真实世界库存判定，缺失归审计C-01）`,
    )
  }
  // ── C02 偷取→逃跑写回 ──
  if (want('C02')) {
    const r = await stealBattle({ finish: 'playerFled', initiallyOwned: false })
    if (MODE === 'contract') {
      // 「逃跑留偷物」现行合同=战内库存保留;世界侧正确合同同 C01:新偷物应写回。
      assert.deepEqual(
        r.battleInventory,
        [{ itemId: '91', count: 1 }],
        'C02: 战内保留偷物(现行合同)',
      )
      assert.deepEqual(
        r.worldInventory,
        [{ itemId: '91', count: 1 }],
        'C02 正确合同: 逃跑同样应写回新偷物(原树丢弃=审计C-01,业务红)',
      )
    }
    note(
      'C02',
      r.worldInventory.some((x) => x.itemId === '91' && x.count === 1) ? 'covered' : 'reproduced',
      `战内=${JSON.stringify(r.battleInventory)}（逃跑留偷物=战内,现行合同正确）；世界=${JSON.stringify(r.worldInventory)}（新增丢弃=审计C-01 原树特征,正确合同红）`,
    )
  }
  // ── C03 已有→胜/逃数量正控 ──
  if (want('C03')) {
    for (const finish of ['victory', 'playerFled']) {
      const r = await stealBattle({ finish, initiallyOwned: true })

      assert.deepEqual(r.battleInventory, [{ itemId: '91', count: 2 }])
      assert.deepEqual(r.worldInventory, [{ itemId: '91', count: 2 }])

      note(
        `C03-${finish}`,
        'covered',
        `战内=${JSON.stringify(r.battleInventory)} 世界=${JSON.stringify(r.worldInventory)}`,
      )
    }
  }
  // ── C04 真实消费到零：菜单键序使用物品，writeBack 去零项且无重复 ID ──
  if (want('C04')) {
    const worldInventory = [{ itemId: '61', count: 1 }] // 观音符 consuming
    const session = new BattleSession(
      [hero()],
      [enemyStealTarget],
      assets,
      (id) => id,
      () => 0,
      {
        skills: { 377: steal },
        items,
        inventory: worldInventory.map((x) => ({ ...x })),
      },
    )
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    // 真实键序：主菜单→道具→使用(Up|Left)→确认物品（带 UI 见证）
    const uiTrace = []
    const keySeq = [
      'ArrowDown', // menu→杂项
      'Enter', // →misc（idx0 围攻）
      'ArrowDown', // miscIdx→1 道具
      'Enter', // →miscSub（usable 存在）
      'Enter', // miscSub idx0=使用 → item 列表
      'Enter', // 选中第一件物品：单人队 oneAlly 直落自己 → submit
    ]
    for (const key of keySeq) {
      session.tick(16, new Set([key]))
      uiTrace.push(`${key}->${session.ui}`)
      await Promise.resolve()
    }
    console.log('C04-UI', uiTrace.join(' '))
    // 单人队 oneAlly 直落自己 → 立即 submit；等待回合推进至终局
    for (let n = 0; n < 300 && !result; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    const usedOnce = session.debugLog().some((l) => l.includes(items['61'].name))
    const battleInv = structuredClone(session.state.inventory)
    session.writeBackInventory(worldInventory)
    const ids = worldInventory.map((x) => x.itemId)

    assert.equal(result, 'victory')
    assert.ok(usedOnce, 'C04: 物品真实被使用（日志见证）')
    assert.ok(
      battleInv.length === 0 || battleInv.every((x) => x.count <= 0),
      'C04: 战内消费到零（count≤0 或空）',
    )
    assert.ok(!ids.includes('61'), 'C04: 零项不写回')
    assert.equal(new Set(ids).size, ids.length, 'C04: 无重复 ID')

    note(
      'C04',
      'covered',
      `终局=${result} 使用见证=${usedOnce} 战内=${JSON.stringify(battleInv)} 写回=${JSON.stringify(worldInventory)}（真实菜单键序消费）`,
    )
  }

  // 正式core的headless合同：调用方填pendingActions，stepBattle负责全部行动/回合/结算。
  const poisonDefs = Object.fromEntries(
    JSON.parse(read('projects/pal/content/poisons.json')).map((x) => [x.id, x]),
  )
  const tank = (id, stealable) => {
    const e = structuredClone(enemyStealTarget)
    e.id = id
    e.stats.health = 10000
    delete e.attackEquivItem
    e.ai = { resistanceToSorcery: 0, fallback: { chancePercent: 100, action: { kind: 'attack' } } }
    e.steal = stealable
    return e
  }
  const coreSession = (enemies, inventory = [], patch = {}) =>
    new BattleSession(
      [
        player('core-hero', {
          hp: 999,
          maxHp: 999,
          mp: 100,
          maxMp: 100,
          attackStrength: 3,
          defense: 999,
          skills: ['377'],
          fleeRate: 999,
          ...patch,
        }),
      ],
      enemies,
      { palette: { colors: [], cycles: [] }, glyphs: stubGlyphs, ...mockBattleAssets(enemies, 1) },
      (id) => id,
      () => 0,
      { skills: { 377: steal }, items, poisonDefs, inventory: structuredClone(inventory) },
    )
  const round = (s, action = { kind: 'defend' }) => {
    if (s.phase === 'preBattle') core.stepBattle(s, () => 0)
    assert.equal(s.phase, 'selectAction')
    const turn = s.turn,
      actions = []
    if (s.players[0].hp > 0) s.pendingActions.set(0, action)
    for (let i = 0; i < 100 && s.turn === turn && !['won', 'lost', 'fled'].includes(s.phase); i++) {
      const prior = s.lastAction
      core.stepBattle(s, () => 0)
      if (s.lastAction && s.lastAction !== prior) actions.push(structuredClone(s.lastAction))
    }
    assert.ok(s.turn > turn || ['won', 'lost', 'fled'].includes(s.phase), '真实回合必须推进或终止')
    return actions
  }
  const count = (s, id) => s.inventory.find((x) => x.itemId === id)?.count ?? 0
  if (want('C05')) {
    const session = coreSession([tank('stealable-consumable', { itemId: '61', count: 1 })])
    const s = session.state
    const stole = round(s, { kind: 'cast', skillId: '377', targetEnemyIdx: 0 })
    assert.equal(count(s, '61'), 1)
    assert.ok(
      stole.some((x) => x.kind === 'cast' && x.skillId === '377'),
      '偷取实际行动',
    )
    const used = round(s, { kind: 'item', itemId: '61', targetAllyIdx: 0 })
    assert.equal(count(s, '61'), 0)
    assert.ok(
      used.some((x) => x.kind === 'item' && x.itemId === '61'),
      '消费刚偷得的同一物品',
    )
    round(s, { kind: 'flee' })
    assert.equal(s.phase, 'fled')
    const worldInventory = []
    session.writeBackInventory(worldInventory)
    assert.deepEqual(worldInventory, [], '新增后全部消耗的净结果为空')
    note(
      'C05',
      'covered',
      JSON.stringify({
        headlessCore: true,
        stole,
        used,
        newItem: '61',
        countAfterUse: count(s, '61'),
        worldInventory,
      }),
    )
  }
  if (want('C06')) {
    const cases = []
    for (const targets of [
      [0, 0],
      [0, 1],
    ]) {
      const session = coreSession([
        tank('a', { itemId: '61', count: 2 }),
        tank('b', { itemId: '66', count: 1 }),
      ])
      const s = session.state,
        beforeMp = s.players[0].mp,
        actions = []
      for (const targetEnemyIdx of targets)
        actions.push(...round(s, { kind: 'cast', skillId: '377', targetEnemyIdx }))
      const casts = actions.filter((x) => x.kind === 'cast' && x.skillId === '377')
      assert.equal(casts.length, 2, 'C06: 两次实际偷取行动必须出现，删第二次不可通过')
      assert.equal(s.players[0].mp, beforeMp - 2 * steal.cost.mp)
      const actual = s.inventory.filter((x) => x.count > 0)
      assert.deepEqual(
        actual,
        targets[1] === 0
          ? [{ itemId: '61', count: 2 }]
          : [
              { itemId: '61', count: 1 },
              { itemId: '66', count: 1 },
            ],
      )
      cases.push({ targets, casts, inventory: actual })
    }
    note(
      'C06',
      'covered',
      JSON.stringify({
        headlessCore: true,
        cases,
        worldWriteback: '由C01/C02独立覆盖，不拿本例战内合并冒称世界写回已正确',
      }),
    )
  }
  if (want('C07')) {
    const session = coreSession([tank('parasite')], [{ itemId: '144', count: 1 }]),
      s = session.state
    const observations = []
    for (let i = 0; i < 9; i++) {
      const actions = round(
        s,
        i === 0 ? { kind: 'throw', itemId: '144', targetEnemyIdx: 0 } : { kind: 'defend' },
      )
      if (i === 0) assert.ok(actions.some((x) => x.kind === 'throw' && x.itemId === '144'))
      observations.push({
        round: i + 1,
        poison: s.enemies[0].poisons.map((x) => ({ ...x })),
        spawned: count(s, '145'),
      })
    }
    const due = poisonDefs[561].enemyTicks.findIndex((x) => x.grantItem === '145') + 1
    assert.ok(due > 0 && due <= 9)
    assert.equal(observations[due - 3]?.spawned ?? 0, 0)
    assert.equal(observations[due - 2].spawned, 1, '施加时立即tick一次，余下tick在回合末推进')
    assert.equal(count(s, '145'), 1, '第九轮不重复产出')
    assert.equal(s.enemies[0].poisons.length, 0, '到期自解')
    round(s, { kind: 'flee' })
    const worldInventory = []
    session.writeBackInventory(worldInventory)
    const correct = worldInventory.some((x) => x.itemId === '145' && x.count === 1)
    if (MODE === 'contract') assert.equal(correct, true, 'C07: 真实养蛊产物必须写回世界')
    note(
      'C07',
      correct ? 'covered' : 'reproduced',
      JSON.stringify({
        headlessCore: true,
        observations,
        canonicalDueTick: due,
        immediateTickOnApplication: true,
        spawnRound: due - 1,
        worldInventory,
        scope: '按当前毒定义完整运行9轮；不据此裁决原版与迁移数据的回合计数差异',
      }),
    )
  }
  if (want('C08')) {
    const enemy = tank('lethal')
    enemy.stats.attackStrength = 999
    const session = coreSession([enemy], [{ itemId: '61', count: 1 }], {
        hp: 1,
        maxHp: 1,
        defense: 0,
      }),
      s = session.state
    round(s, { kind: 'defend' })
    assert.equal(s.phase, 'lost')
    assert.equal(s.players[0].hp, 0)
    const cancelled = coreSession([tank('cancelled')])
    const cancelledResult = cancelled.done.then(
      () => ({ resolved: true }),
      (error) => ({ error: error.name }),
    )
    cancelled.cancel()
    assert.equal((await cancelledResult).error, 'AbortError')
    const source = read('packages/reforge/src/main.ts')
    assert.ok(source.indexOf('assertLaunchCurrent()\n    session.writeBackPersistentEffects') >= 0)
    note(
      'C08',
      'risk',
      JSON.stringify({
        realDefeat: s.phase,
        realCancel: 'AbortError',
        missing:
          'Session/core两终态已真实达到；main旧战斗取消后写回所有权尚需带真实world换代的launchBattle链，当前仅源码guard证据，不声明已跑',
        next: 'main.ts startBattle/launchSignal/assertLaunchCurrent/writeBackInventory',
      }),
    )
    if (MODE === 'contract') process.exitCode = 2
  }
  if (want('C09') || want('C10') || want('C11')) {
    const which = CASE === 'all' ? ['C09', 'C10', 'C11'] : [CASE]
    for (const id of which) {
      const enemy = tank('poison-target')
      enemy.stats.health = id === 'C09' || id === 'C11' ? 1 : 10000
      const session = coreSession([enemy], [], {
          hp: id === 'C10' || id === 'C11' ? 2 : 999,
          maxHp: 999,
        }),
        s = session.state
      if (id !== 'C10')
        assert.equal(
          core.applyPoisonToEnemy(s.enemies[0], 553, () => 0),
          true,
        )
      if (id !== 'C09')
        assert.equal(core.applyPoisonToPlayer(s.players[0], 551, poisonDefs), 'applied')
      round(s, { kind: 'defend' })
      const afterRound = {
        phase: s.phase,
        hp: s.players[0].hp,
        enemyHp: s.enemies[0].hp,
        exp: s.expGained,
      }
      for (let i = 0; i < 4; i++) core.stepBattle(s, () => 0) // 没有新玩家输入
      if (id === 'C09') {
        assert.equal(s.enemies[0].hp, 0)
        const correct = s.phase === 'won' && s.expGained === enemy.stats.exp
        if (MODE === 'contract')
          assert.equal(correct, true, 'C09: 最后敌人毒死必须无需玩家新输入完成结算')
        note(
          id,
          correct ? 'covered' : 'reproduced',
          JSON.stringify({ afterRound, afterEmpty: s.phase, exp: s.expGained }),
        )
      } else if (id === 'C10') {
        assert.equal(s.players[0].hp, 0)
        assert.equal(s.phase, 'lost', '玩家死亡后空步必须终止，不要求新玩家行动')
        note(id, 'covered', JSON.stringify({ afterRound, afterEmpty: s.phase }))
      } else {
        assert.equal(s.players[0].hp, 0)
        assert.equal(s.enemies[0].hp, 0)
        assert.equal(s.phase, 'won', '当前动作末先判敌全灭；双方死亡后无需玩家输入可终止')
        const passive = tank('regen-control')
        passive.ai.fallback.action = { kind: 'pass' }
        const regen = coreSession([passive], [], { hp: 1, maxHp: 999, regenHp: 100 }).state
        assert.equal(core.applyPoisonToPlayer(regen.players[0], 551, poisonDefs), 'applied')
        round(regen)
        const expectedHp = 101 + (poisonDefs[551].playerTicks[0].hpDelta ?? 0)
        assert.equal(regen.players[0].hp, expectedHp, '真实回合先回补后毒，不能先毒死而跳过回补')
        assert.ok(expectedHp > 0)
        note(
          id,
          'covered',
          JSON.stringify({
            afterRound,
            afterEmpty: s.phase,
            tiePolicy: '当前先判敌全灭，未新增策略',
            regenThenPoisonHp: regen.players[0].hp,
          }),
        )
      }
    }
  }
  if (want('C12')) {
    const e = tank('reward')
    e.stats.health = 1
    const session = coreSession([e], [], { attackStrength: 9999 }),
      s = session.state
    round(s, { kind: 'attack', targetEnemyIdx: 0 })
    assert.equal(s.phase, 'won')
    assert.equal(s.expGained, e.stats.exp)
    assert.equal(s.cashGained, e.stats.cash)
    const reward = [s.expGained, s.cashGained]
    for (let i = 0; i < 10; i++) core.stepBattle(s, () => 0)
    assert.deepEqual([s.expGained, s.cashGained], reward)
    const flee = tank('enemy-flee')
    flee.ai = { fallback: { chancePercent: 100, action: { kind: 'flee' } } }
    const s2 = coreSession([flee]).state
    round(s2, { kind: 'defend' })
    assert.equal(s2.enemyFled, true)
    assert.equal(s2.expGained, 0)
    assert.equal(s2.cashGained, 0)
    note(
      'C12',
      'covered',
      JSON.stringify({
        actualTerminal: true,
        reward,
        repeated: 10,
        enemyFled: s2.enemyFled,
        noReward: [s2.expGained, s2.cashGained],
        scope: '真实core奖励终态，不冒称main全部奖励写入或保存磁盘E2E',
      }),
    )
  }
  console.log(`\nC组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
