import { describe, expect, it } from 'vitest'
import { sortFrameImageFiles } from './frame-animation-images.js'

const namedFile = (name: string): File => ({ name }) as File

describe('frame animation image sequence', () => {
  it('按自然文件名排序初始帧序列', () => {
    const sorted = sortFrameImageFiles([
      namedFile('frame-10.png'),
      namedFile('frame-2.png'),
      namedFile('frame-1.png'),
    ])
    expect(sorted.map((file) => file.name)).toEqual(['frame-1.png', 'frame-2.png', 'frame-10.png'])
  })
})
