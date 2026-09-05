import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  assertDirectoryFileCount,
  assertFullJsonContracts,
  assertRegularNonEmptyFile,
  readRequiredJson,
} from './full-inputs.mjs'

const validJsonContracts = () =>
  new Map([
    ['data/extracted/asset-manifest.json', { version: 'hash', fileCount: 1, files: [{}] }],
    ['data/extracted/events/all.json', { segments: [{}] }],
    ['data/extracted/data/player-roles.json', { roles: Array.from({ length: 6 }, () => ({})) }],
    ['data/extracted/data/scene/0.json', { sceneId: 0 }],
    ['data/extracted/data/scene/1.json', { sceneId: 1 }],
    ['data/extracted/data/scene/14.json', { sceneId: 14 }],
    ['data/extracted/data/scene/17.json', { sceneId: 17 }],
    ['projects/pal/manifest.json', { id: 'pal', contentVersion: 20, minimumSaveVersion: 8 }],
    [
      'packages/migrate/baselines/pal/_state.json',
      { version: 1, managedFiles: ['manifest.json'], files: {} },
    ],
  ])

test('full file guard 区分缺失、目录与空文件', async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), 'type-pal-coverage-input-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  await assert.rejects(() => assertRegularNonEmptyFile(root, 'missing.bin'), /文件不存在/)
  await mkdir(resolve(root, 'directory.bin'))
  await assert.rejects(() => assertRegularNonEmptyFile(root, 'directory.bin'), /不是 regular file/)
  await writeFile(resolve(root, 'empty.bin'), '')
  await assert.rejects(() => assertRegularNonEmptyFile(root, 'empty.bin'), /文件为空/)
})

test('full JSON guard 在运行测试前拒绝坏 JSON', async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), 'type-pal-coverage-json-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(resolve(root, 'bad.json'), '{')
  await assert.rejects(() => readRequiredJson(root, 'bad.json'), /JSON 无法解析/)
  await writeFile(resolve(root, 'ok.json'), '{"version":1}')
  assert.deepEqual(await readRequiredJson(root, 'ok.json'), { version: 1 })
})

test('full directory guard 要求真实目录和最低文件数', async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), 'type-pal-coverage-directory-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  await assert.rejects(
    () => assertDirectoryFileCount(root, { path: 'assets', extension: '.rle', minimumFiles: 1 }),
    /目录不存在/,
  )
  await mkdir(resolve(root, 'assets'))
  await writeFile(resolve(root, 'assets/a.rle'), 'x')
  assert.equal(
    await assertDirectoryFileCount(root, {
      path: 'assets',
      extension: '.rle',
      minimumFiles: 1,
    }),
    1,
  )
})

test('full JSON contract 拒绝错版本 current 工程与错误 scene identity', () => {
  const valid = validJsonContracts()
  assert.doesNotThrow(() => assertFullJsonContracts(valid))
  const wrongVersion = validJsonContracts()
  wrongVersion.set('projects/pal/manifest.json', {
    id: 'pal',
    contentVersion: 19,
    minimumSaveVersion: 8,
  })
  assert.throws(() => assertFullJsonContracts(wrongVersion), /content20\/SAVE8/)
  const wrongScene = validJsonContracts()
  wrongScene.set('data/extracted/data/scene/14.json', { sceneId: 17 })
  assert.throws(() => assertFullJsonContracts(wrongScene), /sceneId 不匹配/)
})
