/** Stable Editor entry point for authoring commands. Implementations own their domain rules and undo state. */

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
export type { AmbiencePatch } from './ambience-commands.js'
export {
  AddAmbienceCommand,
  AmbienceInUseError,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from './ambience-commands.js'
export { DeleteAssetCommand, UpsertAssetCommand } from './asset-commands.js'
export { UpdateAssetLabelCommand } from './asset-label-command.js'
export { BattleDataInUseError } from './battle-data-command-errors.js'
export type { BattleFieldPatch } from './battle-field-commands.js'
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
export { AssetInUseError } from './command-asset-record.js'
export type { Command } from './command-contract.js'
export { CompositeCommand } from './composite-command.js'
export type { EnemyPatch } from './enemy-commands.js'
export { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'
export {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
} from './enemy-team-commands.js'
export {
  AddEntityCommand,
  DeleteEntityCommand,
  type EntityPatch,
  MoveEntityCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
} from './entity-commands.js'
export {
  AddItemCommand,
  DeleteItemCommand,
  ItemInUseError,
  UpdateItemCommand,
} from './item-commands.js'
export { UpdateLevelUpCommand } from './level-up-commands.js'
export { UpdateLocaleCommand } from './locale-commands.js'
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
export type { PoisonPatch } from './poison-commands.js'
export {
  AddPoisonCommand,
  DeletePoisonCommand,
  UpdatePoisonCommand,
} from './poison-commands.js'
export { SetHostileVictoryTransitionCommand } from './project-battle-settings-command.js'
export { RenameProjectCommand } from './project-name-command.js'
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
  SetStartupEntriesCommand,
  type StartupEntryConfig,
  UpdateManifestAssetRolesCommand,
} from './startup-commands.js'
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
