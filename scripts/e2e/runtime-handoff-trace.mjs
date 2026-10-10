import assert from 'node:assert/strict'
import ts from 'typescript'

export const RUNTIME_HANDOFF_TARGETS = [
  'packages/reforge/src/main.ts',
  'packages/reforge/src/runtime-frame-session.ts',
]

/** Observe the actual capture/store/project/consume edges; never call a capture twice. */
export function instrumentRuntimeHandoff(code, file) {
  if (!RUNTIME_HANDOFF_TARGETS.includes(file)) return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const edits = [],
    anchors = {}
  const add = (key, at, text) => {
    anchors[key] = (anchors[key] ?? 0) + 1
    edits.push({ at, text })
  }
  const wrapExpression = (key, node, before, after) => {
    add(key, node.getStart(ast), before)
    edits.push({ at: node.end, text: after })
  }
  const owner = (node) => {
    while (node && !ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node))
      node = node.parent
    return node?.name?.getText(ast)
  }
  function visit(node) {
    const source = node.getText(ast)
    if (file.endsWith('/runtime-frame-session.ts')) {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'remaining' &&
        ts.isArrowFunction(node.initializer)
      )
        wrapExpression(
          'wait-remaining',
          node.initializer.body,
          '((__value) => { globalThis.__openingCauseWaitRemaining?.(timer,{remainingMs:__value,now:this.#now,deadline:timer.deadline,pausedRemaining:timer.pausedRemaining??null,settled}); return __value; })(',
          ')',
        )
      if (
        ts.isReturnStatement(node) &&
        node.expression &&
        ts.isObjectLiteralExpression(node.expression) &&
        owner(node) === 'scheduleWait'
      )
        wrapExpression(
          'wait-handle',
          node.expression,
          '((__handle) => { globalThis.__openingCauseWaitHandle?.(__handle,timer); return __handle; })(',
          ')',
        )
    } else {
      if (
        ts.isReturnStatement(node) &&
        source === 'return saved' &&
        owner(node) === 'captureSceneRuntime'
      )
        add(
          'capture',
          node.getStart(ast),
          '\nglobalThis.__openingCauseRuntimeCapture?.(saved,{scene:activeScene.scene.id,positions:captured.script?.entityPos?.[activeScene.scene.id]??{},cursors:captured.script?.behaviors.entities?.[activeScene.scene.id]??{},live:activeScene.scene.entities.map(e=>({id:e.id,pos:e.pos,facing:e.facing??null,fixedFrame:worldPresentation.entityFrame(e.id)??null}))});\n',
        )
      if (ts.isReturnStatement(node) && owner(node) === 'captureCurrentSavePayload')
        wrapExpression(
          'save-payload',
          node.expression,
          '((__payload) => { globalThis.__openingCauseRuntimeSavePayload?.(__payload,scenes); return __payload; })(',
          ')',
        )
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'applyWorldToScene') {
        add('projection-end', node.body.getStart(ast) + 1, '\nlet __handoffFailed=false; try {\n')
        edits.push({
          at: node.body.end - 1,
          text: '\n} catch(__handoffError) { __handoffFailed=true; throw __handoffError; } finally { if(!__handoffFailed) globalThis.__openingCauseRuntimeProjection?.("end",sceneRuntimeStates[activeScene.scene.id],{scene:activeScene.scene.id,entities:activeScene.scene.entities.map(e=>e.id),waits:Object.fromEntries(restoredWaits)}); }\n',
        })
      }
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'remaining' &&
        owner(node) === 'captureSceneRuntime'
      )
        add(
          'capture-wait',
          node.parent.parent.end,
          '\nglobalThis.__openingCauseRuntimeWaitCapture?.(saved,id,wait?.timer,restoredWaits.get(id),remaining);\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'sceneRuntimeStates[activeScene.scene.id] = captureSceneRuntime(world)'
      ) {
        add('cache-store', node.getStart(ast), '{ ')
        edits.push({
          at: node.end,
          text: '; globalThis.__openingCauseRuntimeStore?.("cache",activeScene.scene.id,sceneRuntimeStates[activeScene.scene.id]); }',
        })
      }
      if (
        ts.isExpressionStatement(node) &&
        source === 'scenes[activeScene.scene.id] = captureSceneRuntime(captured)'
      )
        add(
          'save-store',
          node.end,
          '\nglobalThis.__openingCauseRuntimeSave?.(scenes,activeScene.scene.id);\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'sceneRuntimeStates = structuredClone(payload.sceneRuntime)'
      )
        add(
          'load-store',
          node.end,
          '\nglobalThis.__openingCauseRuntimeLoad?.(sceneRuntimeStates,payload);\n',
        )
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'saved' &&
        owner(node) === 'applyWorldToScene'
      )
        add(
          'projection-input',
          node.parent.parent.end,
          '\nglobalThis.__openingCauseRuntimeProjection?.("start",saved,{scene:activeScene.scene.id,cursors:canonicalScript.behaviors.entities?.[activeScene.scene.id]??{}});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'motion.restoreEntity(entity.id, motionPose)'
      )
        add(
          'projection-pose',
          node.end,
          '\nglobalThis.__openingCauseRuntimeProjection?.("pose",saved,{scene:activeScene.scene.id,entity:entity.id,facing:entity.facing??null,fixedFrame:worldPresentation.entityFrame(entity.id)??null,motion:motionPose,actualMotion:motion.captureEntity(entity.id)});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'restoredWaits.set(id, structuredClone(automatic.wait))'
      ) {
        add('projection-wait', node.getStart(ast), '{ ')
        edits.push({
          at: node.end,
          text: '; globalThis.__openingCauseRuntimeRestoreWait?.(saved,id,restoredWaits.get(id)); }',
        })
      }
      if (
        ts.isExpressionStatement(node) &&
        source === 'automaticWaits.set(signal, { kind, durationMs: ms, timer })'
      )
        add(
          'consume-wait',
          node.end,
          '\nglobalThis.__openingCauseRuntimeConsume?.(signal,resumed,timer,{entity:activation.entityId,scene:activeScene.scene.id,kind,durationMs:ms,remainingMs});\n',
        )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(
    anchors,
    file.endsWith('/runtime-frame-session.ts')
      ? { 'wait-remaining': 1, 'wait-handle': 1 }
      : {
          'projection-end': 1,
          'projection-input': 1,
          'projection-pose': 1,
          'projection-wait': 1,
          'consume-wait': 1,
          'cache-store': 1,
          'capture-wait': 1,
          capture: 1,
          'save-store': 1,
          'save-payload': 1,
          'load-store': 1,
        },
    `runtime handoff anchors changed: ${file}`,
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
