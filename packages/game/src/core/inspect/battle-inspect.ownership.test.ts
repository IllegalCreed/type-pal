import { describe, expect, it } from 'vitest'
import {
  inspectionNames,
  inspectionPoisons,
  makeInspectionRoles,
  makeInspectionState,
  makeSingleEnemyBattle,
  POISON_ID,
} from './__tests__/readout-fixture.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from './battle-inspect.js'

describe('Readout input ownership', () => {
  it('输入深保真：三收集器调用前后实际消费的 gs 子树/roles/poisons/items 逐字段不变', () => {
    const battle = makeSingleEnemyBattle(
      { stealItem: POISON_ID, stealItemCount: 2 },
      { status: { confused: 2 }, poisons: [{ poisonId: POISON_ID, scriptEntry: 9 }] },
    )
    const gs = makeInspectionState(battle)
    gs.rgPlayerStatus[0]![2] = 5
    gs.rgPoisonStatus['0_0'] = { wPoisonID: POISON_ID, wPoisonScript: 4242 }
    const gsRoles = makeInspectionRoles()
    const snapshot = {
      partyMembers: structuredClone(gs.partyMembers),
      runtime: structuredClone(gs.PlayerRolesRuntime),
      exp: structuredClone(gs.Exp),
      playerStatus: structuredClone(gs.rgPlayerStatus),
      poisonStatus: structuredClone(gs.rgPoisonStatus),
      battlePlayers: structuredClone(gs.battleState?.players),
      battleEnemies: structuredClone(gs.battleState?.enemies),
      battleField: structuredClone(gs.battleState?.field),
      roles: structuredClone(gsRoles),
      poisons: structuredClone(inspectionPoisons),
      items: structuredClone(inspectionNames),
    }
    collectPartyStatusReadouts(gs, gsRoles, inspectionPoisons, inspectionNames, [])
    collectEnemyStatusReadouts(gs, inspectionPoisons, inspectionNames)
    collectFieldInfoReadout(gs)
    expect(gs.partyMembers).toEqual(snapshot.partyMembers)
    expect(gs.PlayerRolesRuntime).toEqual(snapshot.runtime)
    expect(gs.Exp).toEqual(snapshot.exp)
    expect(gs.rgPlayerStatus).toEqual(snapshot.playerStatus)
    expect(gs.rgPoisonStatus).toEqual(snapshot.poisonStatus)
    expect(gs.battleState?.players).toEqual(snapshot.battlePlayers)
    expect(gs.battleState?.enemies).toEqual(snapshot.battleEnemies)
    expect(gs.battleState?.field).toEqual(snapshot.battleField)
    expect(gsRoles).toEqual(snapshot.roles)
    expect(inspectionPoisons).toEqual(snapshot.poisons)
    expect(inspectionNames).toEqual(snapshot.items)
  })
})
