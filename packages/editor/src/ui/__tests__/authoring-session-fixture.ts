import type { AssetRecordV1 } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { act } from 'react'
import { sha256Hex } from '../../core/binary-signature.js'
import type { Command } from '../../core/command-contract.js'
import { UpsertAssetCommand } from '../../core/commands.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { loadLegalUiProject } from './authoring-project-fixture.js'

export interface AuthoringSessionFixture {
  session: EditSession
  reader: EditorAssetReader
  /** 正式 AssetBase（source + assetResolver），供组件真实资产准备边界使用。 */
  assetBase: AssetBase
}

/** 合法 blank 项目 + 真 EditSession + 真磁盘 reader + 正式 AssetBase。 */
export async function createAuthoringSession(name: string): Promise<AuthoringSessionFixture> {
  const legal = await loadLegalUiProject(name)
  const session = new EditSession(legal.state)
  return {
    session,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
    assetBase: legal.assetBase,
  }
}

/** 同步派发若干真命令并逐条断言成功。 */
export async function dispatchFixtureCommands(
  session: EditSession,
  commands: readonly Command[],
): Promise<void> {
  await act(async () => {
    for (const command of commands) {
      if (!session.dispatch(command)) throw new Error(`播种命令被拒绝：${command.label}`)
    }
  })
}

export interface SeededAsset {
  id: string
  record: AssetRecordV1
  command: UpsertAssetCommand
}

/** 以真实 sha256/字节数构造 authored 资源导入命令（record 与字节一致）。 */
export async function createAssetSeedCommand(input: {
  id: string
  kind: AssetRecordV1['kind']
  extension: string
  mediaType: string
  directory: string
  label: string
  ref: string
  bytes: Uint8Array
}): Promise<SeededAsset> {
  const sha256 = await sha256Hex(input.bytes)
  const record: AssetRecordV1 = {
    kind: input.kind,
    path: `assets/authored/${input.directory}/${sha256}.${input.extension}`,
    mediaType: input.mediaType,
    bytes: input.bytes.byteLength,
    sha256,
    label: input.label,
    origin: { kind: 'authored', ref: input.ref },
  }
  return {
    id: input.id,
    record,
    command: new UpsertAssetCommand(input.id, record, Uint8Array.from(input.bytes).buffer),
  }
}
