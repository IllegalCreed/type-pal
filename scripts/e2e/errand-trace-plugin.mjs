import assert from 'node:assert/strict'
import ts from 'typescript'
import { instrumentMealTrace, MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'

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
    const body = `function __openingPoint(source) {
      try {
        const sid=activeScene.scene.id;if(!['s001','s003','s004','s005'].includes(sid))return;
        const actors={party:{position:[player.pos.col,player.pos.row,player.pos.height],facing,visible:true,walking}};
        for(const e of activeScene.scene.entities.filter(e=>['e19','e62','e83','e84','e123','e124','e127'].includes(e.id)))
          actors[e.id]={position:[e.pos.col,e.pos.row,e.pos.height],facing:e.facing??'down',visible:!e.hidden,state:host.getEntityState(e.id),behavior:world.script.behaviors?.entities?.[sid]?.[e.id]??null};
        globalThis.__errandPoint?.(source,{scene:sid,actors,money:world.money,persistent:world.script.behaviors?.entities??{},hooks:world.script.behaviors?.scenes??{},control:!runner&&!dialogBox.active&&!presentation.busy()});
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
      const file = MEAL_TRACE_TARGETS.find((file) => id.endsWith(`/${file}`))
      if (!file) return null
      const result = instrumentErrandTrace(code, file)
      return { code: result.code, map: null }
    },
  }
}
