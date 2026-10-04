import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'

export const TRACE_TARGETS = [
  'packages/game/src/core/event-system.ts',
  'packages/game/src/present/present.ts',
  'packages/reforge/src/main.ts',
  'packages/reforge/src/dialog/dialog-box.ts',
]

/** Insert hooks; never reprint/rewrite the original AST or change an engine expression. */
export function instrumentOpeningTrace(code, file) {
  assert(TRACE_TARGETS.includes(file), `unexpected trace source ${file}`)
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length, 0)
  const edits = []
  const seen = {}
  const gameWrites = {}
  const count = (key) => {
    seen[key] = (seen[key] ?? 0) + 1
  }
  const insert = (at, text) => edits.push({ at, text })
  const wrap = (node, before, after) => {
    insert(node.body.getStart(ast) + 1, `\n${before}\ntry {\n`)
    insert(node.body.end - 1, `\n} finally { ${after} }\n`)
  }
  const gamePoint = (source, gs = 'gs') =>
    `globalThis.__openingTraceGame?.(${gs}, ${JSON.stringify(source)}); globalThis.__openingMatrixGame?.(${gs}, ${JSON.stringify(source)});`
  function walk(node) {
    if (
      file.endsWith('/event-system.ts') &&
      ts.isBinaryExpression(node) &&
      /^[+-]?=$/.test(node.operatorToken.getText(ast)) &&
      /^npc\.[xy]$/.test(node.left.getText(ast))
    ) {
      let owner = node.parent
      while (owner && !ts.isFunctionDeclaration(owner)) owner = owner.parent
      const name = owner?.name?.text ?? 'unowned'
      gameWrites[name] = (gameWrites[name] ?? 0) + 1
    }
    if (file.endsWith('/event-system.ts') && ts.isFunctionDeclaration(node)) {
      const name = node.name?.text
      if (
        [
          'applyRawOpcode',
          'npcWalkTo',
          'partyWalkTo',
          'partyRideEventObject',
          'monsterChasePlayer',
          'tickEventSystem',
        ].includes(name)
      ) {
        count(name)
        const gs = name === 'npcWalkTo' ? 'globalThis.__tpgs' : 'gs'
        wrap(
          node,
          gamePoint(`before:${name}`, gs),
          gamePoint(`${name === 'tickEventSystem' ? 'tick' : 'commit'}:${name}`, gs),
        )
      }
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'presentFrame'
    ) {
      count('presentFrame')
      wrap(node, '', gamePoint('render:world'))
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'drawDialogOverlay'
    ) {
      count('drawDialogOverlay')
      wrap(node, '', 'globalThis.__openingMatrixGameRendered?.(gs);')
    }
    if (file.endsWith('/reforge/src/main.ts')) {
      if (
        ts.isExpressionStatement(node) &&
        ts.isBinaryExpression(node.expression) &&
        node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        const left = node.expression.left.getText(ast)
        if (left.endsWith('.pos'))
          assert(
            ['entity.pos', 'e.pos', 'meta.entity.pos', 'player.pos'].includes(left),
            `unreviewed position writer: ${left}`,
          )
        if (['entity.pos', 'e.pos', 'meta.entity.pos', 'player.pos'].includes(left)) {
          count(left)
          // Block keeps a formerly unbraced `if (e) e.pos = pos` conditional.
          insert(node.getStart(ast), `{ __openingPoint(${JSON.stringify(`before:${left}`)}); `)
          insert(node.end, `; __openingPoint(${JSON.stringify(`commit:${left}`)}); }\n`)
        }
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'render') {
        count('render')
        wrap(node, '__openingPoint("before:render");', '__openingPoint("render:world");')
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'bootGame') {
        count('bootGame')
        insert(
          node.body.end - 1,
          `\nfunction __openingPoint(source) {
          try {
            if (['s000','s001'].includes(activeScene.scene.id)) {
              const actors = {party:{position:[player.pos.col,player.pos.row,player.pos.height], facing,
                visible:true, sprite:world.party[0] ? partySpriteDef(world.party[0]).id : null,
                frame:worldPresentation.partyGesture}};
              if (activeScene.scene.id==='s001') for (const id of ['e3','e8','e10','e11']) {
                const e=activeScene.scene.entities.find(e=>e.id===id);
                if (!e) throw new Error('missing reforge actor '+id);
                actors[id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,
                  sprite:e.sprite??null,frame:worldPresentation.entityFrame(id)??motion.explicitAnimation(id)??null};
              }
              globalThis.__openingMatrixPoint?.(source,{scene:activeScene.scene.id,actors});
            }
            if (activeScene.scene.id !== 's001') return;
            const e = activeScene.scene.entities.find(e => e.id === 'e10');
            globalThis.__openingTracePoint?.(source, {
              engine: 'reforge', instance: String(currentMotionSceneSessionId()), clock: frames.now,
              npc: e?.id, position: e ? [e.pos.col, e.pos.row, e.pos.height] : [],
              facing: e?.facing, visible: e ? !e.hidden : false,
              dialogue: dialogBox.observe(),
              control: !runner && !dialogBox.active && !presentation.busy()
            });
          } catch (error) { globalThis.__openingTraceError?.(String(error)); }
        }\n`,
        )
      }
    }
    if (
      file.endsWith('/dialog/dialog-box.ts') &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'this.update(nowMs)'
    ) {
      count('beforeAutoAdvance')
      insert(
        node.getStart(ast),
        'globalThis.__openingRendered?.(this.observe()); globalThis.__openingMatrixRendered?.(this.observe());\n',
      )
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  if (file.endsWith('/event-system.ts'))
    assert.deepEqual(
      gameWrites,
      { applyRawOpcode: 10, npcWalkTo: 4, partyRideEventObject: 2, monsterChasePlayer: 14 },
      'NPC write census changed',
    )
  const expected = file.endsWith('/event-system.ts')
    ? {
        applyRawOpcode: 1,
        npcWalkTo: 1,
        partyWalkTo: 1,
        partyRideEventObject: 1,
        monsterChasePlayer: 1,
        tickEventSystem: 1,
      }
    : file.endsWith('/present/present.ts')
      ? { presentFrame: 1, drawDialogOverlay: 1 }
      : file.endsWith('/reforge/src/main.ts')
        ? {
            'entity.pos': 1,
            'e.pos': 3,
            'meta.entity.pos': 1,
            'player.pos': 7,
            render: 1,
            bootGame: 1,
          }
        : { beforeAutoAdvance: 1 }
  assert.deepEqual(seen, expected, `trace anchors changed: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors: seen }
}

export function openingTracePlugin() {
  return {
    name: 'isolated-opening-commit-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      const file = TRACE_TARGETS.find((target) => id.endsWith(`/${target}`))
      if (!file) return null
      const result = instrumentOpeningTrace(code, file)
      console.log(
        '[opening-trace]',
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
