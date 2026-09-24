import {
  buildEntityLifecycleReferenceIndex,
  type EntityLifecycleReferenceIndex,
  type RuntimeSceneDef,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import type { SceneMapAssets } from './scene-map.js'

export interface SceneResourceReaders {
  loadScene(id: string): Promise<RuntimeSceneDef>
  loadAllScenes(): Promise<RuntimeSceneDef[]>
  loadMap(id: string): Promise<SceneMapAssets>
  loadPalette(): Promise<Palette>
}

/** Project-scoped resource ownership; does not know active world, rendering or scene commits. */
export class SceneResources {
  #scenes = new Map<string, RuntimeSceneDef>()
  #maps = new Map<string, SceneMapAssets>()
  #palette: Promise<Palette> | undefined
  #references: Promise<EntityLifecycleReferenceIndex> | undefined

  constructor(
    entry: RuntimeSceneDef,
    private readonly readers: SceneResourceReaders,
  ) {
    this.#scenes.set(entry.id, entry)
  }

  peek(id: string): RuntimeSceneDef | undefined {
    return this.#scenes.get(id)
  }

  async canonical(id: string): Promise<RuntimeSceneDef> {
    const hit = this.#scenes.get(id)
    if (hit) return hit
    const scene = await this.readers.loadScene(id)
    this.#scenes.set(id, scene)
    return scene
  }

  async map(id: string): Promise<SceneMapAssets> {
    const hit = this.#maps.get(id)
    if (hit) {
      this.#maps.delete(id)
      this.#maps.set(id, hit)
      return hit
    }
    const loaded = await this.readers.loadMap(id)
    this.#maps.set(id, loaded)
    while (this.#maps.size > 16) {
      const oldest = this.#maps.keys().next().value
      // Preserve the old protection of this completed request, not a new active-scene pin policy.
      if (oldest === undefined || oldest === id) break
      this.#maps.delete(oldest)
    }
    return loaded
  }

  palette(): Promise<Palette> {
    this.#palette ??= this.readers.loadPalette()
    return this.#palette
  }

  references(): Promise<EntityLifecycleReferenceIndex> {
    this.#references ??= this.readers.loadAllScenes().then((scenes) => {
      for (const scene of scenes) this.#scenes.set(scene.id, scene)
      return buildEntityLifecycleReferenceIndex(scenes)
    })
    return this.#references
  }
}
