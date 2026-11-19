export function installInterludeWitness() {
  const ids = new Set(Array.from({ length: 12 }, (_, i) => `e${2456 + i}`))
  const events = []
  const images = {}
  const tags = new WeakMap()
  const filmFrames = new WeakMap()
  let drawings = new Map()
  let lastTick = null
  let compositeShift = 0
  let film = null
  let filmEndAt = null
  let wasLit = false
  let lastGameScript = null
  let lastReforgeScript = null
  let lastGameKey = null
  let drawnDialogue = null
  let sageLine = null
  const firstWords = '你怎么不阻止他们呢！？'
  const at = () => performance.now()
  const emit = (kind, fields) => events.push({ kind, at: at(), ...fields })
  const sceneOfGame = (gs) => gs && `s${String(gs.wNumScene - 1).padStart(3, '0')}`
  const sceneOfReforge = () => globalThis.__rfScene?.id
  const tracked = (scene) => scene === 's149' || scene === 's150'
  const gameCast = (gs) =>
    gs.npcs
      .filter((npc) => ids.has(`e${npc.id}`))
      .map((npc) => ({
        id: `e${npc.id}`,
        x: npc.x,
        y: npc.y,
        facing: npc.facing,
        index: npc.scriptedFrame ?? 0,
        sprite: npc.spriteNum,
        state: npc.sState,
        vanish: npc.sVanishTime,
        pc: npc.autoCursor?.ip,
        label: npc.autoLabel,
      }))
  const gameFade = (gs) => {
    const fd = gs.paletteFadeState
    return fd
      ? {
          kind: fd.kind,
          freeze: fd.freeze ?? false,
          start: fd.startTimeMs,
          total: fd.totalMs,
          progress: Math.min(1, (at() - fd.startTimeMs) / fd.totalMs),
        }
      : null
  }
  const clipPart = () => film && (filmEndAt === null ? 'clip-' : 'after-') + film
  const drawRows = () => [...drawings.values()].map(({ shape, ...row }) => row)
  const onScreen = ({ x, y, width, height }) =>
    x < 320 && y < 200 && x + width > 0 && y + height > 0
  function take(label, context, detail, indexPixels, palette) {
    if (images[label]) return
    const source = context.canvas
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    canvas.getContext('2d').drawImage(source, 0, 0)
    images[label] = {
      at: at(),
      detail,
      canvas,
      indices: indexPixels?.slice(),
      palette,
      draws: [...drawings.values()],
      shift: compositeShift,
    }
    emit('canvas-witness', { label })
  }
  function finishImage({ at, detail, canvas, indices: indexPixels, palette, draws, shift }) {
    const rgba = !indexPixels
      ? canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      : null
    const scale = canvas.width / 320
    const visibility = []
    for (const draw of draws) {
      if (!draw.intersects) continue
      const { shape, x, y, width, height } = draw
      let clippedOpaque = 0
      let finalPixelsMatching = 0
      for (let i = 0; i < width * height; i++) {
        if (!shape.opaque[i]) continue
        const px = x + (i % width)
        const py = y + Math.floor(i / width) + shift
        if (px < 0 || py < 0 || px >= 320 || py >= 200) continue
        clippedOpaque++
        if (indexPixels) {
          if (indexPixels[Math.floor(py) * 320 + Math.floor(px)] === shape.indices[i])
            finalPixelsMatching++
        } else {
          const c = palette[shape.pixels[i]]
          const o =
            (Math.floor((py + 0.5) * scale) * canvas.width + Math.floor((px + 0.5) * scale)) * 4
          if (c && rgba[o] === c[0] && rgba[o + 1] === c[1] && rgba[o + 2] === c[2])
            finalPixelsMatching++
        }
      }
      visibility.push({ id: draw.id, clippedOpaque, finalPixelsMatching })
    }
    return { at, detail, visibility, bytes: canvas.toDataURL('image/png').split(',')[1] }
  }
  const stageImages = (context, detail, indexPixels, palette) => {
    const { scene, cinematic, opacity, fade, held, leader } = detail
    if (scene === 's149' && film === null)
      take('149-before-005', context, detail, indexPixels, palette)
    if (scene === 's149' && film === 5 && filmEndAt !== null && !cinematic) {
      take('between-first-world', context, detail, indexPixels, palette)
      const full =
        opacity !== undefined ? opacity === 0 : !fade || (fade.total === 800 && fade.progress === 1)
      if (full) {
        if (!wasLit) take('between-first-full', context, detail, indexPixels, palette)
        wasLit = true
        if (at() - filmEndAt > 2500) take('between-2500ms', context, detail, indexPixels, palette)
        if (at() - filmEndAt > 5000) take('between-5000ms', context, detail, indexPixels, palette)
      } else if (wasLit) {
        take('between-fade-out', context, detail, indexPixels, palette)
      }
    }
    if (scene === 's149' && film === 2 && filmEndAt !== null && !cinematic)
      take('149-after-002-uncovered', context, detail, indexPixels, palette)
    if (scene === 's150') {
      take('150-first-output', context, detail, indexPixels, palette)
      if (!held && (opacity === undefined || opacity < 0.999))
        take('150-first-unheld', context, detail, indexPixels, palette)
      const moved =
        Array.isArray(leader?.position) && leader.position[0] === 68 && leader.position[1] === -2
      if (moved || (leader?.position?.col === 68 && leader?.position?.row === -2))
        take('150-correct-position', context, detail, indexPixels, palette)
      const actor = detail.cast.find(({ id }) => id === 'e2465')
      if (actor && detail.draws.some((row) => row.id === 'e2465' && row.intersects)) {
        const fullReveal =
          opacity !== undefined
            ? opacity === 0
            : !detail.needsFade && (!fade || fade.progress === 1)
        if (fullReveal && !held) take('150-reveal-full', context, detail, indexPixels, palette)
        const walking = actor.position
          ? actor.position.col !== 71 || actor.position.row !== 7
          : actor.x !== 1024 || actor.y !== 624
        if (walking && !held) take('150-sage-walk', context, detail, indexPixels, palette)
        if (actor.facing === 'left' && fullReveal)
          take('150-sage-left', context, detail, indexPixels, palette)
      }
      if (
        detail.dialogue?.text?.replace(/\s/g, '').includes(firstWords) &&
        detail.dialogue?.speaker?.includes('剑圣') &&
        !sageLine
      ) {
        take('150-sage-first-line', context, detail, indexPixels, palette)
        sageLine = {
          at: at(),
          text: detail.dialogue.text,
          speaker: detail.dialogue.speaker,
          tick: detail.tick,
        }
        emit('sage-first-line-visible', sageLine)
      }
    }
  }

  globalThis.__interlude = {
    snapshot: () => ({
      events,
      images: Object.fromEntries(
        Object.entries(images).map(([label, frame]) => [label, finishImage(frame)]),
      ),
    }),
    firstSageLine: () => sageLine,
    gameDialogue(gs, box) {
      if (sceneOfGame(gs) !== 's150') return
      drawnDialogue = {
        speaker: box.titleText,
        at: box.lineStartMs,
        phase: box.phase,
        text: [...box.shownLines, box.currentLineText?.slice(0, box.charsRevealed)]
          .filter(Boolean)
          .join('\n'),
      }
    },
    rfDialogue(scene, slots) {
      if (scene !== 's150') return
      const active = slots?.find((slot) => slot.active)
      if (!active) return
      drawnDialogue = {
        speaker: active.speaker,
        at: active.pageStartedAtMs,
        phase: active.phase,
        ids: active.pageTextIds,
        text: active.visibleText,
      }
    },
    begin(scene) {
      if (!tracked(scene)) return
      drawings = new Map()
      compositeShift = 0
      drawnDialogue = null
    },
    shift(offset) {
      compositeShift = offset
    },
    gameOp(gs, cursor, command) {
      const scene = sceneOfGame(gs)
      if (!tracked(scene)) return
      lastGameScript = {
        ip: cursor.ip,
        op: command.op,
        opcode: command.opcode,
        operands: command.operands,
      }
      emit('foreground', { scene, ...lastGameScript, after: clipPart(), tick: gs.frameNum })
    },
    gameAuto(gs, npc, cursor, cmd) {
      if (!tracked(sceneOfGame(gs)) || !ids.has(`e${npc.id}`)) return
      emit('auto-op', {
        scene: sceneOfGame(gs),
        id: `e${npc.id}`,
        pc: cursor.ip,
        op: cmd.op,
        opcode: cmd.opcode,
        after: clipPart(),
        tick: gs.frameNum,
        x: npc.x,
        y: npc.y,
        facing: npc.facing,
        frame: npc.scriptedFrame ?? 0,
      })
    },
    gameDrawNpc(npc, sprite, frame, sx, sy) {
      if (!ids.has(`e${npc.id}`) || !tracked(sceneOfGame(globalThis.__tpgs))) return
      const row = {
        id: `e${npc.id}`,
        frame,
        sprite: npc.spriteNum,
        facing: npc.facing,
        x: sx - Math.floor(sprite.width / 2),
        y: sy - sprite.height,
        width: sprite.width,
        height: sprite.height,
        shape: sprite,
      }
      drawings.set(row.id, { ...row, intersects: onScreen(row) })
    },
    gameFilmBegin(options) {
      const gs = globalThis.__tpgs
      if (sceneOfGame(gs) !== 's149' || ![5, 2].includes(options.chunkIdx)) return
      film = options.chunkIdx
      filmEndAt = null
      emit('film-start', {
        scene: 's149',
        film,
        cast: gameCast(gs),
        pc: lastGameScript?.ip,
        tick: gs.frameNum,
      })
    },
    gameFilmDraw(options, index) {
      const gs = globalThis.__tpgs
      if (sceneOfGame(gs) !== 's149' || ![5, 2].includes(options.chunkIdx)) return
      const detail = {
        scene: 's149',
        film: options.chunkIdx,
        filmFrame: index,
        cast: gameCast(gs),
        tick: gs.frameNum,
      }
      emit('film-draw', detail)
      if (index === 0 || index === (film === 5 ? 81 : 92)) {
        drawings = new Map()
        take(`rng-${film}-frame-${index}`, options.canvasCtx, detail)
      }
    },
    gameFilmEnd(options) {
      const gs = globalThis.__tpgs
      if (sceneOfGame(gs) !== 's149' || ![5, 2].includes(options.chunkIdx)) return
      filmEndAt = at()
      emit('film-end', {
        scene: 's149',
        film: options.chunkIdx,
        cast: gameCast(gs),
        tick: gs.frameNum,
      })
    },
    gameWorld(gs, context, indices, battle, advance) {
      const scene = sceneOfGame(gs)
      if (!tracked(scene) || battle) return
      const fade = gameFade(gs)
      const detail = {
        scene,
        part: clipPart(),
        tick: gs.frameNum,
        advance,
        script: lastGameScript,
        waiting: gs.eventCursor?.waiting,
        phase: gs.sceneLoading
          ? 'loading'
          : gs.blackScreenHold
            ? 'black'
            : fade?.freeze
              ? 'frozen'
              : 'world',
        camera: { ...gs.camera },
        fade,
        needsFade: gs.needToFadeIn,
        night: gs.nightPalette,
        shiftY: compositeShift,
        dialogue: drawnDialogue,
        held: !!gs.sceneLoading || fade?.freeze === true,
        leader: {
          x: gs.party.x,
          y: gs.party.y,
          facing: gs.party.facing,
          position: [
            (gs.party.y / 8 + gs.party.x / 16) / 2,
            (gs.party.y / 8 - gs.party.x / 16) / 2,
            0,
          ],
        },
        cast: gameCast(gs),
        draws: drawRows(),
      }
      const key = [scene, gs.frameNum, clipPart(), detail.phase, detail.waiting].join('/')
      if (key !== lastGameKey || scene === 's150' || film === 2) {
        lastGameKey = key
        emit('world-output', detail)
      }
      stageImages(context, detail, indices)
    },
    rfStep(self, path, command) {
      const scene = self?.scene ?? sceneOfReforge()
      if (!tracked(scene)) return
      const leaf = command.kind === 'leaf' ? command.command : command
      const row = {
        scene,
        self,
        path,
        op: leaf.kind,
        asset: leaf.asset,
        ms: leaf.ms,
        dir: leaf.dir,
        target: leaf.target,
        to: leaf.to,
        after: clipPart(),
        dx: leaf.dx,
        dy: leaf.dy,
        facing: leaf.facing,
        frame: leaf.frame,
        selection: leaf.selection,
        rows: leaf.cue?.rows,
        speaker: leaf.cue?.speaker,
      }
      if (self && ids.has(self.entity)) emit('auto-op', row)
      else if (!self) {
        lastReforgeScript = row
        emit('foreground', row)
      }
    },
    rfTag(sprite, entity, index, spriteId) {
      if (ids.has(entity.id))
        tags.set(sprite, { id: entity.id, index, facing: entity.facing, sprite: spriteId })
    },
    rfDraw(sprite, x, y) {
      const tag = tags.get(sprite)
      if (!tag) return
      const row = {
        ...tag,
        x,
        y,
        width: sprite.frame.width,
        height: sprite.frame.height,
        shape: sprite.frame,
      }
      drawings.set(tag.id, { ...row, intersects: onScreen(row) })
    },
    rfFilmRequest(opts, scene) {
      if (scene !== 's149') return
      film = Number(opts.asset.split('.').at(-1))
      filmEndAt = null
      emit('film-start', { scene, film, opts })
    },
    rfFilmIndex(asset, index, frame) {
      if (sceneOfReforge() !== 's149') return
      filmFrames.set(frame, { film: Number(asset.split('.').at(-1)), index })
    },
    rfFilmEnd(asset, succeeded, mode, scene) {
      if (scene !== 's149') return
      filmEndAt = at()
      emit('film-end', { scene, film: Number(asset.split('.').at(-1)), succeeded, mode })
    },
    rfWorld(context, meta, entities, frame, palette) {
      if (!tracked(meta.scene)) return
      const animated = filmFrames.get(frame)
      const cinematic = !!frame && ['held', 'playing', 'dialogue'].includes(meta.mode)
      const detail = {
        ...meta,
        part: clipPart(),
        script: lastReforgeScript,
        cinematic,
        dialogue: drawnDialogue,
        filmAsset: animated?.film,
        filmIndex: animated?.index,
        shiftY: compositeShift,
        cast: entities
          .filter((e) => ids.has(e.id))
          .map((e) => ({
            id: e.id,
            position: e.pos,
            facing: e.facing,
            hidden: e.hidden,
            pending: e.pending,
            activation: e.activation,
          })),
        draws: drawRows(),
      }
      const key = [
        meta.scene,
        meta.tick,
        detail.part,
        meta.mode,
        meta.held,
        animated?.index,
        meta.opacity === 0,
        meta.opacity === 1,
      ].join('/')
      if (key !== lastTick || meta.scene === 's150' || film === 2) {
        lastTick = key
        emit('world-output', detail)
      }
      if (
        cinematic &&
        animated &&
        (animated.index === 0 || animated.index === (animated.film === 5 ? 81 : 92))
      )
        take(`rng-${animated.film}-frame-${animated.index}`, context, detail, undefined, palette)
      stageImages(context, detail, undefined, palette)
    },
  }
}
