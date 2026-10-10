import assert from 'node:assert/strict'
import ts from 'typescript'

export const PRESENTATION_TARGETS = [
  'packages/reforge/src/fade-driver.ts',
  'packages/reforge/src/dither-transition.ts',
]

/** Observe actual effect identity and successful output, never substitute an effect or a draw. */
export function instrumentPresentationEvidence(code, file) {
  if (!PRESENTATION_TARGETS.includes(file) && file !== 'packages/reforge/src/main.ts')
    return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    edits = [],
    anchors = {}
  const add = (name, at, text) => {
    anchors[name] = (anchors[name] ?? 0) + 1
    edits.push({ at, text })
  }
  const visit = (node) => {
    const source = node.getText(ast)
    if (file.endsWith('/fade-driver.ts')) {
      if (ts.isExpressionStatement(node) && source === 'this.valueOwner = owner')
        add(
          'fade-start',
          node.end,
          ';globalThis.__openingCausePresentationStart?.(this,nextEffect,signal,{kind:"fade",from,to:nextEffect.to,start,ms:nextEffect.ms});',
        )
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'finish')
        add(
          'fade-end',
          node.body.end - 1,
          ';globalThis.__openingCausePresentationEnd?.(effect,{error:error?String(error):null,value:this.value});',
        )
    }
    if (file.endsWith('/dither-transition.ts')) {
      if (ts.isExpressionStatement(node) && source.startsWith('this.active = {'))
        add(
          'dither-start',
          node.end,
          ';globalThis.__openingCausePresentationStart?.(this,this.active,signal,{kind:"ditherScreen",ms:this.active.durationMs,source});',
        )
      if (ts.isExpressionStatement(node) && source === 'active?.resolve()')
        add(
          'dither-end',
          node.end,
          ';globalThis.__openingCausePresentationEnd?.(active,{error:null,step:active?.lastStep});',
        )
      if (ts.isExpressionStatement(node) && source === 'active?.reject(error)')
        add(
          'dither-cancel',
          node.end,
          ';globalThis.__openingCausePresentationEnd?.(active,{error:String(error),step:active?.lastStep});',
        )
    }
    if (file.endsWith('/main.ts')) {
      if (ts.isIfStatement(node) && source === 'if (fadeDriver.value <= 0.001) return') {
        add(
          'fade-transparent',
          node.thenStatement.getStart(ast),
          '{ globalThis.__openingCausePresentationDraw?.(fadeDriver,{value:fadeDriver.value,alpha:0,color:fadeCurtain,now:frames.now}); ',
        )
        edits.push({ at: node.end, text: ' }' })
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'drawFadeCurtain') {
        const draw = node.body.statements.find(
          (s) => s.getText(ast) === 'ctx.fillRect(0, 0, canvas.width, canvas.height)',
        )
        assert(draw, 'fade output anchor changed')
        add(
          'fade-output',
          draw.end,
          ';globalThis.__openingCausePresentationDraw?.(fadeDriver,{value:fadeDriver.value,style:ctx.fillStyle,color:fadeCurtain,now:frames.now});',
        )
      }
      if (ts.isIfStatement(node) && node.expression.getText(ast) === 'dither.output') {
        assert.equal(
          node.thenStatement.getText(ast),
          'ctx.putImageData(dither.output, 0, 0)',
          'dither actual output anchor changed',
        )
        add(
          'dither-output',
          node.end,
          '\nglobalThis.__openingCausePresentationDraw?.(dither.output?dither:null,{step,pr,ms:dither.durationMs,startedAt:dither.startedAt,isZeroFrame,sampledAt:performance.now()});\n',
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(
    anchors,
    file.endsWith('/main.ts')
      ? { 'fade-transparent': 1, 'fade-output': 1, 'dither-output': 1 }
      : file.endsWith('/fade-driver.ts')
        ? { 'fade-start': 1, 'fade-end': 1 }
        : { 'dither-start': 1, 'dither-end': 1, 'dither-cancel': 1 },
    `presentation anchors changed: ${file}`,
  )
  for (const e of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, e.at) + e.text + code.slice(e.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
