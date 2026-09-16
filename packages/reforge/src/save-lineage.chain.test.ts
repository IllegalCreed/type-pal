import ts from 'typescript'
import { afterEach, expect, test, vi } from 'vitest'
import { confirm, deferred, fixture, flag } from './__tests__/save-lineage-fixture.js'
import { mainApi, mainSource } from './__tests__/world-async-fixture.js'
import type { ProjectScriptHostOptions } from './runtime-script-project.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** Select original AST nodes; only host/battle presentation boundaries below are simulated. */
function selectedSource(predicate: (node: ts.Node, ast: ts.SourceFile) => boolean) {
  const ast = ts.createSourceFile(
    'main.ts',
    mainSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const matches: ts.Node[] = []
  const walk = (node: ts.Node) => {
    if (predicate(node, ast)) matches.push(node)
    ts.forEachChild(node, walk)
  }
  walk(ast)
  expect(matches).toHaveLength(1)
  return matches[0]!.getText(ast)
}

function property(name: string, parameters: string, block: boolean) {
  const full = selectedSource(
    (node, ast) =>
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === name &&
      ts.isArrowFunction(node.initializer) &&
      node.initializer.parameters.map((p) => p.name.getText(ast)).join(',') === parameters &&
      ts.isBlock(node.initializer.body) === block,
  )
  return full.slice(full.indexOf(':') + 1)
}

function evaluate<T>(expression: string, env: object): T {
  const js = ts.transpileModule(`const binding = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function('env', `with(env) { ${js}; return binding; }`)(env) as T
}

test.each([
  'battle',
  'exit',
] as const)('actual main %s adapters preserve the exact signal through nested save activity', async (entry) => {
  vi.useFakeTimers()
  const entered = deferred(),
    answer = deferred<boolean>(),
    cleanup = vi.fn()
  let start!: ProjectScriptHostOptions['startBattle'],
    teleport!: ProjectScriptHostOptions['teleportOut']
  const f = fixture({
    confirm: async () => {
      entered.resolve()
      return answer.promise
    },
    startBattle: (request, signal) => start(request, signal),
    teleportOut: (signal) => teleport(signal),
  })
  const activeParent = { running: true }
  const env = {
    scriptRuntime: f.runtime,
    scene: f.scene,
    runner: activeParent,
    pendingOnEnter: null,
    canonicalSceneCache: new Map([[f.scene.id, f.scene]]),
    assertRunnerActive: (signal: AbortSignal) => {
      expect(signal).toBe(f.signal)
      signal.throwIfAborted()
    },
    expectDefined: <T>(value: T) => {
      expect(value).toBeDefined()
      return value
    },
    dismountParty: cleanup,
    releaseAllAuthority: cleanup,
    drainPendingTouchTrigger: cleanup,
    sceneChangedByScript: false,
    result: 'victory',
    launchSignal: f.signal,
    session: { enemySlotDefs: () => [{ onDefeated: [flag('defeated')] }, { onDefeated: [] }] },
    assertLaunchCurrent: () => f.signal.throwIfAborted(),
    host: {} as Record<string, unknown>,
    runDetachedScriptChain: undefined as unknown,
    startBattleBody: undefined as unknown,
  }
  env.runDetachedScriptChain = mainApi<{ runDetachedScriptChain: unknown }>(
    ['runDetachedScriptChain'],
    [],
    env,
  ).runDetachedScriptChain
  const defeated = selectedSource(
    (node, ast) =>
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === "result === 'victory'" &&
      node.thenStatement.getText(ast).includes('session.enemySlotDefs()'),
  )
  const runDefeated = evaluate<() => Promise<void>>(`async () => { ${defeated} }`, env)
  const battleBoundary = vi.fn(async (team: string, _options: unknown, signal: AbortSignal) => {
    expect(team).toBe('fixture-team')
    expect(signal).toBe(f.signal)
    env.launchSignal = signal
    await runDefeated()
    return 'victory'
  })
  env.startBattleBody = battleBoundary
  env.host.startBattle = evaluate(
    property('startBattle', 'team,battleOpts,runnerSignal', false),
    env,
  )
  env.host.teleportOut = evaluate(property('teleportOut', 'signal', true), env)
  start = evaluate(property('startBattle', 'request,signal', false), env)
  teleport = evaluate(property('teleportOut', 'signal', false), env)

  const running = f.runtime.runCommands(
    [
      confirm,
      entry === 'battle'
        ? { kind: 'startBattle', enemyTeamId: 'fixture-team' }
        : { kind: 'teleportOut' },
      flag('parentEnd'),
    ],
    { signal: f.signal },
  )
  await entered.promise
  const snapshot = vi.fn(() => structuredClone(f.world.script))
  const saving = f.runtime.withSaveBarrier(snapshot).catch((error: unknown) => error)
  answer.resolve(true)
  await vi.advanceTimersByTimeAsync(10_000)
  await running
  expect(await saving).toEqual(f.world.script)
  expect(snapshot).toHaveBeenCalledTimes(1)
  expect(f.world.script?.flags).toEqual(
    entry === 'battle'
      ? { defeated: true, parentEnd: true }
      : { first: true, childEnd: true, parentEnd: true },
  )
  expect(battleBoundary).toHaveBeenCalledTimes(entry === 'battle' ? 1 : 0)
  expect(env.runner).toBe(activeParent)
  expect(cleanup).not.toHaveBeenCalled()
})

test('standalone current host battle must wait outside a ready save gate', async () => {
  const body = vi.fn(async () => 'victory' as const),
    f = fixture({ startBattle: body })
  const barrier = f.runtime.coordinator.requestSaveBarrier()
  await barrier.ready
  const waiting = vi.spyOn(f.runtime.coordinator, 'waitForActivationGate')
  const battle = f.runtime.host.startBattle({ enemyTeamId: 'team' }, f.signal)
  expect(waiting).toHaveBeenCalledTimes(1)
  expect(body).not.toHaveBeenCalled()
  barrier.release()
  await expect(battle).resolves.toBe('victory')
  expect(body).toHaveBeenCalledWith({ enemyTeamId: 'team' }, f.signal)
  await expect(f.runtime.withSaveBarrier(() => 'after')).resolves.toBe('after')
})
