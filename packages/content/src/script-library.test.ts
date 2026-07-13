import { describe, expect, it } from 'vitest'
import {
  checkScriptIndex,
  deriveScriptChunk,
  isScriptRef,
  stableScriptHash,
  type ScriptIndexV1,
} from './script-library.js'
import { checkStages } from './script.js'

const shards = { shared: 16, global: { items: 4 } }

describe('script library schema', () => {
  it('按稳定 id 重算 scene/shared/global chunk', () => {
    expect(deriveScriptChunk('scene/s001/on-enter/0', shards)).toBe('scene/s001')
    expect(deriveScriptChunk('shared/L_123/default', shards)).toMatch(/^shared\/c\d{2}$/)
    expect(deriveScriptChunk('global/items/use/i42', shards)).toMatch(/^global\/items\/c\d{2}$/)
    expect(deriveScriptChunk('global/skills/use/s1', shards)).toBeUndefined()
    expect(stableScriptHash('shared/L_123/default')).toBe(stableScriptHash('shared/L_123/default'))
  })

  it('ScriptRef 需要完整 chunk 和稳定 id', () => {
    expect(isScriptRef({ chunk: 'scene/s001', id: 'scene/s001/on-enter/0' })).toBe(true)
    expect(isScriptRef({ chunk: '', id: 'x' })).toBe(false)
  })

  it('index 只接受元数据与有效分桶配置', () => {
    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: { 'scene/s001': { path: 'chunks/scene/s001.json', bytes: 123 } },
    }
    expect(() => checkScriptIndex(index)).not.toThrow()
    expect(() => checkScriptIndex({ ...index, shards: { ...shards, shared: 0 } })).toThrow(/正整数/)
  })

  it('stage 同时支持 inline、call/jump 与 ref 换页', () => {
    expect(() => checkStages([{ body: [{ kind: 'callScript', ref: { chunk: 'scene/s001', id: 'scene/s001/root' } }] }], 'stages')).not.toThrow()
    expect(() => checkStages([{ body: [{ kind: 'setEntityAuto', entity: 'e1', script: { chunk: 'shared/c00', id: 'shared/auto/e1' } }] }], 'stages')).not.toThrow()
    expect(() => checkStages([{ body: [{ kind: 'jumpScript', ref: { chunk: '', id: 'bad' } }] }], 'stages')).toThrow(/ScriptRef/)
  })
})
