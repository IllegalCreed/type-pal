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
          statuses: inBattle ? activeStatuses(player.status) : persistentStatuses(roleId),
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
    const kind = nativeAction.type === 'magic' ? 'cast' : nativeAction.type
    const supported = ['attack', 'item', 'defend', 'cast', 'pass'].includes(kind)
    require(supported, `unsupported Game action ${kind}`)
    const isEnemy = actor.isEnemy
    const toPlayer = nativeAction.targetSide === 'player' || kind === 'item' || isEnemy
    const targeted = kind !== 'defend' && kind !== 'pass'
    require(!targeted || nativeAction.target >= 0, 'Game action needs an actual single target')
    const actorId = isEnemy
      ? enemyIdentity(actor.idx)
      : playerIdentity(nativeState.players[actor.idx].roleId)
    let targetId = null
    if (targeted)
      targetId = toPlayer
        ? playerIdentity(nativeState.players[nativeAction.target].roleId)
        : enemyIdentity(nativeAction.target)
    return {
      // Native createBattleState initializes turn=0; the common Q2 contract starts at 1.
      turn: nativeState.turn + 1,
      actorId,
      ...(isEnemy ? { actorSide: 'enemy' } : {}),
      kind,
      targetId,
      ...(kind === 'item' ? { itemId: String(nativeAction.actionId) } : {}),
      ...(kind === 'cast' ? { skillId: String(nativeAction.actionId) } : {}),
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
  globalThis.__battleGameFrame = (state) =>
    observe(() => {
      if (!scenario || state !== battle || terminal) return
      evidence().beginFrame('game:BattlePresent.draw', {
        clockMs: performance.now(),
        phase: state.phase,
        turn: state.turn + 1,
        selecting: state.phase === 'selectAction' && state.selectingPlayerIdx !== undefined,
        animation:
          state.battleAnim && action
            ? { actorId: action.actorId, kind: action.kind, targetId: action.targetId }
            : null,
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
  globalThis.__battleGameTargetCancel = (state, draft) =>
    observe(() => {
      if (!scenario || state !== battle || draft.type !== 'magic') return
      const slot = state.selectingPlayerIdx
      require(slot !== undefined, 'target cancel lost its caster')
      targetCancels++
      evidence().presentation({
        kind: 'target-cancel',
        source: 'game:handlePlayerTargetSelect:discard-draft',
        payload: {
          turn: state.turn + 1,
          actorId: playerIdentity(state.players[slot].roleId),
          targetId: playerIdentity(state.players[state.uiCursor].roleId),
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
      const inaction = nativeAction.type === 'pass'
      if (inaction) {
        const player = actor.isEnemy ? undefined : state.players[actor.idx]
        const alive = player && liveRoles.roles[player.roleId]?.hp > 0
        const disabled = player && (player.status.sleep > 0 || player.status.paralyzed > 0)
        require(alive && disabled, 'Q2 Game pass requires a live incapacitated player')
      }
      action = {
        ...describe(state, actor, nativeAction),
        before: snapshot(),
        native: {
          actor: structuredClone(actor),
          command: structuredClone(nativeAction),
          animationEffects: [],
          ...(inaction ? { inaction: 'incapacitated' } : {}),
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
        before: start.before,
        after: snapshot(),
        native: {
          poisonsBefore: start.poisonsBefore,
          poisonsAfter: roundPoisonSlots(state, gs),
        },
        source: 'game:tickPostAction:turn-advanced',
      })
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
        canConfirmSettlement: Boolean(screen && state.settlement.shownMs >= 40 && !busy),
        settlement: screen ? { index: state.settlement.index, kind: screen.kind } : null,
        snapshot: battle ? snapshot() : null,
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
