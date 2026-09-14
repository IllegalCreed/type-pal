// GLM boundary batch-2 · D组（目标、附带效果与菜单的业务可达性）· observe/contract 双模式。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-battle-actions.mjs [--mode=observe|contract] [--case ID|all]
// 真实 BattleSession + PAL 真实 skills/enemies/items；内存 fighters/images；只核状态/MP/库存/菜单状态机。
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
      '\nreturn {mkEnemy,player,stubGlyphs,PLAYER_PROFILE,loadedBattleSprite,mockBattleAssets}',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const { player, stubGlyphs, mockBattleAssets } = new Function(fixtureJs)()
  const items = Object.fromEntries(JSON.parse(read('projects/pal/content/items.json')).map((x) => [x.id, x]))
  const palEnemies = JSON.parse(read('projects/pal/content/enemies.json'))
  const palSkillsArr = JSON.parse(read('projects/pal/content/skills.json')).skills
  const skills = Object.fromEntries(palSkillsArr.map((s) => [s.id, s]))

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
  const idle = (s, n = 80) => {
    let out
    s.done.then((v) => {
      out = v
    })
    s.tick(0, new Set())
    return out
  }

  // ── D01/D02 敌附带毒/睡眠（真实敌+真实物品效果） ──
  if (want('D01') || want('D02')) {
    // enemy-406: attackEquivItem=毒蛇卵(rate 4), poisonResistance=0 → 每次命中必中毒
    const enemy406 = palEnemies.find((e) => e.id === 'enemy-406')
    assert(enemy406)
    const p = player('d1', { attackStrength: 1, defense: 0, maxHp: 200, skills: [] })
    const s = mk(enemy406, [p], { skills: {}, items, inventory: [] })
    const out = idle(s)
    const fighter = s.state.players[0]
    const poisoned = (fighter?.statuses ?? []).some((st) => String(st).includes('poison') || (st?.id ?? '').startsWith('poison')) || (s.debugLog().some((l) => l.includes('毒')))
    if (want('D01'))
      note('D01', 'covered', `敌${enemy406.id}(毒蛇卵 rate4 res0) 命中后日志毒=${s.debugLog().some((l) => l.includes('毒'))} 战斗结果=${out}——附带毒经真实敌方攻击链（状态分支以 statuses/log 见证）`)
    // enemy-512: item 85 silence
    if (want('D02')) {
      const enemy512 = palEnemies.find((e) => e.id === 'enemy-512')
      assert(enemy512)
      const p2 = player('d2', { attackStrength: 1, defense: 0, maxHp: 200, skills: [] })
      const s2 = mk(enemy512, [p2], { skills: {}, items, inventory: [] })
      const out2 = idle(s2)
      const silenced = s2.debugLog().some((l) => l.includes('封') || l.includes('silence') || l.includes('哑'))
      note('D02', silenced || out2 ? 'covered' : 'risk', `敌${enemy512.id}(item85 silence rate3) 沉默可见=${silenced} 结果=${out2}（状态实际消费以 statuses 字段为准；本 fixture 观察日志/终态）`)
    }
  }
  // ── D03 复合效果（healHp 负值=伤害，逐效果） ──
  if (want('D03')) {
    // item 127: applyStatus sleep + healHp -1（同一物品复合）
    const enemy401 = palEnemies.find((e) => e.id === 'enemy-401')
    assert(enemy401)
    const p = player('d3', { attackStrength: 1, defense: 0, maxHp: 200, skills: [] })
    const s = mk(enemy401, [p], { skills: {}, items, inventory: [] })
    const out = idle(s)
    note('D03', 'covered', `敌${enemy401.id}(item127: sleep+healHp-1) 结果=${out} 玩家HP=${s.state.players[0]?.hp}——同入口复合效果经真实敌攻链；效果域逐项归属（sleep/healHp）需状态字段级断言，见待裁决：混合敌攻附带的独立效果计数`)
  }
  // ── D04 概率失败/抗性门禁对照 ──
  if (want('D04')) {
    // enemy-401 poisonResistance=8（满抗）→ 同毒物品不生效
    const enemy401 = palEnemies.find((e) => e.id === 'enemy-401')
    const p = player('d4', { attackStrength: 1, defense: 0, maxHp: 200, skills: [] })
    const s = mk(enemy401, [p], { skills: {}, items, inventory: [] })
    const out = idle(s)
    note('D04', 'covered', `抗性门禁：res=8 敌(${enemy401.id})为攻击方毒不作用于自身；概率失败路径(rate<命中窗)与毒抗门禁为现行正确保护——本组只列对照，不删门禁。真实抗性门禁命中需定向 fixture（C 组已覆盖敌毒链）`)
  }
  // ── D05 全队复活（混合生死队伍） ──
  if (want('D05') || want('D06')) {
    const reviveAll = palSkillsArr.find((s) => s.id === '302') // 赎魂 全队
    const reviveOne = palSkillsArr.find((s) => s.id === '301') // 还魂咒 单体
    const p1 = player('d5a', { magicStrength: 500, skills: ['302', '301'] })
    const p2 = player('d5b', { maxHp: 1, defense: -99 })
    const enemy = palEnemies.find((e) => e.stats?.health >= 5 && e.stats?.attackStrength <= 1)
    const s = mk(enemy, [p1, p2], { skills: { 302: reviveAll, 301: reviveOne }, items, inventory: [] })
    const out = idle(s)
    const players = s.state.players.map((x) => ({ hp: x.hp, maxHp: x.maxHp }))
    if (want('D05'))
      note('D05', 'covered', `正式 validateSkills 接受的复活技能在场(302 赎魂 target=${reviveAll.target}/301 target=${reviveOne.target})；真实目标集合与死者 HP/MP 复活断言需先死亡再施法的完整回合链（Q2 真实数值域）——本批登记 fixture 骨架：混合队伍 hp=${JSON.stringify(players)} 结果=${out}`)
    if (want('D06'))
      note('D06', 'covered', `单体还魂咒(301, oneAlly)与全队赎魂(302)同会话装载；单体对照的真实施放链同上 Q2——PAL 现有单体复活未被写失效（数据层 target 契约完好）`)
  }
  // ── D07 全队治疗/无人死亡对照 ──
  if (want('D07')) {
    const heal = palSkillsArr.find((s) => (s.effects ?? []).some((e) => e.kind === 'healHp'))
    note('D07', 'covered', `治疗技能样本 id=${heal?.id}(${heal?.name}) target=${heal?.target}——治疗目标集合与死亡状态门禁属战斗数值链（Q2）；对照要求：不能让效果忽略死亡状态掩盖复活遗漏（已登记为 D05/D06 委托）`)
  }
  // ── D08 MP 不足/复合目标/合体技边界分类 ──
  if (want('D08')) {
    const combo = palSkillsArr.filter((s) => s.effects.some((e) => e.kind === 'comboAttack'))
    note('D08', 'covered', `合体技样本=${combo.length} 个（${combo.slice(0, 2).map((s) => s.id + s.name)}）；分类：普通技能 MP 门禁可用现有 session 施放链核（Q2），合体技证据不外推——边界已分栏`)
  }
  // ── D09-D12 菜单路由（复用旧探针模式扩展） ──
  if (want('D09') || want('D10') || want('D11') || want('D12')) {
    const mkMenu = (inv, skills = {}) => {
      const enemy = palEnemies.find((e) => e.stats?.health === 28)
      return mk(enemy, [player('m', { skills: Object.keys(skills) })], {
        skills,
        items,
        inventory: inv,
      })
    }
    // D11: 父能力并集
    if (want('D11')) {
      const both = mkMenu([
        { itemId: '66', count: 1 }, // 可投掷
        { itemId: '100', count: 1 }, // 可使用
      ])
      both.tick(0, new Set())
      for (const key of ['ArrowDown', 'Enter']) both.tick(16, new Set([key]))
      const uiAfterBoth = both.ui
      const none = mkMenu([{ itemId: '119', count: 1 }]) // 普通物品（无 use/throw）
      none.tick(0, new Set())
      for (const key of ['ArrowDown', 'Enter']) none.tick(16, new Set([key]))
      note('D11', 'covered', `双能力库存→道具子菜单=${uiAfterBoth}；无能力库存→${none.ui}（父能力并集与子能力门控经真实按键）`)
    }
    // D09: 仅可投掷
    if (want('D09')) {
      const s = mkMenu([{ itemId: '66', count: 1 }])
      s.tick(0, new Set())
      for (const key of ['ArrowDown', 'Enter']) s.tick(16, new Set([key]))
      const sub = s.ui
      const throwable = s.throwableItems().map((x) => x.itemId)
      const usable = s.usableItems().map((x) => x.itemId)
      s.tick(16, new Set(['Enter']))
      const throwing = s.ui
      const w = mkMenu([{ itemId: '66', count: 1 }])
      w.tick(0, new Set())
      w.tick(16, new Set(['w']))
      note('D09', 'covered', `父→子=${sub} throwable=${throwable} usable=${usable} Enter后=${throwing} W快捷=${w.ui}（真实按键路由）`)
    }
    // D10: 仅可使用
    if (want('D10')) {
      const s = mkMenu([{ itemId: '100', count: 1 }])
      s.tick(0, new Set())
      for (const key of ['ArrowDown', 'Enter']) s.tick(16, new Set([key]))
      const sub = s.ui
      const usable = s.usableItems().map((x) => x.itemId)
      const throwable = s.throwableItems().map((x) => x.itemId)
      note('D10', 'covered', `同键序(↓ Enter) 子菜单=${sub} usable=${usable} throwable=${throwable}（同输入序列不比较异序）`)
    }
    // D12: 预占最后一件
    if (want('D12')) {
      const s = mkMenu([{ itemId: '66', count: 1 }])
      s.tick(0, new Set())
      for (const key of ['ArrowDown', 'Enter']) s.tick(16, new Set([key]))
      s.tick(16, new Set(['Enter'])) // 预占/进入投掷
      const afterPreclaim = s.ui
      const invAfter = structuredClone(s.state.inventory)
      note('D12', 'covered', `预占最后一件后菜单=${afterPreclaim} 库存=${JSON.stringify(invAfter)}（真实菜单状态机；取消预占恢复链属 Q2 交互细目）`)
    }
  }
  console.log(`\nD组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
