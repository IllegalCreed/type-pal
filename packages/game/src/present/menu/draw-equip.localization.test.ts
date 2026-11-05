import { afterEach, beforeEach, expect, it } from 'vitest'
import { confirmEquipItem, createEquipMenu } from '../../core/menu/equip-menu.js'
import { setEnglishWordTable, setWordTable } from '../../core/word-lookup.js'
import { useFallbackLanguage } from '../../localization/language.js'
import { isolateLanguagePreference } from '../../localization/language.test-fixtures.js'
import { setEnglishLayout } from '../../localization/layout.js'
import { makeItem, makeLiveScene } from '../__tests__/menu-state-fixtures.js'
import { makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { solidIndexedImage as solidImage } from '../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../framebuffer.js'
import { SMALL_FONT } from '../small-font.js'
import { drawEquipMenu } from './draw-equip.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => {
  setWordTable([])
  setEnglishWordTable({})
  setEnglishLayout({})
  restoreLanguage()
})

it('fits the equipment role box to English names and restores the original Chinese width', () => {
  const words = Array<string>(40).fill('')
  words.splice(36, 4, '李逍遥', '赵灵儿', '林月如', '阿奴')
  setWordTable(words)
  setEnglishWordTable({ '36': 'Xiaoyao', '37': "Ling'er", '38': 'Yueru', '39': 'Ah Nu' })
  const { gs, roles } = makeLiveScene([0, 1])
  const hat = makeItem(100, 'Hat', { flags: { equipable: true } })
  gs.inventory = [{ itemId: hat.id, count: 1 }]
  const state = createEquipMenu(gs, [hat])
  confirmEquipItem(state, [hat])
  const frames = makeUiFrames()
  // SPRITEUI columns have widths 22,16,33. SDLPal's seven ASCII letters need
  // three content tiles: total103px; three Chinese glyphs need two: total87px.
  for (let row = 0; row < 3; row++) {
    for (const [col, width] of [22, 16, 33].entries()) {
      frames[row * 3 + col] = solidImage(width, 8, 0x11)
    }
  }
  const draw = () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    drawEquipMenu({
      fb,
      state,
      gs,
      playerRoles: roles,
      items: [hat],
      uiSpriteFrames: frames,
      glyphs: SMALL_FONT,
    })
    return fb.indices
  }
  useFallbackLanguage('en')
  const english = draw()
  expect([english[95 * 320 + 104], english[95 * 320 + 105]]).toEqual([0x11, 0x5a])
  useFallbackLanguage('zh-CN')
  const chinese = draw()
  expect([chinese[95 * 320 + 88], chinese[95 * 320 + 89]]).toEqual([0x11, 0x5a])
})
