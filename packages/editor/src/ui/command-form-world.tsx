import type {
  AssetCatalogV1,
  BattleSpriteDef,
  Command,
  Facing,
  GridPos,
  LoadSceneCommand,
  SceneDef,
  SceneTransitionProfile,
  SpriteDef,
  WalkSpeed,
} from '@type-pal/content'
import { type ActorDef, resolveEntitySpriteId } from '@type-pal/content'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { defaultActionTargetForEntity, sortedSpriteActions } from '../core/sprite-actions.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { EntitySel, Num, Row, Sel, Txt } from './command-form-controls.js'
import { DsButton, DsCheckbox, DsSelect, DsTextInput } from './design-system/index.js'
import { EntityStateSelect } from './EntityStateSelect.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'

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

type WorldCommandKind =
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

type WorldCommand = Extract<Command, { kind: WorldCommandKind }>

export interface WorldCommandFormProps {
  command: WorldCommand
  scene: SceneDef
  scenes?: SceneDef[]
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  sprites: readonly SpriteDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  references: ScriptReferenceCatalog
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  onChange: (next: Command) => void
}

/** Owns world movement, entity action, appearance and scene-transfer command forms. */
export function WorldCommandForm(props: WorldCommandFormProps) {
  const {
    command: cmd,
    scene,
    scenes,
    actors,
    battleSprites,
    sprites,
    assetCatalog,
    assetReader,
    references,
    onOpenImage,
    onOpenBattleSprite,
    onOpenSpriteAction,
    onChange,
  } = props
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)
  const actorChoices = references.choices('actor')
  const spriteChoices = references.choices('sprite')

  switch (cmd.kind) {
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
  }
}
