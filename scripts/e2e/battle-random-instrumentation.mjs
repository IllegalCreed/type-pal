import assert from 'node:assert/strict'
import ts from 'typescript'

const gameStrike = {
  'rng.rangeInclusive(1, 2)': 'strike-bonus',
  'rng.rangeInclusive(0, 5)': 'strike-critical',
  'rng.rangeInclusive(0, 11)': 'strike-hero-critical',
  'rng.rangeFloat(1, 1.125)': 'strike-variance',
  'state.rng.rangeInclusive(0, 16)': 'enemy-block',
  'state.rng.rangeInclusive(0, 2)': 'enemy-attack-bonus',
  'state.rng.rangeInclusive(0, 1)': 'enemy-damage-bonus',
  'state.rng.rangeInclusive(1, 10)': 'enemy-equivalent-item',
  'state.rng.rangeInclusive(1, 100)': 'enemy-equivalent-poison-resist',
}
const reforgeStrike = {
  2: 'strike-bonus',
  6: 'strike-critical',
  12: 'strike-hero-critical',
  0.125: 'strike-variance',
}
const reforgeEnemy = {
  17: 'enemy-block',
  3: 'enemy-attack-bonus',
  2: 'enemy-damage-bonus',
}

/** Annotate the actual RNG call, retaining native short circuits and evaluation order. */
export function instrumentBattleRandomDraws(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = [],
    anchors = {}
  let legacyChance = false
  let legacyEquivalent = false
  const mark = (node, purpose, { queue, target, when = '' } = {}) => {
    anchors[purpose] = (anchors[purpose] ?? 0) + 1
    const metadata = target ? `, undefined, ${target}` : queue ? `, ${queue}` : ''
    edits.push(
      {
        at: node.getStart(ast),
        text: `(${when}globalThis.__battleEvidence?.markRandom('${purpose}'${metadata}), `,
      },
      { at: node.end, text: ')' },
    )
  }
  const visit = (node, owner = '') => {
    if (ts.isFunctionDeclaration(node)) owner = node.name?.text
    if (ts.isCallExpression(node)) {
      const expression = node.getText(ast)
      if (file.endsWith('/battle-system.ts')) {
        if (owner === 'tickSelectAction' && expression === 'jitter(baseDex)') {
          const extra = ts.isConditionalExpression(node.parent)
          mark(node, 'queue-dexterity', {
            queue: `{ turn: state.turn + 1, side: 'enemy', slot: i, speed: baseDex, extra: ${extra} }`,
          })
        }
        if (owner === 'tickSelectAction' && expression === 'jitter(dex)')
          mark(node, 'queue-dexterity', {
            queue: "{ turn: state.turn + 1, side: 'player', slot: i, speed: dex, extra: false }",
          })
        if (owner === 'performBattleAction' && expression === 'state.rng.rangeInclusive(2, 3)') {
          const pool = node.parent.arguments?.[0]?.getText(ast)
          if (pool === "'rgHealthExp'") mark(node, 'attack-growth')
          if (pool === "'rgMagicExp'") mark(node, 'cast-growth')
        }
      } else if (file.endsWith('/actions/attack.ts') && Object.hasOwn(gameStrike, expression)) {
        mark(node, gameStrike[expression])
      } else if (
        file.endsWith('/actions/coop-magic.ts') &&
        owner === 'performCoopMagic' &&
        expression === 'state.rng.rangeInclusive(2, 3)' &&
        ts.findAncestor(node, ts.isIfStatement)?.expression.getText(ast) === 'gs'
      ) {
        mark(node, 'attack-growth')
      } else if (file.endsWith('/enemy-ai.ts') && owner === 'decideEnemyAction') {
        if (expression === 'rng.rangeInclusive(0, party.length - 1)')
          mark(node, 'enemy-target', { when: 'party.length > 1 && ' })
        if (expression === 'rng.range(0, 10)') mark(node, 'enemy-magic-choice')
      } else if (file.endsWith('/magic-damage.ts')) {
        if (owner === 'applyMagicDamage' && expression === 'state.rng.next()')
          mark(node, 'spell-damage-variance', {
            target: "{ turn: state.turn + 1, side: 'enemy', slot: idx }",
          })
        if (owner === 'rollAutoDefend' && expression === 'state.rng.range(0, 3)')
          mark(node, 'enemy-magic-block')
        if (owner === 'applyEnemyMagicDamage' && expression === 'state.rng.next()')
          mark(node, 'enemy-magic-damage-float')
      } else if (file.endsWith('/battle-opcodes.ts') && owner === 'dispatchBattleOpcode') {
        const opcode = ts.findAncestor(node, ts.isCaseClause)?.expression.getText(ast)
        if (opcode === 'OP_POISON_PLAYER' && expression === 'state.rng.rangeInclusive(1, 100)')
          mark(node, 'enemy-equivalent-poison-script')
        if (opcode === 'OP_SET_ENEMY_STATUS' && expression === 'state.rng.rangeInclusive(0, 9)')
          mark(node, 'status-resistance', {
            target: "{ turn: state.turn + 1, side: 'enemy', slot: sel.idx }",
          })
        if (opcode === 'OP_THROW_WEAPON' && expression === 'state.rng.rangeInclusive(0, 3)')
          mark(node, 'throw-weapon-strength')
      } else if (file.endsWith('/event-system.ts') && owner === 'applyRawOpcode') {
        const opcode = ts.findAncestor(node, ts.isCaseClause)?.expression.getText(ast)
        if (opcode === 'OP_JUMP_BY_RATE') {
          if (expression === 'battleRng.rangeInclusive(1, 100)') mark(node, 'battle-script-chance')
          if (
            expression === 'Math.random()' &&
            ts.findAncestor(node, ts.isIfStatement)?.expression.getText(ast) ===
              'Math.floor(Math.random() * 100) + 1 >= rate'
          )
            legacyChance = true
        }
      } else if (file.endsWith('/battle-core.ts') && ['rng()', '_rng()'].includes(expression)) {
        const multiplier = ts.isBinaryExpression(node.parent) && node.parent.right.getText(ast)
        if (owner === 'stepBattle') {
          let entry = node.parent
          while (entry && !ts.isPropertyAssignment(entry)) entry = entry.parent
          const name = entry?.name.getText(ast)
          if (name === 'dex' || name === 'dex2') {
            const isPlayer = entry.initializer.getText(ast).startsWith('Math.trunc(dex *')
            mark(node, 'queue-dexterity', {
              queue: `{ turn: s.turn, side: '${isPlayer ? 'player' : 'enemy'}', slot: i, speed: ${isPlayer ? 'dex' : 'base'}, extra: ${name === 'dex2'} }`,
            })
          }
        }
        if (owner === 'resolvePlayerAttackHit' && Object.hasOwn(reforgeStrike, multiplier))
          mark(node, reforgeStrike[multiplier])
        if (owner === 'performEnemyAction' && Object.hasOwn(reforgeEnemy, multiplier))
          mark(node, reforgeEnemy[multiplier])
        if (owner === 'sampleLivePlayerSlot') mark(node, 'enemy-target')
        if (owner === 'decideEnemyAction' && multiplier === '100') mark(node, 'enemy-magic-choice')
        if (
          owner === 'executeCasualtyScript' &&
          multiplier === '100' &&
          ts.findAncestor(node, ts.isIfStatement)?.expression.getText(ast) ===
            '1 + Math.floor(rng() * 100) >= gate.chance'
        )
          mark(node, 'battle-script-chance')
        if (owner === 'applyEnemySkill') {
          if (multiplier === '3') mark(node, 'enemy-magic-block')
          if (multiplier === '0.1') mark(node, 'enemy-magic-damage-float')
          if (
            multiplier === '100' &&
            ts.findAncestor(node, ts.isCaseClause)?.expression.getText(ast) === "'gate'"
          )
            mark(node, 'battle-script-chance')
        }
        if (owner === 'applyEnemyEquivItem' && multiplier === '10')
          mark(node, 'enemy-equivalent-item')
        if (owner === 'applyEnemyEquivItem' && multiplier === '100') {
          const guard = ts.findAncestor(node, ts.isIfStatement)
          if (guard && ts.isReturnStatement(guard.thenStatement))
            mark(node, 'enemy-equivalent-poison-resist')
          if (guard && ts.isContinueStatement(guard.thenStatement))
            mark(node, 'enemy-equivalent-poison-script')
        }
        if (owner === 'dealSkillDamage' && multiplier === '0.1')
          mark(node, 'spell-damage-variance', {
            target: "{ turn: s.turn, side: 'enemy', slot: ti }",
          })
        if (owner === 'performCoopMagic' && multiplier === '0.1')
          mark(node, 'spell-damage-variance', {
            target: "{ turn: s.turn, side: 'enemy', slot: ti }",
          })
        if (owner === 'performThrow') {
          if (multiplier === '0.1')
            mark(node, 'spell-damage-variance', {
              target: "{ turn: s.turn, side: 'enemy', slot: enemyIdx }",
            })
          const declaration = ts.findAncestor(node, ts.isVariableDeclaration)
          if (
            declaration?.name.getText(ast) === 'value' &&
            declaration.initializer?.getText(ast).includes('effect.strength.multiplier.min')
          )
            mark(node, 'throw-weapon-strength')
        }
        if (owner === 'applyPlayerSkill') {
          const effect = ts.findAncestor(node, ts.isCaseClause)?.expression.getText(ast)
          if (multiplier === '2') mark(node, 'cast-growth')
          if (effect === "'gate'" && multiplier === '100') mark(node, 'battle-script-chance')
          if (effect === "'applyStatus'" && multiplier === '10')
            mark(node, 'status-resistance', {
              target: "{ turn: s.turn, side: 'enemy', slot: ti }",
            })
        }
        if (
          owner === 'recordPlayerAttackGrowth' ||
          (owner === 'performPlayerAction' && multiplier === '2')
        )
          mark(node, 'attack-growth')
      }
      if (
        file.endsWith('/battle-core.ts') &&
        owner === 'applyEnemyEquivItem' &&
        expression === 'applyPoisonToPlayer(p, Number(eff.poisonId), s.poisonDefs)' &&
        ts.findAncestor(node, ts.isIfStatement)?.expression.getText(ast) ===
          "eff.kind === 'applyPoison'"
      )
        legacyEquivalent = true
    }
    ts.forEachChild(node, (child) => visit(child, owner))
  }
  visit(ast)

  let expected
  if (file.endsWith('/battle-system.ts'))
    expected = { 'queue-dexterity': 3, 'attack-growth': 1, 'cast-growth': 1 }
  if (file.endsWith('/actions/attack.ts'))
    expected = Object.fromEntries(Object.values(gameStrike).map((name) => [name, 1]))
  if (file.endsWith('/actions/coop-magic.ts')) expected = { 'attack-growth': 1 }
  if (file.endsWith('/enemy-ai.ts')) expected = { 'enemy-target': 2, 'enemy-magic-choice': 1 }
  if (file.endsWith('/magic-damage.ts'))
    expected = { 'spell-damage-variance': 1, 'enemy-magic-block': 2, 'enemy-magic-damage-float': 1 }
  if (file.endsWith('/battle-opcodes.ts'))
    expected = {
      'enemy-equivalent-poison-script': 1,
      'status-resistance': 1,
      'throw-weapon-strength': 1,
    }
  // Exact old native branches remain observable in source replays, without invented random draws.
  if (file.endsWith('/event-system.ts'))
    expected = legacyChance ? {} : { 'battle-script-chance': 1 }
  if (file.endsWith('/battle-core.ts'))
    expected = {
      ...Object.fromEntries(
        [...Object.values(reforgeStrike), ...Object.values(reforgeEnemy)].map((name) => [name, 1]),
      ),
      'queue-dexterity': 3,
      'enemy-target': 2,
      'enemy-magic-choice': 1,
      'enemy-magic-block': 1,
      'enemy-magic-damage-float': 1,
      'enemy-equivalent-item': 1,
      'enemy-equivalent-poison-resist': 1,
      ...(legacyEquivalent ? {} : { 'enemy-equivalent-poison-script': 1 }),
      'battle-script-chance': 3,
      'status-resistance': 1,
      'spell-damage-variance': 3,
      'throw-weapon-strength': 1,
      'cast-growth': 1,
      // Old runtime captured for comparison had separate group and single attack growth callers.
      'attack-growth': source.includes('function recordPlayerAttackGrowth(') ? 1 : 2,
    }
  assert.deepEqual(anchors, expected, `battle RNG boundaries changed: ${file}`)
  let code = source
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
