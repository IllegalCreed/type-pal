/**
 * Command 接口 + 布置命令集(D-B0 地基 + D-B1 布置模式命令)。
 *
 * 所有编辑 = Command:apply 产新态(不可变)、invert 把「apply 后的态」还原回 apply 前。
 * EditSession 用 apply/invert 驱动 undo/redo。B1 布置模式发本文件的命令集。
 *
 * 不可变铁律:命令不得原地 mutate 传入 state(展开/map 构造新对象);测钉「源不变」。
 * 旧值/旧索引在**首次 apply 时捕获**(apply 时的 state 即初始态),供 invert 还原。
 *
 * 见 docs/phase2/archive/designs/editor-design.md §4。
 */

export {
  ActorInUseError,
  type ActorPatch,
  AddActorCommand,
  CopyActorCommand,
  DeleteActorCommand,
  DetachActorEntityCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
} from './actor-commands.js'
export { BattleDataInUseError } from './battle-data-command-errors.js'
export { AssetInUseError } from './command-asset-record.js'
export type { Command } from './command-contract.js'
export { CompositeCommand } from './composite-command.js'
export {
  AddEntityCommand,
  DeleteEntityCommand,
  type EntityPatch,
  MoveEntityCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
} from './entity-commands.js'
export {
  BindSceneMapCommand,
  CreateMapAssetCommand,
  CreateProjectMapCommand,
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  MapAssetInUseError,
  RenameMapAssetCommand,
} from './map-asset-commands.js'
export {
  AddProjectMapLayerCommand,
  ApplyProjectMapPatchCommand,
  MoveProjectMapLayerCommand,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveProjectMapLayerCommand,
  ResizeProjectMapCommand,
  UpdateProjectMapLayerCommand,
} from './map-edit-commands.js'
export {
  AddSceneCommand,
  DeleteSceneCommand,
  DeleteSceneEntryCommand,
  DuplicateSceneCommand,
  SceneEntryInUseError,
  SceneInUseError,
  type ScenePatch,
  UpdateSceneCommand,
  UpdateSceneNameCommand,
  UpsertSceneEntryCommand,
} from './scene-commands.js'
export {
  AddSpriteCommand,
  AddSpriteDefinitionCommand,
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  ReplaceSpriteAssetCommand,
  SpriteInUseError,
  type SpriteLayoutEditProof,
  type SpritePatch,
  type SpriteReplacementProof,
  UpdateSpriteCommand,
} from './sprite-commands.js'
export {
  AddTilesetCommand,
  RemoveTilesetCommand,
  ReplaceTilesetAssetCommand,
  UpdateTilesetMetadataCommand,
} from './tileset-commands.js'
export {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from './world-variable-commands.js'

// ════════════════════════════════════════════════════════════════════
// B1 布置模式命令集(Add/Delete/Update 实体 · Update 场景)
// 契约签名钉死(见 editor-b1-logic-plan「契约」),Claude 照此搭 UI。
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// C1 数据模式/角色模式命令集(改精灵布局·姿势 / 角色属性)
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// M4c-3 敌人工作台命令(敌人库 增/删/改 + 敌队整表)
// ════════════════════════════════════════════════════════════════════

export type { AmbiencePatch } from './ambience-commands.js'
export {
  AddAmbienceCommand,
  AmbienceInUseError,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from './ambience-commands.js'
export { DeleteAssetCommand, UpsertAssetCommand } from './asset-commands.js'
export { UpdateAssetLabelCommand } from './asset-label-command.js'
export type { BattleFieldPatch } from './battle-field-commands.js'
// 战场命令族(四命令 + 表快照/id 分配 helper + BattleFieldInUseError)已整体拆分至
// battle-field-commands.ts(ARCH-F2 模块归属治理,行为不变)。公开出口维持本文件路径不变;
// 本文件对它为运行期 re-export,它对 Command 仅 type import —— 运行期无环。
export {
  AddBattleFieldCommand,
  BATTLE_FIELDS_PATH,
  BattleFieldInUseError,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from './battle-field-commands.js'
export {
  AddBattleSpriteCommand,
  type BattleSpriteEditProof,
  type BattleSpritePatch,
  type BattleSpriteReplacementProof,
  DeleteUnusedBattleSpriteAssetCommand,
  RemoveBattleSpriteDefinitionCommand,
  ReplaceBattleSpriteAssetCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
} from './battle-sprite-commands.js'
export type { EnemyPatch } from './enemy-commands.js'
export { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'
export {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
  UpdateEnemyTeamsCommand,
} from './enemy-team-commands.js'
export {
  AddItemCommand,
  DeleteItemCommand,
  ItemInUseError,
  UpdateItemCommand,
} from './item-commands.js'
export { UpdateLevelUpCommand } from './level-up-commands.js'
export { UpdateLocaleCommand } from './locale-commands.js'
export type { PoisonPatch } from './poison-commands.js'
export {
  AddPoisonCommand,
  DeletePoisonCommand,
  UpdatePoisonCommand,
} from './poison-commands.js'
export { RenameProjectCommand } from './project-name-command.js'
export {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  nextShopId,
  ShopInUseError,
  UpdateShopCommand,
} from './shop-commands.js'
export type { SkillPatch } from './skill-commands.js'
export { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './skill-commands.js'
export {
  SetStartupEntriesCommand,
  type StartupEntryConfig,
  UpdateManifestAssetRolesCommand,
} from './startup-commands.js'

// ════════════════════════════════════════════════════════════════════
// A7 资源注册表命令(音乐首切片)
// ════════════════════════════════════════════════════════════════════
