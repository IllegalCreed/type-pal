#!/usr/bin/env tsx
/**
 * AVI → mp4 离线转码流水线(M5.6 T18+T19)。
 *
 * 数据源:`data/raw/{1-6}.avi` —— Microsoft MPEG-4 v3(MP43) + MP3 audio,
 *         浏览器 <video> 元素不直接支持 MP43,必须离线 ffmpeg 转 H.264 mp4。
 *
 * memory 锚:[avi-offline-ffmpeg-to-mp4] —— aviplay.c 不 runtime port;
 *           走 ffmpeg 转 mp4 + game runtime <video> 播放。
 *
 * 用途映射(sdlpal 真值):
 *   1.avi — PAL_TrademarkScreen (main.c:197)
 *   2.avi — PAL_SplashScreen (main.c:237)
 *   3.avi — PAL_OpeningMenu new-game (uigame.c:162)
 *   4.avi — cutscene(具体场景待 audit)
 *   5.avi — cutscene
 *   6.avi — cutscene / 结局
 *
 * 转码参数:H.264 (libx264) + AAC,CRF 18(高质量,接近 lossless)+ preset slow
 *           (一次性 build 可接受 ~30s/AVI 转码代价);跨平台兼容性最广。
 *
 * 用法:`pnpm -F @type-pal/pal-extract extract:videos`
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')
const RAW = resolve(REPO_ROOT, 'data/raw')
const OUT_DIR = resolve(REPO_ROOT, 'data/extracted/videos')

const AVI_IDS = [1, 2, 3, 4, 5, 6] as const

interface ConvertResult {
  id: number
  rawSize: number
  mp4Size: number
  skipped: boolean
}

/**
 * 转一个 AVI → mp4。已存在且 mtime 新于 raw 时 skip(增量 build)。
 */
async function convertOne(id: number): Promise<ConvertResult> {
  const rawPath = resolve(RAW, `${id}.avi`)
  const mp4Path = resolve(OUT_DIR, `${id}.mp4`)
  if (!existsSync(rawPath)) {
    throw new Error(`AVI missing: ${rawPath}`)
  }
  const rawStat = statSync(rawPath)

  if (existsSync(mp4Path)) {
    const mp4Stat = statSync(mp4Path)
    if (mp4Stat.mtimeMs >= rawStat.mtimeMs && mp4Stat.size > 0) {
      return { id, rawSize: rawStat.size, mp4Size: mp4Stat.size, skipped: true }
    }
  }

  mkdirSync(OUT_DIR, { recursive: true })

  // ffmpeg H.264 + AAC,CRF 18 preset slow
  // -y 覆盖已存在;-loglevel error 静音冗余信息;只在出错时输出
  const args = [
    '-y',
    '-loglevel',
    'error',
    '-i',
    rawPath,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p', // 浏览器最广兼容
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart', // mp4 metadata 前置,允许流式开始播
    mp4Path,
  ]
  await execFileP('ffmpeg', args)

  const mp4Stat = statSync(mp4Path)
  if (mp4Stat.size === 0) {
    throw new Error(`ffmpeg produced empty output: ${mp4Path}`)
  }
  return { id, rawSize: rawStat.size, mp4Size: mp4Stat.size, skipped: false }
}

async function main(): Promise<void> {
  console.log('[extract-videos] start — ffmpeg AVI → mp4(H.264 CRF 18 preset slow + AAC 96k)')

  // ffmpeg 必须在 PATH;预 check 给清晰错误
  try {
    await execFileP('ffmpeg', ['-version'])
  } catch {
    console.error('[extract-videos] ERROR: ffmpeg 不在 PATH。')
    console.error('  macOS: brew install ffmpeg')
    console.error('  其他: 见 https://ffmpeg.org/download.html')
    process.exit(1)
  }

  const results: ConvertResult[] = []
  for (const id of AVI_IDS) {
    const r = await convertOne(id)
    results.push(r)
    if (r.skipped) {
      console.log(`[extract-videos] ${id}.avi → ${id}.mp4 (skipped, ${r.mp4Size}B 已最新)`)
    } else {
      const ratio = ((r.mp4Size / r.rawSize) * 100).toFixed(1)
      console.log(
        `[extract-videos] ${id}.avi (${r.rawSize}B) → ${id}.mp4 (${r.mp4Size}B, ${ratio}%)`,
      )
    }
  }

  console.log(`[extract-videos] done. output → ${OUT_DIR}`)
}

main().catch((err: unknown) => {
  console.error('[extract-videos] FAILED:', err)
  process.exit(1)
})
