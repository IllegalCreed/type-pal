#!/usr/bin/env tsx
/**
 * M4 P2 T1 辅助:扫 reference/sdlpal/ 所有 .c .h,grep MKF chunk 引用,
 * 按 MKF 文件分组输出 markdown 草稿。
 *
 * 用法:pnpm tsx packages/pal-extract/scripts/grep-sdlpal-chunks.ts > /tmp/sdlpal-chunks.md
 *
 * 注意:用 execFileSync(不用 execSync)防 shell injection。
 */
import { execFileSync } from 'node:child_process'

const MKFS = [
  'DATA', 'SSS', 'MGO', 'MAP', 'GOP', 'F', 'ABC', 'FBP',
  'PAT', 'STUFF', 'SAVE', 'RNG', 'RGM', 'BALL', 'FIRE', 'SOUNDS',
]

const sdlpalDir = 'reference/sdlpal'

for (const mkf of MKFS) {
  console.log(`\n## ${mkf}.MKF\n`)
  try {
    const pattern = `${mkf}\\.MKF|${mkf}MKF|fp${mkf}|f${mkf}\\b`
    const hits = execFileSync(
      'grep',
      ['-rnE', '--include=*.c', '--include=*.h', pattern, sdlpalDir],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    )
    console.log('```')
    console.log(hits.trim() || '(no hits)')
    console.log('```')
  }
  catch {
    console.log('(grep no hits)')
  }
}
