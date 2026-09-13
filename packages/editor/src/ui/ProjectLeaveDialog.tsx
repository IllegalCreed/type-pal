import type { RefObject } from 'react'
import type { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import { DsButton, DsDialog } from './design-system/index.js'

export function ProjectLeaveDialog(props: {
  decision: NonNullable<ReturnType<ProjectLeaveGuard['getSnapshot']>['decision']>
  error: string
  fallbackFocusRef: RefObject<HTMLElement | null>
  onCancel: () => void
  onContinue: () => void
  onSave: () => void
}) {
  const ready = props.decision.phase === 'ready'
  return (
    <DsDialog
      open
      role="alertdialog"
      title={ready ? '已保存' : '有未保存的修改'}
      description={
        ready
          ? '当前修改已保存，可以继续操作。'
          : '继续新建或打开项目前，请先保存，或明确放弃当前修改。'
      }
      onClose={props.onCancel}
      fallbackFocusRef={props.fallbackFocusRef}
      footer={
        <>
          <DsButton autoFocus variant="secondary" onClick={props.onCancel}>
            {ready ? '返回编辑' : '取消'}
          </DsButton>
          <DsButton variant={ready ? 'primary' : 'danger'} onClick={props.onContinue}>
            {ready ? (props.decision.intent === 'new' ? '继续新建' : '继续打开') : '不保存并继续'}
          </DsButton>
          {!ready ? <DsButton onClick={props.onSave}>先保存</DsButton> : null}
        </>
      }
    >
      {props.error ? <p role="alert">{props.error}</p> : null}
    </DsDialog>
  )
}
