import type {
  AssetCatalogV1,
  AuthorDialogueCue,
  Command,
  DialogueCue,
  DialogueIdentity,
  Locale,
} from '@type-pal/content'
import { type ActorDef, lookupText } from '@type-pal/content'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { JsonForm, Num, Row, Sel, Txt } from './command-form-controls.js'
import {
  DsActionGroup,
  DsButton,
  DsCheckbox,
  DsIconButton,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelect,
  DsTextArea,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'

type DialogueCommand = Extract<Command, { kind: 'dialog' }>

export interface DialogueCommandFormProps {
  command: DialogueCommand
  locale: Locale
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  actors?: Record<string, ActorDef>
  onOpenImage?: (id: string) => void
  onDialogueSpeakerOverrideChange?: (text: string) => void
  showRawJson: boolean
  reorderScopeKey: string
  onChange: (next: Command) => void
}

/** Owns the complete dialog command family without receiving unrelated command-form context. */
export function DialogueCommandForm(props: DialogueCommandFormProps) {
  const {
    command,
    locale,
    assetCatalog,
    assetReader,
    actors,
    onOpenImage,
    onDialogueSpeakerOverrideChange,
    showRawJson,
    reorderScopeKey,
    onChange,
  } = props
  const dialogueRowReorderKeys = useDsReorderKeys(command.cue.rows)
  const cue = command.cue as DialogueCue | AuthorDialogueCue
  const authorCue = 'identity' in cue ? cue : undefined
  const runtimeCue = authorCue ? undefined : (cue as DialogueCue)
  const identity = authorCue?.identity
  const firstPortrait = Object.entries(assetCatalog.assets).find(
    ([, record]) => record.kind === 'portrait',
  )?.[0]
  const setCue = (patch: object): void =>
    onChange({ ...command, cue: { ...cue, ...patch } } as Command)
  const setRow = (index: number, patch: object): void =>
    setCue({
      rows: cue.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    })
  const reorderRows = (intent: DsReorderIntent): boolean => {
    const rows = reorderDsItems(cue.rows, intent, 'insert', sameDsSerializableValue)
    if (rows === cue.rows) return false
    dialogueRowReorderKeys.move(intent)
    setCue({ rows: [...rows] })
    return true
  }

  return (
    <>
      {authorCue && identity ? (
        <>
          <Row label="身份">
            <Sel
              value={identity.kind}
              options={['narration', 'actor', 'unbound'] as const}
              labels={['旁白 / 无人物', '预制人物', '未绑定称谓 / 旧内容']}
              onChange={(kind) => {
                const next: DialogueIdentity =
                  kind === 'narration'
                    ? { kind: 'narration' }
                    : kind === 'actor'
                      ? {
                          kind: 'actor',
                          actor: Object.keys(actors ?? {})[0] ?? '',
                        }
                      : { kind: 'unbound', speaker: '(说话人)' }
                if (next.kind === 'actor' && !next.actor) return
                setCue({ identity: next })
              }}
            />
          </Row>
          {identity.kind === 'actor' ? (
            <>
              <Row label="人物">
                <DsSelect
                  size="compact"
                  value={identity.actor}
                  options={Object.values(actors ?? {}).map((actor) => ({
                    value: actor.id,
                    label: `${lookupText(actor.name, locale)} (${actor.id})`,
                  }))}
                  onValueChange={(actor) =>
                    setCue({
                      identity: {
                        kind: 'actor',
                        actor,
                        ...(identity.speakerOverride
                          ? { speakerOverride: identity.speakerOverride }
                          : {}),
                      },
                    })
                  }
                />
              </Row>
              <Row label="显示称谓">
                <Txt
                  value={
                    identity.speakerOverride ? lookupText(identity.speakerOverride, locale) : ''
                  }
                  onChange={(text) => {
                    if (onDialogueSpeakerOverrideChange) onDialogueSpeakerOverrideChange(text)
                    else
                      setCue({
                        identity: {
                          ...identity,
                          speakerOverride: text || undefined,
                        },
                      })
                  }}
                  placeholder={
                    actors?.[identity.actor]
                      ? lookupText(actors[identity.actor]!.name, locale)
                      : '(使用人物姓名)'
                  }
                />
              </Row>
            </>
          ) : identity.kind === 'unbound' ? (
            <Row label="说话人">
              <Txt
                value={identity.speaker ? lookupText(identity.speaker, locale) : ''}
                onChange={(speaker) => {
                  if (!speaker && !identity.portrait) {
                    setCue({ identity: { kind: 'narration' } })
                    return
                  }
                  setCue({ identity: { ...identity, speaker: speaker || undefined } })
                }}
                placeholder="(可只用立绘)"
              />
            </Row>
          ) : null}
        </>
      ) : (
        <Row label="说话人">
          <Txt
            value={runtimeCue?.speaker ? lookupText(runtimeCue.speaker, locale) : ''}
            onChange={(speaker) => setCue({ speaker: speaker || undefined })}
            placeholder="(旁白)"
          />
        </Row>
      )}
      <DsReorderCollection
        adoptionId="story/dialogue-cue-rows"
        scopeKey={`${reorderScopeKey}:dialogue-rows`}
        entries={cue.rows.map((_row, index) => ({
          key: dialogueRowReorderKeys.keys[index]!,
          label: `对话第 ${index + 1} 行`,
        }))}
        revision={command}
        onReorder={reorderRows}
      >
        <div className="cf-dialog-row-list">
          {cue.rows.map((row, index) => {
            const rowKey = dialogueRowReorderKeys.keys[index]!
            const deleteDisabled = cue.rows.length === 1
            const deleteReasonId = `dialogue-row-${index + 1}-delete-reason`
            return (
              <DsReorderItem itemKey={rowKey} key={rowKey}>
                <DsRepeatRow density="compact" className="cf-dialog-row">
                  <Row label={`第 ${index + 1} 行`}>
                    <DsTextArea
                      value={lookupText(row.text, locale)}
                      onChange={(event) => setRow(index, { text: event.target.value })}
                      spellCheck={false}
                    />
                  </Row>
                  <div className="cf-dialog-row-footer">
                    <fieldset className="cf-dialog-row-speed">
                      <legend className="ds-visually-hidden">对话第 {index + 1} 行打字速度</legend>
                      <DsCheckbox
                        label="自定速度"
                        checked={row.speed !== undefined}
                        onChange={(event) =>
                          setRow(index, { speed: event.target.checked ? 24 : undefined })
                        }
                      />
                      {row.speed !== undefined ? (
                        <Num
                          value={row.speed}
                          onChange={(speed) => setRow(index, { speed })}
                          step={8}
                          aria-label={`对话第 ${index + 1} 行每字间隔（毫秒）`}
                          name={`dialogue-row-${index + 1}-character-delay-ms`}
                          autoComplete="off"
                          className="cf-dialog-row-speed-input"
                        />
                      ) : null}
                      {row.speed !== undefined ? (
                        <span className="cf-dialog-row-speed-unit">毫秒/字</span>
                      ) : null}
                    </fieldset>
                    <div className="cf-dialog-row-action-slot">
                      {deleteDisabled ? (
                        <span id={deleteReasonId} className="cf-dialog-row-action-reason">
                          至少保留 1 行对话
                        </span>
                      ) : null}
                      <DsActionGroup density="compact" className="cf-dialog-row-actions">
                        <DsReorderMoveButton itemKey={rowKey} direction="backward" />
                        <DsReorderMoveButton itemKey={rowKey} direction="forward" />
                        <DsIconButton
                          variant="danger"
                          icon="delete"
                          label={`删除对话第 ${index + 1} 行`}
                          aria-describedby={deleteDisabled ? deleteReasonId : undefined}
                          disabled={deleteDisabled}
                          onClick={() =>
                            setCue({
                              rows: cue.rows.filter((_row, rowIndex) => rowIndex !== index),
                            })
                          }
                        />
                      </DsActionGroup>
                    </div>
                  </div>
                </DsRepeatRow>
              </DsReorderItem>
            )
          })}
        </div>
      </DsReorderCollection>
      <DsButton
        size="compact"
        variant="secondary"
        icon="add"
        title="添加一行"
        onClick={() => setCue({ rows: [...cue.rows, { text: '(新一行)' }] })}
      >
        添加一行
      </DsButton>
      <Row label="位置">
        <Sel
          value={cue.slot ?? 'bottom'}
          options={['bottom', 'top', 'narration', 'center'] as const}
          labels={['下方', '上方', '横向卷轴', '中央']}
          onChange={(slot) => setCue({ slot: slot === 'bottom' ? undefined : slot })}
        />
      </Row>
      <Row label="自动推进">
        <DsCheckbox
          size="compact"
          label="启用"
          checked={cue.autoAdvance !== undefined}
          onChange={(event) => setCue({ autoAdvance: event.target.checked ? 0 : undefined })}
        />
        {cue.autoAdvance !== undefined ? (
          <Num
            value={cue.autoAdvance}
            onChange={(autoAdvance) => setCue({ autoAdvance })}
            step={40}
          />
        ) : null}
      </Row>
      <Row label="光标">
        <Sel
          value={String(cue.cursorFrame ?? 0) as '0' | '1' | '2'}
          options={['0', '1', '2'] as const}
          labels={['默认', '样式 1', '样式 2']}
          onChange={(value) => {
            const cursorFrame = Number(value) as 0 | 1 | 2
            setCue({ cursorFrame: cursorFrame === 0 ? undefined : cursorFrame })
          }}
        />
      </Row>
      {authorCue && identity?.kind === 'actor' ? (
        <Row label="人物立绘">
          <DsCheckbox
            size="compact"
            label="启用"
            checked={identity.portrait !== undefined}
            disabled={!actors?.[identity.actor]?.portraits?.default}
            onChange={(event) =>
              setCue({
                identity: {
                  ...identity,
                  portrait: event.target.checked
                    ? { kind: 'default', side: 'right' as const }
                    : undefined,
                },
              })
            }
          />
          {identity.portrait ? (
            <>
              <DsSelect
                size="compact"
                value={
                  identity.portrait.kind === 'default'
                    ? 'default'
                    : `expression:${identity.portrait.expression}`
                }
                options={[
                  { value: 'default', label: '主立绘' },
                  ...Object.keys(actors?.[identity.actor]?.portraits?.expressions ?? {}).map(
                    (expression) => ({
                      value: `expression:${expression}`,
                      label: expression,
                    }),
                  ),
                ]}
                onValueChange={(value) => {
                  setCue({
                    identity: {
                      ...identity,
                      portrait:
                        value === 'default'
                          ? { kind: 'default', side: identity.portrait?.side ?? 'right' }
                          : {
                              kind: 'expression',
                              expression: value.slice('expression:'.length),
                              side: identity.portrait?.side ?? 'right',
                            },
                    },
                  })
                }}
              />
              <Sel
                value={identity.portrait.side}
                options={['left', 'right'] as const}
                labels={['左', '右']}
                onChange={(side) =>
                  setCue({ identity: { ...identity, portrait: { ...identity.portrait!, side } } })
                }
              />
            </>
          ) : null}
        </Row>
      ) : cue && identity?.kind === 'narration' ? null : (
        <Row label="立绘">
          <DsCheckbox
            size="compact"
            label="启用"
            checked={
              cue
                ? identity?.kind === 'unbound' && !!identity.portrait
                : runtimeCue?.portrait !== undefined
            }
            disabled={
              cue
                ? identity?.kind !== 'unbound' || (!identity.portrait && !firstPortrait)
                : !runtimeCue?.portrait && !firstPortrait
            }
            onChange={(event) => {
              if (cue && identity?.kind === 'unbound')
                setCue({
                  identity: {
                    ...identity,
                    portrait:
                      event.target.checked && firstPortrait
                        ? { asset: firstPortrait, side: 'right' as const }
                        : undefined,
                  },
                })
              else
                setCue({
                  portrait:
                    event.target.checked && firstPortrait
                      ? { asset: firstPortrait, side: 'right' as const }
                      : undefined,
                })
            }}
          />
          {(cue && identity?.kind === 'unbound' ? identity.portrait : runtimeCue?.portrait) ? (
            <>
              <ImageAssetPicker
                value={
                  (cue && identity?.kind === 'unbound' ? identity.portrait : runtimeCue?.portrait)!
                    .asset
                }
                kind="portrait"
                catalog={assetCatalog}
                reader={assetReader}
                showThumbnail={false}
                ariaLabel="对话立绘"
                onOpenAsset={onOpenImage}
                onChange={(asset) => {
                  if (!asset) return
                  if (cue && identity?.kind === 'unbound')
                    setCue({
                      identity: {
                        ...identity,
                        portrait: { asset, side: identity.portrait?.side ?? 'right' },
                      },
                    })
                  else setCue({ portrait: { asset, side: runtimeCue?.portrait?.side ?? 'right' } })
                }}
              />
              <Sel
                value={
                  (cue && identity?.kind === 'unbound' ? identity.portrait : runtimeCue?.portrait)!
                    .side
                }
                options={['left', 'right'] as const}
                labels={['左', '右']}
                onChange={(side) => {
                  if (cue && identity?.kind === 'unbound')
                    setCue({
                      identity: {
                        ...identity,
                        portrait: {
                          asset: identity.portrait?.asset ?? firstPortrait ?? '',
                          side,
                        },
                      },
                    })
                  else
                    setCue({
                      portrait: {
                        asset: runtimeCue?.portrait?.asset ?? firstPortrait ?? '',
                        side,
                      },
                    })
                }}
              />
            </>
          ) : null}
        </Row>
      )}
      {showRawJson ? <JsonForm cmd={command} onChange={onChange} /> : null}
    </>
  )
}
