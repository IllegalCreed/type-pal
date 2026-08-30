import type { ActorDef, AssetCatalogV1, AssetId, PortraitSet } from '@type-pal/content'
import { useMemo, useState } from 'react'
import {
  RemoveActorPortraitExpressionCommand,
  RemoveActorPortraitSetCommand,
  RenameActorPortraitExpressionCommand,
} from '../core/actor-dialogue-commands.js'
import type { Command } from '../core/commands.js'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  DsAddPickerDialog,
  DsDraftTextField,
  DsEmptyState,
  DsField,
  DsIconButton,
  DsRepeatRow,
  DsStatus,
  DsTag,
  DsWorkbenchSection,
} from './design-system/index.js'
import { ImageAssetPicker, ImageAssetThumbnail, imageAssets } from './ImageAssetPicker.js'

function nextExpressionName(portraits: PortraitSet): string {
  const expressions = portraits.expressions ?? {}
  let index = 1
  while (`表情${index}` in expressions) index++
  return `表情${index}`
}

function withExpressions(
  portraits: PortraitSet,
  expressions: Record<string, AssetId>,
): PortraitSet {
  return Object.keys(expressions).length
    ? { ...portraits, expressions }
    : { default: portraits.default }
}

function ExpressionRow(props: {
  actorId: string
  name: string
  asset: AssetId
  expressionNames: readonly string[]
  syncToken: number
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  onRename: (from: string, to: string) => boolean
  onSetAsset: (name: string, asset: AssetId) => void
  onRemove: (name: string) => void
  onOpenAsset?: (asset: AssetId) => void
}) {
  const {
    actorId,
    name,
    asset,
    expressionNames,
    syncToken,
    catalog,
    reader,
    onRename,
    onSetAsset,
    onRemove,
    onOpenAsset,
  } = props
  return (
    <DsRepeatRow density="default" className="portrait-entry">
      <DsDraftTextField
        name="actor-portrait-expression-name"
        label="表情名称"
        autoComplete="off"
        spellCheck={false}
        draftKey={`actor:${actorId}:portrait-expression:${name}:name`}
        syncToken={syncToken}
        value={name}
        validate={(value) => {
          const trimmed = value.trim()
          if (!trimmed) return '表情名称不能为空。'
          if (trimmed !== value) return '请删除表情名称首尾的空格。'
          if (trimmed !== name && expressionNames.includes(trimmed))
            return `已经存在表情“${trimmed}”。`
          return undefined
        }}
        onCommit={(value) => value === name || onRename(name, value)}
      />
      <DsField label="图片资源">
        {(field) => (
          <ImageAssetPicker
            id={field.id}
            value={asset}
            kind="portrait"
            catalog={catalog}
            reader={reader}
            onChange={(next) => {
              if (next) onSetAsset(name, next)
            }}
            ariaLabel={`${name}立绘图片`}
            onOpenAsset={onOpenAsset}
          />
        )}
      </DsField>
      <span className="portrait-entry__actions">
        <DsIconButton
          icon="delete"
          label={`删除表情“${name}”`}
          variant="danger"
          onClick={() => onRemove(name)}
        />
      </span>
    </DsRepeatRow>
  )
}

export function PortraitEditor(props: {
  actor: ActorDef
  session: EditSession
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  onOpenAsset?: (asset: AssetId) => void
}) {
  const { actor, session, catalog, reader, onOpenAsset } = props
  const [error, setError] = useState('')
  const portraits = actor.portraits
  const portraitAssets = useMemo(() => imageAssets(catalog, 'portrait'), [catalog])
  const pickerOptions = useMemo(
    () =>
      portraitAssets.map(({ id, record }) => ({
        id,
        label: record.label?.trim() || id,
        description: record.path,
        searchText: [record.path],
        leading: (
          <ImageAssetThumbnail
            asset={id}
            kind="portrait"
            reader={reader}
            revision={record.sha256}
            alt=""
            className="ds-add-picker-option__thumbnail"
          />
        ),
      })),
    [portraitAssets, reader],
  )

  const dispatch = (next: PortraitSet | undefined): boolean => {
    try {
      session.dispatch(new UpdateActorCommand(actor.id, { portraits: next }))
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return false
    }
  }
  const dispatchPortraitCommand = (command: Command): boolean => {
    try {
      session.dispatch(command)
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return false
    }
  }
  const setExpressions = (expressions: Record<string, AssetId>): void => {
    if (!portraits) return
    dispatch(withExpressions(portraits, expressions))
  }
  const expressionNames = Object.keys(portraits?.expressions ?? {})
  const pickerMode = portraits ? 'expression' : 'default'
  const pickerLabel = portraits ? '添加表情' : '设置主立绘'

  return (
    <DsWorkbenchSection
      className="actor-card portrait-editor"
      title="对话立绘"
      description="主立绘与命名表情均引用项目图片。"
      actions={
        <DsAddPickerDialog
          adoptionId="actor/portrait"
          triggerLabel={pickerLabel}
          title={pickerLabel}
          description={
            portraits
              ? '选择一张立绘图片并确认；新表情加入列表后可直接重命名或换图。'
              : '选择对话默认显示的主立绘图片并确认。'
          }
          confirmLabel={pickerLabel}
          options={pickerOptions}
          scopeKey={`actor:${actor.id}:portrait:${pickerMode}`}
          revision={session.getHistoryVersion()}
          emptyMessage="项目中没有可用的立绘图片，请先在图片库导入 portrait 资源。"
          searchLabel="搜索立绘图片"
          onConfirm={(assetId) => {
            const state = session.getState()
            const latestActor = state.actors.find((candidate) => candidate.id === actor.id)
            const record = state.assetCatalog.assets[assetId]
            if (!latestActor || record?.kind !== 'portrait') return false
            if (pickerMode === 'default') {
              if (latestActor.portraits) return false
              session.dispatch(
                new UpdateActorCommand(actor.id, { portraits: { default: assetId } }),
              )
              setError('')
              return
            }
            if (!latestActor.portraits) return false
            const expression = nextExpressionName(latestActor.portraits)
            session.dispatch(
              new UpdateActorCommand(actor.id, {
                portraits: withExpressions(latestActor.portraits, {
                  ...(latestActor.portraits.expressions ?? {}),
                  [expression]: assetId,
                }),
              }),
            )
            setError('')
          }}
        />
      }
    >
      {error ? <DsStatus tone="error">{error}</DsStatus> : null}
      {portraits ? (
        <div className="portrait-editor__list">
          <DsRepeatRow density="default" className="portrait-entry portrait-entry--default">
            <div className="portrait-entry__identity">
              <span className="portrait-entry__caption">用途</span>
              <span className="portrait-entry__title">
                <strong>主立绘</strong>
                <DsTag tone="neutral">默认</DsTag>
              </span>
            </div>
            <DsField label="图片资源">
              {(field) => (
                <ImageAssetPicker
                  id={field.id}
                  value={portraits.default}
                  kind="portrait"
                  catalog={catalog}
                  reader={reader}
                  onChange={(asset) => {
                    if (asset) dispatch({ ...portraits, default: asset })
                  }}
                  ariaLabel="默认对话立绘图片"
                  onOpenAsset={onOpenAsset}
                />
              )}
            </DsField>
            <span className="portrait-entry__actions">
              <DsIconButton
                icon="delete"
                label="删除整个对话立绘组"
                variant="danger"
                onClick={() => dispatchPortraitCommand(new RemoveActorPortraitSetCommand(actor.id))}
              />
            </span>
          </DsRepeatRow>
          {Object.entries(portraits.expressions ?? {}).map(([name, asset]) => (
            <ExpressionRow
              key={name}
              actorId={actor.id}
              name={name}
              asset={asset}
              expressionNames={expressionNames}
              syncToken={session.getHistoryVersion()}
              catalog={catalog}
              reader={reader}
              onOpenAsset={onOpenAsset}
              onRename={(from, to) =>
                dispatchPortraitCommand(
                  new RenameActorPortraitExpressionCommand(actor.id, from, to),
                )
              }
              onSetAsset={(expression, assetId) =>
                setExpressions({ ...(portraits.expressions ?? {}), [expression]: assetId })
              }
              onRemove={(expression) =>
                dispatchPortraitCommand(
                  new RemoveActorPortraitExpressionCommand(actor.id, expression),
                )
              }
            />
          ))}
        </div>
      ) : (
        <DsEmptyState
          layout="embedded"
          title="暂无对话立绘"
          description={
            portraitAssets.length
              ? '点击右上角“设置主立绘”选择图片。'
              : '请先在图片库导入 portrait 资源。'
          }
        />
      )}
    </DsWorkbenchSection>
  )
}
