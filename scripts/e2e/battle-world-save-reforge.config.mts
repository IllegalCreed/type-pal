import assert from 'node:assert/strict'
import base from './battle-world-bee-reforge.config.mts'

function after(source: string, anchor: string, line: string): string {
  assert.equal(source.split(anchor).length, 2, `Reforge save evidence anchor changed: ${anchor}`)
  return source.replace(anchor, `${anchor}\n${line}`)
}

function observeRewardFrame(source: string): string {
  return after(
    source,
    '            observer?.surface(null)',
    `
            if (observer) {
              const left = 120 * WORLD_SCALE, top = 42 * WORLD_SCALE
              const width = 80 * WORLD_SCALE, height = 20 * WORLD_SCALE
              const shot = ctx.getImageData(left, top, width, height)
              const held = victoryFrame.frame
              let changed = 0
              for (let y = 0; y < height; y += WORLD_SCALE) {
                for (let x = 0; x < width; x += WORLD_SCALE) {
                  const actual = 4 * (y * width + x)
                  const base = 4 * ((top + y) * held.width + left + x)
                  if (shot.data[actual] !== held.data[base] ||
                      shot.data[actual + 1] !== held.data[base + 1] ||
                      shot.data[actual + 2] !== held.data[base + 2]) changed++
                }
              }
              observer.event('reward-frame', { changed })
            }`,
  )
}

function observeLifecycle(source: string): string {
  const withTick = source.replace(
    '    if (!table) return\n    const stepped = advanceEntityLifecycleWorldStep(table, {',
    `    const witness = activeScene.scene.id === 's006' ? globalThis.__q2BeePostWin : undefined
    const bee = witness && activeScene.scene.entities.find((entity) => entity.id === 'e154')
    const show = (entry) => [entry?.phase === 'despawned' || entry?.phase === 'awaitingExit', entry?.remainingTicks ?? 0]
    const tick = (result) => {
      if (!bee) return
      const foot = gridToPixel(bee.pos)
      witness.tick({ clock: motion.worldTick, before: show(table?.s006?.e154), after: show(result?.s006?.e154),
        grid: [player.pos.col, player.pos.row], foot: [foot.x - camera.x, foot.y - camera.y] })
    }
    if (!table) {
      tick(undefined)
      return
    }
    const stepped = advanceEntityLifecycleWorldStep(table, {`,
  )
  assert.notEqual(withTick, source, 'Reforge lifecycle observer anchor changed')
  return after(
    after(
      withTick,
      '      footAnchors: lifecycleFootAnchors(),\n    })',
      '    tick(stepped.table)',
    ),
    '    const encounterSignal = encounterController.signal',
    `    if (activeScene.scene.id === 's006' && e.id === 'e154')
      globalThis.__q2BeePostWin?.contact({ entity: e.id, team: h.enemyTeamId,
        grid: [player.pos.col, player.pos.row] })`,
  )
}

const saves = {
  name: 'reforge-world-save-evidence',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  transform(source: string, id: string) {
    const file = id.split('?')[0]
    if (file?.endsWith('/packages/reforge/src/world-scene-presentation.ts')) {
      return after(
        source,
        '        occlusionTrigger: false,\n      })',
        "      if (entity.id === 'e154') globalThis.__q2BeePostWin?.markSprite(sprites.at(-1))",
      )
    }
    if (file?.endsWith('/packages/reforge/src/render.ts')) {
      const anchor = '    for (const entry of entries) entry.draw()'
      assert.equal(source.split(anchor).length, 2, 'Reforge sprite draw anchor changed')
      return source.replace(
        anchor,
        `    for (const entry of entries) {
      entry.draw()
      if ('sprite' in entry) globalThis.__q2BeePostWin?.blit(entry.sprite, entry.x, entry.y)
    }`,
      )
    }
    if (file?.endsWith('/packages/reforge/src/battle/battle-session.ts')) {
      return after(
        after(
          source,
          '          this.selection.mainActionValidity(selectionContext),\n          true,\n        )',
          `        if (globalThis.__rfBattle === this && selection.phase === 'menu')
          globalThis.__q2BeePostWin?.menu(selection.menuIndex)`,
        ),
        '        drawBattleGrid(ctx, ui, g, rows, selection.skillIndex, now, MAGIC_GRID)',
        `        if (globalThis.__q2BeePostWin) {
          const index = p.skills.indexOf('354')
          const pageStart = Math.max(0, Math.floor(selection.skillIndex / 3) * 3 - 3 * MAGIC_GRID.pageOffset)
          const row = rows[index]
          if (row && index >= pageStart && index < pageStart + 3 * MAGIC_GRID.rows)
            globalThis.__q2BeePostWin.spell({ id: p.skills[index], label: row.label,
              mp: this.opts.skills?.[p.skills[index]]?.cost.mp, enabled: !row.disabled,
              selected: index === selection.skillIndex })
        }`,
      )
    }
    if (!file?.endsWith('/packages/reforge/src/main.ts')) return null
    const withMenu = after(
      source,
      '  if (import.meta.env.DEV) runtimeObservationReady = true',
      `
  globalThis.__q2SaveMenu = () => {
    if (!menus.active) return null
    const { menu, systemMenu, saveBrowser } = menus.view
    const active = saveBrowser.active ? saveBrowser : menu.openPanel === 'system' ? systemMenu : menu.stack.at(-1)
    return { kind: saveBrowser.active ? 'save-slot' : menu.openPanel ?? 'in-game',
      cursor: active?.cursor ?? null, mode: saveBrowser.active ? saveBrowser.mode : null };
  };
`,
    )
    const saved = after(
      withMenu,
      '      await saveStore.putSlot(meta, prepared.payload, capturedThumb)',
      '      globalThis.__q2SaveWritten?.(slotId)',
    )
    const restored = after(
      saved,
      "    if ((await doLoad(slotId, undefined, 'fade-in')) === 'loaded') {",
      '      globalThis.__q2SaveRestored?.(slotId)',
    )
    const atTitle = after(
      restored,
      "      outcome = await doLoad(bootLoadSlot, undefined, 'fade-in')",
      "      if (outcome === 'loaded') globalThis.__q2SaveRestored?.(bootLoadSlot)",
    )
    const seeded = atTitle.replace(
      'settleBattleVictory(session, world, canonicalProject, playVictory, undefined, {',
      `settleBattleVictory(session, world, canonicalProject, playVictory,
        globalThis.__beeWorld?.postWin ? () => globalThis.__beeWorld.take('growth') : undefined, {`,
    )
    assert.notEqual(seeded, atTitle, 'Reforge world growth RNG anchor changed')
    const toast = after(
      seeded,
      `      renderSpans(ctx, [{ text: toast.text }], 120, 6, {
        glyphs,
        shadow: true,
        forceRgba: [231, 223, 195],
      })`,
      '      globalThis.__q2SaveToast?.(toast.text)',
    )
    return observeLifecycle(observeRewardFrame(toast))
  },
}

export default { ...base, plugins: [...base.plugins, saves] }
