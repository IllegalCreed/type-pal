/**
 * D29 视觉对拍自动测试:
 * 把我方 render-tilemap.ts 的 scene 1 渲染结果与 sdlpal-classic headless map
 * dumper 出的 baseline PNG 逐像素 diff。
 *
 * - baseline 不存在 → skip + warn(开发机没编 sdlpal-classic 时,pnpm check 不 block)
 * - baseline 存在 + 像素一致 → pass(M2 渲染 100% 对上原版)
 * - baseline 存在 + 有像素差 → fail,报 diff bytes 数 + 首差异 offset
 *
 * **关键:不准 child_process / shell**,test 直接 import renderTilemap() 函数。
 */

import { describe, it, expect } from 'vitest'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { renderTilemap } from '../../scripts/render-tilemap.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/__tests__ → src → pal-extract → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const BASELINE_PNG = resolve(REPO_ROOT, 'build/sdlpal-baseline/maps/map-12.png')
const OUR_OUT_DIR = resolve(REPO_ROOT, 'build/render-tilemap-test')
const OUR_PNG = resolve(OUR_OUT_DIR, 'map-12.png')

describe('D29 tilemap baseline pixel diff', () => {
  it('scene 1 (mapNum 12) 与 sdlpal-classic baseline 逐像素一致', () => {
    if (!existsSync(BASELINE_PNG)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[D29 skip] baseline missing: ${BASELINE_PNG} —— 跑 bash scripts/extract-tilemap-baseline.sh 后启用`,
      )
      return
    }

    mkdirSync(OUR_OUT_DIR, { recursive: true })
    const r = renderTilemap({ sceneId: 1, outPath: OUR_PNG })
    expect(r.outPath).toBe(OUR_PNG)

    const baseline = PNG.sync.read(readFileSync(BASELINE_PNG))
    const ours = PNG.sync.read(readFileSync(OUR_PNG))

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
        `tilemap 与 baseline 不一致:${diffs} / ${total} bytes 不同(${pct}%);` +
          ` 首差异 byte offset = ${firstDiffOffset};` +
          ` baseline=${BASELINE_PNG},ours=${OUR_PNG}。` +
          ` 用 ImageMagick \`compare\` 看差异。`,
      )
    }
  }, 60_000)
})
