import assert from 'node:assert/strict'

export function installCollapseObserver() {
  const events = []
  const frames = new WeakMap()
  let scene
  let lastCinema
  let lastWorldScene
  let screenShiftY = 0
  const selected = new Set(['s144', 's149', 's150'])
  const emit = (kind, data) => {
    events.push({ at: performance.now(), kind, ...data })
  }
  const gameScene = (gs) => gs && `s${String(gs.wNumScene - 1).padStart(3, '0')}`
  const isCutscene = (chunk) => chunk === 5 || chunk === 2
  const sampleRows = (pixels, width, height, level) => {
    if (level <= 0 || level >= height) return null
    const count = Math.min(width * level, width * height)
    let top = 0
    let bottom = 0
    for (let i = 0; i < count; i++) {
      if (pixels[i] === 0) top++
      if (pixels[pixels.length - 1 - i] === 0) bottom++
    }
    return { top, bottom, count }
  }

  globalThis.__collapse = {
    snapshot: () => ({ events }),
    gameDraw(gs, sceneLoading) {
      const current = gameScene(gs)
      if (sceneLoading || !selected.has(current) || current === lastWorldScene) return
      lastWorldScene = current
      emit('first-world-flush', { scene: current, frame: gs.frameNum, position: gs.party })
    },
    gameShake(gs, before, advance, pixels) {
      const current = gameScene(gs)
      if (!selected.has(current)) return
      const level = gs.shakeLevel
      emit('world-shake-draw', {
        scene: current,
        frame: gs.frameNum,
        level,
        before,
        after: gs.shakeTime,
        advance,
        shiftY: before % 2 === 1 ? -level : level,
        rows: sampleRows(pixels, 320, 200, level),
        camera: gs.camera,
        fade: gs.fade?.kind,
      })
    },
    gameAnimationBegin(options, frameIndices) {
      if (gameScene(globalThis.__tpgs) !== 's149' || !isCutscene(options.chunkIdx)) return
      emit('animation-begin', {
        scene: 's149',
        chunk: options.chunkIdx,
        startFrame: frameIndices[0],
        endFrame: frameIndices.at(-1),
        count: frameIndices.length,
        frameDelayMs: options.frameDelayMs,
        initialFadeInMs: options.initialFadeInMs,
      })
    },
    gameAnimationDraw(options, index, stage, shiftY) {
      if (gameScene(globalThis.__tpgs) !== 's149' || !isCutscene(options.chunkIdx)) return
      emit('animation-frame-draw', {
        scene: 's149',
        chunk: options.chunkIdx,
        index,
        stage,
        shiftY,
        rows: sampleRows(options.fb.indices, 320, 200, Math.abs(shiftY)),
      })
    },
    gameAnimationEnd(options, framesShown, skipped) {
      if (gameScene(globalThis.__tpgs) !== 's149' || !isCutscene(options.chunkIdx)) return
      emit('animation-end', { scene: 's149', chunk: options.chunkIdx, framesShown, skipped })
    },
    reforgeShake(sceneId, now, frames, level) {
      if (!selected.has(sceneId)) return
      emit('world-shake-request', { scene: sceneId, now, frames, level })
    },
    reforgeBeginComposite() {
      screenShiftY = 0
    },
    reforgeAppliedShift(shiftY) {
      screenShiftY = shiftY
    },
    reforgeComposited(sceneId, now, camera, fade, cinematic, frame, mode) {
      this.reforgeWorld(sceneId, now, camera, camera, fade, cinematic, screenShiftY)
      if (cinematic) this.reforgeAnimationDraw(frame, mode, screenShiftY)
    },
    reforgeWorld(sceneId, now, base, rendered, fade, cinema, shiftY = base.y - rendered.y) {
      if (!selected.has(sceneId)) return
      scene = sceneId
      if (sceneId !== lastWorldScene) {
        lastWorldScene = sceneId
        emit('first-world-flush', { scene: sceneId, now, fade, cinema })
      }
      if (sceneId === 's144' || sceneId === 's149') {
        emit('world-shake-draw', {
          scene: sceneId,
          now,
          shiftY,
          camera: base,
          fade,
          cinema,
        })
      }
    },
    reforgeAnimationBegin(asset, range) {
      emit('animation-begin', {
        scene: scene ?? 's149',
        chunk: Number(asset.split('.').at(-1)),
        asset,
        ...range,
        count: range.endFrame - range.startFrame + 1,
      })
    },
    reforgeAnimationIndex(asset, index, frame) {
      const source = { asset, chunk: Number(asset.split('.').at(-1)), index }
      frames.set(frame, source)
      emit('animation-frame-decoded', source)
    },
    reforgeAnimationDraw(frame, mode, shiftY) {
      const source = frames.get(frame)
      if (!source) return
      const key = [source.asset, source.index, mode, shiftY].join('/')
      if (key === lastCinema) return
      lastCinema = key
      emit('animation-frame-draw', { scene, ...source, mode, shiftY })
    },
    reforgeAnimationEnd(asset, succeeded, mode) {
      emit('animation-end', {
        scene,
        chunk: Number(asset.split('.').at(-1)),
        asset,
        succeeded,
        mode,
      })
    },
    reforgeAnimationRequest(opts, owner) {
      emit('animation-request', { scene, ...opts, owner })
    },
  }
}

export function assertCutscenes({ events }, engine) {
  const expected = [
    [5, 82],
    [2, 93],
  ]
  const beginnings = events.filter(({ kind }) => kind === 'animation-begin')
  const endings = events.filter(({ kind }) => kind === 'animation-end')
  assert.deepEqual(
    beginnings.map(({ chunk, count }) => [chunk, count]),
    expected,
    'both native playback ranges',
  )
  assert.deepEqual(
    endings.map(({ chunk }) => chunk),
    [5, 2],
    'both native playback completions',
  )
  for (const [chunk, count] of expected) {
    const start = beginnings.find((item) => item.chunk === chunk)
    const end = endings.find((item) => item.chunk === chunk)
    assert(engine === 'game' ? !end.skipped && end.framesShown === count : end.succeeded)
    const frameRows = events.filter(
      (item) => item.kind === 'animation-frame-draw' && item.chunk === chunk && item.at <= end.at,
    )
    const indices = [...new Set(frameRows.map(({ index }) => index))]
    assert.deepEqual(
      indices,
      Array.from({ length: count }, (_, index) => index),
      'all native frames drawn in order',
    )
    assert(start.at <= frameRows[0].at && frameRows.at(-1).at < end.at)
  }
  const endpoint = events.find(
    ({ kind, scene }) => kind === 'first-world-flush' && scene === 's150',
  )
  assert(
    endpoint && endpoint.at > endings.at(-1).at,
    'new scene actually drawn after the cutscenes',
  )
}
