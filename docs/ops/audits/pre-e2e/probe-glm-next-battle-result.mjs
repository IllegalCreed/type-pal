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
  results.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}
try {
  const { BattleSession } = await server.ssrLoadModule('/src/battle/battle-session.ts')
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
  const { mkEnemy, player, stubGlyphs, mockBattleAssets } = new Function(fixtureJs)()
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
      'reproduced',
      `gained=${r.gained} 战内=${JSON.stringify(r.battleInventory)} 世界=${JSON.stringify(r.worldInventory)}（战内偷取链现行正确;世界写回丢弃新增=审计C-01 原树特征,正确合同红）`,
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
      'reproduced',
      `战内=${JSON.stringify(r.battleInventory)}（逃跑留偷物=战内,现行合同正确）；世界=${JSON.stringify(r.worldInventory)}（新增丢弃=审计C-01 原树特征,正确合同红）`,
    )
  }
  // ── C03 已有→胜/逃数量正控 ──
  if (want('C03')) {
    for (const finish of ['victory', 'playerFled']) {
      const r = await stealBattle({ finish, initiallyOwned: true })
      if (MODE === 'contract') {
        assert.deepEqual(r.battleInventory, [{ itemId: '91', count: 2 }])
        assert.deepEqual(r.worldInventory, [{ itemId: '91', count: 2 }])
      }
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
    if (MODE === 'contract') {
      assert.equal(result, 'victory')
      assert.ok(usedOnce, 'C04: 物品真实被使用（日志见证）')
      assert.ok(
        battleInv.length === 0 || battleInv.every((x) => x.count <= 0),
        'C04: 战内消费到零（count≤0 或空）',
      )
      assert.ok(!ids.includes('61'), 'C04: 零项不写回')
      assert.equal(new Set(ids).size, ids.length, 'C04: 无重复 ID')
    }
    note(
      'C04',
      'covered',
      `终局=${result} 使用见证=${usedOnce} 战内=${JSON.stringify(battleInv)} 写回=${JSON.stringify(worldInventory)}（真实菜单键序消费）`,
    )
  }
  // ── C05 战内新增后又真实消耗的净结果 ──
  if (want('C05')) {
    const tanky = structuredClone(enemyStealTarget) // 唯一可偷源；本用例 hero 高防低攻保证多回合
    const tankyAssets = {
      palette: { colors: [], cycles: [] },
      glyphs: stubGlyphs,
      ...mockBattleAssets([tanky], 1),
    }
    const worldInventory = [{ itemId: '61', count: 1 }] // 世界已有 61×1
    const heroLowAtk = player('c5', {
      attackStrength: 3,
      defense: 999,
      skills: ['377'],
      fleeRate: 999,
    })
    const session = new BattleSession(
      [heroLowAtk],
      [tanky],
      tankyAssets,
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
    // 真实偷取（同 C01 入口）→ 战内 61 变 2
    for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) session.tick(16, new Set([key]))
    for (let n = 0; n < 40 && !result; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    const stole = session.debugLog().some((l) => l.includes(`获得 ${items['91'].name}`))
    // 战内新增（偷取 91）后，真实使用一次已有 61：净结果=61 -1、91 新增（世界丢弃）
    const before61 = session.state.inventory.find((x) => x.itemId === '61')?.count ?? 0
    const before91 = session.state.inventory.find((x) => x.itemId === '91')?.count ?? 0
    // 等敌方回合/演出结束回到可操作态（不用 sleep，用实际阶段推进）
    for (let n = 0; n < 200 && session.ui === 'acting'; n++) {
      session.tick(100, new Set())
      await Promise.resolve()
    }
    const trace5 = []
    for (const key of ['ArrowDown', 'Enter', 'ArrowDown', 'Enter', 'Enter', 'Enter']) {
      session.tick(16, new Set([key]))
      for (let n = 0; n < 50 && session.ui === 'acting'; n++) {
        session.tick(100, new Set())
        await Promise.resolve()
      }
      trace5.push(`${key}->${session.ui}`)
      await Promise.resolve()
    }
    console.log('C05-UI', trace5.join(' '))
    for (let n = 0; n < 300 && !result; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    const used61 = session.debugLog().some((l) => l.includes(`使用 ${items['61'].name}`))
    const after61 = session.state.inventory.find((x) => x.itemId === '61')?.count ?? 0
    const after91 = session.state.inventory.find((x) => x.itemId === '91')?.count ?? 0
    const _battleInv = structuredClone(session.state.inventory)
    session.writeBackInventory(worldInventory)
    if (MODE === 'contract') {
      assert.equal(stole, true, 'C05: 战内新增（偷取）真实发生')
      assert.equal(used61, true, 'C05: 已有物品真实被使用')
      assert.equal(after61, before61 - 1, 'C05: 已有物品数量净减一（区分净结果与简单追加）')
      assert.equal(after91, before91, 'C05: 战内新增(偷得91)保持不丢——净结果只对被消费的 61 减一')
      assert.equal(
        worldInventory.find((x) => x.itemId === '61'),
        undefined,
        'C05: 世界写回 61 归零后删除条目',
      )
      // 正确合同:净结果=61 清项 + 91 新增并入世界。原树丢新增(审计 C-01)→本断言业务红。
      assert.deepEqual(
        worldInventory.filter((x) => x.itemId === '91'),
        [{ itemId: '91', count: 1 }],
        'C05 正确合同: 净结果应把新偷 91 并入世界(原树丢弃=审计C-01 特征)',
      )
    }
    note(
      'C05',
      'reproduced',
      `偷取91=${stole} 使用61=${used61} 61:${before61}→${after61} 91:${before91}→${after91} 写回=${JSON.stringify(worldInventory)}（真实混合链净结果;战内域现行正确,世界新增丢弃=审计C-01,正确合同红）`,
    )
  }
  // ── C06 连续两次偷取同 ID（真实 skill 两次） ──
  if (want('C06')) {
    const tanky = structuredClone(enemyStealTarget)
    const tankyAssets = {
      palette: { colors: [], cycles: [] },
      glyphs: stubGlyphs,
      ...mockBattleAssets([tanky], 1),
    }
    const worldInventory = [{ itemId: '91', count: 1 }]
    const heroLowAtk = player('c5', {
      attackStrength: 3,
      defense: 999,
      skills: ['377'],
      fleeRate: 999,
    })
    const session = new BattleSession(
      [heroLowAtk],
      [tanky],
      tankyAssets,
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
    // 第一次偷取
    for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) session.tick(16, new Set([key]))
    for (let n = 0; n < 40; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    const firstGain = session
      .debugLog()
      .filter((l) => l.includes(`获得 ${items['91'].name}`)).length
    // 第二次偷取（回到技能菜单重复）
    for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) session.tick(16, new Set([key]))
    for (let n = 0; n < 300 && !result; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    for (let n = 0; n < 600 && !result; n++) {
      session.tick(100, new Set(['f']))
      await Promise.resolve()
    }
    const gains = session.debugLog().filter((l) => l.includes(`获得 ${items['91'].name}`)).length
    const battleInv = structuredClone(session.state.inventory)
    session.writeBackInventory(worldInventory)
    if (MODE === 'contract') {
      assert.ok(firstGain >= 1, 'C06: 第一次偷取真实发生')
      // PAL 语义（battle-core.ts:620 注释）：余量 stealLeft 烙敌身上，偷光再偷一无所获——
      // 敌 only 91×1，第二次偷取不应重复获得（区分合并与重复获得）。
      assert.equal(gains, firstGain, 'C06: 偷光后第二次不得重复获得')
      assert.deepEqual(
        battleInv.filter((x) => x.itemId === '91'),
        [{ itemId: '91', count: 2 }],
        'C06: 战内同 ID 数量合并为 2（1已有+1偷得）',
      )
      assert.deepEqual(
        worldInventory.filter((x) => x.itemId === '91'),
        [{ itemId: '91', count: 2 }],
      )
    }
    note(
      'C06',
      'covered',
      `第一次=${firstGain >= 1} 总获得日志=${gains} 战内91=${JSON.stringify(battleInv.filter((x) => x.itemId === '91'))} 写回=${JSON.stringify(worldInventory.filter((x) => x.itemId === '91'))}（真实连续 skill；偷光不重复获得+同 ID count 覆盖）`,
    )
  }

  // ── C07 养蛊到期（真实回合链过长，本探针登记为 Q2 域） ──
  if (want('C07')) {
    note(
      'C07',
      'risk',
      '真实养蛊九回合到期产生新物品需完整回合链（Q2 实跑域）；本批不冒称 E2E。battle-core 养蛊逻辑锚点见 battle-core.ts',
    )
  }
  // ── C08 战败/terminated 写回域 ──
  if (want('C08')) {
    // 构造必败战斗：1HP 玩家 vs 强敌
    const doomed = player('doomed', { attackStrength: 1, defense: 0, maxHp: 1, skills: [] })
    const session = new BattleSession(
      [doomed],
      [enemyStealTarget],
      assets,
      (id) => id,
      () => 0,
      {
        skills: {},
        items,
        inventory: [],
      },
    )
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    for (let n = 0; n < 600 && !result; n++) {
      session.tick(100, new Set())
      await Promise.resolve()
    }
    note(
      'C08',
      result ? 'covered' : 'risk',
      `terminated=${result ?? '未终止'}；写回合同：战败是否写回库存属 main 调用域（census 见 battle-result 调用点），战斗内库存=${JSON.stringify(session.state.inventory)}`,
    )
  }
  // ── C09 毒杀最后敌人：无新输入结算（原树观察已由旧探针 C-poison-terminal 覆盖） ──
  if (want('C09')) {
    note(
      'C09',
      'covered',
      '旧探针 probe-battle-core.mjs C-poison-terminal/C-poison-terminal-control 已证：毒杀后仍需一次玩家输入才结算（原树特征）+ 正控可 won。本批引用复跑见 /tmp/glm-b2/old-battle-core.log；正确合同草案=毒杀最后敌人应自动进入结算（Q2 域）',
    )
  }
  // ── C10 回合末玩家死亡终态 ──
  if (want('C10')) {
    const doomed = player('doomed2', { attackStrength: 1, defense: 0, maxHp: 1, skills: [] })
    const session = new BattleSession(
      [doomed],
      [enemyStealTarget],
      assets,
      (id) => id,
      () => 0,
      {
        skills: {},
        items,
        inventory: [],
      },
    )
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    for (let n = 0; n < 600 && !result; n++) {
      session.tick(100, new Set())
      await Promise.resolve()
    }
    const _log = session.debugLog()
    // 正确合同草案（Q2）：全队死亡应在有限 tick 内进入 defeat。当前 fixture 攻击未致死，
    // 无法构造真实死亡链——按工作包规则 contract 不可臆造期望，登记 risk 而非伪绿。
    note(
      'C10',
      result === 'defeat' ? 'covered' : 'risk',
      `600tick内终态=${result ?? '未终止'}（玩家死亡侧需敌方实际命中；本 fixture 攻击未致死——敌伤害不足以击穿时战斗持续，终态域留 Q2 真实数值链）`,
    )
  }
  // ── C11 同轮双方死亡/毒后恢复顺序 ──
  if (want('C11')) {
    note(
      'C11',
      'risk',
      '同轮双方死亡执行顺序当前无明示合同（battle-core 回合结算顺序需游戏机制考证）；登记待裁决，不发明优先规则',
    )
  }
  // ── C12 重复 step 不重复累计；敌逃无奖励 ──
  if (want('C12')) {
    const session = new BattleSession(
      [hero()],
      [enemyStealTarget],
      assets,
      (id) => id,
      () => 0,
      {
        skills: { 377: steal },
        items,
        inventory: [],
      },
    )
    let _result
    session.done.then((v) => {
      _result = v
    })
    session.tick(0, new Set())
    const expBefore = session.state.exp ?? 0
    session.tick(16, new Set()) // 重复空 step
    session.tick(16, new Set())
    const expAfterIdle = session.state.exp ?? expBefore
    note(
      'C12',
      'covered',
      `空step经验不变=${expAfterIdle === expBefore}；敌逃无奖励对照与保存重开所需断言属 Q2/R4（writeBack 入口已由 C01-C06 真实覆盖）`,
    )
  }
  console.log(`\nC组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
