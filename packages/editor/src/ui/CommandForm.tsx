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
  BattleSpriteDef,
  Command,
  Locale,
  SceneDef,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  SpriteDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { type ActorDef, deriveScriptChunk } from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { ActorCommandForm } from './command-form-actor.js'
import { JsonForm, Num, Row, Sel, Txt, WorldVariablePicker } from './command-form-controls.js'
import { DialogueCommandForm } from './command-form-dialogue.js'
import { WorldCommandForm } from './command-form-world.js'
import { DsButton, DsSelect } from './design-system/index.js'
import { MusicPicker } from './MusicPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SoundPicker } from './SoundPicker.js'

export { WorldVariablePicker } from './command-form-controls.js'
export type { LoadSceneTarget } from './command-form-world.js'
export { makeLoadScene, retargetLoadScene } from './command-form-world.js'

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
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)
  switch (cmd.kind) {
    case 'dialog':
      return (
        <DialogueCommandForm
          command={cmd}
          locale={locale}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          actors={actors}
          onOpenImage={onOpenImage}
          onDialogueSpeakerOverrideChange={onDialogueSpeakerOverrideChange}
          showRawJson={showRawJson}
          reorderScopeKey={reorderScopeKey}
          onChange={onChange}
        />
      )
    case 'wait':
    case 'fade':
    case 'holdScreen':
    case 'revealScreen':
    case 'ditherScreen':
    case 'teleportParty':
    case 'setPartyFacing':
    case 'moveParty':
    case 'moveEntity':
    case 'setEntityState':
    case 'setEntityFacing':
    case 'setEntityFrame':
    case 'playEntityAction':
    case 'stopEntityAction':
    case 'stepEntity':
    case 'animEntity':
    case 'nudgeEntity':
    case 'nudgeParty':
    case 'setActorSprite':
    case 'setActorAppearance':
    case 'loadScene':
    case 'takeEntity':
    case 'releaseEntity':
      return (
        <WorldCommandForm
          command={cmd}
          scene={scene}
          scenes={scenes}
          actors={actors}
          battleSprites={battleSprites}
          sprites={sprites}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          references={references}
          onOpenImage={onOpenImage}
          onOpenBattleSprite={onOpenBattleSprite}
          onOpenSpriteAction={onOpenSpriteAction}
          onChange={onChange}
        />
      )
    case 'applyActorCondition':
    case 'clearActorCondition':
    case 'setParty':
    case 'mountParty':
    case 'ride':
      return (
        <ActorCommandForm
          command={cmd}
          scene={scene}
          actors={actors}
          references={references}
          showRawJson={showRawJson}
          reorderScopeKey={reorderScopeKey}
          onChange={onChange}
        />
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
