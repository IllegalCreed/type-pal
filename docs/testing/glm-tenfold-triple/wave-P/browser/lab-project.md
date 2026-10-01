# glm-p-lab：浏览器流程自有小工程（可复现配方）

运行工程不留在仓库树内（完整 verifier 要求树净）。当前隔离副本：
`/tmp/glm-p-lab-isolated/glm-p-lab`（2026-10-01 迁出，manifest id `glm-p-lab`）。

## 再生成（唯一来源 = buildBlankProject，白名单内的临时测试驱动）

1. 在 `packages/editor` 下临时放一个 `*.glm-p.test.ts`（白名单后缀）：

```ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { expect, test } from 'vitest'
import { buildBlankProject } from '../../core/seed.js'

test('generate lab', async () => {
  const outDir = resolve(__dirname, '../../../projects/glm-p-lab')
  const files = await buildBlankProject('glm-p-lab')
  for (const [rel, value] of Object.entries(files)) {
    const t = join(outDir, rel)
    mkdirSync(dirname(t), { recursive: true })
    writeFileSync(t, value instanceof ArrayBuffer ? Buffer.from(value)
      : typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
  }
  expect(Object.keys(files).length).toBeGreaterThan(10)
})
```

2. `pnpm exec vitest run <该文件> --maxWorkers=1`，然后删除临时测试文件。
3. 启动：`VITE_PROJECT_ID=glm-p-lab pnpm --filter @type-pal/editor exec vite --port <空闲端口> --strictPort`
   （package.json 的 `dev` 脚本硬编码 `pal`，必须用 `exec vite` 显式注入；绝不指向真实 PAL）。
4. 流程跑完后 `rm -rf projects/glm-p-lab`（或迁回隔离目录），保持树净。

## 版本与内容

- 生成器：`packages/editor/src/core/seed.ts` 的 `buildBlankProject`（候选树 8b3ca062…2547d8ad 间无变化）。
- 内容：blank seed 原样（1 场景 start / 1 地图 start / 1 角色 hero / 空物品敌人战场表）。
- 校验：`manifest.json` id=`glm-p-lab`；目录文件集 24 文件（seed 输出全集）。
