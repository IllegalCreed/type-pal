import assert from 'node:assert/strict'
import base from './battle-world-bee-game.config.mts'

function replace(source: string, anchor: string, replacement: string) {
  assert.equal(source.split(anchor).length, 2, `Game save evidence anchor changed: ${anchor}`)
  return source.replace(anchor, replacement)
}

const saves = {
  name: 'game-world-save-evidence',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  transform(source: string, id: string) {
    const path = id.split('?')[0]
    if (path?.endsWith('/packages/game/src/core/scene-system.ts')) {
      return replace(
        replace(
          source,
          '    updateEventObjectsAndTrigger(gs)',
          `    const witness = gs.wNumScene === 7 ? globalThis.__q2BeePostWin : undefined
    const bee = witness && gs.npcs.find((npc) => npc.id === 154)
    const before = bee && [(bee.sState ?? 1) < 0, bee.sVanishTime ?? 0]
    updateEventObjectsAndTrigger(gs)
    if (bee) witness.tick({ clock: gs.frameNum, before,
      after: [(bee.sState ?? 1) < 0, bee.sVanishTime ?? 0],
      grid: [(gs.party.x / 16 + gs.party.y / 8) / 2, (gs.party.y / 8 - gs.party.x / 16) / 2],
      foot: [bee.x - gs.camera.x, bee.y - gs.camera.y],
    })`,
        ),
        '      globalThis.__beeGameContact?.(gs, npc)',
        `      globalThis.__beeGameContact?.(gs, npc)
      if (gs.wNumScene === 7 && npc.id === 154)
        globalThis.__q2BeePostWin?.contact({ entity: 'e154', entry: gs.eventCursor?.ip,
          grid: [(gs.party.x / 16 + gs.party.y / 8) / 2, (gs.party.y / 8 - gs.party.x / 16) / 2],
        })`,
      )
    }
    if (path?.endsWith('/packages/game/src/present/present.ts')) {
      return replace(
        source,
        '      draw: (f) => drawSprite(f, capturedSprite, capturedSX, capturedSY + 7),',
        `      draw: (f) => {
        drawSprite(f, capturedSprite, capturedSX, capturedSY + 7)
        if (capturedNpcId === 154 && gs.wNumScene === 7)
          globalThis.__q2BeePostWin?.paint({ foot: [capturedSX, capturedSY],
            size: [capturedSprite.width, capturedSprite.height] })
      },`,
      )
    }
    if (path?.endsWith('/packages/game/src/present/battle/draw-battle-ui.ts')) {
      return replace(
        replace(
          source,
          "        case 'main':\n          break",
          `        case 'main':
          globalThis.__q2BeePostWin?.menu(state.selectedAction, 'team-' + globalThis.__lastBattleEnemyTeam)
          break`,
        ),
        '      renderText(fb, getWord(it.id, it.label), x, y, color, glyphs, true)',
        `      renderText(fb, getWord(it.id, it.label), x, y, color, glyphs, true)
      if (it.id === 354) globalThis.__q2BeePostWin?.spell({ id: String(it.id),
        label: getWord(it.id, it.label), mp: parseRightNumber(it.rightText), enabled: !it.disabled,
        selected, position: [x, y] })`,
      )
    }
    if (path?.endsWith('/packages/game/src/core/menu/menu-driver.ts')) {
      const anchor = 'await Save.saveSlot(slot, gs)'
      assert.equal(source.split(anchor).length, 2, 'Game manual save commit anchor changed')
      return source.replace(anchor, `${anchor}\n          globalThis.__q2SaveWritten?.(slot)`)
    }
    if (path?.endsWith('/packages/game/src/tools/toast.ts')) {
      const anchor = "el.style.transform = 'translateY(0)'"
      assert.equal(source.split(anchor).length, 2, 'Game shown-toast anchor changed')
      return source.replace(anchor, `${anchor}\n  globalThis.__q2SaveToast?.(message)`)
    }
    if (path?.endsWith('/packages/game/src/shell/bootstrap.ts')) {
      const anchor = 'globalThis.__beeGameRestored?.(gs);'
      const absent = `      console.warn(\`[bootstrap.loadGame] slot \${slot} 空,load skip\`)`
      assert.equal(source.split(anchor).length, 2, 'Game after-load anchor changed')
      assert.equal(source.split(absent).length, 2, 'Game missing-slot guard changed')
      return source
        .replace(anchor, `${anchor}\nglobalThis.__q2SaveRestored?.(slot);`)
        .replace(absent, `${absent}\n      globalThis.__q2SaveAbsent?.(slot)`)
    }
    return null
  },
}

export default { ...base, plugins: [...base.plugins, saves] }
