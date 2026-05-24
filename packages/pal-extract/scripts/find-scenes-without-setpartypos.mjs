#!/usr/bin/env node
/**
 * find-scenes-without-setpartypos.mjs
 *
 * 扫 295 个 scene 的 wScriptOnEnter:
 *   - 若 onEnterLabel 指向的段不含 opcode 70(setPartyPos),该 scene 需要 dev-only partyStart。
 *
 * 对需要 fallback 的 scene,按下列优先级找 partyStart:
 *   1. **caller-trace**:扫所有 scene 的 events,找到 `loadScene(targetId)` 调用位置:
 *      - 优先取 loadScene **后**紧邻的 setPartyPos(目标 scene 的落脚点 — 最准)
 *      - 若 loadScene 后没有,取 loadScene **前**紧邻的 setPartyPos(caller 自身位置作近似)
 *      - 多 caller 时:优先选有"后置 setPartyPos"的,其次 distance 升序取最紧邻
 *   2. **NPC-anchored BFS**:scene 含 eventObjects 时,以第一个 NPC 的可走邻居为 BFS 起点,
 *      取该连通区中心。保证 NPC 所在的可走区被 partyStart 覆盖(对孤儿 scene 如草妖 15 关键)。
 *   3. **bare BFS**:无 NPC 时,扫网格找种子,取最大连通区中心(古早兜底)。
 *
 * setPartyPos 操作数: [col, row, h]
 *   pixel x = col * 32 + h * 16
 *   pixel y = row * 16 + h * 8
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')

const EVENTS_DIR = join(REPO_ROOT, 'data', 'extracted', 'events')
const SCENE_DATA_DIR = join(REPO_ROOT, 'data', 'extracted', 'data', 'scene')
const TILEMAP_DIR = join(REPO_ROOT, 'data', 'extracted', 'data', 'tilemap')

const OP_SET_PARTY_POS = 70  // 0x46

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function flattenEvents(eventsJson) {
  const commands = []
  const labelMap = {}
  for (const seg of eventsJson.segments) {
    for (const cmd of seg.commands) {
      if (cmd.label) labelMap[cmd.label] = commands.length
      commands.push(cmd)
    }
  }
  return { commands, labelMap }
}

function scanEnterScript(commands, labelMap, label) {
  const startIp = labelMap[label]
  if (startIp === undefined) return { hasSetPartyPos: false }
  for (let ip = startIp; ip < commands.length; ip++) {
    const cmd = commands[ip]
    if (cmd.op === 'end') break
    if (cmd.op === 'setPartyPos') return { hasSetPartyPos: true }
    if (cmd.op === 'raw' && cmd.opcode === OP_SET_PARTY_POS) return { hasSetPartyPos: true }
  }
  return { hasSetPartyPos: false }
}

function isSetPartyPos(cmd) {
  if (!cmd) return false
  if (cmd.op === 'setPartyPos') return true
  if (cmd.op === 'raw' && cmd.opcode === OP_SET_PARTY_POS) return true
  return false
}

/**
 * caller-trace: 扫所有 scene events 的 loadScene(targetId) 调用,找紧邻 setPartyPos。
 *
 * 优先级:
 *   - loadScene **后**紧邻 setPartyPos(目标位 — 最准),N=20 内,不跨 end / 另一 loadScene(其他 target)
 *   - loadScene **前**紧邻 setPartyPos(caller 位作近似),N=20 内,不跨 end
 *   - 多 caller:先看后置(全部 callers 优先);其次 distance 升序;同 distance 按 sceneNum 升序
 */
function findPartyPosFromCallers(targetSceneId, allEventsMap) {
  const N = 20
  const candidatesAfter = []
  const candidatesBefore = []

  for (const [sceneNum, { commands }] of Object.entries(allEventsMap)) {
    for (let ip = 0; ip < commands.length; ip++) {
      const cmd = commands[ip]
      if (cmd.op !== 'loadScene' || cmd.sceneId !== targetSceneId) continue

      // 后向扫
      for (let ahead = ip + 1; ahead <= Math.min(commands.length - 1, ip + N); ahead++) {
        const c = commands[ahead]
        if (!c) break
        if (c.op === 'end') break
        if (c.op === 'loadScene' && c.sceneId !== targetSceneId) break
        if (isSetPartyPos(c) && c.operands) {
          candidatesAfter.push({
            ops: c.operands, callerScene: Number(sceneNum),
            ip: ahead, direction: 'after', distance: ahead - ip,
          })
          break
        }
      }

      // 前向扫
      for (let back = ip - 1; back >= Math.max(0, ip - N); back--) {
        const c = commands[back]
        if (!c) break
        if (c.op === 'end') break
        if (isSetPartyPos(c) && c.operands) {
          candidatesBefore.push({
            ops: c.operands, callerScene: Number(sceneNum),
            ip: back, direction: 'before', distance: ip - back,
          })
          break
        }
      }
    }
  }

  if (candidatesAfter.length > 0) {
    candidatesAfter.sort((a, b) => a.distance - b.distance || a.callerScene - b.callerScene)
    return candidatesAfter[0]
  }
  if (candidatesBefore.length > 0) {
    candidatesBefore.sort((a, b) => a.distance - b.distance || a.callerScene - b.callerScene)
    return candidatesBefore[0]
  }
  return null
}

function opsToPixel(ops) {
  const [col, row, h] = ops
  return { x: col * 32 + h * 16, y: row * 16 + h * 8 }
}

// ─── obstacle / BFS ───────────────────────────────────────────────────────────

const TILE_W = 32
const TILE_H = 16
const X_STEP = 16
const Y_STEP = 8

function pixelToCell(posX, posY) {
  let col = Math.floor(posX / TILE_W)
  let row = Math.floor(posY / TILE_H)
  let h = 0
  const xr = posX % TILE_W, yr = posY % TILE_H
  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) { col++; row++ }
    else if (32 - xr + yr * 2 < 16) { col++ }
    else if (32 - xr + yr * 2 < 48) { h = 1 }
    else { row++ }
  }
  return { col, row, h }
}

function tilemapIsBlocked(tilemap, col, row, h) {
  if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return true
  const cell = tilemap.cells[row]?.[col]
  if (!cell) return true
  const tileWord = h === 0 ? cell.lower : cell.upper
  return (tileWord & 0x2000) !== 0
}

function isWalkablePixel(tilemap, posX, posY) {
  const { col, row, h } = pixelToCell(posX, posY)
  return !tilemapIsBlocked(tilemap, col, row, h)
}

/** BFS from seed,返回连通区所有点(若 seed 不可走返回 null) */
function bfsFromSeed(tilemap, sx, sy) {
  if (!isWalkablePixel(tilemap, sx, sy)) return null
  const visited = new Set()
  const key = (x, y) => `${x},${y}`
  const queue = [[sx, sy]]
  visited.add(key(sx, sy))
  const points = []
  const DIRS = [
    [X_STEP, 0], [-X_STEP, 0], [0, Y_STEP], [0, -Y_STEP],
    [X_STEP, Y_STEP], [-X_STEP, Y_STEP], [X_STEP, -Y_STEP], [-X_STEP, -Y_STEP],
  ]
  const maxX = tilemap.width * TILE_W
  const maxY = tilemap.height * TILE_H
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()
    points.push([cx, cy])
    for (const [ddx, ddy] of DIRS) {
      const nx = cx + ddx, ny = cy + ddy
      if (nx < 0 || ny < 0 || nx >= maxX || ny >= maxY) continue
      const k = key(nx, ny)
      if (visited.has(k)) continue
      visited.add(k)
      if (isWalkablePixel(tilemap, nx, ny)) queue.push([nx, ny])
    }
  }
  return points
}

/**
 * NPC-anchored BFS: 从 scene eventObjects 第一个 NPC 的可走邻居开始 BFS。
 * 关键 — 保证 partyStart 跟 NPCs 在同一连通区(对孤儿 scene 如草妖 scene 15)。
 */
function bfsAnchoredOnNpc(tilemap, eventObjects) {
  for (const eo of eventObjects) {
    const { x, y } = eo
    for (const [dx, dy] of [[X_STEP, Y_STEP], [-X_STEP, -Y_STEP], [-X_STEP, Y_STEP], [X_STEP, -Y_STEP]]) {
      const nx = x + dx, ny = y + dy
      if (nx <= 0 || ny <= 0) continue
      if (isWalkablePixel(tilemap, nx, ny)) {
        const pts = bfsFromSeed(tilemap, nx, ny)
        if (pts && pts.length > 0) {
          pts.sort((a, b) => a[1] - b[1] || a[0] - b[0])
          const mid = pts[Math.floor(pts.length / 2)]
          return { x: mid[0], y: mid[1], size: pts.length, anchoredOn: eo.id ?? '?' }
        }
      }
    }
  }
  return null
}

/** bare BFS: 无 NPC / fallback。扫网格找种子,取该连通区中心。 */
function bfsFindCenter(tilemap) {
  const maxX = tilemap.width * TILE_W
  const maxY = tilemap.height * TILE_H
  for (let py = Y_STEP * 4; py < maxY - Y_STEP * 4; py += Y_STEP * 4) {
    for (let px = X_STEP * 4; px < maxX - X_STEP * 4; px += X_STEP * 4) {
      if (isWalkablePixel(tilemap, px, py)) {
        const pts = bfsFromSeed(tilemap, px, py)
        if (pts && pts.length > 100) {
          pts.sort((a, b) => a[1] - b[1] || a[0] - b[0])
          const mid = pts[Math.floor(pts.length / 2)]
          return { x: mid[0], y: mid[1], size: pts.length }
        }
      }
    }
  }
  return null
}

// ─── 主扫描 ───────────────────────────────────────────────────────────────────

console.log('=== Step 1: 加载所有 scene events ===')
const allEventsMap = {}
const eventFiles = readdirSync(EVENTS_DIR).filter(f => f.startsWith('scene-') && f.endsWith('.json'))
for (const file of eventFiles) {
  const m = file.match(/scene-(\d+)\.json/)
  if (!m) continue
  const sceneNum = Number(m[1])
  const { commands, labelMap } = flattenEvents(loadJson(join(EVENTS_DIR, file)))
  allEventsMap[sceneNum] = { commands, labelMap }
}
console.log(`加载 ${Object.keys(allEventsMap).length} scene events`)

console.log('\n=== Step 2: 加载所有 scene data ===')
const sceneDataMap = {}
for (const file of readdirSync(SCENE_DATA_DIR).filter(f => f.endsWith('.json'))) {
  const m = file.match(/^(\d+)\.json$/)
  if (!m) continue
  const sceneNum = Number(m[1])
  const sd = loadJson(join(SCENE_DATA_DIR, file))
  sceneDataMap[sceneNum] = {
    mapNum: sd.mapNum,
    onEnterLabel: sd.onEnterLabel,
    eventObjects: sd.eventObjects ?? [],
  }
}
console.log(`加载 ${Object.keys(sceneDataMap).length} scene data`)

console.log('\n=== Step 3: 识别 onEnterLabel 不含 setPartyPos ===')
const scenesNeedingFallback = []
const sceneNums = Object.keys(sceneDataMap).map(Number).sort((a, b) => a - b)
for (const sceneNum of sceneNums) {
  const { mapNum, onEnterLabel, eventObjects } = sceneDataMap[sceneNum]
  if (!onEnterLabel) continue
  const ev = allEventsMap[sceneNum]
  if (!ev) continue
  const { hasSetPartyPos } = scanEnterScript(ev.commands, ev.labelMap, onEnterLabel)
  if (!hasSetPartyPos) {
    scenesNeedingFallback.push({ sceneNum, mapNum, onEnterLabel, eventObjects })
  }
}
console.log(`识别 ${scenesNeedingFallback.length} scene 需要 fallback`)

console.log('\n=== Step 4: 三档策略 ===')

const tilemapCache = {}
function getTilemap(mapNum) {
  if (mapNum in tilemapCache) return tilemapCache[mapNum]
  try { tilemapCache[mapNum] = loadJson(join(TILEMAP_DIR, `${mapNum}.json`)) }
  catch { tilemapCache[mapNum] = null }
  return tilemapCache[mapNum]
}

const results = []
let callerCount = 0, npcAnchoredCount = 0, bareBfsCount = 0, orphanCount = 0
let callerInvalidatedCount = 0

for (const { sceneNum, mapNum, onEnterLabel, eventObjects } of scenesNeedingFallback) {
  let partyStart = null
  let strategy = null
  let strategyKind = null

  // 1) caller-trace
  const caller = findPartyPosFromCallers(sceneNum, allEventsMap)
  if (caller) {
    const px = opsToPixel(caller.ops)
    const tilemap = getTilemap(mapNum)
    if (tilemap && isWalkablePixel(tilemap, px.x, px.y)) {
      partyStart = { x: px.x, y: px.y, facing: 'down', _source: 'caller-trace', _caller: caller }
      strategy = `caller-trace scene-${caller.callerScene} (${caller.direction}, dist=${caller.distance}) ops=[${caller.ops}] → pixel(${px.x},${px.y})`
      strategyKind = 'caller'
      callerCount++
    } else {
      callerInvalidatedCount++
      console.log(`  scene-${sceneNum}: caller pixel(${px.x},${px.y}) 不可走,降级到 NPC-anchored BFS`)
    }
  }

  // 2) NPC-anchored BFS
  if (!partyStart && eventObjects.length > 0) {
    const tilemap = getTilemap(mapNum)
    if (tilemap) {
      const r = bfsAnchoredOnNpc(tilemap, eventObjects)
      if (r) {
        partyStart = { x: r.x, y: r.y, facing: 'down', _source: 'npc-anchored-bfs', _anchoredOn: r.anchoredOn, _bfsSize: r.size }
        strategy = `NPC-anchored BFS (NPC ${r.anchoredOn}) center(${r.x},${r.y}) size=${r.size}`
        strategyKind = 'npc-bfs'
        npcAnchoredCount++
      }
    }
  }

  // 3) bare BFS
  if (!partyStart) {
    const tilemap = getTilemap(mapNum)
    if (tilemap) {
      const r = bfsFindCenter(tilemap)
      if (r) {
        partyStart = { x: r.x, y: r.y, facing: 'down', _source: 'bare-bfs', _bfsSize: r.size }
        strategy = `bare BFS center(${r.x},${r.y}) size=${r.size}`
        strategyKind = 'bare-bfs'
        bareBfsCount++
      }
    }
  }

  if (!partyStart) {
    strategy = 'ORPHAN'
    strategyKind = 'orphan'
    orphanCount++
  }

  results.push({ sceneNum, mapNum, onEnterLabel, strategy, strategyKind, partyStart })
}

const outPath = '/tmp/scenes-without-setpartypos.json'
writeFileSync(outPath, JSON.stringify(results, null, 2))

console.log(`\n=== 统计 ===`)
console.log(`caller-trace 命中:    ${callerCount}`)
console.log(`  (其中 caller 给的位置不可走 → 降级:${callerInvalidatedCount})`)
console.log(`NPC-anchored BFS:    ${npcAnchoredCount}`)
console.log(`bare BFS:            ${bareBfsCount}`)
console.log(`orphan:              ${orphanCount}`)
console.log(`total fallback:      ${results.length}`)

console.log(`\n=== Scene 15 (草妖) ===`)
const s15 = results.find(r => r.sceneNum === 15)
if (s15) {
  console.log(`  scene-15(map-${s15.mapNum}) [${s15.strategyKind}]`)
  console.log(`  pixel(${s15.partyStart.x}, ${s15.partyStart.y})`)
  console.log(`  strategy: ${s15.strategy}`)
}

console.log(`\n=== 前 20 个结果 ===`)
for (const r of results.slice(0, 20)) {
  const ps = r.partyStart ? `x=${r.partyStart.x} y=${r.partyStart.y}` : 'null'
  console.log(`  scene-${r.sceneNum}(map-${r.mapNum}) [${r.strategyKind}] → ${ps}`)
}

console.log(`\n结果写入: ${outPath}`)
