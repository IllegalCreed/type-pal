#!/usr/bin/env tsx
/**
 * M4 P3.T7: 全 294 scene sdlpal --dump-map vs render-tilemap.ts pixel diff。
 *
 * 流程:
 *  1. 读 data/extracted/data/scene/*.json 取 sceneId + mapNum
 *  2. 每 mapNum(dedupe):
 *     a. sdlpal-classic --dump-map {mapNum} --out build/sdlpal-baseline/maps/{mapNum}.png
 *  3. 每 sceneId:
 *     b. renderTilemap({ sceneId, outPath }) → build/m4-maps/{sceneId}.png
 *     c. pixelmatch 两图 → pass / fail
 *  4. 失败 scene 进 build/m4-map-diff.md(一次性 diff 报告,不入 git)
 *
 * 注意:
 *  - sdlpal 调用用 execFileSync(防 shell injection)
 *  - renderTilemap 直接 import(不走子进程,避免 hook 拦截)
 *  - sdlpal 必须在 data/raw/ cwd 下跑(MKF 文件在那里)
 */

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { renderTilemap } from './render-tilemap.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')

const SDLPAL = resolve(REPO_ROOT, 'build/sdlpal-classic/unix/sdlpal')
const GAME_DATA = resolve(REPO_ROOT, 'data/raw')
const BASELINE_DIR = resolve(REPO_ROOT, 'build/sdlpal-baseline/maps')
const OUR_DIR = resolve(REPO_ROOT, 'build/m4-maps')
const DIFF_DIR = resolve(REPO_ROOT, 'build/m4-maps-diff')

for (const d of [BASELINE_DIR, OUR_DIR, DIFF_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

const sceneDir = resolve(REPO_ROOT, 'data/extracted/data/scene')
const sceneFiles = readdirSync(sceneDir)
  .filter((f) => f.endsWith('.json'))
  .sort((a, b) => parseInt(a) - parseInt(b))

interface SceneJson {
  sceneId: number
  mapNum: number
}

interface Report {
  sceneId: number
  mapNum: number
  status: 'pass' | 'fail' | 'sdlpal-fail' | 'render-fail'
  diff?: number
  err?: string
}

const reports: Report[] = []
const baselineCache = new Set<number>()
const sdlpalFailedMaps = new Set<number>()

console.log(`[M4 P3.T7] processing ${sceneFiles.length} scenes...`)

for (const f of sceneFiles) {
  const sceneJson = JSON.parse(
    readFileSync(resolve(sceneDir, f), 'utf-8'),
  ) as SceneJson
  const sceneId = sceneJson.sceneId
  const mapNum = sceneJson.mapNum

  const baselinePath = resolve(BASELINE_DIR, `${mapNum}.png`)
  const ourPath = resolve(OUR_DIR, `${sceneId}.png`)

  // 1. sdlpal baseline (dedupe by mapNum)
  if (!baselineCache.has(mapNum) && !sdlpalFailedMaps.has(mapNum)) {
    try {
      execFileSync(
        SDLPAL,
        ['--dump-map', String(mapNum), '--out', baselinePath],
        {
          cwd: GAME_DATA,
          stdio: 'pipe',
          timeout: 30_000,
        },
      )
      baselineCache.add(mapNum)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      sdlpalFailedMaps.add(mapNum)
      reports.push({ sceneId, mapNum, status: 'sdlpal-fail', err: msg.slice(0, 200) })
      continue
    }
  } else if (sdlpalFailedMaps.has(mapNum)) {
    // sdlpal already failed for this mapNum
    reports.push({ sceneId, mapNum, status: 'sdlpal-fail', err: 'same mapNum as prior sdlpal-fail' })
    continue
  }

  // 2. our render (import directly, no subprocess)
  try {
    renderTilemap({ sceneId, paletteId: 0, outPath: ourPath })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    reports.push({ sceneId, mapNum, status: 'render-fail', err: msg.slice(0, 200) })
    continue
  }

  // 3. pixel diff
  try {
    const baselineBuf = readFileSync(baselinePath)
    const ourBuf = readFileSync(ourPath)
    const baseline = PNG.sync.read(baselineBuf)
    const ours = PNG.sync.read(ourBuf)

    if (baseline.width !== ours.width || baseline.height !== ours.height) {
      reports.push({
        sceneId,
        mapNum,
        status: 'fail',
        err: `dim mismatch ${baseline.width}x${baseline.height} vs ${ours.width}x${ours.height}`,
      })
      continue
    }

    const diff = new PNG({ width: baseline.width, height: baseline.height })
    const numDiff = pixelmatch(
      baseline.data,
      ours.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: 0.1 },
    )

    if (numDiff > 100) {
      writeFileSync(resolve(DIFF_DIR, `${sceneId}.png`), PNG.sync.write(diff))
      reports.push({ sceneId, mapNum, status: 'fail', diff: numDiff })
    } else {
      reports.push({ sceneId, mapNum, status: 'pass', diff: numDiff })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    reports.push({ sceneId, mapNum, status: 'render-fail', err: msg.slice(0, 200) })
  }
}

const pass = reports.filter((r) => r.status === 'pass').length
const fail = reports.filter((r) => r.status === 'fail').length
const sdlpalFail = reports.filter((r) => r.status === 'sdlpal-fail').length
const renderFail = reports.filter((r) => r.status === 'render-fail').length
const total = reports.length
const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0'

console.log(
  `[M4 P3.T7] total ${total} | pass ${pass} (${passRate}%) | fail ${fail} | sdlpal-fail ${sdlpalFail} | render-fail ${renderFail}`,
)

writeFileSync(
  resolve(REPO_ROOT, 'build/m4-map-diff-report.json'),
  JSON.stringify(reports, null, 2),
)

// Generate KNOWN_DEVIATIONS.md
const failReports = reports.filter((r) => r.status !== 'pass')
const mdLines = [
  '# M4 KNOWN_DEVIATIONS',
  '',
  `> M4 P3.T7 全 ${total} scene sdlpal --dump-map vs render-tilemap 自动化 pixel diff 结果。`,
  `> 生成时间: ${new Date().toISOString()}`,
  '',
  `**Summary**: total ${total} | pass ${pass} (${passRate}%) | fail ${fail} | sdlpal-fail ${sdlpalFail} | render-fail ${renderFail}`,
  '',
  '## 失败 scene 清单',
  '',
  '| sceneId | mapNum | status | diff px | err |',
  '|---------|--------|--------|---------|-----|',
  ...failReports.map(
    (r) =>
      `| ${r.sceneId} | ${r.mapNum} | ${r.status} | ${r.diff ?? '-'} | ${(r.err ?? '-').replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\r/g, '').slice(0, 120)} |`,
  ),
  '',
  '## 处理建议',
  '',
  '- `fail` (像素 diff > 100): tilemap 渲染 bug,留 M5/M7 排查',
  '- `sdlpal-fail`: sdlpal --dump-map 该 mapNum 崩;可能 mapNum 数据异常,record skip',
  '- `render-fail`: render-tilemap.ts 崩;查 scene-N.json 数据是否完整',
  '',
  '## diff 图存放',
  '',
  '`build/m4-maps-diff/{sceneId}.png` — 仅 fail 场景生成',
  '',
  '## 原始报告',
  '',
  '`build/m4-map-diff-report.json`',
]

writeFileSync(
  resolve(REPO_ROOT, 'build/m4-map-diff.md'),
  mdLines.join('\n'),
)

console.log(`[M4 P3.T7] failures written to build/m4-map-diff.md`)
console.log(`[M4 P3.T7] full report at build/m4-map-diff-report.json`)
