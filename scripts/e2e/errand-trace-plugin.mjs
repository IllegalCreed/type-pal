import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentMealTrace, MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'

export const ERRAND_TRACE_TARGETS = [...MEAL_TRACE_TARGETS, 'packages/game/src/shell/bootstrap.ts']

export function instrumentErrandTrace(source, file) {
  if (file.endsWith('/game/src/shell/bootstrap.ts')) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true),
      functions = []
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'loadGameFromSlot')
        functions.push(node)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.equal(functions.length, 1, 'actual game restore owner changed')
    const owner = functions[0],
      tail = owner.body.statements.slice(-3).map((s) => s.getText(ast))
    assert.deepEqual(
      tail,
      [
        'await loadSceneCommon(gs.wNumScene, { fromSavedGame: true })',
        'gs.palette = restoredPalette',
        'gs.needToFadeIn = true',
      ],
      'actual game restore successful tail changed',
    )
    const at = owner.body.end - 1
    return {
      code: `${source.slice(0, at)}\nglobalThis.__errandGameRestored?.(gs);\n${source.slice(at)}`,
      anchors: { actualGameRestore: 1 },
    }
  }
  const result = instrumentMealTrace(source, file)
  result.code = result.code.replaceAll('__meal', '__errand')
  if (file.endsWith('/reforge/src/main.ts')) {
    const ast = ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true),
      hooks = []
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === '__openingPoint') hooks.push(node)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.equal(hooks.length, 1)
    const hook = hooks[0]
    const body = `function __openingPoint(source) {
      try {
        const sid=activeScene.scene.id;if(!['s001','s002','s003','s004','s005','s014'].includes(sid))return;
        const slot=value=>value?{selection:value.selection,cursor:value.cursor}:null;
        const binding=(scene,id)=>{const value=world.script.behaviors?.entities?.[scene]?.[id];return value?{trigger:slot(value.trigger),auto:slot(value.auto),triggerActivation:value.triggerActivation,page:value.page}:null;};
        const persistent={};
        for(const [scene,ids] of [['s001',['e19']],['s003',['e62']],['s004',['e83','e84']],['s005',['e123','e124','e127']]])
          persistent[scene]=Object.fromEntries(ids.map(id=>[id,binding(scene,id)]));
        const actors={party:{position:[player.pos.col,player.pos.row,player.pos.height],facing,visible:true,walking}};
        const frames={};
        for(const e of activeScene.scene.entities.filter(e=>['e19','e35','e36','e59','e60','e61','e62','e83','e84','e116','e117','e123','e124','e127','e203'].includes(e.id)))
          actors[e.id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,
            state:host.getEntityState(e.id),behavior:binding(sid,e.id),
            sprite:typeof e.sprite==='string'&&e.sprite.startsWith('sprite-')?Number(e.sprite.slice(7)):e.sprite??e.actor??null,
            frame:frames[e.id]=motion.gaitPhase(e.id)??motion.explicitAnimation(e.id)??worldPresentation.entityFrame(e.id)??entityActions.frame(e.id)??0};
        globalThis.__tpEntityFrames=frames;
        globalThis.__errandPoint?.(source,{scene:sid,actors,money:world.money,persistent,hooks:{s004:{onEnter:slot(world.script.behaviors?.scenes?.s004?.onEnter)}},control:!runner&&!dialogBox.active&&!presentation.busy()});
      }catch(error){globalThis.__errandError?.(String(error));}
    }`
    result.code = result.code.slice(0, hook.getStart(ast)) + body + result.code.slice(hook.end)
  }
  return result
}
export function errandTracePlugin() {
  return {
    name: 'isolated-errand-readonly-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      const file = ERRAND_TRACE_TARGETS.find((file) => id.endsWith(`/${file}`))
      if (!file) return null
      const result = instrumentErrandTrace(code, file)
      return { code: result.code, map: null }
    },
  }
}
