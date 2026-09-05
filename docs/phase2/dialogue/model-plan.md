> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> 对应任务卡为准。

# 对话结构化 · ① 数据模型 + 状态机 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 reforge 对话从「内嵌字面文本」改成「结构化 `DialogueLine`(text/speaker = 稳定 TextId) + i18n locale 查表 + 颜色富文本解析」,状态机升级为按容量分页;鬼话 demo 照常跑、纯逻辑全单测。

**Architecture:** 设计见 [model-design.md](model-design.md)、决策见 [decisions.md](../decisions.md) D11。本计划是「三刀」的**第①刀(数据地基)**:只动数据模型 / 纯函数 / 状态机 + 最小渲染适配;**外观继承(②)、迁移器(③)不在本计划**。`@type-pal/content` 出类型 + locale + 纯函数,`@type-pal/reforge` 消费。

**Tech Stack:** TypeScript(ESM,import 带 `.js` 扩展)、vitest、pnpm workspace。

## Global Constraints

- **稳定 id,不用下标**:`text`/`speaker` 一律 `TextId`,不内嵌字面(铁律 5)。
- **颜色用语义名,不用 palette 魔法数**:`DialogColor = 'default'|'cyan'|'red'|'redAlt'|'yellow'`;palette 映射是②渲染层的事,本计划不出现 `0x8D` 等。
- **时长存真实 ms**:`speed`(ms/字)、`autoAdvance`(ms);不存 sdlpal 原始 `NN`。
- **i18n 一等公民**:面向玩家文本进 locale 表;locale **先只填 zh**,en 等留后(D9 / D11)。
- **不塞隐式等待态**:状态机是纯函数,无 `lineDoneRenderPending` 这类隐式等待态(design §6)。
- **TDD + 频繁 commit**:每个纯函数先写失败测试。每 Task 末 commit。
- **gating**:`pnpm check`(typecheck + test 全包)必须绿。
- content 内部 import 用 `./xxx.js`;reforge import content 用 `@type-pal/content`。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `packages/content/src/index.ts` | 类型(TextId/DialogColor/TextSpan/DialogueLine…)+ 场景数据 + re-export | Modify |
| `packages/content/src/rich-text.ts` | `parseRichText`:locale 富文本串 → `TextSpan[]` | Create |
| `packages/content/src/rich-text.test.ts` | rich-text 单测 | Create |
| `packages/content/src/locale.ts` | `Locale` 类型 + `lookupText` + `zhLocale`(鬼话 zh 文本) | Create |
| `packages/content/src/locale.test.ts` | locale 单测 | Create |
| `packages/content/src/content.test.ts` | textId 完整性守护(场景引用的 id 都在 zhLocale) | Create |
| `packages/reforge/src/dialogue.ts` | 状态机:按容量分页 + 翻页(纯函数) | Modify |
| `packages/reforge/src/dialogue.test.ts` | 状态机单测(改成新 API) | Modify |
| `packages/reforge/src/main.ts` | 渲染适配:查 locale + `pageLines`/`advancePage` + 多行 drawDialogueBox | Modify |

---

## Task 1: 颜色富文本解析 `parseRichText` + 行内类型

**Files:**
- Modify: `packages/content/src/index.ts`(加 `DialogColor`/`TextSpan` 类型 + re-export rich-text)
- Create: `packages/content/src/rich-text.ts`
- Test: `packages/content/src/rich-text.test.ts`

**Interfaces:**
- Produces: `type DialogColor = 'default'|'cyan'|'red'|'redAlt'|'yellow'`;`interface TextSpan { text: string; color?: DialogColor }`;`parseRichText(s: string): TextSpan[]`(无标记 → 单 span;`<cyan>…</cyan>` 等成对标记 → 分段着色;非嵌套)。

- [ ] **Step 1: 写失败测试**

创建 `packages/content/src/rich-text.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { parseRichText } from './rich-text.js'

describe('parseRichText', () => {
  test('纯文本 → 单 span', () => {
    expect(parseRichText('你终于醒了')).toEqual([{ text: '你终于醒了' }])
  })

  test('空串 → 单个空 span', () => {
    expect(parseRichText('')).toEqual([{ text: '' }])
  })

  test('句中颜色标记 → 前/色/后三段', () => {
    expect(parseRichText('他递来一柄<cyan>青锋剑</cyan>。')).toEqual([
      { text: '他递来一柄' },
      { text: '青锋剑', color: 'cyan' },
      { text: '。' },
    ])
  })

  test('行首颜色标记 → 色/后两段', () => {
    expect(parseRichText('<red>住手</red>！')).toEqual([
      { text: '住手', color: 'red' },
      { text: '！' },
    ])
  })

  test('多个颜色标记', () => {
    expect(parseRichText('<yellow>金</yellow>和<cyan>青</cyan>')).toEqual([
      { text: '金', color: 'yellow' },
      { text: '和' },
      { text: '青', color: 'cyan' },
    ])
  })

  // 契约:迁移器/手写 locale 可能写出半截标记;未闭合必须按纯文本,不吞字符、不崩。
  test('未闭合标记 → 按纯文本处理(不吞字符不崩)', () => {
    expect(parseRichText('他<cyan>青锋剑')).toEqual([{ text: '他<cyan>青锋剑' }])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/rich-text.test.ts`
Expected: FAIL（`parseRichText` is not defined / 模块不存在）

- [ ] **Step 3: 加类型到 index.ts**

在 `packages/content/src/index.ts` 顶部 `export type Facing` 之后,加:

```ts
/** 稳定文本 id;运行时按当前 locale 查表(D9)。 */
export type TextId = string

/** 对话颜色语义名;palette 映射在渲染层,内容层不出现魔法数。 */
export type DialogColor = 'default' | 'cyan' | 'red' | 'redAlt' | 'yellow'

/** 一段同色文本(parseRichText 产物,渲染中间表示,非内容字段)。 */
export interface TextSpan {
  text: string
  color?: DialogColor
}
```

> **② 外观复核点**:`TextSpan` 现随 `parseRichText` 暂居 content(纯函数 + 其返回类型,自洽)。② 外观落地时 reforge 渲染层若需扩展渲染属性(字体 hint / 阴影描边等),应在**渲染层**定义扩展类型(`RenderSpan` 之类),勿往 content 的 `TextSpan` 塞渲染细节——保持"内容层不含渲染表示"。届时复核此归属。

在 `index.ts` **末尾**加 re-export(本 Task 只加 rich-text;`./locale.js` 留 Task 2 加,避免引用尚不存在的文件):

```ts
export * from './rich-text.js'
```

- [ ] **Step 4: 实现 parseRichText**

创建 `packages/content/src/rich-text.ts`:

```ts
import type { DialogColor, TextSpan } from './index.js'

const COLOR_TAGS = ['cyan', 'red', 'redAlt', 'yellow'] as const

/**
 * 解析 locale 富文本串 → TextSpan[]。
 * 仅识别成对闭合的颜色标记 `<cyan>…</cyan>`(非嵌套);其余按纯文本。
 * 无标记 / 空串 → 单 span(空串 → `[{text:''}]`),保证调用方拿到非空数组。
 */
export function parseRichText(s: string): TextSpan[] {
  const spans: TextSpan[] = []
  const re = new RegExp(`<(${COLOR_TAGS.join('|')})>(.*?)</\\1>`, 'g')
  let last = 0
  let m: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: 标准 regex 迭代
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) spans.push({ text: s.slice(last, m.index) })
    spans.push({ text: m[2] as string, color: m[1] as DialogColor })
    last = m.index + m[0].length
  }
  if (last < s.length) spans.push({ text: s.slice(last) })
  if (spans.length === 0) spans.push({ text: '' })
  return spans
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @type-pal/content exec vitest run src/rich-text.test.ts`
Expected: PASS（6 passed）

- [ ] **Step 6: typecheck**

Run: `pnpm --filter @type-pal/content run typecheck`
Expected: 无错误退出(0)

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/index.ts packages/content/src/rich-text.ts packages/content/src/rich-text.test.ts
git commit -m "feat(content): 对话颜色富文本解析 parseRichText + TextSpan/DialogColor 类型"
```

---

## Task 2: locale 查表 `lookupText` + `zhLocale` 骨架

**Files:**
- Modify: `packages/content/src/index.ts`(末尾加 `export * from './locale.js'`)
- Create: `packages/content/src/locale.ts`
- Test: `packages/content/src/locale.test.ts`

**Interfaces:**
- Consumes: `TextId`(Task 1)。
- Produces: `type Locale = Record<TextId, string>`;`lookupText(id: TextId, locale: Locale): string`(命中返回值,未命中返回 `id` 本身——开发期缺失可见);`zhLocale: Locale`(本 Task 先空 `{}`,Task 4 填鬼话文本)。

- [ ] **Step 1: 写失败测试**

创建 `packages/content/src/locale.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { type Locale, lookupText } from './locale.js'

const L: Locale = { 'name.youhun': '游魂', 'dlg.x.0': '活人气味' }

describe('lookupText', () => {
  test('命中 → 返回译文', () => {
    expect(lookupText('name.youhun', L)).toBe('游魂')
  })

  test('未命中 → 回退返回 id 本身(开发期可见)', () => {
    expect(lookupText('dlg.missing', L)).toBe('dlg.missing')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/locale.test.ts`
Expected: FAIL（模块 `./locale.js` 不存在）

- [ ] **Step 3: 实现 locale.ts**

创建 `packages/content/src/locale.ts`:

```ts
import type { TextId } from './index.js'

/** 单语言文本表:textId → 富文本字符串(单色纯文本 / 多色带 <color> 标记)。 */
export type Locale = Record<TextId, string>

/** 查表;未命中回退返回 id 本身,便于开发期发现漏填。 */
export function lookupText(id: TextId, locale: Locale): string {
  return locale[id] ?? id
}

/** 中文文本表。Task 4 填入鬼话台词;先留空骨架。 */
export const zhLocale: Locale = {}
```

- [ ] **Step 4: 加 re-export**

在 `packages/content/src/index.ts` 末尾(Task 1 的 `export * from './rich-text.js'` 之后)加:

```ts
export * from './locale.js'
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @type-pal/content exec vitest run src/locale.test.ts`
Expected: PASS（2 passed）

- [ ] **Step 6: typecheck**

Run: `pnpm --filter @type-pal/content run typecheck`
Expected: 无错误退出(0)

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/index.ts packages/content/src/locale.ts packages/content/src/locale.test.ts
git commit -m "feat(content): i18n locale 查表 lookupText + zhLocale 骨架"
```

---

## Task 3: `DialogueLine` 结构化 + 状态机按容量分页

**Files:**
- Modify: `packages/content/src/index.ts`(`DialogueLine` 升级)
- Modify: `packages/reforge/src/dialogue.ts`(状态机重写)
- Test: `packages/reforge/src/dialogue.test.ts`(改成新 API)

**Interfaces:**
- Consumes: `TextId`(Task 2)、`Dialogue`/`DialogueLine`。
- Produces:
  - `interface DialogueLine { speaker?: TextId; text: TextId; speed?: number; autoAdvance?: number }`
  - `interface DialogueState { readonly dialogue: Dialogue; readonly pageStart: number; readonly linesPerPage: number }`
  - `startDialogue(dialogue: Dialogue, linesPerPage?: number): DialogueState`(默认 `linesPerPage = 1`)
  - `pageLines(state: DialogueState): DialogueLine[]`(当前页的行)
  - `advancePage(state: DialogueState): DialogueState | null`(翻下一页;越过末页 → null)
- 旧 `currentLine` / `advance` 改成新 API 的 thin wrapper(暂留兼容 main.ts,Task 5 切换后删)——使本 Task 中间态 reforge 仍可编译。

- [ ] **Step 1: 升级 DialogueLine 类型**

在 `packages/content/src/index.ts` 把现有 `DialogueLine` 替换为:

```ts
export interface DialogueLine {
  /** 说话人名的 textId;省略 = 旁白 / 心理活动。原版「末尾冒号」判定 → 此显式字段。 */
  speaker?: TextId
  /** 正文 textId,指向 locale 富文本(单色纯文本 / 多色带 <color> 标记)。 */
  text: TextId
  /** 打字速度(ms/字);省略 = 默认。原版 $NN。 */
  speed?: number
  /** 尾停顿 + 自动推进(ms);存在 = 打完停 N ms 自动进下一页、不等键。原版 ~NN。 */
  autoAdvance?: number
}
```

> `Dialogue` 不变(`{ id: string; lines: DialogueLine[] }`)。现有 `guijieMinjuScene` 里 `text:'……'`/`speaker:'游魂'` 仍是合法 `string`(=`TextId`),typecheck 不报错;值在 Task 4 改成 textId。

- [ ] **Step 2: 写失败测试(改写 dialogue.test.ts)**

把 `packages/reforge/src/dialogue.test.ts` **整体替换**为:

```ts
import type { Dialogue } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advancePage, pageLines, startDialogue } from './dialogue.js'

// 5 行(text 用 textId;此处单测只关心分页/翻页,值无所谓)
const d: Dialogue = {
  id: 'x',
  lines: [{ text: 't0' }, { text: 't1' }, { text: 't2' }, { text: 't3' }, { text: 't4' }],
}

describe('dialogue 状态机', () => {
  test('默认每页 1 行 → pageLines 返回首行', () => {
    expect(pageLines(startDialogue(d))).toEqual([{ text: 't0' }])
  })

  test('linesPerPage=2 → pageLines 返回前两行', () => {
    expect(pageLines(startDialogue(d, 2))).toEqual([{ text: 't0' }, { text: 't1' }])
  })

  test('advancePage 翻到下一页(每页 1 行)', () => {
    const s = advancePage(startDialogue(d))
    expect(s && pageLines(s)).toEqual([{ text: 't1' }])
  })

  test('linesPerPage=4:第 1 页 4 行,第 2 页剩 1 行,再翻 → null', () => {
    const p0 = startDialogue(d, 4)
    expect(pageLines(p0)).toEqual([{ text: 't0' }, { text: 't1' }, { text: 't2' }, { text: 't3' }])
    const p1 = advancePage(p0)
    expect(p1 && pageLines(p1)).toEqual([{ text: 't4' }])
    expect(advancePage(p1 as NonNullable<typeof p1>)).toBeNull()
  })

  test('末页 advancePage → null(对话结束)', () => {
    // 每页 1 行,5 行 → 第 4 页是最后一页
    let s: ReturnType<typeof startDialogue> | null = startDialogue(d)
    for (let i = 0; i < 4; i++) s = advancePage(s as NonNullable<typeof s>)
    expect(s && pageLines(s)).toEqual([{ text: 't4' }])
    expect(advancePage(s as NonNullable<typeof s>)).toBeNull()
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/dialogue.test.ts`
Expected: FAIL（`pageLines`/`advancePage` not exported）

- [ ] **Step 4: 重写 dialogue.ts**

把 `packages/reforge/src/dialogue.ts` **整体替换**为:

```ts
/**
 * 对话翻页:纯状态机(不碰 DOM,可独立单测)。
 * 按容量(linesPerPage)分页;打字 / autoAdvance / 瞬显的「时间驱动」在渲染层(② / 演出),
 * 本状态机只管「当前页是哪几行」「翻到下一页」——保持纯函数、无隐式等待态(design §6)。
 */
import type { Dialogue, DialogueLine } from '@type-pal/content'

export interface DialogueState {
  readonly dialogue: Dialogue
  readonly pageStart: number
  readonly linesPerPage: number
}

/**
 * linesPerPage 由渲染层按对话框容量定(design §6:不写死原版 4 行/页)。
 * 默认 1 仅为 ② 外观落地前的临时值;② 落地后渲染层按框容量传入(鬼话框 = 4 行)。
 */
export function startDialogue(dialogue: Dialogue, linesPerPage = 1): DialogueState {
  return { dialogue, pageStart: 0, linesPerPage }
}

/** 当前页的行(可能不足 linesPerPage,如最后一页)。 */
export function pageLines(state: DialogueState): DialogueLine[] {
  return state.dialogue.lines.slice(state.pageStart, state.pageStart + state.linesPerPage)
}

/** 翻下一页;越过最后一页 → null(对话结束)。 */
export function advancePage(state: DialogueState): DialogueState | null {
  const next = state.pageStart + state.linesPerPage
  return next < state.dialogue.lines.length ? { ...state, pageStart: next } : null
}

// ── 旧 API thin wrapper:暂留兼容 main.ts,Task 5 切换后删 ──
/** @deprecated 用 pageLines。 */
export function currentLine(state: DialogueState): DialogueLine | undefined {
  return pageLines(state)[0]
}
/** @deprecated 用 advancePage。 */
export function advance(state: DialogueState): DialogueState | null {
  return advancePage(state)
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/dialogue.test.ts`
Expected: PASS（5 passed）

- [ ] **Step 6: typecheck(content + reforge 都绿)**

Run: `pnpm --filter @type-pal/content run typecheck && pnpm --filter @type-pal/reforge run typecheck`
Expected: 均无错误退出(0)。main.ts 经 `currentLine`/`advance` wrapper 仍可用,故 reforge 也绿。

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/index.ts packages/reforge/src/dialogue.ts packages/reforge/src/dialogue.test.ts
git commit -m "feat(reforge): 对话状态机按容量分页(pageLines/advancePage)+ DialogueLine 结构化(TextId/speed/autoAdvance)"
```

---

## Task 4: 鬼话内容迁 textId + 填 zhLocale

**Files:**
- Modify: `packages/content/src/index.ts`(`guijieMinjuScene.dialogues` 改 textId 引用)
- Modify: `packages/content/src/locale.ts`(`zhLocale` 填鬼话文本)
- Create: `packages/content/src/content.test.ts`(textId 完整性守护)

**Interfaces:**
- Consumes: `DialogueLine`(Task 3)、`zhLocale`(Task 2)、`guijieMinjuScene`(既有场景数据)。
- Produces: 鬼话 `Dialogue` 的 `text`/`speaker` 全是 textId;`zhLocale` 含对应 zh 文本。textId 约定:正文 `dlg.<dialogueId>.<i>`,人名 `name.<key>`。

- [ ] **Step 1: 填 zhLocale**

把 `packages/content/src/locale.ts` 的 `zhLocale` 替换为:

```ts
/** 中文文本表。鬼界民居切片(鬼话)台词。 */
export const zhLocale: Locale = {
  'name.youhun': '游魂',
  'dlg.ghost-hearsay.0': '……活人气味……这地方，可不该有活人啊……',
  'dlg.ghost-hearsay.1': '南边……来过个使刀的侠客……听说，是个仗义的……',
  'dlg.ghost-hearsay.2': '咳，名字？谁还记得名字。鬼啊，只记得自己怎么死的。',
  'dlg.ghost-hearsay.3': '你问那侠客？……我也是听旁的鬼念叨来的……做不得准……',
  'dlg.ghost-hearsay.4': '（李逍遥心头一动：南边……使刀的侠客……）',
}
```

- [ ] **Step 2: 鬼话 dialogues 改 textId**

在 `packages/content/src/index.ts` 把 `guijieMinjuScene` 的 `dialogues` 块替换为:

```ts
  dialogues: [
    {
      id: 'ghost-hearsay',
      // text/speaker = textId;实际文本在 zhLocale(locale.ts)。原版「末尾冒号」姓名 → speaker 字段。
      lines: [
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.0' },
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.1' },
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.2' },
        { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.3' },
        { text: 'dlg.ghost-hearsay.4' }, // 旁白,无 speaker
      ],
    },
  ],
```

- [ ] **Step 3: 写 textId 完整性测试(防止删 locale 条目却留引用)**

创建 `packages/content/src/content.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { guijieMinjuScene } from './index.js'
import { zhLocale } from './locale.js'

/**
 * i18n 完整性守护:场景里每条对话引用的 text/speaker textId,
 * 都必须在 zhLocale 有对应条目(否则运行时 fallback 成显示 id 字符串)。
 */
describe('对话 textId 完整性(zh)', () => {
  for (const dialogue of guijieMinjuScene.dialogues) {
    test(`「${dialogue.id}」所有 textId 都在 zhLocale`, () => {
      for (const line of dialogue.lines) {
        expect(zhLocale[line.text], `正文缺: ${line.text}`).toBeDefined()
        if (line.speaker) expect(zhLocale[line.speaker], `人名缺: ${line.speaker}`).toBeDefined()
      }
    })
  }
})
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/content exec vitest run src/content.test.ts`
Expected: PASS（鬼话 dialogue 命中 1 条 test,所有 textId 都在 zhLocale）

- [ ] **Step 5: typecheck + 全测试**

Run: `pnpm --filter @type-pal/content run typecheck && pnpm --filter @type-pal/content exec vitest run`
Expected: typecheck 0 错;测试全 PASS（rich-text 6 + locale 2 + content 1）

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/index.ts packages/content/src/locale.ts packages/content/src/content.test.ts
git commit -m "feat(content): 鬼话台词迁 textId 引用 + zhLocale 填充(对话正文走 i18n)"
```

> 注:此 commit 后、Task 5 前,reforge demo 会暂时显示 textId 字符串(main.ts 尚未查表)——预期内,Task 5 修复。reforge 为 dev-only demo,无 E2E gating。

---

## Task 5: main.ts 渲染适配(查 locale + 分页 API + 多行框)

**Files:**
- Modify: `packages/reforge/src/main.ts`

**Interfaces:**
- Consumes: `startDialogue`/`pageLines`/`advancePage`(Task 3)、`lookupText`/`zhLocale`(Task 2)、`parseRichText`(Task 1,本 Task 仅取纯文本,着色留②)。

- [ ] **Step 1: 改 import + 删 dialogue.ts 旧 wrapper**

先删 `packages/reforge/src/dialogue.ts` 里 Task 3 加的 thin wrapper(`currentLine`/`advance` 两个 `@deprecated` 函数及上方注释行)——下面 main.ts 改用新 API 后它们无人引用。

`packages/reforge/src/main.ts` 第 1 行的 content import 改为(加 `lookupText`、`zhLocale`):

```ts
import { type Dialogue, type DialogueLine, type EntityDef, type Facing, guijieMinjuScene, lookupText, zhLocale } from '@type-pal/content'
```

第 5 行的 dialogue import 改为:

```ts
import { advancePage, type DialogueState, pageLines, startDialogue } from './dialogue.js'
```

- [ ] **Step 2: 改对话驱动(tick 内)**

在 `tick` 里,把对话推进那行(原 `if (interact) activeDialogue = advance(activeDialogue)`)改为:

```ts
      if (interact) activeDialogue = advancePage(activeDialogue) // 翻页;翻完 → null(关闭)
```

启动对话那行 `if (dlg) activeDialogue = startDialogue(dlg)` **保持不变**(默认每页 1 行)——4 行/页需配套框高 / 行高 / 姓名牌独立位置(旧框 `boxH=60` 容不下 4 行×行高、且会每行重复 speaker),连同 ② 外观一起做。① 用 1 行/页跑通,分页能力靠 Task 3 单测(`linesPerPage=4`)覆盖。

把 render 里(原 `if (activeDialogue) drawDialogueBox(currentLine(activeDialogue))`)改为:

```ts
    if (activeDialogue) drawDialogueBox(pageLines(activeDialogue))
```

**核对 wrapper 删净**(Step 1 删了 dialogue.ts 的 wrapper、本步把 main.ts 的调用也换完,此刻核对才准):
```bash
grep -nE '\b(currentLine|advance)\b' packages/reforge/src/dialogue.ts packages/reforge/src/main.ts
```
Expected: **无输出**——dialogue.ts 的 wrapper 已删(Step 1),main.ts 的调用已换成 `advancePage`/`pageLines`(本步);词边界 `\badvance\b` 不匹配 `advancePage` 故不出现。若有输出 = 仍有裸 `currentLine`/`advance` 残留(可能漏改某处调用),需清。

> 时机:此核对必须放在 Step 2 末尾,不能放 Step 1——Step 1 只改了 import 和 dialogue.ts,main.ts 函数体里的 `advance()`/`currentLine()` 调用要等本步才替换,提前核对必然有输出。

- [ ] **Step 3: 改 drawDialogueBox 成多行 + 查 locale**

把 `drawDialogueBox` 函数整体替换为:

```ts
  function drawDialogueBox(lines: DialogueLine[]): void {
    if (lines.length === 0) return
    const W = canvas.width
    const H = canvas.height
    const boxH = 60
    const top = H - boxH - 6
    ctx.save()
    ctx.globalAlpha = 0.86
    ctx.fillStyle = '#1a120b'
    ctx.fillRect(6, top, W - 12, boxH)
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#d8b365'
    ctx.strokeRect(6, top, W - 12, boxH)
    // 继续提示：右上角小字
    ctx.fillStyle = '#7a6a4a'
    ctx.font = '8px monospace'
    ctx.fillText('[空格] 继续', W - 62, top + 12)
    // 逐行：speaker(姓名牌简版) + 正文,都经 locale 查表。着色 / 字模 / 打字留 ②。
    let ty = top + 26
    for (const line of lines) {
      if (line.speaker) {
        ctx.fillStyle = '#d8b365'
        ctx.font = '13px "Songti SC","SimSun",serif'
        ctx.fillText(`${lookupText(line.speaker, zhLocale)}：`, 14, ty)
        ty += 19
      }
      ctx.fillStyle = '#f0e0b0'
      ctx.font = '13px "Songti SC","SimSun",serif'
      ctx.fillText(lookupText(line.text, zhLocale), 14, ty)
      ty += 19
    }
    ctx.restore()
  }
```

- [ ] **Step 4: reforge typecheck**

Run: `pnpm --filter @type-pal/reforge run typecheck`
Expected: 无错误退出(0)（旧 `advance`/`currentLine` 引用已清除）

- [ ] **Step 5: 全量 gating**

Run: `pnpm check`
Expected: 全包 typecheck + test 绿

- [ ] **Step 6: 浏览器验收(人工)**

Run: `pnpm --filter @type-pal/reforge run dev`,浏览器打开 dev 地址,走到老者旁按空格。
Expected:
- 对话框出现,**姓名「游魂：」+ 正文正常中文显示**(不是 `dlg.ghost-hearsay.0` 这种 id)
- 每页 1 句(① 默认 `linesPerPage=1`),按空格逐句翻、5 句走完关闭(4 行/页连同框高/姓名牌 = ② 外观落地时一起做)
- 外观仍是旧粗框——**外观继承(透明框/字模/阴影/姓名牌 CYAN_ALT)是 ② 的事,本计划(① 数据地基)不碰**;故此处只验「数据 + 分页 + locale 查表」对,不验外观

- [ ] **Step 7: Commit**

```bash
git add packages/reforge/src/main.ts
git commit -m "feat(reforge): 对话渲染走 locale 查表 + 分页 API(pageLines/advancePage)"
```

---

## Self-Review（计划作者自查,已过）

1. **Spec 覆盖**:design §3 数据模型→Task 1/2/3;§4 i18n locale→Task 2/4;§3 颜色标记→Task 1(含未闭合标记契约 Task 1 新增测试);§6 分页状态机→Task 3;"鬼话照常跑"→Task 5 验收;i18n 完整性守护→Task 4 新增 `content.test.ts`。`speed`/`autoAdvance` 字段→Task 3 定义(**消费**留②,本计划只定字段,见 §9 边界:打字/autoAdvance 时间驱动归②)。✅
2. **占位符**:无 TBD/TODO;每步含 complete code + exact command + expected。✅
3. **类型一致**:`parseRichText`/`lookupText`/`zhLocale`/`startDialogue`/`pageLines`/`advancePage` 在各 Task 签名一致;`DialogColor`/`TextSpan`/`TextId`/`DialogueLine` 定义→消费链对齐。✅
4. **范围**:单刀(数据地基),不含②外观/③迁移器;每 Task 独立可测、末尾 commit。Task 5 保持 `startDialogue(dlg)`(默认每页 1 行);4 行/页需配套框高/行高/姓名牌独立位置(旧框 `boxH=60` 容不下 4 行、且会每行重复 speaker),整体留②。✅

> 边界说明:design §9 ① 原列「打字/分页/autoAdvance」。细化后:**分页**= 状态机纯逻辑(本计划 Task 3);**打字 / autoAdvance / 瞬显**= 时间驱动的演出,与②外观渲染强绑定,本计划只在 `DialogueLine` **定义字段**、不实现消费(留②)。这比把时间逻辑塞进①更符合 design §6「打字时钟与逻辑解耦」。

> **② 外观复核点**:`TextSpan` 现暂居 content(随 `parseRichText` 纯函数自洽),② 渲染层扩展渲染属性时应在渲染层定义、勿污染 content(见 Task 1 注脚)。
