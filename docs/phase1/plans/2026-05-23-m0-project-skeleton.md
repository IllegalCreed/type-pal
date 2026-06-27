# M0 · 项目骨架与工具链 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 pnpm workspace monorepo 搭起来,三个 package(`shared` / `pal-extract` / `game`)就绪,TypeScript / Vite / Vitest / Biome 配置好。完成后:`pnpm check` 跑通三个包的类型检查 + 单测,工程结构就位、可以进 M1。

**Architecture:** pnpm workspace 根 + `packages/{shared,pal-extract,game}` 三个包。`game` 用 Vite。Vitest 在 node 环境跑(不引入 jsdom)。Biome 在根目录做格式化 + lint。**不做 CI**,只有一个本地 `pnpm check`(见 [`../04-decisions.md`](../04-decisions.md) D19)。

每个包在 M0 阶段只放一个有意义的"烟雾测试"(smoke test) —— 用 `shared` 里的真实引擎常量(`FRAME_MS_EXPLORE = 100ms`,对应 D13)做断言,验证:① 类型检查通,② Vitest 跑通,③ 跨包 `workspace:*` 导入工作。

**Tech Stack:** pnpm workspace、TypeScript(`NodeNext` + `strict`)、Vite(`game`)、Vitest、Biome。无 CI。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

---

## File Structure(M0 末态)

```
type-pal/
├── package.json              新建,workspace 根
├── pnpm-workspace.yaml       新建
├── pnpm-lock.yaml            由 pnpm install 生成
├── tsconfig.base.json        新建,所有包共用基础 TS 配置
├── biome.json                新建,格式化 + lint 配置
├── .gitignore                追加 *.tsbuildinfo
├── README.md                 修改(当前状态 + 开发 quick start)
└── packages/
    ├── shared/
    │   ├── package.json      新建,@type-pal/shared
    │   ├── tsconfig.json     新建,extends 根 base
    │   └── src/
    │       ├── index.ts      新建,导出引擎常量(D13)
    │       └── index.test.ts 新建,断言常量值
    ├── pal-extract/
    │   ├── package.json      新建,@type-pal/pal-extract,依赖 shared
    │   ├── tsconfig.json     新建
    │   └── src/
    │       ├── main.ts       新建,使用 shared 常量
    │       └── main.test.ts  新建
    └── game/
        ├── package.json      新建,@type-pal/game,依赖 shared
        ├── tsconfig.json     新建,带 DOM lib
        ├── vite.config.ts    新建
        ├── index.html        新建,带 canvas
        └── src/
            ├── main.ts       新建,canvas 上画一帧
            └── main.test.ts  新建,纯逻辑断言(不碰 DOM)
```

---

## Task 1: 工作空间骨架

**Files:**
- Create: `package.json`(根)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`

- [ ] **Step 1.1: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 1.2: 创建根 `package.json`**

```json
{
  "name": "type-pal",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "pnpm -r run check",
    "typecheck": "pnpm -r run typecheck",
    "test": "pnpm -r run test",
    "format": "biome format --write .",
    "lint": "biome check ."
  }
}
```

- [ ] **Step 1.3: 创建 `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 1.4: `.gitignore` 追加 TS 增量构建产物**

在 `.gitignore` 末尾追加(其他条目已存在):

```
# TypeScript 增量构建产物
*.tsbuildinfo
```

- [ ] **Step 1.5: 装根级 devDeps**

Run:
```sh
pnpm add -Dw typescript vitest @biomejs/biome
```
Expected: 生成 `pnpm-lock.yaml`,`node_modules/` 出现,无报错。

- [ ] **Step 1.6: 验证 install 幂等**

Run: `pnpm install`
Expected: "Already up to date" 之类信息,无新装包。

- [ ] **Step 1.7: 提交**

```sh
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .gitignore
git commit -m "build(M0.1): 工作空间骨架

- pnpm workspace 根 + tsconfig.base.json
- 装根级 devDeps:typescript / vitest / @biomejs/biome

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `shared` 包 + 烟雾测试(TDD)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Test: `packages/shared/src/index.test.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 2.1: 创建 `packages/shared/package.json`**

```json
{
  "name": "@type-pal/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "check": "pnpm typecheck && pnpm test"
  }
}
```

> 说明:`main` 指 `.ts`(monorepo dev 内联用,不需要构建产物);消费方在编译/打包时各自走自己的 TS。

- [ ] **Step 2.2: 创建 `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2.3: 写**失败**的测试 —— `packages/shared/src/index.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  FPS_BATTLE,
  FPS_EXPLORE,
  FRAME_MS_BATTLE,
  FRAME_MS_EXPLORE,
} from './index.js'

describe('engine timing constants (D13)', () => {
  it('exploration 跑 10 fps(100ms/frame)', () => {
    expect(FPS_EXPLORE).toBe(10)
    expect(FRAME_MS_EXPLORE).toBe(100)
  })

  it('battle 跑 25 fps(40ms/frame)', () => {
    expect(FPS_BATTLE).toBe(25)
    expect(FRAME_MS_BATTLE).toBe(40)
  })
})
```

- [ ] **Step 2.4: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/shared test`
Expected: FAIL —— `Cannot find module './index.js'` 或类似 "can't resolve"。

- [ ] **Step 2.5: 实现 `packages/shared/src/index.ts`**

```ts
/**
 * 跨包共用的常量与类型。
 *
 * M0 占位:只导出引擎计时常量(对应 04-decisions.md 的 D13)。
 * M1+ 会补:events.json schema 类型、数据表类型、资源清单类型。
 */

/** 探索 / 菜单 / 事件模式的逻辑帧率(见 D13)。 */
export const FPS_EXPLORE = 10

/** 战斗模式的逻辑帧率(见 D13)。 */
export const FPS_BATTLE = 25

/** 探索一帧的毫秒数 = 1000 / FPS_EXPLORE。 */
export const FRAME_MS_EXPLORE = 1000 / FPS_EXPLORE

/** 战斗一帧的毫秒数 = 1000 / FPS_BATTLE。 */
export const FRAME_MS_BATTLE = 1000 / FPS_BATTLE
```

- [ ] **Step 2.6: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/shared test`
Expected: 2 tests PASS。

- [ ] **Step 2.7: 跑类型检查**

Run: `pnpm --filter @type-pal/shared typecheck`
Expected: 无输出,exit 0。

- [ ] **Step 2.8: 提交**

```sh
git add packages/shared/ pnpm-lock.yaml
git commit -m "feat(M0.2): @type-pal/shared 包 + 引擎计时常量

- FPS_EXPLORE / FPS_BATTLE / FRAME_MS_*(见 D13)
- 2 个 Vitest 烟雾测试断言常量值

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `pal-extract` 包 + 跨包导入(TDD)

**Files:**
- Create: `packages/pal-extract/package.json`
- Create: `packages/pal-extract/tsconfig.json`
- Test: `packages/pal-extract/src/main.test.ts`
- Create: `packages/pal-extract/src/main.ts`

- [ ] **Step 3.1: 创建 `packages/pal-extract/package.json`**

```json
{
  "name": "@type-pal/pal-extract",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "check": "pnpm typecheck && pnpm test"
  },
  "dependencies": {
    "@type-pal/shared": "workspace:*"
  }
}
```

- [ ] **Step 3.2: 创建 `packages/pal-extract/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3.3: 安装 workspace 依赖**

Run: `pnpm install`
Expected: 把 `@type-pal/shared` 链入 `pal-extract`,无报错。

- [ ] **Step 3.4: 写**失败**的测试 —— `packages/pal-extract/src/main.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { describeEngine } from './main.js'

describe('pal-extract smoke', () => {
  it('能从 @type-pal/shared 拿到帧率信息', () => {
    expect(describeEngine()).toBe('pal-extract @ 10fps explore')
  })
})
```

- [ ] **Step 3.5: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/pal-extract test`
Expected: FAIL —— `Cannot find module './main.js'`。

- [ ] **Step 3.6: 实现 `packages/pal-extract/src/main.ts`**

```ts
import { FPS_EXPLORE } from '@type-pal/shared'

/**
 * M0 占位 —— 验证从 @type-pal/shared 跨包导入工作。
 * M1 起这个文件会变成 MKF 解析的入口。
 */
export function describeEngine(): string {
  return `pal-extract @ ${FPS_EXPLORE}fps explore`
}
```

- [ ] **Step 3.7: 跑测试 + 类型检查**

Run: `pnpm --filter @type-pal/pal-extract check`
Expected: typecheck 通过,1 test PASS。

- [ ] **Step 3.8: 提交**

```sh
git add packages/pal-extract/ pnpm-lock.yaml
git commit -m "feat(M0.3): @type-pal/pal-extract 包 + 跨包导入烟雾测试

- 通过 workspace:* 依赖 @type-pal/shared
- describeEngine() 占位函数,M1 起替换为真实 MKF 解析

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `game` 包 + Vite + canvas 烟雾

**Files:**
- Create: `packages/game/package.json`
- Create: `packages/game/tsconfig.json`
- Create: `packages/game/vite.config.ts`
- Create: `packages/game/index.html`
- Test: `packages/game/src/main.test.ts`
- Create: `packages/game/src/main.ts`

- [ ] **Step 4.1: 创建 `packages/game/package.json`(暂不写 vite,下一步用 pnpm add)**

```json
{
  "name": "@type-pal/game",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "check": "pnpm typecheck && pnpm test"
  },
  "dependencies": {
    "@type-pal/shared": "workspace:*"
  }
}
```

- [ ] **Step 4.2: 用 pnpm 装 Vite 到 game 包(自动写正确版本号到 package.json)**

Run: `pnpm add -D vite --filter @type-pal/game`
Expected: vite 装好,`packages/game/package.json` 出现 `devDependencies.vite: "^x.y.z"`。

- [ ] **Step 4.3: 创建 `packages/game/tsconfig.json`(带 DOM lib;`vite.config.ts` 不入 include —— Vite 自带 esbuild 加载它)**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "types": []
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4.4: 创建 `packages/game/vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
})
```

- [ ] **Step 4.5: 创建 `packages/game/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>type-pal</title>
    <style>
      body { margin: 0; background: #111; display: grid; place-items: center; min-height: 100vh; }
      canvas { image-rendering: pixelated; width: 960px; height: 600px; }
    </style>
  </head>
  <body>
    <canvas id="screen" width="320" height="200"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4.6: 写测试 —— `packages/game/src/main.test.ts`(纯逻辑、不碰 DOM)**

```ts
import { describe, expect, it } from 'vitest'
import { renderBootMessage } from './main.js'

describe('game smoke', () => {
  it('启动信息含 shared 里的帧率', () => {
    const msg = renderBootMessage()
    expect(msg).toContain('100ms')
    expect(msg).toContain('M0')
  })
})
```

- [ ] **Step 4.7: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/game test`
Expected: FAIL —— `renderBootMessage` 找不到。

- [ ] **Step 4.8: 实现 `packages/game/src/main.ts`**

```ts
import { FRAME_MS_EXPLORE } from '@type-pal/shared'

/**
 * 把启动文案造出来 —— 抽成纯函数方便 vitest 在 node 环境断言。
 */
export function renderBootMessage(): string {
  return `M0 OK · ${FRAME_MS_EXPLORE}ms/frame`
}

/**
 * 浏览器入口 —— 仅在浏览器执行(测试时不会进这条分支)。
 */
if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen') as HTMLCanvasElement | null
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#222'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#fff'
      ctx.font = '14px monospace'
      ctx.fillText(renderBootMessage(), 16, 28)
    }
  }
}
```

- [ ] **Step 4.9: 跑测试 + 类型检查**

Run: `pnpm --filter @type-pal/game check`
Expected: typecheck 通过,1 test PASS。

- [ ] **Step 4.10: (手动可选)Vite dev 看一眼**

Run: `pnpm --filter @type-pal/game dev`
Expected: Vite 在 `http://localhost:5173` 起服务,浏览器打开能看到一个深灰 320×200 canvas(放大显示),左上角有白字 `M0 OK · 100ms/frame`。看完 Ctrl+C 关闭。

- [ ] **Step 4.11: 提交**

```sh
git add packages/game/ pnpm-lock.yaml
git commit -m "feat(M0.4): @type-pal/game 包 + Vite + canvas 烟雾

- Vite 配置 + index.html 带 320×200 canvas
- renderBootMessage() 纯函数(可测试),浏览器入口分支用 document
- 1 个 Vitest 测断言文案,manual: pnpm dev 可见

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Biome 格式化 + lint

**Files:**
- Create: `biome.json`

- [ ] **Step 5.1: 创建 `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      "reference",
      "data",
      "pnpm-lock.yaml"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

- [ ] **Step 5.2: 跑格式化(把已有文件自动格成 Biome 风格)**

Run: `pnpm format`
Expected: 输出 "Formatted N files in ..."。可能会改动我们刚写的 .ts / .json —— 这是预期。

- [ ] **Step 5.3: 跑 lint 检查**

Run: `pnpm lint`
Expected: 输出 "Checked N files in ..." 且 **无 errors**(允许少量 warnings)。若有 error,定位修复(常见:未用 import,改成 `import type`,等)。

- [ ] **Step 5.4: 复测 —— 类型检查 + 测试仍通过**

Run: `pnpm test && pnpm typecheck`
Expected: 三个包的测试都 PASS,typecheck 全通。

- [ ] **Step 5.5: 提交**

```sh
git add biome.json packages/
git commit -m "build(M0.5): Biome 格式化 + lint 配置

- 单引号 / 无分号 / 2 空格 / 100 列
- 用 .gitignore 作为 Biome 忽略源
- pnpm format / pnpm lint 跑通

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `pnpm check` 端到端 + README

**Files:**
- Modify: `README.md`

- [ ] **Step 6.1: 端到端跑一次 `pnpm check`**

Run: `pnpm check`
Expected: 三个包各自跑 typecheck + test,**全部通过**。最后 exit 0。

- [ ] **Step 6.2: 更新 [README.md](../../README.md) 当前状态**

把"当前状态"那节(`## 当前状态(2026-05-23)`)替换为:

```markdown
## 当前状态(2026-05-23)

**M0 完成** —— pnpm monorepo 三包(`pal-extract` / `game` / `shared`)+ TS + Vite + Vitest + Biome 就绪。`pnpm check` 跑通类型检查与测试。设计阶段全部敲定(详见 `docs/`)。原版数据已就位并核对;sdlpal 构建脚本就绪。

下一步:进入 **M1**(`pal-extract` 打通最小链路,见 [`docs/03-development-plan.md`](../03-development-plan.md))。
```

- [ ] **Step 6.3: README 加一个开发 quick start**

在 `## 仓库结构` 一节之后(在 `## 怎么继续` 之前)插入:

```markdown
## 开发(本地)

```sh
# 一次性
brew install pnpm        # 若未装
brew install make sdl3   # sdlpal 差分测试用,见 docs/06-testing.md

# 项目本身
pnpm install
pnpm check               # 全部包的 typecheck + 测试
pnpm --filter @type-pal/game dev  # 起网页游戏的 Vite 开发服务器

# sdlpal(差分测试 oracle)
bash scripts/build-sdlpal.sh
```
```

- [ ] **Step 6.4: 改完再跑一次 `pnpm check` 确保没破坏**

Run: `pnpm check`
Expected: 全 PASS。

- [ ] **Step 6.5: 提交 M0 完成**

```sh
git add README.md
git commit -m "docs(M0.6): M0 完成 —— README 更新当前状态与开发 quick start

工程骨架就位,pnpm check 端到端绿。下一步 M1。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## 自检清单(实施完跑一遍)

- [ ] `pnpm install` 在干净的克隆上能跑通(`rm -rf node_modules packages/*/node_modules && pnpm install`)
- [ ] `pnpm check` 退出码 0,三个包 typecheck + test 都过
- [ ] `pnpm --filter @type-pal/game dev` 能起服务、浏览器看到 canvas + 文案
- [ ] `pnpm format` 之后 `git status` 无残留(代码已合 Biome 风格)
- [ ] `pnpm lint` 无 error
- [ ] 没有 `reference/sdlpal/` 被改动(它是只读规格)
- [ ] `build/` 未被追踪(gitignored)
