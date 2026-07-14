import {
  type CharacterInstance,
  checkStages,
  type Facing,
  type GridPos,
  isMapAssetId,
  type WorldState,
} from '@type-pal/content'
import { SAVE_VERSION, type SaveMeta, type SavePayload, type SlotId, slotKind } from './types.js'

/** 队伍显示快照：名字(已解析,nameOf 注入)+ 等级。now 注入(Date.now())。 */
export function buildMeta(
  slotId: SlotId,
  world: WorldState,
  mapName: string,
  nameOf: (c: CharacterInstance) => string,
  now: number,
  savedTimes?: number, // 原版 wSavedTimes(调用方算 max(全部槽)+1 传入)
): SaveMeta {
  return {
    slotId,
    kind: slotKind(slotId),
    party: world.party.map((c) => ({ name: nameOf(c), level: c.level })),
    mapName,
    savedAt: now,
    ...(savedTimes !== undefined ? { savedTimes } : {}),
  }
}

export function buildPayload(
  world: WorldState,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
  contentVersion: number,
): SavePayload {
  return { version: SAVE_VERSION, projectId, contentVersion, world, position }
}

/**
 * 读档运行时归一化(GLM x-shell G10.1:曾直用 payload,引擎加字段后旧档缺字段运行时崩):
 * · version 闸:新于引擎 → 抛(宁拒不猜);旧于当前 → 逐版本升级挂点(现仅 v1,占位)。
 * · 结构补默认:引擎演进新增的**容器**字段旧档缺失 → 补空值(?? 语义,不动既有值)。
 *   只补结构不钳数值 —— 数值修复 = "旧档复原",按方针不做(新档干净即可)。
 * 原地修补并返回同一对象(payload 是读档专属拷贝)。
 */
export function normalizePayload(p: SavePayload): SavePayload {
  if (p.version > SAVE_VERSION)
    throw new Error(`存档格式 v${p.version} 新于引擎支持的 v${SAVE_VERSION}`)
  // v(n)→v(n+1) 升级链挂点:bump SAVE_VERSION 时在此逐版本迁移
  const w = p.world
  w.party ??= []
  w.money ??= 0
  w.learnedSkills ??= {}
  w.inventory ??= []
  for (const c of w.party) {
    c.equipment ??= {}
    c.tags ??= []
    c.hiddenExp ??= {}
    c.luck ??= 0 // 后加字段(fleeRate 装备派生刀):旧档缺 → 0(装备加成仍活派生)
  }
  normalizeSceneScriptOverrides(w.script)
  validateMapOverride(w.script)
  return p
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateRuntimeScriptBinding(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    checkStages(value, path)
    return
  }
  if (
    !isRecord(value) ||
    typeof value.chunk !== 'string' ||
    value.chunk.length === 0 ||
    typeof value.id !== 'string' ||
    value.id.length === 0
  )
    throw new Error(`${path} 必须是 ScriptStage[]、{chunk,id} ScriptRef 或 null`)
}

function normalizeSceneScriptOverrides(script: WorldState['script']): void {
  if (!script) return
  const raw = script as unknown as Record<string, unknown>
  const legacy = raw.onTeleport
  const rawOverrides = raw.sceneScriptOverrides
  if (rawOverrides !== undefined && !isRecord(rawOverrides))
    throw new Error('存档 world.script.sceneScriptOverrides 必须是“场景 ID → 脚本覆写”对象')
  let overrides: Record<string, unknown> | undefined = rawOverrides

  if (legacy !== undefined) {
    if (!isRecord(legacy))
      throw new Error('旧存档 world.script.onTeleport 必须是“场景 ID → 脚本绑定”对象')
    if (overrides === undefined) {
      overrides = {}
      raw.sceneScriptOverrides = overrides
    }
    for (const [sceneId, binding] of Object.entries(legacy)) {
      validateRuntimeScriptBinding(binding, `旧存档 world.script.onTeleport[${sceneId}]`)
      const existing = overrides[sceneId]
      if (existing !== undefined && !isRecord(existing))
        throw new Error(`存档 world.script.sceneScriptOverrides[${sceneId}] 必须是对象`)
      if (isRecord(existing) && Object.hasOwn(existing, 'onTeleport'))
        throw new Error(`旧存档 ${sceneId} 同时存在 onTeleport 旧字段与新覆写,拒绝猜测合并`)
      const target: Record<string, unknown> = existing ?? {}
      target.onTeleport = binding
      overrides[sceneId] = target
    }
    delete raw.onTeleport
  }

  if (overrides === undefined) return
  for (const [sceneId, override] of Object.entries(overrides)) {
    if (!isRecord(override))
      throw new Error(`存档 world.script.sceneScriptOverrides[${sceneId}] 必须是对象`)
    for (const key of Object.keys(override))
      if (key !== 'onEnter' && key !== 'onTeleport')
        throw new Error(
          `存档 world.script.sceneScriptOverrides[${sceneId}] 含未知槽 ${key};只允许 onEnter/onTeleport`,
        )
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      if (!Object.hasOwn(override, slot) || override[slot] === null) continue
      validateRuntimeScriptBinding(
        override[slot],
        `存档 world.script.sceneScriptOverrides[${sceneId}].${slot}`,
      )
    }
  }
}

function validateMapOverride(script: WorldState['script']): void {
  const mapOverride = (script as { mapOverride?: unknown } | undefined)?.mapOverride
  if (mapOverride === undefined) return
  if (typeof mapOverride !== 'object' || mapOverride === null || Array.isArray(mapOverride))
    throw new Error('存档 world.script.mapOverride 必须是“场景 ID → 稳定地图 ID”对象')
  for (const [sceneId, mapId] of Object.entries(mapOverride)) {
    if (typeof mapId === 'number')
      throw new Error(
        `旧存档 world.script.mapOverride[${sceneId}] 使用数字地图编号 ${mapId}，无法安全转换为新版稳定地图 ID`,
      )
    if (!isMapAssetId(mapId))
      throw new Error(
        `存档 world.script.mapOverride[${sceneId}] 不是合法稳定地图 ID：${String(mapId)}`,
      )
  }
}

/** 截当前画面 → 缩到 w×h → PNG Blob(浏览器;离屏 canvas)。source 应为干净游戏帧(无 UI 层)。 */
export function captureThumbnail(source: HTMLCanvasElement, w = 64, h = 40): Promise<Blob> {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const c = off.getContext('2d')
  if (!c) return Promise.reject(new Error('thumbnail: no 2d context'))
  c.imageSmoothingEnabled = true
  c.drawImage(source, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error('thumbnail: toBlob null'))), 'image/png')
  })
}
