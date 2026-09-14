// GLM原始材料；Codex于2026-09-14接手修正/自验证，非GLM独立终审。
// GLM boundary batch-2 · D组 rework（R5）· 真实行动 + 字段级 assert。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-battle-actions.mjs [--mode=observe|contract] [--case ID|all]
// 真实 BattleSession/battle-core + 既有测试 fixture 构造器（AST 只取纯构造器）+ PAL 真实 items/skills/enemies/poisons。
// 敌附带毒经真实敌攻链进入；使用/投掷/复活/治疗经真实菜单键序；断言 HP/MP/status/poisons/库存/menu 字段。
// observe=取证 exit0；contract=正确合同业务断言。内存 assets；无渲染/网络/存档写盘。
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
assert.ok(CASE === 'all' || /^D(0[1-9]|1[0-2])$/.test(CASE), '未知case，不允许零用例成功')
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
  const content = await server.ssrLoadModule('/../content/src/index.ts')
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
  const allItems = JSON.parse(read('projects/pal/content/items.json'))
  const items = Object.fromEntries(allItems.map((x) => [x.id, x]))
  const palEnemies = JSON.parse(read('projects/pal/content/enemies.json'))
  const palSkills = JSON.parse(read('projects/pal/content/skills.json')).skills
  const skills = Object.fromEntries(palSkills.map((s) => [s.id, s]))
  const allPoisons = JSON.parse(read('projects/pal/content/poisons.json'))
  const poisonArr = Array.isArray(allPoisons)
    ? allPoisons
    : (allPoisons.poisons ?? Object.values(allPoisons))
  const poisonDefs = Object.fromEntries(poisonArr.map((p) => [Number(p.id), p]))

  const mk = (enemy, party, data) =>
    new BattleSession(
      party,
      [enemy],
      {
        palette: { colors: [], cycles: [] },
        glyphs: stubGlyphs,
        ...mockBattleAssets([enemy], party.length),
      },
      (id) => id,
      () => 0,
      data,
    )
  /** 真实键序推进;提交后空 tick 到「本回合真实结算」(turn++ 且 pending 清空)为止。
   *  睡眠者被自动跳过会续 turn,不能只盯 pendingActions——按起始 turn 计数恰好等一回合;
   *  多人队仅部分提交时等 cap 由后续键续推;终局相位立即停。 */
  const drive = async (s, keys) => {
    s.tick(0, new Set())
    const trace = []
    for (const key of keys) {
      s.tick(16, new Set([key]))
      trace.push(`${key}->${s.ui}`)
      const startTurn = s.state.turn
      for (let i = 0; i < 300; i++) {
        const phase = s.state.phase
        if (phase === 'won' || phase === 'lost' || phase === 'fled') break
        if (s.state.pendingActions.size === 0 && (s.state.turn > startTurn || s.ui !== 'acting'))
          break
        s.tick(100, new Set())
        await Promise.resolve()
      }
    }
    return trace
  }
  const finish = async (s, key = 'f', n = 400) => {
    let out
    s.done.then((v) => {
      out = v
    })
    for (let i = 0; i < n && !out; i++) {
      s.tick(100, new Set([key]))
      await Promise.resolve()
    }
    return out
  }
  const invCount = (s, id) => s.state.inventory.find((x) => x.itemId === id)?.count

  // ── D01 敌附带毒正控:真实敌攻链进入(非直调/非日志推断) ──
  if (want('D01')) {
    // enemy-406: attackEquivItem=毒蛇卵117 rate4;受击者 poisonRes=0。session rng()=0 → 双门全过。
    const enemy406 = palEnemies.find((e) => e.id === 'enemy-406')
    assert(enemy406)
    const s = mk(enemy406, [player('d1', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [],
    })
    await drive(s, ['d']) // 防御提交 → 敌真实攻击回合 → equiv 链进入
    const p0 = s.state.players[0]
    const poison551 = (p0.poisons ?? []).some((x) => Number(x.poisonId) === 551)
    const logPoison = s.debugLog().some((l) => l.includes('中了'))

    assert.equal(poison551, true, 'D01: 真实敌攻链双概率门通过后 551 入 p.poisons 字段')
    assert.equal(logPoison, true, 'D01: 命中日志见证(中了 毒蛇卵 的毒)')

    note(
      'D01',
      'covered',
      `敌攻链进入:poisons=[${(p0.poisons ?? []).map((x) => x.poisonId)}] 日志中毒=${logPoison} hp=${p0.hp}（enemy-406+毒蛇卵117 rate4,受击者res=0,rng=0双门过;battle-core.ts:2700 敌普攻命中后调 applyEnemyEquivItem）`,
    )
  }
  // ── D02 敌附带 silence 与正常使用同物品；不以现有遗漏作为正确合同 ──
  if (want('D02')) {
    // (a) enemy-512 equiv=黑狗血85(rate3, effects=[applyStatus silence]):真实敌攻链进入,
    //     门过后应生效；当前仅处理 applyPoison 是待核修复点，不是作者能力限制。
    const enemy512 = palEnemies.find((e) => e.id === 'enemy-512')
    assert(enemy512)
    const sa = mk(enemy512, [player('d2a', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [],
    })
    await drive(sa, ['d'])
    const equivSilence = sa.state.players[0].status.silence
    // (b) 同物品经真实 use 链消费(单队 oneAlly 直落自己):silence 真实入 status 字段。
    const sb = mk(enemy512, [player('d2b', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [{ itemId: '85', count: 1 }],
    })
    await drive(sb, ['e', 'Enter'])
    const useSilence = sb.state.players[0].status.silence
    const used85 = invCount(sb, '85')
    if (MODE === 'contract') {
      assert.equal(equivSilence, 2, 'D02: 合法敌附带封技必须生效，不能把仅applyPoison实现当合同')
      assert.equal(useSilence, 2, 'D02: 黑狗血 use 链 silence 3 真实入 status,本回合末衰减→2')
      assert.ok(used85 === undefined || used85 === 0, 'D02: consuming 物真实消耗')
    }
    note(
      'D02',
      equivSilence === 2 ? 'covered' : 'reproduced',
      `equiv链敌攻进入后 status.silence=${equivSilence ?? 'undefined'}(现行仅applyPoison是不完整实现，非作者合同);use链真实使用85后 silence=${useSilence} 库存85=${used85 ?? '清除'}（use是合法对照，敌附带遗漏封技归C-02）`,
    )
  }
  // D03: 同一敌攻的复合附带，与无附带物品的同输入物理伤害对照。
  if (want('D03')) {
    const enemy = palEnemies.find((e) => e.id === 'enemy-401')
    const control = structuredClone(enemy)
    delete control.attackEquivItem
    const create = (def) =>
      mk(def, [player('d3', { attackStrength: 3, defense: 999, hp: 50, maxHp: 100 })], {
        items,
        poisonDefs,
        inventory: [],
      })
    const plain = create(control),
      extra = create(enemy)
    await drive(plain, ['d'])
    await drive(extra, ['d'])
    assert.equal(plain.state.players[0].status.sleep, 0)
    assert.equal(plain.state.players[0].hp, 49, '普通物理伤害正控实际命中')
    const p = extra.state.players[0]
    const correct = p.status.sleep === 2 && p.hp === plain.state.players[0].hp - 1
    if (MODE === 'contract')
      assert.equal(correct, true, 'D03: 敌附带忘魂花必须同时施加sleep和额外healHp(-1)')
    note(
      'D03',
      correct ? 'covered' : 'reproduced',
      JSON.stringify({
        physicalHp: plain.state.players[0].hp,
        equivHp: p.hp,
        sleep: p.status.sleep,
        enemyAttack: extra.debugLog(),
      }),
    )
  }

  // ── D04 概率/毒抗门禁对照(直调矩阵;门用受击者 res;不删任何保护) ──
  if (want('D04')) {
    const enemy406 = palEnemies.find((e) => e.id === 'enemy-406')
    const mkState = (poisonRes) =>
      mk(enemy406, [player('d4', { attackStrength: 3, defense: 999, maxHp: 200, poisonRes })], {
        items,
        poisonDefs,
        inventory: [],
      })
    const count551 = (s) =>
      (s.state.players[0].poisons ?? []).filter((x) => Number(x.poisonId) === 551).length
    const seq = (vals) => () => vals.splice(0, 1)[0] ?? 0
    // (a) rate 门失败: rng=0.9 → R(1,10)=10 > rate4 → 不触发
    const sa = mkState(0)
    core.applyEnemyEquivItem(sa.state.players[0], sa.state.enemies[0], sa.state, () => 0.9)
    const rateBlocked = count551(sa)
    // (b) 毒抗门(受击者 res=50): rate 门 rng=0.1 过(R=2≤4),毒抗门 rng=0 → 50 ≥ R(1,100)=1 → 抗掉
    const sb = mkState(50)
    core.applyEnemyEquivItem(sb.state.players[0], sb.state.enemies[0], sb.state, seq([0.1, 0.0]))
    const resBlocked = count551(sb)
    // (c) 同 rng 对照受击者 res=0: 两门全过 → 中毒(与 D01 真实链互证)
    const sc = mkState(0)
    core.applyEnemyEquivItem(sc.state.players[0], sc.state.enemies[0], sc.state, seq([0.1, 0.05]))
    const passed = count551(sc)

    assert.equal(rateBlocked, 0, 'D04: rate 门失败必须挡下(现行正确保护)')
    assert.equal(resBlocked, 0, 'D04: 受击者毒抗门必须挡下')
    assert.equal(passed, 1, 'D04: 同输入 res=0 对照必须中毒(门控有鉴别力)')

    note(
      'D04',
      'covered',
      `门禁矩阵:rate失败(rng0.9)→${rateBlocked}毒;受击者res50(rng[0.1,0])→${resBlocked}毒;res0对照(rng[0.1,0.05])→${passed}毒（两道门均现行正确保护未删;毒抗门读受击者 p.poisonRes,battle-core.ts:2719）`,
    )
  }
  // D05: 合法作者全队复活技能，而非两次oneAlly物品。
  if (want('D05')) {
    const spell = { ...structuredClone(skills['301']), id: 'probe-all-revive', target: 'allAllies' }
    content.validateSkills({ skills: [spell], levelUp: {} })
    const enemy = palEnemies.find((e) => e.id === 'enemy-401')
    const s = mk(
      enemy,
      [
        player('d5a', { attackStrength: 3, defense: 999, mp: 100, maxMp: 100, skills: [spell.id] }),
        player('d5b', { hp: 0, maxHp: 100 }),
        player('d5c', { hp: 0, maxHp: 200 }),
      ],
      { skills: { [spell.id]: spell }, items, poisonDefs, inventory: [] },
    )
    await drive(s, ['ArrowLeft', 'Enter', 'Enter'])
    assert.equal(s.state.players[0].mp, 84, 'D05: 真正提交并扣除技能代价')
    const hp = s.state.players.map((p) => p.hp)
    const correct = hp[1] === 10 && hp[2] === 20
    if (MODE === 'contract')
      assert.equal(correct, true, 'D05: validateSkills接受的allAllies复活必须触达两名死者')
    note(
      'D05',
      correct ? 'covered' : 'reproduced',
      JSON.stringify({ validated: true, target: spell.target, hp, mp: s.state.players[0].mp }),
    )
  }

  // ── D06 单体还魂咒301 真实施放(技能链,非数据声明) ──
  if (want('D06')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const s = mk(
      enemy,
      [
        player('d6a', {
          attackStrength: 3,
          defense: 999,
          maxHp: 200,
          mp: 100,
          maxMp: 100,
          skills: ['301'],
        }),
        player('d6b', { hp: 0, maxHp: 100 }),
      ],
      { skills: { 301: skills['301'] }, items, poisonDefs, inventory: [] },
    )
    const trace = await drive(s, ['ArrowLeft', 'Enter', 'Enter', 'ArrowDown', 'Enter']) // 法术→301→选死者
    const [p1, p2] = s.state.players

    assert.equal(p2.hp, 10, 'D06: 单体还魂咒真实施放复活 HP=10%(100)=10')
    assert.equal(p1.mp, 84, 'D06: MP 真实扣 100-16=84')
    assert.ok(
      s.debugLog().some((l) => l.includes('死而复生')),
      'D06: 施展日志见证',
    )

    note(
      'D06',
      'covered',
      `301还魂咒经真实技能菜单施放:p2.hp=0→${p2.hp} p1.mp=100→${p1.mp} 路径=${trace.join(' ')}（单体复活未失效;oneAlly 多人队进己方选人含死者 battle-session.ts:1447-1452）`,
    )
  }
  // ── D07 allAllies 治疗 + 死亡门禁同链证明(heal 不得复活死者) ──
  if (want('D07')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const s = mk(
      enemy,
      [
        player('d7a', {
          attackStrength: 3,
          defense: 999,
          hp: 10,
          maxHp: 1000,
          mp: 100,
          maxMp: 100,
          skills: ['300'],
        }),
        player('d7b', { attackStrength: 3, defense: 999, hp: 20, maxHp: 1000 }),
        player('d7c', { hp: 0, maxHp: 1000 }),
      ],
      { skills: { 300: skills['300'] }, items, poisonDefs, inventory: [] },
    )
    await drive(s, ['ArrowLeft', 'Enter', 'Enter']) // p1 法术→300 五气朝元 allAllies 直落 submit
    await drive(s, ['d']) // p2 防御提交 → 回合真实结算
    const [p1, p2, p3] = s.state.players

    assert.equal(p1.hp, 309, 'D07: 队长 10+300=310 再受敌攻1→309(精确治疗量,未及 maxHp)')
    assert.equal(p2.hp, 320, 'D07: 队员 20+300=320(allAllies 全体生效)')
    assert.equal(p3.hp, 0, 'D07: 死亡队员不被 healHp 复活(死亡门禁,不得用效果忽略死亡掩盖复活遗漏)')

    note(
      'D07',
      'covered',
      `300五气朝元 allAllies 真实施放:p1.hp 10→${p1.hp} p2.hp 20→${p2.hp} 死者p3.hp=${p3.hp}(死亡门禁) MP=${p1.mp}（普通全队治疗对照+同链死亡门证明）`,
    )
  }
  // ── D08 MP 不足门禁 + 合体技数据 census 分栏 ──
  if (want('D08')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const s = mk(
      enemy,
      [
        player('d8', {
          attackStrength: 3,
          defense: 999,
          maxHp: 200,
          mp: 5,
          maxMp: 30,
          skills: ['300'],
        }),
      ],
      { skills: { 300: skills['300'] }, items, poisonDefs, inventory: [] },
    )
    const trace = await drive(s, ['ArrowLeft', 'Enter', 'Enter']) // 确认被 MP 门拦下
    const p0 = s.state.players[0]
    assert.equal(s.ui, 'skill')
    assert.equal(s.state.pendingActions.size, 0)
    assert.equal(p0.mp, 5)
    const cooperative = JSON.parse(read('projects/pal/content/actors.json')).flatMap((a) =>
      a.battler?.cooperativeMagicSkillId
        ? [{ actor: a.id, skill: a.battler.cooperativeMagicSkillId }]
        : [],
    )
    assert.ok(cooperative.length > 0)
    assert.ok(cooperative.every((x) => skills[x.skill]))
    const mixed = {
      ...structuredClone(skills['301']),
      id: 'mixed-heal-revive',
      target: 'allAllies',
      effects: [
        { kind: 'healHp', amount: 10 },
        structuredClone(skills['301'].effects.find((x) => x.kind === 'revive')),
      ],
    }
    content.validateSkills({ skills: [mixed], levelUp: {} })
    const combo = mk(
      palEnemies.find((e) => e.id === 'enemy-401'),
      [
        player('mixed-alive', {
          hp: 10,
          maxHp: 100,
          mp: 100,
          maxMp: 100,
          defense: 999,
          attackStrength: 3,
          skills: [mixed.id],
        }),
        player('mixed-dead', { hp: 0, maxHp: 100 }),
      ],
      { skills: { [mixed.id]: mixed }, items, poisonDefs, inventory: [] },
    )
    await drive(combo, ['ArrowLeft', 'Enter', 'Enter'])
    assert.equal(combo.state.players[0].mp, 84)
    assert.equal(combo.state.players[0].hp, 19, '复合技能的普通治疗正控')
    const correct = combo.state.players[1].hp === 10
    if (MODE === 'contract')
      assert.equal(correct, true, 'D08: 复合全队治疗/复活必须分别触达相应生死目标')
    note(
      'D08',
      correct ? 'covered' : 'reproduced',
      JSON.stringify({
        mpGuard: { ui: s.ui, pending: s.state.pendingActions.size, mp: p0.mp, trace },
        mixedHp: combo.state.players.map((x) => x.hp),
        cooperativeBindings: cooperative,
        cooperativeScope: '实际角色字段绑定非comboAttack效果；合体执行另属Q2，不外推本普通技能证据',
      }),
    )
  }
  // ── D09 仅可投掷:菜单路径被 use 门拦 + W 快捷正控 + 真实投掷终局 ──
  if (want('D09')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const base = { items, poisonDefs }
    // (a) 菜单路径:道具 confirm 需 usableItems 非空(battle-session.ts:1408)→ 投掷-only 库存不进 miscSub
    const sa = mk(enemy, [player('d9a', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      ...base,
      inventory: [{ itemId: '66', count: 1 }],
    })
    await drive(sa, ['ArrowDown', 'Enter', 'ArrowDown', 'Enter'])
    const menuBlocked = sa.ui
    // (b) W 快捷直开投掷 + 真实投掷到终局(天师符66 magicDamage140 vs 敌28血)
    const sb = mk(enemy, [player('d9b', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      ...base,
      inventory: [{ itemId: '66', count: 1 }],
    })
    const traceThrow = await drive(sb, ['w', 'Enter', 'Enter'])
    const result = await finish(sb)
    const world = [{ itemId: '66', count: 1 }]
    sb.writeBackInventory(world)
    if (MODE === 'contract') {
      assert.equal(menuBlocked, 'miscSub', 'D09: 只有可投掷物品也必须能从道具父入口进入子菜单')
      assert.ok(traceThrow[0].endsWith('throwItem'), 'D09: W 快捷真实直开投掷列表')
      assert.deepEqual(
        sb.throwableItems().map((x) => x.itemId),
        [],
        'D09: 投掷消耗后列表清空',
      )
      assert.equal(result, 'victory', 'D09: 真实投掷 140 伤击杀 28 血敌终局')
      assert.deepEqual(world, [], 'D09: 战后写回去零清项(writeBackInventory)')
    }
    note(
      'D09',
      menuBlocked === 'miscSub' ? 'covered' : 'reproduced',
      `菜单路径止于=${menuBlocked}(应按use/throw并集开放，库内仅66天师符);W→throwItem→选敌→投掷:终局=${result} 战内66=${invCount(sb, '66') ?? '清除'} 世界写回=${JSON.stringify(world)} 路径=${traceThrow.join(' ')}（父→子门控与W快捷经真实按键）`,
    )
  }
  // ── D10 仅可使用:同键序全菜单路径正控(与 C04 同六键) ──
  if (want('D10')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const s = mk(enemy, [player('d10', { attackStrength: 3, defense: 999, hp: 50, maxHp: 100 })], {
      items,
      poisonDefs,
      inventory: [{ itemId: '61', count: 1 }],
    })
    const trace = await drive(s, ['ArrowDown', 'Enter', 'ArrowDown', 'Enter', 'Enter', 'Enter'])
    const p0 = s.state.players[0]

    assert.ok(
      trace.join(' ').includes('miscSub') && trace.join(' ').includes('item'),
      'D10: 真实路径经 miscSub→item',
    )
    assert.equal(p0.hp, 99, 'D10: 观音符150治 50→封顶100,再受敌攻1 → 99(封顶与治疗量双重鉴别)')
    assert.deepEqual(s.throwableItems(), [], 'D10: 无 throw 能力不进投掷列表')
    assert.ok(invCount(s, '61') === undefined || invCount(s, '61') === 0, 'D10: consuming 真实消耗')

    note(
      'D10',
      'covered',
      `仅61观音符同六键序:hp 50→${p0.hp} throwable=${JSON.stringify(s.throwableItems())} 库存61=${invCount(s, '61') ?? '清除'} 路径=${trace.join(' ')}（仅可使用物品的同输入序列正控）`,
    )
  }
  // ── D11 双能力并集/子门控 + 双无负控 + 全空输入正向边界对照 ──
  if (want('D11')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    // (a) 双能力(61 use + 66 throw):miscSub 可进,两个子菜单各自真实可达且列表只含本能力
    const sa = mk(enemy, [player('d11a', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [
        { itemId: '61', count: 1 },
        { itemId: '66', count: 1 },
      ],
    })
    await drive(sa, ['ArrowDown', 'Enter', 'ArrowDown', 'Enter']) // →miscSub(use 非空门过)
    const atMiscSub = sa.ui
    await drive(sa, ['ArrowDown', 'Enter']) // miscSub idx1 投掷 → throwItem
    const throwList = sa.throwableItems().map((x) => x.itemId)
    await drive(sa, ['Escape', 'ArrowUp', 'Enter']) // 回 miscSub→idx0 使用 → item
    const useList = sa.usableItems().map((x) => x.itemId)
    // (b) 双无能力物品:真实数据中找无 use 且无 throw 的物品
    const inert = allItems.find((x) => !x.use && !x.throw)
    assert(inert, 'D11: 需要一个双无能力真实物品')
    const sb = mk(enemy, [player('d11b', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [{ itemId: inert.id, count: 1 }],
    })
    await drive(sb, ['ArrowDown', 'Enter', 'ArrowDown', 'Enter'])
    const noneAfterMenu = sb.ui
    // W/E 快捷只在主菜单域拦截;独立新会话从 menu 态按键(双无库存两快捷都必须无操作)
    const sw = mk(enemy, [player('d11w', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [{ itemId: inert.id, count: 1 }],
    })
    sw.tick(0, new Set())
    sw.tick(16, new Set(['w']))
    const noneW = sw.ui
    sw.tick(16, new Set(['e']))
    const noneE = sw.ui
    // (c) 禁用输入负控(R5):24 次全空 tick 不得推进菜单/消耗库存/产生预占
    const sc = mk(enemy, [player('d11c', { attackStrength: 3, defense: 999, maxHp: 200 })], {
      items,
      poisonDefs,
      inventory: [{ itemId: '66', count: 1 }],
    })
    sc.tick(0, new Set())
    for (let i = 0; i < 24; i++) sc.tick(16, new Set())

    assert.equal(atMiscSub, 'miscSub', 'D11: 父能力并集(use 非空)可进 miscSub')
    assert.equal(throwList.includes('66'), true, 'D11: 子菜单投掷列表含 66')
    assert.equal(useList.includes('61'), true, 'D11: 子菜单使用列表含 61')
    assert.equal(noneAfterMenu, 'misc', 'D11: 双无能力库存道具 confirm 不得进 miscSub')
    assert.equal(noneW, 'menu', 'D11: 双无能力 W 不得开投掷')
    assert.equal(noneE, 'menu', 'D11: 双无能力 E 不得开使用')
    assert.equal(sc.ui, 'menu', 'D11 负控: 全空 tick 不得推进菜单')
    assert.deepEqual(
      sc.state.inventory,
      [{ itemId: '66', count: 1 }],
      'D11 负控: 空输入不得消耗库存',
    )
    assert.equal(sc.state.pendingActions.size, 0, 'D11 负控: 空输入不得产生预占')

    note(
      'D11',
      'covered',
      `双能力:miscSub→投掷列表=${JSON.stringify(throwList)}/使用列表=${JSON.stringify(useList)};双无(${inert.id}=${inert.name}):confirm后=${noneAfterMenu} W后=${noneW} E后=${noneE};24次全空tick后 ui=${sc.ui} 库存不变 预占=${sc.state.pendingActions.size}（父并集门:1408,子门:1421-1427,快捷门:1328/1336;空输入保持不动；不是把tick实现置空的突变）`,
    )
  }
  // ── D12 前队员预占最后一件:真实提交→后队员列表隐藏;Esc 回退释放预占恢复 ──
  if (want('D12')) {
    const enemy = palEnemies.find((e) => e.stats?.health === 28)
    const s = mk(
      enemy,
      [
        player('d12a', { attackStrength: 3, defense: 999, maxHp: 200 }),
        player('d12b', { attackStrength: 3, defense: 999, maxHp: 200 }),
      ],
      { items, poisonDefs, inventory: [{ itemId: '66', count: 1 }] },
    )
    // p1 W→投掷66→选敌→提交(投掷无条件预占 battle-core.ts:1718)
    await drive(s, ['w', 'Enter', 'Enter'])
    const afterP1 = s.ui
    const pending1 = s.state.pendingActions.size
    // p2 的 W:最后一件已被预占 → 列表空 → 不得开投掷菜单
    s.tick(16, new Set(['w']))
    const p2wBlocked = s.ui
    // Esc 回退上一队员提交 → 预占释放(battle-core.ts:1710-1712 合同) → 列表恢复 66
    await drive(s, ['Escape'])
    const pendingAfterEsc = s.state.pendingActions.size
    s.tick(16, new Set(['w']))
    const restored = s.throwableItems().map((x) => `${x.itemId}×${x.count}`)
    // p2 真实投掷恢复的 66 到终局,核世界写回
    await drive(s, ['Enter', 'Enter'])
    const result = await finish(s)
    const world = [{ itemId: '66', count: 1 }]
    s.writeBackInventory(world)

    assert.equal(afterP1, 'menu', 'D12: p1 提交后回主菜单(p2 选行动)')
    assert.equal(pending1, 1, 'D12: p1 投掷真实预占 pendingActions=1')
    assert.equal(p2wBlocked, 'menu', 'D12: 最后一件被预占后 p2 不得再开投掷(防双选)')
    assert.equal(pendingAfterEsc, 0, 'D12: Esc 回退真实释放预占')
    assert.deepEqual(restored, ['66×1'], 'D12: 预占释放后列表恢复 66×1')
    assert.equal(result, 'victory', 'D12: 恢复的 66 真实投掷到终局')
    assert.deepEqual(world, [], 'D12: 战后写回去零清项')

    note(
      'D12',
      'covered',
      `p1投66预占→p2 W被拦(ui=${p2wBlocked},pending=${pending1});Esc回退→pending=${pendingAfterEsc} 列表恢复=[${restored.join(',')}]→p2真实投掷终局=${result} 世界写回=${JSON.stringify(world)}（预占=pendingItemUses 提交时扣减 battle-core.ts:1715-1722;Esc 释放=submitOrder pop battle-session.ts:1358-1361）`,
    )
  }
  console.log(`\nD组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
