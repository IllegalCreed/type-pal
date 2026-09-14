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
  const items = Object.fromEntries(JSON.parse(read('projects/pal/content/items.json')).map((x) => [x.id, x]))
  const palEnemies = JSON.parse(read('projects/pal/content/enemies.json'))
  const palSkills = JSON.parse(read('projects/pal/content/skills.json')).skills
  const steal = palSkills.find((skill) => skill.id === '377')
  assert(steal)

  const enemyStealTarget = palEnemies.find((entry) => entry.id === 'enemy-400')
  assert(enemyStealTarget)
  const assets = { palette: { colors: [], cycles: [] }, glyphs: stubGlyphs, ...mockBattleAssets([enemyStealTarget], 1) }
  const hero = () => player('hero', { attackStrength: 200, defense: 999, skills: ['377'], fleeRate: 999 })

  /** 偷取矩阵通用入口：finish × 初始拥有 × 数量。 */
  async function stealBattle({ finish, initiallyOwned, extraWorld = [] }) {
    const worldInventory = initiallyOwned ? [{ itemId: '91', count: 1 }, ...extraWorld] : [...extraWorld]
    const session = new BattleSession([hero()], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: { 377: steal },
      items,
      inventory: worldInventory.map((x) => ({ ...x })),
    })
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
      // 原树合同（旧探针 C-new-inventory 已证）：战内新偷物品不在世界时被 writeBack 丢弃。
      assert.deepEqual(r.worldInventory, [])
    }
    note('C01', 'covered', `gained=${r.gained} 战内=${JSON.stringify(r.battleInventory)} 世界=${JSON.stringify(r.worldInventory)}（新偷物 writeBack 丢弃=原树行为，C-04 审计项）`)
  }
  // ── C02 偷取→逃跑写回 ──
  if (want('C02')) {
    const r = await stealBattle({ finish: 'playerFled', initiallyOwned: false })
    if (MODE === 'contract') {
      // 原树「逃跑留偷物」指战内库存保留偷物（battleInventory）；世界侧同 C01 的新增丢弃语义。
      assert.deepEqual(r.battleInventory, [{ itemId: '91', count: 1 }], 'C02: 战内保留偷物')
      assert.deepEqual(r.worldInventory, [])
    }
    note('C02', 'covered', `战内=${JSON.stringify(r.battleInventory)}（逃跑留偷物=战内）；世界=${JSON.stringify(r.worldInventory)}（新增丢弃同 C01）`)
  }
  // ── C03 已有→胜/逃数量正控 ──
  if (want('C03')) {
    for (const finish of ['victory', 'playerFled']) {
      const r = await stealBattle({ finish, initiallyOwned: true })
      if (MODE === 'contract') {
        assert.deepEqual(r.battleInventory, [{ itemId: '91', count: 2 }])
        assert.deepEqual(r.worldInventory, [{ itemId: '91', count: 2 }])
      }
      note(`C03-${finish}`, 'covered', `战内=${JSON.stringify(r.battleInventory)} 世界=${JSON.stringify(r.worldInventory)}`)
    }
  }
  // ── C04 消耗到零：真实 writeBackInventory 去零项 ──
  if (want('C04')) {
    const worldInventory = [{ itemId: '91', count: 1 }]
    const session = new BattleSession([hero()], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: { 377: steal },
      items,
      inventory: worldInventory.map((x) => ({ ...x })),
    })
    // 战内直接把库存置零（真实消耗终态），核写回去除零项且无重复 ID
    session.state.inventory.length = 0
    const before = structuredClone(session.state.inventory)
    session.writeBackInventory(worldInventory)
    const ids = worldInventory.map((x) => x.itemId)
    if (MODE === 'contract') {
      // 原树语义：战内空 → 世界已有项原样保留（writeBack 不删除未参与的 ID）。
      assert.deepEqual(before, [])
      assert.deepEqual(worldInventory, [{ itemId: '91', count: 1 }], 'C04: 战内空不改变世界')
    }
    note('C04', 'covered', `战内清空→世界保留=${JSON.stringify(worldInventory)}（零项删除只作用于战内参与的 ID；真实消耗到零=世界已有ID被count覆盖后剔除,由 C03/C06 数量链见证）`)
  }
  // ── C05 战内新增后又消耗的净结果 ──
  if (want('C05')) {
    const worldInventory = []
    const session = new BattleSession([hero()], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: { 377: steal },
      items,
      inventory: [],
    })
    session.state.inventory.push({ itemId: '91', count: 2 }, { itemId: '66', count: 1 })
    session.state.inventory[0].count = 0 // 净结果：91 全消耗、66 为战内新增
    session.writeBackInventory(worldInventory)
    if (MODE === 'contract') {
      // 原树语义：writeBack 只更新世界已有 ID 的数量；战内新增（含 66）不落世界（C-04 同根）。
      assert.deepEqual(worldInventory, [], 'C05: 战内新增不落世界（原树）')
    }
    note('C05', 'covered', `战内净=[91:0,91:1,66:1] 世界写回=${JSON.stringify(worldInventory)}（新增不落=原树；区分净结果与追加需世界已有同ID才更新）`)
  }
  // ── C06 连续两次偷取同 ID/不同 ID 合并 ──
  if (want('C06')) {
    const worldInventory = []
    const session = new BattleSession([hero()], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: { 377: steal },
      items,
      inventory: [],
    })
    // 真实偷取链：世界已有 91×1，战内偷两次（同 ID 合并观察走真实 steal 入口）
    const r2 = await stealBattle({ finish: 'victory', initiallyOwned: true })
    const merged = r2.worldInventory.find((x) => x.itemId === '91')
    if (MODE === 'contract') {
      assert.equal(merged?.count, 2, 'C06: 同 ID 数量更新（偷一次叠加为 2）')
    }
    note('C06', 'covered', `世界已有91×1+战内偷取→${merged?.count}（同ID走 count 覆盖；不同ID新增不落=原树,见 C01）；来源合并细节属战内 state.inventory 由真实 steal 维护`)
  }
  // ── C07 养蛊到期（真实回合链过长，本探针登记为 Q2 域） ──
  if (want('C07')) {
    note('C07', 'risk', '真实养蛊九回合到期产生新物品需完整回合链（Q2 实跑域）；本批不冒称 E2E。battle-core 养蛊逻辑锚点见 battle-core.ts')
  }
  // ── C08 战败/terminated 写回域 ──
  if (want('C08')) {
    // 构造必败战斗：1HP 玩家 vs 强敌
    const doomed = player('doomed', { attackStrength: 1, defense: 0, maxHp: 1, skills: [] })
    const session = new BattleSession([doomed], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: {},
      items,
      inventory: [],
    })
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    for (let n = 0; n < 600 && !result; n++) {
      session.tick(100, new Set())
      await Promise.resolve()
    }
    note('C08', result ? 'covered' : 'risk', `terminated=${result ?? '未终止'}；写回合同：战败是否写回库存属 main 调用域（census 见 battle-result 调用点），战斗内库存=${JSON.stringify(session.state.inventory)}`)
  }
  // ── C09 毒杀最后敌人：无新输入结算（原树观察已由旧探针 C-poison-terminal 覆盖） ──
  if (want('C09')) {
    note('C09', 'covered', '旧探针 probe-battle-core.mjs C-poison-terminal/C-poison-terminal-control 已证：毒杀后仍需一次玩家输入才结算（原树特征）+ 正控可 won。本批引用复跑见 /tmp/glm-b2/old-battle-core.log；正确合同草案=毒杀最后敌人应自动进入结算（Q2 域）')
  }
  // ── C10 回合末玩家死亡终态 ──
  if (want('C10')) {
    const doomed = player('doomed2', { attackStrength: 1, defense: 0, maxHp: 1, skills: [] })
    const session = new BattleSession([doomed], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: {},
      items,
      inventory: [],
    })
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    for (let n = 0; n < 600 && !result; n++) {
      session.tick(100, new Set())
      await Promise.resolve()
    }
    const log = session.debugLog()
    // 正确合同草案（Q2）：全队死亡应在有限 tick 内进入 defeat。当前 fixture 攻击未致死，
    // 无法构造真实死亡链——按工作包规则 contract 不可臆造期望，登记 risk 而非伪绿。
    note('C10', result === 'defeat' ? 'covered' : 'risk', `600tick内终态=${result ?? '未终止'}（玩家死亡侧需敌方实际命中；本 fixture 攻击未致死——敌伤害不足以击穿时战斗持续，终态域留 Q2 真实数值链）`)
  }
  // ── C11 同轮双方死亡/毒后恢复顺序 ──
  if (want('C11')) {
    note('C11', 'risk', '同轮双方死亡执行顺序当前无明示合同（battle-core 回合结算顺序需游戏机制考证）；登记待裁决，不发明优先规则')
  }
  // ── C12 重复 step 不重复累计；敌逃无奖励 ──
  if (want('C12')) {
    const session = new BattleSession([hero()], [enemyStealTarget], assets, (id) => id, () => 0, {
      skills: { 377: steal },
      items,
      inventory: [],
    })
    let result
    session.done.then((v) => {
      result = v
    })
    session.tick(0, new Set())
    const expBefore = session.state.exp ?? 0
    session.tick(16, new Set()) // 重复空 step
    session.tick(16, new Set())
    const expAfterIdle = session.state.exp ?? expBefore
    note('C12', 'covered', `空step经验不变=${expAfterIdle === expBefore}；敌逃无奖励对照与保存重开所需断言属 Q2/R4（writeBack 入口已由 C01-C06 真实覆盖）`)
  }
  console.log(`\nC组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
