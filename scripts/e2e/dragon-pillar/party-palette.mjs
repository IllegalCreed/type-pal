export function installPartyPaletteWitness() {
  const tags = new WeakMap()
  const roleNames = ['li-xiaoyao', 'zhao-linger', 'lin-yueru']
  let request = null
  let draws = []
  let sample = null

  function collect(id, slot, spriteId, frame, x, y, indices, opaque, width, height) {
    if (request === null) return
    draws.push({ id, slot, spriteId, frame, x, y, indices, opaque, width, height })
  }

  function finish(context, palette, details) {
    if (request === null || draws.length !== 3 || draws.some((row) => !row.id)) return
    const canvas = context.canvas
    const { width, height } = canvas
    const scale = width / 320
    const raster = context.getImageData(0, 0, width, height).data
    const chosen = []
    for (const draw of draws) {
      let opaque = 0
      let reds = 0
      let exact = 0
      let visibleReds = 0
      const samples = {}
      const colors = {}
      for (let q = 0; q < draw.indices.length; q++) {
        if (!draw.opaque[q]) continue
        const x = (draw.x + (q % draw.width)) * scale
        const y = (draw.y + Math.floor(q / draw.width) + (details.shiftY ?? 0)) * scale
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        const colorId = draw.indices[q]
        const expected = palette[colorId]
        const offset = (Math.floor(y + scale / 2) * width + Math.floor(x + scale / 2)) * 4
        const actual = Array.from(raster.slice(offset, offset + 3))
        const red = expected[0] > expected[1] + 15 && expected[0] > expected[2] + 15
        const matches =
          expected[0] === actual[0] && expected[1] === actual[1] && expected[2] === actual[2]
        opaque++
        if (red) reds++
        if (!matches) continue
        exact++
        if (red) visibleReds++
        colors[colorId] = (colors[colorId] ?? 0) + 1
        samples[colorId] ??= { colorId, expected, actual, x, y }
      }
      const frequent = Object.keys(colors)
        .sort((a, b) => colors[b] - colors[a])
        .slice(0, 10)
      chosen.push({
        id: draw.id,
        slot: draw.slot,
        spriteId: draw.spriteId,
        frame: draw.frame,
        blit: [draw.x, draw.y, draw.width, draw.height],
        opaque,
        reds,
        exact,
        visibleReds,
        colors,
        samples: frequent.map((colorId) => samples[colorId]),
      })
    }
    sample = {
      stage: request,
      at: performance.now(),
      width,
      height,
      details: structuredClone(details),
      rows: chosen.sort((a, b) => a.slot - b.slot),
      pixels: canvas.toDataURL('image/png').split(',')[1],
    }
    request = null
  }

  globalThis.__partyPalette = {
    arm(stage) {
      if (request !== null) throw new Error('party palette observation already armed')
      request = stage
      draws = []
      sample = null
    },
    read: () => sample,
    begin() {
      if (request !== null) draws = []
    },
    tag(sprite, id, slot, spriteId, frame) {
      if (request !== null) tags.set(sprite, { id, slot, spriteId, frame })
    },
    rfSprite(sprite, x, y) {
      const tag = tags.get(sprite)
      if (!tag) return
      const { id, slot, spriteId, frame } = tag
      collect(
        id,
        slot,
        spriteId,
        frame,
        x,
        y,
        sprite.frame.pixels,
        sprite.frame.opaque,
        sprite.frame.width,
        sprite.frame.height,
      )
    },
    rfWorld(scene, context, palette, ambience, party, vars, fade, cinematic) {
      if (request === null || scene !== 's144' || fade > 0.001 || cinematic) return
      finish(context, palette, {
        scene,
        ambience,
        vars,
        fade,
        savedParty: party.map(({ template, appearance }) => [
          template,
          appearance?.spriteId ?? null,
        ]),
      })
    },
    gameSprite(role, slot, spriteId, frame, x, y, shape) {
      collect(
        roleNames[role],
        slot,
        spriteId,
        frame,
        x - Math.floor(shape.width / 2),
        y - shape.height,
        shape.indices,
        shape.opaque,
        shape.width,
        shape.height,
      )
    },
    gameWorld(gs, context, palette, battle) {
      if (
        request === null ||
        gs.wNumScene !== 145 ||
        battle ||
        gs.sceneLoading ||
        gs.blackScreenHold ||
        gs.paletteFadeState
      )
        return
      finish(context, palette, {
        scene: 's144',
        paletteId: gs.numPalette,
        night: gs.nightPalette,
        screenWave: gs.wScreenWave,
        shiftY: 0,
        savedParty: gs.partyMembers.map((role) => [
          roleNames[role],
          gs.PlayerRolesRuntime.rgwSpriteNum[role],
        ]),
      })
    },
  }
}
