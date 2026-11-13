import { evidenceObserverScript } from './evidence-recorder.mjs'

/** Runner-owned configuration is separate from the observer's source and contains no oracle. */
export function battleObserverScript(context) {
  return `globalThis.__battleTraceContext=${JSON.stringify(context)};${evidenceObserverScript(installBattleTraceObserver)}`
}

/** Browser serializable. All engine adapters submit facts; only the shared recorder assigns order. */
export function installBattleTraceObserver(context, createRecorder) {
  const input = context ?? globalThis.__battleTraceContext
  delete globalThis.__battleTraceContext
  if (
    !input ||
    !['game', 'reforge'].includes(input.engine) ||
    ![input.scenarioId, input.runId, input.random?.algorithm].every(
      (value) => typeof value === 'string' && value.trim(),
    ) ||
    !Number.isSafeInteger(input.random?.seed) ||
    input.random.seed < 0 ||
    input.random.seed > 0xffffffff ||
    typeof createRecorder !== 'function'
  )
    throw new Error('invalid battle evidence context')
  const identity = {
    engine: input.engine,
    scenarioId: input.scenarioId,
    runId: input.runId,
  }
  const random = structuredClone(input.random)
  const portraitProbe = input.portraitProbe
  if (
    portraitProbe !== undefined &&
    (!Number.isInteger(portraitProbe?.slot) ||
      portraitProbe.slot < 0 ||
      portraitProbe.slot > 2 ||
      !Array.isArray(portraitProbe.points) ||
      !portraitProbe.points.length ||
      portraitProbe.points.length > 16 ||
      portraitProbe.points.some(
        (point) => ![point?.x, point?.y].every((value) => Number.isInteger(value) && value >= 0),
      ))
  )
    throw new Error('invalid battle portrait probe')
  const errors = [],
    starts = [],
    commands = [],
    actions = [],
    rounds = [],
    randomDraws = [],
    presentations = [],
    audioEvents = [],
    terminals = []
  let closed = false,
    overflow = false
  let frame, previousFrame
  let markedRandom
  let nextNumberId = 0
  let nextAudioCueId = 0
  let nextAudioBufferId = 0
  let lastPortraitTurn
  const fighterDraws = new WeakMap()
  const floatTargets = new WeakMap()
  const audioBuffers = new WeakMap()
  const recorder = createRecorder({
    context: () => identity,
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const append = (list, value, requiresStart = true) => {
    try {
      if (closed) throw new Error('battle evidence is sealed')
      if (requiresStart && starts.length !== 1) throw new Error('battle evidence has no start')
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid battle evidence fact')
      for (const key of ['order', 'seq', 'atMs', 'engine', 'runId', 'scenarioId'])
        if (Object.hasOwn(value, key)) throw new Error(`fact cannot replace evidence ${key}`)
      if (typeof value.source !== 'string' || !value.source.trim())
        throw new Error('battle evidence source is required')
      return recorder.append(list, { ...value, atMs: performance.now() })
    } catch (error) {
      recorder.fail(error)
      return undefined
    }
  }
  const capturePortrait = (slot, hp, face, x, y, source, read) => {
    if (
      !portraitProbe ||
      slot !== portraitProbe.slot ||
      !frame?.selecting ||
      frame.turn === lastPortraitTurn
    )
      return undefined
    const captured = frame
    const { width, height } = face
    const points = portraitProbe.points
    try {
      if (points.some((point) => point.x >= width || point.y >= height))
        throw new Error('portrait probe outside the drawn face')
      const before = read(points)
      return () => {
        try {
          if (frame !== captured) throw new Error('portrait draw crossed a battle frame')
          const after = read(points)
          frame.portrait = {
            source,
            slot,
            hp,
            x,
            y,
            width,
            height,
            samples: points.map((point, i) => ({ ...point, before: before[i], after: after[i] })),
          }
          lastPortraitTurn = frame.turn
        } catch (error) {
          recorder.fail(error)
        }
      }
    } catch (error) {
      recorder.fail(error)
      return undefined
    }
  }
  const port = {
    start(state, source) {
      if (starts.length) {
        recorder.fail('duplicate battle start')
        return
      }
      append(starts, { kind: 'battle-start', state, source }, false)
    },
    command(value) {
      append(commands, value)
    },
    action(value) {
      append(actions, value)
    },
    round(value) {
      append(rounds, value)
    },
    random(value, source) {
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        recorder.fail('invalid random draw')
        return
      }
      append(
        randomDraws,
        { kind: 'random-draw', index: randomDraws.length, value, source, ...markedRandom },
        false,
      )
      markedRandom = undefined
    },
    markRandom(purpose, queue, target) {
      if (closed || starts.length !== 1) return
      if (markedRandom) recorder.fail('a marked random draw was not consumed')
      markedRandom = { purpose, ...(queue ? { queue } : {}), ...(target ? { target } : {}) }
    },
    presentation(value) {
      append(presentations, value)
    },
    audioDecoded(assetId, buffer, path, source) {
      if (closed) return
      try {
        const { numberOfChannels: channels, sampleRate, length: frames } = buffer
        let peak = 0
        for (let i = 0; i < channels; i++)
          for (const sample of buffer.getChannelData(i)) peak = Math.max(peak, Math.abs(sample))
        const bufferId = nextAudioBufferId++
        if (
          append(
            audioEvents,
            {
              kind: 'sfx-decoded',
              assetId,
              bufferId,
              path,
              channels,
              sampleRate,
              frames,
              peak,
              source,
            },
            false,
          )
        )
          audioBuffers.set(buffer, bufferId)
      } catch (error) {
        recorder.fail(error)
      }
    },
    audioRequested(assetId, source) {
      if (closed || starts.length !== 1) return undefined
      const cueId = nextAudioCueId++
      return append(audioEvents, { kind: 'sfx-request', cueId, assetId, source })?.cueId
    },
    audioStarted(cueId, assetId, buffer, context, source) {
      if (closed || cueId === undefined) return
      const bufferId = audioBuffers.get(buffer)
      if (bufferId === undefined) {
        recorder.fail('a started battle sound has no native decoded buffer receipt')
        return
      }
      append(audioEvents, {
        kind: 'sfx-start',
        cueId,
        assetId,
        bufferId,
        contextState: context.state,
        audioTimeSeconds: context.currentTime,
        source,
      })
    },
    beginFrame(source, state) {
      if (closed || starts.length !== 1) return
      if (frame) recorder.fail('a battle frame was replaced before its draw completed')
      frame = {
        source,
        ...state,
        enemies: new Map(),
        players: new Map(),
        panels: [],
        numbers: [],
        dialogue: [],
        dialogueLayers: new Map(),
        settlement: null,
      }
    },
    labelFighter(draw, side, slot, fading = false, frameIndex) {
      if (frame) fighterDraws.set(draw, { side, slot, fading, frameIndex })
    },
    fighterDrawn(draw, appliedFrameIndex) {
      const fighter = frame && fighterDraws.get(draw)
      if (!fighter) return
      const { side, slot, fading } = fighter
      const frameIndex = appliedFrameIndex ?? fighter.frameIndex
      const position = { slot, x: draw.x, y: draw.y }
      if (side === 'enemy')
        frame.enemies.set(
          slot,
          frameIndex === undefined ? { slot, fading } : { ...position, frameIndex, fading },
        )
      else
        frame.players.set(
          slot,
          frameIndex === undefined
            ? position
            : {
                ...position,
                frameIndex,
                colorShift: draw.iColorShift ?? draw.colorShift ?? 0,
              },
        )
    },
    magicOverlayDrawn(x, y, frameIndex) {
      if (!frame || input.observeMagicOverlays !== true) return
      // Keep only completed overlay draws, in native paint order.
      frame.magicOverlays ??= []
      frame.magicOverlays.push({ x, y, frameIndex })
    },
    panelDrawn(slot) {
      if (frame) frame.panels.push(slot)
    },
    dialogueText(layer, text, title = false) {
      if (!frame || !text) return
      const draw = frame.dialogueLayers.get(layer) ?? { lines: [], title: null, portrait: null }
      if (title) draw.title = text
      else draw.lines.push(text)
      frame.dialogueLayers.set(layer, draw)
    },
    dialoguePortrait(layer, id, x, y, width, height) {
      if (!frame) return
      const draw = frame.dialogueLayers.get(layer) ?? { lines: [], title: null, portrait: null }
      const palId = typeof id === 'string' && /^portrait\.pal\.(\d+)$/u.exec(id)
      draw.portrait = { id: palId ? Number(palId[1]) : id, x, y, width, height }
      frame.dialogueLayers.set(layer, draw)
    },
    dialogueDrawn(layer, slot, phase, active, source, visibleText) {
      if (!frame) return
      const draw = frame.dialogueLayers.get(layer)
      const lines = visibleText?.split('\n').filter((line) => line !== '') ?? draw?.lines ?? []
      if (lines.length || draw?.portrait || draw?.title)
        frame.dialogue.push({
          slot,
          phase,
          active,
          source,
          lines,
          title: draw?.title ?? null,
          portrait: draw?.portrait ?? null,
        })
    },
    captureIndexedPortrait(slot, hp, fb, face, x, y, colors) {
      return capturePortrait(slot, hp, face, x, y, 'game:blitPortrait', (points) =>
        points.map((point) => {
          const sx = x + point.x,
            sy = y + point.y
          if (sx < 0 || sx >= fb.width || sy < 0 || sy >= fb.height)
            throw new Error('portrait probe outside the Game framebuffer')
          const index = fb.indices[sy * fb.width + sx]
          const rgb = colors?.[index]
          if (!rgb) throw new Error('battle portrait has no live palette entry')
          return { index, rgba: [...rgb, 255] }
        }),
      )
    },
    captureCanvasPortrait(slot, hp, ctx, face, x, y) {
      return capturePortrait(slot, hp, face, x, y, 'reforge:drawPlayerInfoBox', (points) => {
        const transform = ctx.getTransform()
        const positions = points.map((point) => {
          const pixel = transform.transformPoint({ x: x + point.x + 0.5, y: y + point.y + 0.5 })
          return { x: Math.floor(pixel.x), y: Math.floor(pixel.y) }
        })
        const left = Math.min(...positions.map((point) => point.x))
        const right = Math.max(...positions.map((point) => point.x))
        const top = Math.min(...positions.map((point) => point.y))
        const bottom = Math.max(...positions.map((point) => point.y))
        if (left < 0 || top < 0 || right >= ctx.canvas.width || bottom >= ctx.canvas.height)
          throw new Error('portrait probe outside the Reforge canvas')
        const width = right - left + 1,
          height = bottom - top + 1
        // Read the real destination pixels without changing the product context's readback mode.
        const scratch = new OffscreenCanvas(width, height).getContext('2d', {
          willReadFrequently: true,
        })
        if (!scratch) throw new Error('battle portrait readback canvas unavailable')
        scratch.drawImage(ctx.canvas, left, top, width, height, 0, 0, width, height)
        const { data } = scratch.getImageData(0, 0, width, height)
        return positions.map((point) => {
          const offset = ((point.y - top) * width + point.x - left) * 4
          return { rgba: Array.from(data.subarray(offset, offset + 4)) }
        })
      })
    },
    labelNumber(number, side, slot) {
      if (starts.length === 1 && !closed)
        floatTargets.set(number, { side, slot, numberId: nextNumberId++ })
    },
    numberDrawn(number, value, tone, right, y, age) {
      if (!frame || !['yellow', 'blue'].includes(tone)) return
      const target = floatTargets.get(number)
      if (!target) {
        recorder.fail('a drawn HP number has no native target')
        return
      }
      frame.numbers.push({ ...target, value, tone, right, y, age })
    },
    settlementDrawn(kind) {
      if (frame) frame.settlement = kind
    },
    endFrame() {
      if (!frame) return
      const {
        clockMs,
        source,
        enemies,
        players,
        dialogue,
        dialogueLayers: _dialogueLayers,
        ...state
      } = frame
      frame = undefined
      const bySlot = (a, b) => a.slot - b.slot
      const payload = {
        ...state,
        enemies: [...enemies.values()].sort(bySlot),
        players: [...players.values()].sort(bySlot),
        ...(dialogue.length ? { dialogue } : {}),
      }
      // Keep every observable transition, including the first frame without a faded sprite.
      const signature = JSON.stringify(payload)
      if (signature === previousFrame) return
      previousFrame = signature
      append(presentations, { kind: 'battle-frame', source, clockMs, payload })
    },
    terminal(value) {
      if (frame) recorder.fail('battle ended before the current frame completed')
      if (markedRandom) recorder.fail('battle ended with an unconsumed random draw marker')
      if (append(terminals, value)) closed = true
    },
    fail(error) {
      recorder.fail(error)
    },
    read() {
      return structuredClone({
        schemaVersion: 1,
        kind: 'battle-foundation-trace',
        ...identity,
        random,
        start: starts[0] ?? null,
        commands,
        actions,
        ...(rounds.length ? { rounds } : {}),
        randomDraws,
        presentations,
        ...(audioEvents.length ? { audioEvents } : {}),
        resources: recorder.resources(),
        terminal: terminals[0] ?? null,
        errors,
        overflow,
      })
    },
  }
  globalThis.__battleEvidence = Object.freeze(port)
}
