// @vitest-environment node
// @ts-expect-error -- Node-only audit dependency; the editor does not ship jsdom declarations.
import { JSDOM } from 'jsdom'
import { describe, expect, test } from 'vitest'
// @ts-expect-error -- The development audit is plain JavaScript outside the product TS project.
import { requiredTargetClasses } from '../../../scripts/selector-prefilter.mjs'

describe('audit selector prefilter (necessary conditions only)', () => {
  test('extracts only target classes, not ancestor or sibling classes', () => {
    expect(requiredTargetClasses('.ancestor > section.owner.active#main')).toEqual([
      'owner',
      'active',
    ])
    expect(requiredTargetClasses('.before + .next')).toEqual(['next'])
    expect(requiredTargetClasses('.before~*.next')).toEqual(['next'])
    expect(requiredTargetClasses('#main')).toEqual([])
    expect(requiredTargetClasses('.ancestor div')).toEqual([])
    expect(requiredTargetClasses('.--owner._part-2')).toEqual(['--owner', '_part-2'])
  })

  test('never interprets classes inside complex or escaped selectors', () => {
    for (const selector of [
      ':is(.a, .b)',
      ':where(.a) > .b',
      ':not(.a)',
      '.a:has(.b)',
      '[class="a"]',
      '[data-value=".a"] .b',
      '.a, .b',
      '.a:hover',
      '.a\\:b',
      '.\\31 23',
      '.中文',
      'svg|a.b',
      '& .b',
    ])
      expect(requiredTargetClasses(selector)).toEqual([])
  })

  test('filtered matching stays identical to native matching across DOM contexts', () => {
    const dom = new JSDOM(
      '<!doctype html><section id="main" class="ancestor A"><div class="before owner"></div><div class="owner active" data-value=".missing"><span class="child"></span></div><div class="next"></div></section>',
    )
    try {
      const selectors = [
        '.owner',
        '.absent',
        '.owner.active',
        '.ancestor > .owner',
        '.ancestor .child',
        '.before + .owner',
        '.before ~ .next',
        'div.owner',
        '*.active',
        '#main.A',
        '.A',
        '.a',
        '.ancestor div',
        '#main',
        '.child.owner',
        '.owner .child',
        ':is(.owner, .next)',
        ':where(.owner) > .child',
        '.owner:not(.absent)',
        '.owner:has(.child)',
        '[data-value=".missing"]',
        '.owner, .next',
        '.owner:nth-child(2)',
        '.owner:hover',
        '.a\\:b',
        '.中文',
      ]
      expect(dom.window.document.compatMode).toBe('CSS1Compat')
      for (const element of dom.window.document.querySelectorAll('*')) {
        const classes = new Set(element.classList)
        for (const selector of selectors) {
          const native = element.matches(selector)
          const filtered =
            requiredTargetClasses(selector).every((token: string) => classes.has(token)) &&
            element.matches(selector)
          expect(filtered, `${element.outerHTML}: ${selector}`).toBe(native)
        }
      }
    } finally {
      dom.window.close()
    }
  })
})
