import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentAsyncWork } from './async-work-trace.mjs'
import { ENTITY_ACTION_TARGET, instrumentEntityActions } from './entity-action-trace.mjs'
import { instrumentGameAutoBatch } from './game-auto-trace.mjs'
import { instrumentMotionSlots } from './motion-slot-trace.mjs'
import { instrumentPresentationEvidence, PRESENTATION_TARGETS } from './presentation-evidence.mjs'
import { instrumentRuntimeHandoff } from './runtime-handoff-trace.mjs'

export const CAUSAL_TARGETS = [
  ENTITY_ACTION_TARGET,
  ...PRESENTATION_TARGETS,
  'packages/game/src/core/mode.ts',
  'packages/game/src/core/scene-system.ts',
  'packages/game/src/core/event-system.ts',
  'packages/reforge/src/runtime-frame-session.ts',
  'packages/reforge/src/world-motion-runtime.ts',
  'packages/reforge/src/script-runner-core.ts',
  'packages/reforge/src/runtime-script-project.ts',
  'packages/reforge/src/dialog/dialog-box.ts',
  'packages/reforge/src/cutscene-controller.ts',
  'packages/reforge/src/script-host-adapter.ts',
  'packages/reforge/src/main.ts',
  'packages/reforge/src/script-work-queue.ts',
  'packages/reforge/src/motion-runtime-coordinator.ts',
  'packages/reforge/src/script-wake-gate.ts',
  'packages/reforge/src/script-project-core.ts',
]

/** E2E-only observations at real producers/consumers. Never replace an engine expression. */
export function instrumentOpeningCausalTrace(code, file) {
  if (!CAUSAL_TARGETS.includes(file)) return { code, anchors: {} }
  if (file === ENTITY_ACTION_TARGET) return instrumentEntityActions(code, file)
  const presentation = instrumentPresentationEvidence(code, file)
  if (PRESENTATION_TARGETS.includes(file)) return presentation
  const handoff = instrumentRuntimeHandoff(presentation.code, file)
  const actions = file.endsWith('/reforge/src/main.ts')
    ? instrumentEntityActions(handoff.code, file)
    : { code: handoff.code, anchors: {} }
  const slots = instrumentMotionSlots(actions.code, file)
  const work = instrumentAsyncWork(slots.code, file)
  const gameAuto = instrumentGameAutoBatch(work.code, file)
  if (file.endsWith('/game/src/core/scene-system.ts')) return gameAuto
  code = gameAuto.code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const edits = [],
    counts = {},
    gameCommandReads = {}
  const add = (name, at, text) => {
    counts[name] = (counts[name] ?? 0) + 1
    edits.push({ at, text })
  }
  const statement = (node) => {
    while (node && !ts.isStatement(node)) node = node.parent
    return node
  }
  function visit(node) {
    const source = node.getText(ast)
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'dialogBox.close()'
    ) {
      const owners = []
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isFunctionLike(parent) && parent.name) owners.push(parent.name.getText(ast))
        if (ts.isPropertyAssignment(parent)) owners.push(parent.name.getText(ast))
        if (ts.isVariableDeclaration(parent)) owners.push(parent.name.getText(ast))
      }
      const reason = owners.includes('abort')
        ? 'runner-abort'
        : owners.includes('clearDialog')
          ? 'clearDialog'
          : owners.includes('resetPresentation')
            ? 'presentation-reset'
            : owners.includes('loadScene')
              ? 'scene-transition'
              : owners.includes('ditherScreen')
                ? 'ditherScreen'
                : owners.some((owner) => ['startScript', 'runDetachedScriptChain'].includes(owner))
                  ? 'script-end'
                  : null
      assert(reason, `unknown dialogue clear caller: ${owners.join('/')}`)
      add(
        'dialog-clear-caller',
        node.getStart(ast),
        `globalThis.__openingCauseDialogClear?.(${JSON.stringify(reason)},${['runner-abort', 'scene-transition', 'ditherScreen'].includes(reason) ? 'signal' : reason === 'script-end' ? (owners.includes('runDetachedScriptChain') ? 'runSignal' : 'controller.signal') : 'null'});\n`,
      )
    }
    if (
      (file.endsWith('/cutscene-controller.ts') || file.endsWith('/script-host-adapter.ts')) &&
      ts.isExpressionStatement(node) &&
      ['this.exec.clearDialog()', 'host.clearDialog()'].includes(source)
    ) {
      add(
        'dialog-clear-intent-before',
        node.getStart(ast),
        `const __clearCaller=globalThis.__openingCauseDialogClearContext?.("start",signal,null,${JSON.stringify(file.endsWith('/script-host-adapter.ts') ? 'host-adapter' : 'presentation')}); try {\n`,
      )
      add(
        'dialog-clear-intent-after',
        node.end,
        '\n} finally { globalThis.__openingCauseDialogClearContext?.("end",signal,__clearCaller); }\n',
      )
    }
    if (file.endsWith('/script-project-core.ts')) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'projection')
        add(
          'move-observation-start',
          statement(node).end,
          '\nconst __moveReceipt=globalThis.__openingCauseMove?.("move-start",signal,command); try {\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'committed = true' &&
        node.parent.getText(ast).includes('writeEntityValue(this.world.entityPos')
      )
        add(
          'move-observation-commit',
          node.end,
          '\nglobalThis.__openingCauseMove?.("move-commit",signal,command,__moveReceipt);\n',
        )
      if (ts.isCaseClause(node) && node.expression.getText(ast) === "'moveEntity'")
        add(
          'move-observation-end',
          node.statements[0].end - 1,
          '\n} finally { globalThis.__openingCauseMove?.("move-end",signal,command,__moveReceipt,{committed,aborted:signal.aborted}); }\n',
        )
    }
    if (file.endsWith('/motion-runtime-coordinator.ts') && ts.isMethodDeclaration(node)) {
      const method = node.name.getText(ast)
      if (['setAuthority', 'releaseAuthority'].includes(method))
        add(
          `authority-${method}-before`,
          node.body.getStart(ast) + 1,
          '\nconst __authorityBefore = this.authority.get(actorId) ?? null; const __epochBefore = this.epoch(actorId);\n',
        )
    }
    if (file.endsWith('/motion-runtime-coordinator.ts') && ts.isExpressionStatement(node)) {
      if (source === 'this.bumpAuthority(actorId)') {
        let owner = node.parent
        while (owner && !ts.isMethodDeclaration(owner)) owner = owner.parent
        add(
          `authority-${owner.name.getText(ast)}-after`,
          node.end,
          '\nglobalThis.__openingCauseAuthority?.({actor:actorId,before:__authorityBefore,after:this.authority.get(actorId)??null,epochBefore:__epochBefore,epochAfter:this.epoch(actorId)});\n',
        )
      }
      if (source === 'this.sceneSessionEpoch++')
        add(
          'session-invalidated',
          node.end,
          '\nglobalThis.__openingCauseLifecycle?.("session-invalidated",{epoch:this.sceneSessionEpoch});\n',
        )
    }
    if (file.endsWith('/script-wake-gate.ts') && ts.isExpressionStatement(node)) {
      if (source === 'this.pending.add(check)')
        add('gate-wait', node.end, '\nglobalThis.__openingCauseGate?.("gate-wait",check,signal);\n')
      if (source === 'resolve()')
        add(
          'gate-ready',
          node.getStart(ast),
          '\nglobalThis.__openingCauseGate?.("gate-ready",check,signal);\n',
        )
      if (source.startsWith('reject('))
        add(
          'gate-rejected',
          node.getStart(ast),
          '\nglobalThis.__openingCauseGate?.("gate-rejected",check,signal,{aborted:signal.aborted});\n',
        )
    }
    if (file.endsWith('/main.ts')) {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'currentMotionSceneSessionId'
      )
        add(
          'lifecycle-snapshot',
          statement(node).end,
          '\nglobalThis.__openingCauseLifecycleSnapshot = () => ({scene:activeScene.scene.id,sceneSession:currentMotionSceneSessionId(),authority:Object.fromEntries(authority),epochs:Object.fromEntries(motionRuntime.authorityEpoch),activations:[...autoActivations.values()].map(a=>({entity:a.entityId,signal:a.controller.signal,epoch:a.epoch,sceneSession:a.sceneSessionId})),restored:[...automaticActionOwners].map(([entity,c])=>({entity,signal:c.signal}))});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'autoActivationBySignal.set(ac.signal, activation)'
      )
        add(
          'auto-started',
          node.end,
          '\nglobalThis.__openingCauseAuto?.("auto-started",ac.signal,{entity:e.id,epoch:activation.epoch,sceneSession:activation.sceneSessionId});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'finishWork()' &&
        node.parent?.getText(ast).includes('autoActivationBySignal.delete(ac.signal)')
      )
        add('auto-ended', node.end, '\nglobalThis.__openingCauseAuto?.("auto-ended",ac.signal);\n')
      if (ts.isCatchClause(node) && source.includes("console.error('[auto]', e.id, error)"))
        add(
          'auto-error',
          node.block.getStart(ast) + 1,
          '\nglobalThis.__openingCauseAuto?.("auto-error",ac.signal,{aborted:ac.signal.aborted,error:String(error)});\n',
        )
    }
    if (file.endsWith('/runtime-script-project.ts')) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'runner') {
        let method = node.parent
        while (method && !ts.isMethodDeclaration(method)) method = method.parent
        const name = method?.name.getText(ast),
          descriptor = {
            runEntityBehavior:
              '{kind:"entity-behavior",scene:scene.id,entity:entityId,channel,behavior:resolved.behaviorId,sceneSession:sceneSessionId}',
            runSceneHook:
              '{kind:"scene-hook",scene:scene.id,slot,hook:resolved.hookId,sceneSession:sceneSessionId}',
            runCommands: 'globalThis.__openingCauseCommandRoot?.(commands)',
          }[name]
        if (descriptor)
          add(
            `author-${name}`,
            statement(node).end,
            `\nglobalThis.__openingCauseBinding?.(runner,${descriptor});\n`,
          )
      }
      if (
        ts.isExpressionStatement(node) &&
        source === 'await this.runCommands(script.body, options)'
      )
        add(
          'author-item-private',
          node.getStart(ast),
          '\nglobalThis.__openingCauseAuthorSource?.(script.body,{kind:"item-private",item:itemId,script:scriptId});\n',
        )
    }
    if (
      file.endsWith('/runtime-script-project.ts') &&
      ts.isMethodDeclaration(node) &&
      node.name.getText(ast) === 'invokeEntityTrigger'
    ) {
      add(
        'entity-call-start',
        node.body.getStart(ast) + 1,
        '\nconst __causeCall = globalThis.__openingCauseCallStart?.(signal,target); try {\n',
      )
      add(
        'entity-call-end',
        node.body.end - 1,
        '\n} finally { globalThis.__openingCauseCallEnd?.(signal,__causeCall); }\n',
      )
    }
    if (file.endsWith('/script-work-queue.ts') && ts.isFunctionDeclaration(node)) {
      if (node.name?.text === 'scriptWorkIO')
        add(
          'script-io-bind',
          node.body.getStart(ast) + 1,
          '\nconst __causeIOReceipt = globalThis.__openingCauseIOBind?.(signal);\n',
        )
      if (node.name?.text === 'inheritScriptWork')
        add(
          'script-inherit',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__openingCauseInherit?.(parent,child);\n',
        )
    }
    if (
      file.endsWith('/script-work-queue.ts') &&
      ts.isReturnStatement(node) &&
      source === 'return () => executions.delete(child)'
    ) {
      add(
        'script-detach',
        node.expression.body.getStart(ast),
        '(globalThis.__openingCauseDetach?.(child),',
      )
      edits.push({ at: node.expression.body.end, text: ')' })
    }
    if (
      file.endsWith('/script-work-queue.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'wake()'
    ) {
      let owner = node.parent
      while (owner && !ts.isFunctionDeclaration(owner)) owner = owner.parent
      if (owner?.name?.text === 'scriptWorkIO')
        add(
          'script-io-wake',
          node.getStart(ast),
          '\nglobalThis.__openingCauseIOWake?.(__causeIOReceipt);\n',
        )
    }
    if (
      file.endsWith('/main.ts') &&
      ts.isExpressionStatement(node) &&
      source.startsWith('portraits.set(') &&
      source.includes('project.imageCache.load(cue.portrait.asset')
    ) {
      add(
        'dialog-portrait-start',
        node.getStart(ast),
        '{ const __portraitIO = globalThis.__openingCauseIO?.(signal,"io-start",{kind:"dialog-portrait",asset:cue.portrait.asset});\n',
      )
      add(
        'dialog-portrait-end',
        node.end,
        '\nglobalThis.__openingCauseIO?.(signal,"io-end",undefined,__portraitIO); }',
      )
    }
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'await this.runStages(executable, options)'
    ) {
      add('reforge-result-init', node.parent.parent.getStart(ast), 'let __causeResolved = false;\n')
      add('reforge-result-success', node.end, '\n__causeResolved = true;\n')
    }
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'this.running = true'
    )
      add(
        'reforge-run-started',
        node.end,
        '\nglobalThis.__openingCauseRun?.(this,this.signal,{self:this.self??null,timing:this.runningTiming,scope:this.runningRootScope,digest:this.runningDigest,stage:options.cursor?.kind==="stage"?options.cursor.stage:executable.flow.initial,resume:options.resume??null});\n',
      )
    if (
      file.endsWith('/world-motion-runtime.ts') &&
      ts.isMethodDeclaration(node) &&
      node.name.getText(ast) === 'advanceCadence'
    ) {
      add(
        'cadence-before',
        node.body.getStart(ast) + 1,
        '\nconst __cadenceBefore={tick:this.tick,accumulator:this.moveAccumulator}; try {\n',
      )
      add(
        'cadence-after',
        node.body.end - 1,
        '\n} finally { globalThis.__openingCauseCadence?.({dt,frozen,stepMs:this.stepMs,before:__cadenceBefore,after:{tick:this.tick,accumulator:this.moveAccumulator}}); }\n',
      )
    }
    if (
      file.endsWith('/mode.ts') &&
      ts.isVariableStatement(node) &&
      source.includes('const shouldRunAutoScripts =')
    )
      add(
        'game-clock',
        node.end,
        '\nglobalThis.__openingCauseGame?.(gs,"clock",gs.eventCursor,{frameId:gs.frameNum,now:gs.nowMs,autoEligible:shouldRunAutoScripts,waiting:gs.eventCursor?.waiting??null});\n',
      )
    if (file.endsWith('/event-system.ts')) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'cmd') {
        let owner = node.parent
        while (owner && !ts.isFunctionDeclaration(owner)) owner = owner.parent
        const name = owner?.name?.text
        assert(
          name && !Object.hasOwn(gameCommandReads, name),
          'unclassified/duplicate Game command reader',
        )
        gameCommandReads[name] = node.initializer?.getText(ast)
      }
      if (ts.isExpressionStatement(node) && source === 'runOneAutoOp(gs, npc)') {
        add(
          'game-auto-before',
          node.getStart(ast),
          '{ const __autoOwner=npc.autoCursor; const __autoBefore={ip:npc.autoCursor?.ip,idle:npc.autoCursor?.idleFrameCount??0,frame:npc.scriptedFrame??0,facing:npc.facing,position:[npc.x,npc.y],layout:npc.nSpriteFrames??0,autoFrames:npc.nSpriteFramesAuto??0}; globalThis.__openingCauseGame?.(gs,"auto-before",__autoOwner,{actor:npc.id,before:__autoBefore});\n',
        )
        add(
          'game-auto-after',
          node.end,
          '\nglobalThis.__openingCauseGame?.(gs,"auto-step",__autoOwner,{actor:npc.id,before:__autoBefore,after:{ip:npc.autoCursor?.ip,idle:npc.autoCursor?.idleFrameCount??0,frame:npc.scriptedFrame??0,facing:npc.facing,position:[npc.x,npc.y],layout:npc.nSpriteFrames??0,autoFrames:npc.nSpriteFramesAuto??0}}); }\n',
        )
      }
      if (ts.isVariableDeclaration(node) && source === 'cmd = cmds[cursor.ip]!') {
        let owner = node.parent
        while (owner && !ts.isFunctionDeclaration(owner)) owner = owner.parent
        const channel = {
          tickEventSystem: 'trigger',
          runOneAutoOp: 'auto',
          runEnterScript: 'onEnter',
        }[owner?.name?.text]
        assert(channel, 'unclassified Game command dispatcher')
        add(
          `game-command-${channel}`,
          statement(node).end,
          `\nglobalThis.__openingCauseGame?.(gs,"command",cursor,{ip:cursor.ip,command:cmd,channel:${JSON.stringify(channel)},actor:${channel === 'auto' ? 'npc.id' : 'cursor.triggerOwnerId??null'},currentEventObjectId:cursor.currentEventObjectId??null,callStack:(cursor.callStack??[]).map(frame=>({returnIp:frame.returnIp,savedEventObjectId:frame.savedEventObjectId??null}))});\n`,
        )
      }
      if (ts.isExpressionStatement(node) && source === 'cursor.waitFramesRemaining = frames')
        add(
          'game-wait-frames',
          node.end,
          '\nglobalThis.__openingCauseGame?.(gs,"wait-start",cursor,{type:"frames",frames,ip:cursor.ip});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'cursor.waitFramesRemaining = undefined')
        add(
          'game-wait-frames-end',
          node.getStart(ast),
          '\nglobalThis.__openingCauseGame?.(gs,"wait-end",cursor,{type:"frames",ip:cursor.ip,reason:"deadline"});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'cursor.delayUntilMs = performance.now() + redrawDelayMs'
      )
        add(
          'game-redraw',
          node.end,
          '\nglobalThis.__openingCauseGame?.(gs,"wait-start",cursor,{type:"redraw",ms:redrawDelayMs,deadline:cursor.delayUntilMs,ip:cursor.ip});\n',
        )
      if (
        ts.isExpressionStatement(node) &&
        source === 'cursor.delayUntilMs = performance.now() + delayMs'
      )
        add(
          'game-delay',
          node.end,
          '\nglobalThis.__openingCauseGame?.(gs,"wait-start",cursor,{type:"delay",ms:delayMs,deadline:cursor.delayUntilMs,ip:cursor.ip});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'cursor.delayUntilMs = undefined')
        add(
          'game-delay-end',
          node.getStart(ast),
          '\nglobalThis.__openingCauseGame?.(gs,"wait-end",cursor,{type:"delay",ip:cursor.ip,reason:"deadline"});\n',
        )
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'result' &&
        node.initializer?.getText(ast) === 'confirmDialog(ds, gs.nowMs)'
      )
        add(
          'game-dialog-input',
          statement(node).end,
          '\nglobalThis.__openingCauseGame?.(gs,"dialog-input",cursor,{result,ip:cursor.ip,phase:ds.phase,text:ds.currentLineText,lines:ds.shownLines});\n',
        )
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'tickEventSystem') {
        add(
          'game-event-before',
          node.body.getStart(ast) + 1,
          '\nglobalThis.__openingCauseGame?.(gs,"event-before",gs.eventCursor,{dialoguePresentationVersion:1,waiting:gs.eventCursor?.waiting??null,phase:gs.dialogBox?.phase??null,pressed:[...input.pressed]}); try {\n',
        )
        add(
          'game-event-after',
          node.body.end - 1,
          '\n} finally { globalThis.__openingCauseGame?.(gs,"event-after",gs.eventCursor,{dialoguePresentationVersion:1,waiting:gs.eventCursor?.waiting??null,phase:gs.dialogBox?.phase??null}); }\n',
        )
      }
    }
    if (file.endsWith('/runtime-frame-session.ts')) {
      if (ts.isExpressionStatement(node) && source === 'timer.pausedRemaining = remaining()')
        add(
          'reforge-wait-pause',
          node.end,
          '\nglobalThis.__openingCauseTimer?.("wait-pause",timer,undefined,{now:this.#now,remainingMs:timer.pausedRemaining});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'delete timer.pausedRemaining')
        add(
          'reforge-wait-resume',
          node.end,
          '\nglobalThis.__openingCauseTimer?.("wait-resume",timer,undefined,{now:this.#now,deadline:timer.deadline});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'this.#now = clock.gameplayNow')
        add(
          'reforge-clock',
          node.end,
          '\nglobalThis.__openingCauseFrame?.({now:this.#now,realNow,frozen,stepping,requested});\n',
        )
      if (ts.isExpressionStatement(node) && source === 'this.#waits.push(timer)')
        add(
          'reforge-wait-start',
          node.end,
          '\nglobalThis.__openingCauseTimer?.("wait-start",timer,signal,{ms,now:this.#now,deadline:timer.deadline});\n',
        )
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'timer.settle') {
        let owner = node.parent
        while (owner && !ts.isMethodDeclaration(owner)) owner = owner.parent
        const reason = { scheduleWait: 'abort', clearWaits: 'clear', tick: 'deadline' }[
          owner?.name.getText(ast)
        ]
        assert(reason, 'unknown frame wait settlement owner')
        const hook = `globalThis.__openingCauseTimer?.("wait-end",timer,undefined,{now:this.#now,reason:${JSON.stringify(reason)}})`
        if (ts.isExpressionStatement(node.parent)) {
          add(`reforge-wait-${reason}`, node.parent.getStart(ast), `{ ${hook}; `)
          edits.push({ at: node.parent.end, text: '; }' })
        } else {
          add(`reforge-wait-${reason}`, node.getStart(ast), `(${hook},`)
          edits.push({ at: node.end, text: ')' })
        }
      }
    }
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      ts.isAwaitExpression(node.expression) &&
      ts.isCallExpression(node.expression.expression) &&
      node.expression.expression.expression.getText(ast) === 'this.host.execute'
    ) {
      assert.equal(node.expression.expression.arguments[0].getText(ast), 'command.command')
      add('reforge-leaf-completed', node.end, '\nglobalThis.__openingCauseLeafCompleted?.(this);\n')
    }
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'this.running = false'
    )
      add(
        'reforge-run-ended',
        node.end,
        '\nglobalThis.__openingCauseEnded?.(this,{aborted:this.signal.aborted,resolved:__causeResolved});\n',
      )
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'await options.cursorController.reachSafePoint(cursor)'
    ) {
      add('reforge-safe-point-result', node.getStart(ast), 'const __safePointResult = ')
      add(
        'reforge-stage-settled',
        node.end,
        '\nglobalThis.__openingCauseSettled?.(this,{cursor,decision:__safePointResult,stage:stageId,self:this.self??null,timing:this.runningTiming});\n',
      )
    }
    if (
      file.endsWith('/script-runner-core.ts') &&
      ts.isExpressionStatement(node) &&
      source === 'this.onStep?.({ path: commandPath, command })'
    )
      add(
        'reforge-command',
        node.end,
        '\nglobalThis.__openingCauseStep?.(this,{path:commandPath,command,self:this.self??null,timing:this.runningTiming,scope:this.runningRootScope});\n',
      )
    if (
      file.endsWith('/dialog/dialog-box.ts') &&
      ts.isMethodDeclaration(node) &&
      ['open', 'render', 'advance', 'update', 'close'].includes(node.name.getText(ast))
    ) {
      const name = node.name.getText(ast)
      add(
        `dialog-${name}-before`,
        node.body.getStart(ast) + 1,
        `\nconst __causeBefore=this.observe(); const __slotsBefore=this.observeSlots(); try {\n`,
      )
      add(
        `dialog-${name}-after`,
        node.body.end - 1,
        `\n} finally { globalThis.__openingCauseDialog?.(${JSON.stringify(name)},__causeBefore,this.observe(),__slotsBefore,this.observeSlots(),${name === 'open' ? 'lifetime' : 'null'}); }\n`,
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (file.endsWith('/event-system.ts'))
    assert.deepEqual(
      gameCommandReads,
      {
        // Query only; it does not execute the inspected opcode.
        isEventCursorAtMakeSceneStep: 'getCmds(cursor)[cursor.ip]',
        runOneAutoOp: 'cmds[cursor.ip]!',
        tickEventSystem: 'cmds[cursor.ip]!',
        // Battle/use and poison have separate dispatchers, outside 001–006's
        // current story-command proof domain. Do not call this full-engine coverage.
        runScript: 'commands[ip]!',
        runPlayerPoisonEntrySync: 'commands[ip]',
        runEnterScript: 'cmds[cursor.ip]!',
      },
      'Game command-reader census changed; classify the caller before capture',
    )
  const expected = file.endsWith('/script-project-core.ts')
    ? { 'move-observation-start': 1, 'move-observation-commit': 1, 'move-observation-end': 1 }
    : file.endsWith('/motion-runtime-coordinator.ts')
      ? {
          'authority-setAuthority-before': 1,
          'authority-releaseAuthority-before': 1,
          'authority-setAuthority-after': 1,
          'authority-releaseAuthority-after': 1,
          'session-invalidated': 1,
        }
      : file.endsWith('/script-wake-gate.ts')
        ? { 'gate-wait': 1, 'gate-ready': 1, 'gate-rejected': 2 }
        : file.endsWith('/world-motion-runtime.ts')
          ? { 'cadence-before': 1, 'cadence-after': 1 }
          : file.endsWith('/runtime-script-project.ts')
            ? {
                'entity-call-start': 1,
                'entity-call-end': 1,
                'author-runEntityBehavior': 1,
                'author-runSceneHook': 1,
                'author-runCommands': 1,
                'author-item-private': 1,
              }
            : file.endsWith('/script-work-queue.ts')
              ? {
                  'script-io-wake': 1,
                  'script-io-bind': 1,
                  'script-inherit': 1,
                  'script-detach': 1,
                }
              : file.endsWith('/mode.ts')
                ? { 'game-clock': 1 }
                : file.endsWith('/event-system.ts')
                  ? {
                      'game-auto-before': 1,
                      'game-auto-after': 1,
                      'game-event-before': 1,
                      'game-event-after': 1,
                      'game-wait-frames-end': 1,
                      'game-delay-end': 1,
                      'game-dialog-input': 1,
                      'game-command-auto': 1,
                      'game-command-trigger': 1,
                      'game-command-onEnter': 1,
                      'game-wait-frames': 1,
                      'game-redraw': 1,
                      'game-delay': 1,
                    }
                  : file.endsWith('/runtime-frame-session.ts')
                    ? {
                        'reforge-wait-abort': 1,
                        'reforge-wait-start': 1,
                        'reforge-wait-pause': 1,
                        'reforge-wait-resume': 1,
                        'reforge-wait-clear': 1,
                        'reforge-clock': 1,
                        'reforge-wait-deadline': 1,
                      }
                    : file.endsWith('/script-runner-core.ts')
                      ? {
                          'reforge-command': 1,
                          'reforge-leaf-completed': 1,
                          'reforge-run-started': 1,
                          'reforge-stage-settled': 1,
                          'reforge-run-ended': 1,
                          'reforge-result-init': 1,
                          'reforge-result-success': 1,
                          'reforge-safe-point-result': 1,
                        }
                      : file.endsWith('/main.ts')
                        ? {
                            'dialog-clear-caller': 7,
                            'dialog-portrait-start': 1,
                            'dialog-portrait-end': 1,
                            'lifecycle-snapshot': 1,
                            'auto-started': 1,
                            'auto-ended': 1,
                            'auto-error': 1,
                          }
                        : file.endsWith('/cutscene-controller.ts') ||
                            file.endsWith('/script-host-adapter.ts')
                          ? { 'dialog-clear-intent-before': 1, 'dialog-clear-intent-after': 1 }
                          : {
                              'dialog-open-before': 1,
                              'dialog-open-after': 1,
                              'dialog-advance-before': 1,
                              'dialog-advance-after': 1,
                              'dialog-close-before': 1,
                              'dialog-close-after': 1,
                              'dialog-update-before': 1,
                              'dialog-update-after': 1,
                              'dialog-render-before': 1,
                              'dialog-render-after': 1,
                            }
  assert.deepEqual(counts, expected, `causal trace anchors changed: ${file}`)
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return {
    code,
    anchors: {
      ...counts,
      ...handoff.anchors,
      ...actions.anchors,
      ...slots.anchors,
      ...gameAuto.anchors,
    },
  }
}
