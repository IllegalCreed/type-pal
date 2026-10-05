/**
 * TEST-GLM-EDITOR-AUTHORING-PANELS-1 共享夹具：只被本卡三个新测试文件导入，不被生产引用。
 *
 * 边界纪律：
 * - 项目一律经真实 blank seed → 真实 loader（loadCurrentProjectFrom + 全量场景/地图）→
 *   toEditorState → assertProjectSaveValid 自证；不手搓 EditorState。
 * - 命令播种只用生产命令，会话保持可保存合法；播种失败即抛错，不静默吞。
 * - wavBytes 构造真实 RIFF/WAVE 头 + 单采样 PCM 帧（SoundTab assertWave 可过）；
 *   webmBytes 构造 EBML 魔数（CutsceneTab videoExtension 的 webm 分支输入）、mp4Bytes
 *   构造 ftyp 盒位魔数。三者只证明字节层合同，不宣称任何音频/视频解码保真。
 */

import type { AssetRecordV1 } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { act } from 'react'
import { sha256Hex } from '../../core/binary-signature.js'
import type { Command } from '../../core/command-contract.js'
import { UpsertAssetCommand } from '../../core/commands.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { loadLegalUiProject } from './glm-ui-wave-kit.js'

export interface AuthoringBundle {
  session: EditSession
  reader: EditorAssetReader
  /** 正式 AssetBase（source + assetResolver），供组件真实资产准备边界使用。 */
  assetBase: AssetBase
}

/** 合法 blank 项目 + 真 EditSession + 真磁盘 reader + 正式 AssetBase。 */
export async function buildLegalBundle(name: string): Promise<AuthoringBundle> {
  const legal = await loadLegalUiProject(name)
  const session = new EditSession(legal.state)
  return {
    session,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
    assetBase: legal.assetBase,
  }
}

/** 同步派发若干真命令并逐条断言成功。 */
export async function dispatchAll(
  session: EditSession,
  commands: readonly Command[],
): Promise<void> {
  await act(async () => {
    for (const command of commands) {
      if (!session.dispatch(command)) throw new Error(`播种命令被拒绝：${command.label}`)
    }
  })
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** 以真实字节构造 File（与产品 CutsceneTab 同款 ownedBuffer 归一）。 */
export function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([ownedBuffer(bytes)], name, { type })
}

/** 最小合法 WAV：44 字节 PCM 头 + N 个 16bit 单声道采样；RIFF/WAVE 头与 data 长度自洽。 */
export function wavBytes(samples = 1): Uint8Array {
  const data = new Uint8Array(samples * 2)
  const bytes = new Uint8Array(44 + data.byteLength)
  const writer = new DataView(bytes.buffer)
  const ascii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1)
      bytes[offset + index] = text.charCodeAt(index)
  }
  ascii(0, 'RIFF')
  writer.setUint32(4, 36 + data.byteLength, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  writer.setUint32(16, 16, true)
  writer.setUint16(20, 1, true) // PCM
  writer.setUint16(22, 1, true) // mono
  writer.setUint32(24, 22050, true)
  writer.setUint32(28, 44100, true)
  writer.setUint16(32, 2, true)
  writer.setUint16(34, 16, true)
  ascii(36, 'data')
  writer.setUint32(40, data.byteLength, true)
  bytes.set(data, 44)
  return bytes
}

export interface SeededAsset {
  id: string
  record: AssetRecordV1
  command: UpsertAssetCommand
}

/** 以真实 sha256/字节数构造 authored 资源导入命令（record 与字节一致）。 */
export async function seededAssetCommand(input: {
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
    command: new UpsertAssetCommand(input.id, record, ownedBuffer(input.bytes)),
  }
}

/** webm 容器魔数（EBML 1A45DFA3）+ 可区分填充字节；供 videoExtension webm 分支真实输入。 */
export function webmBytes(fill = 0x5a): Uint8Array {
  const bytes = new Uint8Array(32)
  bytes.set([0x1a, 0x45, 0xdf, 0xa3], 0)
  bytes.fill(fill, 4)
  return bytes
}

/** mp4 ftyp 盒位魔数（offset 4-7 == 'ftyp'）；供 videoExtension mp4 分支真实输入。 */
export function mp4Bytes(total = 32): Uint8Array {
  const bytes = new Uint8Array(total)
  bytes.set([0x66, 0x74, 0x79, 0x70], 4)
  return bytes
}
