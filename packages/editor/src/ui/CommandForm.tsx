/**
 * 指令属性表单(C-track v1)—— 事件模式右栏:选中树行 → 编辑该指令参数。
 *
 * 高频指令给专控件;其余(branch/startBattle/confirm/页切换等结构类)
 * 走 JSON 兜底(textarea + 应用,保证全指令可编)。每次变更通过 onChange 产出整条新指令；
 * canonical 调用方必须在弹层/侧栏持有 aggregate draft，并只在“完成”时写入编辑会话。
 *
 * 对话文本:cue.rows[].text 是 TextId(locale 键);编辑即改写为**字面量**(lookupText
 * 未命中回显原文,引擎/预览同语义)——新写的行直接放中文,旧行一改即脱离 locale 键。
 */
import type {
  AmbienceDef,
  AssetCatalogV1,
  AuthorDialogueCue,
  BattleSpriteDef,
  CarryableStatusId,
  Command,
  DialogueCue,
  DialogueIdentity,
  Facing,
  GridPos,
  LoadSceneCommand,
  Locale,
  SceneDef,
  SceneTransitionProfile,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  SpriteDef,
  WalkSpeed,
  WorldVariableKindV1,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import {
  ACTOR_STATUS_DEFINITIONS,
  type ActorDef,
  CARRIED_STATUS_TURN_RANGE,
  CARRYABLE_STATUS_IDS,
  deriveScriptChunk,
  lookupText,
  resolveEntitySpriteId,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { useEffect, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { defaultActionTargetForEntity, sortedSpriteActions } from '../core/sprite-actions.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import {
  DsActionGroup,
  DsButton,
  DsCheckbox,
  DsNumberInput,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelect,
  DsTextArea,
  DsTextInput,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'
import { EntityStateSelect } from './EntityStateSelect.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'
import { MusicPicker } from './MusicPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SoundPicker } from './SoundPicker.js'

const FACINGS: Facing[] = ['down', 'left', 'up', 'right']
const SPEEDS: WalkSpeed[] = ['slow', 'normal', 'fast', 'run']

export type LoadSceneTarget =
  | { mode: 'default' }
  | { mode: 'entry'; entryId: string }
  | { mode: 'pos'; pos: GridPos }

export function makeLoadScene(
  scene: string,
  target: LoadSceneTarget,
  facing?: Facing,
  transition?: SceneTransitionProfile,
): LoadSceneCommand {
  const facingPatch = facing ? { facing } : {}
  const transitionPatch = transition ? { transition } : {}
  if (target.mode === 'entry')
    return { kind: 'loadScene', scene, entryId: target.entryId, ...facingPatch, ...transitionPatch }
  if (target.mode === 'pos')
    return { kind: 'loadScene', scene, pos: { ...target.pos }, ...facingPatch, ...transitionPatch }
  return { kind: 'loadScene', scene, ...facingPatch, ...transitionPatch }
}

export function retargetLoadScene(command: LoadSceneCommand, scene: string): LoadSceneCommand {
  return makeLoadScene(scene, { mode: 'default' }, command.facing, command.transition)
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Row 的 children 契约是表单控件，静态分析无法穿透 ReactNode。
    <label className="cf-row">
      <span className="cf-label">{props.label}</span>
      {props.children}
    </label>
  )
}

function Num(props: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <DsNumberInput
      size="compact"
      value={props.value}
      step={props.step ?? 1}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  )
}

function Txt(props: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <DsTextInput
      size="compact"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  )
}

function Sel<T extends string>(props: {
  value: T
  options: readonly T[]
  /** 可选显示名(与 options 同序;缺省显示 option 值本身)。 */
  labels?: readonly string[]
  onChange: (v: T) => void
}) {
  return (
    <DsSelect
      size="compact"
      value={props.value}
      options={props.options.map((value, index) => ({
        value,
        label: props.labels?.[index] ?? value,
      }))}
      onValueChange={(value) => props.onChange(value as T)}
    />
  )
}

export function WorldVariablePicker(props: {
  value: string
  kind: WorldVariableKindV1
  variables?: WorldVariableRegistryV1
  onChange: (id: string) => void
  onOpen?: (id: string) => void
}) {
  const definitions = Object.entries(props.variables ?? {})
    .filter(([, definition]) => definition.kind === props.kind)
    .sort(([aId, a], [bId, b]) => a.name.localeCompare(b.name, 'zh-CN') || aId.localeCompare(bId))
  const known = definitions.some(([id]) => id === props.value)
  const options = [
    ...(!known && props.value
      ? [{ value: props.value, label: `${props.value}（未登记）`, description: '保存前必须登记' }]
      : []),
    ...definitions.map(([id, definition]) => ({
      value: id,
      label: `${definition.name} · ${id}`,
      description: definition.description || undefined,
    })),
  ]
  return (
    <div className="cf-world-variable-picker">
      <DsSelect
        size="compact"
        value={props.value}
        options={options}
        placeholder={props.kind === 'flag' ? '选择开关' : '选择数值变量'}
        searchable
        onValueChange={props.onChange}
      />
      {props.onOpen && props.value ? (
        <DsButton size="compact" variant="quiet" onClick={() => props.onOpen?.(props.value)}>
          打开变量
        </DsButton>
      ) : null}
    </div>
  )
}

/** 实体 id 下拉(含空 = 手输)。 */
function EntitySel(props: { value: string; scene: SceneDef; onChange: (id: string) => void }) {
  const options = props.scene.entities.map((entity) => ({ value: entity.id, label: entity.id }))
  if (!props.scene.entities.some((entity) => entity.id === props.value))
    options.push({ value: props.value, label: `${props.value}(不在场)` })
  return (
    <DsSelect size="compact" value={props.value} options={options} onValueChange={props.onChange} />
  )
}

/** JSON 兜底编辑器。 */
function JsonForm(props: { cmd: Command; onChange: (c: Command) => void }) {
  const [text, setText] = useState(() => JSON.stringify(props.cmd, null, 2))
  const [err, setErr] = useState('')
  // 外部指令变化(选中另一行)→ 重置文本
  useEffect(() => {
    setText(JSON.stringify(props.cmd, null, 2))
    setErr('')
  }, [props.cmd])
  return (
    <div className="cf-json">
      <DsTextArea
        size="compact"
        monospace
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      {err ? <div className="cf-err">{err}</div> : null}
      <DsButton
        size="compact"
        onClick={() => {
          try {
            const parsed = JSON.parse(text) as Command
            if (
              typeof parsed !== 'object' ||
              !parsed ||
              typeof (parsed as { kind?: unknown }).kind !== 'string'
            )
              throw new Error('缺少 kind 字段')
            setErr('')
            props.onChange(parsed)
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e))
          }
        }}
      >
        应用 JSON
      </DsButton>
    </div>
  )
}

export function CommandForm(props: {
  cmd: Command
  scene: SceneDef
  locale: Locale
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  /** 全场景(loadScene 目标下拉;W4)。缺省 = 只有当前场景。 */
  scenes?: SceneDef[]
  /** 资产 base(战场选择器预览;B2)。缺省退化数字输入。 */
  assetBase?: AssetBase
  /** 角色表(setParty 队伍编辑下拉;C7)。缺省退化 JSON 兜底。 */
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  /** 大世界精灵与预制动作；playEntityAction 使用稳定 sprite/action 复合引用。 */
  sprites?: readonly SpriteDef[]
  /** 氛围表(setAmbience 下拉;W6)。缺省退化文本输入。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 店下拉)。缺省退化数字输入。 */
  shops?: ShopDef[]
  /** 所有已有名称表的稳定引用；树、条件摘要与表单共用同一真值。 */
  references: ScriptReferenceCatalog
  /** N6 作者共享脚本目录；用于区分作者共享目标与场景内部目标。 */
  scriptIndex?: ScriptIndexV1
  /** 当前执行上下文是否保证有可继承 self。 */
  hasImplicitSelf?: boolean
  /** 打开 callScript/jumpScript 目标；调用方决定留在场景内或进入作者共享库。 */
  onOpenScript?: (id: string) => void
  /** 项目级变量登记表；变量与条件字段只允许从对应类型中选择。 */
  worldVariables?: WorldVariableRegistryV1
  onOpenWorldVariable?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  /** K2：新建/更新称谓 locale 与 cue 更新由调用方合成一次 undo。 */
  onDialogueSpeakerOverrideChange?: (text: string) => void
  /** 非作者态展示可保留逃生 JSON 编辑器；当前作者态隐藏它。 */
  showRawJson?: boolean
  /** 当前 aggregate command draft 的稳定身份；用于隔离内部有序集合手势。 */
  reorderScopeKey?: string
  onChange: (next: Command) => void
}) {
  const {
    cmd,
    scene,
    locale,
    assetCatalog,
    audioResolver,
    assetReader,
    scenes,
    actors,
    battleSprites,
    sprites = [],
    ambiences,
    shops,
    references,
    scriptIndex,
    hasImplicitSelf,
    onOpenScript,
    worldVariables,
    onOpenWorldVariable,
    onOpenSound,
    onOpenImage,
    onOpenBattleSprite,
    onOpenSpriteAction,
    onDialogueSpeakerOverrideChange,
    showRawJson = true,
    reorderScopeKey = `command-form:${cmd.kind}`,
    onChange,
  } = props
  const dialogueRowReorderKeys = useDsReorderKeys(cmd.kind === 'dialog' ? cmd.cue.rows : [])
  const partyMemberReorderKeys = useDsReorderKeys(cmd.kind === 'setParty' ? cmd.members : [])
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)
  const actorChoices = references.choices('actor')
  const conditionActorChoices = actorChoices.filter((choice) => actors?.[choice.id]?.battler)
  const poisonChoices = references.choices('poison')
  const spriteChoices = references.choices('sprite')

  switch (cmd.kind) {
    case 'dialog': {
      const cue = cmd.cue as DialogueCue | AuthorDialogueCue
      const authorCue = 'identity' in cue ? cue : undefined
      const runtimeCue = authorCue ? undefined : (cue as DialogueCue)
      const identity = authorCue?.identity
      const firstPortrait = Object.entries(assetCatalog.assets).find(
        ([, record]) => record.kind === 'portrait',
      )?.[0]
      const setCue = (patch: object): void => onChange({ ...cmd, cue: { ...cue, ...patch } })
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
                onChange={(s) => setCue({ speaker: s || undefined })}
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
            revision={cmd}
            onReorder={reorderRows}
          >
            <div className="cf-dialog-row-list">
              {cue.rows.map((row, index) => {
                const rowKey = dialogueRowReorderKeys.keys[index]!
                return (
                  <DsReorderItem itemKey={rowKey} key={rowKey}>
                    <DsRepeatRow density="compact" className="cf-dialog-row">
                      <Row label={`第 ${index + 1} 行`}>
                        <DsTextArea
                          value={lookupText(row.text, locale)}
                          onChange={(e) => setRow(index, { text: e.target.value })}
                          spellCheck={false}
                        />
                      </Row>
                      <DsActionGroup density="compact" className="cf-dialog-row-actions">
                        <DsCheckbox
                          label="自定速度"
                          checked={row.speed !== undefined}
                          onChange={(e) =>
                            setRow(index, { speed: e.target.checked ? 24 : undefined })
                          }
                        />
                        {row.speed !== undefined ? (
                          <Num
                            value={row.speed}
                            onChange={(speed) => setRow(index, { speed })}
                            step={8}
                          />
                        ) : null}
                        <DsReorderMoveButton itemKey={rowKey} direction="backward" />
                        <DsReorderMoveButton itemKey={rowKey} direction="forward" />
                        <DsButton
                          variant="quiet"
                          icon="delete"
                          title="删除此行"
                          aria-label="删除此行"
                          disabled={cue.rows.length === 1}
                          onClick={() =>
                            setCue({ rows: cue.rows.filter((_, rowIndex) => rowIndex !== index) })
                          }
                        >
                          删除
                        </DsButton>
                      </DsActionGroup>
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
              onChange={(v) => setCue({ slot: v === 'bottom' ? undefined : v })}
            />
          </Row>
          <Row label="自动推进">
            <DsCheckbox
              size="compact"
              label="启用"
              checked={cue.autoAdvance !== undefined}
              onChange={(e) => setCue({ autoAdvance: e.target.checked ? 0 : undefined })}
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
                      setCue({
                        identity: { ...identity, portrait: { ...identity.portrait!, side } },
                      })
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
                      (cue && identity?.kind === 'unbound'
                        ? identity.portrait
                        : runtimeCue?.portrait)!.asset
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
                      else
                        setCue({ portrait: { asset, side: runtimeCue?.portrait?.side ?? 'right' } })
                    }}
                  />
                  <Sel
                    value={
                      (cue && identity?.kind === 'unbound'
                        ? identity.portrait
                        : runtimeCue?.portrait)!.side
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
          {showRawJson ? <JsonForm cmd={cmd} onChange={onChange} /> : null}
        </>
      )
    }
    case 'wait':
      return (
        <Row label="毫秒">
          <Num value={cmd.ms} onChange={(n) => set({ ms: n })} step={40} />
        </Row>
      )
    case 'fade':
      return (
        <>
          <Row label="方向">
            <Sel
              value={cmd.dir}
              options={['in', 'out'] as const}
              onChange={(v) => set({ dir: v })}
            />
          </Row>
          <Row label="毫秒">
            <Num value={cmd.ms ?? 300} onChange={(n) => set({ ms: n })} step={60} />
          </Row>
        </>
      )
    case 'holdScreen':
      return (
        <>
          <Row label="画面状态">
            <span className="hint2">保持黑屏，直到配对的恢复指令</span>
          </Row>
          <Row label="事务">
            <DsTextInput size="compact" monospace value={cmd.token} readOnly />
          </Row>
        </>
      )
    case 'revealScreen':
      return (
        <>
          <Row label="画面状态">
            <span className="hint2">恢复配对黑屏事务</span>
          </Row>
          <Row label="事务">
            <DsTextInput size="compact" monospace value={cmd.token} readOnly />
          </Row>
        </>
      )
    case 'ditherScreen':
      return (
        <Row label="毫秒">
          <Num value={cmd.ms ?? 720} onChange={(n) => set({ ms: n })} step={10} />
        </Row>
      )
    case 'teleportParty':
      return (
        <>
          <Row label="col">
            <Num value={cmd.pos.col} onChange={(n) => set({ pos: { ...cmd.pos, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.pos.row} onChange={(n) => set({ pos: { ...cmd.pos, row: n } })} />
          </Row>
          <Row label="朝向">
            <Sel
              value={cmd.facing ?? 'down'}
              options={FACINGS}
              onChange={(v) => set({ facing: v })}
            />
          </Row>
        </>
      )
    case 'setPartyFacing':
      return (
        <>
          <Row label="朝向">
            <Sel value={cmd.facing} options={FACINGS} onChange={(v) => set({ facing: v })} />
          </Row>
          <Row label="姿势帧">
            <Num
              value={cmd.gesture ?? 0}
              onChange={(n) => set({ gesture: n > 0 ? n : undefined })}
            />
          </Row>
        </>
      )
    case 'moveParty':
      return (
        <>
          <Row label="col">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'moveEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="col">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'setEntityState':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="状态">
            <EntityStateSelect value={cmd.state} onChange={(state) => set({ state })} />
          </Row>
        </>
      )
    case 'setEntityFacing':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="朝向">
            <Sel value={cmd.facing} options={FACINGS} onChange={(v) => set({ facing: v })} />
          </Row>
        </>
      )
    case 'setEntityFrame':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="帧">
            <Num value={cmd.frame} onChange={(n) => set({ frame: n })} />
          </Row>
        </>
      )
    case 'playEntityAction': {
      const actionSprites = sprites.filter((sprite) => Object.keys(sprite.poses ?? {}).length > 0)
      const selectedSprite = sprites.find((sprite) => sprite.id === cmd.sprite)
      const actions = sortedSpriteActions(selectedSprite)
      const selectedAction = actions.find((entry) => entry.id === cmd.action)
      const selectedEntity = scene.entities.find((entity) => entity.id === cmd.entity)
      const baselineSpriteId = selectedEntity
        ? resolveEntitySpriteId(selectedEntity, actors ?? {})
        : undefined
      const mismatch = !!baselineSpriteId && baselineSpriteId !== cmd.sprite
      const setEntityTarget = (entityId: string): void => {
        const entity = scene.entities.find((entry) => entry.id === entityId)
        const target = defaultActionTargetForEntity(entity, actors ?? {}, sprites)
        if (target) {
          set({ entity: entityId, sprite: target.sprite.id, action: target.action.id })
          return
        }
        const spriteId = entity ? resolveEntitySpriteId(entity, actors ?? {}) : undefined
        set({ entity: entityId, sprite: spriteId ?? '', action: '' })
      }
      const setSprite = (spriteId: string): void => {
        const sprite = sprites.find((entry) => entry.id === spriteId)
        set({ sprite: spriteId, action: sortedSpriteActions(sprite)[0]?.id ?? '' })
      }
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={setEntityTarget} />
          </Row>
          <Row label="精灵">
            <DsSelect
              size="compact"
              value={cmd.sprite}
              options={[
                ...actionSprites.map((sprite) => ({
                  value: sprite.id,
                  label: `${sprite.label} · ${sprite.id}`,
                })),
                ...(actionSprites.some((sprite) => sprite.id === cmd.sprite)
                  ? []
                  : [{ value: cmd.sprite, label: `${cmd.sprite}(缺失或没有动作)` }]),
              ]}
              onValueChange={setSprite}
            />
          </Row>
          <Row label="动作">
            <DsSelect
              size="compact"
              value={cmd.action}
              options={[
                ...actions.map(({ id, action, index }) => ({
                  value: id,
                  label: `#${index} ${action.label} · ${id}`,
                })),
                ...(selectedAction
                  ? []
                  : [{ value: cmd.action, label: `${cmd.action}(动作不存在)` }]),
              ]}
              onValueChange={(action) => set({ action })}
            />
          </Row>
          {mismatch ? (
            <p className="cf-warn">
              当前实体的基准精灵是 {baselineSpriteId}；此命令仅在之前已换装为 {cmd.sprite}{' '}
              时有效，否则运行时会明确报错。
            </p>
          ) : null}
          {!selectedAction ? (
            <p className="cf-warn">当前精灵中找不到所引用的动作，请修复引用。</p>
          ) : null}
          <Row label="播放方式">
            <Sel
              value={cmd.loop ? 'loop' : 'once'}
              options={['once', 'loop'] as const}
              labels={['单次', '循环']}
              onChange={(mode) =>
                set({ loop: mode === 'loop', wait: mode === 'loop' ? false : (cmd.wait ?? true) })
              }
            />
          </Row>
          <Row label="起始偏移(ms)">
            <Num
              value={cmd.startAtMs ?? 0}
              onChange={(value) => set({ startAtMs: value > 0 ? value : undefined })}
            />
          </Row>
          <DsCheckbox
            size="compact"
            label="单次动作播放完再继续脚本"
            checked={cmd.loop ? false : (cmd.wait ?? true)}
            disabled={cmd.loop}
            onChange={(event) => set({ wait: event.target.checked })}
          />
          <p className="hint">循环动作在后台持续播放；停止或被更高优先级动作替换前不会结束。</p>
          <DsButton
            size="compact"
            variant="secondary"
            icon="open"
            disabled={!onOpenSpriteAction || !selectedSprite}
            onClick={() => onOpenSpriteAction?.(cmd.sprite, cmd.action)}
          >
            {selectedAction ? '在精灵库编辑此动作' : '打开精灵并修复引用'}
          </DsButton>
        </>
      )
    }
    case 'stopEntityAction':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <DsCheckbox
            size="compact"
            label="停止后从头恢复当前页面的默认动作"
            checked={cmd.reset}
            onChange={(event) => set({ reset: event.target.checked })}
          />
        </>
      )
    case 'stepEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="方向">
            <Sel value={cmd.dir} options={FACINGS} onChange={(v) => set({ dir: v })} />
          </Row>
        </>
      )
    case 'animEntity':
      return (
        <Row label="实体">
          <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
        </Row>
      )
    case 'nudgeEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="dx(px)">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy(px)">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
        </>
      )
    case 'nudgeParty':
      return (
        <>
          <Row label="dx(px)">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy(px)">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
          <Row label="层号">
            <Num value={cmd.layer ?? 0} onChange={(n) => set({ layer: n })} />
          </Row>
        </>
      )
    case 'setActorSprite':
      return (
        <>
          <Row label="角色">
            {actorChoices.length ? (
              <NamedIdPicker
                value={cmd.actor}
                choices={actorChoices}
                kindLabel="角色"
                inputName="script-actor"
                onChange={(actor) => set({ actor })}
              />
            ) : (
              <Txt value={cmd.actor} onChange={(actor) => set({ actor })} />
            )}
          </Row>
          <Row label="大世界精灵">
            {spriteChoices.length ? (
              <NamedIdPicker
                value={cmd.sprite}
                choices={spriteChoices}
                kindLabel="大世界精灵"
                inputName="script-world-sprite"
                onChange={(sprite) => set({ sprite })}
              />
            ) : (
              <Txt value={cmd.sprite} onChange={(sprite) => set({ sprite })} />
            )}
          </Row>
        </>
      )
    case 'setActorAppearance':
      return (
        <>
          <Row label="角色">
            {actorChoices.length ? (
              <NamedIdPicker
                value={cmd.actor}
                choices={actorChoices}
                kindLabel="角色"
                inputName="script-actor"
                onChange={(actor) => set({ actor })}
              />
            ) : (
              <Txt value={cmd.actor} onChange={(actor) => set({ actor })} />
            )}
          </Row>
          <Row label="大世界精灵">
            {cmd.spriteId !== undefined && spriteChoices.length ? (
              <span className="cf-ref-row">
                <NamedIdPicker
                  value={cmd.spriteId}
                  choices={spriteChoices}
                  kindLabel="大世界精灵"
                  inputName="script-world-sprite"
                  onChange={(spriteId) => set({ spriteId })}
                />
                <DsButton
                  size="compact"
                  variant="quiet"
                  onClick={() => set({ spriteId: undefined })}
                >
                  不修改
                </DsButton>
              </span>
            ) : (
              <DsSelect
                size="compact"
                value={cmd.spriteId ?? ''}
                options={[
                  { value: '', label: '不修改' },
                  ...spriteChoices.map((sprite) => ({
                    value: sprite.id,
                    label: `${sprite.name}（${sprite.id}）`,
                  })),
                ]}
                onValueChange={(spriteId) => set({ spriteId: spriteId || undefined })}
              />
            )}
          </Row>
          <Row label="对话立绘">
            <ImageAssetPicker
              value={cmd.portrait}
              kind="portrait"
              catalog={assetCatalog}
              reader={assetReader}
              allowUnset
              showThumbnail={false}
              ariaLabel="角色形象切换立绘"
              onOpenAsset={onOpenImage}
              onChange={(portrait) => set({ portrait })}
            />
          </Row>
          <Row label="战斗形象">
            <BattleSpritePicker
              value={cmd.battleSprite}
              definitions={battleSprites}
              kind="player-fighter"
              allowUnset
              onChange={(battleSprite) => set({ battleSprite: battleSprite || undefined })}
              onOpenDefinition={onOpenBattleSprite}
              ariaLabel="剧情角色战斗形象"
            />
          </Row>
        </>
      )
    case 'loadScene': {
      const availableScenes = scenes ?? [scene]
      const target = availableScenes.find((s) => s.id === cmd.scene)
      const entries = Object.entries(target?.entries ?? {})
      const mode = cmd.entryId ? 'entry' : cmd.pos ? 'pos' : 'default'
      const rebuild = (targetMode: LoadSceneTarget, facing = cmd.facing) =>
        makeLoadScene(cmd.scene, targetMode, facing, cmd.transition)
      return (
        <>
          <Row label="目标场景">
            <DsSelect
              size="compact"
              value={cmd.scene}
              options={[
                ...(!availableScenes.some((s) => s.id === cmd.scene)
                  ? [{ value: cmd.scene, label: `${cmd.scene} (不在索引)` }]
                  : []),
                ...availableScenes.map((sceneOption) => ({
                  value: sceneOption.id,
                  label: sceneOption.id,
                })),
              ]}
              onValueChange={(sceneId) => onChange(retargetLoadScene(cmd, sceneId))}
            />
          </Row>
          <Row label="落点">
            <fieldset className="cf-segment" aria-label="落点模式">
              <DsButton
                size="compact"
                variant={mode === 'default' ? 'primary' : 'secondary'}
                onClick={() => onChange(rebuild({ mode: 'default' }))}
              >
                默认
              </DsButton>
              <DsButton
                size="compact"
                variant={mode === 'entry' ? 'primary' : 'secondary'}
                disabled={!entries.length}
                onClick={() => {
                  const entryId =
                    cmd.entryId && target?.entries?.[cmd.entryId] ? cmd.entryId : entries[0]?.[0]
                  if (entryId) onChange(rebuild({ mode: 'entry', entryId }))
                }}
              >
                命名
              </DsButton>
              <DsButton
                size="compact"
                variant={mode === 'pos' ? 'primary' : 'secondary'}
                onClick={() =>
                  onChange(
                    rebuild({
                      mode: 'pos',
                      pos: { ...(target?.entry.pos ?? { col: 0, row: 0, height: 0 }) },
                    }),
                  )
                }
              >
                临时坐标
              </DsButton>
            </fieldset>
          </Row>
          {cmd.entryId && (
            <Row label="命名落点">
              <DsSelect
                size="compact"
                value={cmd.entryId}
                options={[
                  ...(!target?.entries?.[cmd.entryId]
                    ? [{ value: cmd.entryId, label: `${cmd.entryId} (缺失)` }]
                    : []),
                  ...entries.map(([id, entry]) => ({
                    value: id,
                    label: `${entry.label || id} · ${id} (${entry.pos.col},${entry.pos.row},h${entry.pos.height ?? 0})`,
                  })),
                ]}
                onValueChange={(entryId) => onChange(rebuild({ mode: 'entry', entryId }))}
              />
            </Row>
          )}
          {cmd.pos && (
            <Row label="col / row / h">
              <Num
                value={cmd.pos.col}
                onChange={(n) => onChange(rebuild({ mode: 'pos', pos: { ...cmd.pos!, col: n } }))}
              />
              <Num
                value={cmd.pos.row}
                onChange={(n) => onChange(rebuild({ mode: 'pos', pos: { ...cmd.pos!, row: n } }))}
              />
              <Num
                value={cmd.pos.height ?? 0}
                onChange={(n) =>
                  onChange(rebuild({ mode: 'pos', pos: { ...cmd.pos!, height: n } }))
                }
              />
            </Row>
          )}
          <Row label="朝向">
            <DsSelect
              size="compact"
              value={cmd.facing ?? ''}
              options={[
                { value: '', label: '(保持)' },
                ...FACINGS.map((facing) => ({ value: facing, label: facing })),
              ]}
              onValueChange={(value) => {
                const f = value as Facing | ''
                const targetMode: LoadSceneTarget = cmd.entryId
                  ? { mode: 'entry', entryId: cmd.entryId }
                  : cmd.pos
                    ? { mode: 'pos', pos: cmd.pos }
                    : { mode: 'default' }
                onChange(rebuild(targetMode, f || undefined))
              }}
            />
          </Row>
          <Row label="画面过渡">
            <span className="hint2">
              {cmd.transition?.kind === 'source'
                ? `源时序：淡出 ${cmd.transition.outMs}ms / 淡入 ${cmd.transition.inMs}ms`
                : '现代过渡：淡出 260ms / 淡入 260ms'}
            </span>
            {cmd.transition?.kind === 'source' && (
              <DsButton
                size="compact"
                variant="secondary"
                onClick={() => set({ transition: undefined })}
              >
                改用现代过渡
              </DsButton>
            )}
          </Row>
        </>
      )
    }
    case 'takeEntity':
      return (
        <Row label="接管实体">
          <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
        </Row>
      )
    case 'releaseEntity':
      return (
        <Row label="归还">
          <DsSelect
            size="compact"
            value={cmd.entity ?? ''}
            options={[
              { value: '', label: '(全部)' },
              ...scene.entities.map((entity) => ({ value: entity.id, label: entity.id })),
            ]}
            onValueChange={(entity) =>
              onChange(entity ? { kind: 'releaseEntity', entity } : { kind: 'releaseEntity' })
            }
          />
        </Row>
      )
    case 'applyActorCondition': {
      const currentActorChoice = actorChoices.find((choice) => choice.id === cmd.actor)
      const actorOptions = [
        ...(!conditionActorChoices.some((choice) => choice.id === cmd.actor)
          ? [
              {
                value: cmd.actor,
                label: currentActorChoice
                  ? `${currentActorChoice.name}（${cmd.actor}，不可参战）`
                  : `${cmd.actor}（角色不存在）`,
                disabled: true,
              },
            ]
          : []),
        ...conditionActorChoices.map((choice) => ({
          value: choice.id,
          label: `${choice.name}（${choice.id}）`,
        })),
      ]
      const conditionKind = cmd.condition.kind
      return (
        <>
          <Row label="目标角色">
            <DsSelect
              size="compact"
              searchable
              value={cmd.actor}
              options={actorOptions}
              onValueChange={(actor) => set({ actor })}
            />
          </Row>
          <Row label="当前状态">
            <DsSelect
              size="compact"
              value={conditionKind}
              options={[
                { value: 'poison', label: '中毒', disabled: poisonChoices.length === 0 },
                { value: 'status', label: '定时增益或减益' },
                { value: 'poisonResistance', label: '临时毒抗' },
              ]}
              onValueChange={(kind) => {
                if (kind === 'poison') {
                  const poisonId = Number(poisonChoices[0]?.id)
                  if (Number.isSafeInteger(poisonId) && poisonId > 0)
                    set({ condition: { kind, poisonId } })
                  return
                }
                if (kind === 'status') {
                  set({ condition: { kind, status: 'protect', turns: 7 } })
                  return
                }
                set({ condition: { kind: 'poisonResistance', amount: 1 } })
              }}
            />
          </Row>
          {cmd.condition.kind === 'poison' ? (
            <Row label="毒种">
              <DsSelect
                size="compact"
                searchable
                value={String(cmd.condition.poisonId)}
                options={[
                  ...(!references.has('poison', String(cmd.condition.poisonId))
                    ? [
                        {
                          value: String(cmd.condition.poisonId),
                          label: references.label('poison', String(cmd.condition.poisonId)),
                        },
                      ]
                    : []),
                  ...poisonChoices.map((choice) => ({
                    value: choice.id,
                    label: choice.name,
                    description: choice.id,
                  })),
                ]}
                onValueChange={(poisonId) =>
                  set({ condition: { kind: 'poison', poisonId: Number(poisonId) } })
                }
              />
            </Row>
          ) : null}
          {cmd.condition.kind === 'status' ? (
            <>
              <Row label="状态">
                <DsSelect
                  size="compact"
                  value={cmd.condition.status}
                  options={CARRYABLE_STATUS_IDS.map((status) => ({
                    value: status,
                    label: ACTOR_STATUS_DEFINITIONS[status].label,
                    description: ACTOR_STATUS_DEFINITIONS[status].description,
                  }))}
                  onValueChange={(status) =>
                    set({
                      condition: {
                        ...cmd.condition,
                        status: status as CarryableStatusId,
                      },
                    })
                  }
                />
              </Row>
              <Row label="持续回合">
                <DsNumberInput
                  size="compact"
                  min={CARRIED_STATUS_TURN_RANGE.min}
                  max={CARRIED_STATUS_TURN_RANGE.max}
                  step={1}
                  value={cmd.condition.turns}
                  onChange={(event) =>
                    set({
                      condition: {
                        ...cmd.condition,
                        turns: Math.max(
                          CARRIED_STATUS_TURN_RANGE.min,
                          Math.min(
                            CARRIED_STATUS_TURN_RANGE.max,
                            Math.floor(Number(event.target.value)),
                          ),
                        ),
                      },
                    })
                  }
                />
              </Row>
            </>
          ) : null}
          {cmd.condition.kind === 'poisonResistance' ? (
            <Row label="毒抗加值">
              <DsNumberInput
                size="compact"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                value={cmd.condition.amount}
                onChange={(event) =>
                  set({
                    condition: {
                      kind: 'poisonResistance',
                      amount: Math.max(1, Math.floor(Number(event.target.value))),
                    },
                  })
                }
              />
            </Row>
          ) : null}
          <p className="ds-supporting-copy">
            目标必须已由入口或前面的“调整队伍成员”实例化。选择“中毒”时保证命中，不再进行毒抗随机判定；状态在大世界中不自行衰减。
          </p>
        </>
      )
    }
    case 'clearActorCondition': {
      const currentActorChoice = actorChoices.find((choice) => choice.id === cmd.actor)
      const actorOptions = [
        ...(!conditionActorChoices.some((choice) => choice.id === cmd.actor)
          ? [
              {
                value: cmd.actor,
                label: currentActorChoice
                  ? `${currentActorChoice.name}（${cmd.actor}，不可参战）`
                  : `${cmd.actor}（角色不存在）`,
                disabled: true,
              },
            ]
          : []),
        ...conditionActorChoices.map((choice) => ({
          value: choice.id,
          label: `${choice.name}（${choice.id}）`,
        })),
      ]
      const conditionKind = cmd.condition.kind
      return (
        <>
          <Row label="目标角色">
            <DsSelect
              size="compact"
              searchable
              value={cmd.actor}
              options={actorOptions}
              onValueChange={(actor) => set({ actor })}
            />
          </Row>
          <Row label="清除状态">
            <DsSelect
              size="compact"
              value={conditionKind}
              options={[
                { value: 'poison', label: '指定毒', disabled: poisonChoices.length === 0 },
                { value: 'status', label: '指定定时增益或减益' },
                { value: 'poisonResistance', label: '全部临时毒抗' },
              ]}
              onValueChange={(kind) => {
                if (kind === 'poison') {
                  const poisonId = Number(poisonChoices[0]?.id)
                  if (Number.isSafeInteger(poisonId) && poisonId > 0)
                    set({ condition: { kind, poisonId } })
                  return
                }
                if (kind === 'status') {
                  set({ condition: { kind, status: 'protect' } })
                  return
                }
                set({ condition: { kind: 'poisonResistance' } })
              }}
            />
          </Row>
          {cmd.condition.kind === 'poison' ? (
            <Row label="毒种">
              <DsSelect
                size="compact"
                searchable
                value={String(cmd.condition.poisonId)}
                options={[
                  ...(!references.has('poison', String(cmd.condition.poisonId))
                    ? [
                        {
                          value: String(cmd.condition.poisonId),
                          label: references.label('poison', String(cmd.condition.poisonId)),
                        },
                      ]
                    : []),
                  ...poisonChoices.map((choice) => ({
                    value: choice.id,
                    label: choice.name,
                    description: choice.id,
                  })),
                ]}
                onValueChange={(poisonId) =>
                  set({ condition: { kind: 'poison', poisonId: Number(poisonId) } })
                }
              />
            </Row>
          ) : null}
          {cmd.condition.kind === 'status' ? (
            <Row label="状态">
              <DsSelect
                size="compact"
                value={cmd.condition.status}
                options={CARRYABLE_STATUS_IDS.map((status) => ({
                  value: status,
                  label: ACTOR_STATUS_DEFINITIONS[status].label,
                  description: ACTOR_STATUS_DEFINITIONS[status].description,
                }))}
                onValueChange={(status) =>
                  set({ condition: { kind: 'status', status: status as CarryableStatusId } })
                }
              />
            </Row>
          ) : null}
          <p className="ds-supporting-copy">
            只清除选择的当前状态；清除临时毒抗会移除该角色的全部临时毒抗加值。
          </p>
        </>
      )
    }
    case 'setParty': {
      const battlers = actors ? Object.values(actors).filter((a) => a.battler) : []
      if (!battlers.length) break // 无角色表 → 走底部 JSON 兜底
      const members = cmd.members
      const setMembers = (next: string[]): void => set({ members: next })
      const reorderMembers = (intent: DsReorderIntent): boolean => {
        const next = reorderDsItems(members, intent)
        if (next === members) return false
        partyMemberReorderKeys.move(intent)
        setMembers([...next])
        return true
      }
      return (
        <>
          <DsReorderCollection
            adoptionId="story/set-party-members"
            scopeKey={`${reorderScopeKey}:party-members`}
            entries={members.map((id, index) => ({
              key: partyMemberReorderKeys.keys[index]!,
              label: references.label('actor', id),
            }))}
            revision={cmd}
            onReorder={reorderMembers}
          >
            <div className="cf-party-row-list">
              {members.map((id, i) => {
                const memberKey = partyMemberReorderKeys.keys[i]!
                return (
                  <DsReorderItem itemKey={memberKey} key={memberKey}>
                    <DsRepeatRow density="compact" className="cf-party-row">
                      <span className="cf-label">{i === 0 ? '队长' : `队员 ${i}`}</span>
                      <DsSelect
                        aria-label={i === 0 ? '队长' : `队员 ${i}`}
                        value={id}
                        options={battlers.map((actor) => ({
                          value: actor.id,
                          label: references.label('actor', actor.id),
                        }))}
                        onValueChange={(actorId) =>
                          setMembers(members.map((member, j) => (j === i ? actorId : member)))
                        }
                      />
                      <DsActionGroup density="compact" className="cf-party-row-actions">
                        <DsReorderMoveButton itemKey={memberKey} direction="backward" />
                        <DsReorderMoveButton itemKey={memberKey} direction="forward" />
                        <DsButton
                          variant="danger"
                          icon="delete"
                          aria-label={`删除${i === 0 ? '队长' : `队员 ${i}`}`}
                          onClick={() => setMembers(members.filter((_, j) => j !== i))}
                        >
                          删除
                        </DsButton>
                      </DsActionGroup>
                    </DsRepeatRow>
                  </DsReorderItem>
                )
              })}
            </div>
          </DsReorderCollection>
          <Row label="">
            <DsButton
              data-ds-add-picker-deferred="story/set-party-members-append-default"
              size="compact"
              variant="secondary"
              icon="add"
              onClick={() => {
                const used = new Set(members)
                const cand = battlers.find((a) => !used.has(a.id)) ?? battlers[0]
                if (cand) setMembers([...members, cand.id])
              }}
            >
              添加队员
            </DsButton>
            <span className="ds-supporting-copy">顺序=站位;落选进 reserve 不丢状态</span>
          </Row>
        </>
      )
    }
    case 'mountParty':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="偏移 dx/dy">
            <Num value={cmd.dx ?? 0} onChange={(n) => set({ dx: n || undefined })} />
            <Num value={cmd.dy ?? 0} onChange={(n) => set({ dy: n || undefined })} />
          </Row>
        </>
      )
    case 'ride':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="col / row">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'setFlag':
      return (
        <>
          <Row label="开关名">
            <WorldVariablePicker
              value={cmd.flag}
              kind="flag"
              variables={worldVariables}
              onChange={(flag) => set({ flag })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="设为">
            <Sel
              value={cmd.value ? 'true' : 'false'}
              options={['true', 'false']}
              onChange={(v) => set({ value: v === 'true' })}
            />
          </Row>
        </>
      )
    case 'setVar':
      return (
        <>
          <Row label="变量名">
            <WorldVariablePicker
              value={cmd.var}
              kind="number"
              variables={worldVariables}
              onChange={(variable) => set({ var: variable })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="设为">
            <Num value={cmd.value} onChange={(n) => set({ value: n })} />
          </Row>
        </>
      )
    case 'addVar':
      return (
        <>
          <Row label="变量名">
            <WorldVariablePicker
              value={cmd.var}
              kind="number"
              variables={worldVariables}
              onChange={(variable) => set({ var: variable })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="增减">
            <Num value={cmd.delta} onChange={(delta) => set({ delta })} />
          </Row>
        </>
      )
    case 'branch': {
      const c = cmd.cond
      const itemCondition =
        c.kind === 'hasItem' || c.kind === 'ownsItem' || c.kind === 'itemEquipped' ? c : undefined
      return (
        <>
          {c.kind === 'flag' ? (
            <>
              <Row label="条件:开关">
                <WorldVariablePicker
                  value={c.flag}
                  kind="flag"
                  variables={worldVariables}
                  onChange={(flag) => set({ cond: { ...c, flag } })}
                  onOpen={onOpenWorldVariable}
                />
              </Row>
              <Row label="要求为">
                <Sel
                  value={c.is ? 'true' : 'false'}
                  options={['true', 'false']}
                  onChange={(v) => set({ cond: { ...c, is: v === 'true' } })}
                />
              </Row>
            </>
          ) : c.kind === 'var' ? (
            <>
              <Row label="条件:数值">
                <WorldVariablePicker
                  value={c.var}
                  kind="number"
                  variables={worldVariables}
                  onChange={(variable) => set({ cond: { ...c, var: variable } })}
                  onOpen={onOpenWorldVariable}
                />
              </Row>
              <Row label="比较">
                <Sel
                  value={c.op}
                  options={['==', '!=', '>=', '<=', '>', '<'] as const}
                  onChange={(op) => set({ cond: { ...c, op } })}
                />
              </Row>
              <Row label="值">
                <Num value={c.value} onChange={(value) => set({ cond: { ...c, value } })} />
              </Row>
            </>
          ) : itemCondition ? (
            <>
              <Row label="条件">
                <span className="cf-readonly">
                  {itemCondition.kind === 'hasItem'
                    ? '背包持有'
                    : itemCondition.kind === 'ownsItem'
                      ? '背包与装备合计'
                      : '当前已装备'}
                </span>
              </Row>
              <Row label="物品">
                <NamedIdPicker
                  value={itemCondition.itemId}
                  choices={references.choices('item')}
                  kindLabel="物品"
                  inputName="script-condition-item"
                  onChange={(itemId) => set({ cond: { ...itemCondition, itemId } })}
                />
              </Row>
              <Row label="至少">
                <Num
                  value={itemCondition.atLeast ?? 1}
                  onChange={(atLeast) =>
                    set({
                      cond: {
                        ...itemCondition,
                        atLeast: atLeast > 1 ? atLeast : undefined,
                      },
                    })
                  }
                />
              </Row>
            </>
          ) : (
            <p className="hint">非 flag 条件({c.kind})用下方 JSON 编辑。</p>
          )}
          <p className="hint">
            成立走 then 臂、不成立走 else 臂 —— 树里展开臂内行,行悬停 ＋ 插指令。
          </p>
        </>
      )
    }
    case 'playSound':
      return (
        <Row label="音效">
          <SoundPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (asset) set({ asset })
            }}
            catalog={assetCatalog}
            reader={assetReader}
            onOpenAsset={onOpenSound}
          />
        </Row>
      )
    case 'playMusic':
      return (
        <Row label="音乐">
          <MusicPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (typeof asset === 'string') set({ asset })
            }}
            catalog={assetCatalog}
            resolver={audioResolver}
          />
        </Row>
      )
    case 'openShop':
      return (
        <>
          <Row label="店铺">
            {shops?.length ? (
              <Sel
                value={String(cmd.shop)}
                options={shops.map((x) => String(x.id))}
                labels={shops.map((x) => `店 ${x.id}(${x.items.length} 货)`)}
                onChange={(v) => set({ shop: Number(v) })}
              />
            ) : (
              <Num value={cmd.shop} onChange={(n) => set({ shop: n })} />
            )}
          </Row>
          <Row label="模式">
            <Sel
              value={cmd.mode}
              options={['buy', 'sell']}
              labels={['买(店铺货单)', '卖(当铺收购)']}
              onChange={(v) => set({ mode: v })}
            />
          </Row>
        </>
      )
    case 'setAmbience':
      return (
        <Row label="氛围">
          {ambiences?.length ? (
            <NamedIdPicker
              value={cmd.ambience}
              choices={references.choices('ambience')}
              kindLabel="氛围"
              inputName="script-ambience"
              onChange={(ambience) => set({ ambience })}
            />
          ) : (
            <Txt value={cmd.ambience} onChange={(s) => set({ ambience: s })} />
          )}
        </Row>
      )
    case 'giveMoney':
      return (
        <Row label="增减钱">
          <Num value={cmd.delta} onChange={(n) => set({ delta: n })} />
        </Row>
      )
    case 'learnSkill':
      return (
        <>
          <Row label="原版角色槽位">
            <Num value={cmd.role} onChange={(role) => set({ role })} />
          </Row>
          <Row label="仙术">
            <NamedIdPicker
              value={cmd.skill}
              choices={references.choices('skill')}
              kindLabel="仙术"
              inputName="script-skill"
              onChange={(skill) => set({ skill })}
            />
          </Row>
          <p className="cf-warn">
            角色仍使用原版数字槽位；它不是新项目可用的稳定角色引用，已纳入脚本模型现代化整改。
          </p>
        </>
      )
    case 'giveItem':
    case 'loseItem':
      return (
        <>
          <Row label="物品">
            <NamedIdPicker
              value={cmd.itemId}
              choices={references.choices('item')}
              kindLabel="物品"
              inputName="script-item"
              onChange={(itemId) => set({ itemId })}
            />
          </Row>
          <Row label="数量">
            <Num value={cmd.count ?? 1} onChange={(n) => set({ count: n > 1 ? n : undefined })} />
          </Row>
        </>
      )
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport': {
      const targetId = cmd.script?.id
      const targetMeta = targetId ? scriptIndex?.library?.[targetId] : undefined
      return (
        <>
          {targetId ? (
            <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
              <span className="cf-ref-row">
                <code className="cf-ref-target">
                  {targetMeta ? references.label('authorScript', targetId) : targetId}
                </code>
                {onOpenScript ? (
                  <DsButton
                    size="compact"
                    variant="quiet"
                    icon="open"
                    title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                    onClick={() => onOpenScript(targetId)}
                  >
                    打开
                  </DsButton>
                ) : null}
              </span>
            </Row>
          ) : null}
          {showRawJson ? <JsonForm cmd={cmd} onChange={onChange} /> : null}
        </>
      )
    }
    case 'jumpScript': {
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
            <span className="cf-ref-row">
              <code className="cf-ref-target">
                {targetMeta ? references.label('authorScript', cmd.ref.id) : cmd.ref.id}
              </code>
              {onOpenScript ? (
                <DsButton
                  size="compact"
                  variant="quiet"
                  icon="open"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  打开
                </DsButton>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <DsSelect
              size="compact"
              value={selfValue}
              options={[
                { value: '', label: '继承当前执行者' },
                ...explicitEntities.map((id) => ({ value: id, label: id })),
                ...(selfValue && !explicitEntities.includes(selfValue)
                  ? [{ value: selfValue, label: `${selfValue}(不在场)` }]
                  : []),
              ]}
              onValueChange={(self) => set({ self: self || undefined })}
            />
          </Row>
        </>
      )
    }
    case 'callScript': {
      const authored: [string, SharedScriptMetaV1][] = Object.entries(
        scriptIndex?.library ?? {},
      ).sort(([, a], [, b]) => a.name.localeCompare(b.name))
      const options: [string, SharedScriptMetaV1][] = authored.some(([id]) => id === cmd.ref.id)
        ? authored
        : [[cmd.ref.id, { name: `${cmd.ref.id}（内部）`, self: 'none' as const }], ...authored]
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label="目标">
            <span className="cf-ref-row">
              <DsSelect
                size="compact"
                value={cmd.ref.id}
                options={options.map(([id, meta]) => ({
                  value: id,
                  label: references.has('authorScript', id)
                    ? references.label('authorScript', id)
                    : meta.name,
                }))}
                onValueChange={(id) => {
                  const chunk = scriptIndex ? deriveScriptChunk(id, scriptIndex.shards) : undefined
                  set({ ref: { id, chunk: chunk ?? cmd.ref.chunk } })
                }}
              />
              {onOpenScript ? (
                <DsButton
                  size="compact"
                  variant="quiet"
                  icon="open"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  打开
                </DsButton>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <DsSelect
              size="compact"
              value={selfValue}
              options={[
                { value: '', label: '继承当前执行者' },
                ...explicitEntities.map((id) => ({ value: id, label: id })),
                ...(selfValue && !explicitEntities.includes(selfValue)
                  ? [{ value: selfValue, label: `${selfValue}(不在场)` }]
                  : []),
              ]}
              onValueChange={(self) => set({ self: self || undefined })}
            />
          </Row>
          {targetMeta?.self === 'required' && !cmd.self && !hasImplicitSelf ? (
            <p className="cf-err">目标要求 self；当前来源没有可继承执行者，请显式选择实体。</p>
          ) : null}
          <p className="hint mono">{cmd.ref.id}</p>
        </>
      )
    }
    case 'cameraPan':
      return (
        <>
          <Row label="dx">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
          <Row label="帧数">
            <Num value={cmd.frames} onChange={(n) => set({ frames: n })} />
          </Row>
        </>
      )
    case 'clearDialog':
    case 'cameraSnap':
      return (
        <p className="hint">
          此指令无可编参数
          {cmd.kind === 'cameraSnap' && cmd.to && showRawJson ? '(定位坐标用 JSON)' : ''}。
        </p>
      )
    default:
      // 结构类(branch/confirm/startBattle/页切换)与低频指令:JSON 兜底
      return showRawJson ? (
        <JsonForm cmd={cmd} onChange={onChange} />
      ) : (
        <p className="hint">此指令请使用新版结构化属性表单编辑。</p>
      )
  }
}
