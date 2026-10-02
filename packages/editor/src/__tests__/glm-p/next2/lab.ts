/**
 * TEST-GLM-WAVE-P-1 NEXT2 专属 fixture（白名单 src/__tests__/glm-p/next2/**）：
 * 合法多地图懒加载编辑态工厂 —— buildBlankProject 种子在文件级扩展合法地图
 * index/body（正文=种子 start.json 同形态合法 ProjectMap），经
 * memoryAuthorDirectory → fsaSource → loadCurrentProjectFrom（公开 loader）→
 * loadAllAuthorScenes → toEditorState(maps={}) 产出真实懒加载工作副本，
 * 并以 assertProjectSaveValid 公开保存门自证。
 * 只被 map-reference-session-next2.glm-p.test.ts 导入，不进生产。
 */
import type { ProjectMap } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMap,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import type { EditorState } from '../../../core/edit-session.js'
import { assertProjectSaveValid } from '../../../core/project-diagnostics.js'
import { toEditorState } from '../../../core/project-io.js'
import { buildBlankProject } from '../../../core/seed.js'

export interface Next2Lab {
  /** 公开 loader 装载的真实项目（assetBase 供 loadProjectMap 使用）。 */
  project: Awaited<ReturnType<typeof loadCurrentProjectFrom>>
  /** 懒加载编辑态：mapIndex 含 1+extra 张地图，maps={} 真实工作副本。 */
  state: EditorState
  /** 真实磁盘读取（经公开 loadProjectMap）。 */
  loadReal: (path: string) => Promise<ProjectMap>
  /** index 中的全部地图 id（含 start）。 */
  mapIds: readonly string[]
}

/** extraMaps=N 时共 1+N 张合法索引地图（start + lab-1..N，正文均为种子合法形态）。 */
export async function buildNext2Lab(extraMaps: number): Promise<Next2Lab> {
  const files = await buildBlankProject('glm-p-next2')
  const mapsIndex = files['content/maps/index.json'] as {
    version: number
    maps: { id: string; name: string; path: string }[]
  }
  const startBody = files['content/maps/start.json']
  const mapIds = ['start']
  for (let i = 1; i <= extraMaps; i++) {
    const id = `lab-${i}`
    files[`content/maps/${id}.json`] = structuredClone(startBody)
    mapsIndex.maps.push({ id, name: `实验室地图 ${i}`, path: `content/maps/${id}.json` })
    mapIds.push(id)
  }
  files['content/maps/index.json'] = mapsIndex

  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const state = toEditorState(project, scenes, {}, {}, [])
  assertProjectSaveValid(state)
  return {
    project,
    state,
    loadReal: (path: string) => loadProjectMap(project.assetBase, path),
    mapIds,
  }
}

/** 可控读取门：per-id 计划（通过/挂起/拒绝）包住真实 loadProjectMap。 */
export interface Gate {
  started: string[]
  release: (id: string) => void
  rejectWith: (id: string, cause: unknown) => void
}

export interface GatePlan {
  /** 每次读取的处置；缺省 = 立即真实读取。 */
  visit?: (mapId: string, path: string) => 'real' | 'hold' | { reject: unknown }
}

export function gatedLoadMap(
  lab: Next2Lab,
  plan: GatePlan = {},
): { loadMap: (mapId: string, path: string) => Promise<ProjectMap>; gate: Gate } {
  const started: string[] = []
  const released = new Set<string>()
  const waiting = new Map<
    string,
    { resolve: (map: ProjectMap) => void; reject: (cause: unknown) => void }
  >()
  const readThrough = (id: string): void => {
    void lab.loadReal(pathOf(lab, id)).then(
      (map) => waiting.get(id)?.resolve(map),
      (error) => waiting.get(id)?.reject(error),
    )
  }
  const gate: Gate = {
    started,
    release: (id) => {
      released.add(id)
      readThrough(id)
    },
    rejectWith: (id, cause) => {
      waiting.get(id)?.reject(cause)
    },
  }
  const loadMap = (mapId: string, path: string): Promise<ProjectMap> => {
    started.push(mapId)
    const verdict = plan.visit?.(mapId, path) ?? 'real'
    if (verdict === 'real') return lab.loadReal(path)
    if (verdict === 'hold') {
      // 先放行后启动：迟到的 hold 直接走真实读取，不让扫描挂死。
      if (released.has(mapId)) return lab.loadReal(path)
      return new Promise<ProjectMap>((resolve, reject) => {
        waiting.set(mapId, { resolve, reject })
      })
    }
    return Promise.reject(verdict.reject)
  }
  return { loadMap, gate }
}

function pathOf(lab: Next2Lab, id: string): string {
  const asset = lab.state.mapIndex.maps.find((entry) => entry.id === id)
  if (!asset) throw new Error(`map ${id} not in index`)
  return asset.path
}
