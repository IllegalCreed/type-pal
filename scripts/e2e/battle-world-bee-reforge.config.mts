import assert from 'node:assert/strict'
import base from '../../packages/reforge/vite.config.ts'

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `expected one Reforge observation anchor: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

function observeWorld(source: string): string {
  const contact = '    const encounterSignal = encounterController.signal'
  const move = '            player.pos = { ...playerOutcome.to }'
  const scripts = `        for (const def of scripted) {
          await expectDefined(scriptRuntime).runCommands(expectDefined(def.onDefeated), {
            signal,
            timing: 'interactive',
          })
          assertCurrent()
        }`
  const observed = after(
    source,
    contact,
    `
    globalThis.__beeWorld?.event('contact', {
      scene: activeScene.scene.id, entity: e.id, team: h.enemyTeamId,
      player: { ...player.pos }, enemy: { ...e.pos },
    })`,
  )
  const moved = replaceOnce(
    observed,
    move,
    `            const from = { ...player.pos }
${move}
            if (playerMoved && inputDirection) {
              globalThis.__beeWorld?.event('move', {
                scene: activeScene.scene.id, direction: inputDirection, from, to: { ...player.pos },
              })
              globalThis.__beeWorld?.route('commit:player.input', activeScene.scene.id, player.pos, inputDirection, true)
            }`,
  )
  const slotted = replaceOnce(
    moved,
    scripts,
    `        for (const [slot, def] of scripted.entries()) {
          const observer = globalThis.__beeWorld
          observer?.slot('before', slot, def.id, world)
          await expectDefined(scriptRuntime).runCommands(expectDefined(def.onDefeated), {
            signal,
            timing: 'interactive',
          })
          assertCurrent()
          observer?.slot('after', slot, def.id, world)
        }`,
  )
  const lifecycle = '      if (applyHostileLifecyclePolicy(e, result)) return'
  const hidden = replaceOnce(
    slotted,
    lifecycle,
    `      if (applyHostileLifecyclePolicy(e, result)) {
        globalThis.__beeWorld?.event('hidden', {
          entity: e.id, scene: activeScene.scene.id,
          state: world.entityLifecycles?.[activeScene.scene.id]?.[e.id],
          party: world.party.map(({ hp, mp }) => [hp, mp]), position: { ...player.pos },
          inventory: structuredClone(world.inventory), money: world.money,
        })
        return
      }`,
  )
  const suspend = '        applyHostileLifecyclePolicy(e, result)'
  const escaped = after(
    hidden,
    suspend,
    `        if (globalThis.__beeWorld?.escape)
          globalThis.__beeWorld.event('suspend', { entity: e.id, state: world.entityLifecycles?.[activeScene.scene.id]?.[e.id] })`,
  )
  const rendered = replaceOnce(
    escaped,
    `          if (returning) drawVictoryFade(returning.fade.advance(frames.now), 'out')
          else drawDialogue()`,
    `          if (returning) {
            const alpha = returning.fade.advance(frames.now)
            drawVictoryFade(alpha, 'out')
            globalThis.__beeWorld?.fade('battle', alpha, ctx, victoryFrame.frame)
          } else {
            const observer = globalThis.__beeWorld
            observer?.surface('battle')
            drawDialogue()
            observer?.surface(null)
          }`,
  )
  const worldFade = replaceOnce(
    rendered,
    "      drawVictoryFade(alpha, 'in')\n      const finishFrame = returning.finishFrame",
    `      drawVictoryFade(alpha, 'in')
      globalThis.__beeWorld?.fade('world', alpha, ctx)
      const finishFrame = returning.finishFrame`,
  )
  return after(
    worldFade,
    '      runWithPresentationFinalizer(render, abortScript)',
    `
      if (!hostileBusy && !battleHost.active)
        globalThis.__beeWorld?.returned(ctx, activeScene.scene.id, player.pos, menus.active)`,
  )
}

function observeEntry(source: string): string {
  const reveal = replaceOnce(
    source,
    '      if (complete) reveal.complete()',
    `      globalThis.__beeWorld?.entry(this.frame, reveal.bands, complete)
      if (complete) reveal.complete()`,
  )
  return after(
    reveal,
    '\n    ctx.putImageData(this.frame, 0, 0)',
    '    globalThis.__beeWorld?.entry(this.frame, 0, false)',
  )
}

function observeMusic(source: string): string {
  const swapped = after(
    source,
    '      sequencer.play()',
    `      globalThis.__beeWorld?.music('play', asset, ctx.state)`,
  )
  const immediate = replaceOnce(
    swapped,
    '        if (seq) seq.pause()\n        playing = undefined',
    `        if (seq) {
          seq.pause()
          if (playing) globalThis.__beeWorld?.music('stop', playing, ctx.state)
        }
        playing = undefined`,
  )
  return replaceOnce(
    immediate,
    '          seq.pause()\n          playing = undefined',
    `          seq.pause()
          globalThis.__beeWorld?.music('stop', playing, ctx.state)
          playing = undefined`,
  )
}

function observeAmbient(source: string): string {
  const actualStart = after(
    source,
    '      source.start()',
    `      const asset = beeAmbientAssets.get(onended)
      if (asset === 'sound.pal.045' && globalThis.__beeWorld?.escape)
        globalThis.__beeWorld.event('escape-sound', { track: 45, audioContextState: context.state, seconds: source.buffer.duration })
      else if (asset) globalThis.__beeWorld?.ambient(asset, context.state, source.buffer)`,
  )
  return `const beeAmbientAssets = new WeakMap();\n${replaceOnce(
    actualStart,
    '      source = this.adapter.play(buffer, ended)',
    `      if (asset === 'sound.pal.066' || asset === 'sound.pal.073' || asset === 'sound.pal.045') beeAmbientAssets.set(ended, asset)
      source = this.adapter.play(buffer, ended)`,
  )}`
}

function observeBattle(source: string): string {
  const seed = '      Math.random,'
  const seeded = replaceOnce(
    source,
    seed,
    "      globalThis.__beeWorld ? () => globalThis.__beeWorld.take('battle') : Math.random,",
  )
  const started = after(
    seeded,
    '    const { sessionAssets, sessionOptions } = prepared.commit()',
    `
    globalThis.__beeWorld?.event('prepared', {
      team, appearance: sessionAssets.playerBaseDefinitionIds,
      players: prepared.players.map(({ roleId, attackStrength, defense, magicStrength, baseDexterity,
        fleeRate, hp, maxHp, mp, maxMp, attackAll, grantedStatuses, persistentProgress }) => ({
        roleId, attackStrength, defense, magicStrength, baseDexterity, fleeRate, hp, maxHp, mp, maxMp,
        attackAll, grantedStatuses, persistentProgress,
      })),
    })`,
  )
  return after(
    started,
    '    this.ports.finishWorld(session, result)',
    `
    globalThis.__beeWorld?.event('writeback', {
      result, slots: session.enemySlotDefs().map(({ id }) => id), rewards: session.rewards(),
      party: this.ports.readWorld().party.map(({ hp, mp }) => [hp, mp]),
    })`,
  )
}

function observeCondition(source: string): string {
  const anchor = `    return evalAuthorCondition(condition, {
      world: this.world,
      currentSceneId: this.options.currentSceneId,
      query: this.options.query,
      random: this.options.random,
    })`
  return replaceOnce(
    source,
    anchor,
    `    const observer = globalThis.__beeWorld
    const observe = observer?.activeSlot() && _context.timing === 'interactive' && condition.kind === 'chance'
    let sample
    const matched = evalAuthorCondition(condition, {
      world: this.world,
      currentSceneId: this.options.currentSceneId,
      query: this.options.query,
      random: observe ? () => (sample = observer.take('drop')) : this.options.random,
    })
    if (observe) observer.event('chance', { percent: condition.percent, sample, matched })
    return matched`,
  )
}

function observeSession(source: string): string {
  const submit =
    'submit: (playerIndex, action) => this.state.pendingActions.set(playerIndex, action)'
  const committed = replaceOnce(
    source,
    submit,
    `submit: (playerIndex, action) => {
          const committed = this.state.pendingActions.set(playerIndex, action)
          globalThis.__beeWorld?.event('command', { playerIndex, turn: this.state.turn, action })
          return committed
        }`,
  )
  const acted = after(
    committed,
    '      stepBattle(s, this.rng)',
    `
      if (s.lastAction) globalThis.__beeWorld?.event('action', {
        action: s.lastAction, players: s.players.map(({ hp, mp }) => [hp, mp]),
        enemies: s.enemies.map((enemy) => enemy ? { hp: enemy.hp, id: enemy.def.id } : null),
        ...(globalThis.__beeWorld.escape && { luckWeights: s.players.map(({ hiddenCounts }) => hiddenCounts.luck ?? 0) }),
      })`,
  )
  const rendered = after(
    acted,
    '    } else renderBattleScene(ctx, scene, worldScale)',
    `    if (globalThis.__beeWorld?.escape) {
      if (sel !== undefined) globalThis.__beeWorld.escapeMenu(s.turn, sel, selection.phase)
      globalThis.__beeWorld.escapePaint(players.map(({ x, y, frame }) => ({ x, y, frame })),
        this.itemBanner && now < this.itemBanner.untilMs ? this.itemBanner.text : null)
    }`,
  )
  const floated = after(
    rendered,
    '        drawNumber(ctx, f.num, f.x, f.y - age, nums)',
    `
        globalThis.__beeWorld?.number(f, age)`,
  )
  const settled = after(
    floated,
    '      drawSettlementScreen(ctx, settlementScreen, ui, g)',
    '      globalThis.__beeWorld?.settlement(settlementScreen)',
  )
  return after(
    settled,
    `          this.selection.mainActionValidity(selectionContext),
          true,
        )`,
    `        if (selection.phase === 'menu' && this.selectionStartedForTurn === s.turn)
          globalThis.__beeWorld?.commandReady(ctx)`,
  )
}

const worldBeeTrace = {
  name: 'reforge-world-bee-trace',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  transform(source: string, id: string) {
    const path = id.split('?')[0]?.replaceAll('\\', '/')
    const targets = '/packages/reforge/src/'
    if (!path?.includes(targets)) return null
    const file = path.split(targets).at(-1)
    let code: string
    switch (file) {
      case 'main.ts':
        code = observeWorld(source)
        break
      case 'battle/battle-host.ts':
        code = observeBattle(source)
        break
      case 'battle/battle-entry-presentation.ts':
        code = observeEntry(source)
        break
      case 'audio/bgm.ts':
        code = observeMusic(source)
        break
      case 'audio/sfx.ts':
        code = observeAmbient(source)
        break
      case 'battle/battle-session.ts':
        code = observeSession(source)
        break
      case 'battle/battle-core.ts':
        code = after(
          source,
          '    const roll = Math.floor(_rng() * (def + 1))',
          `    if (globalThis.__beeWorld?.escape)
      globalThis.__beeWorld.event('escape-roll', { slot: idx, turn: s.turn, luck: p.fleeRate, resistance: def, roll, success: !s.boss && p.fleeRate >= roll })
  `,
        )
        break
      case 'battle/battle-world-result.ts': {
        const rng = '  rng: () => number = Math.random,'
        code = replaceOnce(
          source,
          rng,
          "  rng: () => number = globalThis.__beeWorld ? () => globalThis.__beeWorld.take('growth') : Math.random,",
        )
        break
      }
      case 'battle/battle-launch-preparation.ts':
        code = after(
          source,
          '    const fieldId = options?.fieldId ?? ports.readScene().battleFieldId ?? 24',
          "    globalThis.__beeWorld?.event('field', { fieldId })",
        )
        break
      case 'script-project-core.ts':
        code = observeCondition(source)
        break
      case 'dialog/dialog-box.ts':
        code = after(
          source,
          '      this.renderSlot(slotId, r, isActive, nowMs)',
          `
      if (isActive && slotId === 'narration' && r.visibleText)
        globalThis.__beeWorld?.notice(r.presentationId, r.visibleText)`,
        )
        break
      default:
        return null
    }
    return { code, map: null }
  },
}

export default { ...base, plugins: [...base.plugins, worldBeeTrace] }
