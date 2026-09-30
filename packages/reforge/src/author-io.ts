/** Headless author IO boundary. No game shell, renderer host, or bundled engine chrome. */
export { parseSpriteChunkStrict } from '@type-pal/shared'
export {
  decodeBattleSpriteAssetBytes,
  decodeWorldSpriteAssetBytes,
  decompressGzip,
} from './assets.js'
export {
  type BattleTrialConfig,
  parseBattleTrialConfig,
  parseTrialBag,
  parseTrialEnemies,
  parseTrialParty,
  type TrialBag,
  type TrialEnemies,
  type TrialParty,
  trialArray,
  trialId,
  trialObject,
} from './battle-trial-config.js'
export type { FileSource } from './file-source.js'
export { fsaSource } from './fsa-source.js'
export {
  type LoadedCurrentProjectCore,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMapById,
  loadStampTemplates,
} from './project-loader.js'
export {
  assertProjectSaveReadable,
  PROJECT_SAVE_RECOVERY_PATH,
  PROJECT_SAVE_STATE_PATH,
  type ProjectSaveState,
  parseProjectSaveState,
  projectSaveStateToken,
  readProjectSaveState,
  withStableProjectRead,
} from './project-save-state.js'
export {
  isRuntimeItemPrivateScriptRef,
  isRuntimeScriptRef,
  projectItemsView,
} from './runtime-project-view.js'
