// Codex takeover: shared read-only host/AST fixtures, never replacement business logic.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const root = new URL('../../../../', import.meta.url)
export const readSource = (path) => {
  const source = readFileSync(new URL(path, root), 'utf8')
  if (process.env.B2_WITNESS === 'drop-live-map' && path === 'packages/reforge/src/main.ts') {
    const from = 'map = assets.map'
    assert.equal(source.split(from).length, 2, '唯一现场提交反控')
    return source.replace(from, '/* witness: missing live map commit */')
  }
  if (process.env.B2_WITNESS === 'dump-wrapper' && path === 'packages/reforge/src/main.ts') {
    const from = 'dumpSave: buildCurrentSavePayload'
    assert.equal(source.split(from).length, 2, '唯一注册点反控')
    return source.replace(from, 'dumpSave: captureCurrentSavePayload')
  }
  return source
}
export const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

export function actualDeclarations(path, names, env) {
  const source = readSource(path)
  const ast = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  assert.equal(ast.parseDiagnostics.length, 0, `invalid parse for ${path}`)
  const wanted = new Set(names),
    found = new Map()
  const visit = (node) => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      wanted.has(node.name.text)
    ) {
      assert.ok(!found.has(node.name.text), `ambiguous ${node.name.text}`)
      found.set(
        node.name.text,
        ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(found.size, wanted.size, `missing actual declaration in ${path}`)
  const js = ts.transpileModule([...found.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function('env', `with(env) { ${js}; return {${names.join(',')}}; }`)(env)
}

export function callSites(path, name) {
  const source = readSource(path),
    rows = []
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === name
    )
      rows.push({
        path,
        line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
        call: node.getText(ast),
      })
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return rows
}

export function actualProperty(path, name, env) {
  const source = readSource(path),
    found = []
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === name)
      found.push(node.initializer.getText(ast))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(found.length, 1, `unique actual property ${name}`)
  const js = ts.transpileModule(`const value = ${found[0]};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function('env', `with(env){${js};return value;}`)(env)
}

export async function preflightHarness(server) {
  const load = (path) => server.ssrLoadModule(path)
  const content = await load('/../content/src/index.ts')
  const { expectDefined } = await load('/src/defined.ts')
  const { Canvas2DRenderer } = await load('/src/render.ts')
  const views = await load('/src/runtime-project-view.ts')
  const deps = await load('/src/scene-switch-transaction.ts')
  const { resolveSceneSpawn } = await load('/src/scene-transition.ts')
  const { SceneEntrySession } = await load('/src/scene-entry-session.ts')
  const hook = (label, reveal) => ({
    label,
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [], entry: { prepare: [], reveal } }],
    },
  })
  const definition = {
    id: 'target',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: {
        initial: 'before',
        variants: {
          before: hook('before', { kind: 'fade', outMs: 10, inMs: 10 }),
          after: hook('after', { kind: 'cut' }),
        },
      },
    },
  }
  const actor = {
    id: 'hero',
    name: 'hero',
    spriteId: 'sprite',
    battler: {
      baseStats: {
        level: 1,
        hp: 10,
        maxHP: 10,
        mp: 5,
        maxMP: 5,
        attack: 1,
        defense: 1,
        magicAttack: 1,
        speed: 1,
        luck: 1,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: 'battle.hero',
    },
  }
  const world = content.buildWorld({ party: ['hero'], money: 0, inventory: [] }, { hero: actor })
  const entered = deferred(),
    assets = deferred()
  const session = new SceneEntrySession()
  let reads = 0
  const env = {
    ...content,
    ...views,
    ...deps,
    world,
    canonicalScript: world.script,
    Canvas2DRenderer,
    resolveSceneSpawn,
    expectDefined,
    actorSpriteOverrides: new Map(),
    project: { actorsById: { hero: actor } },
    ctx: {},
    getCanonicalScene: async () => definition,
    requireSpriteDef: () => ({ id: 'sprite', asset: 'sprite.asset' }),
    getMapAssets: async () => {
      reads++
      entered.resolve()
      await assets.promise
      return { map: { width: 1, height: 1 }, tilesets: new Map() }
    },
    getStandardPalette: async () => ({ colors: [] }),
    spriteCache: { load: async () => ({ frames: [] }) },
    prepareSceneSounds: async () => {},
    sceneEntrySession: session,
    assertRunnerActive: (signal) => signal?.throwIfAborted(),
    markSceneLoad() {},
  }
  const api = actualDeclarations(
    'packages/reforge/src/main.ts',
    [
      'getSceneDef',
      'runnableStages',
      'sceneScriptBinding',
      'bindingSceneEntry',
      'prepareSceneSwitch',
      'assertSceneSwitchPlanCurrent',
      'hostSceneEntryReveal',
    ],
    env,
  )
  return {
    api,
    env,
    world,
    definition,
    entered,
    assets,
    session,
    content,
    views,
    reads: () => reads,
  }
}

export async function reloadHarness(server, world, scene, getMapAssets) {
  const intents = await server.ssrLoadModule('/src/async-intent.ts')
  const { Canvas2DRenderer } = await server.ssrLoadModule('/src/render.ts')
  const oldMap = { width: 1, height: 1, tag: 'old' },
    oldRenderer = { tag: 'old' }
  const env = {
    ...intents,
    Canvas2DRenderer,
    world,
    canonicalScript: world.script,
    scene,
    getMapAssets,
    scriptMutationIntent: new intents.AsyncIntentController(),
    ctx: {},
    palette: { colors: [] },
    map: oldMap,
    tiles: new Map(),
    renderer: oldRenderer,
    waveRenderer: { tag: 'old' },
    room: { col: 0, row: 0, cols: 1, rows: 1 },
  }
  Object.assign(
    env,
    actualDeclarations('packages/reforge/src/main.ts', ['assertRunnerActive', 'awaitRunner'], env),
  )
  const reload = actualProperty('packages/reforge/src/main.ts', 'reloadMap', env)
  return { env, reload, oldMap, oldRenderer }
}

// Only this direct CLI writes generated evidence logs. Fixture imports never spawn processes.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.includes('--collect'), 'Usage: node --import tsx ...support.mjs --collect')
  const repo = fileURLToPath(root),
    logs = mkdtempSync(join(tmpdir(), 'type-pal-b2-evidence-'))
  const names = {
    A: 'async',
    B: 'barrier',
    C: 'battle-result',
    D: 'battle-actions',
    E: 'migration',
    F: 'coverage',
  }
  const probes = Object.fromEntries(
    Object.entries(names).map(([g, n]) => [g, `docs/ops/audits/pre-e2e/probe-glm-next-${n}.mjs`]),
  )
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
  const codeHashes = Object.fromEntries(
    [
      ...Object.values(probes),
      'docs/ops/audits/pre-e2e/probe-glm-next-support.mjs',
      'docs/ops/audits/pre-e2e/probe-glm-next.config.mts',
    ].map((p) => [p, sha(readFileSync(new URL(p, root)))]),
  )
  const requirements = new Map(
    [
      ...readSource('docs/testing/glm-pre-e2e-boundary-batch-2.md').matchAll(
        /^\| ([A-F]\d{2}) \| (.+) \|$/gm,
      ),
    ].map((m) => [m[1], m[2]]),
  )
  assert.equal(requirements.size, 72)
  const run = (label, path, args = [], timeout = 30_000) => {
    const r = spawnSync(process.execPath, ['--import', 'tsx', path, ...args], {
      cwd: repo,
      encoding: 'utf8',
      timeout,
      maxBuffer: 16 * 1024 * 1024,
    })
    const output = (r.stdout ?? '') + (r.stderr ?? '')
    writeFileSync(join(logs, `${label}.log`), output)
    if (r.error || r.signal) throw new Error(`${label}: host failure ${r.error ?? r.signal}`)
    const notes = (r.stdout ?? '')
      .split('\n')
      .filter((x) => x.startsWith('{"id":'))
      .map((x) => JSON.parse(x))
    return {
      exit: r.status,
      output,
      notes,
      log: join(logs, `${label}.log`),
      logSha256: sha(output),
      command: ['node', '--import', 'tsx', path, ...args],
    }
  }
  const production = {
    A: [
      'packages/reforge/src/script-project-core.ts:199',
      'packages/reforge/src/scene-switch-transaction.ts:31',
      'packages/reforge/src/main.ts:1000',
    ],
    B: [
      'packages/reforge/src/runtime-script-project.ts:447',
      'packages/reforge/src/main.ts:5145',
      'packages/reforge/src/main.ts:5580',
      'packages/reforge/src/main.ts:5682',
    ],
    C: [
      'packages/reforge/src/battle/battle-core.ts:1068',
      'packages/reforge/src/battle/battle-session.ts:2450',
    ],
    D: [
      'packages/reforge/src/battle/battle-core.ts:1198',
      'packages/reforge/src/battle/battle-core.ts:2709',
      'packages/reforge/src/battle/battle-session.ts:1408',
    ],
    E: [
      'packages/migrate/src/migration-transaction.ts:290',
      'packages/migrate/src/migration-write-plan.ts:25',
      'packages/migrate/src/pal-assets.ts:1235',
    ],
    F: ['scripts/coverage/config.mjs:1', 'scripts/coverage/baseline.fast.json:1'],
  }
  const followUp = (id) => {
    if (['A01', 'A02', 'A03', 'A04'].includes(id)) return 'B-05 当前地图覆写原子性'
    if (['A05', 'A06', 'A07', 'A08'].includes(id)) return 'B-08 canonical entry依赖'
    if (id[0] === 'A') return 'B-09 selector取消'
    if (['B08', 'B09', 'B10'].includes(id)) return 'U-02主壳旧finally权威；未证合法交错保留risk'
    if (['B11', 'B12'].includes(id)) return 'Q1/R4检查点导出与恢复'
    if (id[0] === 'B') return 'B-06/B-07保存屏障'
    if (/^C0[1-7]$/.test(id)) return 'C-01库存写回与Q2子矩阵'
    if (id[0] === 'C') return 'C-04/Q2终态与写回所有权'
    if (/^D0[1-4]$/.test(id)) return 'C-02敌附带效果'
    if (/^D0[5-8]$/.test(id)) return 'C-03/Q2合法技能目标组合'
    if (id[0] === 'D') return 'C-05/Q2物品菜单与预占'
    if (/^E0[1-4]$/.test(id)) return 'A-08迁移提交前置条件'
    if (/^E0[5-8]$/.test(id)) return 'A-09物化路径防护'
    if (id[0] === 'E') return 'E-05/N6b前旧接口退役候选，未批准删除'
    return '各包非视觉测试候选；第一阶段独立，Q2/R4/N6b按既定队列'
  }
  const controls = {
    A02: ['A01'],
    A03: ['A01'],
    A05: ['A06', 'A07'],
    A08: ['A06'],
    A09: ['A07'],
    A10: ['A10-ok'],
    A11: ['A11-ok'],
    A12: ['A12-ok'],
    B01: ['B02', 'B05'],
    B03: ['B04', 'B05'],
    B08: ['B10'],
    B09: ['B10'],
    B11: ['B12'],
    C01: ['C03'],
    C02: ['C03'],
    C07: ['C05'],
    C09: ['C10', 'C11', 'C12'],
    D02: ['D01', 'D04'],
    D03: ['D01', 'D04'],
    D05: ['D06', 'D07'],
    D08: ['D06', 'D07'],
    D09: ['D10', 'D11', 'D12'],
    E02: ['E01', 'E03'],
    E06: ['E05'],
    E07: ['E05'],
    E08: ['E05', 'E03'],
  }
  const rows = []
  for (const [group, path] of Object.entries(probes)) {
    const single = group === 'F' ? run('F-static', path) : null
    if (single) assert.equal(single.exit, 0)
    for (let i = 1; i <= 12; i++) {
      const id = group + String(i).padStart(2, '0')
      const obs = single ?? run(`${id}-observe`, path, ['--mode=observe', '--case', id])
      assert.equal(obs.exit, 0, `${id}: observe前提/环境失败，不能算业务复现；见${obs.log}`)
      const notes = obs.notes.filter((x) => x.id === id || x.id.startsWith(`${id}-`))
      assert.ok(notes.length > 0, `${id}: 没有执行见证`)
      const con = single ? null : run(`${id}-contract`, path, ['--mode=contract', '--case', id])
      const classification = notes.some((x) => x.verdict === 'reproduced')
        ? 'reproduced'
        : notes.some((x) => x.verdict === 'risk')
          ? 'risk'
          : 'covered'
      if (con) {
        assert.equal(
          con.exit,
          { covered: 0, reproduced: 1, risk: 2 }[classification],
          `${id}: observation/contract不一致；见${con.log}`,
        )
        if (con.exit === 1) assert.match(con.output, /AssertionError/, `${id}: 不是业务断言红`)
      }
      const text = readSource(path),
        at = text.indexOf(`'${id}'`)
      rows.push({
        id,
        group,
        classification,
        requirement: requirements.get(id),
        sourceAnchors: [
          `${path}:${text.slice(0, Math.max(0, at)).split('\n').length}`,
          ...production[group],
        ],
        frozenProduct: '70e3f62770bbe0a23c4b9d90c31258a3d2883772',
        probeSha256: codeHashes[path],
        observeCommand: obs.command,
        observeExit: obs.exit,
        contractCommand: con?.command ?? null,
        contractExit: con?.exit ?? null,
        contractRedMeaning:
          con?.exit === 1 ? con.output.split('\n').find((x) => x.includes('AssertionError')) : null,
        contractScope:
          classification === 'risk'
            ? '未证完整正确性；exit2明确未判定，不算通过'
            : '当前正确行为合同',
        positiveControl: { cases: controls[id] ?? [id], evidence: notes.map((x) => x.detail) },
        followUp: followUp(id),
        logs: {
          observe: obs.log,
          contract: con?.log ?? null,
          observeSha256: obs.logSha256,
          contractSha256: con?.logSha256 ?? null,
        },
        notes,
      })
    }
    process.stderr.write(`validated group ${group}\n`)
  }
  const tally = {}
  for (const row of rows) tally[row.classification] = (tally[row.classification] ?? 0) + 1
  const oracleRun = run('oracles', 'docs/ops/audits/pre-e2e/probe-glm-next.config.mts', [], 120_000)
  assert.equal(oracleRun.exit, 0, `隔离反控失败；见${oracleRun.log}`)
  const oracles = JSON.parse(oracleRun.output)
  assert.equal(oracles.rows.length, 13)
  for (const [path, expectedHash] of Object.entries(codeHashes)) {
    assert.equal(sha(readFileSync(new URL(path, root))), expectedHash, `取证期间源码变化: ${path}`)
  }
  for (const row of rows) {
    const direct = oracles.rows.filter((x) => x.id === row.id)
    row.negativeControl = {
      executedBy: direct.length ? 'Codex' : null,
      direct,
      scope: direct.length
        ? '仅这些隔离见证，不等于完整修复已验证'
        : '本ID未另做单点突变；六组鉴别力见meta.oracles，不冒称逐项负控',
    }
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        meta: {
          package: 'pre-e2e-boundary-batch-2',
          revision: 'r1-Codex-takeover',
          generatedAt: new Date().toISOString(),
          frozenProduct: '70e3f62770bbe0a23c4b9d90c31258a3d2883772',
          contributors: ['GLM initial probes', 'Codex corrections and validation'],
          logs,
          caseExecutions: 121,
          oracleExecutions: 13,
          executions: 134,
          tally,
          codeHashes,
          oracles: {
            ...oracles,
            command: oracleRun.command,
            log: oracleRun.log,
            logSha256: oracleRun.logSha256,
          },
        },
        rows,
      },
      null,
      2,
    )}\n`,
  )
}
