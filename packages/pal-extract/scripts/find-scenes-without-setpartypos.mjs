#!/usr/bin/env node
/**
 * find-scenes-without-setpartypos.mjs
 *
 * 扫 295 个 scene 的 wScriptOnEnter:
 *   - 若 onEnterLabel 指向的段不含 opcode 70(setPartyPos),该 scene 需要 dev-only partyStart。
 *
 * 对需要 fallback 的 scene:
 *   1. 优先在其他 scene 的 trigger scripts 里找 loadScene(N) 调用前的 setPartyPos(opcode 70) 真值。
 *   2. 若找不到,对该 scene 的 tilemap 跑 BFS 找最大 walkable 连通区中心点。
 *
 * setPartyPos 操作数: [col, row, h]
 *   pixel x = col * 32 + h * 16
 *   pixel y = row * 16 + h * 8
 *
 * 输出:
 *   - 标准输出: 需要 partyStart 的 scene 列表
 *   - 写入 /tmp/scenes-without-setpartypos.json: 详细结果供 patch scene-jumps.json 用
 *
 * 仅需要 Node.js(内置 fs / path),无额外依赖。
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

/** 把 scene-NNN.json 里 segments 展成 commands 平铺数组(带 label 索引) */
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

/**
 * 从 labelMap[label] 开始遍历 commands,直到 'end' opcode,
 * 检查是否含 opcode 70 (setPartyPos)。
 * 返回 {hasSetPartyPos, setPartyPosOps} (若有,返回第一次的 operands)
 */
function scanEnterScript(commands, labelMap, label) {
  const startIp = labelMap[label]
  if (startIp === undefined) {
    return { hasSetPartyPos: false, setPartyPosOps: null }
  }
  for (let ip = startIp; ip < commands.length; ip++) {
    const cmd = commands[ip]
    // 遇到 end 停止
    if (cmd.op === 'end') break
    // 检查 named setPartyPos
    if (cmd.op === 'setPartyPos') {
      return { hasSetPartyPos: true, setPartyPosOps: cmd.operands ?? null }
    }
    // 检查 raw opcode 70
    if (cmd.op === 'raw' && cmd.opcode === OP_SET_PARTY_POS) {
      return { hasSetPartyPos: true, setPartyPosOps: cmd.operands ?? null }
    }
  }
  return { hasSetPartyPos: false, setPartyPosOps: null }
}

/**
 * 在所有 scene events 里找 loadScene(targetSceneId) 调用,
 * 找该调用前的 setPartyPos(opcode 70),返回最早找到的 operands。
 * 策略:往前扫最多 20 条指令找 setPartyPos。
 */
function findPartyPosFromCallers(targetSceneId, allEventsMap) {
  for (const [sceneNum, { commands, labelMap }] of Object.entries(allEventsMap)) {
    for (let ip = 0; ip < commands.length; ip++) {
      const cmd = commands[ip]
      // 找到 loadScene(targetSceneId)
      if (cmd.op === 'loadScene' && cmd.sceneId === targetSceneId) {
        // 往前找 setPartyPos
        for (let back = ip - 1; back >= Math.max(0, ip - 20); back--) {
          const prev = commands[back]
          if (prev.op === 'end') break  // 越过段边界就停
          if (prev.op === 'setPartyPos' && prev.operands) {
            return { ops: prev.operands, callerScene: Number(sceneNum), ip: back }
          }
          if (prev.op === 'raw' && prev.opcode === OP_SET_PARTY_POS && prev.operands) {
            return { ops: prev.operands, callerScene: Number(sceneNum), ip: back }
          }
        }
      }
    }
  }
  return null
}

/** setPartyPos [col, row, h] → pixel {x, y} */
function opsToPixel(ops) {
  const [col, row, h] = ops
  return {
    x: col * 32 + h * 16,
    y: row * 16 + h * 8,
  }
}

// ─── obstacle / BFS ───────────────────────────────────────────────────────────

const TILE_W = 32
const TILE_H = 16

/**
 * 菱形四分法 → (col, row, h)  (port sdlpal scene.c:556-591 + scene-system.ts)
 * 返回 {col, row, h}
 */
function pixelToCell(posX, posY) {
  let col = Math.floor(posX / TILE_W)
  let row = Math.floor(posY / TILE_H)
  let h = 0
  const xr = posX % TILE_W
  const yr = posY % TILE_H

  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++; row++
    } else if (32 - xr + yr * 2 < 16) {
      col++
    } else if (32 - xr + yr * 2 < 48) {
      h = 1
    } else {
      row++
    }
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

/**
 * BFS: 从 (startX, startY) 展开找最大 walkable 连通区中心。
 * 步长按半 tile (X_STEP=16, Y_STEP=8)移动,检查 8 方向邻居。
 * 若 startX/startY 不可走,先扫网格找第一个可走点作为种子。
 * 返回 {x, y, size} (size=连通区点数)
 */
function bfsFindWalkableCenter(tilemap) {
  const X_STEP = 16
  const Y_STEP = 8

  const maxX = tilemap.width * TILE_W
  const maxY = tilemap.height * TILE_H

  // 找一个可走的种子点
  let seedX = -1, seedY = -1
  outer:
  for (let py = Y_STEP; py < maxY - Y_STEP; py += Y_STEP * 4) {
    for (let px = X_STEP; px < maxX - X_STEP; px += X_STEP * 4) {
      if (isWalkablePixel(tilemap, px, py)) {
        seedX = px; seedY = py; break outer
      }
    }
  }
  if (seedX < 0) return null  // 全图无可走点

  // BFS (像素格以 X_STEP × Y_STEP 为单位)
  const visited = new Set()
  const key = (x, y) => `${x},${y}`
  const queue = [[seedX, seedY]]
  visited.add(key(seedX, seedY))
  const points = []

  const DIRS = [
    [X_STEP, 0], [-X_STEP, 0],
    [0, Y_STEP], [0, -Y_STEP],
    [X_STEP, Y_STEP], [-X_STEP, Y_STEP],
    [X_STEP, -Y_STEP], [-X_STEP, -Y_STEP],
  ]

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()
    points.push([cx, cy])
    for (const [ddx, ddy] of DIRS) {
      const nx = cx + ddx
      const ny = cy + ddy
      if (nx < 0 || ny < 0 || nx >= maxX || ny >= maxY) continue
      const k = key(nx, ny)
      if (visited.has(k)) continue
      visited.add(k)
      if (isWalkablePixel(tilemap, nx, ny)) {
        queue.push([nx, ny])
      }
    }
  }

  if (points.length === 0) return null

  // 取中心区域:排序后取中间点
  const midIdx = Math.floor(points.length / 2)
  points.sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const [cx, cy] = points[midIdx]
  return { x: cx, y: cy, size: points.length }
}

// ─── 主扫描 ───────────────────────────────────────────────────────────────────

console.log('=== Step 1: 加载所有 scene events ===')

const allEventsMap = {}  // sceneNum → {commands, labelMap}
const eventFiles = readdirSync(EVENTS_DIR).filter(f => f.startsWith('scene-') && f.endsWith('.json'))

for (const file of eventFiles) {
  const m = file.match(/scene-(\d+)\.json/)
  if (!m) continue
  const sceneNum = Number(m[1])
  const evJson = loadJson(join(EVENTS_DIR, file))
  const { commands, labelMap } = flattenEvents(evJson)
  allEventsMap[sceneNum] = { commands, labelMap }
}

console.log(`加载了 ${Object.keys(allEventsMap).length} 个 scene events`)

console.log('\n=== Step 2: 加载所有 scene data (onEnterLabel + mapNum) ===')

const sceneDataMap = {}  // sceneNum → {mapNum, onEnterLabel}
const sceneDataFiles = readdirSync(SCENE_DATA_DIR).filter(f => f.endsWith('.json'))

for (const file of sceneDataFiles) {
  const m = file.match(/^(\d+)\.json$/)
  if (!m) continue
  const sceneNum = Number(m[1])
  const sd = loadJson(join(SCENE_DATA_DIR, file))
  sceneDataMap[sceneNum] = { mapNum: sd.mapNum, onEnterLabel: sd.onEnterLabel }
}

console.log(`加载了 ${Object.keys(sceneDataMap).length} 个 scene data`)

console.log('\n=== Step 3: 识别 onEnterLabel 不含 setPartyPos 的 scene ===')

const scenesNeedingFallback = []  // {sceneNum, mapNum, onEnterLabel}

const sceneNums = Object.keys(sceneDataMap).map(Number).sort((a, b) => a - b)

for (const sceneNum of sceneNums) {
  const { mapNum, onEnterLabel } = sceneDataMap[sceneNum]
  if (!onEnterLabel) {
    // 没有 onEnterLabel,不需要 enter script,直接跳过(不需要 fallback)
    continue
  }
  const ev = allEventsMap[sceneNum]
  if (!ev) {
    console.warn(`  scene ${sceneNum}: 找不到 events JSON,跳过`)
    continue
  }
  const { hasSetPartyPos } = scanEnterScript(ev.commands, ev.labelMap, onEnterLabel)
  if (!hasSetPartyPos) {
    scenesNeedingFallback.push({ sceneNum, mapNum, onEnterLabel })
  }
}

console.log(`\n识别出 ${scenesNeedingFallback.length} 个 scene 的 onEnterLabel 不含 setPartyPos:`)
for (const s of scenesNeedingFallback) {
  console.log(`  scene-${s.sceneNum} (map-${s.mapNum}) onEnterLabel=${s.onEnterLabel}`)
}

console.log('\n=== Step 4: 为每个 scene 确定 partyStart ===')

// 缓存 tilemap JSON
const tilemapCache = {}
function getTilemap(mapNum) {
  if (tilemapCache[mapNum]) return tilemapCache[mapNum]
  const p = join(TILEMAP_DIR, `${mapNum}.json`)
  try {
    tilemapCache[mapNum] = loadJson(p)
  } catch (e) {
    tilemapCache[mapNum] = null
  }
  return tilemapCache[mapNum]
}

const results = []

for (const { sceneNum, mapNum, onEnterLabel } of scenesNeedingFallback) {
  process.stdout.write(`  scene-${sceneNum} (map-${mapNum}): `)

  let partyStart = null
  let strategy = null

  // 优先级 a: 在其他 scene 里找 loadScene(sceneNum) 前的 setPartyPos
  const callerResult = findPartyPosFromCallers(sceneNum, allEventsMap)
  if (callerResult) {
    const { ops, callerScene } = callerResult
    const px = opsToPixel(ops)
    partyStart = { x: px.x, y: px.y, facing: 'down', _source: `caller-scene-${callerScene}`, _ops: ops }
    strategy = `caller-scene-${callerScene} setPartyPos [${ops}] → pixel(${px.x},${px.y})`
    console.log(`OK(caller) ${strategy}`)
  } else {
    // 优先级 b: BFS
    const tilemap = getTilemap(mapNum)
    if (tilemap) {
      const bfsResult = bfsFindWalkableCenter(tilemap)
      if (bfsResult) {
        partyStart = { x: bfsResult.x, y: bfsResult.y, facing: 'down', _source: 'bfs', _bfsSize: bfsResult.size }
        strategy = `BFS center(${bfsResult.x},${bfsResult.y}) size=${bfsResult.size}`
        console.log(`OK(bfs) ${strategy}`)
      } else {
        console.log(`WARN: tilemap ${mapNum} 全无可走点`)
        strategy = 'none'
      }
    } else {
      console.log(`WARN: tilemap ${mapNum}.json 不存在`)
      strategy = 'none'
    }
  }

  results.push({
    sceneNum,
    mapNum,
    onEnterLabel,
    strategy,
    partyStart,
  })
}

// ─── 输出 ─────────────────────────────────────────────────────────────────────

const outPath = '/tmp/scenes-without-setpartypos.json'
writeFileSync(outPath, JSON.stringify(results, null, 2))

console.log(`\n=== 完成 ===`)
console.log(`需要 fallback 的 scene 数: ${results.length}`)
console.log(`结果写入: ${outPath}`)
console.log('\n前 15 个结果:')
for (const r of results.slice(0, 15)) {
  const ps = r.partyStart ? `x=${r.partyStart.x} y=${r.partyStart.y}` : 'null'
  console.log(`  scene-${r.sceneNum}(map-${r.mapNum}): [${r.strategy}] → ${ps}`)
}
