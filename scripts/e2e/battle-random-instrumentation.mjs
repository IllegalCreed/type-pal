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
  const mark = (node, purpose, queue, when = '') => {
    anchors[purpose] = (anchors[purpose] ?? 0) + 1
    const metadata = queue ? `, ${queue}` : ''
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
          mark(
            node,
            'queue-dexterity',
            `{ turn: state.turn + 1, side: 'enemy', slot: i, speed: baseDex, extra: ${extra} }`,
          )
        }
        if (owner === 'tickSelectAction' && expression === 'jitter(dex)')
          mark(
            node,
            'queue-dexterity',
            "{ turn: state.turn + 1, side: 'player', slot: i, speed: dex, extra: false }",
          )
        if (owner === 'performBattleAction' && expression === 'state.rng.rangeInclusive(2, 3)') {
          const pool = node.parent.arguments?.[0]?.getText(ast)
          if (pool === "'rgHealthExp'") mark(node, 'attack-growth')
          if (pool === "'rgMagicExp'") mark(node, 'cast-growth')
        }
      } else if (file.endsWith('/actions/attack.ts') && Object.hasOwn(gameStrike, expression)) {
        mark(node, gameStrike[expression])
      } else if (
        file.endsWith('/enemy-ai.ts') &&
        owner === 'decideEnemyAction' &&
        expression === 'rng.rangeInclusive(0, party.length - 1)'
      ) {
        mark(node, 'enemy-target', undefined, 'party.length > 1 && ')
      } else if (file.endsWith('/battle-core.ts') && ['rng()', '_rng()'].includes(expression)) {
        const multiplier = ts.isBinaryExpression(node.parent) && node.parent.right.getText(ast)
        if (owner === 'stepBattle') {
          let entry = node.parent
          while (entry && !ts.isPropertyAssignment(entry)) entry = entry.parent
          const name = entry?.name.getText(ast)
          if (name === 'dex' || name === 'dex2') {
            const isPlayer = entry.initializer.getText(ast).startsWith('Math.trunc(dex *')
            mark(
              node,
              'queue-dexterity',
              `{ turn: s.turn, side: '${isPlayer ? 'player' : 'enemy'}', slot: i, speed: ${isPlayer ? 'dex' : 'base'}, extra: ${name === 'dex2'} }`,
            )
          }
        }
        if (owner === 'resolvePlayerAttackHit' && Object.hasOwn(reforgeStrike, multiplier))
          mark(node, reforgeStrike[multiplier])
        if (owner === 'performEnemyAction' && Object.hasOwn(reforgeEnemy, multiplier))
          mark(node, reforgeEnemy[multiplier])
        if (owner === 'sampleLivePlayerSlot') mark(node, 'enemy-target')
        if (owner === 'applyEnemyEquivItem' && multiplier === '10')
          mark(node, 'enemy-equivalent-item')
        if (owner === 'applyPlayerSkill' && multiplier === '2') mark(node, 'cast-growth')
        if (
          owner === 'recordPlayerAttackGrowth' ||
          (owner === 'performPlayerAction' && multiplier === '2')
        )
          mark(node, 'attack-growth')
      }
    }
    ts.forEachChild(node, (child) => visit(child, owner))
  }
  visit(ast)

  let expected
  if (file.endsWith('/battle-system.ts'))
    expected = { 'queue-dexterity': 3, 'attack-growth': 1, 'cast-growth': 1 }
  if (file.endsWith('/actions/attack.ts'))
    expected = Object.fromEntries(Object.values(gameStrike).map((name) => [name, 1]))
  if (file.endsWith('/enemy-ai.ts')) expected = { 'enemy-target': 2 }
  if (file.endsWith('/battle-core.ts'))
    expected = {
      ...Object.fromEntries(
        [...Object.values(reforgeStrike), ...Object.values(reforgeEnemy)].map((name) => [name, 1]),
      ),
      'queue-dexterity': 3,
      'enemy-target': 2,
      'enemy-equivalent-item': 1,
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
