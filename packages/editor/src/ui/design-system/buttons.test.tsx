// @vitest-environment jsdom
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsActionLink, DsButton, DsPressable } from './buttons.js'
import * as controls from './controls.js'
import * as root from './index.js'

describe('U01 button family', () => {
  test('keeps pressable, button and action-link identity with busy and default chrome', () => {
    expect(controls.DsPressable).toBe(DsPressable)
    expect(controls.DsButton).toBe(DsButton)
    expect(controls.DsActionLink).toBe(DsActionLink)
    expect(root.DsButton).toBe(DsButton)
    const pressableRef = createRef<HTMLButtonElement>()
    expect(
      renderToStaticMarkup(
        <DsPressable ref={pressableRef} className="tile">
          选中
        </DsPressable>,
      ),
    ).toBe('<button type="button" class="ds-pressable tile">选中</button>')
    expect(renderToStaticMarkup(<DsButton>保存</DsButton>)).toBe(
      '<button type="button" class="ds-button ds-button--secondary"><span>保存</span></button>',
    )
    expect(renderToStaticMarkup(<DsButton busy>保存</DsButton>)).toBe(
      '<button type="button" class="ds-button ds-button--secondary" disabled="" aria-busy="true"><span>处理中</span></button>',
    )
    expect(renderToStaticMarkup(<DsActionLink href="/preview">试放</DsActionLink>)).toBe(
      '<a href="/preview" class="ds-button ds-button--secondary"><span>试放</span></a>',
    )
  })
})
