// TEST-GLM-EDITOR-ASSET-LIFECYCLE-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红 → git 还原 → 定向绿；raw 落盘后统一 trimEof + 重算 hash。
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../../..')
const editor = path.join(root, 'packages/editor')
const ev = path.join(root, 'docs/ops/tasks/evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1')
const logs = path.join(ev, 'mutation-logs')

const run = (file, args, out) => {
  try {
    const stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', file, ...args], {
      cwd: editor,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    writeFileSync(out, `${stdout}\n`)
    return 0
  } catch (error) {
    const text = `${error.stdout ?? ''}${error.stderr ?? ''}`
    writeFileSync(out, `${text}\n`)
    return error.status ?? 1
  }
}

const mutate = (file, oldText, newText) => {
  const full = path.join(editor, file)
  const source = readFileSync(full, 'utf8')
  if (!source.includes(oldText))
    throw new Error(`mutation anchor missing in ${file}: ${oldText.slice(0, 60)}`)
  writeFileSync(full, source.replace(oldText, newText))
}
const restore = (file) => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/editor/${file}`], {
    stdio: 'ignore',
  })
}

const needles = [
  {
    id: 'N1-revision-invalidation',
    file: 'src/ui/ImageAssetPicker.tsx',
    old: '  }, [asset, kind, props.paletteColors, props.revision, reader])',
    new: '  }, [asset, kind, props.paletteColors, reader])',
    target: 'src/ui/ImageAssetPicker.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '同 AssetId 替换'],
    mutation: 'ImageAssetPicker.tsx effect 依赖数组移除 props.revision',
  },
  {
    id: 'N2-stale-alive-guard',
    file: 'src/ui/ImageAssetPicker.tsx',
    old: `      .then(async (bytes) => {
        if (!alive) return
        const record = reader.record(asset, kind)
        const blob = await thumbnailBlob(bytes, record.mediaType, kind, props.paletteColors)
        if (!alive) return
        objectUrl = URL.createObjectURL(blob)`,
    new: `      .then(async (bytes) => {
        const record = reader.record(asset, kind)
        const blob = await thumbnailBlob(bytes, record.mediaType, kind, props.paletteColors)
        objectUrl = URL.createObjectURL(blob)`,
    target: 'src/ui/ImageAssetPicker.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '在途 stale'],
    mutation: 'ImageAssetPicker.tsx then 回调内两处 alive 守卫全部删除',
  },
  {
    id: 'N3-failure-surfacing',
    file: 'src/ui/ImageAssetPicker.tsx',
    old: `      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })`,
    new: `      .catch((cause: unknown) => {
        void cause
      })`,
    target: 'src/ui/ImageAssetPicker.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '失败后恢复'],
    mutation: 'ImageAssetPicker.tsx catch 分支不再 setError（读取失败被吞）',
  },
  {
    id: 'N4-palette-recolor',
    file: 'src/ui/ImageAssetPicker.tsx',
    old: `      const color = paletteColors[index] ?? [0, 0, 0]
      image.data[offset] = color[0]
      image.data[offset + 1] = color[1]
      image.data[offset + 2] = color[2]
      image.data[offset + 3] = 255`,
    new: `      const color = paletteColors[index] ?? [0, 0, 0]
      void color
      image.data[offset] = index
      image.data[offset + 1] = index
      image.data[offset + 2] = index
      image.data[offset + 3] = 255`,
    target: 'src/ui/ImageAssetPicker.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '带色盘'],
    mutation: 'ImageAssetPicker.tsx 重染循环不写色盘色（保留索引值）',
  },
  {
    id: 'N5-audio-missing-focus',
    file: 'src/ui/AudioAssetWorkbench.tsx',
    old: `  const selected = missingFocusedId
    ? undefined
    : (entries.find((entry) => entry.id === selectedId) ?? entries[0])`,
    new: `  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0]`,
    extraOld: `        hero={
          !missingFocusedId && selected ? (`,
    extraNew: `        hero={
          selected ? (`,
    target: 'src/ui/AssetInspectorTabs.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '音乐/音效检查器缺失焦点'],
    mutation: 'AudioAssetWorkbench.tsx selected 回落与 hero 两处缺失焦点守卫删除',
  },
  {
    id: 'N6-cutscene-kind-fallback',
    file: 'src/ui/CutsceneTab.tsx',
    old: `  const [selectedId, setSelectedId] = useState<AssetId | undefined>(
    focusObjectId &&
      (catalog.assets[focusObjectId]?.kind === 'video' ||
        catalog.assets[focusObjectId]?.kind === 'frame-animation')
      ? focusObjectId
      : (videos[0]?.id ?? animations[0]?.id),
  )`,
    new: `  const [selectedId, setSelectedId] = useState<AssetId | undefined>(
    focusObjectId ? focusObjectId : (videos[0]?.id ?? animations[0]?.id),
  )`,
    extraOld: `    if (!selected && allEntries[0]) setSelectedId(allEntries[0].id)`,
    extraNew: ``,
    target: 'src/ui/AssetInspectorTabs.glm-asset-lifecycle.test.tsx',
    filter: ['-t', '过场检查器'],
    mutation: 'CutsceneTab.tsx 初始选择 kind 检查与无效选择兜底重置同时删除',
  },
  {
    id: 'N7-stale-frame-placeholder',
    file: 'src/ui/SpriteActionEditor.tsx',
    old: 'source={props.frames[step.frame]?.canvas}',
    new: 'source={props.frames[step.frame]!.canvas}',
    target: 'src/ui/SpriteActionEditor.glm-asset-lifecycle.test.tsx',
    filter: [],
    mutation: 'SpriteActionEditor.tsx 帧画布查表移除可选链守卫',
  },
]

const threeFiles = [
  'src/ui/ImageAssetPicker.glm-asset-lifecycle.test.tsx',
  'src/ui/AssetInspectorTabs.glm-asset-lifecycle.test.tsx',
  'src/ui/SpriteActionEditor.glm-asset-lifecycle.test.tsx',
]

const baselineExit = run(
  threeFiles[0],
  [...threeFiles.slice(1)],
  path.join(logs, 'green-baseline.raw'),
)
console.log('baseline exit', baselineExit)

const results = []
for (const needle of needles) {
  mutate(needle.file, needle.old, needle.new)
  if (needle.extraOld !== undefined) {
    const full = path.join(editor, needle.file)
    const source = readFileSync(full, 'utf8')
    if (!source.includes(needle.extraOld)) throw new Error(`extra anchor missing: ${needle.id}`)
    writeFileSync(full, source.replace(needle.extraOld, needle.extraNew))
  }
  const redExit = run(needle.target, needle.filter, path.join(logs, `${needle.id}.red.raw`))
  restore(needle.file)
  const greenExit = run(needle.target, needle.filter, path.join(logs, `${needle.id}.green.raw`))
  const porcelain = execFileSync(
    'git',
    ['-C', root, 'status', '--porcelain', 'packages/editor/src'],
    {
      encoding: 'utf8',
    },
  )
  // 本卡三个测试文件（新增/其未提交修改）允许存在；任何产品文件改动都算未还原。
  const ownTests = [
    'ImageAssetPicker.glm-asset-lifecycle.test.tsx',
    'AssetInspectorTabs.glm-asset-lifecycle.test.tsx',
    'SpriteActionEditor.glm-asset-lifecycle.test.tsx',
  ]
  const productDirty = porcelain
    .split('\n')
    .filter((line) => line.trim())
    .filter((line) => !ownTests.some((name) => line.includes(name)))
  results.push({ ...needle, redExit, greenExit, productClean: productDirty.length === 0 })
  console.log(needle.id, 'red', redExit, 'green', greenExit, 'clean', productDirty.length === 0)
}

// trimEof + hash
for (const name of [
  'green-baseline.raw',
  ...results.flatMap((n) => [`${n.id}.red.raw`, `${n.id}.green.raw`]),
]) {
  const file = path.join(logs, name)
  const data = readFileSync(file)
  const trimmed = Buffer.from(`${data.toString('utf8').trimEnd()}\n`)
  writeFileSync(file, trimmed)
}

console.log(
  JSON.stringify(
    results.map((n) => ({ id: n.id, red: n.redExit, green: n.greenExit, clean: n.productClean })),
  ),
)
if (results.some((n) => n.redExit === 0 || n.greenExit !== 0 || !n.productClean)) {
  console.error('COUNTERPROOF FAILED')
  process.exit(1)
}
console.log('COUNTERPROOF OK')
