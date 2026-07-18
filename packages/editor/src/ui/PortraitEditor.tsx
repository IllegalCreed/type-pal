import type { ActorDef, AssetCatalogV1, AssetId, PortraitSet } from '@type-pal/content'
import { useState } from 'react'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
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
      <input
        className="in pt-name"
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
      <button type="button" className="mini" title="删除此表情" onClick={() => onRemove(name)}>
        ✕
      </button>
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
  const portraits = actor.portraits
  const available = Object.entries(catalog.assets).find(
    ([, record]) => record.kind === 'portrait',
  )?.[0]
  const dispatch = (next: PortraitSet | undefined): void => {
    session.dispatch(new UpdateActorCommand(actor.id, { portraits: next }))
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
        对话立绘 <span className="hint2">主立绘 + 命名表情 · 均引用工程图片</span>
      </h4>
      {portraits ? (
        <>
          <div className="pt-row">
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
            <button
              type="button"
              className="mini"
              title="删除整个立绘组"
              onClick={() => dispatch(undefined)}
            >
              ✕
            </button>
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
                const expressions = { ...(portraits.expressions ?? {}) }
                if (to in expressions) return
                const value = expressions[from]!
                delete expressions[from]
                expressions[to] = value
                setExpressions(expressions)
              }}
              onSetAsset={(expression, assetId) =>
                setExpressions({ ...(portraits.expressions ?? {}), [expression]: assetId })
              }
              onRemove={(expression) => {
                const expressions = { ...(portraits.expressions ?? {}) }
                delete expressions[expression]
                setExpressions(expressions)
              }}
            />
          ))}
          <button
            type="button"
            className="tool"
            onClick={() =>
              setExpressions({
                ...(portraits.expressions ?? {}),
                [newExpressionName()]: portraits.default,
              })
            }
          >
            ＋ 添加表情
          </button>
        </>
      ) : (
        <div className="field">
          <div className="hint">（无立绘组——对话不会显示角色立绘）</div>
          <button
            type="button"
            className="tool"
            disabled={!available}
            title={available ? undefined : '请先在图片库导入 portrait'}
            onClick={() => {
              if (available) dispatch({ default: available })
            }}
          >
            ＋ 添加立绘组
          </button>
        </div>
      )}
    </div>
  )
}
