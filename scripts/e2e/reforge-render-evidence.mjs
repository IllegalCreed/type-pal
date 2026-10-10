import assert from 'node:assert/strict'
import ts from 'typescript'

export const REFORGE_RENDER_TARGETS = [
  'packages/reforge/src/world-scene-presentation.ts',
  'packages/reforge/src/render.ts',
]

/** Read-only test instrumentation. SpriteDraw identity, never frame identity or an array index,
 * connects the selected NPC pose to the actual sorted draw callback. Weak keys stay frame-local. */
export function instrumentReforgeRenderEvidence(code, file) {
  assert(REFORGE_RENDER_TARGETS.includes(file), `unexpected render evidence source ${file}`)
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  const edits = [],
    anchors = {}
  const insert = (at, text) => edits.push({ at, text })
  const count = (key) => {
    anchors[key] = (anchors[key] ?? 0) + 1
  }
  const walk = (node) => {
    if (file.endsWith('/world-scene-presentation.ts')) {
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'sprites') {
        count('npcDrawIdentity')
        insert(node.body.getStart(ast) + 1, '\nglobalThis.__e2eNpcDrawSources ??= new WeakMap();\n')
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'sprites.push' &&
        ts.isObjectLiteralExpression(node.arguments[0]) &&
        node.arguments[0].properties.some((property) => property.name?.getText(ast) === 'frame')
      ) {
        count('npcDrawSelection')
        const sprite = node.arguments[0]
        insert(
          sprite.getStart(ast),
          '((__sprite) => { globalThis.__e2eNpcDrawSources.set(__sprite, { id:entity.id, frame:frameIndex, position:[entity.pos.col,entity.pos.row,entity.pos.height], facing:entity.facing??"down", assetId:definition.id, resourceAssetId:definition.asset, spriteSource:definition.id }); return __sprite; })(',
        )
        insert(sprite.end, ')')
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'partySprite' &&
        node.arguments[0]?.getText(ast) === 'leaderFrame'
      ) {
        count('partyDrawSelection')
        insert(
          node.getStart(ast),
          '((__sprite) => { globalThis.__e2eNpcDrawSources.set(__sprite, { id:"party", frame:leaderFrameIndex, position:[input.player.pos.col,input.player.pos.row,input.player.pos.height], facing:input.player.facing, assetId:leaderDefinition.id, resourceAssetId:leaderDefinition.asset, spriteSource:leaderDefinition.id }); return __sprite; })(',
        )
        insert(node.end, ')')
      }
    } else {
      if (
        ts.isExpressionStatement(node) &&
        node.expression.getText(ast) === 'b = bakeFrame(frame, this.palette)'
      ) {
        count('bakedFramePayload')
        insert(
          node.end,
          '; globalThis.__e2eBakedSpriteFrames ??= new WeakMap(); globalThis.__e2eBakedSpriteFrames.set(b,{width:frame.width,height:frame.height,pixels:new Uint8Array(frame.pixels),opaque:new Uint8Array(frame.opaque)});',
        )
      }
      if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'renderScene') {
        count('npcDrawPass')
        insert(
          node.body.getStart(ast) + 1,
          '\nconst __npcDraws = {}; let __npcDrawOrder = 0; globalThis.__e2eNpcDrawPasses ??= new WeakMap(); globalThis.__e2eNpcDrawPasses.delete(sprites); globalThis.__e2eNpcDrawViews ??= new WeakMap(); globalThis.__e2eNpcDrawViews.delete(sprites);\n',
        )
      }
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'rect' &&
        node.initializer?.getText(ast) === 'spriteBlitRect(sprite)'
      ) {
        count('npcBlitGeometry')
        insert(
          node.parent.parent.end,
          ';\nconst __source = globalThis.__e2eNpcDrawSources?.get(sprite); if (__source) globalThis.__e2eNpcDrawSources.set(sprite,{...__source,geometry:{worldRect:[rect.x,rect.y,rect.w,rect.h]}});\n',
        )
      }
      if (
        ts.isForOfStatement(node) &&
        node.expression.getText(ast) === 'entries' &&
        node.statement.getText(ast) === 'entry.draw()'
      ) {
        count('npcDrawCompleted')
        insert(node.statement.getStart(ast), '{ ')
        insert(
          node.end,
          '; const __selected = globalThis.__e2eNpcDrawSources?.get(entry.sprite); if (__selected) { const {id,...pose} = __selected; __npcDraws[id] = {...pose,frameResourceId:globalThis.__e2eRecordSpriteFrame?.(globalThis.__e2eBakedSpriteFrames?.get(entry.image))??null,frameSource:"drawn",drawStatus:"drawn",drawOrder:__npcDrawOrder}; } __npcDrawOrder++; }\nconst __viewTransform = this.ctx.getTransform(); globalThis.__e2eNpcDrawPasses.set(sprites, __npcDraws); globalThis.__e2eNpcDrawViews.set(sprites,{camera:{...camera},canvasSize:[this.ctx.canvas.width,this.ctx.canvas.height],transform:[__viewTransform.a,__viewTransform.b,__viewTransform.c,__viewTransform.d,__viewTransform.e,__viewTransform.f],pixelRounding:"round-after-camera"});\n',
        )
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.deepEqual(
    anchors,
    file.endsWith('/world-scene-presentation.ts')
      ? { npcDrawIdentity: 1, npcDrawSelection: 1, partyDrawSelection: 1 }
      : { bakedFramePayload: 1, npcDrawPass: 1, npcBlitGeometry: 1, npcDrawCompleted: 1 },
    `render evidence anchors changed: ${file}`,
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
