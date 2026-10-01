import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { INN_TRACE_TARGETS, instrumentInnTrace } from './inn-trace-plugin.mjs'

export const KITCHEN_TRACE_TARGETS = [
  ...INN_TRACE_TARGETS,
  'packages/reforge/src/world-scene-presentation.ts',
]

/** Only isolated source insertions; production files and scheduling expressions stay untouched. */
export function instrumentKitchenTrace(source, file) {
  assert(KITCHEN_TRACE_TARGETS.includes(file), `unexpected kitchen trace source ${file}`)
  const result = file.endsWith('/world-scene-presentation.ts')
    ? { code: source, anchors: {} }
    : instrumentInnTrace(source, file)
  for (const name of [
    'Point',
    'Error',
    'GameRendered',
    'Game',
    'Rendered',
    'RestoreCommitted',
    'ReadSaveBarrier',
  ])
    result.code = result.code.replaceAll(`globalThis.__inn${name}`, `globalThis.__kitchen${name}`)
  let ast = ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true)
  if (file.endsWith('/reforge/src/main.ts')) {
    const hooks = []
    const walk = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name?.text === '__openingPoint') hooks.push(n)
      ts.forEachChild(n, walk)
    }
    walk(ast)
    assert.equal(hooks.length, 1, 'kitchen actual commit function anchor changed')
    const hook = hooks[0]
    const body = `function __openingPoint(source) {
      try {
        const sid=activeScene.scene.id; if(!['s001','s003'].includes(sid))return;
        const persistent={};
        for(const [scene,ids] of [['s001',['e19','e20','e24','e25','e26']],['s003',['e56','e59','e60','e61','e62']]])
          for(const id of ids) persistent[id]={state:world.script.entityState?.[scene]?.[id]??(['e56','e59','e60','e61','e62'].includes(id)?2:0),
            behavior:world.script.behaviors?.entities?.[scene]?.[id]??null};
        const actors={party:{position:[player.pos.col,player.pos.row,player.pos.height],facing,visible:true,walking,stepFrame,layer:partyLayer,
          sprite:world.party[0]?partySpriteDef(world.party[0]).id:null}};
        for(const id of sid==='s003'?['e56','e59','e60','e61','e62']:['e19','e20']) {
          const e=activeScene.scene.entities.find(e=>e.id===id); if(!e)throw new Error('missing kitchen actor '+id);
          actors[id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,state:host.getEntityState(id),
            behavior:world.script.behaviors?.entities?.[sid]?.[id]??null,sprite:e.sprite??e.actor??null};
        }
        globalThis.__kitchenPoint?.(source,{scene:sid,actors,persistent,money:world.money,inventory:world.inventory,
          control:!runner&&!dialogBox.active&&!presentation.busy()});
      } catch(error){globalThis.__kitchenError?.(String(error));}
    }`
    result.code = result.code.slice(0, hook.getStart(ast)) + body + result.code.slice(hook.end)
    ast = ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true)
  }
  const anchors = [],
    edits = []
  const walk = (node) => {
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'nudgeParty'
    ) {
      assert(
        ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body),
        'kitchen nudge body shape changed',
      )
      const noAwait = (child) => {
        assert(!ts.isAwaitExpression(child), 'kitchen nudge commit body became asynchronous')
        ts.forEachChild(child, noAwait)
      }
      noAwait(node.initializer.body)
      anchors.push('actualNudgeParty')
      edits.push({ at: node.initializer.body.getStart(ast) + 1, text: '\ntry {\n' })
      edits.push({
        at: node.initializer.body.end - 1,
        text: '\n} finally { __openingPoint("commit:nudgeParty"); }\n',
      })
    }
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === 'refreshRuntimeProjection'
    ) {
      assert(
        ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body),
        'kitchen runtime projection shape changed',
      )
      anchors.push('actualRuntimeProjection')
      edits.push({ at: node.initializer.body.getStart(ast) + 1, text: '\ntry {\n' })
      edits.push({
        at: node.initializer.body.end - 1,
        text: '\n} finally { __openingPoint("commit:refreshRuntimeProjection"); }\n',
      })
    }
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isCallExpression(node) &&
      node.expression.getText(ast) === '__openingPoint' &&
      ['"before:player.pos"', '"commit:player.pos"'].includes(node.arguments[0]?.getText(ast))
    ) {
      let owner = node.parent
      while (owner && !ts.isPropertyAssignment(owner)) owner = owner.parent
      if (owner?.name.getText(ast) === 'nudgeParty') {
        anchors.push(
          node.arguments[0].getText(ast).includes('before:')
            ? 'beforeNudgeParty'
            : 'commitNudgeParty',
        )
        if (node.arguments[0].getText(ast).includes('before:'))
          edits.push({
            at: node.arguments[0].getStart(ast),
            end: node.arguments[0].end,
            text: '"before:nudgeParty"',
          })
        else {
          assert(
            ts.isExpressionStatement(node.parent),
            'kitchen nudge position commit shape changed',
          )
          edits.push({ at: node.parent.getStart(ast), end: node.parent.end, text: '' })
        }
      }
    }
    if (
      file.endsWith('/game/src/present/present.ts') &&
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === 'partyFrame'
    ) {
      assert(ts.isBlock(node.thenStatement))
      anchors.push('actualGamePartyFrame')
      edits.push({
        at: node.thenStatement.getStart(ast) + 1,
        text: `\nglobalThis.__kitchenPartyFrame?.('game',{
        scene:gs.wNumScene===2?'s001':'s003',position:[gs.party.x,gs.party.y],facing:gs.party.facing,
        walking:gs.walkingFrame.walking,stepFrame:gs.walkingFrame.stepFrame,layer:gs.wLayer,
        sprite:leaderSpriteNum,frameIndex:activePartyFrames[frameIdx]?frameIdx:0,
        frame:{width:partyFrame.width,height:partyFrame.height},walkFrames});\n`,
      })
    }
    if (
      file.endsWith('/world-scene-presentation.ts') &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast).startsWith('sprites.push(partySprite(leaderFrame,')
    ) {
      anchors.push('actualReforgePartyFrame')
      edits.push({
        at: node.getStart(ast),
        text: `globalThis.__kitchenPartyFrame?.('reforge',{
        position:[input.player.pos.col,input.player.pos.row,input.player.pos.height],facing:input.player.facing,
        walking:input.player.walking,stepFrame:input.player.stepFrame,layer:input.player.layer,
        sprite:leaderDefinition.id,frameIndex:leaderFrameIndex,
        frame:{width:leaderFrame.width,height:leaderFrame.height}});\n`,
      })
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.deepEqual(
    anchors,
    file.endsWith('/game/src/present/present.ts')
      ? ['actualGamePartyFrame']
      : file.endsWith('/world-scene-presentation.ts')
        ? ['actualReforgePartyFrame']
        : file.endsWith('/reforge/src/main.ts')
          ? ['actualNudgeParty', 'beforeNudgeParty', 'commitNudgeParty', 'actualRuntimeProjection']
          : [],
    'kitchen actual drawn frame/fragment census changed',
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    result.code = result.code.slice(0, edit.at) + edit.text + result.code.slice(edit.end ?? edit.at)
  for (const name of anchors) result.anchors[name] = 1
  assert.equal(
    ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return result
}

export function kitchenTracePlugin() {
  return {
    name: 'isolated-kitchen-commit-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      const file = KITCHEN_TRACE_TARGETS.find((f) => id.endsWith(`/${f}`))
      if (!file) return null
      const result = instrumentKitchenTrace(code, file)
      console.log(
        '[kitchen-trace]',
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
