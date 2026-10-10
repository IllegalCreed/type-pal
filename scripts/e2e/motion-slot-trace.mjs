import assert from 'node:assert/strict'
import ts from 'typescript'

/** Observe queue ownership and acknowledgement where the real slot changes state. */
export function instrumentMotionSlots(code, file) {
  if (file !== 'packages/reforge/src/world-motion-runtime.ts') return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    edits = [],
    anchors = {}
  const add = (key, at, text) => {
    anchors[key] = (anchors[key] ?? 0) + 1
    edits.push({ at, text })
  }
  const methodOf = (node) => {
    while (node && !ts.isMethodDeclaration(node)) node = node.parent
    return node?.name.getText(ast)
  }
  function visit(node) {
    const method = methodOf(node),
      source = node.getText(ast)
    if (method === 'registerMove') {
      if (ts.isExpressionStatement(node) && source === 'registry.set(id, entry)')
        add(
          'move-slot-register',
          node.end,
          '\nglobalThis.__openingCauseMotionSlot?.("registered",entry,input,{worldTick:this.worldTick,resumed:resumed??null});\n',
        )
      if (
        ts.isCallExpression(node) &&
        ['completion.commit', 'completion.resolve', 'completion.cancel'].includes(
          node.expression.getText(ast),
        )
      ) {
        const phase = {
          'completion.commit': 'committed',
          'completion.resolve': 'settled',
          'completion.cancel': 'cancelled',
        }[node.expression.getText(ast)]
        add(
          `move-slot-${phase}`,
          node.getStart(ast),
          `((__changed)=>{if(__changed) globalThis.__openingCauseMotionSlot?.(${JSON.stringify(phase)},entry,input,{worldTick:this.worldTick});return __changed;})(`,
        )
        edits.push({ at: node.end, text: ')' })
      }
    }
    if (method === 'registerAutoStep') {
      if (ts.isExpressionStatement(node) && source === 'this.coordinator.autoSlots.set(id, entry)')
        add(
          'step-slot-register',
          node.end,
          '\nglobalThis.__openingCauseMotionSlot?.("registered",entry,input,{worldTick:this.worldTick});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'committed = true')
        add(
          'step-slot-commit',
          node.end,
          '\nglobalThis.__openingCauseMotionSlot?.("committed",entry,input,{worldTick:this.worldTick});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'settled = true') {
        const cancelled = node.parent
          .getText(ast)
          .includes('reject(asyncIntentAbortError(message))')
        add(
          cancelled ? 'step-slot-cancel' : 'step-slot-settle',
          node.end,
          `\nglobalThis.__openingCauseMotionSlot?.(${JSON.stringify(cancelled ? 'cancelled' : 'settled')},entry,input,{worldTick:this.worldTick${cancelled ? '' : ',outcome'}});\n`,
        )
      }
      if (ts.isCallExpression(node) && source === "resolve({ outcome: 'droppedByAuthority' })")
        add(
          'step-slot-dropped',
          node.getStart(ast),
          'globalThis.__openingCauseMotionSlot?.("dropped",null,input,{worldTick:this.worldTick,outcome:"droppedByAuthority"});\n',
        )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(
    anchors,
    {
      'move-slot-committed': 1,
      'move-slot-settled': 1,
      'move-slot-cancelled': 1,
      'move-slot-register': 1,
      'step-slot-dropped': 1,
      'step-slot-commit': 1,
      'step-slot-settle': 1,
      'step-slot-cancel': 1,
      'step-slot-register': 1,
    },
    `motion slot anchors changed: ${file}`,
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
