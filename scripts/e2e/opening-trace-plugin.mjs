import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { CAUSAL_TARGETS, instrumentOpeningCausalTrace } from './opening-causal-instrumentation.mjs'
import {
  instrumentReforgeRenderEvidence,
  REFORGE_RENDER_TARGETS,
} from './reforge-render-evidence.mjs'
import { instrumentSceneLifecycle } from './scene-lifecycle-trace.mjs'

export const TRACE_TARGETS = [
  'packages/game/src/core/event-system.ts',
  'packages/game/src/present/present.ts',
  'packages/reforge/src/main.ts',
  'packages/reforge/src/dialog/dialog-box.ts',
  ...REFORGE_RENDER_TARGETS,
  'packages/game/src/shell/bootstrap.ts',
  ...CAUSAL_TARGETS.filter(
    (file) =>
      !file.endsWith('/event-system.ts') &&
      !file.endsWith('/dialog-box.ts') &&
      !file.endsWith('/main.ts'),
  ),
]

/** Insert hooks; never reprint/rewrite the original AST or change an engine expression. */
export function instrumentOpeningTrace(code, file) {
  assert(TRACE_TARGETS.includes(file), `unexpected trace source ${file}`)
  if (
    CAUSAL_TARGETS.includes(file) &&
    !file.endsWith('/main.ts') &&
    !file.endsWith('/event-system.ts') &&
    !file.endsWith('/dialog-box.ts')
  )
    return instrumentOpeningCausalTrace(code, file)
  if (REFORGE_RENDER_TARGETS.includes(file)) return instrumentReforgeRenderEvidence(code, file)
  if (file.endsWith('/shell/bootstrap.ts')) return instrumentSceneLifecycle(code, file)
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
  const gamePoint = (source, gs = 'gs', evidence = 'undefined') =>
    `globalThis.__openingTraceGame?.(${gs}, ${JSON.stringify(source)}); globalThis.__openingMatrixGame?.(${gs}, ${JSON.stringify(source)}, ${evidence});`
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
      insert(
        node.body.getStart(ast) + 1,
        '\nconst __npcSelections = new Map(), __npcCandidates = {}, __npcDraws = {}; let __worldDrawOrder = 0;\n',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'sprite = frames[idx] ?? frames[0]'
    ) {
      count('npcSelectedFrame')
      insert(
        node.end,
        ';\n__npcSelections.set(npc.id,{assetId:npc.spriteNum,frame:frames[idx] ? idx : 0,spriteSource:"npcSpriteFrames",fallback:!frames[idx]});\n',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'sprite = ctx.npcSprites.get(npc.spriteNum)'
    ) {
      count('npcFallbackSprite')
      insert(
        node.end,
        ';\n__npcSelections.set(npc.id,{assetId:npc.spriteNum,frame:null,spriteSource:"npcSprites",fallback:true});\n',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === 'cullLeft'
    ) {
      count('npcBlitGeometry')
      insert(
        node.parent.parent.getStart(ast),
        '\n__npcCandidates["e"+npc.id] = {...__npcSelections.get(npc.id),geometry:{worldRect:[npc.x-sprite.anchorX,npc.y+7-sprite.anchorY,sprite.width,sprite.height]}};\n',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isArrowFunction(node) &&
      node.body.getText(ast) === 'drawSprite(f, capturedSprite, capturedSX, capturedSY + 7)'
    ) {
      count('npcDraw')
      insert(node.body.getStart(ast), '(')
      insert(
        node.body.end,
        ', __npcDraws["e"+capturedNpcId]={...__npcCandidates["e"+capturedNpcId],frameResourceId:globalThis.__e2eRecordSpriteFrame?.(capturedSprite)??null,position:[npc.x,npc.y],facing:npc.facing,drawStatus:"drawn",frameSource:"drawn",drawOrder:__worldDrawOrder}, undefined)',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isArrowFunction(node) &&
      node.body.getText(ast) === 'drawSprite(f, capturedFrame, capturedSX, capturedSY + 4)' &&
      node.parent.parent.properties.some(
        (property) =>
          property.name?.getText(ast) === 'id' && property.initializer?.getText(ast) === "'party'",
      )
    ) {
      count('partyDraw')
      insert(node.body.getStart(ast), '(')
      insert(
        node.body.end,
        ', __npcDraws.party={assetId:leaderSpriteNum,frame:activePartyFrames[frameIdx]?frameIdx:0,frameResourceId:globalThis.__e2eRecordSpriteFrame?.(capturedFrame)??null,position:[gs.party.x,gs.party.y],facing:gs.party.facing,geometry:{worldRect:[gs.party.x-capturedFrame.anchorX,gs.party.y+4-capturedFrame.anchorY,capturedFrame.width,capturedFrame.height]},spriteSource:"partyFrames",fallback:!activePartyFrames[frameIdx],drawStatus:"drawn",frameSource:"drawn",drawOrder:__worldDrawOrder}, undefined)',
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isForOfStatement(node) &&
      node.expression.getText(ast) === 'entries' &&
      node.statement.getText(ast) === 'e.draw(fb)'
    ) {
      count('worldDrawCompleted')
      insert(node.statement.getStart(ast), '{ ')
      // The unbraced loop and its statement share the same end offset. Insert
      // the closing brace and completion hook together so the hook stays outside.
      insert(
        node.end,
        `; __worldDrawOrder++; }\n${gamePoint('render:world', 'gs', '{engine:"game",tick:gs.frameNum??null,atMs:performance.now(),actors:__npcDraws,candidates:__npcCandidates,view:{camera:{...gs.camera},canvasSize:[fb.width,fb.height],transform:[1,0,0,1,0,0],pixelRounding:"unrounded"}}')}\n`,
      )
    }
    if (
      file.endsWith('/present/present.ts') &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'drawDialogOverlay'
    ) {
      count('drawDialogOverlay')
      const assertSuccessfulTail = (child) => {
        if (child !== node.body && ts.isFunctionLike(child)) return
        assert(!ts.isReturnStatement(child), 'dialog overlay gained an unobserved early return')
        ts.forEachChild(child, assertSuccessfulTail)
      }
      assertSuccessfulTail(node.body)
      insert(
        node.body.end - 1,
        '\n globalThis.__openingMatrixGameRendered?.(gs); globalThis.__openingCauseDialogueDraw?.("game",gs,dialogCtx);\n',
      )
    }
    if (file.endsWith('/reforge/src/main.ts')) {
      if (
        ts.isIfStatement(node) &&
        node.expression.getText(ast) === 'dialogBox.visible' &&
        node.thenStatement.getText(ast).includes('dialogBox.render(performance.now())')
      ) {
        let owner = node.parent
        while (owner && !ts.isFunctionLike(owner)) owner = owner.parent
        assert(
          ts.isFunctionDeclaration(owner) && owner.name?.text === 'render' && !node.elseStatement,
          `trace anchors changed: ${file}: inactive dialogue draw branch`,
        )
        count('inactiveDialogueDraw')
        // This branch is reached only after the actual world pass. Do not clear in
        // finally or after the active branch: autoAdvance closes AFTER drawing its page.
        insert(
          node.end,
          ' else { globalThis.__openingCauseDialogueDraw?.("reforge",[]); globalThis.__openingMatrixRendered?.(null); }\n',
        )
      }
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'refreshRuntimeProjection') {
        assert(
          ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body),
          'runtime projection commit shape changed',
        )
        const synchronous = (child) => {
          assert(!ts.isAwaitExpression(child), 'runtime projection became asynchronous')
          ts.forEachChild(child, synchronous)
        }
        synchronous(node.initializer.body)
        count('actualRuntimeProjection')
        wrap(node.initializer, '', '__openingPoint("commit:refreshRuntimeProjection");')
      }
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
        insert(node.body.getStart(ast) + 1, '\n__openingPoint("before:render");\n')
      }
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        node.expression.expression.getText(ast) === 'worldPresentation.renderWorld'
      ) {
        // Publish only after the complete world call, including its context restoration.
        // The pass is keyed by this exact sprite batch; absent instrumentation is not success.
        count('worldDrawCompleted')
        insert(
          node.end,
          ';\n__openingPoint("render:world", {atMs:performance.now(),tick:motion.worldTick,gameplayNow:frames.now,actors:globalThis.__e2eNpcDrawPasses?.get(sprites)??null,view:globalThis.__e2eNpcDrawViews?.get(sprites)??null});\n',
        )
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'bootGame') {
        count('bootGame')
        insert(
          node.body.end - 1,
          `\nfunction __openingPoint(source, renderEvidence) {
          try {
            if(source==='observe:causal') globalThis.__openingCauseWorld?.(world);
            let tick = null, instance = null;
            try { tick = motion.worldTick; instance = currentMotionSceneSessionId(); } catch {}
            globalThis.__e2eSceneBoundary?.({scene:activeScene.scene.id,tick,instance});
            if (['s000','s001'].includes(activeScene.scene.id)) {
              const actors = {party:{position:[player.pos.col,player.pos.row,player.pos.height], facing,
                visible:true, sprite:world.party[0] ? partySpriteDef(world.party[0]).id : null,
                frame:worldPresentation.partyGesture}};
              if (activeScene.scene.id==='s001') for (const id of ['e3','e8','e10','e11']) {
                const e=activeScene.scene.entities.find(e=>e.id===id);
                if (!e) throw new Error('missing reforge actor '+id);
                actors[id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,
                  state:host.getEntityState(id),behavior:world.script.behaviors?.entities?.[activeScene.scene.id]?.[id]??null,
                  frameRendered:worldPresentation.renderedEntityFrame(id)??null,
                  sprite:e.sprite??null,frame:worldPresentation.renderedEntityFrame?.(id)??worldPresentation.entityFrame(id)??motion.explicitAnimation(id)??null};
              }
              globalThis.__openingMatrixPoint?.(source,{scene:activeScene.scene.id,tick,renderEvidence:source==='render:world'?{engine:'reforge',...renderEvidence}:null,actors,
                control:activeScene.scene.id==='s001'&&!runner&&!dialogBox.active&&!presentation.busy()});
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
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'currentMotionSceneSessionId'
      ) {
        count('causalSnapshotInstalled')
        insert(
          node.parent.parent.end,
          '\nglobalThis.__openingCauseSnapshot = () => __openingPoint("observe:causal");\n',
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
        'globalThis.__openingCauseDialogueDraw?.("reforge",this.observeSlots()); globalThis.__openingRendered?.(this.observe()); globalThis.__openingMatrixRendered?.(this.observe());\n',
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
      ? {
          presentFrame: 1,
          npcSelectedFrame: 1,
          npcFallbackSprite: 1,
          npcBlitGeometry: 1,
          npcDraw: 1,
          partyDraw: 1,
          worldDrawCompleted: 1,
          drawDialogOverlay: 1,
        }
      : file.endsWith('/reforge/src/main.ts')
        ? {
            'entity.pos': 1,
            'e.pos': 3,
            'meta.entity.pos': 1,
            'player.pos': 7,
            render: 1,
            worldDrawCompleted: 1,
            bootGame: 1,
            causalSnapshotInstalled: 1,
            actualRuntimeProjection: 1,
            inactiveDialogueDraw: 1,
          }
        : { beforeAutoAdvance: 1 }
  assert.deepEqual(seen, expected, `trace anchors changed: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  if (file.endsWith('/reforge/src/main.ts')) {
    const lifecycle = instrumentSceneLifecycle(code, file)
    const causal = instrumentOpeningCausalTrace(lifecycle.code, file)
    return { code: causal.code, anchors: { ...seen, ...lifecycle.anchors, ...causal.anchors } }
  }
  const causal = instrumentOpeningCausalTrace(code, file)
  return { code: causal.code, anchors: { ...seen, ...causal.anchors } }
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
