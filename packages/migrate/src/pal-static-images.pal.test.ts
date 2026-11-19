import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { loadPalStaticImages } from './pal-assets.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))

describe('PAL 静态图小头像真值', () => {
  test('仅生成 roleId 0..4 的五张真实 face，不登记盖罗娇透明槽', () => {
    const loaded = loadPalStaticImages(repo)
    const faces = loaded.binaries.filter((source) => source.record.kind === 'face')

    expect(loaded.report.faces).toBe(5)
    expect(loaded.report.faceBytes).toBe(10_324)
    expect(faces.map(({ id, record }) => [id, record.origin.ref])).toEqual([
      ['face.pal.li-xiaoyao', 'images/ui/frame-48.png'],
      ['face.pal.zhao-linger', 'images/ui/frame-49.png'],
      ['face.pal.lin-yueru', 'images/ui/frame-50.png'],
      ['face.pal.wu-hou', 'images/ui/frame-51.png'],
      ['face.pal.anu', 'images/ui/frame-52.png'],
    ])
  })
})
