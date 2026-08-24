import type { ActorDef, AssetCatalogV1, AssetId, PortraitSet } from '@type-pal/content'
import { useState } from 'react'
import {
  RemoveActorPortraitExpressionCommand,
  RemoveActorPortraitSetCommand,
  RenameActorPortraitExpressionCommand,
} from '../core/actor-dialogue-commands.js'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsButton, DsTextInput } from './design-system/index.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'

function ExpressionRow(props: {
  name: string
  asset: AssetId
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  onRename: (from: string, to: string) => void
  onSetAsset: (name: string, asset: AssetId) => void
  onRemove: (name: string) => void
  onOpenAsset?: (asset: AssetId) => void
}) {
  const { name, asset, catalog, reader, onRename, onSetAsset, onRemove, onOpenAsset } = props
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="pt-row">
      <DsTextInput
        className="pt-name"
        aria-label={`${name}表情名`}
        value={draft ?? name}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = draft?.trim()
          if (next && next !== name) onRename(name, next)
          setDraft(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <ImageAssetPicker
        value={asset}
        kind="portrait"
        catalog={catalog}
        reader={reader}
        onChange={(next) => {
          if (next) onSetAsset(name, next)
        }}
        ariaLabel={`${name}立绘`}
        onOpenAsset={onOpenAsset}
      />
      <DsButton
        title="删除此表情"
        onClick={() => onRemove(name)}
        size="compact"
        variant="secondary"
      >
        ✕
      </DsButton>
    </div>
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
  const available = Object.entries(catalog.assets).find(
    ([, record]) => record.kind === 'portrait',
  )?.[0]
  const dispatch = (next: PortraitSet | undefined): void => {
    try {
      session.dispatch(new UpdateActorCommand(actor.id, { portraits: next }))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const dispatchPortraitCommand = (command: {
    apply: (state: ReturnType<EditSession['getState']>) => ReturnType<EditSession['getState']>
    invert: (state: ReturnType<EditSession['getState']>) => ReturnType<EditSession['getState']>
    readonly label: string
  }): void => {
    try {
      session.dispatch(command)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const setExpressions = (expressions: Record<string, AssetId>): void => {
    if (!portraits) return
    dispatch(
      Object.keys(expressions).length
        ? { ...portraits, expressions }
        : { default: portraits.default },
    )
  }
  const newExpressionName = (): string => {
    const expressions = portraits?.expressions ?? {}
    let index = 1
    while (`表情${index}` in expressions) index++
    return `表情${index}`
  }

  return (
    <div className="section portrait-editor">
      <h4>
        对话立绘 <span className="hint2">主立绘 + 命名表情 · 均引用项目图片</span>
      </h4>
      {error ? <div className="cf-warn">{error}</div> : null}
      {portraits ? (
        <>
          <div className="pt-row portrait-main-row">
            <span className="pt-name pt-main">主（默认）</span>
            <ImageAssetPicker
              value={portraits.default}
              kind="portrait"
              catalog={catalog}
              reader={reader}
              onChange={(asset) => {
                if (asset) dispatch({ ...portraits, default: asset })
              }}
              ariaLabel="默认对话立绘"
              onOpenAsset={onOpenAsset}
            />
            <DsButton
              title="删除整个立绘组"
              onClick={() => dispatchPortraitCommand(new RemoveActorPortraitSetCommand(actor.id))}
              size="compact"
              variant="secondary"
            >
              ✕
            </DsButton>
          </div>
          {Object.entries(portraits.expressions ?? {}).map(([name, asset]) => (
            <ExpressionRow
              key={name}
              name={name}
              asset={asset}
              catalog={catalog}
              reader={reader}
              onOpenAsset={onOpenAsset}
              onRename={(from, to) => {
                dispatchPortraitCommand(
                  new RenameActorPortraitExpressionCommand(actor.id, from, to),
                )
              }}
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
          <DsButton
            onClick={() =>
              setExpressions({
                ...(portraits.expressions ?? {}),
                [newExpressionName()]: portraits.default,
              })
            }
            size="compact"
            variant="secondary"
          >
            ＋ 添加表情
          </DsButton>
        </>
      ) : (
        <div className="field">
          <div className="hint">（无立绘组——对话不会显示角色立绘）</div>
          <DsButton
            disabled={!available}
            title={available ? undefined : '请先在图片库导入 portrait'}
            onClick={() => {
              if (available) dispatch({ default: available })
            }}
            size="compact"
            variant="secondary"
          >
            ＋ 添加立绘组
          </DsButton>
        </div>
      )}
    </div>
  )
}
