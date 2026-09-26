import type {
  AmbienceDef,
  AssetCatalogV1,
  SceneDef,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { deriveScriptChunk } from '@type-pal/content'
import type { AudioAssetReader } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import type { CommandFormCommand } from './command-form-contract.js'
import { JsonForm, Num, Row, Sel, Txt, WorldVariablePicker } from './command-form-controls.js'
import { DsButton, DsSelect } from './design-system/index.js'
import { MusicPicker } from './MusicPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SoundPicker } from './SoundPicker.js'

type SpecializedCommandKind =
  | 'dialog'
  | 'wait'
  | 'fade'
  | 'holdScreen'
  | 'revealScreen'
  | 'ditherScreen'
  | 'teleportParty'
  | 'setPartyFacing'
  | 'moveParty'
  | 'moveEntity'
  | 'setEntityState'
  | 'setEntityFacing'
  | 'setEntityFrame'
  | 'playEntityAction'
  | 'stopEntityAction'
  | 'stepEntity'
  | 'animEntity'
  | 'nudgeEntity'
  | 'nudgeParty'
  | 'setActorSprite'
  | 'setActorAppearance'
  | 'loadScene'
  | 'takeEntity'
  | 'releaseEntity'
  | 'applyActorCondition'
  | 'clearActorCondition'
  | 'setParty'
  | 'mountParty'
  | 'ride'

type ControlCommand = Exclude<CommandFormCommand, { kind: SpecializedCommandKind }>

export interface ControlCommandFormProps {
  command: ControlCommand
  scene: SceneDef
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  ambiences?: AmbienceDef[]
  shops?: ShopDef[]
  references: ScriptReferenceCatalog
  scriptIndex?: ScriptIndexV1
  hasImplicitSelf?: boolean
  onOpenScript?: (id: string) => void
  worldVariables?: WorldVariableRegistryV1
  onOpenWorldVariable?: (id: string) => void
  onOpenSound?: (id: string) => void
  showRawJson: boolean
  onChange: (next: CommandFormCommand) => void
}

/** Owns control flow, variables, resources, inventory, script links and camera command forms. */
export function ControlCommandForm(props: ControlCommandFormProps) {
  const {
    command: cmd,
    scene,
    assetCatalog,
    audioResolver,
    assetReader,
    ambiences,
    shops,
    references,
    scriptIndex,
    hasImplicitSelf,
    onOpenScript,
    worldVariables,
    onOpenWorldVariable,
    onOpenSound,
    showRawJson,
    onChange,
  } = props
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as ControlCommand)

  switch (cmd.kind) {
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
