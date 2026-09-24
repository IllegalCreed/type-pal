import {
  type ActorDef,
  type AssetId,
  emptyWorldScriptState,
  type Facing,
  type ProjectedWorldScriptState,
  type RuntimeSceneDef,
  type RuntimeScriptBinding,
  resolveEntitySpriteId,
  type SceneDef,
  type SceneEntryPresentation,
  type SceneSpawn,
  type ScriptStage,
  type SpriteDef,
  stageIndexFor,
  type WorldScriptState,
  type WorldState,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import type { LoadedSprite } from './assets.js'
import { expectDefined } from './defined.js'
import { type EntityActionSeed, resolveSpriteActionBinding } from './entity-action-player.js'
import { projectedWorldScriptScratch, runtimeSceneView } from './runtime-project-view.js'
import type { SceneMapAssets } from './scene-map.js'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
  type SceneSwitchDependencies,
} from './scene-switch-transaction.js'
import { resolveSceneSpawn } from './scene-transition.js'

export interface PreparedScene<TRenderer> {
  sceneId: string
  canonicalDef: RuntimeSceneDef
  def: SceneDef
  assets: SceneMapAssets
  palette: Palette
  renderer: TRenderer
  entityDefs: Map<string, SpriteDef>
  pageActions: EntityActionSeed[]
  neededSprites: Set<AssetId>
  spawn: ReturnType<typeof resolveSceneSpawn>
  dependencies: SceneSwitchDependencies
  useActorOverrides: boolean
  onEnterBinding: RuntimeScriptBinding | undefined
  onEnterEntry: SceneEntryPresentation | undefined
}
export interface SceneSpriteOverride {
  def: SpriteDef
  frames: LoadedSprite
}
export interface ScenePreparationPorts<TRenderer> {
  actorOverrides(): ReadonlyMap<string, SceneSpriteOverride>
  canonicalScene(id: string): Promise<RuntimeSceneDef>
  map(id: string): Promise<SceneMapAssets>
  palette(): Promise<Palette>
  requireSprite(id: string | undefined, where: string): SpriteDef
  loadSprite(asset: AssetId): Promise<LoadedSprite>
  prepareSounds(scene: SceneDef, world: WorldState): Promise<void>
  createRenderer(palette: Palette, assets: SceneMapAssets): TRenderer
}

function bindingSceneEntry(
  key: string,
  binding: RuntimeScriptBinding | undefined,
  scriptView: ProjectedWorldScriptState,
): SceneEntryPresentation | undefined {
  if (!binding) return undefined
  const stages: ScriptStage[] = Array.isArray(binding)
    ? binding
    : [{ body: [{ kind: 'callScript', ref: binding }] }]
  return stages[stageIndexFor(scriptView, key, stages)]?.entry
}

/** Freezes before IO, prepares only, and checks the same dependency footprint before host commit. */
export class ScenePreparer<TRenderer> {
  constructor(
    private readonly actors: Readonly<Record<string, ActorDef>>,
    private readonly ports: ScenePreparationPorts<TRenderer>,
  ) {}

  async prepare(
    sceneId: string,
    worldView: WorldState,
    spawn?: SceneSpawn & { inheritFacing?: Facing },
    useActorOverrides = true,
    scriptState?: WorldScriptState,
  ): Promise<PreparedScene<TRenderer>> {
    const preparedWorld = structuredClone(worldView)
    const currentScript =
      scriptState === undefined
        ? (preparedWorld.script ?? emptyWorldScriptState())
        : structuredClone(scriptState)
    preparedWorld.script = currentScript
    const preparedRuntimeScript = projectedWorldScriptScratch(currentScript, sceneId)
    const preparedActorOverrides = useActorOverrides
      ? new Map(
          [...this.ports.actorOverrides()].map(([id, override]) => [
            id,
            { ...override, def: structuredClone(override.def) },
          ]),
        )
      : new Map<string, SceneSpriteOverride>()
    const canonicalDef = await this.ports.canonicalScene(sceneId)
    const def = runtimeSceneView(canonicalDef, currentScript)
    const dependencies = captureSceneSwitchDependencies(
      preparedWorld,
      currentScript,
      canonicalDef,
      preparedActorOverrides,
      useActorOverrides,
    )
    const mapId = currentScript.mapOverride?.[sceneId] ?? def.mapId
    const { entityDefs, needed } = this.spriteDefinitions(
      def,
      preparedWorld,
      currentScript,
      preparedActorOverrides,
      useActorOverrides,
    )
    const neededAssets = [...needed]
    const [assets, palette, loadedSprites] = await Promise.all([
      this.ports.map(mapId),
      this.ports.palette(),
      Promise.all(neededAssets.map((asset) => this.ports.loadSprite(asset))),
      this.ports.prepareSounds(def, preparedWorld),
    ])
    const loaded = new Map(
      neededAssets.map((asset, index) => [asset, expectDefined(loadedSprites[index])] as const),
    )
    const pageActions = this.pageActions(def, entityDefs, loaded)
    const onEnterBinding = def.onEnter
    return {
      sceneId,
      canonicalDef,
      def,
      assets,
      palette,
      renderer: this.ports.createRenderer(palette, assets),
      entityDefs,
      pageActions,
      neededSprites: needed,
      spawn: resolveSceneSpawn(sceneId, def, spawn),
      dependencies,
      useActorOverrides,
      onEnterBinding,
      onEnterEntry: bindingSceneEntry(`s:${sceneId}`, onEnterBinding, preparedRuntimeScript),
    }
  }

  assertCurrent(plan: PreparedScene<TRenderer>, world: WorldState): void {
    assertSceneSwitchDependenciesCurrent(
      plan.dependencies,
      captureSceneSwitchDependencies(
        world,
        world.script ?? emptyWorldScriptState(),
        plan.canonicalDef,
        this.ports.actorOverrides(),
        plan.useActorOverrides,
      ),
      `切场景 ${plan.sceneId} 的预检依赖已变化`,
    )
  }

  private spriteDefinitions(
    scene: SceneDef,
    world: WorldState,
    script: WorldScriptState,
    overrides: ReadonlyMap<string, SceneSpriteOverride>,
    useOverrides: boolean,
  ) {
    const entityDefs = new Map<string, SpriteDef>()
    for (const entity of scene.entities) {
      const id = resolveEntitySpriteId(entity, this.actors)
      if (id) entityDefs.set(entity.id, this.ports.requireSprite(id, `实体 ${entity.id}`))
    }
    const partyDefs = world.party.map((character) => {
      const override = useOverrides ? overrides.get(character.template) : undefined
      if (override) return override.def
      return this.ports.requireSprite(
        character.appearance?.spriteId ?? this.actors[character.template]?.spriteId,
        `队员 ${character.template}`,
      )
    })
    const followers = (script.followers ?? []).map((id) =>
      this.ports.requireSprite(id, `编外跟随者 ${id}`),
    )
    const needed = new Set(
      [...entityDefs.values(), ...partyDefs, ...followers].map((sprite) => sprite.asset),
    )
    return { entityDefs, needed }
  }

  private pageActions(
    scene: SceneDef,
    sprites: ReadonlyMap<string, SpriteDef>,
    loaded: ReadonlyMap<string, LoadedSprite>,
  ): EntityActionSeed[] {
    const actions: EntityActionSeed[] = []
    for (const entity of scene.entities) {
      const binding = entity.pages?.[0]?.animation
      if (!binding) continue
      const sprite = sprites.get(entity.id)
      if (!sprite)
        throw new Error(
          `reforge: 场景 ${scene.id} 实体 ${entity.id} 声明页动作但没有可解析的大世界精灵`,
        )
      const resolved = resolveSpriteActionBinding(
        sprite,
        binding,
        loaded.get(sprite.asset)?.frames.length,
        `reforge: 场景 ${scene.id} 实体 ${entity.id} pages[0].animation`,
      )
      actions.push({ entity: entity.id, ...resolved })
    }
    return actions
  }
}
