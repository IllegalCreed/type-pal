import type { ReactNode, Ref } from 'react'

export function IsometricEditorSurface(props: {
  className?: 'center map-center' | 'stamp-content-editor'
  toolbar: ReactNode
  viewportRef?: Ref<HTMLDivElement>
  children: ReactNode
  overlay?: ReactNode
  footer?: ReactNode
}) {
  const className =
    props.className === 'center map-center'
      ? 'isometric-editor-surface center map-center'
      : props.className === 'stamp-content-editor'
        ? 'isometric-editor-surface stamp-content-editor'
        : 'isometric-editor-surface'
  return (
    <section className={className}>
      <header className="toolbar map-toolbar">{props.toolbar}</header>
      <div ref={props.viewportRef} className="viewport isometric-editor-surface__viewport">
        {props.children}
        {props.overlay}
      </div>
      {props.footer}
    </section>
  )
}
