import assert from 'node:assert/strict'
import ts from 'typescript'

export const GAME_BATTLE_TARGETS = [
  '/packages/game/src/dev/dev-panel.ts',
  '/packages/game/src/core/rng.ts',
  '/packages/game/src/core/battle/battle-system.ts',
  '/packages/game/src/core/battle/battle-settlement.ts',
  '/packages/game/src/core/battle/battle-finalization.ts',
]

/** Guarded observation-only edits exist only in this test Vite server's module responses. */
export function instrumentGameBattle(source, file) {
  assert(GAME_BATTLE_TARGETS.includes(file), `unexpected Q2 Game source ${file}`)
  assert(!source.includes('__battleGame'), 'Game source was instrumented twice')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = [],
    anchors = {}
  const add = (name, at, text, end = at) => {
    anchors[name] = (anchors[name] ?? 0) + 1
    edits.push({ at, end, text })
  }
  const wrapFinally = (node, name, text) => {
    assert(node.body && ts.isBlock(node.body), `${name} body changed`)
    add(name, node.body.getStart(ast) + 1, '\ntry {\n')
    edits.push({ at: node.body.end - 1, end: node.body.end - 1, text: `\n} finally { ${text} }\n` })
  }
  const owner = (node) => {
    while (node && !ts.isFunctionDeclaration(node)) node = node.parent
    return node?.name?.text
  }
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text
      if (file.endsWith('/dev/dev-panel.ts') && name === 'setupDevPanel')
        add(
          'register',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__battleGameRegister?.(deps, applyFixture);\n',
        )
      if (file.endsWith('/battle/battle-system.ts')) {
        if (name === 'startBattle')
          wrapFinally(
            node,
            'start',
            'globalThis.__battleGameStarted?.(input.gs, getBattleResources(input.gs)?.playerRoles);',
          )
        if (name === 'tickBattle')
          wrapFinally(
            node,
            'tick',
            'globalThis.__battleGameTick?.(gs, gs.battleState, getBattleResources(gs)?.playerRoles);',
          )
        if (name === 'performBattleAction')
          add(
            'actionStart',
            node.body.getStart(ast) + 1,
            '\nglobalThis.__battleGameActionStart?.(state, gs, actor, action, res.playerRoles);\n',
          )
      }
      if (file.endsWith('/battle/battle-settlement.ts') && name === 'buildBattleWonSettlement')
        add(
          'settlement',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__battleGameSettlement?.(gs, state);\n',
        )
      if (file.endsWith('/battle/battle-finalization.ts') && name === 'finalizeBattleCleanup')
        add('terminal', node.body.end - 1, '\nglobalThis.__battleGameTerminal?.(gs, outcome);\n')
    }
    if (
      file.endsWith('/core/rng.ts') &&
      ts.isReturnStatement(node) &&
      node.expression &&
      ts.isBlock(node.parent) &&
      ts.isArrowFunction(node.parent.parent) &&
      ts.isVariableDeclaration(node.parent.parent.parent) &&
      node.parent.parent.parent.name.getText(ast) === 'next'
    ) {
      add(
        'random',
        node.getStart(ast),
        `const __battleGameValue = ${node.expression.getText(ast)};\n` +
          'globalThis.__battleGameRandom?.(seed, state, __battleGameValue);\nreturn __battleGameValue;',
        node.end,
      )
    }
    if (
      file.endsWith('/battle/battle-system.ts') &&
      ts.isCallExpression(node) &&
      node.expression.getText(ast) === 'state.pendingActions.set'
    ) {
      const slot = node.arguments[0]
      assert(ts.isIdentifier(slot), 'Game command slot is no longer a simple native variable')
      add(
        'command',
        node.getStart(ast),
        `(${node.getText(ast)}, globalThis.__battleGameCommand?.(state, ${slot.getText(ast)}), state.pendingActions)`,
        node.end,
      )
    }
    if (
      file.endsWith('/battle/battle-system.ts') &&
      ts.isExpressionStatement(node) &&
      ts.isPostfixUnaryExpression(node.expression) &&
      node.expression.operand.getText(ast) === 'state.currentActionIndex' &&
      owner(node) === 'tickPerformAction'
    ) {
      add(
        'actionComplete',
        node.end,
        '\nglobalThis.__battleGameActionComplete?.(state, gs, res.playerRoles);\n',
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const expected = file.endsWith('/dev/dev-panel.ts')
    ? { register: 1 }
    : file.endsWith('/core/rng.ts')
      ? { random: 1 }
      : file.endsWith('/battle/battle-settlement.ts')
        ? { settlement: 1 }
        : file.endsWith('/battle/battle-finalization.ts')
          ? { terminal: 1 }
          : { start: 1, tick: 1, command: 10, actionStart: 1, actionComplete: 4 }
  assert.deepEqual(anchors, expected, 'Q2 Game native observation boundary census changed')
  let code = source
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.end)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}

export function gameBattlePlugin() {
  return {
    name: 'isolated-q2-game-battle-observation',
    enforce: 'pre',
    transform(source, id) {
      const normalized = id.replaceAll('\\', '/').split('?')[0]
      const target = GAME_BATTLE_TARGETS.find((suffix) => normalized.endsWith(suffix))
      if (!target) return null
      return { code: instrumentGameBattle(source, target).code, map: null }
    },
  }
}
