// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { menuAssets } from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import type { BoxTiles } from './menu-box.js'
import { drawRewardGainLine } from './reward-gain.js'

function scrollTile(width: number, height: number): ImageBitmap {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#a29679'
  ctx.fillRect(0, 0, width, height)
  return Object.assign(canvas, { close() {} })
}

test('正式拾取提示在浅底卷轴上绘制黑字，字形相邻像素没有阴影', () => {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const menu = menuAssets()
  const scroll: BoxTiles = {
    tiles: [4, 26, 4].flatMap((height) => [8, 16, 8].map((width) => scrollTile(width, height))),
  }
  const cp = 0x83b7 // 获
  const bitmap = new Uint8Array(32)
  bitmap[0] = 0x80
  const glyph = { width: 16, height: 16, bitmap }
  const glyphs = {
    has: (codepoint: number) => codepoint === cp,
    get: (codepoint: number) => (codepoint === cp ? glyph : undefined),
  }

  // main.ts 的世界绘制读取当前提示，在 96 处画卷轴。
  drawRewardGainLine(ctx, { ...menu, scroll }, glyphs, '获得净衣符', 96)
  const rgb = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
  expect(rgb(128, 106)).toEqual([0, 0, 0, 255])
  expect([rgb(129, 106), rgb(128, 107), rgb(129, 107)]).toEqual(
    Array.from({ length: 3 }, () => [162, 150, 121, 255]),
  )
})
