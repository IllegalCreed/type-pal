import { expect, test } from 'vitest'
import { assertEngineChromeComplete, ENGINE_CHROME, ENGINE_CHROME_UI_SLOTS } from './registry.js'

test('打包的 85 个引擎 UI 槽唯一，实际目录无缺少和多余项', () => {
  expect(ENGINE_CHROME_UI_SLOTS).toHaveLength(85)
  expect(new Set(ENGINE_CHROME_UI_SLOTS).size).toBe(85)
  expect(() => assertEngineChromeComplete()).not.toThrow()
})

test('引擎标题、光标、字体及许可的 Vite 开发地址指向各自内置文件', () => {
  const backingFiles = [
    ['fontBdf', '/data/raw/unifont-cn.bdf'],
    ['dialogCursor', '/engine-chrome/assets/dialog-icons-raw.json'],
    ['defaultTitle', '/engine-chrome/assets/title.png'],
    ['provenance', '/engine-chrome/assets/PROVENANCE.md'],
    ['unifontOfl', '/engine-chrome/assets/licenses/OFL-1.1.txt'],
    ['unifontCopying', '/engine-chrome/assets/licenses/COPYING'],
  ] as const satisfies ReadonlyArray<readonly [keyof typeof ENGINE_CHROME, string]>
  expect(backingFiles.map(([role]) => role).sort()).toEqual(Object.keys(ENGINE_CHROME).sort())
  for (const [role, path] of backingFiles) {
    const pathname = decodeURI(new URL(ENGINE_CHROME[role]).pathname)
    expect(pathname.endsWith(path), role).toBe(true)
  }
})
