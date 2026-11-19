import assert from 'node:assert/strict'
import type { Plugin } from 'vite'
import base from './dragon-world.config.mts'

function observeAfter(source: string, anchor: string, observer: string) {
  assert.equal(source.split(anchor).length, 2, `Sword Saint observation anchor changed: ${anchor}`)
  return source.replace(anchor, `${anchor}\n${observer}`)
}

const sage: Plugin = {
  name: 'q2-cliff-sage-foreground',
  apply: 'serve',
  enforce: 'pre',
  transform(source, id) {
    const file = id.split('?')[0]
    if (file?.endsWith('/packages/reforge/src/script-runner-core.ts')) {
      return {
        code: observeAfter(
          source,
          '            this.onStep?.({ path: commandPath, command })',
          '            globalThis.__sageForeground?.command(this.self, commandPath, command, this.runningTiming, this.host.gameplayNow?.())',
        ),
        map: null,
      }
    }
    if (!file?.endsWith('/packages/reforge/src/main.ts')) return null
    let code = observeAfter(
      source,
      '  const fadeDriver = new SupersedingFadeDriver(0) // 0 透明 → 1 全黑；新事务连续接管并兑现旧 Promise',
      `  globalThis.__sageForeground?.attach(() => ({
    scene: activeScene.scene.id, clock: frames.now, worldTick: motion.worldTick,
    fadeBlack: fadeDriver.value, held: Boolean(sceneEntrySession.heldFrame),
    entryPhase: sceneEntrySession.active?.phase,
  }))`,
    )
    code = observeAfter(
      code,
      '    const entry = sceneEntrySession.startReveal(activeScene.scene.id, reveal)',
      '    globalThis.__sageForeground?.reveal(reveal, Boolean(entry))',
    )
    code = observeAfter(
      code,
      '      const d = pixelDeltaToGridDelta(dx, dy)\n      e.pos = { ...e.pos, col: e.pos.col + d.dcol, row: e.pos.row + d.drow }',
      "      globalThis.__sageForeground?.effect('nudgeEntity', id, { dx, dy, position: { ...e.pos } })",
    )
    code = observeAfter(
      code,
      '    nudgeEntity: (id, dx, dy) => {\n      // 增量制(0x6C/0x7D 像素位移):绝对 pixelToGrid 的 round 会把 ±4,±2px 碎步吞成 0',
      `      if (activeScene.scene.id === 's150' && id === 'e2465') globalThis.__sageForeground?.beforeNudge(id, activeScene.scene.entities
        .filter((actor) => ['e2464', 'e2465', 'e2466'].includes(actor.id))
        .map(({ id, pos, facing, hidden }) => ({ id, pos: { ...pos }, facing, hidden: hidden === true })))`,
    )
    code = observeAfter(
      code,
      '      motion.advanceExplicitAnimation(id)',
      "      globalThis.__sageForeground?.effect('animEntity', id, { animationCounter: motion.explicitAnimation(id) })",
    )
    code = observeAfter(
      code,
      '      worldPresentation.setEntityFrame(id, frame)',
      "      globalThis.__sageForeground?.effect('setEntityFrame', id, { frame })",
    )
    code = observeAfter(
      code,
      '    setEntityFacing: (id, fc) => {\n      motion.clearScriptGaitHandoffs(id)\n      const e = activeScene.scene.entities.find((x) => x.id === id)\n      if (e) e.facing = fc',
      "      if (e) globalThis.__sageForeground?.effect('setEntityFacing', id, { facing: e.facing })",
    )
    return { code, map: null }
  },
}

export default { ...base, plugins: [...base.plugins, sage] }
