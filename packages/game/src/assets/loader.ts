import type {
  EventFile,
  Palette,
  PlayerRoles,
  SceneObjects,
  Tilemap,
} from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from './png.js'

const BASE = '/extracted'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`assets: fetch ${url} failed (${res.status})`)
  }
  return (await res.json()) as T
}

async function fetchPng(url: string): Promise<IndexedImage> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`assets: fetch ${url} failed (${res.status})`)
  const blob = await res.blob()
  return decodePngToIndices(blob)
}

export interface LoadedAssets {
  tilemap: Tilemap & { tilesetFiles?: string[] }
  palette: Palette
  scene: SceneObjects
  events: EventFile
  playerRoles: PlayerRoles
  tileImages: Map<number, IndexedImage>
  characterSprites: Map<number, { frames: IndexedImage[]; anchorX: number; anchorY: number }>
}

export async function loadAll(sceneId: number): Promise<LoadedAssets> {
  const padded = sceneId.toString().padStart(3, '0')
  const [tilemap, palette, scene, events, playerRoles] = await Promise.all([
    fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap-${sceneId}.json`),
    fetchJson<Palette>(`${BASE}/data/palette-0.json`),
    fetchJson<SceneObjects>(`${BASE}/data/scene-${sceneId}.json`),
    fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
    fetchJson<PlayerRoles>(`${BASE}/data/player-roles.json`),
  ])

  const tileFiles = tilemap.tilesetFiles ?? []
  const tilePngs = await Promise.all(
    tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)),
  )
  const tileImages = new Map<number, IndexedImage>()
  tileFiles.forEach((name, i) => {
    const m = /tile-scene-\d+-(\d+)\.png/.exec(name)
    if (m) tileImages.set(Number(m[1]), tilePngs[i]!)
  })

  // 队长精灵 —— 真解析自 player-roles.json (DATA.MKF chunk 3, PLAYERROLES.rgwSpriteNum[0])。
  // M2 切片硬编码 = 2 已删,改读真值;多人队伍切换留 M5。
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('assets: player-roles.json roles[0] missing')
  const spriteIds = new Set<number>([leader.spriteNum])
  for (const eo of scene.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
  const characterSprites = new Map<
    number,
    { frames: IndexedImage[]; anchorX: number; anchorY: number }
  >()
  await Promise.all(
    [...spriteIds].map(async (id) => {
      try {
        const meta = await fetchJson<{
          spriteId: number
          frames: { index: number; width: number; height: number }[]
        }>(`${BASE}/data/sprite-${id}.json`)
        const frames = await Promise.all(
          meta.frames.map((f) =>
            fetchPng(
              `${BASE}/images/sprite-${id}-frame-${f.index.toString().padStart(2, '0')}.png`,
            ),
          ),
        )
        const first = frames[0]
        characterSprites.set(id, {
          frames,
          anchorX: first ? Math.floor(first.width / 2) : 0,
          anchorY: first ? first.height : 0,
        })
      }
      catch (err) {
        console.warn(`assets: sprite ${id} load failed, skip:`, err)
      }
    }),
  )

  return { tilemap, palette, scene, events, playerRoles, tileImages, characterSprites }
}
