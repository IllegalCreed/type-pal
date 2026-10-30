/** Numeric growth snapshots shared by calculation and settlement; names are attached by settlement. */
/** 单属性 old(升级前)→ cur(升级后)对。 */
export interface SettlementPair {
  old: number
  cur: number
}

/** HP / MP:cur"/"max,old + 升级后两组。 */
export interface SettlementHPMP {
  old: number
  oldMax: number
  cur: number
  curMax: number
}

/** Phase B 主升级屏数据(单个升级队员)。stat 用 PAL_GetPlayerXxx 有效值(含装备加成)。 */
export interface LevelUpScreenData {
  roleId: number
  /** 角色名渲染串(present 无 PAL_GetWord;直接存 role._name)。 */
  name: string
  level: SettlementPair
  hp: SettlementHPMP
  mp: SettlementHPMP
  attack: SettlementPair
  magic: SettlementPair
  defense: SettlementPair
  dexterity: SettlementPair
  flee: SettlementPair
}
