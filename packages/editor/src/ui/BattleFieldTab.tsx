/** 战场作者工作台：目录、结构化属性、预览与全域引用分区。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type BattleFieldDef,
  DEFAULT_BATTLE_FIELD_ID,
  type ElementVec,
} from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { loadBattleBg, loadStandardPalette } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type BlockingBattleFieldReference,
  battleFieldReferences,
} from '../core/battle-field-references.js'
import {
  AddBattleFieldCommand,
  BattleFieldInUseError,
  type BattleFieldPatch,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import {
  DsButton,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsField,
  DsTag,
  DsTextInput,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsObjectHero,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'

const ELEM_LABEL: Record<keyof ElementVec, string> = {
  wind: '风',
  thunder: '雷',
  water: '水',
  fire: '火',
  earth: '土',
}

const EMPTY_MAGIC_EFFECT: ElementVec = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }

function fieldTitle(field: BattleFieldDef): string {
  return field.name?.trim() || `战场 #${String(field.id).padStart(3, '0')}`
}

function FieldPreview(props: { assetBase: AssetBase; field: BattleFieldDef }) {
  const { assetBase, field } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (!field.background) {
          canvasRef.current?.getContext('2d')?.clearRect(0, 0, 320, 200)
          if (alive) setError('')
          return
        }
        const palette = await loadStandardPalette(assetBase)
        const background = await loadBattleBg(assetBase, field.background, palette)
        if (!alive || !canvasRef.current) return
        const context = canvasRef.current.getContext('2d')
        if (!context) return
        context.imageSmoothingEnabled = false
        context.clearRect(0, 0, 320, 200)
        context.drawImage(background, 0, 0, 320, 200)
        setError('')
      } catch (cause) {
        if (!alive) return
        canvasRef.current?.getContext('2d')?.clearRect(0, 0, 320, 200)
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, field.background])
  return (
    <div className="bf-preview-frame">
      <canvas ref={canvasRef} width={320} height={200} className="bf-tab-preview" />
      {!field.background ? (
        <div className="bf-preview-empty">黑底战场</div>
      ) : error ? (
        <div className="bf-preview-error">背景加载失败：{error}</div>
      ) : null}
    </div>
  )
}

export function BattleFieldTab(props: {
  battleFields: BattleFieldDef[]
  assetBase: AssetBase
  session: EditSession
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  onOpenImage?: (asset: AssetId) => void
  onOpenBattleFieldReference?: (reference: BlockingBattleFieldReference) => void
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  scriptState?: ScriptEditorState
}) {
  const {
    battleFields,
    assetBase,
    session,
    assetCatalog,
    assetReader,
    onOpenImage,
    onOpenBattleFieldReference,
    focusObjectId,
    onObjectFocus,
    scriptState,
  } = props
  const sorted = useMemo(
    () => [...battleFields].sort((left, right) => left.id - right.id),
    [battleFields],
  )
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState<number | undefined>(sorted[0]?.id)
  const [creating, setCreating] = useState(false)
  const [draftId, setDraftId] = useState(String(nextBattleFieldId(sorted)))
  const [draftName, setDraftName] = useState('')
  const [notice, setNotice] = useState<string>()
  const shown = useMemo(
    () =>
      sorted.filter(
        (field) =>
          !filter ||
          String(field.id).includes(filter) ||
          String(field.id).padStart(3, '0').includes(filter) ||
          (field.name ?? '').toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
      ),
    [filter, sorted],
  )
  const field = sorted.find((candidate) => candidate.id === selId) ?? shown[0]
  const references = useMemo(
    () =>
      field
        ? battleFieldReferences(session.getState(), field.id, scriptState)
        : ([] as BlockingBattleFieldReference[]),
    [field, scriptState, session],
  )
  const hasDefault = battleFields.some((candidate) => candidate.id === DEFAULT_BATTLE_FIELD_ID)

  useEffect(() => {
    const parsed = focusObjectId === undefined ? undefined : Number(focusObjectId)
    if (parsed !== undefined && sorted.some((candidate) => candidate.id === parsed)) {
      setSelId(parsed)
      setCreating(false)
    }
  }, [focusObjectId, sorted])

  useEffect(() => {
    if (creating || (selId !== undefined && sorted.some((candidate) => candidate.id === selId)))
      return
    const next = sorted[0]?.id
    setSelId(next)
    onObjectFocus?.(next === undefined ? undefined : String(next))
  }, [creating, onObjectFocus, selId, sorted])

  const selectField = (id: number): void => {
    setCreating(false)
    setNotice(undefined)
    setSelId(id)
    onObjectFocus?.(String(id))
  }
  const beginCreate = (): void => {
    setCreating(true)
    setDraftId(String(nextBattleFieldId(sorted)))
    setDraftName('')
    setNotice(undefined)
    onObjectFocus?.(undefined)
  }
  const create = (): void => {
    const id = Number(draftId)
    if (!Number.isSafeInteger(id) || id < 0) {
      setNotice('编号必须是非负安全整数。')
      return
    }
    try {
      session.dispatch(
        new AddBattleFieldCommand({
          id,
          ...(draftName.trim() ? { name: draftName.trim() } : {}),
          screenWave: 0,
          magicEffect: { ...EMPTY_MAGIC_EFFECT },
        }),
      )
      selectField(id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }
  const patch = (value: BattleFieldPatch): void => {
    if (field) session.dispatch(new UpdateBattleFieldCommand(field.id, value))
  }
  const copy = (): void => {
    if (!field) return
    const id = nextBattleFieldId(sorted)
    session.dispatch(new CopyBattleFieldCommand(field.id, id))
    selectField(id)
  }
  const remove = (): void => {
    if (!field || !window.confirm(`删除“${fieldTitle(field)}”？此操作可以撤销。`)) return
    try {
      session.dispatch(new DeleteBattleFieldCommand(field.id))
      setNotice(undefined)
    } catch (error) {
      if (error instanceof BattleFieldInUseError)
        setNotice(`仍有 ${error.references.length} 处引用，请先从右侧引用列表处理。`)
      else setNotice(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <div className="outliner outliner--split data-outliner bf-outliner">
        <DsCatalogControls
          title="战场"
          count={battleFields.length}
          unit="个"
          actions={[
            { id: 'create-battlefield', label: '新建战场', icon: 'add', onClick: beginCreate },
            {
              id: 'copy-battlefield',
              label: '复制当前战场',
              icon: 'copy',
              disabled: !field,
              onClick: copy,
            },
          ]}
          search={{
            'aria-label': '搜索战场',
            placeholder: '搜索编号或名称',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        {!hasDefault ? (
          <DsButton variant="secondary" className="bf-default-warning" onClick={beginCreate}>
            缺少项目默认战场 #024
          </DsButton>
        ) : null}
        <div className="tree bf-catalog">
          {shown.map((candidate) => (
            <DsCatalogRow
              key={candidate.id}
              selected={!creating && field?.id === candidate.id}
              title={candidate.name || '未命名战场'}
              meta={`#${String(candidate.id).padStart(3, '0')}`}
              trailing={
                candidate.id === DEFAULT_BATTLE_FIELD_ID ? <DsTag tone="neutral">默认</DsTag> : null
              }
              onClick={() => selectField(candidate.id)}
            />
          ))}
          {!shown.length && !creating ? <div className="insp-empty">没有匹配的战场。</div> : null}
        </div>
      </div>

      <div className="canvas-wrap data-body bf-workbench">
        <main className="bf-main ds-object-workspace">
          {notice ? (
            <div className="bf-notice" role="alert">
              {notice}
            </div>
          ) : null}
          {creating ? (
            <div className="bf-editor-scroll ds-object-workspace__content">
              <section className="bf-create-card">
                <p className="eyebrow">新建战场</p>
                <h2>先确定稳定编号与名称</h2>
                <p>
                  空项目建议保留 #024 作为项目默认战场。编号提交后不可修改，但可以撤销本次创建。
                </p>
                <div className="bf-create-grid">
                  <DsField label="编号">
                    {({ id }) => (
                      <DsTextInput
                        id={id}
                        monospace
                        value={draftId}
                        onChange={(event) => setDraftId(event.target.value)}
                      />
                    )}
                  </DsField>
                  <DsField label="名称">
                    {({ id }) => (
                      <DsTextInput
                        id={id}
                        value={draftName}
                        placeholder="例如：林间空地"
                        onChange={(event) => setDraftName(event.target.value)}
                      />
                    )}
                  </DsField>
                </div>
                <div className="bf-create-actions">
                  <DsButton variant="primary" onClick={create}>
                    创建战场
                  </DsButton>
                  <DsButton variant="secondary" onClick={() => setCreating(false)}>
                    取消
                  </DsButton>
                </div>
              </section>
            </div>
          ) : field ? (
            <>
              <DsObjectHero
                eyebrow="战场"
                title={fieldTitle(field)}
                objectId={`#${String(field.id).padStart(3, '0')}`}
                summary="负责战斗画面与环境参数；角色、敌人的站位仍由各自战斗数据管理。"
                actions={
                  <DsButton variant="danger" icon="delete" onClick={remove}>
                    删除战场
                  </DsButton>
                }
              />

              <div className="bf-editor-scroll ds-object-workspace__content">
                <DsWorkbenchSection
                  title="身份与背景"
                  description="配置战场名称及战斗画面使用的背景图像。"
                  contentClassName="bf-identity-card"
                >
                  <div className="bf-preview-column">
                    <FieldPreview assetBase={assetBase} field={field} />
                  </div>
                  <div className="bf-card-fields">
                    <DsField label="名称">
                      {({ id }) => (
                        <DsDraftTextInput
                          id={id}
                          draftKey={`battlefield:${field.id}:name`}
                          syncToken={session.getHistoryVersion()}
                          value={field.name ?? ''}
                          placeholder="未命名战场"
                          onCommit={(value) => patch({ name: value || undefined })}
                        />
                      )}
                    </DsField>
                    <DsField label="背景图像" help="不配置背景时，运行时明确显示黑底。">
                      <ImageAssetPicker
                        value={field.background}
                        kind="battle-background"
                        catalog={assetCatalog}
                        reader={assetReader}
                        allowUnset
                        showThumbnail
                        ariaLabel={`战场 ${field.id} 背景`}
                        onOpenAsset={onOpenImage}
                        onChange={(background) => patch({ background })}
                      />
                    </DsField>
                  </div>
                </DsWorkbenchSection>

                <div className="bf-card-grid">
                  <DsWorkbenchSection
                    eyebrow="环境演出"
                    title="常驻波动"
                    description="控制战场画面的持续波动；0 表示关闭。"
                  >
                    <DsField label="强度">
                      {({ id }) => (
                        <DsDraftNumberInput
                          id={id}
                          monospace
                          draftKey={`battlefield:${field.id}:screenWave`}
                          syncToken={session.getHistoryVersion()}
                          value={field.screenWave}
                          onCommit={(value) => patch({ screenWave: value ?? 0 })}
                        />
                      )}
                    </DsField>
                  </DsWorkbenchSection>
                  <DsWorkbenchSection
                    eyebrow="法术环境"
                    title="五灵修正"
                    description="负数削弱、正数增强；直接参与法术伤害修正。"
                  >
                    <div className="bf-elements">
                      {(Object.keys(ELEM_LABEL) as (keyof ElementVec)[]).map((key) => (
                        <DsField key={key} label={ELEM_LABEL[key]}>
                          {({ id }) => (
                            <DsDraftNumberInput
                              id={id}
                              monospace
                              min={-10}
                              max={10}
                              enforceRange={false}
                              draftKey={`battlefield:${field.id}:magicEffect.${key}`}
                              syncToken={session.getHistoryVersion()}
                              value={field.magicEffect[key]}
                              onCommit={(value) =>
                                patch({
                                  magicEffect: {
                                    ...field.magicEffect,
                                    [key]: value ?? 0,
                                  },
                                })
                              }
                            />
                          )}
                        </DsField>
                      ))}
                    </div>
                  </DsWorkbenchSection>
                </div>
              </div>
            </>
          ) : (
            <div className="bf-editor-scroll ds-object-workspace__content">
              <section className="bf-empty-state">
                <span aria-hidden="true">🏞️</span>
                <h2>还没有战场</h2>
                <p>创建第一项会同时登记 content/battle-fields.json，并预填项目默认编号 #024。</p>
                <DsButton variant="primary" onClick={beginCreate}>
                  创建第一个战场
                </DsButton>
              </section>
            </div>
          )}
        </main>
      </div>

      <aside className="inspector bf-reference-panel">
        <header>
          <p className="eyebrow">引用</p>
          <h3>{field ? fieldTitle(field) : '选择一个战场'}</h3>
        </header>
        {field ? (
          <DsReferencePanel
            state={references.length ? 'ready' : 'empty'}
            count={{ kind: 'exact', value: references.length }}
            impact={{
              kind: 'blocking',
              description: references.length
                ? '删除会被任意引用阻断；先跳转处理，再回到这里删除。'
                : '当前战场可以安全删除。',
            }}
          >
            {references.length ? (
              <DsReferenceList>
                {references.map((reference) => (
                  <DsReferenceRow
                    key={`${reference.kind}:${reference.where}`}
                    title={reference.label}
                    path={reference.where}
                    labels={[
                      {
                        label:
                          reference.kind === 'project-default'
                            ? '系统默认'
                            : reference.kind === 'scene-default'
                              ? '场景默认'
                              : reference.kind === 'hostile'
                                ? '敌对实体'
                                : '剧情开战',
                      },
                    ]}
                    action={
                      reference.locator && onOpenBattleFieldReference
                        ? {
                            label: '打开',
                            onActivate: () => onOpenBattleFieldReference(reference),
                          }
                        : undefined
                    }
                    status={
                      reference.locator && onOpenBattleFieldReference
                        ? undefined
                        : {
                            label: '暂不可定位',
                            reason: '当前没有可编辑的精确位置。',
                            tone: 'warning',
                          }
                    }
                  />
                ))}
              </DsReferenceList>
            ) : null}
          </DsReferencePanel>
        ) : (
          <div className="insp-empty">选择一个战场查看引用。</div>
        )}
      </aside>
    </>
  )
}
