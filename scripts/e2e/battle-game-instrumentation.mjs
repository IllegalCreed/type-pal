import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentBattleRandomDraws } from './battle-random-instrumentation.mjs'

const gameRandomTargets = [
  '/packages/game/src/core/battle/actions/attack.ts',
  '/packages/game/src/core/battle/enemy-ai.ts',
  '/packages/game/src/core/battle/magic-damage.ts',
  '/packages/game/src/core/battle/battle-opcodes.ts',
  '/packages/game/src/core/event-system.ts',
]

export const GAME_BATTLE_TARGETS = [
  '/packages/game/src/dev/dev-panel.ts',
  '/packages/game/src/core/rng.ts',
  '/packages/game/src/core/battle/battle-system.ts',
  '/packages/game/src/core/battle/battle-settlement.ts',
  '/packages/game/src/core/battle/battle-finalization.ts',
  '/packages/game/src/present/battle/present-battle.ts',
  '/packages/game/src/present/battle/draw-battle-sprites.ts',
  '/packages/game/src/present/battle/draw-battle-ui.ts',
  '/packages/game/src/present/battle/draw-battle-num.ts',
  ...gameRandomTargets,
]

const commandPlaceholderOwners = new Set([
  'tickSelectAction',
  'applyCoopConsumesOthers',
  'autoFillIncapacitatedActions',
])

/** Guarded observation-only edits exist only in this test Vite server's module responses. */
export function instrumentGameBattle(source, file) {
  assert(GAME_BATTLE_TARGETS.includes(file), `unexpected Q2 Game source ${file}`)
  assert(!/__battle(?:Game|Evidence)/.test(source), 'Game source was instrumented twice')
  if (gameRandomTargets.includes(file)) return instrumentBattleRandomDraws(source, file)
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
  const visualCall = (name, node, method, args = '') =>
    add(name, node.end, `\nglobalThis.__battleEvidence?.${method}(${args});\n`)
  const visit = (node) => {
    if (file.endsWith('/present/battle/present-battle.ts')) {
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'draw') {
        add(
          'frame-begin',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__battleGameFrame?.(state);\n',
        )
        add('frame-end', node.body.end - 1, '\nglobalThis.__battleEvidence?.endFrame();\n')
      }
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression
        if (call.expression.getText(ast) === 'this.floatingNums.emit')
          add('number-target', call.arguments.end, ', cmd.target')
        if (call.expression.getText(ast) === 'drawBattleSettlement')
          visualCall(
            'settlement-draw',
            node,
            'settlementDrawn',
            'settlement.screens[settlement.index].kind',
          )
      }
    }
    if (file.endsWith('/draw-battle-sprites.ts') && owner(node) === 'drawBattleSprites') {
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression
        if (call.expression.getText(ast) === 'items.push') {
          const item = call.arguments[0].getText(ast)
          if (item.includes('enemyShakeX'))
            visualCall(
              'enemy-draw-identity',
              node,
              'labelFighter',
              "items.at(-1), 'enemy', i, isFading",
            )
          if (item.includes('playerShakeY'))
            visualCall('player-draw-identity', node, 'labelFighter', "items.at(-1), 'player', i")
        }
      }
      if (ts.isIfStatement(node) && node.expression.getText(ast) === 'it.fadeStep >= 0')
        visualCall('fighter-draw', node, 'fighterDrawn', 'it')
    }
    if (
      file.endsWith('/draw-battle-ui.ts') &&
      owner(node) === 'drawPlayerInfoBoxes' &&
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(ast) === 'drawPlayerInfoBox'
    )
      visualCall('panel-draw', node, 'panelDrawn', 'i')
    if (file.endsWith('/draw-battle-num.ts')) {
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'emit')
        add('number-parameter', node.parameters.end, ', __battleTarget')
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression.expression.getText(ast)
        if (call === 'this.nums.push')
          visualCall(
            'number-identity',
            node,
            'labelNumber',
            'this.nums.at(-1), __battleTarget.kind, __battleTarget.idx',
          )
        if (call === 'drawNumber')
          visualCall(
            'number-draw',
            node,
            'numberDrawn',
            'n, n.value, n.color, n.x + NLENGTH * 6, n.y - age, age',
          )
      }
    }
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
        if (name === 'tickPostAction') {
          add(
            'round-start',
            node.body.getStart(ast) + 1,
            '\nconst __battleRoundStart = globalThis.__battleGameRoundStart?.(state, gs, res.playerRoles);\n',
          )
          // Victory and defeat return before the controller advances its turn.
          add(
            'round-end',
            node.body.end - 1,
            '\nglobalThis.__battleGameRoundEnd?.(state, gs, res.playerRoles, __battleRoundStart);\n',
          )
        }
        if (name === 'performBattleAction') {
          wrapFinally(node, 'action-produced', 'globalThis.__battleGameActionProduced?.(state);')
          add(
            'actionStart',
            node.body.getStart(ast) + 1,
            '\nglobalThis.__battleGameActionStart?.(state, gs, actor, action, res.playerRoles);\n',
          )
        }
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
      // Queue placeholders reserve a native slot without accepting a player input.
      if (commandPlaceholderOwners.has(owner(node))) {
        anchors.placeholder = (anchors.placeholder ?? 0) + 1
      } else {
        const slot = node.arguments[0]
        assert(ts.isIdentifier(slot), 'Game command slot is no longer a simple native variable')
        add(
          'command',
          node.getStart(ast),
          `(${node.getText(ast)}, globalThis.__battleGameCommand?.(state, ${slot.getText(ast)}), state.pendingActions)`,
          node.end,
        )
      }
    }
    if (
      file.endsWith('/battle/battle-system.ts') &&
      ts.isExpressionStatement(node) &&
      owner(node) === 'handlePlayerTargetSelect' &&
      node.expression.getText(ast) === 'state.pendingActionDraft = undefined'
    )
      add('target-cancel', node.end, '\nglobalThis.__battleGameTargetCancel?.(state, draft);\n')
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
  const visualExpected = {
    'present-battle.ts': {
      'frame-begin': 1,
      'frame-end': 1,
      'number-target': 1,
      'settlement-draw': 1,
    },
    'draw-battle-sprites.ts': {
      'enemy-draw-identity': 1,
      'player-draw-identity': 1,
      'fighter-draw': 1,
    },
    'draw-battle-ui.ts': { 'panel-draw': 1 },
    'draw-battle-num.ts': { 'number-parameter': 1, 'number-identity': 1, 'number-draw': 1 },
  }
  const expected =
    visualExpected[file.split('/').at(-1)] ??
    (file.endsWith('/dev/dev-panel.ts')
      ? { register: 1 }
      : file.endsWith('/core/rng.ts')
        ? { random: 1 }
        : file.endsWith('/battle/battle-settlement.ts')
          ? { settlement: 1 }
          : file.endsWith('/battle/battle-finalization.ts')
            ? { terminal: 1 }
            : {
                start: 1,
                tick: 1,
                command: 7,
                placeholder: 3,
                'round-start': 1,
                'round-end': 1,
                'target-cancel': 1,
                actionStart: 1,
                'action-produced': 1,
                actionComplete: 4,
              })
  assert.deepEqual(anchors, expected, 'Q2 Game native observation boundary census changed')
  let code = source
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.end)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  if (file.endsWith('/battle-system.ts')) {
    const ruleDraws = instrumentBattleRandomDraws(code, file)
    return { code: ruleDraws.code, anchors: { ...anchors, ...ruleDraws.anchors } }
  }
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
