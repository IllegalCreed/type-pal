import assert from 'node:assert/strict'
import ts from 'typescript'

/** Read-only lifetimes at actual work/party-slot owners, not command-name permission. */
export function instrumentAsyncWork(code, file) {
  const expected = {
    'packages/reforge/src/script-work-queue.ts': { 'io-start': 1, 'io-end': 1 },
    'packages/reforge/src/world-motion-runtime.ts': { 'party-register': 1, 'party-end': 2 },
    'packages/reforge/src/main.ts': { 'party-step': 1 },
  }[file]
  if (!expected) return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    edits = [],
    anchors = {}
  const add = (key, at, text) => {
    anchors[key] = (anchors[key] ?? 0) + 1
    edits.push({ at, text })
  }
  const owner = (node) => {
    while (node && !ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node))
      node = node.parent
    return node?.name?.getText(ast)
  }
  function visit(node) {
    const source = node.getText(ast),
      name = owner(node)
    if (file.endsWith('/script-work-queue.ts') && name === 'scriptWorkIO') {
      if (ts.isVariableStatement(node) && source === 'let settled = false')
        add(
          'io-start',
          node.end,
          '\nconst __workIO=globalThis.__openingCauseWorkIO?.("start",signal);\n',
        )
      if (ts.isExpressionStatement(node) && source === 'settled = true')
        add('io-end', node.end, '\nglobalThis.__openingCauseWorkIO?.("end",signal,__workIO);\n')
    }
    if (file.endsWith('/world-motion-runtime.ts') && name === 'schedulePartyMove') {
      if (ts.isExpressionStatement(node) && source === 'this.partySlot = entry')
        add(
          'party-register',
          node.end,
          '\nglobalThis.__openingCausePartyMotion?.("registered",entry,signal,{to,speed});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'settled = true')
        add(
          'party-end',
          node.end,
          `\nglobalThis.__openingCausePartyMotion?.(${JSON.stringify(node.parent.getText(ast).includes('reject(') ? 'cancelled' : 'settled')},entry,signal);\n`,
        )
    }
    if (
      file.endsWith('/main.ts') &&
      name === 'advanceMoves' &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'facing = result.facing'
    )
      add(
        'party-step',
        node.end,
        '\nglobalThis.__openingCausePartyMotion?.("step",mv,undefined,{from,to:result.pos,facing:result.facing,done:result.done});\n',
      )
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(anchors, expected, `async work anchors changed: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  return { code, anchors }
}
