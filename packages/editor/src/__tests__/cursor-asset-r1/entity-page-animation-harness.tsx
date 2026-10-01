/**
 * EntityPageAnimationFields 合法挂载：受控 page 状态 + 属性网格宿主。
 */
import type { EntityPage, SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DsInspectorHost, DsPropertyGrid } from '../../ui/design-system/recipes.js'
import { EntityPageAnimationFields } from '../../ui/EntityPageAnimationEditor.js'

export interface MountedEntityPageAnimation {
  host: HTMLDivElement
  root: Root
  changes: Array<SpriteActionBinding | undefined>
  setSprite(next: SpriteDef | undefined): Promise<void>
  setPageIndex(next: number): Promise<void>
}

function Inner(props: {
  sprite: SpriteDef | undefined
  pageIndex: number
  changes: Array<SpriteActionBinding | undefined>
}) {
  const [page, setPage] = useState<EntityPage>({})
  return (
    <DsInspectorHost
      as="section"
      className="inspector entity-page-animation-c06"
      aria-label={`第 ${props.pageIndex + 1} 页默认动作`}
    >
      <DsPropertyGrid>
        <EntityPageAnimationFields
          page={page}
          sprite={props.sprite}
          draftScope={`entity-page-animation:c06:${props.pageIndex}`}
          syncToken={`c06-${props.pageIndex}-${props.sprite?.id ?? 'none'}`}
          onChange={(binding) => {
            props.changes.push(binding)
            setPage(binding ? { animation: binding } : {})
          }}
        />
      </DsPropertyGrid>
    </DsInspectorHost>
  )
}

export async function mountEntityPageAnimation(
  sprite: SpriteDef,
  pageIndex = 0,
): Promise<MountedEntityPageAnimation> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const changes: Array<SpriteActionBinding | undefined> = []
  let currentSprite: SpriteDef | undefined = sprite
  let currentPageIndex = pageIndex
  const rerender = async (): Promise<void> => {
    await act(async () => {
      root.render(
        <Inner
          key={`${currentPageIndex}:${currentSprite?.id ?? 'none'}`}
          sprite={currentSprite}
          pageIndex={currentPageIndex}
          changes={changes}
        />,
      )
    })
  }
  await rerender()
  return {
    host,
    root,
    changes,
    async setSprite(next) {
      currentSprite = next
      await rerender()
    },
    async setPageIndex(next) {
      currentPageIndex = next
      await rerender()
    },
  }
}

export async function unmountEntityPageAnimation(
  mounted: MountedEntityPageAnimation,
): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
