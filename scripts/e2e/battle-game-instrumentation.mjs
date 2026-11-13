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

const gameAudioTarget = '/packages/game/src/shell/audio.ts'
const gameCoopTarget = '/packages/game/src/core/battle/actions/coop-magic.ts'

export const GAME_BATTLE_TARGETS = [
  gameAudioTarget,
  '/packages/game/src/dev/dev-panel.ts',
  '/packages/game/src/core/rng.ts',
  '/packages/game/src/core/battle/battle-dialog.ts',
  '/packages/game/src/core/battle/battle-system.ts',
  '/packages/game/src/core/battle/battle-settlement.ts',
  '/packages/game/src/core/battle/battle-finalization.ts',
  gameCoopTarget,
  '/packages/game/src/present/player-info-box.ts',
  '/packages/game/src/present/dialog-draw.ts',
  '/packages/game/src/present/battle/present-battle.ts',
  '/packages/game/src/present/battle/draw-battle-effect.ts',
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
    if (file === gameAudioTarget) {
      const name = owner(node)
      if (ts.isFunctionDeclaration(node)) {
        if (name === 'playSfx')
          add(
            'audio-request',
            node.body.getStart(ast) + 1,
            '\nconst __battleGameCue = globalThis.__battleGameAudioRequested?.(soundId);\n',
          )
        if (name === 'play') add('audio-cue-parameter', node.parameters.end, ', __battleGameCue')
      }
      if (name === 'loadSfx' && ts.isVariableStatement(node)) {
        const [entry] = node.declarationList.declarations
        if (
          entry?.name.getText(ast) === 'buf' &&
          entry.initializer?.getText(ast) === 'await c.decodeAudioData(await res.arrayBuffer())'
        )
          add(
            'audio-decode',
            node.end,
            '\nglobalThis.__battleGameAudioDecoded?.(soundId, buf, res.url);\n',
          )
      }
      if (
        name === 'playSfx' &&
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'play'
      ) {
        const args = node.arguments.map((arg) => arg.getText(ast))
        assert(
          args.length === 3 &&
            args[0] === 'c' &&
            ['buf', 'b'].includes(args[1]) &&
            args[2] === 'soundId',
          'Game SFX playback arguments changed',
        )
        const path = args[1] === 'buf' ? 'cached' : 'loaded'
        // Each asynchronous load retains the cue from its own native request.
        add(`audio-${path}-cue`, node.arguments.end, ', __battleGameCue')
      }
      if (
        name === 'play' &&
        ts.isExpressionStatement(node) &&
        node.expression.getText(ast) === 'src.start()'
      )
        add(
          'audio-start',
          node.end,
          '\nglobalThis.__battleGameAudioStarted?.(__battleGameCue, soundId, src.buffer, c);\n',
        )
    }
    if (file.endsWith('/present/battle/present-battle.ts')) {
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'draw') {
        add(
          'frame-begin',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__battleGameFrame?.(state, gs);\n',
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
        if (call.expression.getText(ast) === 'drawDialogBox') {
          const box = call.arguments[1]?.getText(ast)
          assert(
            ['gs.dialogBox', 'gs.dialogBoxKept'].includes(box),
            'Game dialogue draw source drift',
          )
          visualCall(
            'dialogue-slot',
            node,
            'dialogueDrawn',
            `${box}, ${box}.style, ${box}.phase, ${box === 'gs.dialogBox'}, 'game:drawDialogBox'`,
          )
        }
      }
    }
    if (file.endsWith('/present/dialog-draw.ts')) {
      const name = owner(node)
      if (
        name === 'drawDialogBox' &&
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression)
      ) {
        const call = node.expression
        if (call.expression.getText(ast) === 'drawTextLine') {
          const text = call.arguments[1].getText(ast)
          visualCall(
            'dialogue-line',
            node,
            'dialogueText',
            `state, ${text}, ${text === 'state.titleText'}`,
          )
        }
        if (call.getText(ast) === 'blitSprite(fb, portrait, pos.x, pos.y)')
          visualCall(
            'dialogue-portrait',
            node,
            'dialoguePortrait',
            'state, state.portraitIcon, pos.x, pos.y, portrait.width, portrait.height',
          )
      }
      if (name === 'drawNarrationDialog' && ts.isFunctionDeclaration(node))
        add(
          'dialogue-narration',
          node.body.end - 1,
          '\nglobalThis.__battleEvidence?.dialogueText(state, text);\n',
        )
    }
    if (
      file.endsWith('/battle/battle-dialog.ts') &&
      owner(node) === 'advanceBattleDialog' &&
      ts.isVariableStatement(node) &&
      ['confirmDialog(box)', 'confirmDialog(box, timedElapsed)'].includes(
        node.declarationList.declarations[0]?.initializer?.getText(ast),
      )
    ) {
      add('dialogue-confirm-before', node.getStart(ast), 'const __battleDialogPhase = box.phase;\n')
      add(
        'dialogue-confirm-after',
        node.end,
        '\nglobalThis.__battleGameDialogueConfirm?.(state, box, __battleDialogPhase, result);\n',
      )
    }
    if (file.endsWith('/draw-battle-sprites.ts') && owner(node) === 'drawBattleSprites') {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'frame') {
        assert.match(
          node.initializer?.getText(ast) ?? '',
          /^sprite\.frames\[frameIdx\]\s*\?\?\s*sprite\.frames\[0\]!?$/,
          'Game fighter frame selection changed',
        )
        anchors['fighter-frame-selection'] = (anchors['fighter-frame-selection'] ?? 0) + 1
      }
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression
        const item = call.arguments[0]
        if (
          call.expression.getText(ast) === 'items.push' &&
          item &&
          ts.isObjectLiteralExpression(item) &&
          item.properties.some(
            (prop) => ts.isShorthandPropertyAssignment(prop) && prop.name.text === 'frame',
          )
        ) {
          const itemText = item.getText(ast)
          // The selected frame object tells us whether the renderer used the resource fallback.
          const frameIndex = 'sprite.frames[frameIdx] === frame ? frameIdx : 0'
          if (itemText.includes('enemyShakeX'))
            visualCall(
              'enemy-draw-identity',
              node,
              'labelFighter',
              `items.at(-1), 'enemy', i, isFading, ${frameIndex}`,
            )
          if (itemText.includes('playerShakeY'))
            visualCall(
              'player-draw-identity',
              node,
              'labelFighter',
              `items.at(-1), 'player', i, false, ${frameIndex}`,
            )
        }
      }
      if (ts.isIfStatement(node) && node.expression.getText(ast) === 'it.fadeStep >= 0')
        visualCall('fighter-draw', node, 'fighterDrawn', 'it')
    }
    if (
      file.endsWith('/present-battle.ts') &&
      ts.isCallExpression(node) &&
      node.getText(ast) ===
        "drawBattleMagicOverlay(fb, { kind: 'magic', ...blit }, assets.magicSprites)"
    )
      add('background-magic-draw', node.arguments.end, ', true')
    if (file.endsWith('/draw-battle-effect.ts')) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'blitFrame')
        add(
          'overlay-blit-parameter',
          node.parameters.at(-1).end,
          ', __battleMagicChunk?: number, __battleBackground = false',
        )
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'drawBattleMagicOverlay')
        add(
          'magic-overlay-background-parameter',
          node.parameters.at(-1).end,
          ', __battleBackground = false',
        )
      if (
        ts.isVariableStatement(node) &&
        owner(node) === 'drawBattleMagicOverlay' &&
        node.getText(ast) === 'const sprite = magicSprites?.get(overlay.spriteChunk)'
      )
        anchors['magic-overlay-resource'] = (anchors['magic-overlay-resource'] ?? 0) + 1
      if (
        ts.isCallExpression(node) &&
        owner(node) === 'drawBattleMagicOverlay' &&
        node.getText(ast) === 'blitFrame(fb, sprite, overlay.frameIdx, overlay.x, overlay.y)'
      )
        add(
          'magic-overlay-argument',
          node.arguments.end,
          ', overlay.spriteChunk, __battleBackground',
        )
      if (
        ts.isForStatement(node) &&
        ts.isFunctionDeclaration(node.parent.parent) &&
        owner(node) === 'blitFrame' &&
        node.statement.getText(ast).includes('fb.writePixel(baseX + px, baseY + py,')
      )
        add(
          'magic-overlay-draw',
          node.end,
          '\nif (__battleMagicChunk !== undefined && !__battleBackground) globalThis.__battleEvidence?.magicOverlayDrawn(baseX + (frame.width >> 1), baseY + frame.height, frameIdx, __battleMagicChunk);\n',
        )
    }
    if (
      file === gameCoopTarget &&
      owner(node) === 'performCoopMagic' &&
      ts.isExpressionStatement(node) &&
      node.getText(ast) ===
        'performAttack(state, actor, target, bus, playerRoles, battleEffectIndex)' &&
      ts.isIfStatement(node.parent.parent) &&
      node.parent.parent.expression.getText(ast) === 'actor && !actor.isEnemy'
    )
      add(
        'coop-fallback',
        node.end,
        '\nglobalThis.__battleGameCoopFallback?.(state, actor, target);\n',
      )
    if (
      file.endsWith('/draw-battle-ui.ts') &&
      owner(node) === 'drawPlayerInfoBoxes' &&
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(ast) === 'drawPlayerInfoBox'
    ) {
      visualCall('panel-draw', node, 'panelDrawn', 'i')
      add(
        'portrait-arguments',
        node.expression.arguments.at(-1).end,
        ', { slot: i, colors: gs.palette?.colors }',
      )
    }
    if (file.endsWith('/player-info-box.ts')) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'drawPlayerInfoBox')
        add('portrait-parameter', node.parameters.at(-1).end, ', __battlePortrait?')
      if (
        ts.isIfStatement(node) &&
        owner(node) === 'drawPlayerInfoBox' &&
        node.expression.getText(ast) === 'face' &&
        node.thenStatement.getText(ast) === 'blitPortrait(fb, face, x - 2, y - 4, view.faceColor)'
      ) {
        add(
          'portrait-before',
          node.thenStatement.getStart(ast),
          '{\nconst __battleReadFace = globalThis.__battleEvidence?.captureIndexedPortrait(__battlePortrait?.slot, view.hp, fb, face, x - 2, y - 4, __battlePortrait?.colors);\n',
        )
        add('portrait-after', node.thenStatement.end, '\n__battleReadFace?.();\n}\n')
      }
    }
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
            '\nif (globalThis.__battleGameActionStart) {\n' +
              'const enemyMagic = actor.isEnemy && action.type === "magic" && action.actionId !== undefined\n' +
              '  ? resolveMagicObject(action.actionId, res.spells, res.magics, res.objectMagics)?.magic\n' +
              '  : undefined;\n' +
              'globalThis.__battleGameActionStart(state, gs, actor, action, res.playerRoles, enemyMagic?.type);\n}\n',
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
      owner(node) === 'handleEnemyTargetSelect' &&
      node.expression.getText(ast) === 'state.pendingActionDraft = undefined'
    ) {
      add(
        'enemy-target-draft',
        node.getStart(ast),
        'const __battleCancelledDraft = state.pendingActionDraft;\n',
      )
      add(
        'enemy-target-cancel',
        node.end,
        "\nglobalThis.__battleGameTargetCancel?.(state, __battleCancelledDraft, 'enemy');\n",
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
    if (
      file.endsWith('/battle/battle-system.ts') &&
      owner(node) === 'tickActionFollowup' &&
      ts.isForOfStatement(node) &&
      node.expression.getText(ast) === 'friendDeathEffects.commands'
    ) {
      add(
        'casualty-effect-before',
        node.getStart(ast),
        'const __battleCasualtyBefore = globalThis.__battleGameCasualtyEffect?.(state, res.playerRoles, idx);\n',
      )
      add(
        'casualty-effect-after',
        node.end,
        '\nglobalThis.__battleGameCasualtyEffect?.(state, res.playerRoles, idx, __battleCasualtyBefore);\n',
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const hasActionFollowup = ast.statements.some(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'tickActionFollowup',
  )
  const leafExpected = {
    'audio.ts': {
      'audio-request': 1,
      'audio-cue-parameter': 1,
      'audio-decode': 1,
      'audio-cached-cue': 1,
      'audio-loaded-cue': 1,
      'audio-start': 1,
    },
    'present-battle.ts': {
      'frame-begin': 1,
      'frame-end': 1,
      'number-target': 1,
      'settlement-draw': 1,
      'dialogue-slot': 2,
      'background-magic-draw': 1,
    },
    'dialog-draw.ts': { 'dialogue-line': 3, 'dialogue-portrait': 1, 'dialogue-narration': 1 },
    'battle-dialog.ts': { 'dialogue-confirm-before': 1, 'dialogue-confirm-after': 1 },
    'coop-magic.ts': { 'coop-fallback': 1 },
    'draw-battle-effect.ts': {
      'overlay-blit-parameter': 1,
      'magic-overlay-background-parameter': 1,
      'magic-overlay-resource': 1,
      'magic-overlay-argument': 1,
      'magic-overlay-draw': 1,
    },
    'draw-battle-sprites.ts': {
      'fighter-frame-selection': 2,
      'enemy-draw-identity': 1,
      'player-draw-identity': 1,
      'fighter-draw': 1,
    },
    'draw-battle-ui.ts': { 'panel-draw': 1, 'portrait-arguments': 1 },
    'player-info-box.ts': { 'portrait-parameter': 1, 'portrait-before': 1, 'portrait-after': 1 },
    'draw-battle-num.ts': { 'number-parameter': 1, 'number-identity': 1, 'number-draw': 1 },
  }
  const expected =
    leafExpected[file.split('/').at(-1)] ??
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
                'enemy-target-draft': 1,
                'enemy-target-cancel': 1,
                actionStart: 1,
                'action-produced': 1,
                actionComplete: hasActionFollowup ? 2 : 4,
                ...(hasActionFollowup
                  ? { 'casualty-effect-before': 1, 'casualty-effect-after': 1 }
                  : {}),
              })
  assert.deepEqual(anchors, expected, 'Q2 Game native observation boundary census changed')
  let code = source
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.end)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  if (file.endsWith('/battle-system.ts') || file === gameCoopTarget) {
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
