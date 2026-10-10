import assert from 'node:assert/strict'
import ts from 'typescript'

export const ENTITY_ACTION_TARGET = 'packages/reforge/src/entity-action-player.ts'

/** Timeline inputs and identities are observed independently of the selected/drawn frame. */
export function instrumentEntityActions(code, file) {
  assert([ENTITY_ACTION_TARGET, 'packages/reforge/src/main.ts'].includes(file))
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    edits = [],
    anchors = {}
  const add = (key, at, text) => {
    anchors[key] = (anchors[key] ?? 0) + 1
    edits.push({ at, text })
  }
  const wrap = (key, node, before, after) => {
    add(key, node.getStart(ast), before)
    edits.push({ at: node.end, text: after })
  }
  function visit(node) {
    if (file.endsWith('/main.ts')) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'prepareSceneActions') {
        const ret = node.body.statements.at(-1)
        assert(ts.isReturnStatement(ret), 'action preparation tail changed')
        add(
          'action-prepare-before',
          ret.getStart(ast),
          '\nconst __actionPreparation=globalThis.__openingCauseActionPrepare?.("start",saved,{scene:scene.id}); try {\n',
        )
        add(
          'action-prepare-after',
          ret.end,
          '\n} finally { globalThis.__openingCauseActionPrepare?.("end",saved,{scene:scene.id},__actionPreparation); }\n',
        )
      }
      if (ts.isReturnStatement(node)) {
        let fn = node.parent
        while (fn && !ts.isArrowFunction(fn) && !ts.isFunctionDeclaration(fn)) fn = fn.parent
        if (
          fn &&
          ts.isCallExpression(fn.parent) &&
          fn.parent.expression.getText(ast) === 'entityActions.advance'
        )
          add(
            'action-gate-input',
            node.getStart(ast),
            "\nglobalThis.__openingCauseActionGateInputs?.({entity:id,source,owner:owner??null,battle:!!battleHost.active,present:!!entity,visible:!!entity&&entityLifecycleGates(entity).visible,fixed:worldPresentation.hasEntityFrame(id),gait:motion.hasGait(id),explicit:motion.hasExplicitAnimation(id),held:authority.get(id)?.kind==='script',ownerHeld:owner!==undefined&&authority.get(owner)?.kind==='script'});\n",
          )
      }
      ts.forEachChild(node, visit)
      return
    }
    if (
      ts.isMethodDeclaration(node) &&
      ['replaceScene', 'syncBases', 'clearScene', 'clearEntity'].includes(node.name.getText(ast))
    ) {
      const name = node.name.getText(ast),
        input = ['replaceScene', 'syncBases'].includes(name)
          ? '{seeds}'
          : name === 'clearEntity'
            ? '{entity}'
            : '{}'
      add(
        `action-install-${name}`,
        node.body.getStart(ast) + 1,
        '\nlet __installFailed=false; try {\n',
      )
      edits.push({
        at: node.body.end - 1,
        text: `\n} catch(__installError) { __installFailed=true; throw __installError; } finally { if(!__installFailed) globalThis.__openingCauseActionInstall?.(this,this.entities,${JSON.stringify(name)},${input}); }\n`,
      })
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'prepareRestore') {
      add(
        'action-restore-context',
        node.body.getStart(ast) + 1,
        '\nconst __preparation=globalThis.__openingCauseActionPreparation?.();\n',
      )
      const ret = node.body.statements.at(-1)
      assert(
        ts.isReturnStatement(ret) &&
          ts.isArrowFunction(ret.expression) &&
          ts.isBlock(ret.expression.body),
        'action restore commit closure changed',
      )
      add(
        'action-restore-install',
        ret.expression.body.end - 1,
        '\nglobalThis.__openingCauseActionInstall?.(this,this.entities,"restored",{preparation:__preparation??null});\n',
      )
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'advance') {
      add(
        'action-frame-before',
        node.body.getStart(ast) + 1,
        '\nconst __actionFrame=globalThis.__openingCauseActionFrame?.("start",this,this.entities,{dtMs}); let __frameFailed=false; try {\n',
      )
      add(
        'action-frame-after',
        node.body.end - 1,
        '\n} catch(__frameError) { __frameFailed=true; throw __frameError; } finally { globalThis.__openingCauseActionFrame?.("end",this,this.entities,{dtMs,failed:__frameFailed},__actionFrame); }\n',
      )
    }
    if (
      ts.isFunctionDeclaration(node) &&
      ['createTrack', 'prepareRestoredTrack'].includes(node.name?.text)
    ) {
      const tail = node.body.statements.at(-1)
      assert(
        ts.isReturnStatement(tail) && ts.isObjectLiteralExpression(tail.expression),
        'action track creation tail changed',
      )
      const restored = node.name.text === 'prepareRestoredTrack'
      wrap(
        restored ? 'action-restored' : 'action-created',
        tail.expression,
        `((__track) => { globalThis.__openingCauseActionTrack?.(__track,${restored ? '{kind:"restored",entity,slot,input}' : '{kind:"created",resolved,source,awaited}'}); return __track; })(`,
        ')',
      )
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'advanceTrack') {
      add(
        'action-advance-before',
        node.body.getStart(ast) + 1,
        '\nconst __actionAdvance = globalThis.__openingCauseActionAdvance?.("start",track,{entity,dtMs}); let __actionFailed=false; try {\n',
      )
      add(
        'action-advance-after',
        node.body.end - 1,
        '\n} catch(__error) { __actionFailed=true; throw __error; } finally { globalThis.__openingCauseActionAdvance?.("end",track,{entity,dtMs,failed:__actionFailed},__actionAdvance); }\n',
      )
    }
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'paused') {
      const track = node.arguments[1].expression.getText(ast)
      wrap(
        'action-gate',
        node,
        `((__paused) => { globalThis.__openingCauseActionGate?.(${track},{entity,paused:__paused,dtMs}); return __paused; })(`,
        ')',
      )
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'frame') {
      const tail = node.body.statements.at(-1)
      assert(ts.isReturnStatement(tail), 'action frame source tail changed')
      add(
        'action-selection',
        tail.getStart(ast),
        '\nglobalThis.__openingCauseActionSelection?.(this,entity,active,tracks?.override===active?"override":"base");\n',
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(
    anchors,
    file.endsWith('/main.ts')
      ? { 'action-prepare-before': 1, 'action-prepare-after': 1, 'action-gate-input': 1 }
      : {
          'action-created': 1,
          'action-restored': 1,
          'action-restore-context': 1,
          'action-restore-install': 1,
          'action-install-replaceScene': 1,
          'action-install-syncBases': 1,
          'action-install-clearEntity': 1,
          'action-install-clearScene': 1,
          'action-frame-before': 1,
          'action-frame-after': 1,
          'action-gate': 2,
          'action-selection': 1,
          'action-advance-before': 1,
          'action-advance-after': 1,
        },
    `action trace anchors changed: ${file}`,
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
