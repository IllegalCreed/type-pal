import type { EntityDef } from '@type-pal/content'
import { useId } from 'react'
import type { EditSession } from '../core/edit-session.js'
import { UpdateEntityCommand } from '../core/entity-commands.js'
import { DsDraftTextInput, DsPropertyRow } from './design-system/index.js'

export function EntityNameField(props: {
  entity: EntityDef
  sceneId: string
  session: EditSession
}) {
  const id = useId()
  return (
    <DsPropertyRow
      label="实体名称"
      labelFor={id}
      help="只命名当前场景实例，不改ID或人物库名称。留空沿用人物名称或编号。"
    >
      <DsDraftTextInput
        id={id}
        size="compact"
        draftKey={`scene:${props.sceneId}:entity:${props.entity.id}:label`}
        syncToken={props.session.getHistoryVersion()}
        value={props.entity.label ?? ''}
        placeholder="填写人物、物件或触发区用途"
        onCommit={(value) => {
          const label = value.trim() || undefined
          if (label === props.entity.label) return false
          return props.session.dispatch(
            new UpdateEntityCommand(props.sceneId, props.entity.id, { label }),
          )
        }}
      />
    </DsPropertyRow>
  )
}
