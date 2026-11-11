import assert from 'node:assert/strict'
import ts from 'typescript'

export const REFORGE_BATTLE_TARGETS = [
  'packages/reforge/src/battle-trial-session.ts',
  'packages/reforge/src/battle-trial-host.ts',
  'packages/reforge/src/battle/battle-session.ts',
  'packages/reforge/src/audio/sfx.ts',
  'packages/reforge/src/battle/present-battle.ts',
]

/** Serve-only hooks at existing producers. Normal mode never replaces a native expression. */
export function instrumentReforgeBattle(code, file, counter = 'none') {
  assert(['none', 'double-herb'].includes(counter), `unknown battle counter: ${counter}`)
  if (!REFORGE_BATTLE_TARGETS.includes(file)) return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0, `unparseable source: ${file}`)
  const edits = []
  const anchors = {}
  const add = (name, at, text) => {
    anchors[name] = (anchors[name] ?? 0) + 1
    edits.push({ at, text })
  }
  const call = (method, args) => `globalThis.__battleHarness.${method}(${args});\n`
  const evidenceCall = (method, args = '') => `globalThis.__battleEvidence?.${method}(${args});\n`
  const visit = (node) => {
    const source = node.getText(ast)
    if (file.endsWith('/battle-trial-session.ts')) {
      if (ts.isVariableStatement(node) && source.includes('const { world, players, items,'))
        add('prepared', node.end, `\n${call('prepared', 'prepared')}`)
      if (ts.isReturnStatement(node) && source.startsWith('return settleBattleVictory('))
        add('settled', node.getStart(ast), call('settled', ''))
    }
    if (file.endsWith('/battle-trial-host.ts') && ts.isCallExpression(node)) {
      if (node.expression.getText(ast) === 'createBattleTrialSession') {
        const hooks = node.arguments[3]
        assert(ts.isObjectLiteralExpression(hooks), 'trial hooks are no longer an object')
        add(
          'seeded-input',
          hooks.getStart(ast) + 1,
          '\nrng: () => globalThis.__battleHarness.random(),',
        )
      }
      if (node.expression.getText(ast) === 'finishBattleWorldState') {
        assert(ts.isExpressionStatement(node.parent), 'world commit is no longer a statement')
        add('finished', node.parent.end, `\n${call('finish', 'result, world')}`)
      }
    }
    if (file.endsWith('/battle/battle-session.ts')) {
      if (ts.isConstructorDeclaration(node))
        add(
          'constructed',
          node.body.end - 1,
          call('constructed', 'this.state, this.selection.view'),
        )
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'tick') {
        add('tick-begin', node.body.getStart(ast) + 1, '\ntry {\n')
        add(
          'tick-end',
          node.body.end - 1,
          `\n} finally { ${call('observe', 'this.state, this.selection.view')} }\n`,
        )
      }
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'render') {
        add(
          'frame-begin',
          node.body.getStart(ast) + 1,
          `\n${call('beginFrame', "this.state, this.nowMs, this.actionPresentation.active, this.state.phase === 'selectAction' && this.nextSelecting() !== undefined")}`,
        )
        add('frame-end', node.body.end - 1, `\n${evidenceCall('endFrame')}\n`)
      }
      if (ts.isIfStatement(node) && node.expression.getText(ast) === 'transition') {
        if (source.includes('enemies.push('))
          add(
            'enemy-draw-identity',
            node.end,
            `\n${evidenceCall('labelFighter', "enemies.at(-1), 'enemy', i, e.hp <= 0 && !dyingNow")}\n`,
          )
        if (source.includes('players.push('))
          add(
            'player-draw-identity',
            node.end,
            `\n${evidenceCall('labelFighter', "players.at(-1), 'player', i")}\n`,
          )
      }
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const name = node.expression.expression.getText(ast)
        if (name === 'this.selection.advance') {
          add(
            'target-cancel-before',
            node.getStart(ast),
            'const __battleSelection = this.selection.view;\n',
          )
          add(
            'target-cancel-after',
            node.end,
            `\nif (pressed.has('Escape') && __battleSelection.phase === 'target' && __battleSelection.targetSide === 'ally' && this.selection.phase === 'skill') {\n${call('targetCancel', 'sel, __battleSelection.targetIndex, context.player.skills[__battleSelection.skillIndex]')} }\n`,
          )
        }
        if (name === 'this.floats.push' && source.includes('num: value'))
          add(
            'number-identity',
            node.end,
            `\n${evidenceCall('labelNumber', 'this.floats.at(-1), t.side, t.idx')}\n`,
          )
        if (name === 'drawNumber' && source === 'drawNumber(ctx, f.num, f.x, f.y - age, nums)')
          add(
            'number-draw',
            node.end,
            `\n${evidenceCall('numberDrawn', 'f, f.num, f.tone, f.x, f.y - age, age')}\n`,
          )
        if (name === 'drawPlayerInfoBox')
          add('panel-draw', node.end, `\n${evidenceCall('panelDrawn', 'i')}\n`)
        if (name === 'drawSettlementScreen') {
          add('settlement-draw-begin', node.getStart(ast), '{\n')
          add(
            'settlement-draw-end',
            node.end,
            `\n${evidenceCall('settlementDrawn', 'settlementScreen.kind')}\n}\n`,
          )
        }
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'submit') {
        const fn = node.initializer
        assert(ts.isArrowFunction(fn) && ts.isCallExpression(fn.body), 'selection submit drift')
        assert.equal(fn.body.getText(ast), 'this.state.pendingActions.set(playerIndex, action)')
        add('command-begin', fn.body.getStart(ast), '{ const result = ')
        add(
          'command-end',
          fn.body.end,
          `; ${call('command', 'playerIndex, action')} return result; }`,
        )
      }
      if (ts.isExpressionStatement(node) && source === 'stepBattle(s, this.rng)') {
        add('action-before', node.getStart(ast), call('beforeStep', 's'))
        const mutation =
          counter === 'double-herb'
            ? "if (s.lastAction?.side === 'player' && s.lastAction.kind === 'item' && s.lastAction.itemId === '99') { const extra = s.inventory.find(entry => entry.itemId === '99'); if (extra && extra.count > 0) extra.count--; }\n"
            : ''
        add('action-after', node.end, `\n${mutation}${call('afterStep', 's')}`)
      }
    }
    if (file.endsWith('/battle/present-battle.ts') && ts.isIfStatement(node)) {
      if (node.expression.getText(ast) === 'draw.dissolve !== undefined') {
        const draw = node.thenStatement.statements[0]
        assert(draw.getText(ast).startsWith('drawDissolved('))
        add('dissolved-fighter-draw', draw.end, `\n${evidenceCall('fighterDrawn', 'draw')}\n`)
      }
      if (
        node.expression.getText(ast) === 'alpha < 1' &&
        source.includes('ctx.drawImage(img, dx, dy)')
      )
        add('fighter-draw', node.end, `\n${evidenceCall('fighterDrawn', 'draw')}\n`)
    }
    if (
      file.endsWith('/audio/sfx.ts') &&
      ts.isMethodDeclaration(node) &&
      node.name.getText(ast) === 'play' &&
      node.parameters[0]?.name.getText(ast) === 'asset'
    )
      add(
        'sound-request',
        node.body.getStart(ast) + 1,
        `\n${call('presentation', "'sound-request', 'SfxPlayer:play:requested', { assetId: asset }")}`,
      )
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const expected = file.endsWith('/battle-trial-session.ts')
    ? ['prepared', 'settled']
    : file.endsWith('/battle-trial-host.ts')
      ? ['seeded-input', 'finished']
      : file.endsWith('/audio/sfx.ts')
        ? ['sound-request']
        : file.endsWith('/battle/present-battle.ts')
          ? ['fighter-draw', 'dissolved-fighter-draw']
          : [
              'constructed',
              'tick-begin',
              'tick-end',
              'frame-begin',
              'frame-end',
              'enemy-draw-identity',
              'player-draw-identity',
              'number-identity',
              'number-draw',
              'panel-draw',
              'settlement-draw-begin',
              'settlement-draw-end',
              'command-begin',
              'command-end',
              'target-cancel-before',
              'target-cancel-after',
              'action-before',
              'action-after',
            ]
  assert.deepEqual(Object.keys(anchors).sort(), expected.sort(), `battle producer drift: ${file}`)
  for (const count of Object.values(anchors))
    assert.equal(count, 1, `duplicate battle producer: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  const output = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  assert.equal(output.parseDiagnostics.length, 0, `invalid instrumented source: ${file}`)
  return { code, anchors }
}
