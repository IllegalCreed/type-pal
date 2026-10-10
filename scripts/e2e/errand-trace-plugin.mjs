import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentMealTrace, MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'
import { reforgeActorObservation } from './reforge-actor-observation.mjs'

export const ERRAND_TRACE_TARGETS = [...MEAL_TRACE_TARGETS]

export function instrumentErrandTrace(source, file) {
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
    const body = `function __openingPoint(source, renderEvidence) {
      try {
        if(source==='observe:causal') globalThis.__openingCauseWorld?.(world);
        let tick=null, instance=null;
        try { tick=motion.worldTick; instance=currentMotionSceneSessionId(); } catch {}
        globalThis.__e2eSceneBoundary?.({scene:activeScene.scene.id,tick,instance});
        const sid=activeScene.scene.id;if(!['s001','s002','s003','s004','s005','s014'].includes(sid))return;
        const slot=value=>value?{selection:value.selection,cursor:value.cursor}:null;
        const binding=(scene,id)=>{const value=world.script.behaviors?.entities?.[scene]?.[id];return value?{trigger:slot(value.trigger),auto:slot(value.auto),triggerActivation:value.triggerActivation,page:value.page}:null;};
        const persistent={};
        for(const [scene,ids] of [['s001',['e19']],['s003',['e62']],['s004',['e83','e84']],['s005',['e123','e124','e127']]])
          persistent[scene]=Object.fromEntries(ids.map(id=>[id,binding(scene,id)]));
        const actors={party:{position:[player.pos.col,player.pos.row,player.pos.height],facing,visible:true,walking,sprite:world.party[0]?partySpriteDef(world.party[0]).id:null}};
        const frames={};
        for(const e of activeScene.scene.entities) {
          actors[e.id]=${reforgeActorObservation('e', 'binding(sid,e.id)')};
          frames[e.id]=actors[e.id].frame;
        }
        globalThis.__tpEntityFrames=frames;
        globalThis.__errandPoint?.(source,{tick,renderEvidence:source==='render:world'?{engine:'reforge',...renderEvidence}:null,scene:sid,actors,money:world.money,persistent,hooks:{s004:{onEnter:slot(world.script.behaviors?.scenes?.s004?.onEnter)}},control:!runner&&!dialogBox.active&&!presentation.busy(),
          ...(globalThis.__routeObserve ? {routeReady:!runner&&!dialogBox.active&&!presentation.busy()&&!menus.active&&!battleHost.active&&fadeDriver.value===0&&ditherTransition.active===null,routeDialogue:dialogBox.active} : {})});
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
