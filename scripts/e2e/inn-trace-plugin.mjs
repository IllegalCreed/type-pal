import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { instrumentOpeningTrace, TRACE_TARGETS } from './opening-trace-plugin.mjs'

export const INN_TRACE_TARGETS = [
  ...TRACE_TARGETS,
  'packages/game/src/core/scene-system.ts',
  'packages/reforge/src/script-world.ts',
]

/** Reuse the reviewed source-write census, but wire a distinct 002 collector. 001 defaults stay untouched. */
export function instrumentInnTrace(code, file) {
  assert(INN_TRACE_TARGETS.includes(file), `unexpected inn trace source ${file}`)
  if (file.endsWith('/script-world.ts')) {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
    const owner = ast.statements.find(
      (n) => ts.isClassDeclaration(n) && n.name?.text === 'FlowRuntimeCoordinator',
    )
    const methods = owner?.members.filter(
      (n) => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'requestSaveBarrier',
    )
    assert.equal(methods?.length, 1, 'inn save-barrier observation anchor changed')
    const at = methods[0].body.getStart(ast) + 1
    // Detached read-only diagnostic, including real active lease keys. No scheduling or lease writes.
    return {
      code:
        code.slice(0, at) +
        `\nconst __innBarrierStart = {atMs:performance.now(),active:[...this.active.keys()].sort()};
        globalThis.__innReadSaveBarrier = () => ({
        start:structuredClone(__innBarrierStart), active: [...this.active.keys()].sort(), pending: !!this.pending, ready: this.pending?.ready ?? false
      });\n` +
        code.slice(at),
      anchors: { requestSaveBarrier: 1 },
    }
  }
  if (file.endsWith('/scene-system.ts')) {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
    const names = ['tickSceneInput', 'pushPartyAwayFromBlockingNpcs']
    const found = ast.statements.filter(
      (n) => ts.isFunctionDeclaration(n) && names.includes(n.name?.text),
    )
    assert.deepEqual(
      found.map((n) => n.name.text).sort(),
      [...names].sort(),
      'inn normal-input anchor changed',
    )
    const edits = found.flatMap((n) => [
      {
        at: n.body.getStart(ast) + 1,
        text: `\nglobalThis.__innGame?.(gs,"before:${n.name.text}"); try {\n`,
      },
      {
        at: n.body.end - 1,
        text: `\n} finally {globalThis.__innGame?.(gs,"commit:${n.name.text}");}\n`,
      },
    ])
    for (const edit of edits.sort((a, b) => b.at - a.at))
      code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
    return {
      code,
      anchors: { tickSceneInput: 1, pushPartyAwayFromBlockingNpcs: 1 },
    }
  }
  const result = instrumentOpeningTrace(code, file)
  // Only known generated hook tokens change. Original source is never reprinted or edited on disk.
  result.code = result.code
    .replaceAll('globalThis.__openingMatrixGame?.', 'globalThis.__innGame?.')
    .replaceAll('globalThis.__openingMatrixGameRendered?.', 'globalThis.__innGameRendered?.')
    .replaceAll('globalThis.__openingMatrixRendered?.', 'globalThis.__innRendered?.')
  if (file.endsWith('/reforge/src/main.ts')) {
    const ast = ts.createSourceFile('instrumented.ts', result.code, ts.ScriptTarget.Latest, true)
    const matches = []
    const walk = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name?.text === '__openingPoint') matches.push(n)
      ts.forEachChild(n, walk)
    }
    walk(ast)
    assert.equal(matches.length, 1, 'inn commit hook wiring changed')
    const hook = matches[0]
    const body = `function __openingPoint(source) {
      try {
        if (!['s001','s003'].includes(activeScene.scene.id)) return;
        const actors={party:{position:[player.pos.col,player.pos.row,player.pos.height],facing,visible:true}};
        for(const e of activeScene.scene.entities) {
          const id=e.id;
          actors[id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,
            state:host.getEntityState(id),frame:worldPresentation.entityFrame(id)??
              motion.gaitPhase(id)??motion.explicitAnimation(id)??entityActions.frame(id)??0,
            sprite:e.sprite??e.actor??null};
        }
        globalThis.__innPoint?.(source,{scene:activeScene.scene.id,actors,money:world.money,
          control:!runner&&!dialogBox.active&&!presentation.busy(),
          roomActors:['e24','e25','e26'].map(id=>({id,visible:world.script.entityState?.s001?.[id]===2,state:world.script.entityState?.s001?.[id]??0}))});
      } catch(error) {globalThis.__innError?.(String(error));}
    }`
    result.code = result.code.slice(0, hook.getStart(ast)) + body + result.code.slice(hook.end)
    const restoreAst = ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true)
    const restores = []
    const findRestore = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'restorePayload')
        restores.push(node)
      ts.forEachChild(node, findRestore)
    }
    findRestore(restoreAst)
    assert.equal(restores.length, 1, 'inn restore commit anchor function changed')
    const statements = restores[0].body.statements,
      calls = []
    const census = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) calls.push(node)
      ts.forEachChild(node, census)
    }
    census(restores[0].body)
    const names = [
      'abortScript',
      'stopAutoRunners',
      'replaceWorld',
      'commitSceneSwitch',
      'syncRuntimeScriptScratch',
      'refreshCurrentCanonicalBindings',
      'syncAmbience',
      'applyWorldToScene',
      'startAutoRunners',
    ]
    const ordered = names.map((name) => {
      const matches = calls.filter((call) => call.expression.text === name)
      assert.equal(matches.length, 1, `inn restore commit anchor ${name} census changed`)
      const statement = matches[0].parent
      assert(
        ts.isExpressionStatement(statement) && statements.includes(statement),
        `inn restore commit anchor ${name} is not a direct successful-tail statement`,
      )
      return { call: matches[0], statement, index: statements.indexOf(statement) }
    })
    assert(
      ordered.every((value, index) => index === 0 || value.index > ordered[index - 1].index),
      'inn restore commit anchor ordering changed',
    )
    assert.equal(ordered[2].call.getText(restoreAst), 'replaceWorld(candidate)')
    assert.equal(ordered[3].call.getText(restoreAst), 'commitSceneSwitch(plan, world, false)')
    const resume = ordered.at(-1)
    assert.equal(
      statements[resume.index + 1]?.getText(restoreAst),
      'return true',
      'inn restore commit anchor successful return changed',
    )
    const noAwait = (node) => {
      assert(!ts.isAwaitExpression(node), 'inn restore commit anchor contains await')
      ts.forEachChild(node, noAwait)
    }
    for (const statement of statements.slice(ordered[0].index, resume.index + 1)) noAwait(statement)
    const at = resume.statement.getStart(restoreAst)
    result.code =
      result.code.slice(0, at) +
      'globalThis.__innRestoreCommitted?.(captureCurrentSavePayload());\n' +
      result.code.slice(at)
    result.anchors.restorePayloadCommitted = 1
  }
  assert.equal(
    ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return result
}

export function innTracePlugin() {
  return {
    name: 'isolated-inn-commit-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      const file = INN_TRACE_TARGETS.find((f) => id.endsWith(`/${f}`))
      if (!file) return null
      const result = instrumentInnTrace(code, file)
      console.log(
        '[inn-trace]',
        JSON.stringify({
          file,
          sha256: createHash('sha256').update(code).digest('hex'),
          anchors: result.anchors,
        }),
      )
      return { code: result.code, map: null }
    },
  }
}
