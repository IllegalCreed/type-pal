/**
 * D29 视觉对拍自动测试(多场景):
 * 把我方 render-tilemap.ts 的各 scene 渲染结果与 sdlpal-classic headless map
 * dumper 出的 baseline PNG 逐像素 diff。
 *
 * - baseline 不存在 → skip + warn(开发机没编 sdlpal-classic 时,pnpm check 不 block)
 * - baseline 存在 + 像素一致 → pass(M2 渲染 100% 对上原版)
 * - baseline 存在 + 有像素差 → fail,报 diff bytes 数 + 首差异 offset
 *
 * **关键:不准 child_process / shell**,test 直接 import renderTilemap() 函数。
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { renderTilemap } from '../../scripts/render-tilemap.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/__tests__ → src → pal-extract → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const BASELINE_DIR = resolve(REPO_ROOT, 'build/sdlpal-baseline/maps')
const OUR_OUT_DIR = resolve(REPO_ROOT, 'build/render-tilemap-test')

const SCENES = [
  { sceneId: 1, mapNum: 12, name: 'scene-1-客栈' },
  { sceneId: 14, mapNum: 3, name: 'scene-14-仙灵岛入口' },
  { sceneId: 15, mapNum: 7, name: 'scene-15-仙灵岛通道-1' },
  { sceneId: 16, mapNum: 119, name: 'scene-16-仙灵岛通道-2-明雷草妖' },
  { sceneId: 17, mapNum: 6, name: 'scene-17-仙灵岛迷宫' },
]

describe('D29 tilemap baseline pixel diff(多场景)', () => {
  for (const { sceneId, mapNum, name } of SCENES) {
    const mapFile = `map-${mapNum.toString().padStart(2, '0')}.png`
    const baselinePath = resolve(BASELINE_DIR, mapFile)
    const ourPath = resolve(OUR_OUT_DIR, mapFile)

    it(`${name}(scene ${sceneId} / mapNum ${mapNum}) 与 sdlpal-classic baseline 逐像素一致`, () => {
      if (!existsSync(baselinePath)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[D29 skip] baseline missing: ${baselinePath} —— 跑 bash scripts/extract-tilemap-baseline.sh 后启用`,
        )
        return
      }

      mkdirSync(OUR_OUT_DIR, { recursive: true })
      const r = renderTilemap({ sceneId, outPath: ourPath })
      expect(r.outPath).toBe(ourPath)

      const baseline = PNG.sync.read(readFileSync(baselinePath))
      const ours = PNG.sync.read(readFileSync(ourPath))

      expect(ours.width).toBe(baseline.width)
      expect(ours.height).toBe(baseline.height)
      expect(ours.data.length).toBe(baseline.data.length)

      let diffs = 0
      let firstDiffOffset = -1
      for (let i = 0; i < baseline.data.length; i++) {
        if (baseline.data[i] !== ours.data[i]) {
          diffs++
          if (firstDiffOffset === -1) firstDiffOffset = i
        }
      }

      if (diffs > 0) {
        const total = baseline.data.length
        const pct = ((diffs / total) * 100).toFixed(3)
        throw new Error(
          `tilemap 与 baseline 不一致(${name}):${diffs} / ${total} bytes 不同(${pct}%);` +
            ` 首差异 byte offset = ${firstDiffOffset};` +
            ` baseline=${baselinePath},ours=${ourPath}。` +
            ` 用 ImageMagick \`compare\` 看差异。`,
        )
      }
    }, 60_000)
  }
})
