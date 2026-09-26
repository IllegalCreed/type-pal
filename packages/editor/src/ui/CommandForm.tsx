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
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  BattleSpriteDef,
  Locale,
  SceneDef,
  ScriptIndexV1,
  ShopDef,
  SpriteDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { ActorCommandForm } from './command-form-actor.js'
import type { CommandFormCommand } from './command-form-contract.js'
import { ControlCommandForm } from './command-form-control.js'
import { DialogueCommandForm } from './command-form-dialogue.js'
import { WorldCommandForm } from './command-form-world.js'

export { WorldVariablePicker } from './command-form-controls.js'
export type { LoadSceneTarget } from './command-form-world.js'
export { makeLoadScene, retargetLoadScene } from './command-form-world.js'

export interface CommandFormProps {
  cmd: CommandFormCommand
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
  onChange: (next: CommandFormCommand) => void
}

export function CommandForm(props: CommandFormProps) {
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
    default:
      return (
        <ControlCommandForm
          command={cmd}
          scene={scene}
          assetCatalog={assetCatalog}
          audioResolver={audioResolver}
          assetReader={assetReader}
          ambiences={ambiences}
          shops={shops}
          references={references}
          scriptIndex={scriptIndex}
          hasImplicitSelf={hasImplicitSelf}
          onOpenScript={onOpenScript}
          worldVariables={worldVariables}
          onOpenWorldVariable={onOpenWorldVariable}
          onOpenSound={onOpenSound}
          showRawJson={showRawJson}
          onChange={onChange}
        />
      )
  }
}
