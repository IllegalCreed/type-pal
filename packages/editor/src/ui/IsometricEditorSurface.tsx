import type { ReactNode, Ref } from 'react'

export function IsometricEditorSurface(props: {
  className?: string
  toolbar: ReactNode
  toolbarClassName?: string
  viewportRef?: Ref<HTMLDivElement>
  viewportClassName?: string
  children: ReactNode
  overlay?: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className={`isometric-editor-surface${props.className ? ` ${props.className}` : ''}`}>
      <header
        className={`toolbar map-toolbar${props.toolbarClassName ? ` ${props.toolbarClassName}` : ''}`}
      >
        {props.toolbar}
      </header>
      <div
        ref={props.viewportRef}
        className={`viewport isometric-editor-surface__viewport${props.viewportClassName ? ` ${props.viewportClassName}` : ''}`}
      >
        {props.children}
        {props.overlay}
      </div>
      {props.footer}
    </section>
  )
}
