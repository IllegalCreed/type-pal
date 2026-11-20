import assert from 'node:assert/strict'

const name = 'e2e-presented-scene-handoff'
const observe = 'globalThis.__e2eSceneHandoff'

function insertAfter(code, anchor, addition) {
  assert.equal(code.split(anchor).length, 2, `${name}: producer changed at ${anchor}`)
  return code.replace(anchor, anchor + addition)
}

/** Use the existing successful sprite-draw taps. A scene request is never a rendered scene. */
export function withSceneHandoffObservation(base) {
  const plugin = {
    name,
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?')[0]
      if (path.endsWith('/packages/game/src/present/present.ts')) {
        const withWorld = insertAfter(
          code,
          '__worldDrawOrder++; }',
          `
          ${observe}?.world("s" + String(gs.wNumScene - 1).padStart(3, "0"),
            ctx.tilemap, [gs.camera.x, gs.camera.y], __npcDraws.party);
        `,
        )
        const overlay = '  drawDialogOverlay(fb, gs, ctx)\n\n  // 7.'
        assert.equal(withWorld.split(overlay).length, 2, 'Game finished world overlay changed')
        return {
          code: withWorld.replace(
            overlay,
            `  drawDialogOverlay(fb, gs, ctx)
          ${observe}?.dialogue([gs.dialogBoxKept, gs.dialogBox].filter(Boolean)
            .flatMap(box => [...box.shownLines, box.currentLineText].filter(Boolean)));

  // 7.`,
          ),
          map: null,
        }
      }
      if (path.endsWith('/packages/game/src/shell/bootstrap.ts')) {
        let current = insertAfter(
          code,
          'presentCtx.tilemap = sceneAssets.tilemap',
          `\n    ${observe}?.map(sceneAssets.tilemap, sceneAssets.mapNum)`,
        )
        current = insertAfter(
          current,
          'presentCtx.tilemap = replacement.tilemap',
          `\n    ${observe}?.map(replacement.tilemap, mapNum)`,
        )
        return {
          code: insertAfter(
            current,
            'flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))',
            `\n      ${observe}?.commit(gs.paletteFadeState?.fade60 ?? null, Boolean(gs.sceneLoading || gs.paletteFadeState?.freeze));`,
          ),
          map: null,
        }
      }
      if (path.endsWith('/packages/reforge/src/main.ts')) {
        const loadMap =
          'loadMap: (id) => loadSceneMap(project.assetBase, id, project.tilesets, project.mapIndex),'
        assert.equal(code.split(loadMap).length, 2, 'Reforge map asset port changed')
        let current = code.replace(
          loadMap,
          `loadMap: async (id) => {
          const assets = await loadSceneMap(project.assetBase, id, project.tilesets, project.mapIndex)
          ${observe}?.map(assets.map, id)
          return assets
        },`,
        )
        const world = 'advanceWaveFrame: motion.worldTicksThisFrame > 0,\n      })'
        current = insertAfter(
          current,
          world,
          `
          ${observe}?.world(activeScene.scene.id, activeScene.map, [camera.x, camera.y],
            globalThis.__e2eNpcDrawPasses?.get(sprites)?.party);
        `,
        )
        const afterDialogue = '    if (showingGameOver) return'
        assert.equal(current.split(afterDialogue).length, 2, 'Reforge completed UI draw changed')
        current = current.replace(
          afterDialogue,
          `${afterDialogue}
          ${observe}?.dialogue(dialogBox.observeSlots().flatMap(slot => slot.pageTextIds));`,
        )
        return {
          code: insertAfter(
            current,
            'runWithPresentationFinalizer(() => render(frameAt), abortScript)',
            `\n      ${observe}?.commit(fadeDriver.value, Boolean(sceneEntrySession.heldFrame || preserveClosedDialogFrame));`,
          ),
          map: null,
        }
      }
      return null
    },
  }
  return { ...base, plugins: [...(base.plugins ?? []), plugin] }
}

/** Installed before the engine bundle and the local media sampler. */
export function installSceneHandoffObservation({ engine, sourceScene, width, height }) {
  const maps = new WeakMap()
  const rows = []
  let stagedWorld
  let stagedDialogue
  let presented
  let serial = 0
  let recordingSource = false
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = false
  globalThis.__e2eSceneHandoff = {
    map(map, id) {
      maps.set(map, typeof id === 'number' ? `map-${String(id).padStart(3, '0')}` : id)
    },
    world(scene, map, camera, actor) {
      const [a, b] = actor?.position ?? []
      stagedWorld = {
        scene,
        map: maps.get(map) ?? null,
        camera,
        leader:
          actor?.drawStatus === 'drawn'
            ? {
                position: engine === 'game' ? [a, b] : [16 * (a - b), 8 * (a + b)],
                sprite:
                  engine === 'game'
                    ? actor.assetId
                    : Number(actor.resourceAssetId?.split('.').at(-1)),
                frame: actor.frame,
                facing: actor.facing,
              }
            : null,
      }
    },
    dialogue(rows) {
      stagedDialogue = rows
    },
    commit(effect, held) {
      presented = {
        id: ++serial,
        world: stagedWorld ?? presented?.world ?? null,
        dialogue: stagedDialogue ?? presented?.dialogue ?? [],
        held: held || !stagedWorld,
        effect,
      }
      stagedWorld = undefined
      stagedDialogue = undefined
    },
    sample(output, captureFrame, atMs) {
      if (!recordingSource && presented?.world?.scene === sourceScene) recordingSource = true
      if (!recordingSource) return
      if (rows.length >= 3600) throw new Error('scene handoff output evidence overflow')
      ctx.drawImage(output, 0, 0, width, height)
      const data = ctx.getImageData(0, 0, width, height).data
      let luma = ''
      for (let i = 0; i < data.length; i += 4) {
        luma += String.fromCharCode(
          Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]),
        )
      }
      rows.push({ atMs, captureFrame, ...presented, luma: btoa(luma) })
    },
    read: () => rows,
  }
}
