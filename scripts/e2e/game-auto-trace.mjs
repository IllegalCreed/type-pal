import assert from 'node:assert/strict'
import ts from 'typescript'

/** Both exploration and event callers pass here. Visit-time gates are observed after
 * earlier NPCs may have changed this NPC; an entry census alone is not eligibility. */
export function instrumentGameAutoBatch(code, file) {
  if (['packages/game/src/core/mode.ts', 'packages/game/src/core/scene-system.ts'].includes(file)) {
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
      edits = [],
      anchors = {}
    const add = (key, at, text) => {
      anchors[key] = (anchors[key] ?? 0) + 1
      edits.push({ at, text })
    }
    const inputs =
      '{mode:gs.mode,sceneLoading:!!gs.sceneLoading,paletteFade:!!gs.paletteFadeState,suppress:!!gs.suppressAutoTriggerOnce,waiting:gs.eventCursor?.waiting??null}'
    function visit(node) {
      if (ts.isExpressionStatement(node) && node.expression.getText(ast) === 'tickAutoScripts(gs)')
        add(
          'auto-caller',
          node.getStart(ast),
          `globalThis.__openingCauseGame?.(gs,"auto-owed",null,{caller:${JSON.stringify(file.endsWith('/mode.ts') ? 'event' : 'explore')},...${inputs}});\n`,
        )
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.some(
          (entry) => entry.name.getText(ast) === 'shouldRunAutoScripts',
        )
      )
        add(
          'event-decision',
          node.getStart(ast),
          `globalThis.__openingCauseGame?.(gs,"auto-event-decision",null,${inputs});\n`,
        )
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((entry) => entry.name.getText(ast) === 'prevMode')
      )
        add(
          'mode-dispatch',
          node.getStart(ast),
          `globalThis.__openingCauseGame?.(gs,"auto-mode-dispatch",null,${inputs});\n`,
        )
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'tickScenePreInput') {
        add(
          'explore-start',
          node.body.getStart(ast) + 1,
          `\nglobalThis.__openingCauseGame?.(gs,"auto-explore-start",null,${inputs});try {\n`,
        )
        add(
          'explore-end',
          node.body.end - 1,
          `\n}finally {globalThis.__openingCauseGame?.(gs,"auto-explore-end",null,${inputs});}\n`,
        )
      }
      if (
        ts.isExpressionStatement(node) &&
        node.expression.getText(ast) === 'updateEventObjectsAndTrigger(gs, ctx)'
      )
        add(
          'explore-triggered',
          node.end,
          `\nglobalThis.__openingCauseGame?.(gs,"auto-explore-triggered",null,${inputs});\n`,
        )
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.deepEqual(
      anchors,
      file.endsWith('/mode.ts')
        ? { 'event-decision': 1, 'auto-caller': 1, 'mode-dispatch': 1 }
        : { 'explore-start': 1, 'explore-end': 1, 'explore-triggered': 1, 'auto-caller': 1 },
      'Game automatic caller changed',
    )
    for (const edit of edits.sort((a, b) => b.at - a.at))
      code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
    return { code, anchors }
  }
  if (file !== 'packages/game/src/core/event-system.ts') return { code, anchors: {} }
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    edits = [],
    anchors = {}
  const add = (key, at, text) => {
    anchors[key] = (anchors[key] ?? 0) + 1
    edits.push({ at, text })
  }
  function visit(node) {
    if (ts.isCaseClause(node) && node.expression.getText(ast) === 'OP_SET_AUTO_SCRIPT') {
      const block = node.statements.find((statement) => ts.isBlock(statement))
      const terminal = block?.statements.at(-1)
      assert(terminal && ts.isBreakStatement(terminal), 'automatic selection setter changed')
      add(
        'auto-selection-commit',
        terminal.getStart(ast),
        '\nglobalThis.__openingCauseGame?.(gs,"auto-selection-committed",null,{entity:npc?.id??null,operand:operands[0]??0,entry:operands[1]??0,label:npc?.autoLabel??null,cursor:npc?.autoCursor??null});\n',
      )
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'tickAutoScripts') {
      add(
        'auto-batch-start',
        node.body.getStart(ast) + 1,
        '\nglobalThis.__openingCauseGame?.(gs,"auto-batch-start",null,{npcIds:gs.npcs.map(n=>n.id),commandsReady:getGlobalCommands().length>0}); let __autoBatchFailed=false; try {\n',
      )
      add(
        'auto-batch-end',
        node.body.end - 1,
        '\n} catch(__autoError) { __autoBatchFailed=true; throw __autoError; } finally { globalThis.__openingCauseGame?.(gs,"auto-batch-end",null,{failed:__autoBatchFailed}); }\n',
      )
      const loop = node.body.statements.find((e) => ts.isForOfStatement(e))
      assert(loop && ts.isBlock(loop.statement), 'auto NPC iteration changed')
      add(
        'auto-batch-visit',
        loop.statement.getStart(ast) + 1,
        '\nglobalThis.__openingCauseGame?.(gs,"auto-visit",npc.autoCursor,{actor:npc.id,state:npc.sState??1,vanish:npc.sVanishTime??0,label:npc.autoLabel??null,ip:npc.autoCursor?.ip??null,idle:npc.autoCursor?.idleFrameCount??0,triggerOwner:gs.eventCursor?.triggerOwnerId??null,waiting:gs.eventCursor?.waiting??null,startedExecution:gs.eventCursor?.startedExecution??false});\n',
      )
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === 'r' &&
      node.initializer?.getText(ast) === 'resolveScriptLabel(gs, npc.autoLabel)'
    ) {
      add(
        'auto-label-resolution',
        node.parent.parent.end,
        '\nglobalThis.__openingCauseGame?.(gs,"auto-resolved",npc.autoCursor,{actor:npc.id,label:npc.autoLabel,resolvedIp:r?.ip??null});\n',
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(anchors, {
    'auto-selection-commit': 1,
    'auto-batch-start': 1,
    'auto-batch-end': 1,
    'auto-batch-visit': 1,
    'auto-label-resolution': 1,
  })
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  return { code, anchors }
}
