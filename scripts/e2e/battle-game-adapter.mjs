/** Installed only in Q2's fresh browser context. Native callbacks supply facts, not expectations. */
export function installGameBattleAdapter() {
  let dependencies,
    applyFixture,
    scenario,
    liveRoles,
    battle,
    action,
    terminal,
    targetCancels = 0,
    settlementCount = 0
  const commands = [],
    errors = []
  const require = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const observe = (body) => {
    try {
      return body()
    } catch (error) {
      errors.push(String(error))
      globalThis.__battleEvidence?.fail(error)
    }
  }
  const evidence = () => {
    require(globalThis.__battleEvidence, 'Game battle collector is not installed')
    return globalThis.__battleEvidence
  }
  const playerIdentity = (roleId) => {
    const member = scenario.party.find((entry) => entry.gameRole === roleId)
    require(member, `unbound native Game role ${roleId}`)
    return member.id
  }
  const enemyIdentity = (slot) => {
    const enemy = scenario.enemies.find((entry) => entry.slot === slot)
    require(enemy, `unbound native Game enemy slot ${slot}`)
    return enemy.id
  }
  const activeStatuses = (values) =>
    Object.fromEntries(Object.entries(values ?? {}).filter(([, value]) => value > 0))
  const playerStatuses = (values) =>
    Object.fromEntries(
      Object.entries(activeStatuses(values)).map(([name, rounds]) => [
        name,
        // CLASSIC stores equipment grants above 999 in the finite status array.
        rounds > 999 ? 32760 : rounds,
      ]),
    )
  const persistentStatuses = (roleId) =>
    Object.fromEntries(
      // Native rgPlayerStatus uses the CLASSIC global.h order; battle cleanup has already run.
      [
        'confused',
        'paralyzed',
        'sleep',
        'silence',
        'puppet',
        'bravery',
        'protect',
        'haste',
        'dualAttack',
      ]
        .map((name, index) => [name, dependencies.gs.rgPlayerStatus[roleId]?.[index] ?? 0])
        .filter(([, value]) => value > 0),
    )
  const playerPoisonSlots = (gs, partySlot) => {
    const entries = []
    for (let poisonSlot = 0; poisonSlot < 16; poisonSlot++) {
      const native = gs.rgPoisonStatus[`${poisonSlot}_${partySlot}`]
      if (native?.wPoisonID > 0) {
        entries.push({
          partySlot,
          poisonSlot,
          poisonId: native.wPoisonID,
          scriptEntry: native.wPoisonScript,
        })
      }
    }
    return entries
  }
  const poisonIds = (entries) => {
    const poisons = entries.map(({ poisonId }) => poisonId).filter((id) => id > 0)
    return poisons.length ? { poisons: poisons.sort((a, b) => a - b) } : {}
  }
  const roundPoisonSlots = (state, gs) =>
    state.players.flatMap((_, partySlot) => playerPoisonSlots(gs, partySlot))
  const snapshot = () => {
    require(scenario && dependencies && battle, 'Game battle has not started')
    const gs = dependencies.gs
    const inBattle = gs.battleState === battle
    return {
      players: battle.players.map((player, slot) => {
        const roleId = player.roleId
        const role = liveRoles?.roles[roleId]
        const runtime = gs.PlayerRolesRuntime
        require(role, `native live battle role ${roleId} is absent`)
        return {
          id: playerIdentity(roleId),
          slot,
          hp: inBattle ? role.hp : runtime.rgwHP[roleId],
          maxHP: inBattle ? role.maxHP : runtime.rgwMaxHP[roleId],
          mp: inBattle ? role.mp : runtime.rgwMP[roleId],
          maxMP: inBattle ? role.maxMP : runtime.rgwMaxMP[roleId],
          level: inBattle ? role.level : runtime.rgwLevel[roleId],
          exp: gs.Exp.rgPrimaryExp[roleId].wExp,
          statuses: playerStatuses(inBattle ? player.status : persistentStatuses(roleId)),
          ...poisonIds(playerPoisonSlots(gs, slot)),
        }
      }),
      enemies: Array.from({ length: 5 }, (_, slot) => {
        const enemy = battle.enemies[slot]
        if (!enemy || enemy.objectId === 0) return null
        return {
          id: enemyIdentity(slot),
          slot,
          templateId: `enemy-${enemy.objectId}`,
          hp: enemy.e.health,
          maxHP: enemy.maxHealth,
          alive: !enemy.defeated && enemy.e.health > 0,
          statuses: activeStatuses(enemy.status),
          ...poisonIds(enemy.poisons ?? []),
        }
      }),
      inventory: gs.inventory
        .filter((item) => item.count > 0)
        .map((item) => ({ itemId: String(item.itemId), count: item.count })),
      money: gs.dwCash,
    }
  }
  const describe = (nativeState, actor, nativeAction) => {
    const renamed = { magic: 'cast', 'coop-magic': 'coop', 'throw-item': 'throw' }
    const kind = renamed[nativeAction.type] ?? nativeAction.type
    const supported = ['attack', 'item', 'defend', 'cast', 'coop', 'throw', 'pass'].includes(kind)
    require(supported, `unsupported Game action ${kind}`)
    const isEnemy = actor.isEnemy
    const side = nativeAction.targetSide ?? (kind === 'item' || isEnemy ? 'player' : 'enemy')
    const targeted = kind !== 'defend' && kind !== 'pass'
    require(!targeted ||
      (Number.isInteger(nativeAction.target) &&
        nativeAction.target >= -1), 'Game action needs an actual target')
    const actorId = isEnemy
      ? enemyIdentity(actor.idx)
      : playerIdentity(nativeState.players[actor.idx].roleId)
    const all = targeted && nativeAction.target === -1
    let targetId = null
    if (targeted && !all)
      targetId =
        side === 'player'
          ? playerIdentity(nativeState.players[nativeAction.target].roleId)
          : enemyIdentity(nativeAction.target)
    const usesItem = kind === 'item' || kind === 'throw'
    const usesSkill = kind === 'cast' || kind === 'coop'
    require(!usesItem || nativeAction.actionId > 0, `Game ${kind} lacks its native item ID`)
    require(!usesSkill || nativeAction.actionId > 0, `Game ${kind} lacks its native skill ID`)
    return {
      // Native createBattleState initializes turn=0; the common Q2 contract starts at 1.
      turn: nativeState.turn + 1,
      actorId,
      ...(isEnemy ? { actorSide: 'enemy' } : {}),
      kind,
      targetId,
      ...(all ? { targetSide: side } : {}),
      ...(usesItem ? { itemId: String(nativeAction.actionId) } : {}),
      ...(usesSkill ? { skillId: String(nativeAction.actionId) } : {}),
    }
  }
  const guardedSlot = (actor, nativeAction) => (actor.isEnemy ? nativeAction.target : actor.idx)
  const hiddenCounts = (gs, roleId) => ({
    attack: gs.Exp.rgAttackExp[roleId].wCount,
    maxHP: gs.Exp.rgHealthExp[roleId].wCount,
    maxMP: gs.Exp.rgMagicExp[roleId].wCount,
    magicAttack: gs.Exp.rgMagicPowerExp[roleId].wCount,
    defense: gs.Exp.rgDefenseExp[roleId].wCount,
  })

  globalThis.__battleGameRegister = (deps, launch) => {
    require(!dependencies, 'Game battle dependencies were registered twice')
    dependencies = deps
    applyFixture = launch
  }
  globalThis.__battleGameStarted = (gs, roles) =>
    observe(() => {
      if (!scenario || gs !== dependencies.gs || !gs.battleState) return
      require(!battle, 'Game battle started twice in one Q2 context')
      battle = gs.battleState
      liveRoles = roles
      require(battle.fAutoBattle === false &&
        !battle.fAutoAttack, 'Q2 requires normal manual battle')
      evidence().start(snapshot(), 'game:startBattle')
    })
  globalThis.__battleGameTick = (gs, state, roles) =>
    observe(() => {
      if (!scenario || gs !== dependencies.gs || state !== battle) return
      if (roles) liveRoles = roles
    })
  globalThis.__battleGameFrame = (state, gs) =>
    observe(() => {
      if (!scenario || state !== battle || terminal) return
      evidence().beginFrame('game:BattlePresent.draw', {
        clockMs: performance.now(),
        phase: state.phase,
        turn: state.turn + 1,
        selecting:
          state.phase === 'selectAction' &&
          state.selectingPlayerIdx !== undefined &&
          !gs.dialogBox &&
          !gs.dialogBoxKept &&
          !state.battleDialogQueue?.length,
        animation:
          state.battleAnim && action
            ? { actorId: action.actorId, kind: action.kind, targetId: action.targetId }
            : null,
      })
    })
  globalThis.__battleGameDialogueConfirm = (state, box, before, result) =>
    observe(() => {
      if (!scenario || state !== battle || terminal) return
      evidence().presentation({
        kind: 'battle-dialogue-confirm',
        source: 'game:advanceBattleDialog:confirmDialog',
        payload: { turn: state.turn + 1, slot: box.style, before, after: box.phase, result },
      })
    })
  globalThis.__battleGameCasualtyEffect = (state, roles, slot, before) =>
    observe(() => {
      if (!scenario || state !== battle || terminal) return
      const roleId = state.players[slot].roleId
      const role = roles.roles[roleId]
      const current = { hp: role.hp, attack: role.attackStrength }
      if (!before) return current
      evidence().presentation({
        kind: 'battle-casualty-effect',
        source: 'game:tickActionFollowup:friend-death-effects',
        payload: { turn: state.turn + 1, targetId: playerIdentity(roleId), before, after: current },
      })
    })
  globalThis.__battleGameCommand = (state, slot) =>
    observe(() => {
      if (!scenario || state !== battle) return
      const actual = state.pendingActions.get(slot)
      require(actual, 'native Game command commit did not retain an action')
      const command = describe(state, { isEnemy: false, idx: slot }, actual)
      commands.push(structuredClone(command))
      evidence().command({ ...command, source: 'game:pendingActions.set' })
    })
  globalThis.__battleGameTargetCancel = (state, draft, side = 'player') =>
    observe(() => {
      if (!scenario || state !== battle || draft?.type !== 'magic') return
      const slot = state.selectingPlayerIdx
      require(slot !== undefined, 'target cancel lost its caster')
      const targetId =
        side === 'enemy'
          ? enemyIdentity(state.uiCursor)
          : playerIdentity(state.players[state.uiCursor].roleId)
      targetCancels++
      evidence().presentation({
        kind: 'target-cancel',
        source:
          side === 'enemy'
            ? 'game:handleEnemyTargetSelect:discard-draft'
            : 'game:handlePlayerTargetSelect:discard-draft',
        payload: {
          turn: state.turn + 1,
          actorId: playerIdentity(state.players[slot].roleId),
          targetId,
          skillId: String(draft.actionId),
          commandCount: commands.length,
          pending: state.pendingActions.has(slot),
          state: snapshot(),
        },
      })
    })
  globalThis.__battleGameActionStart = (state, gs, actor, nativeAction, roles) =>
    observe(() => {
      if (!scenario || state !== battle || gs !== dependencies.gs) return
      require(!action, 'Game action started before the previous native action completed')
      liveRoles = roles
      let inaction
      if (nativeAction.type === 'pass') {
        const unit = (actor.isEnemy ? state.enemies : state.players)[actor.idx]
        const hp = actor.isEnemy ? unit.e.health : liveRoles.roles[unit.roleId]?.hp
        const disabled = unit.status.sleep > 0 || unit.status.paralyzed > 0
        const cooperative = !actor.isEnemy && state.fThisTurnCoop
        require(hp > 0 && (disabled || cooperative), 'Q2 Game pass lacks a native reason')
        inaction = disabled ? 'incapacitated' : 'cooperative-action'
      }
      action = {
        ...describe(state, actor, nativeAction),
        before: snapshot(),
        native: {
          actor: structuredClone(actor),
          command: structuredClone(nativeAction),
          animationEffects: [],
          ...(inaction ? { inaction } : {}),
          ...(actor.isEnemy
            ? {}
            : { growthBefore: hiddenCounts(gs, state.players[actor.idx].roleId) }),
        },
        guard: { before: state.players[guardedSlot(actor, nativeAction)]?.defending ?? false },
      }
    })
  globalThis.__battleGameActionProduced = (state) =>
    observe(() => {
      if (!scenario || state !== battle || !action) return
      if (action.kind === 'throw' && state.battleAnim?.pendingDamageNums?.length)
        action.native.pendingDamageNums = structuredClone(state.battleAnim.pendingDamageNums)
      action.native.animationEffects = (state.battleAnim?.frames ?? []).flatMap((frame, index) => {
        const { damageNum, damageNums, sound } = frame
        return damageNum || damageNums || sound !== undefined
          ? [
              {
                frame: index,
                ...(damageNum ? { damageNum: structuredClone(damageNum) } : {}),
                ...(damageNums ? { damageNums: structuredClone(damageNums) } : {}),
                ...(sound !== undefined ? { sound } : {}),
              },
            ]
          : []
      })
    })
  globalThis.__battleGameActionComplete = (state, gs, roles) =>
    observe(() => {
      if (!scenario || state !== battle || gs !== dependencies.gs || !action) return
      liveRoles = roles
      const actor = action.native.actor
      if (!actor.isEnemy)
        action.native.growthAfter = hiddenCounts(gs, state.players[actor.idx].roleId)
      evidence().action({
        ...action,
        guard: {
          ...action.guard,
          after:
            state.players[guardedSlot(action.native.actor, action.native.command)]?.defending ??
            false,
        },
        // Omit native optional undefined properties using their actual JSON representation.
        native: JSON.parse(JSON.stringify(action.native)),
        after: snapshot(),
        source: 'game:tickPerformAction:index-advanced',
      })
      action = undefined
    })
  globalThis.__battleGameRoundStart = (state, gs, roles) =>
    observe(() => {
      if (!scenario || state !== battle || gs !== dependencies.gs) return
      require(!action, 'Game postAction began before the native action completed')
      liveRoles = roles
      return {
        turn: state.turn,
        before: snapshot(),
        poisonsBefore: roundPoisonSlots(state, gs),
      }
    })
  globalThis.__battleGameRoundEnd = (state, gs, roles, start) =>
    observe(() => {
      if (!start) return
      require(state.turn === start.turn + 1, 'Game postAction did not advance exactly one round')
      liveRoles = roles
      evidence().round({
        turn: start.turn + 1,
        clockMs: performance.now(),
        before: start.before,
        after: snapshot(),
        native: {
          poisonsBefore: start.poisonsBefore,
          poisonsAfter: roundPoisonSlots(state, gs),
        },
        source: 'game:tickPostAction:turn-advanced',
      })
    })
  const sfxAssetId = (soundId) => `sound.pal.${String(soundId).padStart(3, '0')}`
  globalThis.__battleGameAudioDecoded = (soundId, buffer, responseUrl) =>
    observe(() => {
      const port = globalThis.__battleEvidence
      if (!port?.audioDecoded) return
      const url = new URL(responseUrl)
      require(url.origin === globalThis.location.origin, 'Game battle SFX response left its origin')
      port.audioDecoded(
        sfxAssetId(soundId),
        buffer,
        url.pathname,
        'game:AudioManager.loadSfx:decodeAudioData',
      )
    })
  globalThis.__battleGameAudioRequested = (soundId) =>
    observe(() =>
      globalThis.__battleEvidence?.audioRequested?.(
        sfxAssetId(soundId),
        'game:AudioManager.playSfx',
      ),
    )
  globalThis.__battleGameAudioStarted = (cueId, soundId, buffer, context) =>
    observe(() => {
      if (cueId === undefined) return
      globalThis.__battleEvidence?.audioStarted?.(
        cueId,
        sfxAssetId(soundId),
        buffer,
        context,
        'game:AudioManager.play:AudioBufferSourceNode.start',
      )
    })
  globalThis.__battleGameRandom = (seed, state, value) =>
    observe(() => {
      if (!scenario || seed !== scenario.seed || terminal) return
      evidence().random(value, `game:mulberry32:${state}`)
    })
  globalThis.__battleGameSettlement = (gs, state) =>
    observe(() => {
      if (!scenario || gs !== dependencies.gs || state !== battle) return
      settlementCount++
    })
  globalThis.__battleGameTerminal = (gs, result) =>
    observe(() => {
      if (!scenario || gs !== dependencies.gs) return
      require(!terminal, 'Game terminal cleanup ran twice')
      require(!action, 'Game terminated before a native action completed')
      require(result === 'won', `Q2 Game battle ended with ${result}`)
      terminal = { result: 'victory', settlementCount, after: snapshot() }
      evidence().terminal({ ...terminal, source: 'game:finalizeBattleCleanup' })
    })
  globalThis.__battleHarness = {
    engine: 'game',
    launch(input) {
      require(!scenario, 'one Game Q2 scenario per fresh browser context')
      require(dependencies && globalThis.__tpgs === dependencies.gs, 'Game bootstrap is not ready')
      require(dependencies.gs.mode === 'explore', 'Game fixture launch requires an idle world')
      require(!dependencies.gs.sceneLoading && !dependencies.gs.suspendRaf, 'Game world is busy')
      require(!dependencies.gs.fAutoBattle, 'Game has a pre-existing automatic battle request')
      require(typeof applyFixture === 'function', 'Game public fixture entry is absent')
      scenario = structuredClone({
        id: input.id,
        seed: input.seed,
        party: input.party,
        enemies: input.enemies,
        game: input.game,
      })
      require(Number.isSafeInteger(
        scenario.seed,
      ), 'Game fixture needs a deterministic integer seed')
      require(JSON.stringify(scenario.game.fixture.partyMembers) ===
        JSON.stringify(
          scenario.party.map((member) => member.gameRole),
        ), 'Game party binding differs from the actual fixture roster')
      applyFixture(dependencies, scenario.game.fixture, scenario.seed)
      require(battle && errors.length === 0, `Game fixture did not start: ${errors.join('; ')}`)
      return this.read()
    },
    read() {
      const gs = dependencies?.gs
      const state = gs?.battleState
      const screen = state?.settlement?.screens[state.settlement.index]
      const nativeEquipmentStatuses =
        state === battle &&
        battle?.players.flatMap(({ roleId, status }) =>
          Object.entries(status)
            .filter(([, rounds]) => rounds > 999)
            .map(([name, rounds]) => ({
              playerId: playerIdentity(roleId),
              name,
              rounds,
              source: 'game:BattlePlayer.status',
            })),
        )
      const busy = Boolean(
        gs?.dialogBox ||
          gs?.paletteFadeState ||
          state?.battleFade ||
          state?.battleAnim ||
          state?.roundEndDelayTicks ||
          state?.battleDialogQueue?.length ||
          state?.enemyEscapeAnim ||
          state?.fleeAnim,
      )
      return structuredClone({
        engine: 'game',
        ready: Boolean(
          gs &&
            globalThis.__tpgs === gs &&
            gs.mode === 'explore' &&
            !gs.sceneLoading &&
            !gs.suspendRaf,
        ),
        launched: Boolean(scenario),
        mode: gs?.mode ?? null,
        phase: state?.phase ?? null,
        nativeTurn: state?.turn ?? null,
        turn: state ? state.turn + 1 : null,
        busy,
        uiState: state?.uiState ?? null,
        menuState: state?.menuState ?? null,
        selectedAction: state?.selectedAction ?? null,
        uiCursor: state?.uiCursor ?? null,
        selectingPlayerId:
          scenario && state?.selectingPlayerIdx !== undefined
            ? playerIdentity(state.players[state.selectingPlayerIdx].roleId)
            : null,
        itemMenu: state?.itemSelect
          ? {
              cursor: state.itemSelect.cursor,
              items: state.itemSelect.items.map((item) => ({
                itemId: String(item.id),
                disabled: Boolean(item.disabled),
              })),
            }
          : null,
        skillMenu: state?.magicSelect
          ? {
              cursor: state.magicSelect.cursor,
              items: state.magicSelect.items.map((item) => ({
                skillId: String(item.id),
                disabled: Boolean(item.disabled),
              })),
            }
          : null,
        targetCancels,
        canConfirmDialogue:
          !!state && ['waiting-page-key', 'waiting-end-key'].includes(gs?.dialogBox?.phase),
        canConfirmSettlement: Boolean(screen && state.settlement.shownMs >= 40 && !busy),
        settlement: screen ? { index: state.settlement.index, kind: screen.kind } : null,
        snapshot: battle ? snapshot() : null,
        ...(nativeEquipmentStatuses?.length ? { nativeEquipmentStatuses } : {}),
        nativePlayers: battle
          ? battle.players.map((player, slot) => {
              const role = liveRoles.roles[player.roleId]
              return {
                id: playerIdentity(player.roleId),
                slot,
                gameRole: player.roleId,
                equipment: role.equipment,
                attackStrength: role.attackStrength,
                defense: role.defense,
                magicStrength: role.magicStrength,
                dexterity: role.dexterity,
                fleeRate: role.fleeRate,
                attackAll: role.attackAll,
              }
            })
          : [],
        commands,
        terminal: terminal ?? null,
        errors,
      })
    },
  }
}
