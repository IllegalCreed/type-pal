/** Installed only in Q2's fresh browser context. Native callbacks supply facts, not expectations. */
export function installGameBattleAdapter() {
  let dependencies,
    applyFixture,
    scenario,
    liveRoles,
    battle,
    action,
    terminal,
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
        }
      }),
      inventory: gs.inventory
        .filter((item) => item.count > 0)
        .map((item) => ({ itemId: String(item.itemId), count: item.count })),
      money: gs.dwCash,
    }
  }
  const describe = (nativeState, actor, nativeAction) => {
    const kind = nativeAction.type
    require(kind === 'attack' || kind === 'item', `unsupported first-batch Game action ${kind}`)
    const isEnemy = actor.isEnemy
    const toPlayer = kind === 'item' || isEnemy
    require(nativeAction.target >= 0, 'first-batch Game action needs an actual single target')
    const actorId = isEnemy
      ? enemyIdentity(actor.idx)
      : playerIdentity(nativeState.players[actor.idx].roleId)
    const targetId = toPlayer
      ? playerIdentity(nativeState.players[nativeAction.target].roleId)
      : enemyIdentity(nativeAction.target)
    return {
      // Native createBattleState initializes turn=0; the common Q2 contract starts at 1.
      turn: nativeState.turn + 1,
      actorId,
      kind,
      targetId,
      ...(kind === 'item' ? { itemId: String(nativeAction.actionId) } : {}),
    }
  }

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
  globalThis.__battleGameCommand = (state, slot) =>
    observe(() => {
      if (!scenario || state !== battle) return
      const actual = state.pendingActions.get(slot)
      require(actual, 'native Game command commit did not retain an action')
      const command = describe(state, { isEnemy: false, idx: slot }, actual)
      commands.push(structuredClone(command))
      evidence().command({ ...command, source: 'game:pendingActions.set' })
    })
  globalThis.__battleGameActionStart = (state, gs, actor, nativeAction, roles) =>
    observe(() => {
      if (!scenario || state !== battle || gs !== dependencies.gs) return
      require(!action, 'Game action started before the previous native action completed')
      liveRoles = roles
      action = { ...describe(state, actor, nativeAction), before: snapshot() }
    })
  globalThis.__battleGameActionComplete = (state, gs, roles) =>
    observe(() => {
      if (!scenario || state !== battle || gs !== dependencies.gs || !action) return
      liveRoles = roles
      evidence().action({
        ...action,
        after: snapshot(),
        source: 'game:tickPerformAction:index-advanced',
      })
      action = undefined
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
      require(result === 'won', `first-batch Game battle ended with ${result}`)
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
