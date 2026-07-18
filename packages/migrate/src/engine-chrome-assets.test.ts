import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..')
const assets = resolve(repo, 'packages/reforge/src/engine-chrome/assets')
const hash = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex')

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(root, entry.name)
      return entry.isDirectory() ? files(path) : [path]
    })
    .sort()
}

describe('engine chrome frozen assets', () => {
  test('85 个 UI 文件的路径相关聚合 hash 与字节数不漂移', () => {
    const ui = resolve(assets, 'ui')
    const pngs = files(ui).filter((path) => path.endsWith('.png'))
    const bytes = pngs.reduce((sum, path) => sum + statSync(path).size, 0)
    const digest = hash(
      pngs
        .map((path) => `${hash(readFileSync(path))}  ${relative(ui, path).split(sep).join('/')}\n`)
        .join(''),
    )
    expect({ files: pngs.length, bytes, digest }).toEqual({
      files: 85,
      bytes: 48_629,
      digest: '5e5315f85945b35e9df2ae3a205d0d6fcd4faaa524c12082b6ba91ff55888485',
    })
  })

  test('标题、光标、Unifont 与官方许可冻结 hash', () => {
    expect(hash(readFileSync(resolve(assets, 'title.png')))).toBe(
      'fbb076141f96317ec7c57c71c0149956272fd136f502d70e5582b9b1412cd63a',
    )
    expect(hash(readFileSync(resolve(assets, 'dialog-icons-raw.json')))).toBe(
      '1fff713c4acc0b88c7cfe32c0cb20e5a28fb20b2aa6a67882aa8bacb2a64e7f9',
    )
    expect(hash(readFileSync(resolve(repo, 'data/raw/unifont-cn.bdf')))).toBe(
      '1ab843ec8d2540a702974044f9a4a3acb8bb91bb9dfc1ec10605c7ce813f02bd',
    )
    expect(hash(readFileSync(resolve(assets, 'licenses/OFL-1.1.txt')))).toBe(
      '869692af094c57fb7258c57fe26820c759319603321d0ffeb278de3651763ded',
    )
    expect(hash(readFileSync(resolve(assets, 'licenses/COPYING')))).toBe(
      '5a65797606332f2f63057fd81ea0ff35f74043583515bf900ee9b42efa8176a6',
    )
  })
})
