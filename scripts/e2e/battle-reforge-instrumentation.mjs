import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentBattleRandomDraws } from './battle-random-instrumentation.mjs'

export const REFORGE_BATTLE_TARGETS = [
  'packages/reforge/src/battle-trial-session.ts',
  'packages/reforge/src/battle-trial-host.ts',
  'packages/reforge/src/battle/battle-session.ts',
  'packages/reforge/src/battle/battle-ui.ts',
  'packages/reforge/src/audio/sfx.ts',
  'packages/reforge/src/battle/present-battle.ts',
  'packages/reforge/src/battle/battle-core.ts',
  'packages/reforge/src/dialog/dialog-box.ts',
]

function observeSfx(node, ast, source, add, evidenceCall) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'browserAdapter')
    add('audio-cue-map', node.getStart(ast), 'const __battleAudioCues = new WeakMap();\n')
  if (
    ts.isMethodDeclaration(node) &&
    node.name.getText(ast) === 'play' &&
    node.parameters[0]?.name.getText(ast) === 'asset'
  ) {
    assert(node.body, 'SfxPlayer.play has no body')
    add(
      'audio-request',
      node.body.getStart(ast) + 1,
      "\nconst __battleAudioCueId = globalThis.__battleEvidence?.audioRequested(asset, 'reforge:SfxPlayer.play');\n",
    )
  }
  if (ts.isExpressionStatement(node) && source === 'source = this.adapter.play(buffer, ended)')
    // The original onended callback identifies this native play call across the adapter boundary.
    add(
      'audio-cue-link',
      node.getStart(ast),
      'if (__battleAudioCueId !== undefined) __battleAudioCues.set(ended, { cueId: __battleAudioCueId, assetId: asset });\n',
    )
  if (
    ts.isExpressionStatement(node) &&
    source === 'source.start()' &&
    ts.findAncestor(node, ts.isMethodDeclaration)?.parameters[1]?.name.getText(ast) === 'onended'
  )
    add(
      'audio-start',
      node.end,
      `\nconst __battleAudioCue = __battleAudioCues.get(onended);
if (__battleAudioCue) ${evidenceCall('audioStarted', "__battleAudioCue.cueId, __battleAudioCue.assetId, source.buffer, context, 'reforge:browserAdapter.play:AudioBufferSourceNode.start'")}`,
    )
  if (
    ts.isReturnStatement(node) &&
    source === 'return decoded' &&
    ts.findAncestor(node, ts.isMethodDeclaration)?.name.getText(ast) === 'ensureDecoded'
  )
    add(
      'audio-decoded',
      node.getStart(ast),
      evidenceCall(
        'audioDecoded',
        "asset, decoded, record.path, 'reforge:SfxPlayer.ensureDecoded:decode'",
      ),
    )
}

/** Serve-only hooks at existing producers. Normal mode never replaces a native expression. */
export function instrumentReforgeBattle(code, file, counter = 'none') {
  assert(['none', 'double-herb'].includes(counter), `unknown battle counter: ${counter}`)
  if (!REFORGE_BATTLE_TARGETS.includes(file)) return { code, anchors: {} }
  const isCore = file.endsWith('/battle/battle-core.ts')
  const isBattleUi = file.endsWith('/battle/battle-ui.ts')
  const isSfx = file.endsWith('/audio/sfx.ts')
  const isBattleScene = file.endsWith('/battle/present-battle.ts')
  const isDialogBox = file.endsWith('/dialog/dialog-box.ts')
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
    if (isDialogBox) {
      const method = ts.findAncestor(node, ts.isMethodDeclaration)?.name.getText(ast)
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'advance') {
        add(
          'dialogue-confirm-before',
          node.body.getStart(ast) + 1,
          '\nconst __battleDialogBefore = this.observe(); try {\n',
        )
        add(
          'dialogue-confirm-after',
          node.body.end - 1,
          `\n} finally { ${call('dialogueConfirm', '__battleDialogBefore, this.observe()')} }\n`,
        )
      }
      if (ts.isExpressionStatement(node) && method === 'render') {
        if (source === 'this.renderSlot(slotId, r, isActive, nowMs)')
          add(
            'dialogue-slot',
            node.end,
            `\n${evidenceCall('dialogueDrawn', "r, slotId, isActive ? this.observeSlot(slotId, r).phase : 'retained', isActive, 'reforge:DialogBox.renderSlot', r.visibleText")}\n`,
          )
      }
      if (
        ts.isExpressionStatement(node) &&
        method === 'renderSlot' &&
        source === 'this.ctx.drawImage(portraitImg, px, py)'
      )
        add(
          'dialogue-portrait',
          node.end,
          `\n${evidenceCall('dialoguePortrait', 'r, cue.portrait.asset, px, py, portraitImg.width, portraitImg.height')}\n`,
        )
    }
    if (
      isBattleUi &&
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(ast) === 'ctx.drawImage' &&
      ts.findAncestor(node, ts.isFunctionDeclaration)?.name?.text === 'drawPlayerInfoBox' &&
      node.expression.arguments[1]?.getText(ast) === 'x - 2' &&
      node.expression.arguments[2]?.getText(ast) === 'y - 4'
    ) {
      add(
        'portrait-before',
        node.getStart(ast),
        'const __battleReadFace = globalThis.__battleEvidence?.captureCanvasPortrait(slot, p.hp, ctx, face, x - 2, y - 4);\n',
      )
      add('portrait-after', node.end, '\n__battleReadFace?.();\n')
    }
    if (
      isCore &&
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === '!canAct(p.status)' &&
      ts.isBlock(node.parent) &&
      ts.isFunctionDeclaration(node.parent.parent) &&
      node.parent.parent.name?.text === 'performPlayerAction'
    ) {
      assert(ts.isBlock(node.thenStatement), 'incapacitated action guard lost its block')
      const exit = node.thenStatement.statements.at(-1)
      assert(exit && ts.isReturnStatement(exit), 'incapacitated action no longer returns')
      add('incapacitated', exit.getStart(ast), call('incapacitated', 'idx'))
    }
    if (
      isCore &&
      ts.isExpressionStatement(node) &&
      source === 'applyCasualtyBranchEffects(target, effects)' &&
      ts.findAncestor(node, ts.isFunctionDeclaration)?.name?.text === 'completeCasualtyEffects'
    ) {
      add(
        'casualty-effect-before',
        node.getStart(ast),
        'const __battleCasualtyBefore = globalThis.__battleHarness.casualtyEffect(s, target);\n',
      )
      add(
        'casualty-effect-after',
        node.end,
        `\n${call('casualtyEffect', 's, target, __battleCasualtyBefore')}`,
      )
    }
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
          `\n} finally { ${call('observe', "this.state, this.selection.view, this.state.phase === 'selectAction' && this.sessionUi !== 'acting' ? this.nextSelecting() : undefined, this.assets.dialogBox?.observe()")} }\n`,
        )
      }
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'render') {
        add(
          'frame-begin',
          node.body.getStart(ast) + 1,
          `\n${call('beginFrame', "this.state, this.nowMs, this.actionPresentation.active, this.state.phase === 'selectAction' && this.sessionUi !== 'acting' && this.nextSelecting() !== undefined && !this.assets.dialogBox?.active")}`,
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
            `${call('selectionContext', 'context')}const __battleSelection = this.selection.view;\n`,
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
        add('action-before', node.getStart(ast), call('beforeStep', 's, this.nowMs'))
        const mutation =
          counter === 'double-herb'
            ? "if (s.lastAction?.side === 'player' && s.lastAction.kind === 'item' && s.lastAction.itemId === '99') { const extra = s.inventory.find(entry => entry.itemId === '99'); if (extra && extra.count > 0) extra.count--; }\n"
            : ''
        add('action-after', node.end, `\n${mutation}${call('afterStep', 's')}`)
      }
    }
    if (
      isBattleScene &&
      ts.isVariableStatement(node) &&
      source === 'const f = draw.sprite.frames[draw.frame] ?? draw.sprite.frames[0]'
    ) {
      // Use the real selected sprite frame, including the renderer's slot-zero fallback.
      add(
        'fighter-frame-choice',
        node.end,
        '\nconst __battleFrameIndex = f === draw.sprite.frames[draw.frame] ? draw.frame : 0;\n',
      )
    }
    if (isBattleScene && ts.isIfStatement(node)) {
      const drawn = evidenceCall('fighterDrawn', 'draw, __battleFrameIndex')
      if (node.expression.getText(ast) === 'draw.dissolve !== undefined') {
        const draw = node.thenStatement.statements[0]
        assert(draw.getText(ast).startsWith('drawDissolved('))
        add('dissolved-fighter-draw', draw.end, `\n${drawn}\n`)
      }
      if (
        node.expression.getText(ast) === 'alpha < 1' &&
        source.includes('ctx.drawImage(img, dx, dy)')
      )
        add('fighter-draw', node.end, `\n${drawn}\n`)
    }
    if (isSfx) observeSfx(node, ast, source, add, evidenceCall)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const hasCasualtyEffects =
    isCore &&
    ast.statements.some(
      (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'completeCasualtyEffects',
    )
  const expected = file.endsWith('/battle-trial-session.ts')
    ? ['prepared', 'settled']
    : file.endsWith('/battle-trial-host.ts')
      ? ['seeded-input', 'finished']
      : isSfx
        ? ['audio-cue-map', 'audio-request', 'audio-cue-link', 'audio-start', 'audio-decoded']
        : isBattleScene
          ? ['fighter-frame-choice', 'fighter-draw', 'dissolved-fighter-draw']
          : isBattleUi
            ? ['portrait-before', 'portrait-after']
            : isDialogBox
              ? [
                  'dialogue-confirm-before',
                  'dialogue-confirm-after',
                  'dialogue-slot',
                  'dialogue-portrait',
                ]
              : isCore
                ? [
                    'incapacitated',
                    ...(hasCasualtyEffects
                      ? ['casualty-effect-before', 'casualty-effect-after']
                      : []),
                  ]
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
    assert.equal(count, isBattleUi ? 3 : 1, `unexpected battle producer count: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  const output = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  assert.equal(output.parseDiagnostics.length, 0, `invalid instrumented source: ${file}`)
  if (isCore) {
    const random = instrumentBattleRandomDraws(code, file)
    return { code: random.code, anchors: { ...anchors, ...random.anchors } }
  }
  return { code, anchors }
}
