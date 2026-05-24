import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

export interface PixelDiffOptions {
  /** PNG buffer 来自 snapshotCanvas */
  actual: Buffer
  /** baseline 文件路径(`packages/game/e2e/baselines/<spec>/<case>.png`) */
  baselinePath: string
  /** pixelmatch threshold(0-1,0 严格) */
  threshold?: number
  /** 第一次跑 / 没 baseline 时:写 actual 为新 baseline */
  updateBaseline?: boolean
}

/**
 * pixelmatch wrapper:跟 baseline 比对,差异写 diff PNG。
 *
 * 返回 diff 像素数;0 = 完全一致;调用方可 `expect(diff).toBe(0)` 断言。
 * baseline 缺 + updateBaseline=true → 写 actual 为新 baseline + 返回 0(skip diff);
 * baseline 缺 + updateBaseline=false → throw(提示用户 --update-snapshots)。
 */
export async function pixelDiff(opts: PixelDiffOptions): Promise<number> {
  if (!existsSync(opts.baselinePath)) {
    if (opts.updateBaseline) {
      mkdirSync(dirname(opts.baselinePath), { recursive: true })
      writeFileSync(opts.baselinePath, opts.actual)
      return 0
    }
    throw new Error(
      `Baseline missing: ${opts.baselinePath}. Run with --update-snapshots to generate.`,
    )
  }

  const baseline = PNG.sync.read(readFileSync(opts.baselinePath))
  const actual = PNG.sync.read(opts.actual)

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `Size mismatch: baseline ${baseline.width}×${baseline.height} vs actual ${actual.width}×${actual.height}`,
    )
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height })
  const numDiff = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: opts.threshold ?? 0.1 },
  )

  if (numDiff > 0) {
    const diffPath = opts.baselinePath.replace(/\.png$/, '.diff.png')
    writeFileSync(diffPath, PNG.sync.write(diff))
    console.warn(`[pixel-diff] ${numDiff} diff pixels, diff PNG: ${diffPath}`)
  }

  return numDiff
}

/** 标准 baseline 路径:`packages/game/e2e/baselines/<group>/<id>.png` */
export function baselinePathFor(group: string, id: string): string {
  return resolve(HERE, '..', 'baselines', group, `${id}.png`)
}

/** sdlpal real baseline 路径:`build/sdlpal-baseline/battles/<file>.png` */
export function sdlpalBaselinePath(file: string): string {
  return resolve(HERE, '..', '..', '..', '..', 'build', 'sdlpal-baseline', 'battles', `${file}.png`)
}

export interface SdlpalDiffOptions {
  /** PNG buffer 来自 snapshotCanvas */
  actual: Buffer
  /** sdlpal baseline 文件名(不含 .png):如 fixture-zh1 / fixture-zh2 */
  baseline: string
  /** pixelmatch threshold(0-1,默认 0.1) */
  threshold?: number
}

/**
 * 与 sdlpal real baseline 对比。
 *
 * 返回 diff 像素占比(0-1);调用方可 `expect(pct).toBeLessThan(0.05)` 断言。
 * sdlpal baseline 是固定真值,不支持 updateBaseline。
 */
export async function sdlpalDiff(opts: SdlpalDiffOptions): Promise<number> {
  const baselinePath = sdlpalBaselinePath(opts.baseline)
  if (!existsSync(baselinePath)) {
    throw new Error(`sdlpal baseline missing: ${baselinePath}`)
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath))
  const actual = PNG.sync.read(opts.actual)

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `Size mismatch: baseline ${baseline.width}×${baseline.height} vs actual ${actual.width}×${actual.height}`,
    )
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height })
  const numDiff = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: opts.threshold ?? 0.1 },
  )

  const pct = numDiff / (baseline.width * baseline.height)

  if (numDiff > 0) {
    const diffPath = baselinePath.replace(/\.png$/, '.diff.png')
    writeFileSync(diffPath, PNG.sync.write(diff))
    console.warn(`[sdlpal-diff] ${numDiff} diff pixels (${(pct * 100).toFixed(2)}%), diff PNG: ${diffPath}`)
  }

  return pct
}
