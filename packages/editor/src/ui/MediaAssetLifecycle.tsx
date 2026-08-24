import type { AssetId } from '@type-pal/content'
import { UpdateAssetLabelCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import {
  DsButton,
  DsDialog,
  DsDraftTextInput,
  DsField,
  DsPropertyGrid,
  DsPropertyRow,
} from './design-system/index.js'

/** 媒体资源名称的共享编辑合同：Enter/blur 提交，Escape 恢复，等值零命令。 */
export function MediaAssetNameField(props: {
  assetId: AssetId
  label?: string
  session: EditSession
}) {
  const committed = props.label ?? ''

  return (
    <DsField label="名称">
      {(control) => (
        <DsDraftTextInput
          {...control}
          draftKey={`asset:${props.assetId}:label`}
          syncToken={props.session.getHistoryVersion()}
          value={committed}
          placeholder="未命名"
          onCommit={(value) =>
            props.session.dispatch(new UpdateAssetLabelCommand(props.assetId, value))
          }
        />
      )}
    </DsField>
  )
}

/** 只承载媒体对象生命周期确认；导入/编码等领域弹窗不进入这里。 */
export function MediaAssetConfirmDialog(props: {
  open: boolean
  title: string
  objectLabel: string
  impact: string
  referenceCount: number | 'unknown'
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  confirmDisabled?: boolean
  busy?: boolean
  onConfirm(): void
  onClose(): void
}) {
  return (
    <DsDialog
      open={props.open}
      title={props.title}
      description="请核对目标与影响后再继续。"
      onClose={props.onClose}
      footer={
        <>
          <DsButton
            variant="secondary"
            autoFocus={props.confirmVariant === 'danger'}
            onClick={props.onClose}
          >
            取消
          </DsButton>
          <DsButton
            variant={props.confirmVariant ?? 'primary'}
            busy={props.busy}
            disabled={props.confirmDisabled}
            autoFocus={props.confirmVariant !== 'danger'}
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </DsButton>
        </>
      }
    >
      <DsPropertyGrid>
        <DsPropertyRow label="资源">{props.objectLabel}</DsPropertyRow>
        <DsPropertyRow label="影响">{props.impact}</DsPropertyRow>
        <DsPropertyRow label="引用">
          {props.referenceCount === 'unknown' ? '未知（扫描失败）' : `${props.referenceCount} 处`}
        </DsPropertyRow>
      </DsPropertyGrid>
    </DsDialog>
  )
}
